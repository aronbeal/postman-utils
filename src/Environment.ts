import { Hash } from "crypto";
import { type } from "os";
import { is_empty } from "./Helpers";

const EnvKeys: { [k: string]: any } = {
    ADMIN_PASSWORD: 'adminPassword',
    /**
     * The absolute URL to the API base (e.g. https://localhost:8443)
     */
    BASE_URL: 'baseUrl',
    DEFAULT_CONTENT_TYPE: 'defaultContentType',
    DEFAULT_LANGUAGE: 'defaultLanguage',
    DEFAULT_PASSWORD: 'defaultPassword',
    ENVIRONMENT: 'environment',
    FLAG_ENABLE_BLACKFIRE: 'enableBlackfire',
    /**
    * Storage for operational state.  This should be reset to an empty object when resetting environment.
    * This is not fully in use yet.
    */
    STATE: 'state',
    SUPER_ADMIN_PASSWORD: 'superAdminPassword',
    /**
     * Storage for the utility script code fetched when environment is set.  Do not clear this value. 
     */
    UTILS: 'utils',
    VERSION: 'version',
}

/**
 * This represents a subset of PostmanEnv that can actually be 
 * passed externally by a caller, and is not reserved for internal
 * use.
 */
interface PostmanEnvArg {
    [index: string]: any;
    'adminPassword'?: string;
    'baseUrl'?: string;
    'defaultContentType': string;
    'defaultLanguage': string;
    'defaultPassword': string;
    'enableBlackfire': boolean;
    'superAdminPassword'?: string;
}

/**
 * This represents a valid object that can be used to instantiate a Postman environment.
 */
interface PostmanEnv {
    [index: string]: any;
    'adminPassword': string,
    'baseUrl': string;
    'defaultContentType': string;
    'defaultLanguage': string;
    'defaultPassword': string;
    'enableBlackfire': boolean;
    'superAdminPassword': string;
    'version': string;
    'utils': any;
    'state': any;
}

/**
 * Says whether something is a valid postman env key.
 * @param {string} key The key to check.
 * @returns {boolean}
 */
const _is_env_key = (key: string): boolean => key in EnvKeys.keys();

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
    EnvKeys.KEY_VERSION
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
        .concat(EnvKeys.keys())
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
    if (!(typeof arg === 'object')) {
        throw new Error("Expected an object for postman env, got " + (typeof arg));
    }
    for (let k of Object(arg).keys()) {
        if (!_is_env_key(k)) {
            throw new Error(`${k} is not a known initializer key for postman.`);
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
 * Environment state is stored in Postmark.  An environment object will be marked
 * "dirty" if it is out of sync with the actual postman env.
 */
export default class Environment {
    pm: Postman;
    dirty: boolean;
    constructor(pm: Postman) {
        this.pm = pm;
        // Starts dirty until setEnv() is called.
        this.dirty = true;
        this.validate();
    }

    /**
     * A dirty environment is not fully in sync with the postman environment.
     * @returns 
     */
    isDirty(): boolean {
        return this.dirty;
    }

    /**
     * Clears values of any environment keys that aren't env keys.
     * 
     * Requires the environment be non-dirty to start.
     */
    clear() {
        let env: JSONObject = this.pm.environment.toObject();
        if (this.isDirty()) {
            throw new Error("Error: clear() called, but the Environment is not in sync with Postman.");
        }
        this.dirty = true;
        Object.keys(env)
            .filter(key => typeof key === 'string')
            .filter((key: string) => !_is_env_key(key))
            .map(key => this.pm.environment.unset(key));
        this.validate();

    }

    /**
     * Resets environment to default values.
     * 
     * This is only meant to be invoked by the "Environment: " endpoints.
     * Clears the existing environment, and sets it fresh.
     * 
     * This will set the 'dirty' flag to be false as a result of calling.
     * 
     * @param {object}} desired_env A desired environmment key/value map.
     * This will be environment-specific.
     */
    setEnv(desired_env: PostmanEnvArg) {
        console.info("Resetting environment");
        _assert_postman_env_arg(desired_env);
        // Create an environment out of expected defaults, coupled with 
        // passed values.
        const default_env = {
            'adminPassword': '',
            'baseUrl': '',
            'defaultContentType': 'application/ld+json',
            'defaultLanguage': 'en',
            'defaultPassword': '#Ch@ng3M3!#',
            'enableBlackfire': false,
            'superAdminPassword': '',
        };
        let final_env: PostmanEnv = Object.assign(
            {},
            default_env,
            desired_env,
            {
                "state": {},
                "version": "v2.0.0",
                "utils": {}
            }
        );
        // Sanity checks pass, set the environment.
        this.pm.environment.clear();
        // Create a new environment, assign defaults, then override with user-supplied values.
        for (let k in final_env) {
            this.set(k, final_env[k]);
        }
        this.validate();
        console.log("Environment", this.pm.environment.toObject());
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
        try {
            this.pm.expect(this.pm.environment.has(varname)).to.be.true;
        } catch (e) {
            this.pm.expect(fail_msg).to.be.empty;
        }
    }

    /**
     * Fetches the value of a variable in the environment.
     * 
     * @param {string} varname the name of the variable to fetch.
     * @returns {any} returns the value, or undefined if not set.
     */
    get(varname: string): any {
        let value = this.pm.environment.get(varname);
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
    filter(): {
        'environment': JSONObject,
        'state': JSONObject
    } {
        if (this.isDirty()) {
            throw new Error("Error: get() called, but the Environment is not in sync with Postman.");
        }
        const display_environment: JSONObject = {};
        const state: JSONObject = {};
        // These variables are more permanent.
        let postman_environment = this.pm.environment.toObject();
        Object.keys(postman_environment)
            .filter(key => _is_env_key(key))
            .sort()
            .forEach(key => display_environment[key] = postman_environment[key]);
        // These variables represent state.
        // Object.keys(env)
        //     .filter(key => !_is_restricted_key(key))
        //     .filter(key => !key in keys)
        //     .sort()
        //     .forEach(key => state[key] = env[key]);

        return {
            'environment': display_environment,
            'state': state
        };
    }

    /**
     * Returns the keys for the current environment.
     */
    keys(): Array<string> {
        // Direct from Postman, no dirty check required.
        return this.pm.environment.toObject().keys();
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
        if (is_empty(value)) {
            throw new Error(`Cannot set an empty value for {varname}`);
        }
        this.pm.environment.set(varname, value);

        return this;
    }

    /**
     * Sets a variable to an object value. Objects set in this fashion must be
     * serializable via JSON.
     *
     * @param {string} varname The variable where the object is to be stored.
     * @param {object} o The object to store.
     * 
     * @returns {this}
     *
     * Throws an exception if not set. Throws an exception if cannot be parsed into
     * an object.
     */
    setObject(varname: string, o: JSONObject): Environment {
        if (typeof o !== 'object') {
            throw new Error(`Value passed for set_object is not an object.`)
        }
        let serialized = JSON.stringify(o);
        if (typeof serialized !== 'string') {
            console.error(o);
            throw new Error("Could not convert object to string. setObject() only allows storing json-serializable objects");
        }
        this.set(varname, serialized);

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
        this.pm.environment.toObject().keys()
            .filter((key: string) => (varname === key))
            .map((key: string) => this.pm.environment.unset(key));

        return this;
    }

    /**
     * Asserts the stored Postman environment contains all expected keys.
     * 
     * Sets the environment to 'dirty = false` as a result.
     * 
     * @returns {this}
     */
    private validate(): Environment {
        for (let k of EnvKeys.keys()) {
            if (!this.pm.environment.has(k)) {
                throw new Error(`The required key ${k} is not present in postman.`);
            }
            if (_is_restricted_key(k)) {
                throw new Error(`${k} is not allowed to be set externally.  This is an internal property.`);
            }
        }
        this.dirty = false;

        return this;
    }
}

export { PostmanEnvArg };
