import Environment from "./Environment";
import Token from "./Token";
import { Logger, LogLevel, LogVerbosity } from "./Logger";
import { iri_to_id, is_empty, random_string } from "./Helpers";
import Response from "./Response";

class Utils {
    env: Environment;
    pm: Postman;
    logger: Logger;
    constructor(pm: Postman) {
        this.pm = pm;
        this.logger = new Logger();
        this.env = new Environment(pm, this.logger);
    }

    /**
     * For some reason, the internally stored copy of pm doesn't reflect changes
     * in the "Tests" section.  When called with pretests(), updates the object
     * so it will work properly.
     */
    setPm(pm: Postman) {
        this.pm = pm;
        this.env.setPm(pm);
    }

    /**
     * This is the meat of the utils script.  It takes all variables set
     * in State and CollectionState, and populates them to local variables.
     * That makes them accessible (without prefix) for the duration of the
     * request.  It must be called prior to every request in the collection
     * that relies on utils or on utils-stored variables.
     */
    prerequest(pm: Postman) {
        this.logger.log("Running universal pre-request", LogLevel.info, LogVerbosity.verbose);
        this.setPm(pm);
        // Confirm valid environment.
        this.env.validate();
        const vars: { [k: string]: any } = {};
        const state_values = this.getEnv().getState().getAll();
        Object.keys(state_values)
            .map((k: string) => vars[k] = state_values[k]);
        Object.keys(state_values)
            .map((k: string) => this.pm.variables.set(k, state_values[k]));
        const collection_state_values = this.getEnv().getCollectionState().getAll();

        Object.keys(collection_state_values)
            .map((k: string) => vars[k] = collection_state_values[k]);
        Object.keys(collection_state_values)
            .map((k: string) => this.pm.variables.set(k, collection_state_values[k]));
        this.logger.log(['Available variables: ', vars], LogLevel.info, LogVerbosity.verbose);
    }
    /**
     * Run before all tests in the "Tests" tab for Postman.
     */
    pretests(pm: Postman) {
        this.setPm(pm);
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
    assert(varname: string): Utils {
        if (!this.pm.variables.has(varname)) {
            throw new Error(`The environment variable ${varname} should exist as a local variable, but does not.  It may have been cleared by a prior operation, or not yet set with the appropriate LIST or POST call.`);
        }

        return this;
    }

    /**
     * Returns the environment object this utils uses.
     */
    getEnv(): Environment {
        return this.env;
    }

    /**
     * Returns the global utils logger object.
     */
    getLogger(): Logger {
        return this.logger;
    }

    /**
    * Stores the data passed in the token about the currently authenticated user.
    * @returns {object}
    *   Returns the utils object for chaining.
    */
    addTokenData(): Utils {
        let token = new Token(this.pm.response.text());
        this.logger.log(["Adding token data:", token.getDecodedToken()], LogLevel.info, LogVerbosity.minimal);
        const state = this.env.getState();
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
        this.logger.log(["Token data added.  Environment: ", this.env.filter()], LogLevel.default, LogVerbosity.minimal);

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
    clearEndpointVar(varname: string): Utils {
        this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201, 204]);
        const endpoint = this.pm.request.url.path[0];
        // Clear all prior variables of this type
        const state = this.env.getState();
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
    clearEndpointVars(): Utils {
        if (this.pm.response !== undefined) {
            this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201, 204]);
        }
        const endpoint = this.pm.request.url.path[0];
        // Clear all prior variables of this type
        const state = this.env.getState();
        state.getAll()
            .filter((item: string) => item.startsWith(endpoint))
            .map((item: string) => state.delete(item));

        return this;
    }

    /**
     * Returns the response from the last request, wrapped in a utility class.
     * @returns Response
     */
    getResponse(): Response {
        return new Response(this.pm.response.text());
    }

    /**
     * Retrieves a password stored in AWS.  Operates by using current user AWS credentials.
     */
    getStoredPassword() {
        throw new Error("Not yet implemented");
        const sts_endpoint = 'https://sts.us-east-1.amazonaws.com';
        const aws_access_key_id = this.pm.environment.get('secret.aws_access_key_id')

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
    setEndpointVar(varname: string): Utils {
        let response = this.getResponse();
        const iri: string = response.getFromResponse('@id'); // throws if not set.
        const id: string = iri_to_id(iri);
        // Sets the 'last' variable for this entity type to the result of this
        // request for the owning entity.
        const endpoint = this.pm.request.url.path[0];
        this.env.getState().set(endpoint + '.last', id);

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
    setEndpointVars(key: string | null = null): Utils {
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
            let iri: JSONValue = object['@id'];
            if (typeof iri !== 'string') {
                throw new Error("IRI could not be found for item in list.");
            }
            const state = this.env.getState();
            let id = iri_to_id(iri);
            state.set(endpoint + '.' + target_id, id);
            state.set(endpoint + '.iri.' + target_id, iri);
            state.set(endpoint + '.objects.' + target_id, object);
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
     * Shortcut to call setVar on state object, which stores transitory
     * data.  Returns utils. 
     */
    setVar(key: string, value: any): this {
        this.getEnv().getState().set(key, value);

        return this;
    }

    /**
     * Sets a variable name using the value extracted from a key in the response.
     *
     * If the key is not present, triggers an error.
     *
     * Example:
     * on the path POST /images/profile_image
     * Calling setVarFromValue('profile_images.last','id')
     * as one of the Tests to run post-execution will set
     * the variable 'profile_images.last' to the id of the newly
     * created entity.
     *
     * @returns {this}
     *   Returns the utils object for chaining.
     */
    setVarFromKey(full_varname: string, response_key: string): Utils {
        this.env.getState().set(full_varname, this.getResponse().getFromResponse(response_key));

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
    setVarFromCallback(full_varname: string, fn: CallableFunction): Utils {
        let value = fn(this.getResponse().getResponseObject());
        if (is_empty(value)) {
            throw new Error(
                `setVarFromCallback: The supplied callback {fn} did not return a value.`
            );
        }
        this.env.getState().set(full_varname, value);

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
    setRandomString(): Utils {
        this.env.getState().set('random_string', random_string(15, 'aA'));

        return this;
    }
}

export default Utils;
