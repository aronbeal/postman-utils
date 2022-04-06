import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { mock, instance } from 'ts-mockito';
import Environment from '../src/Environment';

_chai.should();
const expect = _chai.expect;
const when = _chai.when;
const anyNumber = _chai.anyNumber;

@suite class EnvironmentUnitTests {
    @test 'Tests Environment get()'() {
        const mockPostman: Postman = mock();
        when(mockPostman.environment.get('foo')).thenReturn('foo');
        when(mockPostman.environment.get('bar')).thenReturn('bar');
        const pm = instance(mockPostman);
        let env = new Environment(pm);
        expect(env.get('foo')).to.equal('foo');
        expect(env.get('bar')).to.equal('bar');
    }
}
