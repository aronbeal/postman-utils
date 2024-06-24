import { is_empty } from "./Helpers";
import Logger, { LogLevel, LogVerbosity } from "./Logger";

/**
 * This represents a subset of EnvKeysInterface that can actually be 
 * passed externally by a caller, and is not reserved for internal
 * use.
 */
interface PostmanEnvArgInterface {
    [index: string]: any;
}

/**
 * Responsible for persisting and loading values to and from Postman in a consistent manner.
 */
class Environment {
    pm: Postman;
    logger: Logger;
    constructor(pm: Postman, log: Logger) {
        this.pm = pm;
        this.logger = log;
    }

    /**
     * Asserts that a given local variable is not undefined.
     * 
     * Note: this uses local variables, not collection variables - that
     * is not an error.
     * 
     * Variables are populated locally to pm.variables during prerequest()
     * in utils.  This is for callers to ensure that a given state or 
     * or collection state variable was set properly.
     *
     * @param {string} varname
     *   The variable name to assert.
     */
    public assertPostmanVariable(varname: string): this {
        if (!this.pm.variables.has(varname)) {
            throw new Error(`The environment variable ${varname} should exist as a local variable, but does not.  It may have been cleared by a prior operation, or not yet set with the appropriate LIST or POST call.`);
        }

        return this;
    }

    /**
     * Returns whether or not the given state storage key has been populated.
     */
    public hasState(storage_key: string): boolean {
        return this.pm.collectionVariables.has(storage_key);
    }
    /**
     * Returns the State value for the storage key, deserialized into an object.
     */
    public loadState(storage_key: string): JSONObject {
        if (!this.hasState(storage_key)) {
            throw new Error(`Attempted to load a non-existent storage key: ${storage_key}`);
        }
        let stringified_value = this.getCollectionVariable(storage_key);
        if (stringified_value === undefined) {
            return stringified_value;
        }
        let type = (typeof stringified_value);
        if (type !== 'string') {
            throw new Error(`Expected a string (serialized object) for environment variable key ${storage_key}, but got ${type}`)
        }
        try {
            let result = JSON.parse(stringified_value);
            if (typeof result !== 'object') {
                throw new Error();
            }
            return result;
        } catch(e) {
            throw new Error(`Could not decode ${storage_key}, into a state object.`)
        }

    }

    /**
     * Saves the current state to storage.
     * @returns
     */
    public saveState(storage_key: string, state: JSONObject): this {
        if (typeof state !== 'object') {
            throw new Error(`Current state ${state} not recognizable as a state object.`)
        }
        let serialized_value = JSON.stringify(state);

        if (typeof serialized_value !== 'string') {
            throw new Error(`Expected a string (serialized object) for variable ${state}, but got ${typeof state}`)
        }
        this.setCollectionVariable(storage_key, serialized_value);

        return this;
    }

    /**
     * Clears all collection variables.
     * 
     * Returns this object, for chaining.
     */
    public clearCollectionVariables(): this {
        this.pm.collectionVariables.clear();

        return this;
    }

    /**
     * Fetches the value of a variable in the environment.
     * 
     * @param {string} varname the name of the variable to fetch.
     * @returns {any} returns the value, or undefined if not set.
     */
    public getCollectionVariable(varname: string): any {
        let value = this.pm.collectionVariables.get(varname);
        return is_empty(value) ? undefined : value;
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
    public setCollectionVariable(varname: string, value: any): Environment {
        this.logger.log("Environment: setting " + varname + " to " + value, LogLevel.info, LogVerbosity.minimal);
        this.pm.collectionVariables.set(varname, value);
        this.logger.log(['Collection variables in utils', this.pm.collectionVariables.toObject()], LogLevel.info, LogVerbosity.very_verbose);
        return this;
    }

    /**
     * Unsets the given environment variable.
     * @param string varname
     *   The variable name to clear.
     * 
     * @returns {this}
     */
    public unsetCollectionVariable(varname: string): Environment {
        this.logger.log("Clearing " + varname + " in pm.collectionVariables", LogLevel.info, LogVerbosity.very_verbose);
        Object.keys(this.pm.collectionVariables.toObject())
            .filter((key: string) => (varname === key))
            .map((key: string) => this.pm.collectionVariables.unset(key));

        return this;
    }
}

export { PostmanEnvArgInterface };
export default Environment;
