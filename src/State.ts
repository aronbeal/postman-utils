/**
 * @file State.ts
 * Stores state variables modified by individual requests.  Values stored
 * by this object are expected to possibly change with every request.
 * 
 * Unlike KNOWN_STATE, STATE makes no assertions about what
 * keys it contains.
 */
import Environment from './Environment';
import Logger, { LogLevel, LogVerbosity } from "./Logger";

/**
 * Used to store data internally in a binary search tree, so that entries are kept sorted.
 */
type StateNode = { key: string, value: any };
/**
 * Validates that the passed state is valid. 
 */
export const validate_state = (state: any): any => {
    // No restrictions on state keys, currently.
    return state;
};

export default class State {
    storage_key: string;
    logger: Logger;
    env: Environment;
    current_state: Array<StateNode>;
    constructor(storage_key: string, env: Environment, log: Logger) {
        this.storage_key = storage_key;
        this.logger = log;
        this.env = env;
        this.current_state = [];
        this.load();
    }

    /**
     * Removes the variable from state.
     * 
     * @param {string} state_varname The name of the state variable to remove.
     * @return {this} For chaining.
     */
    public delete(state_varname: string): this {
        for (let i = 0, entry = this.current_state[i]; i < this.current_state.length; i++, entry = this.current_state[i]) {
            if (entry.key === state_varname) {
                this.current_state = this.current_state.slice(0, i).concat(this.current_state.slice(i + 1));
                this.save();
                break;
            }
            if (entry.key > state_varname) {
                break;
            }
        }

        return this;
    }
    
    /**
     * Loads the current_state object from the serialized value in the indicated storage key.
     * This makes the in-memory match what's in the stored source in postman.
     * 
     * @return {this} For chaining.
     */
    public load(): this {
        this.current_state = [];
        if (!this.env.hasState(this.storage_key)) {
            return this;
        }
        const loaded_state = this.env.loadState(this.storage_key);
        this.setAll(loaded_state);

        return this;
    }


    /**
     * Retrieves the variable from stored state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     * @returns {any} Returns whatever is stored in that state value.  Expected to be scalar in nature.
     * @throws {Error} if the entry is not found.
     */
    public get(state_varname: string): any {
        for (let i = 0, entry = this.current_state[i]; i < this.current_state.length; i++, entry = this.current_state[i]) {
            if (entry.key === state_varname) {
                return entry.value;
            }
            if (entry.key > state_varname) {
                break;
            }
        }
        throw new Error(`The key ${state_varname} was never set within the state.`);
    }

    /**
     * Returns all values currently stored in state.
     * 
     * @returns {JSONObject} Returns all values currently in state.
     */
    public getAll(): JSONObject {
        return this.current_state.reduce((result: JSONObject, o: StateNode) => {
            result[o.key] = o.value;

            return result;
        }, {});
    }

    /**
     * Tests if a given env var is stored in state.
     * 
     * @param {string} varname The name of the state variable to check
     */
    public isset(state_varname: string): boolean {
        try {
            this.get(state_varname);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Resets this state to empty.  Persists that to storage.  Returns the state object.
     */
    public reset(): this {
        this.logger.log("Clearing state...", LogLevel.info, LogVerbosity.very_verbose);
        this.current_state = [];
        this.save();

        return this;
    }

    /**
     * Persists the in-memory copy to the stored source in Postman.
     */
    public save() {
        this.env.saveState(this.storage_key, this.getAll());
        this.logger.log(`Saved state: ${this.current_state}`, LogLevel.default, LogVerbosity.very_verbose);
    }

    /**
      * Applies any passed state to the stored state.
      */
    public setAll(state: JSONObject): this {
        Object.keys(state).map((pref: string) => this.set(pref, state[pref]));
        this.save();

        return this;
    }

    /**
     * Stores the variable in environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     * @param {any} value The value to set it to.
     */
    public set(state_varname: string, value: any): this {
        this.logger.log(`Setting ${state_varname} to be ${value}`, LogLevel.default, LogVerbosity.very_verbose);
        const entry: StateNode = {
            key: state_varname, value: value
        }
        for (let i = 0; i < this.current_state.length; i++) {
            if (this.current_state[i].key > state_varname) {
                this.current_state.splice(i, 0, entry);
                this.save();

                return this;
            }
        }
        // Bigger than all current entries, add to the end.
        this.current_state.push(entry);
        this.save();

        return this;
    }
}
