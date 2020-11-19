/* global expect */
describe('to equal assertion', function () {
  it('should show two maps being equal', () => {
    expect(function () {
      expect(new Map([['foo', 123]]), 'to equal', new Map([['foo', 123]]));
    }, 'not to throw');
  });

  it('should show two maps not being equal (subject)', () => {
    expect(
      function () {
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

  it('should show two maps not being equal (value)', () => {
    expect(
      function () {
        expect(new Map([[123, {}]]), 'to equal', new Map([[123, {}]]));
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ [123, {}] ]) to equal Map([ [123, {}] ])

        Map([
          [123, {

          }]
        ])
      `
    );
  });
});
