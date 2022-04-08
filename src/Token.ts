import Response from './Response';

/**
 * Stores a representation of a JWT token object.
 */
class Token {
    response: Response;
    constructor(response_text: string) {
        this.response = new Response(response_text);
    }

    /**
     * Returns the parsed JSON token data.  This decodes the token into
     * the constituent data it contains.
     */
    getDecodedToken(): { [key: string]: any } {
        let base64Url = this.getToken().split('.')[1];
        if (!base64Url) {
            throw new Error("Could not extract the Base 64 url out of the token");
        }
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        let jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(function (c) {
                    return (
                        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                    );
                })
                .join('')
        );
        let result = JSON.parse(jsonPayload);
        if (typeof result !== 'object') {
            throw new Error("Error: Could not construct a decoded token out of the token value " + this.getToken());
        }
        return result;
    }
    /**
     * Returns the raw token data, suitable for using in a bearer auth header.
     */
    getToken(): string {
        let response_object: JSONObject = this.response.getResponseObject();
        if (typeof response_object.token !== 'string') {
            throw new Error('Could not retrieve token!');
        }
        return response_object.token;
    }
    /**
     * Returns the raw refresh token data, suitable for using in a bearer auth header.
     */
    getRefreshToken(): string {
        let response_object = this.response.getResponseObject();
        if (typeof response_object.refresh_token !== 'string') {
            throw new Error('Could not retrieve refresh token!');
        }
        return response_object.refresh_token;
    }
}

export default Token;
