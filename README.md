# Postman utilities

Defines a set of utility scripts for working with Postman.  These scripts a written in Typescript, and designed to be compiled down to a single compressed file, which is then imported by postman during environment setup.

This project uses [pnpm](https://pnpm.io/installation), but any package manager will do.  You will need to modify the commands below, however.

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
  - `src/pm.d.ts`: Typescript definitions for Postmark app.  Only defined to the degree that this project needs them.  Should not be relied upon externally.
- `built`: Build output for js files after typescript compilation.  Should only be a single output file.
- `test`: Mocha unit tests.  Testing approach from [here](https://medium.com/swlh/how-to-setting-up-unit-tests-with-typescript-871c0f4f1609).
- `.mocharc.json`: For testing.
- `.nycrc.json`: For testing.
- `register.js`: for testing.
- `serve.js`: For serving built code locally, for testing changes.


## Development

Initial setup: `pnpm install`.
To build the output: `pnpm build`.
To test the output: `pnpm test`
To serve the built output locally at <http://localhost:9999>: `pnpm serve`.  This URL can be then use in a task such as **Environment: DEV** in the URL bar.  That setup endpoint will store the built script results locally for later reuse in the rest of the collection.  This approach is for when you 
need to make modifications to utils, not necessarily when the endpoints need modification.

TODO


## Deployment
TODO
