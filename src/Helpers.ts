/**
 * Conversion utilities used in multiple places.
 */
const iri_to_id = (iri: string): string => {
    if (typeof iri !== 'string') {
        throw new Error("Error: Non-string value passed to iri_to_id()");
    }
    return iri.replace(/.*\/([^\/]+)$/, '$1').toString();
};

/**
 * Internal function to test whether a value "empty", for
 * environmental purposes.
 * 
 * @param {string} value The value to test.pn
 * @returns {boolean} true if undefined, null, or empty string.
 */
const is_empty = (value: any) => value === undefined || value === null || value === '';


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
const random_string = (length: number, chars: string): string => {
    let mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1)
        mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    let result = '';
    for (let i = length; i > 0; --i)
        result += mask[Math.floor(Math.random() * mask.length)];
    return result;
};

export {
    iri_to_id,
    is_empty,
    random_string
};
