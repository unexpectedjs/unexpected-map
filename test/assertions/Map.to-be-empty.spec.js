/* global expect */
describe('empty assertion', () => {
  it('asserts a Map is empty', () => {
    expect(new Map(), 'to be empty');
  });

  it('asserts a Map is non-empty', () => {
    expect(
      new Map([
        [1, 'foo'],
        [2, 'bar'],
        [3, 'baz']
      ]),
      'not to be empty'
    );
  });

  it('should throw when unexpectedly non-empty', () => {
    expect(
      () => {
        expect(
          new Map([
            [1, 'foo'],
            [2, 'bar'],
            [3, 'baz']
          ]),
          'to be empty'
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      "expected Map([ [1, 'foo'], [2, 'bar'], [3, 'baz'] ]) to be empty"
    );
  });

  it('should throw when unexpectedly empty', () => {
    expect(
      () => {
        expect(new Map(), 'not to be empty');
      },
      'to throw an error satisfying',
      'to equal snapshot',
      'expected Map([]) not to be empty'
    );
  });
});
