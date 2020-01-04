var expect = require('unexpected')
  .clone()
  .use(require('unexpected-snapshot'));

expect.use(require('../../lib/unexpectedMap'));

expect.addAssertion(
  '<function> to throw an error satisfying <assertion>',
  (expect, cb) =>
    expect(cb, 'to throw').then(err => {
      expect.errorMode = 'nested';
      return expect.shift(
        err.isUnexpected ? err.getErrorMessage('text').toString() : err.message
      );
    })
);

describe('to equal assertion', function() {
  it('should show two maps being equal', () => {
    expect(function() {
      expect(new Map([['foo', 123]]), 'to equal', new Map([['foo', 123]]));
    }, 'not to throw');
  });

  it('should show two maps not being equal', () => {
    expect(
      function() {
        expect(new Map([[{}, 123]]), 'to equal', new Map([[{}, 123]]));
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ [{}, 123] ]) to equal Map([ [{}, 123] ])

        Map([
          [{}, 123] // should be removed
          // missing [{}, 123]
        ])
      `
    );
  });
});
