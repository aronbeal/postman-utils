/**
 * Some generic types for working with JSON response objects.
 */
type JSONValue =
    | string
    | number
    | boolean
    | JSONObject
    | JSONArray;

interface JSONObject {
    [x: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> { }

/**
 * (partially) defines the shape of the pm.environment object in Postman.
 * This includes our pre-defined keys
 */
interface PostmanEnvironment {
    get: (string) => any;
    set: (string, any) => any;
    unset: (string) => any;
    toObject(): PostmanEnv;
    has: (string) => boolean;
    clear: () => any;
}

/**
 * (partially) defines the shape of the pm.request object in Postman.
 */
interface PostmanRequest {
    url: {
        path: Array<string>
    }
    headers: {
        add: (Object) => any;
        has: (string) => boolean;
        all: () => any;
    }
}

/**
 * (partially) defines the shape of the pm.response object in Postman.
 */
interface PostmanResponse {
    text: () => string
    code: number
}

/**
 * (partially) defines the shape of the pm object in Postman.
 */
interface Postman {
    environment: PostmanEnvironment;
    collectionVariables: PostmanEnvironment;
    expect: (any) => any;
    globals: PostmanEnvironment;
    request: PostmanRequest;
    response: PostmanResponse;
    variables: PostmanEnvironment;
};
