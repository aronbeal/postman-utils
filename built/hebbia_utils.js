var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define("BufferedLog", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferedLog = void 0;
    /**
     * For storing loggable messages so they can be output all at once.
     */
    class BufferedLog {
        constructor() {
            this.msgs = [];
            this.clear();
        }
        /**
         * Logs a message for later output.
         *
         * @param  {...any} args
         *   One or more objects to store for later log output.
         *
         * See also _output_log(), in this object.
         */
        log(...args) {
            args.map(arg => this.msgs.push(arg));
        }
        /**
         * Clears the log without output.
         */
        clear() {
            this.msgs = [];
        }
        /**
         * Returns all internally stored messages.
         *
         * @returns Array<string>
         */
        all() {
            return this.msgs;
        }
    }
    exports.BufferedLog = BufferedLog;
});
define("Helpers", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.random_string = exports.is_empty = exports.iri_to_id = void 0;
    /**
     * Conversion utilities used in multiple places.
     */
    const iri_to_id = (iri) => {
        if (typeof iri !== 'string') {
            throw new Error("Error: Non-string value passed to iri_to_id()");
        }
        return iri.replace(/.*\/([^\/]+)$/, '$1').toString();
    };
    exports.iri_to_id = iri_to_id;
    /**
     * Internal function to test whether a value "empty", for
     * environmental purposes.
     *
     * @param {string} value The value to test.pn
     * @returns {boolean} true if undefined, null, or empty string.
     */
    const is_empty = (value) => value === undefined || value === null || value === '';
    exports.is_empty = is_empty;
    /**
     * Generates a random ASCII string, limited by charsets.
     *
     * @param length The desired string length
     * @param chars A string containing one or more of:
     * - a: Include all lowercase characters.
     * - A: Include all uppercase characters.
     * - #: Include 0 through 9
     * - !: Include a variety of symbols.
     *
     * e.g
     * let foo = random_string(5, 'aA')
     * console.log(foo); // e.g. BafzP
     *
     * let foo = random_string(6, 'a')
     * console.log(foo); // e.g. akenbz
     */
    const random_string = (length, chars) => {
        let mask = '';
        if (chars.indexOf('a') > -1)
            mask += 'abcdefghijklmnopqrstuvwxyz';
        if (chars.indexOf('A') > -1)
            mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (chars.indexOf('#') > -1)
            mask += '0123456789';
        if (chars.indexOf('!') > -1)
            mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
        let result = '';
        for (let i = length; i > 0; --i)
            result += mask[Math.floor(Math.random() * mask.length)];
        return result;
    };
    exports.random_string = random_string;
});
define("Environment", ["require", "exports", "Helpers"], function (require, exports, Helpers_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const EnvKeys = {
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
    };
    /**
     * Says whether something is a valid postman env key.
     * @param {string} key The key to check.
     * @returns {boolean}
     */
    const _is_env_key = (key) => key in EnvKeys.keys();
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
    const _is_required_key = (key) => RequiredEnvKeys.includes(key);
    /**
     * A list of env keys reserved for internal use.
     */
    const RestrictedEnvKeys = [
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
    const _is_restricted_key = (key) => RestrictedEnvKeys.includes(key);
    /**
     * A list of env keys that *may* be passed when creating a new environment, but are not
     * required.
     */
    const OptionalEnvKeys = []
        // Add all env keys.
        .concat(EnvKeys.keys())
        // Remove required env keys
        .filter((key) => !RequiredEnvKeys.includes(key))
        // Remove restricted env keys
        .filter((key) => !RestrictedEnvKeys.includes(key));
    /**
     * Says whether something is an optional env key.
     * Optional keys are part of
     *
     * @param {string} key The key to check.
     * @returns {boolean}
     */
    const _is_optional_key = (key) => OptionalEnvKeys.includes(key);
    /**
     * Because the environment at runtime cannot be type-checked via typescript,
     * we need to have a runtime method for this particular assertion.  The type
     * going in and going out are both PostmanEnv, but this is a runtime check, so the
     * compiler can't know in advance.
     *
     * @param arg An object that may or may not conform to the
     *   PostmanEnv interface.
     */
    function _assert_postman_env_arg(arg) {
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
    class Environment {
        constructor(pm) {
            this.pm = pm;
            // Starts dirty until setEnv() is called.
            this.dirty = true;
            this.validate();
        }
        /**
         * A dirty environment is not fully in sync with the postman environment.
         * @returns
         */
        isDirty() {
            return this.dirty;
        }
        /**
         * Clears values of any environment keys that aren't env keys.
         *
         * Requires the environment be non-dirty to start.
         */
        clear() {
            let env = this.pm.environment.toObject();
            if (this.isDirty()) {
                throw new Error("Error: clear() called, but the Environment is not in sync with Postman.");
            }
            this.dirty = true;
            Object.keys(env)
                .filter(key => typeof key === 'string')
                .filter((key) => !_is_env_key(key))
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
        setEnv(desired_env) {
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
            let final_env = Object.assign({}, default_env, desired_env, {
                "state": {},
                "version": "v2.0.0",
                "utils": {}
            });
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
        assert(varname) {
            const fail_msg = 'The environment variable ' +
                varname +
                ' should exist, but does not.  It may have been cleared by a prior operation, or not yet set with  the appropriate LIST or POST call.';
            try {
                this.pm.expect(this.pm.environment.has(varname)).to.be.true;
            }
            catch (e) {
                this.pm.expect(fail_msg).to.be.empty;
            }
        }
        /**
         * Fetches the value of a variable in the environment.
         *
         * @param {string} varname the name of the variable to fetch.
         * @returns {any} returns the value, or undefined if not set.
         */
        get(varname) {
            let value = this.pm.environment.get(varname);
            return (0, Helpers_1.is_empty)(value) ? undefined : value;
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
        getObject(varname) {
            let value = this.get(varname);
            if (value === undefined) {
                return value;
            }
            let type = (typeof value);
            if (type !== 'string') {
                throw new Error(`Expected a string (serialized object) for variable ${varname}, but got ${type}`);
            }
            let result = JSON.parse(value);
            if (typeof result !== 'object') {
                throw new Error(`Could not decode ${varname}, into an object.`);
            }
            return result;
        }
        /**
         * Function for helping to display the current environment.
         * Filters out unimiportant elements from the environment, and sorts the keys.
         *
         * @throws {Error} if called before postman/Environment sync.
         */
        filter() {
            if (this.isDirty()) {
                throw new Error("Error: get() called, but the Environment is not in sync with Postman.");
            }
            const display_environment = {};
            const state = {};
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
        keys() {
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
        set(varname, value) {
            if ((0, Helpers_1.is_empty)(value)) {
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
        setObject(varname, o) {
            if (typeof o !== 'object') {
                throw new Error(`Value passed for set_object is not an object.`);
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
        unset(varname) {
            this.pm.environment.toObject().keys()
                .filter((key) => (varname === key))
                .map((key) => this.pm.environment.unset(key));
            return this;
        }
        /**
         * Asserts the stored Postman environment contains all expected keys.
         *
         * Sets the environment to 'dirty = false` as a result.
         *
         * @returns {this}
         */
        validate() {
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
    exports.default = Environment;
});
define("Response", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * For ensuring we are dealing with a valid JSON response.
     * (valid, e.g. can be parsed, acual response content).
     */
    class Response {
        /**
         * constructor()
         *
         * @param {string} response_text The full text of the fetch JSON response content.
         *
         * @throws {Error} If the response is not parseable JSON.
         */
        constructor(response_text) {
            this.raw = response_text;
            const result = JSON.parse(response_text);
            this.object = result;
        }
        /**
         * Returns the raw JSON that was used to make the response object.
         */
        getResponseRaw() {
            return this.raw;
        }
        /**
         * Returns the object constructed from the response JSON.
         *
         * @returns {JSONObject}
         */
        getResponseObject() {
            return this.object;
        }
        /**
         * Gets a variable value using the value extracted from a key in the
         * response.
         *
         * If the key is not present, triggers an error.
         *
         * Example: on the path POST /images/profile_image Calling
         * get_var_from_response('@id') will fetch the value of the `@id` key at the
         * root level of the JSON response.   You can drill down using lodash dot
         * syntax, which this uses under the hood.
         *
         * @param string response_key The key to search for
         * @return mixed The value at that key.  The value MUST be present.  Will
         *               trigger an error if not.
         */
        getFromResponse(keypath) {
            if (typeof keypath !== 'string' || keypath === '') {
                throw new Error("Key passed to getVar() was empty or not a string!");
            }
            let value = this.getResponseObject();
            let parts = keypath.split('.');
            let tmppath = []; // tracks the path as we descend for debugging.
            do {
                let part = parts.shift();
                if (typeof part !== 'string') {
                    throw new Error("Unexpected value in keypath in getVar()");
                }
                tmppath.push(part);
                if (typeof value[part] === 'undefined') {
                    let failure_path = tmppath.join('.');
                    throw new Error(`The response key ${keypath} was not found in the response (failed at ${failure_path})`);
                }
                value = value[part];
            } while (parts.length > 0);
            return value;
        }
        /**
         * Returns whether this is a list response.  A list response
         * for our purposes contains 0 or more items in a 'hydra:member'
         * key at the top level of the response.
         */
        isListResponse() {
            return (typeof this.getResponseObject()['hydra:member'] !== 'undefined')
                && (Array.isArray(this.getResponseObject()['hydra:member']));
        }
        /**
         * Returns an array of all objects in the normalized response.  For item
         * requests, this just wraps the response in an array (unless the response
         * IS an array, an edge case not addressed here because it's not believed
         * necessary).
         */
        getObjects() {
            let objects = null;
            if (this.isListResponse()) {
                objects = objects['hydra:member'];
            }
            else {
                if (!Array.isArray(objects)) {
                    objects = [objects];
                }
            }
            return objects;
        }
    }
    exports.default = Response;
});
define("Token", ["require", "exports", "Response"], function (require, exports, Response_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Response_1 = __importDefault(Response_1);
    /**
     * Stores a representation of a JWT token object.
     */
    class Token {
        constructor(response_text) {
            this.response = new Response_1.default(response_text);
        }
        /**
         * Returns the parsed JSON token data.  This decodes the token into
         * the constituent data it contains.
         */
        getDecodedToken() {
            let base64Url = this.getToken().split('.')[1];
            if (!base64Url) {
                throw new Error("Could not extract the Base 64 url out of the token");
            }
            let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            let jsonPayload = decodeURIComponent(atob(base64)
                .split('')
                .map(function (c) {
                return ('%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2));
            })
                .join(''));
            return JSON.parse(jsonPayload);
        }
        /**
         * Returns the raw token data, suitable for using in a bearer auth header.
         */
        getToken() {
            let response_object = this.response.getResponseObject();
            if (typeof response_object.token !== 'string') {
                throw new Error('Could not retrieve token!');
            }
            return response_object.token;
        }
        /**
         * Returns the raw refresh token data, suitable for using in a bearer auth header.
         */
        getRefreshToken() {
            let response_object = this.response.getResponseObject();
            if (typeof response_object.refresh_token !== 'string') {
                throw new Error('Could not retrieve refresh token!');
            }
            return response_object.refresh_token;
        }
    }
    exports.default = Token;
});
define("User", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Stores a representation of a logged-in user.
     * This tracks the possible properties in a Hebbia token.
     */
    class User {
        constructor(token) {
            let decoded_token = token.getDecodedToken();
            // Ensure expected values for convenience functions.
            if (typeof decoded_token.email !== 'string') {
                throw new Error(`Error: The encoded JWT token value did not contain a user email key: ${token.getToken()}`);
            }
            this.token = token;
        }
        getEmail() {
            return this.token.getDecodedToken().email;
        }
        getToken() {
            return this.token;
        }
    }
});
define("Utils", ["require", "exports", "Environment", "Token", "BufferedLog", "Helpers", "Response"], function (require, exports, Environment_1, Token_1, BufferedLog_1, Helpers_2, Response_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Environment_1 = __importDefault(Environment_1);
    Token_1 = __importDefault(Token_1);
    Response_2 = __importDefault(Response_2);
    class Utils {
        constructor(pm, initial_environment) {
            /**
             * Helper to simplify logging calls for this class.
             *
             * @param {string} msg The message to log.
             * @returns {void}
             */
            this.log = (...msgs) => this.logBuffer.log(msgs);
            this.pm = pm;
            this.env = new Environment_1.default(pm);
            this.logBuffer = new BufferedLog_1.BufferedLog();
        }
        /**
        * Stores the data passed in the token about the currently authenticated user.
        * @returns {object}
        *   Returns the utils object for chaining.
        */
        add_token_data() {
            let token = new Token_1.default(this.pm.response.text());
            this.log("Token data:", token.getDecodedToken());
            this.env.set('tokens.current', token.getToken());
            this.env.set('refresh_tokens.current', token.getRefreshToken());
            let email = token.getDecodedToken().email;
            this.env.set('tokens.' + email, token.getToken());
            this.env.set('refresh_tokens.' + email, token.getRefreshToken());
            // Assign all token data to Postman variables.
            let decoded_token = token.getDecodedToken();
            Object.keys(decoded_token).map(index => {
                let value = decoded_token[index];
                if (Array.isArray(value)) {
                    value.map((iri, i) => {
                        if (!iri) {
                            throw "No IRI available, cannot get ID.";
                        }
                        let id = (0, Helpers_2.iri_to_id)(iri);
                        this.env.set(email + '.' + index + '.' + i, id);
                        this.env.set('current_user.' + index + '.' + i, id);
                    });
                }
                else if (typeof value === 'string') {
                    let id = (0, Helpers_2.iri_to_id)(value);
                    this.env.set('current_user.' + index, id);
                }
                else {
                    this.env.set('current_user.' + index, value);
                }
            });
            this.log("Token data added.  Environment: ", this.env.filter());
            return this;
        }
        /**
        * Clears a single named endpoint variable.
        *
        * Example: Passing the variable '1' with a call to
        * /users would look for the variable 'users.1'.
        *
        * @returns {object}
        *   Returns the utils object for chaining.
        */
        clear_endpoint_var(varname) {
            this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201, 204]);
            const endpoint = this.pm.request.url.path[0];
            // Clear all prior variables of this type
            const keys_removed = [];
            this.env.keys()
                .map(arrItem => arrItem.startsWith(endpoint)
                && arrItem.endsWith('.' + varname)
                && this.env.unset(arrItem));
            return this;
        }
        /**
         * Clears all environment variables for the current endpoint.
         *
         * Example: A call to /users would look for the variable
         * 'users.*'.
         *
         * @returns {object}
         *   Returns the utils object for chaining.
         */
        clear_endpoint_vars() {
            if (this.pm.response !== undefined) {
                this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201, 204]);
            }
            const endpoint = this.pm.request.url.path[0];
            // Clear all prior variables of this type
            this.env.keys()
                .map(arrItem => arrItem.startsWith(endpoint)
                && this.env.unset(arrItem));
        }
        /**
         * Allows use of a Postman faker variable in script.
         * @param {string} varname The faker variable name.  Can include or not the dollar sign.
         * @return {*} A faker value for that key
         * @see https://learning.postman.com/docs/writing-scripts/script-references/variables-list/
         */
        faker(varname) {
            const { Property } = require('postman-collection');
            // Make the $ be optional.
            varname = varname.replace(/\$/, '');
            return Property.replaceSubstitutions('{{$' + varname + '}}');
        }
        /**
         * Returns the response from the last request, wrapped in a utility class.
         * @returns Response
         */
        get_response() {
            return new Response_2.default(this.pm.response.text());
        }
        /**
         * Gets a variable value using the value extracted from a key in the response.
         *
         * If the key is not present, triggers an error.
         *
         * Example:
         * on the path POST /images/profile_image
         * Calling get_var_from_response('@id')
         * will fetch the value of the `@id` key at the
         * root level of the JSON response.   You can drill down using
         * lodash dot syntax, which this uses under the hood.
         *
         * @param string response_key The key to search for
         * @return mixed The value at that key.  The value MUST be present.  Will
         *               trigger an error if not.
         */
        get_var_from_response(response_key) {
            return this.get_response().getFromResponse(response_key);
        }
        /**
        * Perform actions and operations common to every request.
        *
        * @returns {object}
        *   Returns the utils object for chaining.
        */
        pre_request() {
            // Add the Postman export versio number, so the API can prompt for an upgrade.
            this.pm.request.headers.add({
                key: 'version',
                value: this.env.get('version')
            });
            return this;
        }
        /**
         * Retrieves a password stored in AWS.  Operates by using current user AWS credentials.
         */
        get_stored_password() {
            const sts_endpoint = 'https://sts.us-east-1.amazonaws.com';
            const aws_access_key_id = this.pm.environment.get('secret.aws_access_key_id');
        }
        /**
         * Adds pre-request behaviour for all requests.
         */
        pre_request_all() {
            const x_portal_neutral = JSON.stringify({
                "caller": "admin-client",
                "subdomain": "admin"
            });
            // if (!this.pm.request.headers.has("X-Portal")) {
            //     console.info('No X-portal header defined, using ' + x_portal_neutral);
            //     this.pm.request.headers.add({
            //         key: 'X-Portal',
            //         name: 'X-Portal',
            //         disabled: false,
            //         value: x_portal_neutral
            //     });
            // }
            // Add Accept to every request if the script does not supply its own, so that we always get JSON or JSONLD output.
            // simulating the the call came from the front-end client.
            if (!this.pm.request.headers.has("Accept")) {
                console.info('No Accept header defined, adding one to ensure JSON or JSONLD output.');
                this.pm.request.headers.add({
                    key: 'Accept',
                    name: 'Accept',
                    disabled: false,
                    value: 'application/ld+json, application/json'
                });
            }
            console.info("Headers sent in request", this.pm.request.headers.all());
        }
        /**
        * Sets a single named endpoint variable.
        *
        * Example: Passing the variable '1' with a call to
        * /users would set the variable 'users.1' to the
        * value found in the key '@id' of the result.
        *
        * @returns {object}
        *   Returns the utils object for chaining.
        */
        set_endpoint_var(varname) {
            let response = this.get_response();
            const iri = response.getFromResponse('@id'); // throws if not set.
            const id = (0, Helpers_2.iri_to_id)(iri);
            // Sets the 'last' variable for this entity type to the result of this
            // request for the owning entity.
            const endpoint = this.pm.request.url.path[0];
            this.env.set(endpoint + '.last', id);
            return this;
        }
        /**
         * Sets indexed environment variables for the endpoint.
         *
         * This should be invoked on a LIST request.  It takes
         * the results, and assigns them to environment
         * variables prefixed by the endpoint.  For example,
         * if called from the /users LIST endpoint, it would
         * set the variable 'users.1', 'users.2', etc.  It would
         * also set the '.last' namespaced variable, which will
         * be the last entry in the list.
         *
         * @returns {object}
         *   Returns the utils object for chaining.
         */
        set_endpoint_vars(key = null) {
            this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201]);
            let response = this.get_response();
            let items = response.getObjects();
            if (items.length === 0) {
                this.log("No results returned, not setting any endpoint vars");
                return this;
            }
            const endpoint = key ?? this.pm.request.url.path[0];
            const set_iri_and_id = (endpoint, target_id, object) => {
                this.pm.expect(endpoint).to.be.a('string');
                this.pm.expect(target_id).to.not.be.undefined;
                this.pm.expect(object).to.be.an('object');
                this.pm.expect(object['@id']).to.be.a('string');
                let iri = object['@id'];
                if (typeof iri !== 'string') {
                    throw new Error("IRI could not be found for item in list.");
                }
                let id = (0, Helpers_2.iri_to_id)(iri);
                this.env.set(endpoint + '.' + target_id, id);
                this.env.set(endpoint + '.iri.' + target_id, iri);
                this.env.set(endpoint + '.objects.' + target_id, object);
            };
            items.map((element, index) => {
                set_iri_and_id(endpoint, (index + 1).toString(), element);
                if (index === 0) {
                    set_iri_and_id(endpoint, 'first', element);
                }
                else if (index === items.length - 1) {
                    set_iri_and_id(endpoint, 'last', element);
                }
            });
            return this;
        }
        /**
         * Sets a variable name using the value extracted from a key in the response.
         *
         * If the key is not present, triggers an error.
         *
         * Example:
         * on the path POST /images/profile_image
         * Calling set_var_from_value('profile_images.last','id')
         * as one of the Tests to run post-execution will set
         * the variable 'profile_images.last' to the id of the newly
         * created entity.
         *
         * @returns {this}
         *   Returns the utils object for chaining.
         */
        set_var_from_key(full_varname, response_key) {
            this.env.set(full_varname, this.get_response().getFromResponse(response_key));
            return this;
        }
        /**
        * Sets a variable value using a callback.  That callback will
        * be passed the response from the request, and should return the
        * key it's interested in.  As variables must be scalar, the function
        * should return a scalar value.
        * Lodash is available for parsing the response.
        *
        * @param {string} full_varname
        *   The variable name to set.
        * @param {callable} fn
        *   The function to invoke with the response.  It will be
        *   passed the response body, and typically should return a scalar.
        *
        * @returns {this}
        *   Returns the utils object for chaining.
        *
        * @throws Error
        *   If the function does not return a non-empty, scalar value.
        */
        set_var_from_callback(full_varname, fn) {
            let value = fn(this.get_response().getResponseObject());
            if ((0, Helpers_2.is_empty)(value)) {
                throw new Error(`set_var_from_callback: The supplied callback {fn} did not return a value.`);
            }
            this.env.set(full_varname, value);
            return this;
        }
        /**
         * Sets a random string value to the variable 'random_string'.
         *
         * Useful for operations where you need to determine a distinction
         * between one write operation and the next.
         *
         * @returns {object}
         *   Returns the utils object for chaining.
         */
        set_random_string() {
            this.env.set('random_string', (0, Helpers_2.random_string)(15, 'aA'));
            return this;
        }
    }
    exports.default = Utils;
});
define("hebbia_utils", ["require", "exports", "Utils"], function (require, exports, Utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Utils_1 = __importDefault(Utils_1);
    /**
     * Hebbia Postman Utils
     * This script is fetched whenever a Set Environment path is executed in Hebbia Postman.
     * It provides utility methods for pre and post request evaluation and state retention,
     * and sets certain defaults.  See individual methods for details.
     * Functions that start with underscores should not be exposed in the Utils object.
     **/
    /**
     * Main
     */
    const main = (pm, env) => {
        return new Utils_1.default(pm, env);
    };
});
