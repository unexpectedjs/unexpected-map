/*Map*/
var expect = require('unexpected').clone();

expect.use(require('../../lib/unexpectedMap'));

expect.output.preferredWidth = 80;

expect.addAssertion('<any> when delayed <number> <assertion>', function(
  expect,
  subject,
  value
) {
  return expect.promise(function(run) {
    setTimeout(
      run(function() {
        return expect.shift();
      }),
      value
    );
  });
});

expect.addAssertion('<any> when delayed a little bit <assertion>', function(
  expect,
  subject
) {
  return expect.promise(function(run) {
    setTimeout(
      run(function() {
        return expect.shift();
      }),
      1
    );
  });
});

describe('to satisfy assertion', function() {
  function toArguments() {
    return arguments;
  }

  it('passes when an object is tested against itself, even in the presence of circular references', function() {
    var circular = {};
    circular.loop = circular;
    expect(circular, 'to satisfy', circular);
  });

  describe('with the not flag', function() {
    it('should succeed when the assertion fails without the not flag', function() {
      expect(
        new Map([['foo', 123]]),
        'not to satisfy',
        new Map([['foo', 456]])
      );
    });

    it('should succeed when the assertion fails without the not flag, async case', function() {
      return expect(
        new Map([['foo', 123]]),
        'not to satisfy',
        new Map([
          ['foo', expect.it('when delayed a little bit', 'to equal', 456)]
        ])
      );
    });

    it('should fail when a non-Unexpected error occurs', function() {
      expect(
        function() {
          expect(new Map([['foo', 123]]), 'not to satisfy', function() {
            throw new Error('foo');
          });
        },
        'to throw',
        'foo'
      );
    });

    it('should fail when the assertion succeeds', function() {
      expect(
        function() {
          expect(
            new Map([['foo', 123]]),
            'not to satisfy',
            new Map([['foo', 123]])
          );
        },
        'to throw',
        "expected Map([ ['foo', 123] ]) not to satisfy Map([ ['foo', 123] ])"
      );
    });
  });

  // eslint-disable-next-line no-constant-condition
  if (false && Object.defineProperty) {
    it('should honor the getKeys implementation of a type when building a diff', function() {
      function MyThing(a, b) {
        this.a = a;
        Object.defineProperty(this, 'b', { enumerable: false, value: b });
      }

      var clonedExpect = expect.clone().addType({
        name: 'MyThing',
        base: 'object',
        identify: function(obj) {
          return obj instanceof MyThing;
        },
        getKeys: function() {
          return ['a', 'b'];
        }
      });

      expect(
        function() {
          clonedExpect(new MyThing(123, 456), 'to exhaustively satisfy', {
            a: 123,
            b: 654
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

  it.skip('renders missing properties correctly', function() {
    expect(
      function() {
        expect({ foo: 'bar' }, 'to satisfy', { foo: 'bar', baz: 123 });
      },
      'to throw',
      "expected { foo: 'bar' } to satisfy { foo: 'bar', baz: 123 }\n" +
        '\n' +
        '{\n' +
        "  foo: 'bar'\n" +
        '  // missing baz: 123\n' +
        '}'
    );
  });

  it('should render a diff where missing properties expected to be missing are not rendered', function() {
    // Regression test, used to be shown as:  shown as // missing: <property name>: undefined
    expect(
      function() {
        expect(
          new Map([['bar', 123]]),
          'to satisfy',
          new Map([['foo', undefined], ['bar', 456]])
        );
      },
      'to throw',
      "expected Map([ ['bar', 123] ]) to satisfy Map([ ['foo', undefined], ['bar', 456] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['bar', 123] // should equal 456\n" +
        '])'
    );
  });

  it.skip('ignores blacklisted properties in the diff', function() {
    var error = new Error('foo');
    error.description = 'qux';
    expect(
      function() {
        expect(error, 'to satisfy', new Error('bar'));
      },
      'to throw',
      "expected Error('foo') to satisfy Error('bar')\n" +
        '\n' +
        'Error({\n' +
        "  message: 'foo' // should equal 'bar'\n" +
        '                 //\n' +
        '                 // -foo\n' +
        '                 // +bar\n' +
        '})'
    );
  });

  it('renders missing properties correctly with expect.it', function() {
    expect(
      function() {
        expect(
          new Map([['foo', 'bar']]),
          'to satisfy',
          new Map([['foo', 'bar'], ['baz', expect.it('to equal', 123)]])
        );
      },
      'to throw',
      "expected Map([ ['foo', 'bar'] ])\n" +
        "to satisfy Map([ ['foo', 'bar'], ['baz', expect.it('to equal', 123)] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['foo', 'bar'],\n" +
        // XXX
        "  // missing: ['baz', should equal 123]\n" +
        '])'
    );
  });

  it.skip('forwards normal errors to the top-level', function() {
    expect(
      function() {
        expect(
          {
            foo: 'foo'
          },
          'to satisfy',
          function(value) {
            throw new Error('Custom error');
          }
        );
      },
      'to throw',
      'Custom error'
    );
  });

  it.skip('forwards normal errors found in promise aggregate errors to the top level', function() {
    var clonedExpect = expect
      .clone()
      .addAssertion('to foo', function(expect, subject) {
        var promises = [
          clonedExpect.promise(function() {
            clonedExpect('foo', 'to equal', 'bar');
          }),
          clonedExpect.promise(function() {
            return clonedExpect.promise.any([
              clonedExpect.promise(function() {
                clonedExpect('foo', 'to equal', 'bar');
              }),
              clonedExpect.promise(function() {
                throw new Error('wat');
              })
            ]);
          })
        ];
        return expect.promise.all(promises).caught(function(err) {
          return clonedExpect.promise.settle(promises);
        });
      });

    expect(
      function() {
        return clonedExpect('foo', 'to foo');
      },
      'to throw',
      'wat'
    );
  });

  describe('with a synchronous expect.it in the RHS object', function() {
    it('should support an object with a property value of expect.it', function() {
      expect(
        new Map([['foo', 'bar']]),
        'to satisfy',
        new Map([['foo', expect.it('to be a string')]])
      );
    });

    it('should support passing an array value to an expect.it', function() {
      expect(
        new Map([['foo', [123]]]),
        'to satisfy',
        new Map([
          ['foo', expect.it('to have items satisfying', 'to be a number')]
        ])
      );
    });

    it('should not call functions in the LHS object', function() {
      expect(
        new Map([
          [
            'foo',
            function() {
              throw new Error('Explosion');
            }
          ]
        ]),
        'to satisfy',
        new Map([['foo', expect.it('to be a function')]])
      );
    });
  });

  describe('with an asynchronous expect.it in the RHS object', function() {
    it('should support an object with a property value of expect.it', function() {
      return expect(
        new Map([['foo', 'bar']]),
        'to satisfy',
        new Map([
          ['foo', expect.it('when delayed a little bit', 'to be a string')]
        ])
      );
    });

    it('should support passing an array value to an expect.it', function() {
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
            )
          ]
        ])
      );
    });
  });

  it('should support regular expressions in the RHS object', function() {
    expect(new Map([['foo', 'bar']]), 'to satisfy', new Map([['foo', /ba/]]));

    expect(
      function() {
        expect(
          new Map([['foo', 'foo']]),
          'to satisfy',
          new Map([['foo', /f00/]])
        );
      },
      'to throw',
      "expected Map([ ['foo', 'foo'] ]) to satisfy Map([ ['foo', /f00/] ])\n" +
        '\n' +
        'Map([\n' +
        // XXX
        "  ['foo', 'foo'] // should match /f00/\n" +
        '])'
    );

    expect(
      function() {
        expect(
          new Map([['foo', 'foo']]),
          'to satisfy',
          new Map([['foo', expect.it('not to match', /oo/)]])
        );
      },
      'to throw',
      "expected Map([ ['foo', 'foo'] ])\n" +
        "to satisfy Map([ ['foo', expect.it('not to match', /oo/)] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['foo', 'foo'] // should not match /oo/\n" +
        '                 //\n' +
        '                 // foo\n' +
        '                 //  ^^\n' +
        '])'
    );
  });

  it('should support expect.it in an array', function() {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([['foo', expect.it('to be a number')]])
    );
  });

  describe('with a regular function in the RHS object', function() {
    it('should throw an exception if the condition is not met', function() {
      expect(new Map([['foo', 123]]), 'to satisfy', function(obj) {
        expect(obj.get('foo'), 'to equal', 123);
      });
    });

    it('should only consider functions that are identified as functions by the type system', function() {
      var clonedExpect = expect.clone().addType({
        name: 'functionStartingWithF',
        identify: function(obj) {
          return typeof obj === 'function' && /^f/i.test(obj.name);
        }
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

  describe.skip('on object with getters', function() {
    it('should satisfy on the value returned by the getter', function() {
      var subject = { nextLevel: {} };
      Object.defineProperty(subject.nextLevel, 'getMe', {
        get: function() {
          return 'got me';
        },
        enumerable: false
      });

      expect(subject, 'to satisfy', {
        nextLevel: {
          getMe: 'got me'
        }
      });
    });
  });

  describe.skip('on array-like', function() {
    it('should diff correctly against an array on the right hand side', function() {
      expect(
        function() {
          expect(toArguments({ foo: 'foo' }, 2, 3), 'to satisfy', [
            { foo: 'f00' }
          ]);
        },
        'to throw',
        "expected arguments( { foo: 'foo' }, 2, 3 ) to satisfy [ { foo: 'f00' } ]\n" +
          '\n' +
          'arguments(\n' +
          '  {\n' +
          "    foo: 'foo' // should equal 'f00'\n" +
          '               //\n' +
          '               // -foo\n' +
          '               // +f00\n' +
          '  },\n' +
          '  2, // should be removed\n' +
          '  3 // should be removed\n' +
          ')'
      );
    });
  });

  it('should support a chained expect.it', function() {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([
        ['foo', expect.it('to be a number').and('to be greater than', 10)]
      ])
    );

    expect(
      function() {
        expect(
          new Map([['foo', 123]]),
          'to satisfy',
          new Map([
            ['foo', expect.it('to be a number').and('to be greater than', 200)]
          ])
        );
      },
      'to throw',
      "expected Map([ ['foo', 123] ]) to satisfy\n" +
        'Map([\n' +
        "  ['foo', expect.it('to be a number')\n" +
        // XXX
        "                  .and('to be greater than', 200)]\n" +
        '])\n' +
        '\n' +
        'Map([\n' +
        "  ['foo', 123] // ✓ should be a number and\n" +
        '               // ⨯ should be greater than 200\n' +
        '])'
    );
  });

  it('should support asserting on properties that are not defined', function() {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([['bar', expect.it('to be undefined')]])
    );
  });

  it('should assert missing properties with undefined in the RHS object', function() {
    expect(
      new Map([['foo', 123]]),
      'to satisfy',
      new Map([['bar', undefined]])
    );
  });

  it('should support the exhaustively flag', function() {
    expect(
      new Map([['foo', 123]]),
      'to exhaustively satisfy',
      new Map([['foo', 123]])
    );
  });

  it('should support delegating to itself with the exhaustively flag', function() {
    expect(
      new Map([['foo', new Map([['bar', 123]])], ['baz', 456]]),
      'to satisfy',
      new Map([
        ['foo', expect.it('to exhaustively satisfy', new Map([['bar', 123]]))]
      ])
    );
  });

  it('should support delegating to itself without the exhaustively flag', function() {
    expect(
      new Map([['foo', new Map([['bar', 123], ['baz', 456]])], ['baz', 456]]),
      'to satisfy',
      new Map([['foo', expect.it('to satisfy', new Map([['bar', 123]]))]])
    );
  });

  it('should not fail when matching an object against a number', function() {
    expect(new Map([['foo', {}]]), 'not to satisfy', new Map([['foo', 123]]));
  });

  it('fails when using an unknown assertion', function() {
    expect(
      function() {
        expect(
          new Map([['bool', 'true']]),
          'to satisfy',
          new Map([['bool', expect.it('to be true')]])
        );
      },
      'to throw exception',
      "expected Map([ ['bool', 'true'] ])\n" +
        "to satisfy Map([ ['bool', expect.it('to be true')] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['bool', 'true'] // expected 'true' to be true\n" +
        '                   //   The assertion does not have a matching signature for:\n' +
        '                   //     <string> to be true\n' +
        '                   //   did you mean:\n' +
        '                   //     <boolean> [not] to be true\n' +
        '])'
    );
  });

  it.skip('includes the constructor name in the diff', function() {
    function Foo(value) {
      this.value = value;
    }
    expect(
      function() {
        expect(new Foo('bar'), 'to satisfy', { value: 'quux' });
      },
      'to throw exception',
      "expected Foo({ value: 'bar' }) to satisfy { value: 'quux' }\n" +
        '\n' +
        'Foo({\n' +
        "  value: 'bar' // should equal 'quux'\n" +
        '               //\n' +
        '               // -bar\n' +
        '               // +quux\n' +
        '})'
    );
  });

  it.skip('collapses subtrees without conflicts', function() {
    expect(
      function() {
        expect(
          {
            pill: {
              red: "I'll show you how deep the rabbit hole goes",
              blue: {
                ignorance: {
                  of: { illusion: { will: { not: { lead: 'to the truth' } } } }
                }
              },
              purple: {
                you: 'wat there is another pill',
                them: 'there is always more choices'
              }
            }
          },
          'to satisfy',
          {
            pill: {
              red: "I'll show you how deep the rabbit hole goes.",
              blue: {
                ignorance: {
                  of: { illusion: { will: { not: { lead: 'to the truth' } } } }
                }
              }
            }
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

  it.skip('indents removed objects correctly', function() {
    var str = 'abcdefghijklmnopqrstuvwxyz';
    expect(
      function() {
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

  it.skip('indents unchanged objects correctly', function() {
    var str = 'abcdefghijklmnopqrstuvwxyz';
    expect(
      function() {
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

  it.skip('can be negated with the "not" flag', function() {
    expect(123, 'not to satisfy assertion', 'to be a string');

    expect('foobar', 'not to satisfy', /quux/i);

    expect({ foo: 123 }, 'not to satisfy', {
      foo: expect.it('to be a string')
    });

    expect({ foo: 123, bar: 456 }, 'not to exhaustively satisfy', { foo: 123 });

    expect({ foo: 123 }, 'not to exhaustively satisfy', { bar: undefined });
  });

  it.skip('fails when the assertion fails', function() {
    expect(function() {
      expect(123, 'to satisfy assertion', 'to be a string');
    }, 'to throw');

    expect(
      function() {
        expect('foobar', 'to satisfy', /quux/i);
      },
      'to throw',
      "expected 'foobar' to match /quux/i"
    );

    // FIXME: Could this error message be improved?
    expect(
      function() {
        expect({ foo: 123 }, 'to satisfy', {
          foo: expect.it('to be a string')
        });
      },
      'to throw',
      "expected { foo: 123 } to satisfy { foo: expect.it('to be a string') }\n" +
        '\n' +
        '{\n' +
        '  foo: 123 // should be a string\n' +
        '}'
    );

    expect(function() {
      expect({ foo: 123, bar: 456 }, 'to exhaustively satisfy', { foo: 123 });
    }, 'to throw');

    expect(function() {
      expect({ foo: 123 }, 'to exhaustively satisfy', { bar: undefined });
    }, 'to throw');
  });

  it('should not break when trying to determine whether an object and null are structurally similar', function() {
    expect(
      function() {
        expect([new Map()], 'to satisfy', [null]);
      },
      'to throw',
      'expected [ Map([]) ] to satisfy [ null ]\n' +
        '\n' +
        '[\n' +
        '  Map([]) // should equal null\n' +
        ']'
    );
  });

  describe.skip('with the exhaustively flag', function() {
    function Foo() {}
    Foo.prototype.isFoo = true;
    describe('matching on properties found in the prototype', function() {
      it('should succeed', function() {
        expect(new Foo(), 'to exhaustively satisfy', { isFoo: true });
      });

      it('should fail with a diff', function() {
        expect(
          function() {
            expect(new Foo(), 'to exhaustively satisfy', { isFoo: false });
          },
          'to throw',
          'expected Foo({}) to exhaustively satisfy { isFoo: false }\n' +
            '\n' +
            'Foo({\n' +
            '  isFoo: true // should equal false\n' +
            '})'
        );
      });
    });

    it('should consider a object with no own properties to be exhaustively satisfied by an empty object', function() {
      expect(new Foo(), 'to exhaustively satisfy', {});
    });

    describe('with a non-enumerable property', function() {
      var bar = {};
      Object.defineProperty(bar, 'nonEnumerable', {
        value: 'theValue',
        enumerable: false
      });

      describe('when matching the non-enumerable property', function() {
        it('should succeed', function() {
          expect(bar, 'to exhaustively satisfy', { nonEnumerable: 'theValue' });
        });

        it('should fail with a diff', function() {
          expect(
            function() {
              expect(bar, 'to exhaustively satisfy', {
                nonEnumerable: 'wrong'
              });
            },
            'to throw',
            "expected {} to exhaustively satisfy { nonEnumerable: 'wrong' }\n" +
              '\n' +
              '{\n' +
              '  nonEnumerable:\n' +
              "    'theValue' // should equal 'wrong'\n" +
              '               //\n' +
              '               // -theValue\n' +
              '               // +wrong\n' +
              '}'
          );
        });
      });

      describe('when not matching the non-enumerable property', function() {
        it('should succeed', function() {
          expect(bar, 'to exhaustively satisfy', {});
        });

        it('should fail with a diff', function() {
          expect(
            function() {
              expect(bar, 'to exhaustively satisfy', {
                somethingElse: 'wrong'
              });
            },
            'to throw',
            "expected {} to exhaustively satisfy { somethingElse: 'wrong' }\n" +
              '\n' +
              '{\n' +
              "  // missing somethingElse: 'wrong'\n" +
              '}'
          );
        });
      });
    });
  });

  // Debatable:
  describe('when an unpresent value to is satisfied against a function', function() {
    it.skip('should allow an unpresent value to be satisfied against a non-expect.it function', function() {
      expect({}, 'to satisfy', { foo: function() {} });
    });

    it('should fail when the function throws', function() {
      expect(
        function() {
          expect(
            new Map(),
            'to satisfy',
            new Map([
              [
                'foo',
                function(value) {
                  expect(value, 'to be a string');
                }
              ]
            ])
          );
        },
        'to throw',
        function(err) {
          // Compensate for V8 5.1+ setting { foo: function () {} }.foo.name === 'foo'
          // http://v8project.blogspot.dk/2016/04/v8-release-51.html
          expect(
            err
              .getErrorMessage('text')
              .toString()
              .replace('function foo', 'function '),
            'to contain',
            'Map([\n' + "  // missing: ['foo', should be a string]\n" + '])'
          );
        }
      );
    });
  });

  describe('when an unpresent value to is satisfied against an expect.it', function() {
    it('should succeed', function() {
      expect(
        new Map([]),
        'to satisfy',
        new Map([['foo', expect.it('to be undefined')]])
      );
    });

    it('should fail with a diff', function() {
      expect(
        function() {
          expect(
            new Map([]),
            'to satisfy',
            new Map([['foo', expect.it('to be a string')]])
          );
        },
        'to throw',
        "expected Map([]) to satisfy Map([ ['foo', expect.it('to be a string')] ])\n" +
          '\n' +
          'Map([\n' +
          // XXX
          "  // missing: ['foo', should be a string]\n" +
          '])'
      );
    });
  });

  it('should not break when the assertion fails and there is a fulfilled function in the RHS', function() {
    expect(
      function() {
        expect(
          new Map([]),
          'to satisfy',
          new Map([['bar', 123], ['foo', function() {}]])
        );
      },
      'to throw',
      function(err) {
        // Compensate for V8 5.1+ setting { foo: function () {} }.foo.name === 'foo'
        // http://v8project.blogspot.dk/2016/04/v8-release-51.html
        expect(
          err
            .getErrorMessage('text')
            .toString()
            .replace(/function foo/g, 'function '),
          'to satisfy',
          "expected Map([]) to satisfy Map([ ['bar', 123], ['foo', function () {}] ])\n" +
            '\n' +
            'Map([\n' +
            "  // missing ['bar', 123],\n" +
            "  // missing ['foo', should satisfy function () {}]\n" +
            '])'
        );
      }
    );
  });

  describe.skip('when matching the constructor property of an object', function() {
    function Foo() {}

    // Fails because functions aren't modelled as objects:
    it('should succeed', function() {
      expect(new Foo(), 'to satisfy', { constructor: { name: 'Foo' } });
    });

    it('fail with a diff', function() {
      expect(
        function() {
          expect(new Foo(), 'to satisfy', { constructor: 123 });
        },
        'to throw',
        'expected Foo({}) to satisfy { constructor: 123 }\n' +
          '\n' +
          'Foo({\n' +
          '  constructor: function Foo() {} // should equal 123\n' +
          '})'
      );
    });
  });

  it('should not break when the assertion fails and the subject has a property that also exists on Object.prototype', function() {
    expect(
      function() {
        expect(
          new Map([['constructor', 123]]),
          'to satisfy',
          new Map([['foo', 456]])
        );
      },
      'to throw',
      "expected Map([ ['constructor', 123] ]) to satisfy Map([ ['foo', 456] ])\n" +
        '\n' +
        'Map([\n' +
        "  ['constructor', 123],\n" +
        "  // missing ['foo', 456]\n" +
        '])'
    );
  });
});
