/**
 * @file Preferences.ts
 * Represents preferences for the utilities scripts.  Set once during 
 * env init, but can be changed by individual requests.  These will
 * be related to utils functionality, NOT to the request/response
 * behaviour.
 */
import Environment, { EnvKeys } from "./Environment";
import { Logger, LogLevel, LogVerbosity } from "./Logger";

type PreferenceValue = string | boolean | number | null;

export const PreferenceKeys = {
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
    SUPER_ADMIN_PASSWORD: 'adminPassword',
    DEFAULT_CONTENT_TYPE: 'defaultContentType',
    DEFAULT_LANGUAGE: 'defaultLanguage',
    DEFAULT_PASSWORD: 'defaultPassword',
};
export interface PreferenceKeysInterface {
    [k: string]: PreferenceValue;
}

/**
 * Says whether something is a valid preference key
 * 
 * @param {string} key The key to check.
 * @returns {boolean} true if preference key, false if not.
 */
const _is_preference_key = (key: string): boolean => Object.values(PreferenceKeys).includes(key);

const default_prefs: PreferenceKeysInterface = {
    [PreferenceKeys.ADMIN_PASSWORD]: '#Ch@ng3M3!#',
    [PreferenceKeys.BASE_URL]: null,
    [PreferenceKeys.DEFAULT_CONTENT_TYPE]: 'application/ld+json',
    [PreferenceKeys.DEFAULT_LANGUAGE]: 'en',
    [PreferenceKeys.DEFAULT_PASSWORD]: '#Ch@ng3M3!#',
    [PreferenceKeys.ENVIRONMENT]: null,
    [PreferenceKeys.FLAG_ENABLE_BLACKFIRE]: false,
    [PreferenceKeys.SUPER_ADMIN_PASSWORD]: '#Ch@ng3M3!#',
    [PreferenceKeys.VERBOSITY]: 1,
}

const prefs_assertions: { [k: string]: Function } = {
    [PreferenceKeys.ADMIN_PASSWORD]: (v: any) => typeof v === 'string',
    [PreferenceKeys.BASE_URL]: (v: any) => typeof v === 'string',
    [PreferenceKeys.DEFAULT_CONTENT_TYPE]: (v: any) => typeof v === 'string',
    [PreferenceKeys.DEFAULT_LANGUAGE]: (v: any) => typeof v === 'string',
    [PreferenceKeys.DEFAULT_PASSWORD]: (v: any) => typeof v === 'string',
    [PreferenceKeys.ENVIRONMENT]: (v: any) => ['development', 'staging', 'production'].some(v),
    [PreferenceKeys.FLAG_ENABLE_BLACKFIRE]: (v: any) => v === undefined || typeof v === 'boolean',
    [PreferenceKeys.SUPER_ADMIN_PASSWORD]: (v: any) => typeof v === 'string',
    [PreferenceKeys.VERBOSITY]: (v: any) => v === undefined || typeof v === 'number'
};
/**
 * Validates that the passed preferences are valid.
 * @param preferences 
 */
export const validate_preferences = (preferences: any): PreferenceKeysInterface => {
    for (let key of Object.keys(preferences)) {
        if (!_is_preference_key(key)) {
            throw new Error(`${key} is not a known preference key.`);
        }
        if (preferences[key] === null) {
            throw new Error(`The preference ${key} was never set.`);
        }
        const assertion = prefs_assertions[key];
        if (!assertion(preferences[key])) {
            throw new Error(`The value passed for the preference key ${key} did not match the expected type.`);
        }
    }

    return preferences;
};

export default class Preferences {
    logger: Logger;
    env: Environment;
    constructor(env: Environment, log: Logger) {
        this.logger = log;
        this.env = env;
    }

    /**
     * Validates that the preferences in the current environment 
     * are valid.
     */
    public validate(): this {
        let current_prefs = this.env.getObject(EnvKeys.PREFERENCES);
        validate_preferences(current_prefs);

        return this;
    }

    /**
     * Applies any passed preferences to the environment.
     * This is meant to be an exclusive op, overwriting what's there.
     */
    public apply(preferences: any): this {
        preferences = validate_preferences(preferences);
        this.reset();
        Object.keys(preferences).map((pref: string) => this.set(pref, preferences[pref]));

        return this;
    }

    /**
     * Returns all values currently stored in preferences.
     */
    getAll(): { [k: string]: any } {
        return this.env.getObject(EnvKeys.PREFERENCES);
    }

    /**
     * Resets current state to default state.
     */
    reset(): this {
        this.logger.log("Clearing environment preferences...", LogLevel.info, LogVerbosity.verbose);
        this.env.setObject(EnvKeys.PREFERENCES, default_prefs);

        return this;
    }

    /**
     * Stores the variable in environment preferences.
     * 
     * @param {string} varname The name of the preference variable to retrieve.
     * @param {any} value The value to set it to.
     */
    set(pref_name: string, value: any): this {
        let current_prefs = this.env.getObject(EnvKeys.PREFERENCES);
        if (current_prefs === undefined) {
            throw new Error('Prefs was undefined!  This should not have happened, check Preferences.ts in postman-utils');
        }
        current_prefs[pref_name] = value;
        this.env.setObject(EnvKeys.PREFERENCES, current_prefs);
        if (pref_name === PreferenceKeys.VERBOSITY) {
            this.logger.setVerbosity(value);
        }
        return this;
    }

    /**
     * Retrieves the variable from environment prefs.  
     * 
     * @param {string} varname The name of the preference to retrieve.
     */
    get(pref_name: string): any {
        if (!_is_preference_key(pref_name)) {
            throw new Error(`${pref_name} is not a known preference key.`);
        }
        let current_prefs = this.env.getObject(EnvKeys.PREFERENCES);

        if (typeof current_prefs[pref_name] === 'undefined') {
            throw new Error(`The key ${pref_name} was never set within the environment preferences.`);
        }
        return current_prefs[pref_name];
    }
}
