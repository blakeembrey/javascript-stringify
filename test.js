var expect    = require('chai').expect;
var stringify = require('./');

describe('javascript-stringify', function () {
  describe('types', function () {
    var test = function (type, string) {
      return function () {
        expect(stringify(type)).to.equal(string);
      };
    };

    it('string', test('string', '\'string\''));
    it('boolean', test(true, 'true'));
    it('number', test(10, '10'));
    it('array', test([1, 2, 3], '[1,2,3]'));
    it('object', test({ key: 'value', '-': 10 }, '{key:\'value\',\'-\':10}'));

    it('NaN', test(NaN, 'NaN'));
    it('Infinity', test(Infinity, 'Infinity'));
    it('-Infinity', test(-Infinity, '-Infinity'));
    it('Date', test(new Date(), 'new Date(' + Date.now() + ')'));
    it('RegExp', test(/[abc]/gi, '/[abc]/gi'));
    it('Number', test(new Number(10), 'new Number(10)'));
    it('String', test(new String('abc'), 'new String(\'abc\')'));
    it('Boolean', test(new Boolean(true), 'new Boolean(true)'));

    it('global', function () {
      expect(eval(stringify(global))).to.equal(global);
    });
  });

  describe('circular references', function () {
    it('should omit value', function () {
      var obj = { key: 'value' };
      obj.obj = obj;

      expect(stringify(obj)).to.equal('{key:\'value\'}');
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

      expect(string).to.equal('{test:[1,2,3],nested:{key:\'value\'}}');
    });
  });

  describe('replacer function', function () {
    it('should allow custom replacements', function () {
      var string = stringify({
        test: 'value'
      }, function (value, indent, stringify) {
        if (typeof value === 'string') {
          return '\'hello\'';
        }

        return stringify(value);
      });

      expect(string).to.equal('{test:\'hello\'}');
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

      expect(string).to.equal('{test:{obj:\'value\'}}');
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
