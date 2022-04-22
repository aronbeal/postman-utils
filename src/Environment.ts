import { is_empty } from "./Helpers";
import { Logger, LogLevel, LogVerbosity } from "./Logger";
import State from './State';
import Preferences, { PreferenceKeysInterface, PreferenceKeys } from './Preferences';
/**
 * Constant values so we can represent the keys in the environment by
 * named constants rather than literal strings, and so we can do 
 * runtime checks against passed arguments.
 */
 export const EnvKeys = {
    /**
     * Preferences are set only on environment reset. 
     */
    PREFERENCES: 'preferences',
    /**
    * Storage for operational state.  This should be reset to an empty object when resetting environment.
    * This is not fully in use yet.
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
    preferences: Preferences;
    constructor(pm: Postman, log: Logger) {
        this.pm = pm;
        this.logger = log;
        this.state = new State(this, log);
        this.preferences = new Preferences(this, log);
    }

    /**
     * Clears the current environment.
     * 
     * This is only meant to be invoked by the "Environment: " endpoints.
     * Clears the existing environment, and sets it fresh.
     */
    clear(): Environment {
        // Create an environment out of expected defaults, coupled with 
        // passed values.
        const default_env = {
            [EnvKeys.PREFERENCES]: this.preferences,
            [EnvKeys.STATE]: this.state,
            "version": "v2.0.0"
        };
        // Sanity checks pass, set the environment.
        this.pm.collectionVariables.clear();
        this.preferences.reset();
        this.state.reset();
        this.set(EnvKeys.VERSION, 'v2.0.0');
        // Create a new environment, assign defaults, then override with user-supplied values.

        this.validate();
        this.logger = new Logger(this.preferences.get(PreferenceKeys.VERBOSITY));
        this.logger.log("Environment reset.", LogLevel.warn, LogVerbosity.minimal);

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
    getObject(varname: string): JSONObject {
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
     setObject(varname: string, value: JSONObject): this {
        if (typeof value !== 'object'|| Object(value) !== value) {
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
     * 
     * @throws {Error} if called before postman/Environment sync.
     */
    filter(): { [k: string]: any } {
        const display_environment: JSONObject = {};

        // These variables are more permanent.
        let postman_environment = this.pm.collectionVariables.toObject();
        Object.keys(postman_environment)
            .filter(key => _is_env_key(key))
            .sort()
            .forEach(key => display_environment[key] = postman_environment[key]);

        return display_environment;
    }

    /**
     * Returns the keys for the current environment.
     */
    keys(): Array<string> {
        // Direct from Postman, no dirty check required.
        return this.pm.collectionVariables.toObject().keys();
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
        this.logger.log("Setting " + varname + " to " + value + " in pm.collectionVariables", LogLevel.info, LogVerbosity.verbose);
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
        this.logger.log("Clearing " + varname + " in pm.collectionVariables", LogLevel.info, LogVerbosity.verbose);
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
     * Returns a Preferences object for manipulating preferences.
     */
    getPreferences(): Preferences {
        return this.preferences;
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
        this.preferences.validate();
        this.state.validate();

        return this;
    }
}

export { PostmanEnvArgInterface };
export default Environment;
