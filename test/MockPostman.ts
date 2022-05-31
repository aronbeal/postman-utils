const sdk = require('postman-collection/lib/index.js'),
    Url = sdk.Url,
    Collection = sdk.Collection,
    Request = sdk.Request,
    Response = sdk.Response;

class MockPostmanEnvironment implements PostmanEnvironment {
    private data: Record<string, any>;
    constructor() {
        this.data = {};
    }
    public get(k: string) {
        return this.data[k]
    };
    public set(k: string, v: any) {
        this.data[k] = v;
    };
    public unset(k: string) {
        delete this.data[k];
    };
    public toObject(): JSONObject {
        return this.data;
    };
    public has(k: string) {
        return this.data[k] !== undefined;
    };
    public clear() {
        this.data = {};
    }
}
export default class MockPostman implements Postman {
    public environment: PostmanEnvironment;
    public collectionVariables: PostmanEnvironment;
    public globals: PostmanEnvironment;
    public request;
    public response;
    public variables;
    private collection = new Collection();
    constructor() {
        this.environment = new MockPostmanEnvironment();
        this.collectionVariables = new MockPostmanEnvironment();
        this.globals = new MockPostmanEnvironment();
        this.variables = new MockPostmanEnvironment();
        this.request = new Request();
        this.response = new Response();
    }
    public expect(o: any) { throw new Error("not implemented")};
}
