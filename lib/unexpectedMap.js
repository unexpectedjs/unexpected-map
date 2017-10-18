function retrieveMapValues(theMap) {
    var values = [];
    theMap.forEach(function (value) {
        values.push(value);
    });
    return values;
}

function createUnexpectedMap(expect) {
    expect.addStyle('propertyForMap', function (key, inspectedValue) {
        this.text('[').appendInspected(key).text(',').sp().append(inspectedValue);
    });

    expect.addType({
        name: 'Map',
        base: 'object',
        identify: function (obj) {
            return Object.prototype.toString.call(obj) === '[object Map]';
        },
        prefix: function (output, obj) {
            return output.text('Map([');
        },
        property: function (output, key, inspectedValue) {
            return output.propertyForMap(key, inspectedValue);
        },
        suffix: function (output, obj) {
            return output.text('])');
        },
        delimiter: function (output, i, length) {
            if (i < length - 1) {
                output.text('],');
            } else {
                output.text(']');
            }
            return output;
        },
        getKeys: Object.getOwnPropertySymbols ? function (obj) {
            var keys = this.retrieveKeys(obj);
            var symbols = Object.getOwnPropertySymbols(obj);
            if (symbols.length > 0) {
                return keys.concat(symbols);
            } else {
                return keys;
            }
        } : function (obj) {
            return this.retrieveKeys(obj);
        },
        retrieveKeys: function (obj) {
            var keys = [];
            obj.forEach(function (value, key) {
                keys.push(key);
            });
            return keys;
        },
        uniqueKeys: function uniqueKeysAndSymbols() { // [filterFn], item1, item2...
            var filterFn;
            if (typeof arguments[0] === 'function') {
                filterFn = arguments[0];
            }
            var index = {};
            var uniqueKeysAndSymbols = [];

            function visit(item) {
                if (!Object.prototype.hasOwnProperty.call(index, item) && (!filterFn || filterFn(item))) {
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

            for (var i = filterFn ? 1 : 0 ; i < arguments.length ; i += 1) {
                visitAndRecurse(arguments[i]);
            }

            return uniqueKeysAndSymbols;
        },
        valueForKey: function (obj, key) {
            return obj.get(key);
        }
    });

    expect.addAssertion('<Map> to [exhaustively] satisfy <Map>', function (expect, subject, value) {
        var valueType = expect.argTypes[0];
        var subjectType = expect.subjectType;
        var subjectIsArrayLike = subjectType.is('array-like');
        if (subject === value) {
            return;
        }
        if (valueType.is('array-like') && !subjectIsArrayLike) {
            expect.fail();
        }

        var subjectIsMap = subjectType.is('Map');
        var valueIsMap = subjectType.is('Map');

        var promiseByKey = new Map();
        var keys = valueType.getKeys(value);
        var subjectKeys = subjectType.getKeys(subject);

        if (!subjectIsArrayLike) {
            // Find all non-enumerable subject keys present in value, but not returned by subjectType.getKeys:
            keys.forEach(function (key) {
                if (Object.prototype.hasOwnProperty.call(subject, key) && subjectKeys.indexOf(key) === -1) {
                    subjectKeys.push(key);
                }
            });
        }

        keys.forEach(function (key, index) {
            promiseByKey.set(key, expect.promise(function () {
                var subjectKey = subjectIsMap ? subject.get(key) : subject[key];
                var valueKey = valueIsMap ? value.get(key) : value[key];
                var valueKeyType = expect.findTypeOf(valueKey);
                if (valueKeyType.is('expect.it')) {
                    expect.context.thisObject = subject;
                    return valueKey(subjectKey, expect.context);
                } else if (valueKeyType.is('function')) {
                    return valueKey(subjectKey);
                } else {
                    return expect(subjectKey, 'to [exhaustively] satisfy', valueKey);
                }
            }));
        });

        // unpack the promiseByKay Map back to values for unexpected-bluebird
        const promisesInFlight = retrieveMapValues(promiseByKey);

        return expect.promise.all([
            expect.promise(function () {
                if (expect.flags.exhaustively) {
                    var nonOwnKeysWithDefinedValues = keys.filter(function (key) {
                        return !Object.prototype.hasOwnProperty.call(subject, key) && typeof subject[key] !== 'undefined';
                    });
                    var valueKeysWithDefinedValues = keys.filter(function (key) {
                        var valueKey = valueIsMap ? value.get(key) : value[key];
                        return typeof valueKey !== 'undefined';
                    });
                    var subjectKeysWithDefinedValues = subjectKeys.filter(function (key) {
                        var subjectKey = subjectIsMap ? subject.get(key) : subject[key];
                        return typeof subjectKey !== 'undefined';
                    });
                    expect(valueKeysWithDefinedValues.length - nonOwnKeysWithDefinedValues.length, 'to equal', subjectKeysWithDefinedValues.length);
                }
            }),
            expect.promise.all(promisesInFlight)
        ]).caught(function () {
            return expect.promise.settle(promisesInFlight).then(function () {
                expect.fail({
                    diff: function (output, diff, inspect, equal) {
                        output.inline = true;
                        var subjectIsArrayLike = subjectType.is('array-like');
                        var valueKeys = valueType.getKeys(value);
                        var uniqueKeys = subjectType.uniqueKeys(subjectKeys, valueKeys).filter(function (key) {
                            var valueKey = valueIsMap ? value.get(key) : value[key];
                            var subjectHasKey = subjectIsMap ? subject.has(key) : (key in subject);
                            // Skip missing keys expected to be missing so they don't get rendered in the diff
                            return subjectHasKey || typeof valueKey !== 'undefined';
                        });
                        var prefixOutput = subjectType.prefix(output.clone(), subject);
                        output
                            .append(prefixOutput)
                            .nl(prefixOutput.isEmpty() ? 0 : 1);

                        if (subjectType.indent) {
                            output.indentLines();
                        }
                        uniqueKeys.forEach(function (key, index) {
                            var subjectKey = subjectIsMap ? subject.get(key) : subject[key];
                            var valueKey = valueIsMap ? value.get(key) : value[key];

                            output.nl(index > 0 ? 1 : 0).i().block(function () {
                                var valueOutput;
                                var annotation = output.clone();
                                var conflicting;

                                if (promiseByKey.has(key) && promiseByKey.get(key).isRejected()) {
                                    conflicting = promiseByKey.get(key).reason();
                                }

                                var missingArrayIndex = subjectType.is('array-like') && !(key in subject);

                                var isInlineDiff = true;

                                output.omitSubject = subjectKey;
                                var subjectHasKey = subjectIsMap ? subject.has(key) : (key in subject);
                                var valueHasKey = valueIsMap ? value.has(key) : (key in value);

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
                                            valueOutput = output.clone().appendErrorMessage(promiseByKey.get(key).reason());
                                        } else {
                                            output.error('// missing').sp();
                                            valueOutput = output.clone().error('should satisfy').sp().block(inspect(valueKey));
                                        }
                                    } else {
                                        output.error('// missing').sp();
                                        valueOutput = inspect(valueKey);
                                    }
                                } else if (conflicting || missingArrayIndex) {
                                    var keyDiff = conflicting && conflicting.getDiff({ output: output });
                                    isInlineDiff = !keyDiff || keyDiff.inline ;
                                    if (missingArrayIndex) {
                                        output.error('// missing').sp();
                                    }
                                    if (keyDiff && keyDiff.inline) {
                                        valueOutput = keyDiff;
                                    } else if (typeof valueKey === 'function') {
                                        isInlineDiff = false;
                                        annotation.appendErrorMessage(conflicting);
                                    } else if (!keyDiff || (keyDiff && !keyDiff.inline)) {
                                        annotation.error((conflicting && conflicting.getLabel()) || 'should satisfy').sp()
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

                                var omitDelimiter =
                                    missingArrayIndex ||
                                    index >= subjectKeys.length - 1;

                                if (!omitDelimiter || subjectType.is('Map')) {
                                    valueOutput.amend(subjectType.delimiter(output.clone(), index, uniqueKeys.length));
                                }

                                var annotationOnNextLine = !isInlineDiff &&
                                    output.preferredWidth < this.size().width + valueOutput.size().width + annotation.size().width;

                                if (!annotation.isEmpty()) {
                                    if (!valueOutput.isEmpty()) {
                                        if (annotationOnNextLine) {
                                            valueOutput.nl();
                                        } else {
                                            valueOutput.sp();
                                        }
                                    }

                                    valueOutput.annotationBlock(function () {
                                        this.append(annotation);
                                    });
                                }

                                if (!isInlineDiff) {
                                    valueOutput = output.clone().block(valueOutput);
                                }

                                subjectType.property(this, key, valueOutput, subjectIsArrayLike);
                            });
                        });

                        if (subjectType.indent) {
                            output.outdentLines();
                        }
                        var suffixOutput = subjectType.suffix(output.clone(), subject);
                        return output
                            .nl(suffixOutput.isEmpty() ? 0 : 1)
                            .append(suffixOutput);
                    }
                });
            });
        });
    });
}

module.exports = {
    installInto: createUnexpectedMap
};
