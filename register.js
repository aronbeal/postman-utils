/**
 * From https://medium.com/swlh/how-to-setting-up-unit-tests-with-typescript-871c0f4f1609
 */
const tsNode = require('ts-node');
const testTSConfig = require('./test/tsconfig.json');

tsNode.register({
  files: true,
  transpileOnly: true,
  project: './test/tsconfig.json'
});
