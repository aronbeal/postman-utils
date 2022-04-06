import Utils from "./Utils";
import { PostmanEnvArg } from "./Environment";

/**
 * Hebbia Postman Utils
 * This script is fetched whenever a Set Environment path is executed in Hebbia Postman.
 * It provides utility methods for pre and post request evaluation and state retention, 
 * and sets certain defaults.  See individual methods for details.
 * Functions that start with underscores should not be exposed in the Utils object.
 **/

/**
 * Main
 */
 const main = (pm: Postman, env: PostmanEnvArg) => {
     return new Utils(pm, env);
 };
