
/**
 * For ensuring we are dealing with a valid JSON response.
 * (valid, e.g. can be parsed, acual response content).
 */
class Response {
    raw: string;
    object: JSONObject;

    /**
     * constructor()
     * 
     * @param {string} response_text The full text of the fetch JSON response content.
     * 
     * @throws {Error} If the response is not parseable JSON.
     */
    constructor(response_text: string) {
        this.raw = response_text
        const result: JSONObject = JSON.parse(response_text);
        this.object = result;
    }

    /**
     * Returns the raw JSON that was used to make the response object.
     */
    getResponseRaw(): string {
        return this.raw;
    }

    /**
     * Returns the object constructed from the response JSON.
     * 
     * @returns {JSONObject}
     */
    getResponseObject(): JSONObject {
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
    getFromResponse(keypath: string): any {
        if (typeof keypath !== 'string' || keypath === '') {
            throw new Error("Key passed to getVar() was empty or not a string!");
        }
        let value: any = this.getResponseObject();
        let parts: string[] = keypath.split('.');
        let tmppath = []; // tracks the path as we descend for debugging.
        do  {
            let part: string|undefined = parts.shift();
            if (typeof part !== 'string') {
                throw new Error ("Unexpected value in keypath in getVar()");
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
    isListResponse(): boolean {
        return (typeof this.getResponseObject()['hydra:member'] !== 'undefined')
            && (Array.isArray(this.getResponseObject()['hydra:member']));
    }

    /**
     * Returns an array of all objects in the normalized response.  For item
     * requests, this just wraps the response in an array (unless the response
     * IS an array, an edge case not addressed here because it's not believed
     * necessary).
     */
    getObjects(): Array<JSONObject> {
        let objects: any = null;
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

export default Response;
