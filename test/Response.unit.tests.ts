import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
// import { mock, instance } from 'ts-mockito';
import Response from '../src/Response';

_chai.should();
const expect = _chai.expect;


@suite class ResponseUnitTests {

    @test 'Tests valid json'() {
        let obj = {
            "foo": {
                "bar": true
            }
        };
        let json = JSON.stringify(obj);
        let response = new Response(json);
        expect(response.getResponseRaw()).to.equal(json);
        expect(response.getResponseObject()).to.deep.equal(obj);
    }
    @test 'Tests invalid json'() {
        let obj = {
            "foo": {
                "bar": true
            }
        };
        let json = JSON.stringify(obj);
        // Make json invalid, confirm exception.
        json = '{"foo": {"bar": true}';
        expect(() => {new Response(json)}).to.throw(Error, 'Unexpected end of JSON input');
        json = "{'foo': 'bar'}";
        expect(() => {new Response(json)}).to.throw(Error, 'Unexpected token');
    }
}
