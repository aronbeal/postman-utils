import Environment from "./Environment";
import Token from "./Token";
import Logger, { LogLevel, LogVerbosity } from "./Logger";
import { iri_to_id, is_empty, random_string } from "./Helpers";
import Response from "./Response";
import State from "./State";
// TODO: figure out how to extract this from package.json instead.
const UTILS_VERSION = 'v2.0.0';
/**
* The different 'state' buckets used by Utils.
*/
export const NamedStates = {
    /**
     * Contains a predefined set of variables.  Will be reset to this when reset is called.
     */
    DEFAULT_STATE: 'default-state',
    /**
    * Operational state lives in a separate section in collection variables.
    * It can be mutated by any individual request. It has no predefined 
    * structure.
    */
    STATE: 'state',
};

class Utils {
    env: Environment;
    pm: Postman;
    logger: Logger;
    dynamic_state: State;
    default_state: State;
    constructor(pm: Postman) {
        this.pm = pm;
        this.logger = new Logger();
        this.env = new Environment(pm, this.logger);
        this.dynamic_state = new State(NamedStates.STATE, this.env, this.logger);
        this.default_state = new State(NamedStates.DEFAULT_STATE, this.env, this.logger);
    }

    /**
    * Stores the data passed in the token about the currently authenticated user.
    * @returns {object}
    *   Returns the utils object for chaining.
    */
    public addTokenData(): Utils {
        let token = new Token(this.pm.response.text());
        this.logger.log(["Adding token data:", token.getDecodedToken()], LogLevel.info, LogVerbosity.minimal);
        const state = this.getState();
        state.set('tokens.current', token.getToken());
        state.set('refresh_tokens.current', token.getRefreshToken());

        const email = token.getDecodedToken().email;
        state.set('tokens.' + email, token.getToken());
        state.set('refresh_tokens.' + email, token.getRefreshToken());
        // Assign all token data to Postman variables.
        const decoded_token = token.getDecodedToken();
        Object.keys(decoded_token).map(index => {
            let value = decoded_token[index];
            if (Array.isArray(value)) {
                value.map((iri, i) => {
                    if (!iri) {
                        throw "No IRI available, cannot get ID.";
                    }
                    let id = iri_to_id(iri);
                    state.set(email + '.' + index + '.' + i, id);
                    state.set('current_user.' + index + '.' + i, id)
                });
            } else if (typeof value === 'string') {
                let id = iri_to_id(value);
                state.set('current_user.' + index, id);
            } else {
                state.set('current_user.' + index, value);
            }
        });
        this.logger.log("Token data added. ", LogLevel.default, LogVerbosity.minimal);

        return this;
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
    public assert(varname: string): Utils {
        this.env.assertPostmanVariable(varname);

        return this;
    }


    /**
    * Clears a single named endpoint variable!
    *
    * Example: Passing the variable '1' with a call to
    * /users would look for the variable 'users.1'.
    *
    * @returns {object}
    *   Returns the utils object for chaining.
    */
    public clearEndpointVar(varname: string): Utils {
        this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201, 204]);
        const endpoint = this.pm.request.url.path[0];
        // Clear all prior variables of this type
        const state = this.getState();
        state.getAll()
            .filter((item: string) => item === `${endpoint}.${varname}`)
            .map((item: string) => state.delete(item));

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
    public clearEndpointVars(): Utils {
        if (this.pm.response !== undefined) {
            this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201, 204]);
        }
        const endpoint = this.pm.request.url.path[0];
        // Clear all prior variables of this type
        const state = this.getState();
        state.getAll()
            .filter((item: string) => item.startsWith(endpoint))
            .map((item: string) => state.delete(item));

        return this;
    }

    public get(varname: string): any {
        return this.getState().get(varname);
    }

    /**
     * Returns the default state, which is what utils will revert the stored environment
     * to when reset() is called.
     */
    public getDefaultState(): State {
        return this.default_state;
    }

    /**
     * Returns the named state, which can be reset by any request.
     */
    public getState(): State {
        return this.dynamic_state;
    }

    /**
     * Returns the global utils logger object.
     */
    public getLogger(): Logger {
        return this.logger;
    }

    /**
     * Returns the response from the last request, wrapped in a utility class.
     * @returns Response
     */
    public getResponse(): Response {
        return new Response(this.pm.response.text());
    }

    public isset(varname: string): boolean {
        return this.getState().isset(varname);
    }

    /**
     * This is the meat of the utils script.  It takes all variables set
     * in State and KnownState, and populates them to local variables.
     * That makes them accessible (without prefix) for the duration of the
     * request.  It must be called prior to every request in the collection
     * that relies on utils or on utils-stored variables.
     */
    public prerequest() {
        this.logger.log("Running universal pre-request", LogLevel.info, LogVerbosity.verbose);
        // Confirm valid environment.
    }

    /**
    * Returns the default state, which is what utils will revert the stored environment
    * to when reset() is called.
    */
    public setDefaultState(state: JSONObject): this {
        // always set version from package.json.  See webpack.config.js, DefinePlugin usage.
        state['version'] = UTILS_VERSION;
        this.env.clearCollectionVariables();
        this.getState().reset().setAll(state);
        if (state['verbosity'] !== undefined) {
            this.getLogger().setVerbosity(state['verbosity']);
        }

        return this;
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
    public setEndpointVar(varname: string): Utils {
        let response = this.getResponse();
        const iri: string = response.getFromResponse('@id'); // throws if not set.
        const id: string = iri_to_id(iri);
        // Sets the 'last' variable for this entity type to the result of this
        // request for the owning entity.
        const endpoint = this.pm.request.url.path[0];
        this.set(`${endpoint}.${varname}`, id);

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
    public setEndpointVars(key: string | null = null): Utils {
        this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201]);
        let response = this.getResponse();
        let items = response.getObjects();
        if (items.length === 0) {
            this.logger.log("No results returned, not setting any endpoint vars", LogLevel.default, LogVerbosity.very_verbose);

            return this;
        }
        const endpoint = key ?? this.pm.request.url.path[0];
        const set_iri_and_id = (endpoint: string, target_id: string, object: JSONObject) => {
            this.pm.expect(endpoint).to.be.a('string');
            this.pm.expect(target_id).to.not.be.undefined();
            this.pm.expect(object).to.be.an('object');
            this.pm.expect(object['@id']).to.be.a('string');
            let iri: JSONObject = object['@id'];
            if (typeof iri !== 'string') {
                throw new Error("IRI could not be found for item in list.");
            }
            let id = iri_to_id(iri);
            this.set(endpoint + '.' + target_id, id);
            this.set(endpoint + '.iri.' + target_id, iri);
            this.set(endpoint + '.objects.' + target_id, object);
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
     * Shortcut to call set on state object, which stores transitory
     * data.  Returns utils. 
     */
    public set(key: string, value: any): this {
        this.getState().set(key, value);

        return this;
    }

    /**
     * Sets a variable name using the value extracted from a key in the response.
     *
     * If the key is not present, triggers an error.
     *
     * Example:
     * on the path POST /images/profile_image
     * Calling setFromValue('profile_images.last','id')
     * as one of the Tests to run post-execution will set
     * the variable 'profile_images.last' to the id of the newly
     * created entity.
     *
     * @returns {this}
     *   Returns the utils object for chaining.
     */
    public setFromKey(full_varname: string, response_key: string): Utils {
        this.set(full_varname, this.getResponse().getFromResponse(response_key));

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
    public setFromCallback(full_varname: string, fn: CallableFunction): Utils {
        let value = fn(this.getResponse().getResponseObject());
        if (is_empty(value)) {
            throw new Error(
                `setVarFromCallback: The supplied callback {fn} did not return a value.`
            );
        }
        this.set(full_varname, value);

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
    public setRandomString(): Utils {
        this.set('random_string', random_string(15, 'aA'));

        return this;
    }
}

export default Utils;
