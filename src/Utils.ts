import Environment from "./Environment";
import Token from "./Token";
import { BufferedLog } from "./BufferedLog";
import { iri_to_id, is_empty, random_string } from "./Helpers";
import Response from "./Response";
import {PostmanEnvArg} from "./Environment";

class Utils {
    env: Environment;
    pm: Postman;
    logger: BufferedLog;
    constructor(pm: Postman, initial_environment: PostmanEnvArg|undefined) {       
        this.pm = pm;
        this.logger = new BufferedLog();
        this.env = new Environment(pm, this.logger);
        if (initial_environment !== undefined) {
            this.env.apply(initial_environment);
        }
        this.env.validate();
        
    }
    /**
     * Returns the environment object this utils uses.
     */
    get_env(): Environment {
        return this.env;
    }

    /**
    * Stores the data passed in the token about the currently authenticated user.
    * @returns {object}
    *   Returns the utils object for chaining.
    */
    add_token_data(): Utils {
        let token = new Token(this.pm.response.text());
        this.logger.log("Token data:", token.getDecodedToken());
        this.env.set('tokens.current', token.getToken());
        this.env.set('refresh_tokens.current', token.getRefreshToken());

        const email = token.getDecodedToken().email;
        this.env.set('tokens.' + email, token.getToken());
        this.env.set('refresh_tokens.' + email, token.getRefreshToken());
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
                    this.env.set(email + '.' + index + '.' + i, id);
                    this.env.set('current_user.' + index + '.' + i, id)
                });
            } else if (typeof value === 'string') {
                let id = iri_to_id(value);
                this.env.set('current_user.' + index, id);
            } else {
                this.env.set('current_user.' + index, value);
            }
        });
        this.logger.log("Token data added.  Environment: ", this.env.filter());

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
    clear_endpoint_var(varname: string): Utils {
        this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201, 204]);
        const endpoint = this.pm.request.url.path[0];
        // Clear all prior variables of this type
        const keys_removed = [];
        this.env.keys()
            .map(arrItem =>
                arrItem.startsWith(endpoint)
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
            .map(arrItem =>
                arrItem.startsWith(endpoint)
                && this.env.unset(arrItem));
    }

    /**
     * Returns the response from the last request, wrapped in a utility class.
     * @returns Response
     */
    get_response(): Response {
        return new Response(this.pm.response.text());
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
    get_var_from_response(response_key: string) {
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

        return this;
    }

    /**
     * Retrieves a password stored in AWS.  Operates by using current user AWS credentials.
     */
    get_stored_password() {
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
    set_endpoint_var(varname: string) {
        let response = this.get_response();
        const iri: string = response.getFromResponse('@id'); // throws if not set.
        const id: string = iri_to_id(iri);
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
    set_endpoint_vars(key: string | null = null): Utils {
        this.pm.expect(this.pm.response.code).to.be.oneOf([200, 201]);
        let response = this.get_response();
        let items = response.getObjects();
        if (items.length === 0) {
            this.logger.log("No results returned, not setting any endpoint vars");

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
            let id = iri_to_id(iri);
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
    set_var_from_key(full_varname: string, response_key: string): Utils {
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
    set_var_from_callback(full_varname: string, fn: CallableFunction): Utils {
        let value = fn(this.get_response().getResponseObject());
        if (is_empty(value)) {
            throw new Error(
                `set_var_from_callback: The supplied callback {fn} did not return a value.`
            );
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
    set_random_string(): Utils {
        this.env.set('random_string', random_string(15, 'aA'));

        return this;
    }
}

export default Utils;
