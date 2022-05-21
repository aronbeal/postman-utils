/**
 * @file CollectionState.ts
 * Represents collection state for the utilities scripts.  Set once during 
 * env init, but can be changed by individual requests.  These will
 * be related to utils functionality, NOT to the request/response
 * behaviour.
 */
import Environment, { EnvKeys } from "./Environment";
import { Logger, LogLevel, LogVerbosity } from "./Logger";

type CollectionStateValue = string | boolean | number | null;

export const CollectionStateKeys = {
    /**
     * The base URL for all requests.
     */
    BASE_URL: 'baseUrl',
    /**
     * One of 'developent', 'staging', or 'production'  
     */
    ENVIRONMENT: 'environment',
    /**
     * Whether to enable blackfire for every request.
     */
    FLAG_ENABLE_BLACKFIRE: 'enableBlackfire',
    /**
     * How verbose logging output should be.  Valid values are
     * 0 (silent) to 3 (very verbose).
     */
    VERBOSITY: 'verbosity',
    /**
     * The value to use for admin passwords.  This is made
     * distinct, as it may be hydrated dynamically.
     */
    ADMIN_PASSWORD: 'adminPassword',
    /**
     * The value to use for super admin passwords.  This is made
     * distinct, as it may be hydrated dynamically.
     */
    SUPER_ADMIN_PASSWORD: 'superAdminPassword',
    DEFAULT_CONTENT_TYPE: 'defaultContentType',
    DEFAULT_LANGUAGE: 'defaultLanguage',
    DEFAULT_PASSWORD: 'defaultPassword',
};
export interface CollectionStateKeysInterface {
    [k: string]: CollectionStateValue;
}

/**
 * Says whether something is a valid collection state key
 * 
 * @param {string} key The key to check.
 * @returns {boolean} true if collection state key, false if not.
 */
const _is_collection_state_key = (key: string): boolean => Object.values(CollectionStateKeys).includes(key);

const default_collection_state: CollectionStateKeysInterface = {
    [CollectionStateKeys.ADMIN_PASSWORD]: '#Ch@ng3M3!#',
    [CollectionStateKeys.BASE_URL]: null,
    [CollectionStateKeys.DEFAULT_CONTENT_TYPE]: 'application/ld+json',
    [CollectionStateKeys.DEFAULT_LANGUAGE]: 'en',
    [CollectionStateKeys.DEFAULT_PASSWORD]: '#Ch@ng3M3!#',
    [CollectionStateKeys.ENVIRONMENT]: null,
    [CollectionStateKeys.FLAG_ENABLE_BLACKFIRE]: false,
    [CollectionStateKeys.SUPER_ADMIN_PASSWORD]: '#Ch@ng3M3!#',
    [CollectionStateKeys.VERBOSITY]: 1,
}

const prefs_assertions: { [k: string]: Function } = {
    [CollectionStateKeys.ADMIN_PASSWORD]: (v: any) => typeof v === 'string',
    [CollectionStateKeys.BASE_URL]: (v: any) => typeof v === 'string',
    [CollectionStateKeys.DEFAULT_CONTENT_TYPE]: (v: any) => typeof v === 'string',
    [CollectionStateKeys.DEFAULT_LANGUAGE]: (v: any) => typeof v === 'string',
    [CollectionStateKeys.DEFAULT_PASSWORD]: (v: any) => typeof v === 'string',
    [CollectionStateKeys.ENVIRONMENT]: (v: any) => ['development', 'staging', 'production'].some(v),
    [CollectionStateKeys.FLAG_ENABLE_BLACKFIRE]: (v: any) => v === undefined || typeof v === 'boolean',
    [CollectionStateKeys.SUPER_ADMIN_PASSWORD]: (v: any) => typeof v === 'string',
    [CollectionStateKeys.VERBOSITY]: (v: any) => v === undefined || typeof v === 'number'
};
/**
 * Validates that the passed collection state is valid.
 * @param maybe_collection_state 
 */
export const validate_collection_state = (maybe_collection_state: any): CollectionStateKeysInterface => {
    for (let key of Object.keys(maybe_collection_state)) {
        if (!_is_collection_state_key(key)) {
            throw new Error(`${key} is not a known collection state key.`);
        }
        if (maybe_collection_state[key] === null) {
            throw new Error(`The collection state ${key} was never set.`);
        }
        const assertion = prefs_assertions[key];
        if (!assertion(maybe_collection_state[key])) {
            throw new Error(`The value passed for the collection state key ${key} did not match the expected type.`);
        }
    }

    return maybe_collection_state;
};

export default class CollectionState {
    logger: Logger;
    env: Environment;
    constructor(env: Environment, log: Logger) {
        this.logger = log;
        this.env = env;
    }

    /**
     * Validates that the collection state in the current environment 
     * is valid.
     */
    public validate(): this {
        let current_collection_state = this.env.getObject(EnvKeys.COLLECTION_STATE);
        validate_collection_state(current_collection_state);

        return this;
    }

    /**
     * Applies any passed collection state to the environment.
     * This is meant to be an exclusive op, overwriting what's there.
     */
    public apply(collection_state: any): this {
        collection_state = validate_collection_state(collection_state);
        this.reset();
        Object.keys(collection_state).map((pref: string) => this.set(pref, collection_state[pref]));

        return this;
    }

    /**
     * Returns all values currently stored in collection state.
     */
    getAll(): { [k: string]: any } {
        return this.env.getObject(EnvKeys.COLLECTION_STATE);
    }

    /**
     * Resets current state to default state.
     */
    reset(): this {
        this.logger.log("Clearing environment collection state...", LogLevel.info, LogVerbosity.verbose);
        this.env.setObject(EnvKeys.COLLECTION_STATE, default_collection_state);

        return this;
    }

    /**
     * Stores the variable in environment collection state.
     * 
     * @param {string} varname The name of the collection state variable to retrieve.
     * @param {any} value The value to set it to.
     */
    set(key: string, value: any): this {
        let current_collection_state = this.env.getObject(EnvKeys.COLLECTION_STATE);
        if (current_collection_state === undefined) {
            throw new Error('Prefs was undefined!  This should not have happened, check CollectionState.ts in postman-utils');
        }
        current_collection_state[key] = value;
        this.env.setObject(EnvKeys.COLLECTION_STATE, current_collection_state);
        if (key === CollectionStateKeys.VERBOSITY) {
            this.logger.setVerbosity(value);
        }
        return this;
    }

    /**
     * Retrieves the variable from environment prefs.  
     * 
     * @param {string} pref_name The name of the collection state variable to retrieve.
     */
    get(pref_name: string): any {
        if (!_is_collection_state_key(pref_name)) {
            throw new Error(`${pref_name} is not a known preference key.`);
        }
        let current_collection_state = this.env.getObject(EnvKeys.COLLECTION_STATE);

        if (typeof current_collection_state[pref_name] === 'undefined') {
            throw new Error(`The key ${pref_name} was never set within the environment preferences.`);
        }
        return current_collection_state[pref_name];
    }
}
