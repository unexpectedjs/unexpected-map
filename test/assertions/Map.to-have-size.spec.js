/* global expect */
describe('to have size assertion', () => {
  it('asserts a Map has a specific size', () => {
    expect(new Map([['foo', 'bar']]), 'to have size', 1);
  });

  it('asserts a Map does not have a specific size', () => {
    expect(new Map([['foo', 'bar']]), 'not to have size', 2);
  });

  it('should throw when Map is of unexpected size', () => {
    expect(
      () => {
        expect(new Map([['foo', 'bar']]), 'to have size', 2);
      },
      'to throw an error satisfying',
      'to equal snapshot',
      "expected new Map[ ['foo', 'bar'] ]) to have size 2"
    );
  });

  it('should throw when Map size is unexpectedly equal', () => {
    expect(
      () => {
        expect(new Map([['foo', 'bar']]), 'not to have size', 1);
      },
      'to throw an error satisfying',
      'to equal snapshot',
      "expected new Map[ ['foo', 'bar'] ]) not to have size 1"
    );
  });
});
