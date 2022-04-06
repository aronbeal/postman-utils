import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
// import { mock, instance } from 'ts-mockito';
import * as Helpers from '../src/Helpers';

_chai.should();
const expect = _chai.expect;

const expect_iri_to_id = (val) => expect(Helpers.iri_to_id(val));
const expect_is_empty = (val) => expect(Helpers.is_empty(val));

@suite class HelpersUnitTests {

  @test 'Tests iri_to_id'() {
    expect_iri_to_id('/brands/1').to.equal('1');
  }
  @test 'Tests is_empty'() {
    expect_is_empty('').to.equal(true);
    expect_is_empty(null).to.equal(true);
    expect_is_empty(undefined).to.equal(true);
    expect_is_empty(false).to.equal(false);
    expect_is_empty(0).to.equal(false);
  }
}
