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
  - `src/pm.d.ts`: Typescript definitions for Postmark app.  Only defined to the degree that this project needs them.  Should not be relied upon externally.
- `built`: Build output for js files after typescript compilation.  Should only be a single output file.
- `test`: Mocha unit tests.  Testing approach from [here](https://medium.com/swlh/how-to-setting-up-unit-tests-with-typescript-871c0f4f1609).
- `.mocharc.json`: For testing.
- `.nycrc.json`: For testing.
- `register.js`: for testing.
- `serve.js`: For serving built code locally, for testing changes.


## Development

To build the output: `npm run build`.
To test the output: `npm run test`
To build the output interactively, watching for changes: `npm run watch build`
TODO


## Deployment
To build (from module root):
- `npm run build`
- Edit your Postman Hebbia environment, and set the value of `reserved.gist_url
` to be 
- Change your env file to  to [this gist](https://gist.github.com/abeal-hottomali/4f9aef55db4047c0f2bdad0acfdbad76)
- Run Postman to test changes.
