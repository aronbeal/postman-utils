import Token from './Token';
/**
 * Stores a representation of a logged-in user.
 * This tracks the possible properties in a Hebbia token.
 */
 class User {
    token: Token;
    constructor(token: Token) {
        let decoded_token = token.getDecodedToken();
        // Ensure expected values for convenience functions.
        if (typeof decoded_token.email !== 'string') {
            throw new Error(`Error: The encoded JWT token value did not contain a user email key: ${token.getToken()}`)
        }
        this.token = token;
    }
    getEmail(): string {
        return this.token.getDecodedToken().email;
    }
    getToken(): Token {
        return this.token;
    }
}
