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
        drawPrefix: '[',
        drawSuffix: ']',
        propertyStyle: 'propertyForMap',
        delimiter: function (output, i, length) {
            if (i < length - 1) {
                output.text('],');
            } else {
                output.text(']');
            }
            return output;
        },
        equal: function (a, b, equal) {
            if (a === b) {
                return true;
            }

            if (b.constructor !== a.constructor) {
                return false;
            }

            var actualKeys = this.getKeys(a);
            var expectedKeys = this.getKeys(b);

            // having the same number of owned properties
            if (actualKeys.length !== expectedKeys.length) {
                return false;
            }

            // the same set of keys (although not necessarily the same order),
            actualKeys.sort(this.keyComparator);
            expectedKeys.sort(this.keyComparator);

            // cheap key test
            for (var i = 0; i < actualKeys.length; i += 1) {
                if (actualKeys[i] !== expectedKeys[i]) {
                    return false;
                }
            }

            // equivalent values for every corresponding key, and
            // possibly expensive deep test
            for (var j = 0, key; j < actualKeys.length; j += 1) {
                key = actualKeys[j];
                if (!equal(a.get(key), b.get(key))) {
                    return false;
                }
            }
            return true;
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
        valueForKey: function (obj, key) {
            return obj.get(key);
        }
    });
}

module.exports = {
    installInto: createUnexpectedMap
};
