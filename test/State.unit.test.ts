import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import MockPostman from './MockPostman';
import { mock, instance } from 'ts-mockito';
import Environment from '../src/Environment';
import Logger, { LogVerbosity } from '../src/Logger';
import State from '../src/State';
import Utils from '../src/Utils';
import { assert } from 'console';

_chai.should();
const expect = _chai.expect;
const when = _chai.when;
const anyNumber = _chai.anyNumber;

@suite class StateUnitTests {
    @test 'Tests State get()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);
        const state_object = {"foo": 1};

        // ASSERT: Should not except if state key does not exist on instantiation.
        let state: State;
        state = new State('state_key', env, logger);
        expect(() => state.get('foo')).to.throw(Error);

        // ACT: Set state key value with legit object, and reload state
        pm.collectionVariables.set('state_key', JSON.stringify(state_object));   
        expect(env.hasState('state_key')).to.equal(true);     
        state = new State('state_key', env, logger);
        // ASSERT: state instantiation loads value set for state_key
        expect(state.get('foo')).to.equal(1);
        // ASSERT: Missing state keys show undefined.
        expect(() => state.get('bar')).to.throw(Error, 'The key bar was never set within the state');
    }
    @test 'Tests State save() and load()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);


        // ASSERT: Should not except if state key does not exist on instantiation.
        let state: State;
        state = new State('state_key', env, logger);
        expect(pm.collectionVariables.get('state_key')).to.equal(undefined);
        // ACT
        state.save();
        // ASSERT: Ensure object is saved to collection.
        expect(pm.collectionVariables.get('state_key')).to.equal('{}');
        
        // ACT
        state.set('foo', 1);    
        // ASSERT: collection is immediately modified with set() call.
        expect(pm.collectionVariables.get('state_key')).to.equal(JSON.stringify({"foo": 1}));

    }
    @test 'Tests State getAll(), reset(), isset(), and setAll()'() {
        // ARRANGE
        const pm = new MockPostman();
        const logger = new Logger(LogVerbosity.none);
        const env = new Environment(pm, logger);

        let state: State;
        state = new State('state_key', env, logger);
        
        // ACT: Persist values individually
        const values = {
            'foo': 1,
            'bar': 2,
            'baz': 3
        };
        Object.keys(values).map(k => state.set(k, values[k]));
        // Asssert: Ensure getAll() is working.
        expect(state.getAll()).to.eql(values);
        expect(state.get('foo')).to.eql(1);

        // ACT: Clear
        state.reset();
        // ASSERT: Ensure state is empty.
        expect(state.getAll()).to.eql({});

        // ACT
        state.setAll(values);
        // ASSERT: Ensure this works.
        expect(state.getAll()).to.eql(values);
        expect(state.isset('foo')).to.equal(true);
        expect(state.isset('baf')).to.equal(false);
    }
}
