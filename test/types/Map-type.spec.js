/* global expect */
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
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ ['quux', 'bar'] ])
        to equal Map([ ['quux', 'bar'], ['zuuq', 'baz'] ])

        Map([
          ['quux', 'bar']
          // missing ['zuuq', 'baz']
        ])
      `
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
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ ['quux', 'bar'], ['zuuq', 'baz'] ])
        to equal Map([ ['quux', 'bar'] ])

        Map([
          ['quux', 'bar'],
          ['zuuq', 'baz'] // should be removed
        ])
      `
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
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ ['foo', 'bar'] ]) to equal Map([ ['foo', 'baz'] ])

        Map([
          ['foo', 'bar'] // should equal 'baz'
                         //
                         // -bar
                         // +baz
        ])
      `
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
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ [[ 'a', 'b' ], 'bar'] ]) to equal Map([ [[ 'a', 'c' ], 'bar'] ])

        Map([
          [[ 'a', 'b' ], 'bar'] // should be removed
          // missing [[ 'a', 'c' ], 'bar']
        ])
      `
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
    const arrayKey = [];

    expect(
      function() {
        expect(
          new Map([[arrayKey, { foo: null }]]),
          'to satisfy',
          new Map([
            [arrayKey, { foo: null }],
            ['bar', 'baz']
          ])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ [[], { foo: null }] ])
        to satisfy Map([ [[], { foo: null }], ['bar', 'baz'] ])

        Map([
          [[], { foo: null }],
          // missing ['bar', 'baz']
        ])
      `
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
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ ['foo', { foo: null }] ]) to satisfy Map([ ['bar', { foo: null }] ])

        Map([
          ['foo', { foo: null }],
          // missing ['bar', { foo: null }]
        ])
      `
    );
  });

  describe('when interoperating with other types', () => {
    it('should error with a type mismatch (to equal)', () => {
      expect(
        () => {
          expect(new Map(), 'to equal', {});
        },
        'to throw an error satisfying',
        'to equal snapshot',
        expect.unindent`
          expected Map([]) to equal {}

          Mismatching constructors Map should be Object
        `
      );
    });

    it('should error with a type mismatch (to satisfy)', () => {
      expect(
        () => {
          expect(new Map(), 'to satisfy', {});
        },
        'to throw an error satisfying',
        'to equal snapshot',
        expect.unindent`
          expected Map([]) to equal {}

          Mismatching constructors Map should be Object
        `
      );
    });
  });
});
