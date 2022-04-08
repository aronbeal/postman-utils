import { is_empty } from "./Helpers";
import { BufferedLog } from "./BufferedLog";
const EnvKeys: { [k: string]: any } = {
    /**
     * The absolute URL to the API base (e.g. https://localhost:8443)
     */
    BASE_URL: 'baseUrl',

    ENVIRONMENT: 'environment',
    FLAG_ENABLE_BLACKFIRE: 'enableBlackfire',
    /**
     * An object to store collection-specific info in.
     */
    HEBBIA: 'hebbia',
    /**
    * Storage for operational state.  This should be reset to an empty object when resetting environment.
    * This is not fully in use yet.
    */
    STATE: 'state',
    /**
     * Storage for the utility script code fetched when environment is set.  Do not clear this value. 
     */
    UTILS: 'utils',
    VERSION: 'version',
}

/**
 * Says whether something is a valid postman env key.
 * @param {string} key The key to check.
 * @returns {boolean}
 */
const _is_env_key = (key: string): boolean => {
    return Array.from(Object.values(EnvKeys)).includes(key);
}

/**
 * Represents keys that change with individual requests, not with 
 * the application overall.
 */
const StateKeys: { [k: string]: any } = {
    ADMIN_PASSWORD: 'adminPassword',
    DEFAULT_CONTENT_TYPE: 'defaultContentType',
    DEFAULT_LANGUAGE: 'defaultLanguage',
    DEFAULT_PASSWORD: 'defaultPassword',
    SUPER_ADMIN_PASSWORD: 'superAdminPassword',
}

/**
 * Says whether something is a state env key.
 * 
 * @param {string} key The key to check.
 * @returns {boolean} true if state key, false if not.
 */
const _is_state_key = (key: string): boolean => Object.keys(StateKeys).includes(key);

/**
 * This represents a subset of PostmanEnv that can actually be 
 * passed externally by a caller, and is not reserved for internal
 * use.
 */
interface PostmanEnvArg {
    [index: string]: any;
    'baseUrl': string;
    'enableBlackfire': boolean;
}

interface StateEnv {
    'adminPassword': string;
    'defaultContentType': string;
    'defaultLanguage': string;
    'defaultPassword': string;
    'superAdminPassword': string;
}
/**
 * This represents a valid object that can be used to instantiate a Postman environment.
 */
interface PostmanEnv extends PostmanEnvArg {
    [index: string]: any;
    'version': string;
    'utils': any;
    'state': StateEnv;
}


/**
 * A list of env keys that *must* be passed when creating a new environment.
 */
const RequiredEnvKeys = [
    EnvKeys.BASE_URL,
    EnvKeys.ENVIRONMENT
];

/**
 * Says whether something is a required env key.
 * Required env keys MUST be set by the caller when creating a new environment.
 * 
 * @param {string} key The key to check.
 * @returns {boolean} true if required, false if not.
 */
const _is_required_key = (key: string): boolean => RequiredEnvKeys.includes(key);

/**
 * A list of env keys reserved for internal use.
 */
const RestrictedEnvKeys: Array<string> = [
    EnvKeys.KEY_UTILS,
    EnvKeys.KEY_STATE,
    EnvKeys.KEY_VERSION,
    EnvKeys.HEBBIA,
];

/**
 * Says whether something is a restricted env key.
 * Restricted keys are only cleared on a complete environment reset, and they must 
 * be replaced in a controlled fashion with env-specific values.
 * 
 * @param {string} key The key to check.
 * @returns {boolean} true if restricted, false if not.
 */
const _is_restricted_key = (key: string): boolean => RestrictedEnvKeys.includes(key);

/**
 * A list of env keys that *may* be passed when creating a new environment, but are not
 * required.
 */

const OptionalEnvKeys: Array<string> =
    ([] as string[])
        // Add all env keys.
        .concat(Object.values(EnvKeys))
        // Remove required env keys
        .filter((key) => !RequiredEnvKeys.includes(key))
        // Remove restricted env keys
        .filter((key) => !RestrictedEnvKeys.includes(key))

/**
 * Says whether something is an optional env key.
 * Optional keys are part of 
 * 
 * @param {string} key The key to check.
 * @returns {boolean}
 */
const _is_optional_key = (key: string): boolean => OptionalEnvKeys.includes(key);

/**
 * Because the environment at runtime cannot be type-checked via typescript, 
 * we need to have a runtime method for this particular assertion.  The type
 * going in and going out are both PostmanEnv, but this is a runtime check, so the
 * compiler can't know in advance.
 * 
 * @param arg An object that may or may not conform to the 
 *   PostmanEnv interface.
 */
function _assert_postman_env_arg(arg: PostmanEnvArg): void {
    if (typeof arg !== 'object') {
        throw new Error("Expected an object for postman env, got " + (typeof arg));
    }
    for (let k of Object.keys(arg)) {
        if (!_is_env_key(k)) {
            throw new Error(`${k} is not a known initializer key for postman.  Allowed values: ${Array.from(Object.values(EnvKeys)).join(', ')}`);
        }
        if (_is_restricted_key(k)) {
            throw new Error(`${k} is not allowed to be set externally.  This is an internal property.`);
        }
    }
    for (let k of RequiredEnvKeys) {
        if (typeof arg[k] === 'undefined') {
            throw new Error(`${k} is required, but is not set.`);
        }
    }
}

/**
 * Defines an environment, along with some constants that must always be present.
 * Environment state is stored in Postmark.
 */
class Environment {
    pm: Postman;
    logger: BufferedLog;
    constructor(pm: Postman, log: BufferedLog) {
        this.pm = pm;
        this.logger = log;
    }

    /**
     * Clears values of any environment keys that aren't env keys.
     * 
     * Requires the environment be non-dirty to start.
     */
    clear() {
        let env: JSONObject = this.pm.collectionVariables.toObject();
        if (typeof env !== 'object') {
            throw new Error('Could not construct initial postman environment from the postman environment');
        }
        this.logger.warn("Clearing environment state...");
        Object.keys(env)
            .filter(key => typeof key === 'string')
            .filter((key: string) => !_is_state_key(key))
            .map((key: string) => this.unset(EnvKeys.STATE + '.' + key));
        this.validate();
    }

    /**
     * Applies the passed environment to postman, clearing
     * any existing one first.
     * 
     * This is only meant to be invoked by the "Environment: " endpoints.
     * Clears the existing environment, and sets it fresh.
     * 
     * This will set the 'dirty' flag to be false as a result of calling.
     * 
     * @param {object}} desired_env A desired environmment key/value map.
     * This will be environment-specific.
     */
    apply(desired_env: PostmanEnvArg) {
        _assert_postman_env_arg(desired_env);
        // Create an environment out of expected defaults, coupled with 
        // passed values.
        const default_state: StateEnv = {
            'adminPassword': '',
            'defaultPassword': '#Ch@ng3M3!#',
            'defaultContentType': 'application/ld+json',
            'defaultLanguage': 'en',
            'superAdminPassword': '',
        };
        const default_env: PostmanEnvArg = {
            'baseUrl': '',
            'enableBlackfire': false,
            'verbosity': 1,
            'state': default_state,
            "version": "v2.0.0"
        };
        let final_env: PostmanEnvArg = Object.assign(
            default_env,
            desired_env
        );
        // Sanity checks pass, set the environment.
        this.logger.info("Clearing all values in pm.collectionVariables" );
        this.pm.collectionVariables.clear();
        // Create a new environment, assign defaults, then override with user-supplied values.
        for (let k in final_env) {
            this.set(k, final_env[k]);
        }
        // Do not clear EnvKeys.HEBBIA if set - this is for storage of items that utils does not manage.
        if (is_empty(this.get(EnvKeys.HEBBIA))) {
            this.set(EnvKeys.HEBBIA, null);
        }
        if (is_empty(this.get(EnvKeys.STATE))) {
            this.set(EnvKeys.STATE, null);
        }
        // This is just for initial validation.  Will be replaced with a 
        // real value later in processing.
        if (is_empty(this.get(EnvKeys.UTILS))) {
            this.set(EnvKeys.UTILS, null);
        }
        this.validate();
        this.logger.warn("Environment reset.");
    }

    /**
     * Asserts that a given enviroment variable is not undefined.
     *
     * @param {string} varname
     *   The variable name to assert.
     */
    assert(varname: string) {
        const fail_msg =
            'The environment variable ' +
            varname +
            ' should exist, but does not.  It may have been cleared by a prior operation, or not yet set with  the appropriate LIST or POST call.';
        if (!this.pm.collectionVariables.has(varname)) {
            throw new Error(fail_msg);
        }
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
        if (type !== 'string') {
            throw new Error(`Expected a string (serialized object) for variable ${varname}, but got ${type}`)
        }
        let result = JSON.parse(value);
        if (typeof result !== 'object') {
            throw new Error(`Could not decode ${varname}, into an object.`)
        }

        return result;
    }

    /**
     * Function for helping to display the current environment.
     * Filters out unimiportant elements from the environment, and sorts the keys.
     * 
     * @throws {Error} if called before postman/Environment sync.
     */
    filter(): {[k:string]:any} {
        const display_environment: JSONObject = {};
        const always_excluded = [
            EnvKeys.HEBBIA,
            EnvKeys.UTILS
        ]
        // These variables are more permanent.
        let postman_environment = this.pm.collectionVariables.toObject();
        Object.keys(postman_environment)
            .filter(key => !always_excluded.includes(key))
            .filter(key => _is_env_key(key))
            .filter(key => !_is_state_key(key))
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
        this.logger.info("Setting " + varname + " to " + value + " in pm.collectionVariables" );
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
        this.logger.info("Clearing " + varname + " in pm.collectionVariables" );
        this.pm.collectionVariables.toObject().keys()
            .filter((key: string) => (varname === key))
            .map((key: string) => this.pm.collectionVariables.unset(key));

        return this;
    }

    /**
     * Stores the variable in environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     * @param {any} value The value to set it to.
     */
    getState(varname: string): JSONObject {
        let state = this.get(EnvKeys.STATE);
        if (typeof state[varname] === 'undefined') {
            throw new Error(`The key ${varname} was never set within the environment state.`);
        }
        return state[varname];
    }
    
    /**
     * Stores the variable in environment state.  This isolated area is 
     * for tracking items that change between requests.
     * 
     * @param {string} varname The name of the state variable to retrieve.
     * @param {any} value The value to set it to.
     */
    setState(varname: string, value: any) {
        let state = this.get(EnvKeys.STATE);
        state[varname] = value;
        return this.set(EnvKeys.STATE, state);
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

        return this;
    }
}

export { PostmanEnvArg };
export default Environment;
