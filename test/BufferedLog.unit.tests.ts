import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
// import { mock, instance } from 'ts-mockito';
import { BufferedLog} from '../src/BufferedLog';

_chai.should();
const expect = _chai.expect;


@suite class BufferedLogUnitTests {
  @test 'Tests log() and clear()'() {
      let log = new BufferedLog();
      log.log("foo");
      log.log("bar");
      expect(log.all()).to.eql(["foo", "bar"]);
      log.clear();
      expect(log.all()).to.eql([])
      log.log({foo: "foo"});
      expect(log.all()).to.eql([{foo: "foo"}]);
      log.log(["bar"]);
      expect(log.all()).to.eql([{foo: "foo"}, ["bar"]]);
  }
}
