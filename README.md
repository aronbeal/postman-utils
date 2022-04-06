# Postmark utilities

Defines a set of utility scripts for working with Postmark.  These scripts a written in Typescript, and designed to be compiled down to a single compressed `index.min.js` file.  You can then embed that file in a gist (for a controlled release), or link to it directly.

## Repo overview

Contained in this repo:
- `src`: Typescript source files for the project.
  - `src/pm.d.ts`: Typescript definitions for Postmark app.  Only defined to the degree that this project needs them.  Should not be relied upon externally.
- `built`: Build output for js files after typescript compilation.  Should only be a single output file.
- `test`: Mocha unit tests.  Testing approach from [here](https://medium.com/swlh/how-to-setting-up-unit-tests-with-typescript-871c0f4f1609).
- `.mocharc.json`: For testing.
- `.nycrc.json`: For testing.
- `register.js`: for testing.
