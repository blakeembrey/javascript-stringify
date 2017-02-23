var expect    = require('chai').expect;
var stringify = require('./');

describe('javascript-stringify', function () {
  var test = function (input, result, indent, options) {
    return function () {
      expect(stringify(input, null, indent, options)).to.equal(result);
    };
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
  });
});
