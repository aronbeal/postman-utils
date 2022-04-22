
/**
 * @file State.ts
 * A sub-set of Environment stored in a separate serialized section,
 * this tracks state between requests to the API.  This is
 * intended to make it easier to reset state on demand.
 * 
 * Unlike Preferences, STATE makes no assertions about what
 * keys it contains.
 */
import Environment, { EnvKeys } from './Environment';
import { Logger, LogLevel, LogVerbosity } from "./Logger";

interface StateKeysInterface {
    [index: string]: any;
}
/**
 * Validates that the passed preferences are valid.
 * @param preferences 
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
     * Validates that the passed state is valid.
     * @param preferences 
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
        this.logger.log("Clearing state...", LogLevel.warn, LogVerbosity.verbose);
        this.env.setObject(EnvKeys.STATE, {});
    }

    /**
     * Retrieves the variable from environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     */
    get(varname: string): any {
        let current_state = this.env.getObject(EnvKeys.STATE);
        let state_varname: string = varname.replace(EnvKeys.STATE + '.', '');

        if (typeof current_state[state_varname] === 'undefined') {
            throw new Error(`The key ${state_varname} was never set within the environment state.`);
        }
        return current_state[state_varname];
    }

    /**
     * Returns all values currently stored in state.
     */
    getAll(): {[k: string]: any} {
        return this.env.getObject(EnvKeys.STATE);
    }

    /**
     * Stores the variable in environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     * @param {any} value The value to set it to.
     */
    set(state_varname: string, value: any): State {
        state_varname = state_varname.replace(EnvKeys.STATE + '.', '');
        let current_state = this.env.getObject(EnvKeys.STATE);

        current_state[state_varname] = value;
        this.env.setObject(EnvKeys.STATE, current_state);

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
