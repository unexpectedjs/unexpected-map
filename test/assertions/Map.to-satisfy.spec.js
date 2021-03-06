/* global expect */
expect.addAssertion(
  '<any> when delayed a little bit <assertion>',
  function (expect, subject) {
    return expect.promise(function (run) {
      setTimeout(
        run(function () {
          return expect.shift();
        }),
        1
      );
    });
  }
);

describe('to satisfy assertion', function () {
  it('passes when an object is tested against itself, even in the presence of circular references', function () {
    const circular = {};
    circular.loop = circular;
    expect(circular, 'to satisfy', circular);
  });

  describe('with the not flag', function () {
    it('should succeed when the assertion fails without the not flag', function () {
      expect(
        new Map([['foo', 123]]),
        'not to satisfy',
        new Map([['foo', 456]])
      );
    });

    it('should succeed when the assertion fails without the not flag, async case', function () {
      return expect(
        new Map([['foo', 123]]),
        'not to satisfy',
        new Map([
          ['foo', expect.it('when delayed a little bit', 'to equal', 456)],
        ])
      );
    });

    it('should fail when a non-Unexpected error occurs', function () {
      expect(
        function () {
          expect(
            new Map([['foo', 123]]),
            'not to satisfy',
            expect.it(() => {
              throw new Error('foo');
            })
          );
        },
        'to throw',
        'foo'
      );
    });

    it('should fail when the assertion succeeds', function () {
      expect(
        function () {
          expect(
            new Map([['foo', 123]]),
            'not to satisfy',
            new Map([['foo', 123]])
          );
        },
        'to throw an error satisfying',
        'to equal snapshot',
        "expected new Map[ ['foo', 123] ]) not to satisfy new Map[ ['foo', 123] ])"
      );
    });
  });

  // eslint-disable-next-line no-constant-condition
  if (false && Object.defineProperty) {
    it('should honor the getKeys implementation of a type when building a diff', function () {
      function MyThing(a, b) {
        this.a = a;
        Object.defineProperty(this, 'b', { enumerable: false, value: b });
      }

      const clonedExpect = expect.clone().addType({
        name: 'MyThing',
        base: 'object',
        identify: function (obj) {
          return obj instanceof MyThing;
        },
        getKeys: function () {
          return ['a', 'b'];
        },
      });

      expect(
        function () {
          clonedExpect(new MyThing(123, 456), 'to exhaustively satisfy', {
            a: 123,
            b: 654,
          });
        },
        'to throw',
        'expected MyThing({ a: 123, b: 456 }) to exhaustively satisfy { a: 123, b: 654 }\n' +
          '\n' +
          'MyThing({\n' +
          '  a: 123,\n' +
          '  b: 456 // should equal 654\n' +
          '})'
      );
    });
  }

  it('should render a diff where missing properties expected to be missing are not rendered', function () {
    // Regression test, used to be shown as:  shown as // missing: <property name>: undefined
    expect(
      function () {
        expect(
          new Map([['bar', 123]]),
          'to satisfy',
          new Map([
            ['foo', undefined],
            ['bar', 456],
          ])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['bar', 123] ])
        to satisfy new Map[ ['foo', undefined], ['bar', 456] ])

        new Map[
          ['bar',
            123 // should equal 456
          ]
        ])
      `
    );
  });

  it('renders missing properties correctly with expect.it', function () {
    expect(
      function () {
        expect(
          new Map([['foo', 'bar']]),
          'to satisfy',
          new Map([
            ['foo', 'bar'],
            ['baz', expect.it('to equal', 123)],
          ])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['foo', 'bar'] ])
        to satisfy new Map[ ['foo', 'bar'], ['baz', expect.it('to equal', 123)] ])

        new Map[
          ['foo', 'bar']
          // missing: ['baz', should equal 123]
        ])
      `
    );
  });

  describe('with a synchronous expect.it in the RHS object', function () {
    it('should support an object with a property value of expect.it', function () {
      expect(
        new Map([['foo', 'bar']]),
        'to satisfy',
        new Map([['foo', expect.it('to be a string')]])
      );
    });

    it('should support passing an array value to an expect.it', function () {
      expect(
        new Map([['foo', [123]]]),
        'to satisfy',
        new Map([
          ['foo', expect.it('to have items satisfying', 'to be a number')],
        ])
      );
    });

    it('should not call functions in the LHS object', function () {
      expect(
        new Map([
          [
            'foo',
            function () {
              throw new Error('Explosion');
            },
          ],
        ]),
        'to satisfy',
        new Map([['foo', expect.it('to be a function')]])
      );
    });
  });

  describe('with an asynchronous expect.it in the RHS object', function () {
    it('should support an object with a property value of expect.it', function () {
      return expect(
        new Map([['foo', 'bar']]),
        'to satisfy',
        new Map([
          ['foo', expect.it('when delayed a little bit', 'to be a string')],
        ])
      );
    });

    it('should support passing an array value to an expect.it', function () {
      return expect(
        new Map([['foo', [123]]]),
        'to satisfy',
        new Map([
          [
            'foo',
            expect.it(
              'when delayed a little bit',
              'to have items satisfying',
              'to be a number'
            ),
          ],
        ])
      );
    });
  });

  it('should support regular expressions in the RHS object', function () {
    expect(new Map([['foo', 'bar']]), 'to satisfy', new Map([['foo', /ba/]]));

    expect(
      function () {
        expect(
          new Map([['foo', 'foo']]),
          'to satisfy',
          new Map([['foo', /f00/]])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['foo', 'foo'] ]) to satisfy new Map[ ['foo', /f00/] ])

        new Map[
          ['foo',
            'foo' // should match /f00/
          ]
        ])
      `
    );

    expect(
      function () {
        expect(
          new Map([['foo', 'foo']]),
          'to satisfy',
          new Map([['foo', expect.it('not to match', /oo/)]])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['foo', 'foo'] ])
        to satisfy new Map[ ['foo', expect.it('not to match', /oo/)] ])

        new Map[
          ['foo',
            'foo' // should not match /oo/
                  //
                  // foo
                  //  ^^
          ]
        ])
      `
    );
  });

  it('should support expect.it in an array', function () {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([['foo', expect.it('to be a number')]])
    );
  });

  describe('with a regular function in the RHS object', function () {
    it('should throw an exception if the condition is not met', function () {
      expect(
        new Map([['foo', 123]]),
        'to satisfy',
        expect.it((obj) => {
          expect(obj.get('foo'), 'to equal', 123);
        })
      );
    });

    it('should only consider functions that are identified as functions by the type system', function () {
      const clonedExpect = expect.clone().addType({
        name: 'functionStartingWithF',
        identify: function (obj) {
          return typeof obj === 'function' && /^f/i.test(obj.name);
        },
      });

      function foo() {
        throw new Error('argh, do not call me');
      }

      clonedExpect(foo, 'to satisfy', foo);
      clonedExpect(
        new Map([['foo', foo]]),
        'to satisfy',
        new Map([['foo', foo]])
      );
    });
  });

  it('should support a chained expect.it', function () {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([
        ['foo', expect.it('to be a number').and('to be greater than', 10)],
      ])
    );

    expect(
      function () {
        expect(
          new Map([['foo', 123]]),
          'to satisfy',
          new Map([
            ['foo', expect.it('to be a number').and('to be greater than', 200)],
          ])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['foo', 123] ]) to satisfy
        new Map[
          ['foo', expect.it('to be a number')
                  .and('to be greater than', 200)]
        ])

        new Map[
          ['foo',
            123 // ✓ should be a number and
                // ⨯ should be greater than 200
          ]
        ])
      `
    );
  });

  it('should support asserting on properties that are not defined', function () {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([['bar', expect.it('to be undefined')]])
    );
  });

  it('should assert missing properties with undefined in the RHS object', function () {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([['bar', undefined]])
    );
  });

  it('should support the exhaustively flag', function () {
    expect(
      new Map([['foo', 123]]),
      'to exhaustively satisfy',
      new Map([['foo', 123]])
    );
  });

  it('should support delegating to itself with the exhaustively flag', function () {
    expect(
      new Map([
        ['foo', new Map([['bar', 123]])],
        ['baz', 456],
      ]),
      'to satisfy',
      new Map([
        ['foo', expect.it('to exhaustively satisfy', new Map([['bar', 123]]))],
      ])
    );
  });

  it('should support delegating to itself without the exhaustively flag', function () {
    expect(
      new Map([
        [
          'foo',
          new Map([
            ['bar', 123],
            ['baz', 456],
          ]),
        ],
        ['baz', 456],
      ]),
      'to satisfy',
      new Map([['foo', expect.it('to satisfy', new Map([['bar', 123]]))]])
    );
  });

  it('should not fail when matching an object against a number', function () {
    expect(new Map([['foo', {}]]), 'not to satisfy', new Map([['foo', 123]]));
  });

  it('fails when using an unknown assertion', function () {
    expect(
      function () {
        expect(
          new Map([['bool', 'true']]),
          'to satisfy',
          new Map([['bool', expect.it('to be true')]])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['bool', 'true'] ])
        to satisfy new Map[ ['bool', expect.it('to be true')] ])

        new Map[
          ['bool',
            'true' // expected 'true' to be true
                   //   The assertion does not have a matching signature for:
                   //     <string> to be true
                   //   did you mean:
                   //     <boolean> [not] to be true
          ]
        ])
      `
    );
  });

  it.skip('collapses subtrees without conflicts', function () {
    expect(
      function () {
        expect(
          {
            pill: {
              red: "I'll show you how deep the rabbit hole goes",
              blue: {
                ignorance: {
                  of: { illusion: { will: { not: { lead: 'to the truth' } } } },
                },
              },
              purple: {
                you: 'wat there is another pill',
                them: 'there is always more choices',
              },
            },
          },
          'to satisfy',
          {
            pill: {
              red: "I'll show you how deep the rabbit hole goes.",
              blue: {
                ignorance: {
                  of: { illusion: { will: { not: { lead: 'to the truth' } } } },
                },
              },
            },
          }
        );
      },
      'to throw',
      'expected\n' +
        '{\n' +
        '  pill: {\n' +
        "    red: 'I\\'ll show you how deep the rabbit hole goes',\n" +
        '    blue: { ignorance: ... },\n' +
        "    purple: { you: 'wat there is another pill', them: 'there is always more choices' }\n" +
        '  }\n' +
        '}\n' +
        'to satisfy\n' +
        '{\n' +
        '  pill: {\n' +
        "    red: 'I\\'ll show you how deep the rabbit hole goes.',\n" +
        '    blue: { ignorance: ... }\n' +
        '  }\n' +
        '}\n' +
        '\n' +
        '{\n' +
        '  pill: {\n' +
        "    red: 'I\\'ll show you how deep the rabbit hole goes',\n" +
        "         // should equal 'I\\'ll show you how deep the rabbit hole goes.'\n" +
        '         //\n' +
        "         // -I'll show you how deep the rabbit hole goes\n" +
        "         // +I'll show you how deep the rabbit hole goes.\n" +
        '    blue: { ignorance: { of: ... } },\n' +
        "    purple: { you: 'wat there is another pill', them: 'there is always more choices' }\n" +
        '  }\n' +
        '}'
    );
  });

  it.skip('indents removed objects correctly', function () {
    const str = 'abcdefghijklmnopqrstuvwxyz';
    expect(
      function () {
        expect(
          { foo: { a: str, b: str, c: str, d: str, e: str } },
          'to equal',
          {}
        );
      },
      'to throw',
      'expected\n' +
        '{\n' +
        '  foo: {\n' +
        "    a: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    b: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    c: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    d: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    e: 'abcdefghijklmnopqrstuvwxyz'\n" +
        '  }\n' +
        '}\n' +
        'to equal {}\n' +
        '\n' +
        '{\n' +
        '  foo: {\n' +
        "    a: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    b: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    c: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    d: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    e: 'abcdefghijklmnopqrstuvwxyz'\n" +
        '  } // should be removed\n' +
        '}'
    );
  });

  it.skip('indents unchanged objects correctly', function () {
    const str = 'abcdefghijklmnopqrstuvwxyz';
    expect(
      function () {
        expect(
          { foo: { a: str, b: str, c: str, d: str, e: str }, bar: 1 },
          'to equal',
          { foo: { a: str, b: str, c: str, d: str, e: str } }
        );
      },
      'to throw',
      'expected\n' +
        '{\n' +
        '  foo: {\n' +
        "    a: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    b: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    c: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    d: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    e: 'abcdefghijklmnopqrstuvwxyz'\n" +
        '  },\n' +
        '  bar: 1\n' +
        '}\n' +
        'to equal\n' +
        '{\n' +
        '  foo: {\n' +
        "    a: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    b: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    c: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    d: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    e: 'abcdefghijklmnopqrstuvwxyz'\n" +
        '  }\n' +
        '}\n' +
        '\n' +
        '{\n' +
        '  foo: {\n' +
        "    a: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    b: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    c: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    d: 'abcdefghijklmnopqrstuvwxyz',\n" +
        "    e: 'abcdefghijklmnopqrstuvwxyz'\n" +
        '  },\n' +
        '  bar: 1 // should be removed\n' +
        '}'
    );
  });

  it.skip('can be negated with the "not" flag', function () {
    expect(123, 'not to satisfy assertion', 'to be a string');

    expect('foobar', 'not to satisfy', /quux/i);

    expect({ foo: 123 }, 'not to satisfy', {
      foo: expect.it('to be a string'),
    });

    expect({ foo: 123, bar: 456 }, 'not to exhaustively satisfy', { foo: 123 });

    expect({ foo: 123 }, 'not to exhaustively satisfy', { bar: undefined });
  });

  describe('with the exhaustively flag', () => {
    describe('when matching entries in the Map', () => {
      it('should consider an empty Map exhaustively satisfied by another empty Map', () => {
        expect(new Map(), 'to exhaustively satisfy', new Map());
      });

      it('should succeed', () => {
        expect(
          new Map([['foo', true]]),
          'to exhaustively satisfy',
          new Map([['foo', true]])
        );
      });

      it('should fail with a diff', () => {
        expect(
          () => {
            expect(
              new Map([
                ['foo', true],
                ['bar', false],
              ]),
              'to exhaustively satisfy',
              new Map()
            );
          },
          'to throw an error satisfying',
          'to equal snapshot',
          expect.unindent`
            expected new Map[ ['foo', true], ['bar', false] ])
            to exhaustively satisfy new Map[])

            new Map[
              // should be removed: ['foo', true]
              // should be removed: ['bar', false]
            ])
          `
        );
      });
    });
  });

  describe('when an unpresent value to is satisfied against an expect.it function wrapper', function () {
    it('should fail when the function throws', function () {
      expect(
        function () {
          expect(
            new Map(),
            'to satisfy',
            new Map([['foo', expect.it('to be a string')]])
          );
        },
        'to throw an error satisfying',
        'to equal snapshot',
        expect.unindent`
          expected new Map[]) to satisfy new Map[ ['foo', expect.it('to be a string')] ])

          new Map[
            // missing: ['foo', should be a string]
          ])
        `
      );
    });
  });

  describe('when an unpresent value to is satisfied against an expect.it', function () {
    it('should succeed', function () {
      expect(
        new Map([]),
        'to satisfy',
        new Map([['foo', expect.it('to be undefined')]])
      );
    });

    it('should fail with a diff', function () {
      expect(
        function () {
          expect(
            new Map([]),
            'to satisfy',
            new Map([['foo', expect.it('to be a string')]])
          );
        },
        'to throw an error satisfying',
        'to equal snapshot',
        expect.unindent`
          expected new Map[]) to satisfy new Map[ ['foo', expect.it('to be a string')] ])

          new Map[
            // missing: ['foo', should be a string]
          ])
        `
      );
    });
  });

  it('should not break when the assertion fails and there is a fulfilled, expect.it-wrapped function in the RHS', function () {
    expect(
      function () {
        expect(
          new Map([]),
          'to satisfy',
          new Map([
            ['bar', 123],
            [
              'foo',
              expect.it(function (v) {
                expect(v, 'to be undefined');
              }),
            ],
          ])
        );
      },
      'to throw',
      expect.it(function (err) {
        // Compensate for V8 5.1+ setting { foo: function () {} }.foo.name === 'foo'
        // http://v8project.blogspot.dk/2016/04/v8-release-51.html
        expect(
          err
            .getErrorMessage('text')
            .toString()
            .replace(/function foo/g, 'function '),
          'to equal snapshot',
          expect.unindent`
            expected new Map[]) to satisfy
            new Map[
              ['bar', 123],
              ['foo', expect.it(function (v) { expect(v, 'to be undefined'); })]
            ])

            new Map[
              // missing ['bar', 123]
              // missing ['foo', should satisfy expect.it(function (v) { expect(v, 'to be undefined'); })]
            ])
          `
        );
      })
    );
  });

  it('should render a diff when the function differs', () => {
    function myFunction() {}
    function myOtherFunction() {}

    expect(
      () => {
        expect(
          new Map([['foo', myFunction]]),
          'to satisfy',
          new Map([['foo', myOtherFunction]])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['foo', function myFunction() {}] ])
        to satisfy new Map[ ['foo', function myOtherFunction() {}] ])

        new Map[
          ['foo',
            function myFunction() {} // should be function myOtherFunction() {}
          ]
        ])
      `
    );
  });

  it('should not break when the assertion fails and the subject has a property that also exists on Object.prototype', function () {
    expect(
      function () {
        expect(
          new Map([['constructor', 123]]),
          'to satisfy',
          new Map([['foo', 456]])
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected new Map[ ['constructor', 123] ]) to satisfy new Map[ ['foo', 456] ])

        new Map[
          ['constructor', 123]
          // missing ['foo', 456]
        ])
      `
    );
  });
});
