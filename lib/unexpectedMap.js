function retrieveMapValues(theMap) {
  const values = [];
  theMap.forEach(value => {
    values.push(value);
  });
  return values;
}

function createUnexpectedMap(expect) {
  expect.addStyle('propertyForMap', function(key, inspectedValue) {
    this.text('[')
      .appendInspected(key)
      .text(',')
      .sp()
      .append(inspectedValue);
  });

  expect.addType({
    name: 'Map',
    base: 'object',
    identify(obj) {
      return Object.prototype.toString.call(obj) === '[object Map]';
    },
    prefix(output, obj) {
      return output.text('Map([');
    },
    property(output, key, inspectedValue) {
      return output.propertyForMap(key, inspectedValue);
    },
    suffix(output, obj) {
      return output.text('])');
    },
    delimiter(output, i, length) {
      if (i < length - 1) {
        output.text('],');
      } else {
        output.text(']');
      }
      return output;
    },
    getKeys: Object.getOwnPropertySymbols
      ? function(obj) {
          const keys = this.retrieveKeys(obj);
          const symbols = Object.getOwnPropertySymbols(obj);
          if (symbols.length > 0) {
            return keys.concat(symbols);
          } else {
            return keys;
          }
        }
      : function(obj) {
          return this.retrieveKeys(obj);
        },
    hasKey(obj, key) {
      return obj.has(key);
    },
    retrieveKeys(obj) {
      const keys = [];
      obj.forEach((value, key) => {
        keys.push(key);
      });
      return keys;
    },
    uniqueKeys: function uniqueKeysAndSymbols() {
      // [filterFn], item1, item2...
      let filterFn;
      if (typeof arguments[0] === 'function') {
        filterFn = arguments[0];
      }
      const index = {};
      var uniqueKeysAndSymbols = [];

      function visit(item) {
        if (
          !Object.prototype.hasOwnProperty.call(index, item) &&
          (!filterFn || filterFn(item))
        ) {
          index[item] = true;
          uniqueKeysAndSymbols.push(item);
        }
      }

      function visitAndRecurse(item) {
        if (Array.isArray(item)) {
          item.forEach(visit);
        } else {
          visit(item);
        }
      }

      for (let i = filterFn ? 1 : 0; i < arguments.length; i += 1) {
        visitAndRecurse(arguments[i]);
      }

      return uniqueKeysAndSymbols;
    },
    valueForKey(obj, key) {
      return obj.get(key);
    }
  });

  expect.addAssertion(
    '<Map> to [exhaustively] satisfy <Map>',
    (expect, subject, value) => {
      const valueType = expect.argTypes[0];
      const subjectType = expect.subjectType;
      const subjectIsArrayLike = subjectType.is('array-like');
      if (subject === value) {
        return;
      }
      if (valueType.is('array-like') && !subjectIsArrayLike) {
        expect.fail();
      }

      const subjectIsMap = subjectType.is('Map');
      const valueIsMap = subjectType.is('Map');

      const promiseByKey = new Map();
      const keys = valueType.getKeys(value);
      const subjectKeys = subjectType.getKeys(subject);

      if (!subjectIsArrayLike) {
        // Find all non-enumerable subject keys present in value, but not returned by subjectType.getKeys:
        keys.forEach(key => {
          if (
            Object.prototype.hasOwnProperty.call(subject, key) &&
            subjectKeys.indexOf(key) === -1
          ) {
            subjectKeys.push(key);
          }
        });
      }

      keys.forEach((key, index) => {
        promiseByKey.set(
          key,
          expect.promise(() => {
            const subjectKey = subjectIsMap ? subject.get(key) : subject[key];
            const valueKey = valueIsMap ? value.get(key) : value[key];
            const valueKeyType = expect.findTypeOf(valueKey);
            if (valueKeyType.is('expect.it')) {
              expect.context.thisObject = subject;
              return valueKey(subjectKey, expect.context);
            } else if (valueKeyType.is('function')) {
              return valueKey(subjectKey);
            } else {
              return expect(subjectKey, 'to [exhaustively] satisfy', valueKey);
            }
          })
        );
      });

      // unpack the promiseByKay Map back to values for unexpected-bluebird
      const promisesInFlight = retrieveMapValues(promiseByKey);

      return expect.promise
        .all([
          expect.promise(() => {
            if (expect.flags.exhaustively) {
              const nonOwnKeysWithDefinedValues = keys.filter(key => {
                return (
                  !Object.prototype.hasOwnProperty.call(subject, key) &&
                  typeof subject[key] !== 'undefined'
                );
              });
              const valueKeysWithDefinedValues = keys.filter(key => {
                const valueKey = valueIsMap ? value.get(key) : value[key];
                return typeof valueKey !== 'undefined';
              });
              const subjectKeysWithDefinedValues = subjectKeys.filter(key => {
                const subjectKey = subjectIsMap ? subject.get(key) : subject[key];
                return typeof subjectKey !== 'undefined';
              });
              expect(
                valueKeysWithDefinedValues.length -
                  nonOwnKeysWithDefinedValues.length,
                'to equal',
                subjectKeysWithDefinedValues.length
              );
            }
          }),
          expect.promise.all(promisesInFlight)
        ])
        .caught(() => {
          return expect.promise.settle(promisesInFlight).then(() => {
            expect.fail({
              diff(output, diff, inspect, equal) {
                output.inline = true;
                const subjectIsArrayLike = subjectType.is('array-like');
                const valueKeys = valueType.getKeys(value);
                const uniqueKeys = subjectType
                  .uniqueKeys(subjectKeys, valueKeys)
                  .filter(key => {
                    const valueKey = valueIsMap ? value.get(key) : value[key];
                    const subjectHasKey = subjectIsMap
                      ? subject.has(key)
                      : key in subject;
                    // Skip missing keys expected to be missing so they don't get rendered in the diff
                    return subjectHasKey || typeof valueKey !== 'undefined';
                  });
                const prefixOutput = subjectType.prefix(output.clone(), subject);
                output.append(prefixOutput).nl(prefixOutput.isEmpty() ? 0 : 1);

                if (subjectType.indent) {
                  output.indentLines();
                }
                uniqueKeys.forEach((key, index) => {
                  const subjectKey = subjectIsMap
                    ? subject.get(key)
                    : subject[key];
                  const valueKey = valueIsMap ? value.get(key) : value[key];

                  output
                    .nl(index > 0 ? 1 : 0)
                    .i()
                    .block(function() {
                      let valueOutput;
                      const annotation = output.clone();
                      let conflicting;

                      if (
                        promiseByKey.has(key) &&
                        promiseByKey.get(key).isRejected()
                      ) {
                        conflicting = promiseByKey.get(key).reason();
                      }

                      const missingArrayIndex =
                        subjectType.is('array-like') && !(key in subject);

                      let isInlineDiff = true;

                      output.omitSubject = subjectKey;
                      const subjectHasKey = subjectIsMap
                        ? subject.has(key)
                        : key in subject;
                      const valueHasKey = valueIsMap
                        ? value.has(key)
                        : key in value;

                      if (!valueHasKey) {
                        if (expect.flags.exhaustively) {
                          annotation.error('should be removed');
                        } else {
                          conflicting = null;
                        }
                      } else if (!subjectHasKey) {
                        if (expect.findTypeOf(valueKey).is('function')) {
                          if (promiseByKey.get(key).isRejected()) {
                            output.error('// missing:').sp();
                            valueOutput = output
                              .clone()
                              .appendErrorMessage(
                                promiseByKey.get(key).reason()
                              );
                          } else {
                            output.error('// missing').sp();
                            valueOutput = output
                              .clone()
                              .error('should satisfy')
                              .sp()
                              .block(inspect(valueKey));
                          }
                        } else {
                          output.error('// missing').sp();
                          valueOutput = inspect(valueKey);
                        }
                      } else if (conflicting || missingArrayIndex) {
                        const keyDiff =
                          conflicting && conflicting.getDiff({ output });
                        isInlineDiff = !keyDiff || keyDiff.inline;
                        if (missingArrayIndex) {
                          output.error('// missing').sp();
                        }
                        if (keyDiff && keyDiff.inline) {
                          valueOutput = keyDiff;
                        } else if (typeof valueKey === 'function') {
                          isInlineDiff = false;
                          annotation.appendErrorMessage(conflicting);
                        } else if (!keyDiff || (keyDiff && !keyDiff.inline)) {
                          annotation
                            .error(
                              (conflicting && conflicting.getLabel()) ||
                                'should satisfy'
                            )
                            .sp()
                            .block(inspect(valueKey));

                          if (keyDiff) {
                            annotation.nl(2).append(keyDiff);
                          }
                        } else {
                          valueOutput = keyDiff;
                        }
                      }

                      if (!valueOutput) {
                        if (missingArrayIndex || !subjectHasKey) {
                          valueOutput = output.clone();
                        } else {
                          valueOutput = inspect(subjectKey);
                        }
                      }

                      const omitDelimiter =
                        missingArrayIndex || index >= subjectKeys.length - 1;

                      if (!omitDelimiter || subjectType.is('Map')) {
                        valueOutput.amend(
                          subjectType.delimiter(
                            output.clone(),
                            index,
                            uniqueKeys.length
                          )
                        );
                      }

                      const annotationOnNextLine =
                        !isInlineDiff &&
                        output.preferredWidth <
                          this.size().width +
                            valueOutput.size().width +
                            annotation.size().width;

                      if (!annotation.isEmpty()) {
                        if (!valueOutput.isEmpty()) {
                          if (annotationOnNextLine) {
                            valueOutput.nl();
                          } else {
                            valueOutput.sp();
                          }
                        }

                        valueOutput.annotationBlock(function() {
                          this.append(annotation);
                        });
                      }

                      if (!isInlineDiff) {
                        valueOutput = output.clone().block(valueOutput);
                      }

                      subjectType.property(
                        this,
                        key,
                        valueOutput,
                        subjectIsArrayLike
                      );
                    });
                });

                if (subjectType.indent) {
                  output.outdentLines();
                }
                const suffixOutput = subjectType.suffix(output.clone(), subject);
                return output
                  .nl(suffixOutput.isEmpty() ? 0 : 1)
                  .append(suffixOutput);
              }
            });
          });
        });
    }
  );

  expect.addAssertion(
    [
      '<Map> to have values [exhaustively] satisfying <any>',
      '<Map> to have values [exhaustively] satisfying <assertion>'
    ],
    (expect, subject, nextArg) => {
      expect.errorMode = 'nested';
      expect(subject, 'not to be empty');
      expect.errorMode = 'bubble';

      const subjectType = expect.subjectType;
      const subjectIsMap = subjectType.is('Map');

      const expected = subjectIsMap ? new Map() : {};
      const setExpected = subjectIsMap
        ? (key, value) => {
            expected.set(key, value);
          }
        : (key, value) => {
            expected[key] = value;
          };
      const keys = subjectType.getKeys(subject);

      keys.forEach((key, index) => {
        if (typeof nextArg === 'string') {
          setExpected(key, s => {
            return expect.shift(s);
          });
        } else if (typeof nextArg === 'function') {
          setExpected(key, s => {
            return nextArg._expectIt
              ? nextArg(s, expect.context)
              : nextArg(s, index);
          });
        } else {
          setExpected(key, nextArg);
        }
      });

      return expect.withError(
        () => {
          return expect(subject, 'to [exhaustively] satisfy', expected);
        },
        err => {
          expect.fail({
            message(output) {
              output.append(
                expect.standardErrorMessage(output.clone(), { compact: true })
              );
            },
            diff(output) {
              const diff = err.getDiff({ output });
              diff.inline = true;
              return diff;
            }
          });
        }
      );
    }
  );
}

module.exports = {
  installInto: createUnexpectedMap
};
