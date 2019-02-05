var fc        = require('fast-check');
var expect    = require('chai').expect;
var stringify = require('./');

describe('javascript-stringify', function () {
  var test = function (input, result, indent, options) {
    return function () {
      expect(stringify(input, null, indent, options)).to.equal(result);
    };
  };

  var testRoundTrip = function (insult, indent, options) {
    return test(eval('(' + insult + ')'), insult, indent, options);
  };

  describe('types', function () {
    describe('booleans', function () {
      it('should be stringified', test(true, 'true'));
    });

    describe('strings', function () {
      it('should wrap in single quotes', test('string', "'string'"));

      it('should escape quote characters', test("'test'", "'\\'test\\''"));

      it(
        'should escape control characters',
        test('multi\nline', "'multi\\nline'")
      );

      it(
        'should escape back slashes',
        test('back\\slash', "'back\\\\slash'")
      );

      it(
        'should escape certain unicode sequences',
        test('\u0602', "'\\u0602'")
      );
    });

    describe('numbers', function () {
      it('should stringify integers', test(10, '10'));

      it('should stringify floats', test(10.5, '10.5'));

      it('should stringify "NaN"', test(10.5, '10.5'));

      it('should stringify "Infinity"', test(Infinity, 'Infinity'));

      it('should stringify "-Infinity"', test(-Infinity, '-Infinity'));

      it('should stringify "-0"', test(-0, '-0'));
    });

    describe('arrays', function () {
      it('should stringify as array shorthand', test([1, 2, 3], '[1,2,3]'));

      it('should indent elements', test([{ x: 10 }], '[\n\t{\n\t\tx: 10\n\t}\n]', '\t'))
    });

    describe('objects', function () {
      it(
        'should stringify as object shorthand',
        test({ key: 'value', '-': 10 }, "{key:'value','-':10}")
      );

      it(
        'should stringify undefined keys',
        test({ a: true, b: undefined }, "{a:true,b:undefined}")
      );

      it(
        'should stringify omit undefined keys',
        test({ a: true, b: undefined }, "{a:true}", null, { skipUndefinedProperties: true })
      );

      it(
        'should quote reserved word keys',
        test({ "if": true, "else": false }, "{'if':true,'else':false}")
      );

      it(
        'should not quote Object.prototype keys',
        test({ "constructor": 1, "toString": 2 }, "{constructor:1,toString:2}")
      );
    });

    describe('functions', function () {
      it(
        'should reindent function bodies',
        test(
          function () {
            if (true) {
              return "hello";
            }
          },
          'function () {\n  if (true) {\n    return "hello";\n  }\n}',
          2
        )
      );

      it(
        'should reindent function bodies in objects',
        test(
          {
            fn: function () {
              if (true) {
                return "hello";
              }
            }
          },
          '{\n  fn: function () {\n    if (true) {\n      return "hello";\n    }\n  }\n}',
          2
        )
      );

      it(
        'should reindent function bodies in arrays',
        test(
          [
            function () {
              if (true) {
                return "hello";
              }
            }
          ],
          '[\n  function () {\n    if (true) {\n      return "hello";\n    }\n  }\n]',
          2
        )
      );

      it(
        'should not need to reindent one-liners',
        testRoundTrip('{\n  fn: function () { return; }\n}', 2)
      );
    });

    describe('native instances', function () {
      describe('Date', function () {
        var date = new Date();

        it('should stringify', test(date, 'new Date(' + date.getTime() + ')'));
      });

      describe('RegExp', function () {
        it('should stringify as shorthand', test(/[abc]/gi, '/[abc]/gi'));
      });

      describe('Number', function () {
        it('should stringify', test(new Number(10), 'new Number(10)'));
      });

      describe('String', function () {
        it('should stringify', test(new String('abc'), "new String('abc')"));
      });

      describe('Boolean', function () {
        it('should stringify', test(new Boolean(true), 'new Boolean(true)'));
      });

      describe('Buffer', function () {
        it('should stringify', test(new Buffer('test'), "new Buffer('test')"));
      });

      describe('Error', function () {
        it('should stringify', test(new Error('test'), "new Error('test')"));
      });

      describe('unknown native type', function () {
        it('should be omitted', test({ k: process }, '{}'));
      });
    });

    describe('ES6', function () {
      if (typeof Array.from === 'function') {
        if (typeof Map !== 'undefined') {
          describe('Map', function () {
            it('should stringify', test(new Map([['key', 'value']]), "new Map([['key','value']])"));
          });
        }
        if (typeof Set !== 'undefined') {
          describe('Set', function () {
            it('should stringify', test(new Set(['key', 'value']), "new Set(['key','value'])"));
          });
        }

        describe('arrow functions', function () {
          it('should stringify', testRoundTrip('(a, b) => a + b'));

          it(
            'should reindent function bodies',
            test(
              eval(
'               (() => {\n' +
'                 if (true) {\n' +
'                   return "hello";\n' +
'                 }\n' +
'               })'),
              '() => {\n  if (true) {\n    return "hello";\n  }\n}',
              2
            )
          );
        });

        describe('generators', function () {
          it('should stringify', testRoundTrip('function* (x) { yield x; }'));
        });

        describe('method notation', function () {
          it('should stringify', testRoundTrip('{a(b, c) { return b + c; }}'));

          it('should stringify generator methods', testRoundTrip('{*a(b) { yield b; }}'));

          it(
            'should not be fooled by tricky names',
            testRoundTrip("{'function a'(b, c) { return b + c; }}")
          );

          it(
            'should not be fooled by tricky generator names',
            testRoundTrip("{*'function a'(b, c) { return b + c; }}")
          );

          it(
            'should not be fooled by empty names',
            testRoundTrip("{''(b, c) { return b + c; }}")
          );

          it(
            'should not be fooled by arrow functions',
            testRoundTrip("{a:(b, c) => b + c}")
          );

          it(
            'should not be fooled by no-parentheses arrow functions',
            testRoundTrip("{a:a => a + 1}")
          );

          it('should stringify extracted methods', function () {
            var fn = eval('({ foo(x) { return x + 1; } })').foo;
            expect(stringify(fn)).to.equal('function foo(x) { return x + 1; }');
          });

          it('should stringify extracted generators', function () {
            var fn = eval('({ *foo(x) { yield x; } })').foo;
            expect(stringify(fn)).to.equal('function* foo(x) { yield x; }');
          });

          // It's difficult to disambiguate between this and the arrow function case. Since the latter is probably
          // much more common than this pattern (who creates empty-named methods ever?), we don't even try. But this
          // test is here as documentation of a known limitation of this feature.
          it.skip('should stringify extracted methods with empty names', function () {
            var fn = eval('({ ""(x) { return x + 1; } })')[''];
            expect(stringify(fn)).to.equal('function (x) { return x + 1; }');
          });

          it('should handle transplanted names', function () {
            var fn = eval('({ foo(x) { return x + 1; } })').foo;
            expect(stringify({ bar: fn })).to.equal('{bar:function foo(x) { return x + 1; }}');
          });

          it('should handle transplanted names with generators', function () {
            var fn = eval('({ *foo(x) { yield x; } })').foo;
            expect(stringify({ bar: fn })).to.equal('{bar:function* foo(x) { yield x; }}');
          });

          it(
            'should reindent methods',
            test(
              eval(
'               ({\n' +
'                 fn() {\n' +
'                   if (true) {\n' +
'                     return "hello";\n' +
'                   }\n' +
'                 }\n' +
'               })'),
              '{\n  fn() {\n    if (true) {\n      return "hello";\n    }\n  }\n}',
              2
            )
          );
        });
      }
    });

    describe('global', function () {
      it('should access the global in the current environment', function () {
        expect(eval(stringify(global))).to.equal(global);
      });
    });
  });

  describe('circular references', function () {
    it('should omit circular references', function () {
      var obj = { key: 'value' };
      obj.obj = obj;

      var result = stringify(obj)

      expect(result).to.equal("{key:'value'}");
    });

    it('should restore value', function () {
      var obj = { key: 'value' };
      obj.obj = obj;

      var result = stringify(obj, null, null, { references: true })

      expect(result).to.equal("(function(){var x={key:'value'};x.obj=x;return x;}())");
    });

    it('should omit array value', function () {
      var obj = [1, 2, 3];
      obj.push(obj);

      var result = stringify(obj)

      expect(result).to.equal('[1,2,3,undefined]');
    });

    it('should restore array value', function () {
      var obj = [1, 2, 3];
      obj.push(obj);

      var result = stringify(obj, null, null, { references: true })

      expect(result).to.equal('(function(){var x=[1,2,3,undefined];x[3]=x;return x;}())');
    });

    it('should print repeated values when no references enabled', function () {
      var obj = {}
      var child = {};

      obj.a = child;
      obj.b = child;

      var result = stringify(obj)

      expect(result).to.equal('{a:{},b:{}}');
    });

    it('should restore repeated values', function () {
      var obj = {}
      var child = {};

      obj.a = child;
      obj.b = child;

      var result = stringify(obj, null, null, { references: true })

      expect(result).to.equal('(function(){var x={a:{}};x.b=x.a;return x;}())');
    });

    it('should restore repeated values with indentation', function () {
      var obj = {}
      var child = {};

      obj.a = child;
      obj.b = child;

      var result = stringify(obj, null, 2, { references: true })

      expect(result).to.equal('(function () {\nvar x = {\n  a: {}\n};\nx.b = x.a;\nreturn x;\n}())');
    });
  });

  describe('custom spaces', function () {
    it('string', function () {
      var string = stringify({
        test: [1, 2, 3],
        nested: {
          key: 'value'
        }
      }, null, '\t');

      expect(string).to.equal(
        '{\n' +
        '\ttest: [\n\t\t1,\n\t\t2,\n\t\t3\n\t],\n' +
        '\tnested: {\n\t\tkey: \'value\'\n\t}\n' +
        '}'
      );
    });

    it('integer', function () {
      var string = stringify({
        test: [1, 2, 3],
        nested: {
          key: 'value'
        }
      }, null, 2);

      expect(string).to.equal(
        '{\n' +
        '  test: [\n    1,\n    2,\n    3\n  ],\n' +
        '  nested: {\n    key: \'value\'\n  }\n' +
        '}'
      );
    });

    it('float', function () {
      var string = stringify({
        test: [1, 2, 3],
        nested: {
          key: 'value'
        }
      }, null, 2.6);

      expect(string).to.equal(
        '{\n' +
        '  test: [\n    1,\n    2,\n    3\n  ],\n' +
        '  nested: {\n    key: \'value\'\n  }\n' +
        '}'
      );
    });

    it('invalid', function () {
      var string = stringify({
        test: [1, 2, 3],
        nested: {
          key: 'value'
        }
      }, null, -1);

      expect(string).to.equal("{test:[1,2,3],nested:{key:'value'}}");
    });
  });

  describe('replacer function', function () {
    it('should allow custom replacements', function () {
      var called = 0;
      var string = stringify({
        test: 'value'
      }, function (value, indent, stringify) {
        called++;

        if (typeof value === 'string') {
          return '"hello"';
        }

        return stringify(value);
      });

      expect(called).to.equal(2);
      expect(string).to.equal('{test:"hello"}');
    });

    it('change primitive to object', function () {
      var string = stringify({
        test: 10
      }, function (value, indent, stringify) {
        if (typeof value === 'number') {
          return stringify({ obj: 'value' });
        }

        return stringify(value);
      });

      expect(string).to.equal("{test:{obj:'value'}}");
    });

    it('change object to primitive', function () {
      var string = stringify({
        test: 10
      }, function (value, indent, stringify) {
        return Object.prototype.toString.call(value);
      });

      expect(string).to.equal('[object Object]');
    });
  });

  describe('max depth', function () {
    var obj = { a: { b: { c: 1 } } };

    it('should get all object', test(obj, '{a:{b:{c:1}}}'));

    it(
      'should get part of the object',
      test(obj, '{a:{b:{}}}', null, { maxDepth: 2 })
    );

    it(
      'should get part of the object when tracking references',
      test(obj, '{a:{b:{}}}', null, { maxDepth: 2, references: true })
    );
  });

  describe('property based', function () {
    var customEval = function (repr) {
      return Function("return " + repr)();
    };

    it('should produce string evaluating to the original value', function () {
      fc.assert(
        fc.property(
          fc.anything(),
          function (originalValue) {
            var newValue = customEval(stringify(originalValue));
            expect(newValue).to.deep.equal(originalValue);
          }
        )
      )
    });
  });
});
