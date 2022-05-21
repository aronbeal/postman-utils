
/**
 * @file State.ts
 * A sub-set of Environment stored in a separate serialized section,
 * this tracks state between requests to the API.  This is
 * intended to make it easier to reset state on demand.
 * 
 * Unlike COLLECTION_STATE, STATE makes no assertions about what
 * keys it contains.
 */
import Environment, { EnvKeys } from './Environment';
import { Logger, LogLevel, LogVerbosity } from "./Logger";

interface StateKeysInterface {
    [index: string]: any;
}
/**
 * Validates that the passed state is valid. 
 */
 export const validate_state = (state: any): any => {
    // No restrictions on state keys, currently.
    return state;
};
export default class State {
    logger: Logger;
    env: Environment;
    constructor(env: Environment, log: Logger) {
        this.logger = log;
        this.env = env;

        // By default, state should 
    }
    /**
     * Creates a new state object based on the current 
     * Postman environment.  This will validate
     */
    public static from(env: Environment, log: Logger): State {
        const current_state = env.getObject(EnvKeys.STATE);
        return new State(env, log);
    }

    /**
     * Validates that the stored state is valid.
     */
    public validate(): this {
        let current_state = this.env.getObject(EnvKeys.STATE);
        validate_state(current_state);

        return this;
    }

    /**
     * Applies any stored state to the environment.
     */
    public apply(): StateKeysInterface {
        throw new Error('Not yet implemented');
    }

    /**
     * Resets current state to default state.
     */
    reset() {
        this.logger.log("Clearing state...", LogLevel.info, LogVerbosity.very_verbose);
        this.env.setObject(EnvKeys.STATE, {
            "initialized": new Date().toLocaleString('en-CA')
        });
    }

    /**
     * Retrieves the variable from environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     */
    get(state_varname: string): any {
        let current_state = this.getAll();

        if (typeof current_state[state_varname] === 'undefined') {
            throw new Error(`The key ${state_varname} was never set within the environment state.`);
        }
        return current_state[state_varname];
    }

    /**
     * Returns all values currently stored in state.
     */
    getAll(): {[k: string]: any} {
        return this.env.getObject(EnvKeys.STATE) ?? {};
    }

    
    /**
     * Tests if a given env var is stored in state.
     * 
     * @param {string} varname The name of the state variable to check
     */
     isset(state_varname: string): boolean {
        let current_state = this.getAll();
        return typeof current_state[state_varname] !== undefined;
    }
    
    /**
     * Returns all values currently stored in state.
     */
    setAll(current_state: any): this {
        this.env.setObject(EnvKeys.STATE, current_state ?? {});

        return this;
    }
    
    /**
     * Stores the variable in environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     * @param {any} value The value to set it to.
     */
    set(state_varname: string, value: any): State {
        let current_state = this.getAll();
        this.logger.log(`Setting ${state_varname} to be ${value}`, LogLevel.default, LogVerbosity.very_verbose);
        current_state[state_varname] = value;
        this.env.setObject(EnvKeys.STATE, current_state);
        this.logger.log(`New state: ${this.getAll()}`, LogLevel.default, LogVerbosity.very_verbose)

        return this;
    }

    /**
     * Stores the variable in environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     * @param {any} value The value to set it to.
     */
    delete(varname: string): State {
        let current_state = this.env.getObject(EnvKeys.STATE);
        delete current_state[varname];

        this.env.setObject(EnvKeys.STATE, current_state);

        return this;
    }
}
