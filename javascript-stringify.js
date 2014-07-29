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
  var getGlobalVariable = function () {
    return 'global';
  };

  /* istanbul ignore next */
  if (typeof window === 'object' && typeof window.document === 'object') {
    // Support browser environments.
    getGlobalVariable = function () {
      return 'window';
    };
  }

  /* istanbul ignore next */
  if (typeof self === 'object' && typeof self.importScripts === 'function') {
    // Support web worker environments.
    getGlobalVariable = function () {
      return 'self';
    };
  }

  /**
   * Convert JavaScript objects into strings.
   *
   * @type {Object}
   */
  var OBJECT_TYPES = {
    '[object Array]': function (array, indent, stringify) {
      // Map array values to their stringified values with correct indentation.
      var values = array.map(function (value) {
        return indent + stringify(value).split('\n').join('\n' + indent);
      }).join(indent ? ',\n' : ',');

      // Wrap the array in newlines if we have indentation set.
      if (indent && values) {
        return '[\n' + values + '\n]';
      }

      return '[' + values + ']';
    },
    '[object Object]': function (object, indent, stringify) {
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
    '[object Date]': function (date, indent, stringify) {
      return 'new Date(' + date.getTime() + ')';
    },
    '[object String]': function (string, indent, stringify) {
      return 'new String(' + stringify(string.toString()) + ')';
    },
    '[object Number]': function (number, indent, stringify) {
      return 'new Number(' + number + ')';
    },
    '[object Boolean]': function (boolean, indent, stringify) {
      return 'new Boolean(' + boolean + ')';
    },
    '[object RegExp]': String,
    '[object Function]': String,
    '[object global]': getGlobalVariable,
    '[object Window]': getGlobalVariable
  };

  /**
   * Convert JavaScript primitives into strings.
   *
   * @type {Object}
   */
  var PRIMITIVE_TYPES = {
    'string': function (string) {
      return '\'' + string.replace('\'', '\\\'') + '\'';
    },
    'number': String,
    'object': String,
    'boolean': String,
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
   * @return {String}
   */
  return function (value, replacer, space) {
    // Convert the spaces into a string.
    if (typeof space !== 'string') {
      space = new Array(Math.max(0, space|0) + 1).join(' ');
    }

    /**
     * Handle recursion by checking if we've visited this node every iteration.
     *
     * @param  {*}      value
     * @param  {Array}  cache
     * @return {String}
     */
    var recurse = function (value, cache, next) {
      // If we've already visited this node before, break the recursion.
      if (cache.indexOf(value) > -1) {
        return;
      }

      // Push the value into the values cache to avoid an infinite loop.
      cache.push(value);

      // Stringify the value and fallback to
      return next(value, space, function (value) {
        return recurse(value, cache.slice(), next);
      });
    };

    // If the user defined a replacer function, make the recursion function
    // a double step process - `replacer -> stringify -> replacer -> etc`.
    if (typeof replacer === 'function') {
      return recurse(value, [], function (value, space, next) {
        return replacer(value, space, function (value) {
          return stringify(value, space, next);
        });
      });
    }

    return recurse(value, [], stringify);
  };
});
