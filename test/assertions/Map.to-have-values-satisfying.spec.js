/*Map*/

var expect = require('unexpected').clone();

expect.use(require('../../lib/unexpectedMap'));

expect.output.preferredWidth = 80;

describe('to have values satiasying assertion', function() {
  it('should have values satisfying an object', function() {
    expect(function() {
      expect(new Map([[[], { foo: null }]]), 'to have values satisfying', {
        foo: expect.it('to be null')
      });
    }, 'not to error');
  });

  it('should output a diff when failing "to have values satisfying"', function() {
    expect(
      function() {
        expect(new Map([[[], { foo: null }]]), 'to have values satisfying', {
          foo: expect.it('to be a number')
        });
      },
      'to error',
      'expected Map([ [[], { foo: null }] ])\n' +
        "to have values satisfying { foo: expect.it('to be a number') }\n" +
        '\n' +
        'Map([\n' +
        '  [[], {\n' +
        '    foo: null // should be a number\n' +
        '  }]\n' +
        '])'
    );
  });
});
