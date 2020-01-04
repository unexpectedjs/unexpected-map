function getFunctionName(f) {
  if (typeof f.name === 'string') {
    return f.name;
  }
  const matchFunctionName = Function.prototype.toString
    .call(f)
    .match(/function ([^(]+)/);
  if (matchFunctionName) {
    return matchFunctionName[1];
  }

  if (f === Object) {
    return 'Object';
  }
  if (f === Function) {
    return 'Function';
  }
  return '';
}

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

  const objectType = expect.getType('object');

  expect.addType({
    name: 'Map',
    indent: true,
    forceMultipleLines: false,
    identify(obj) {
      return Object.prototype.toString.call(obj) === '[object Map]';
    },
    inspect: objectType.inspect,
    diff: objectType.diff,
    equal(a, b) {
      if (a === b) {
        return true;
      }

      if (b.constructor !== a.constructor) {
        return false;
      }

      if (a.size !== b.size) {
        return false;
      }

      return Array.from(b.entries()).every(
        ([bKey, bValue]) => a.has(bKey) && a.get(bKey) === bValue
      );
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
    uniqueKeys(subjectKeys, valueKeys) {
      const subjectKeysSet = new Set(subjectKeys);
      const uniqueValueKeys = valueKeys.filter(
        valueKey => !subjectKeysSet.has(valueKey)
      );

      const uniqueKeys = [...subjectKeys, ...uniqueValueKeys];

      return uniqueKeys;
    },
    valueForKey(obj, key) {
      return obj.get(key);
    }
  });

  expect.addAssertion('<Map> to equal <Map>', (expect, subject, value) => {
    expect.withError(
      () => {
        expect(expect.equal(value, subject), 'to be truthy');
      },
      e => {
        expect.fail({
          label: 'should equal',
          diff(output, diff) {
            return diff(subject, value);
          }
        });
      }
    );
  });

  expect.addAssertion('<Map> to equal <any>', (expect, actual, expected) => {
    expect.fail({
      diff: output => {
        return output
          .text('Mismatching constructors ')
          .text(
            (actual.constructor && getFunctionName(actual.constructor)) ||
              actual.constructor
          )
          .text(' should be ')
          .text(
            (expected.constructor && getFunctionName(expected.constructor)) ||
              expected.constructor
          );
      }
    });
  });

  expect.addAssertion(
    '<Map> to [exhaustively] satisfy <Map>',
    (expect, subject, value) => {
      const valueType = expect.argTypes[0];
      const subjectType = expect.subjectType;
      if (subject === value) {
        return;
      }

      const promiseByKey = new Map();
      const keys = valueType.getKeys(value);
      const subjectKeys = subjectType.getKeys(subject);

      keys.forEach((key, index) => {
        promiseByKey.set(
          key,
          expect.promise(() => {
            const subjectKey = subject.get(key);
            const valueKey = value.get(key);
            const valueKeyType = expect.findTypeOf(valueKey);
            if (valueKeyType.is('expect.it')) {
              expect.context.thisObject = subject;
              return valueKey(subjectKey, expect.context);
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
                const valueKey = value.get(key);
                return typeof valueKey !== 'undefined';
              });
              const subjectKeysWithDefinedValues = subjectKeys.filter(key => {
                const subjectKey = subject.get(key);
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
                const valueKeys = valueType.getKeys(value);
                const uniqueKeys = subjectType
                  .uniqueKeys(subjectKeys, valueKeys)
                  .filter(key => {
                    const valueKey = value.get(key);
                    const subjectHasKey = subject.has(key);
                    // Skip missing keys expected to be missing so they don't get rendered in the diff
                    return subjectHasKey || typeof valueKey !== 'undefined';
                  });
                const prefixOutput = subjectType.prefix(
                  output.clone(),
                  subject
                );
                output.append(prefixOutput).nl(prefixOutput.isEmpty() ? 0 : 1);

                if (subjectType.indent) {
                  output.indentLines();
                }
                uniqueKeys.forEach((key, index) => {
                  const subjectKey = subject.get(key);
                  const valueKey = value.get(key);

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

                      let isInlineDiff = true;

                      output.omitSubject = subjectKey;
                      const subjectHasKey = subject.has(key);
                      const valueHasKey = value.has(key);

                      if (!valueHasKey) {
                        if (expect.flags.exhaustively) {
                          annotation.error('should be removed');
                        } else {
                          conflicting = null;
                        }
                      } else if (!subjectHasKey) {
                        if (expect.findTypeOf(valueKey).is('expect.it')) {
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
                      } else if (conflicting) {
                        const keyDiff =
                          conflicting && conflicting.getDiff({ output });
                        isInlineDiff = !keyDiff || keyDiff.inline;

                        if (keyDiff && keyDiff.inline) {
                          valueOutput = keyDiff;
                        } else if (
                          expect.findTypeOf(valueKey).is('expect.it')
                        ) {
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
                        if (!subjectHasKey) {
                          valueOutput = output.clone();
                        } else {
                          valueOutput = inspect(subjectKey);
                        }
                      }

                      const omitDelimiter = index >= subjectKeys.length - 1;

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

                      subjectType.property(this, key, valueOutput);
                    });
                });

                if (subjectType.indent) {
                  output.outdentLines();
                }
                const suffixOutput = subjectType.suffix(
                  output.clone(),
                  subject
                );
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
  name: 'unexpected-map',
  installInto: createUnexpectedMap
};
