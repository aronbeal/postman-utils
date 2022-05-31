import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import MockPostman from './MockPostman';
import { mock, instance } from 'ts-mockito';
import Environment from '../src/Environment';
import Logger, { LogVerbosity } from '../src/Logger';
import State from '../src/State';
import Utils from '../src/Utils';

_chai.should();
const expect = _chai.expect;
const when = _chai.when;
const anyNumber = _chai.anyNumber;

@suite class EnvironmentUnitTests {
    @test 'Tests Environment getCollectionVariable()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        // ACT
        pm.collectionVariables.set('foo', 1);
        // ASSERT: The collection variable is properly retrieved from pm.collectionVariables.
        expect(env.getCollectionVariable('foo')).to.equal(1);
        expect(env.getCollectionVariable('bar')).to.equal(undefined);
    }
    @test 'Tests Environment setCollectionVariable()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        // ACT
        env.setCollectionVariable('foo', 1);
        // ASSERT: The variable was properly set in pm.collectionVariables.
        expect(pm.collectionVariables.get('foo')).to.equal(1);
        expect(pm.collectionVariables.get('bar')).to.equal(undefined);
    }
    @test 'Tests Environment unsetCollectionVariable()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        pm.collectionVariables.set('foo', 1);
        pm.collectionVariables.set('bar', 2);
        expect(env.getCollectionVariable('foo')).to.equal(1);
        expect(env.getCollectionVariable('bar')).to.equal(2);
        // ACT
        env.unsetCollectionVariable('foo');
        // ASSERT: foo is unset, others are not.
        expect(pm.collectionVariables.get('foo')).to.equal(undefined);
        expect(env.getCollectionVariable('bar')).to.equal(2);
        // ACT
        env.unsetCollectionVariable('baz');
        // ASSERT: Unsetting a non-existing variable did not negatively impact the collection, and threw no 
        // exceptions.
        expect(pm.collectionVariables.get('foo')).to.equal(undefined);
        expect(env.getCollectionVariable('bar')).to.equal(2);
        expect(pm.collectionVariables.get('baz')).to.equal(undefined);
    }
    @test 'Tests Environment clearCollectionVariables()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        pm.collectionVariables.set('foo', 1);
        pm.collectionVariables.set('bar', 2);
        expect(env.getCollectionVariable('foo')).to.equal(1);
        expect(env.getCollectionVariable('bar')).to.equal(2);
        // ACT
        env.clearCollectionVariables();
        // ASSERT: All vars are unset.
        expect(env.getCollectionVariable('foo')).to.equal(undefined);
        expect(env.getCollectionVariable('bar')).to.equal(undefined);
    }
    @test 'Tests Environment loadState()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        const state_object = {"foo": 1};
        const stringified_state_object = JSON.stringify(state_object);
        pm.collectionVariables.set('state_key', JSON.stringify(state_object));
        expect(env.getCollectionVariable('state_key')).to.equal(stringified_state_object);
        // ACT:
        const state = env.loadState('state_key');
        // ASSERT: Object was properly loaded and hydrated.
        expect(state).to.eql(state_object);

        // ASSERT: Missing state object throws an error.
        expect(() => env.loadState('nonexistent_key')).to.throw(Error, 'Attempted to load a non-existent storage key');

        // ARRANGE: Invalid state object:

        pm.collectionVariables.set('state_key', '{"foo: }');
        expect(() => env.loadState('state_key')).to.throw(Error, 'Could not decode');

        pm.collectionVariables.set('state_key', undefined);
        expect(() => env.loadState('state_key')).to.throw(Error, 'Attempted to load a non-existent storage key');
    }
    @test 'Tests Environment hasState()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        const state_object = {"foo": 1};
        const stringified_state_object = JSON.stringify(state_object);
        pm.collectionVariables.set('state_key', JSON.stringify(state_object));
        expect(env.getCollectionVariable('state_key')).to.equal(stringified_state_object);
        // ACT: N/A
  
        // ASSERT: State object exists.
        expect(env.hasState('state_key')).to.equal(true);
        // ASSERT: State object does not exist.
        expect(env.hasState('nonexistent_key')).to.equal(false);
    }
    @test 'Tests Environment saveState()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        const state_object = {"foo": 1};
        const original_stringified_state_object = JSON.stringify(state_object);
        // ACT
        env.saveState('state_key', state_object);
        // ASSERT: object is stored in collection variables.
        expect(pm.collectionVariables.get('state_key')).to.equal(JSON.stringify(state_object));
        // ACT
        state_object['bar'] = 2;
        env.saveState('state_key', state_object);
        // Assert: Updated object is stored.
        expect(pm.collectionVariables.get('state_key')).to.equal(JSON.stringify(state_object));
    }
}
