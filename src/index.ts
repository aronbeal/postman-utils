import Utils from "./Utils";
import { PostmanEnvArg } from "./Environment";
/**
 * Hebbia Postman Utils This script is fetched whenever a Set Environment path
 * is executed in Hebbia Postman. It provides utility methods for pre and post
 * request evaluation and state retention, and sets certain defaults.  See
 * individual methods for details. Functions that start with underscores should
 * not be exposed in the Utils object.
 *
 * A note: Env is not available during initial construction, so we return a
 * factory function that accepts an env in order to actually  create utilities
 * (partially applied).  If reconstituting for initial requests, we won't have to
 * apply an initial environment, so the env arg is optional.
 * 
 * See "Set Environment" requests in Postman for where this script is invoked.
 */
export default function (pm: Postman) {
    return (env: PostmanEnvArg|undefined) => {
        return new Utils(pm, env);
    }
};
