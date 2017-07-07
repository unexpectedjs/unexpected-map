/*Map*/

const expect = require('unexpected').clone();

expect.use(require('../../lib/unexpectedMap'));

(typeof Map !== 'function' ? describe.skip : describe)('Map type', function () {
    it('treats an empty Map as equal to Map', function () {
        expect(new Map(), 'to equal', new Map());
    });

    it('treats an matching Maps as equal', function () {
        expect(new Map([['foo', 'bar']]), 'to equal', new Map([['foo', 'bar']]));
    });

    it.skip('should output a value diff on matching Map', function () {
        expect(function () {
            expect(new Map([['foo', 'bar']]), 'to equal', new Map([['foo', 'baz']]));
        }, 'to throw exception',
                "expected Map([ ['foo', 'bar'] ]) to equal Map([ ['foo', 'baz'] ])\n" +
                "\n" +
                "Map([\n" +
                "  ['foo', 'bar'] // should equal 'baz'\n" +
                "                 //\n" +
                "                 // -bar\n" +
                "                 // +baz\n" +
                "])");
    });
});
