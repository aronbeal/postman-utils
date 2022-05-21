import { is_empty } from "./Helpers";
import { Logger, LogLevel, LogVerbosity } from "./Logger";
import State from './State';
import CollectionState, { CollectionStateKeys } from './CollectionState';
/**
 * Constant values so we can represent the keys in the environment by
 * named constants rather than literal strings, and so we can do 
 * runtime checks against passed arguments.
 */
export const EnvKeys = {
    /**
     * Collection state is set only on environment reset. It lives in 
     * pm.collectionVariables, and is persisted to variables for individual
     * requests.  It has a predefined set of variables it allows.
     */
    COLLECTION_STATE: 'collection-state',
    /**
    * Operational state lives in a separate section in collection variables.
    * It can be mutated by any individual request. It has no predefined 
    * structue.
    */
    STATE: 'state',
    /**
     * The version of this script.
     */
    VERSION: 'version',
};


/**
 * Says whether something is a valid postman env key.
 * @param {string} key The key to check.
 * @returns {boolean}
 */
const _is_env_key = (key: string): boolean => {
    return Array.from(Object.values(EnvKeys)).includes(key);
}

/**
 * This represents a subset of EnvKeysInterface that can actually be 
 * passed externally by a caller, and is not reserved for internal
 * use.
 */
interface PostmanEnvArgInterface {
    [index: string]: any;
}

/**
 * Defines an environment, along with some constants that must always be present.
 * Environment state is stored in Postmark.
 */
class Environment {
    pm: Postman;
    logger: Logger;
    state: State;
    collection_state: CollectionState;
    constructor(pm: Postman, log: Logger) {
        this.pm = pm;
        this.logger = log;
        this.state = new State(this, log);
        this.collection_state = new CollectionState(this, log);
    }
    /**
     * For some reason, the internally stored copy of pm doesn't reflect changes
     * in the "Tests" section.  When called with pretests(), updates the object
     * so it will work properly.
     */
    setPm(pm: Postman) {
        this.pm = pm;
    }
    /**
     * Clears the current environment.
     * 
     * This effectively clears operational state, and applies the passed
     * values to collection state, "resetting" the environment to a known
     * commodity.  You would call this when you want to completely change 
     * your environment, by enabling blackfire or talking to production,
     * or some large-scale change.
     * 
     * This is only meant to be invoked by the "Environment: " endpoints.
     * Clears the existing environment, and sets it fresh.
     */
    reset(collection_state: any): Environment {
        // Create an environment out of expected defaults, coupled with 
        // passed values.
        const default_env = {
            [EnvKeys.COLLECTION_STATE]: this.collection_state,
            [EnvKeys.STATE]: this.state,
            "version": "v2.0.0"
        };
        // Sanity checks pass, set the environment.
        // Most times, we deal with pm.variables, but this is for clearing
        // the script itself.
        this.pm.collectionVariables.clear();
        this.collection_state.apply(collection_state);
        this.state.reset();
        this.set(EnvKeys.VERSION, 'v2.0.0');
        // Create a new environment, assign defaults, then override with user-supplied values.

        this.validate();
        this.logger = new Logger(this.collection_state.get(CollectionStateKeys.VERBOSITY));
        this.logger.log("Environment reset.", LogLevel.info, LogVerbosity.verbose);
        this.logger.dump(this.filter(), LogLevel.info, LogVerbosity.verbose);

        return this;
    }

    /**
     * Fetches the value of a variable in the environment.
     * 
     * @param {string} varname the name of the variable to fetch.
     * @returns {any} returns the value, or undefined if not set.
     */
    get(varname: string): any {
        let value = this.pm.collectionVariables.get(varname);
        return is_empty(value) ? undefined : value;
    }

    /**
     * Returns the object stored in the var.
     * Objects set in this fashion must be
     * serializable via JSON.
     * 
     * @param {string} varname The variable where the object is stored.
     * @returns {object} The object stored at varname
     * 
     * Throws an exception if not set.
     * Throws an exception if cannot be parsed into an object.
     */
    getObject(varname: string): any {
        let value = this.get(varname);
        if (value === undefined) {
            return value;
        }
        let type = (typeof value);
        if (type === 'object' && Object(value) === value) {
            return value;
        }
        if (type !== 'string') {
            throw new Error(`Expected a string (serialized object) for environment variable key ${varname}, but got ${type}`)
        }
        let result = JSON.parse(value);
        if (typeof result !== 'object') {
            throw new Error(`Could not decode ${varname}, into an object.`)
        }

        return result;
    }

    /**
     * Sets the object 
     * Objects set in this fashion must be
     * serializable via JSON.
     * 
     * @param {string} varname The variable where the object is stored.
     * @returns {object} The object stored at varname
     * 
     * Throws an exception if not set.
     * Throws an exception if cannot be parsed into an object.
     */
    setObject(varname: string, value: any): this {
        if (typeof value !== 'object' || Object(value) !== value) {
            throw new Error(`Value ${value} not recognizable as an object.`)
        }
        let serialized_value = JSON.stringify(value);

        if (typeof serialized_value !== 'string') {
            throw new Error(`Expected a string (serialized object) for variable ${varname}, but got ${typeof value}`)
        }
        this.set(varname, serialized_value);

        return this;
    }

    /**
     * Function for helping to display the current environment.
     * Filters out unimiportant elements from the environment, and sorts the keys.
     */
    filter(): { [k: string]: any } {
        return {
            [EnvKeys.COLLECTION_STATE]: this.getObject(EnvKeys.COLLECTION_STATE),
            [EnvKeys.STATE]: this.getObject(EnvKeys.STATE),
            [EnvKeys.VERSION]: this.get(EnvKeys.VERSION)
        };
    }

    /**
     * Sets a named environment variable to a given value.
     * 
     * @param {string} varname
     *   The name of the variable to set.
     * @param {string} value
     *   The value to set it to.  Most likely scalar, but not restricted.
     * 
     * @returns {this}
     */
    set(varname: string, value: any): Environment {
        this.logger.log("Environment: setting " + varname + " to " + value, LogLevel.info, LogVerbosity.minimal);
        this.pm.collectionVariables.set(varname, value);
        return this;
    }

    /**
     * Unsets the given environment variable.
     * @param string varname
     *   The variable name to clear.
     * 
     * @returns {this}
     */
    unset(varname: string): Environment {
        this.logger.log("Clearing " + varname + " in pm.collectionVariables", LogLevel.info, LogVerbosity.very_verbose);
        this.pm.collectionVariables.toObject().keys()
            .filter((key: string) => (varname === key))
            .map((key: string) => this.pm.collectionVariables.unset(key));

        return this;
    }

    /**
     * Returns a State object for manipulating state.
     */
    getState(): State {
        return this.state;
    }

    /**
     * Returns a CollectionState object for manipulating collection state.
     */
    getCollectionState(): CollectionState {
        return this.collection_state;
    }

    /**
     * Asserts the stored Postman environment contains all expected keys.
     * 
     * Sets the environment to 'dirty = false` as a result.
     * 
     * @returns {this}
     */
    validate(): Environment {
        for (const [c, k] of Object.entries(EnvKeys)) {
            if (!this.pm.collectionVariables.has(k)) {
                throw new Error(`The required key ${k} is not present in postman.`);
            }
        }
        this.collection_state.validate();
        this.state.validate();

        return this;
    }
}

export { PostmanEnvArgInterface };
export default Environment;
