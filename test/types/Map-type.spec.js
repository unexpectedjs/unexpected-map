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

    it('should mark missing Map keys', function () {
        expect(function () {
            expect(new Map([['quux', 'bar']]), 'to equal', new Map([['quux', 'bar'], ['zuuq', 'baz']]));
        }, 'to throw exception',
                "expected Map([ ['quux', 'bar'] ])\n" +
                "to equal Map([ ['quux', 'bar'], ['zuuq', 'baz'] ])\n" +
                "\n" +
                "Map([\n" +
                "  ['quux', 'bar']\n" +
                "  // missing ['zuuq', 'baz']\n" +
                "])");
    });

    it('should mark unecessary Map keys', function () {
        expect(function () {
            expect(new Map([['quux', 'bar'], ['zuuq', 'baz']]), 'to equal', new Map([['quux', 'bar']]));
        }, 'to throw exception',
                "expected Map([ ['quux', 'bar'], ['zuuq', 'baz'] ])\n" +
                "to equal Map([ ['quux', 'bar'] ])\n" +
                "\n" +
                "Map([\n" +
                "  ['quux', 'bar'],\n" +
                "  ['zuuq', 'baz'] // should be removed\n" +
                "])");
    });

    it('should output a value diff on matching Map', function () {
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
