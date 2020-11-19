const expect = require('unexpected')
  .clone()
  .use(require('unexpected-snapshot'));

expect.use(require('../../lib/unexpectedMap'));

expect.output.preferredWidth = 80;

expect.addAssertion(
  '<function> to throw an error satisfying <assertion>',
  (expect, cb) =>
    expect(cb, 'to throw').then((err) => {
      expect.errorMode = 'nested';
      return expect.shift(
        err.isUnexpected ? err.getErrorMessage('text').toString() : err.message
      );
    })
);

(function (root) {
  // expose globals
  root.expect = expect;
})(typeof window !== 'undefined' ? window : global);
