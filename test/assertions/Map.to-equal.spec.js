var expect = require('unexpected').clone();

expect.use(require('../../lib/unexpectedMap'));

describe('to equal assertion', function() {
  it('should show two maps being equal', () => {
    expect(function() {
      expect(new Map([['foo', 123]]), 'to equal', new Map([['foo', 123]]));
    }, 'not to throw');
  });

  it('should show two maps not being equal', () => {
    expect(function() {
      expect(new Map([[{}, 123]]), 'to equal', new Map([[{}, 123]]));
    }, 'to throw');
  });
});
