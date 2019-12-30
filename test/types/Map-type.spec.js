/*Map*/

const expect = require('unexpected').clone();

expect.use(require('../../lib/unexpectedMap'));

expect.output.preferredWidth = 80;

(typeof Map !== 'function' ? describe.skip : describe)('Map type', function() {
  it('treats an empty Map as equal to Map', function() {
    expect(new Map(), 'to equal', new Map());
  });

  it('treats an matching Maps as equal', function() {
    expect(new Map([['foo', 'bar']]), 'to equal', new Map([['foo', 'bar']]));
  });

  it('should mark missing Map keys', function() {
    expect(
      function() {
        expect(
          new Map([['quux', 'bar']]),
          'to equal',
          new Map([
            ['quux', 'bar'],
            ['zuuq', 'baz']
          ])
        );
      },
      'to throw exception',
      "expected Map([ ['quux', 'bar'] ])\n" +
        "to equal Map([ ['quux', 'bar'], ['zuuq', 'baz'] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['quux', 'bar']\n" +
        "  // missing ['zuuq', 'baz']\n" +
        '])'
    );
  });

  it('should mark unecessary Map keys', function() {
    expect(
      function() {
        expect(
          new Map([
            ['quux', 'bar'],
            ['zuuq', 'baz']
          ]),
          'to equal',
          new Map([['quux', 'bar']])
        );
      },
      'to throw exception',
      "expected Map([ ['quux', 'bar'], ['zuuq', 'baz'] ])\n" +
        "to equal Map([ ['quux', 'bar'] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['quux', 'bar'],\n" +
        "  ['zuuq', 'baz'] // should be removed\n" +
        '])'
    );
  });

  it('should output a value diff on matching Map', function() {
    expect(
      function() {
        expect(
          new Map([['foo', 'bar']]),
          'to equal',
          new Map([['foo', 'baz']])
        );
      },
      'to throw exception',
      "expected Map([ ['foo', 'bar'] ]) to equal Map([ ['foo', 'baz'] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['foo', 'bar'] // should equal 'baz'\n" +
        '                 //\n' +
        '                 // -bar\n' +
        '                 // +baz\n' +
        '])'
    );
  });

  it('should output a diff for complex Map keys', function() {
    expect(
      function() {
        expect(
          new Map([[['a', 'b'], 'bar']]),
          'to equal',
          new Map([[['a', 'c'], 'bar']])
        );
      },
      'to throw exception',
      "expected Map([ [[ 'a', 'b' ], 'bar'] ]) to equal Map([ [[ 'a', 'c' ], 'bar'] ])\n" +
        '\n' +
        'Map([\n' +
        "  [[ 'a', 'b' ], 'bar'] // should be removed\n" +
        "  // missing [[ 'a', 'c' ], 'bar']\n" +
        '])'
    );
  });

  it('should satisfy a Map', function() {
    expect(function() {
      const key = [];

      expect(
        new Map([[key, { foo: null }]]),
        'to satisfy',
        new Map([[key, { foo: null }]])
      );
    }, 'not to error');
  });

  it('should output a diff on mistatching key in "to satisfy"', function() {
    expect(
      function() {
        expect(
          new Map([[[], { foo: null }]]),
          'to satisfy',
          new Map([
            [[], { foo: null }],
            ['bar', 'baz']
          ])
        );
      },
      'to throw exception',
      'expected Map([ [[], { foo: null }] ])\n' +
        "to satisfy Map([ [[], { foo: null }], ['bar', 'baz'] ])\n" +
        '\n' +
        'Map([\n' +
        '  [[], { foo: null }],\n' +
        "  // missing ['bar', 'baz']\n" +
        '])'
    );
  });

  it('should output a diff when failing "to satisfy"', function() {
    expect(
      function() {
        expect(
          new Map([['foo', { foo: null }]]),
          'to satisfy',
          new Map([['bar', { foo: null }]])
        );
      },
      'to throw exception',
      "expected Map([ ['foo', { foo: null }] ]) to satisfy Map([ ['bar', { foo: null }] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['foo', { foo: null }],\n" +
        "  // missing ['bar', { foo: null }]\n" +
        '])'
    );
  });
});
