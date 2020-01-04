/* global expect */
describe('to have values satisfying assertion', function() {
  it('should pass with an assertion', function() {
    expect(function() {
      expect(new Map([[[], null]]), 'to have values satisfying', 'to be null');
    }, 'not to error');
  });

  it('should pass with an expect.it', function() {
    expect(function() {
      expect(
        new Map([[[], null]]),
        'to have values satisfying',
        expect.it('to be null')
      );
    }, 'not to error');
  });

  it('should pass with an object value and satisfy semantics', function() {
    expect(function() {
      expect(new Map([[[], { foo: null }]]), 'to have values satisfying', {
        foo: expect.it('to be falsy')
      });
    }, 'not to error');
  });

  it('fails if the given Map is empty', () => {
    expect(
      function() {
        expect(
          new Map(),
          'to have values satisfying',
          expect.it(value => {
            expect(value, 'to equal', '0');
          })
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([]) to have values satisfying
        expect.it(value => {
          expect(value, 'to equal', '0');
        })
          expected Map([]) not to be empty
      `
    );
  });

  it('should render a diff when failing "to have values satisfying"', function() {
    expect(
      function() {
        expect(new Map([[[], { foo: null }]]), 'to have values satisfying', {
          foo: expect.it('to be a number')
        });
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map([ [[], { foo: null }] ])
        to have values satisfying { foo: expect.it('to be a number') }

        Map([
          [[], {
            foo: null // should be a number
          }]
        ])
      `
    );
  });

  it('should render a diff when the function differs', () => {
    function myFunction() {}
    function myOtherFunction() {}

    expect(
      () => {
        expect(
          new Map([['foo', myFunction]]),
          'to have values satisfying',
          myOtherFunction
        );
      },
      'to throw an error satisfying',
      'to equal snapshot',
      expect.unindent`
        expected Map to have values satisfying function myOtherFunction() {}

        Map([
          ['foo',
            function myFunction() {} // should be function myOtherFunction() {}
          ]
        ])
      `
    );
  });
});
