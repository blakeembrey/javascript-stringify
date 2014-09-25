var expect    = require('chai').expect;
var stringify = require('./');

describe('javascript-stringify', function () {
  describe('types', function () {
    var test = function (type, string) {
      return function () {
        expect(stringify(type)).to.equal(string);
      };
    };

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
    });

    describe('objects', function () {
      it(
        'should stringify as object shorthand',
        test({ key: 'value', '-': 10 }, "{key:'value','-':10}")
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

    describe('global', function () {
      it('should access the global in the current environment', function () {
        expect(eval(stringify(global))).to.equal(global);
      });
    });
  });

  describe('circular references', function () {
    it('should omit value', function () {
      var obj = { key: 'value' };
      obj.obj = obj;

      expect(stringify(obj)).to.equal("{key:'value'}");
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
      var string = stringify({
        test: 'value'
      }, function (value, indent, stringify) {
        if (typeof value === 'string') {
          return '"hello"';
        }

        return stringify(value);
      });

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
});
