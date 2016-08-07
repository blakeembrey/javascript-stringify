(function (root, stringify) {
  /* istanbul ignore else */
  if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
    // Node.
    module.exports = stringify();
  } else if (typeof define === 'function' && define.amd) {
    // AMD, registers as an anonymous module.
    define(function () {
      return stringify();
    });
  } else {
    // Browser global.
    root.javascriptStringify = stringify();
  }
})(this, function () {
  /**
   * Match all characters that need to be escaped in a string. Modified from
   * source to match single quotes instead of double.
   *
   * Source: https://github.com/douglascrockford/JSON-js/blob/master/json2.js
   *
   * @type {RegExp}
   */
  var ESCAPABLE = /[\\\'\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

  /**
   * Map of characters to escape characters.
   *
   * @type {Object}
   */
  var META_CHARS = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    "'":  "\\'",
    '"':  '\\"',
    '\\': '\\\\'
  };

  /**
   * Escape any character into its literal JavaScript string.
   *
   * @param  {String} char
   * @return {String}
   */
  var escapeChar = function (char) {
    var meta = META_CHARS[char];

    return meta || '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
  };

  /**
   * JavaScript reserved word list.
   */
  var RESERVED_WORDS = {};

  /**
   * Map reserved words to the object.
   */
  (
    'break else new var case finally return void catch for switch while ' +
    'continue function this with default if throw delete in try ' +
    'do instanceof typeof abstract enum int short boolean export ' +
    'interface static byte extends long super char final native synchronized ' +
    'class float package throws const goto private transient debugger ' +
    'implements protected volatile double import public let yield'
  ).split(' ').map(function (key) {
    RESERVED_WORDS[key] = true;
  });

  /**
   * Check if a variable name is valid.
   *
   * @param  {String}  name
   * @return {Boolean}
   */
  var isValidVariableName = function (name) {
    return !RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
  };

  /**
   * Return the global variable name.
   *
   * @return {String}
   */
  var toGlobalVariable = function (value, indent, stringify) {
    return 'Function(' + stringify('return this;') + ')()';
  };

  /**
   * Convert JavaScript objects into strings.
   *
   * @type {Object}
   */
  var OBJECT_TYPES = {
    '[object Array]': function (array, indent, stringify) {
      // Map array values to their stringified values with correct indentation.
      var values = array.map(function (value) {
        var str = stringify(value);

        if (str === undefined) {
          return String(str)
        }

        return indent + str.split('\n').join('\n' + indent);
      }).join(indent ? ',\n' : ',');

      // Wrap the array in newlines if we have indentation set.
      if (indent && values) {
        return '[\n' + values + '\n]';
      }

      return '[' + values + ']';
    },
    '[object Object]': function (object, indent, stringify) {
      if (typeof Buffer === 'function' && Buffer.isBuffer(object)) {
        return 'new Buffer(' + stringify(object.toString()) + ')';
      }

      // Iterate over object keys and concat string together.
      var values = Object.keys(object).reduce(function (values, key) {
        var value = stringify(object[key]);

        // Omit `undefined` object values.
        if (value === undefined) {
          return values;
        }

        // String format the key and value data.
        key   = isValidVariableName(key) ? key : stringify(key);
        value = String(value).split('\n').join('\n' + indent);

        // Push the current object key and value into the values array.
        values.push(indent + key + ':' + (indent ? ' ' : '') + value);

        return values;
      }, []).join(indent ? ',\n' : ',');

      // Wrap the object in newlines if we have indentation set.
      if (indent && values) {
        return '{\n' + values + '\n}';
      }

      return '{' + values + '}';
    },
    '[object Date]': function (date) {
      return 'new Date(' + date.getTime() + ')';
    },
    '[object String]': function (string) {
      return 'new String(' + stringify(string.toString()) + ')';
    },
    '[object Number]': function (number) {
      return 'new Number(' + number + ')';
    },
    '[object Boolean]': function (boolean) {
      return 'new Boolean(' + boolean + ')';
    },
    '[object Uint8Array]': function (array, indent) {
      if (typeof Buffer === 'function' && Buffer.isBuffer(array)) {
        return 'new Buffer(' + stringify(array.toString()) + ')';
      }

      if (indent) {
        var str = '';

        for (var i = 0; i < array.length; i++) {
          str += indent + array[i] + ',\n'
        }

        return 'new Uint8Array([\n' + str + '\n])'
      }

      return 'new Uint8Array([' + array.join(indent ? ',\n' : ',') + '])'
    },
    '[object RegExp]': String,
    '[object Function]': String,
    '[object global]': toGlobalVariable,
    '[object Window]': toGlobalVariable
  };

  /**
   * Convert JavaScript primitives into strings.
   *
   * @type {Object}
   */
  var PRIMITIVE_TYPES = {
    'string': function (string) {
      return "'" + string.replace(ESCAPABLE, escapeChar) + "'";
    },
    'number': String,
    'object': String,
    'boolean': String,
    'symbol': String,
    'undefined': String
  };

  /**
   * Convert any value to a string.
   *
   * @param  {*}        value
   * @param  {String}   indent
   * @param  {Function} stringify
   * @return {String}
   */
  var stringify = function (value, indent, stringify) {
    // Convert primitives into strings.
    if (Object(value) !== value) {
      return PRIMITIVE_TYPES[typeof value](value, indent, stringify);
    }

    // Use the internal object string to select stringification method.
    var toString = OBJECT_TYPES[Object.prototype.toString.call(value)];

    // Convert objects into strings.
    return toString && toString(value, indent, stringify);
  };

  /**
   * Stringify an object into the literal string.
   *
   * @param  {Object}          value
   * @param  {Function}        [replacer]
   * @param  {(Number|String)} [space]
   * @param  {Object} [options]
   * @return {String}
   */
  return function (value, replacer, space, options) {
    options = options || {}

    // Convert the spaces into a string.
    if (typeof space !== 'string') {
      space = new Array(Math.max(0, space|0) + 1).join(' ');
    }

    var maxDepth = options.maxDepth || 200;

    var depth = 0;
    var cache = [];

    /**
     * Handle recursion by checking if we've visited this node every iteration.
     *
     * @param  {*}      value
     * @return {String}
     */
    var recurse = function (value, next) {
      // If we've already visited this node before, break the recursion.
      if (cache.indexOf(value) > -1 || depth > maxDepth) {
        return;
      }

      // Push the value into the values cache to avoid an infinite loop.
      depth++;
      cache.push(value);

      // Stringify the value and fallback to
      return next(value, space, function (value) {
        var result = recurse(value, next);

        depth--;
        cache.pop();

        return result;
      });
    };

    // If the user defined a replacer function, make the recursion function
    // a double step process - `replacer -> stringify -> replacer -> etc`.
    if (typeof replacer === 'function') {
      return recurse(value, function (value, space, next) {
        return replacer(value, space, function (value) {
          return stringify(value, space, next);
        });
      });
    }

    return recurse(value, stringify);
  };
});
