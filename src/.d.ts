type JSONObject = Record<string, any>;

/**
 * (partially) defines the shape of the pm.environment object in Postman.
 * This includes our pre-defined keys
 */
interface PostmanEnvironment {
    [index: string]: any;
    get: (k: string) => any;
    set: (k: string, v: any) => any;
    unset: (k: string) => any;
    toObject: () => JSONObject;
    has: (k: string) => boolean;
    clear: () => any;
}

/**
 * (partially) defines the shape of the pm.request object in Postman.
 */
interface PostmanRequest {
    [index: string]: any;
    url: {
        path: Array<string>
    }
    headers: {
        add: (v: Object) => any;
        has: (k: string) => boolean;
        all: () => any;
    }
}

/**
 * (partially) defines the shape of the pm.response object in Postman.
 */
interface PostmanResponse {
    [index: string]: any;
    text: () => string
    code: number
}

/**
 * (partially) defines the shape of the pm object in Postman.
 */
interface Postman {
    [index: string]: any;
    environment: PostmanEnvironment;
    collectionVariables: PostmanEnvironment;
    expect: (o: any) => any;
    globals: PostmanEnvironment;
    request: PostmanRequest;
    response: PostmanResponse;
    variables: PostmanEnvironment;
}

