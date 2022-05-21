# Postman utilities

Defines a set of utility scripts for working with Postman.  These scripts a written in Typescript, and designed to be compiled down to a single compressed file, which is then imported by postman during environment setup.

- [Overview](#overview)
  - [Requirements](#requirements)
- [Development](#development)
- [Deployment](#deployment)
  
## Overview

### Requirements
- Host machine with Visual studio code on it.
- node >= 16
- npm or pnpm or yarn

Contained in this repo:
- `src`: Typescript source files for the project.
  - `src/pm.d.ts`: Typescript definitions for Postman app.  Only defined to the degree that this project needs them.  Should not be relied upon externally.
- `built`: Build output for js files after typescript compilation.  Should only be a single output file.
- `test`: Mocha unit tests.  Testing approach from [here](https://medium.com/swlh/how-to-setting-up-unit-tests-with-typescript-871c0f4f1609).
- `.mocharc.json`: For testing.
- `.nycrc.json`: For testing.
- `register.js`: for testing.
- `serve.js`: For serving built code locally, for testing changes.


## Development

Initial setup: `yarn install`.
To build the output: `yarn build`.
To test the output: `yarn test`
To serve the built output locally at <http://localhost:9999>: `yarn serve`.  This URL can be then use in a task such as **Environment: DEV** in the URL bar.  That setup endpoint will store the built script results locally for later reuse in the rest of the collection.  This approach is for when you 
need to make modifications to utils, not necessarily when the endpoints need modification.  The output will be available at <http://localhost:9999/postman-utils.latest.js>

Currently, to import this script into Postman, you'll set up the following as a pre-request:
```js
// MAIN
set_global_utils = (pm) => {
    pm.globals.unset('app.utils_script_text');
    const r = pm.response;
    if (r.code !== 200) {
        throw new Error("Could not fetch app utils from postman-utils repo: " + r.code);
    }
    const script_text = r.text();

    eval(script_text);
    const utils = this.PostmanUtilsFactory.default(pm);
    if (typeof utils !== 'object') {
        throw new Error("Utils object not found as expected");
    }
    // Script text is valid, store it.
    pm.globals.set('app.utils_script_text', script_text);
    app.getUtils = () => utils;
    app.hasUtils = () => true;
};

// Default accessor values.
// Mostly just a means of easily determining if utils are available.  The methods
// shown will be overridden by evaluated script.
// do NOT use 'var', 'const', or anything else here.  It messes up the scope, and
// will result in 'app' being undefined for other callers.
app = {
    hasUtils: () => false,
    getUtils: () => {
        throw new Error("Attempted to retrieve utils without calling Environment: endpoint first.  More info: https://github.com/abeal-hottomali/postman-utils");
    }
}

// Populate utils scripts if set.
// Default version will just throw errors.  eval() command will replace this.
let script_text = pm.globals.get('app.utils_script_text');
if (typeof script_text === 'string') {
    // Replaces global utils object.
    eval(script_text);
    utils_factory = this.PostmanUtilsFactory.default;
    delete this.PostmanUtilsFactory.default;
    utils = utils_factory(pm);
    if (typeof utils !== 'object') {
        pm.globals.unset('app.utils_script_text')
        throw new Error("Utils object could not be constructed.  Clearing utils script text.");
    }
    // Script evaluated ok. Replace methods on global object with versions that 
    // return utils.
    app.getUtils = () => utils;
    app.hasUtils = () => true;
}


/**
 * Prerequest: Called before every request in this collection.  Modify as needed.
 */
if (app.hasUtils()) {
    const env = app.getUtils().getEnv();
    app.getUtils().prerequest(pm);
    // Add the Postman export version number, so the API can prompt for an upgrade.
    pm.request.headers.add({
        key: 'version',
        value: env.get('version')
    });
}
```
Use this in your Environment setup script:
```js
set_global_utils(pm);
const env = app.getUtils().getEnv();
env.reset({
    'baseUrl': 'https://localhost:8443',
    'environment': 'development',
    'verbosity': 1,
    'enableBlackfire': false
});
```

## Deployment

Built versions of the code are now committed to repo.  You can access them directly from github via the url <https://raw.githubusercontent.com/abeal-hottomali/postman-utils/main/built/postman-utils.latest.js>.  Just point your Postman request (`GET`) at that url, and use the "environment setup script" above to set variables for your environment.
