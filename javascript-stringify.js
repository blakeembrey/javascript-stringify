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
   */
  var ESCAPABLE = /[\\\'\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

  /**
   * Map of characters to escape characters.
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
   * @param  {string} char
   * @return {string}
   */
  function escapeChar (char) {
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
   * Test for valid JavaScript identifier.
   */
  var IS_VALID_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  /**
   * Used in function stringification.
   */
  /* istanbul ignore next */
  var METHOD_NAMES_ARE_QUOTED = ({' '(){}})[' '].toString()[0] === "'";

  /**
   * Check if a variable name is valid.
   *
   * @param  {string}  name
   * @return {boolean}
   */
  function isValidVariableName (name) {
    return !RESERVED_WORDS.hasOwnProperty(name) && IS_VALID_IDENTIFIER.test(name);
  }

  /**
   * Can be replaced with `str.repeat(count)` if code is updated to ES6.
   *
   * @param  {string} str
   * @param  {number} count
   * @return {string}
   */
  function stringRepeat (str, count) {
    return new Array(Math.max(0, count|0) + 1).join(str);
  }

  /**
   * Return the global variable name.
   *
   * @return {string}
   */
  function toGlobalVariable (value) {
    return 'Function(' + stringify('return this;') + ')()';
  }

  /**
   * Serialize the path to a string.
   *
   * @param  {Array}  path
   * @return {string}
   */
  function toPath (path) {
    var result = '';

    for (var i = 0; i < path.length; i++) {
      if (isValidVariableName(path[i])) {
        result += '.' + path[i];
      } else {
        result += '[' + stringify(path[i]) + ']';
      }
    }

    return result;
  }

  /**
   * Stringify an array of values.
   *
   * @param  {Array}    array
   * @param  {string}   indent
   * @param  {Function} next
   * @return {string}
   */
  function stringifyArray (array, indent, next) {
    // Map array values to their stringified values with correct indentation.
    var values = array.map(function (value, index) {
      var str = next(value, index);

      if (str === undefined) {
        return String(str);
      }

      return indent + str.split('\n').join('\n' + indent);
    }).join(indent ? ',\n' : ',');

    // Wrap the array in newlines if we have indentation set.
    if (indent && values) {
      return '[\n' + values + '\n]';
    }

    return '[' + values + ']';
  }

  /**
   * Stringify a map of values.
   *
   * @param  {Object}   object
   * @param  {string}   indent
   * @param  {Function} next
   * @return {string}
   */
  function stringifyObject (object, indent, next) {
    // Iterate over object keys and concat string together.
    var values = Object.keys(object).reduce(function (values, key) {
      var value;
      var addKey = true;

      if (typeof object[key] === 'function') {
        value = new FunctionParser().stringify(object[key], indent, key);
        // The above function adds the key to the function string; this enables
        // ES6 method notation to be used when appropriate.
        addKey = false;
      } else {
        value = next(object[key], key);
      }

      // Omit `undefined` object values.
      if (value === undefined) {
        return values;
      }

      // String format the value data.
      value = String(value).split('\n').join('\n' + indent);

      if (addKey) {
        // String format the key data.
        key = stringifyKey(key);

        // Push the current object key and value into the values array.
        values.push(indent + key + ':' + (indent ? ' ' : '') + value);
      } else {
        // Push just the value; this is a method and no key is needed.
        values.push(indent + value);
      }

      return values;
    }, []).join(indent ? ',\n' : ',');

    // Wrap the object in newlines if we have indentation set.
    if (indent && values) {
      return '{\n' + values + '\n}';
    }

    return '{' + values + '}';
  }

  /**
   * Rewrite a stringified function to remove initial indentation.
   *
   * @param  {string} fnString
   * @return {string}
   */
  function dedentFunction (fnString) {
    var indentationRegExp = /\n */g;
    var match;

    // Find the minimum amount of indentation used in the function body.
    var dedent = Infinity;
    while (match = indentationRegExp.exec(fnString)) {
      dedent = Math.min(dedent, match[0].length - 1);
    }

    if (isFinite(dedent)) {
      return fnString.split('\n' + stringRepeat(' ', dedent)).join('\n');
    } else {
      // Function is a one-liner and needs no adjustment.
      return fnString;
    }
  }

  /**
   * Stringify a function.
   *
   * @param  {Function} fn
   * @return {string}
   */
  function stringifyFunction (fn, indent) {
    return new FunctionParser().stringify(fn, indent);
  }

  function stringifyKey (key) {
    return isValidVariableName(key) ? key : stringify(key);
  }

  function FunctionParser () {}

  FunctionParser.prototype.stringify = function (fn, indent, key) {
    this.fnString = Function.prototype.toString.call(fn);
    this.fnType = fn.constructor.name;
    this.fnName = fn.name;
    this.key = key;

    var hasKey = key !== undefined;
    this.keyPrefix = hasKey ? stringifyKey(key) + (indent ? ': ' : ':') : '';

    // Methods with computed names will have empty function names in node 4, so
    // empty named functions should still be candidates.
    this.isMethodCandidate = hasKey && (this.fnName === '' || this.fnName === key);

    // These two properties are mutated while parsing the function.
    this.pos = 0;
    this.hadKeyword = false;

    var value = this.tryParse();
    if (!value) {
      // If we can't stringify this function, return a void expression; for
      // bonus help with debugging, include the function as a string literal.
      return this.keyPrefix + 'void ' + stringify(this.fnString);
    }
    if (indent) {
      value = dedentFunction(value);
    }
    return value;
  };

  FunctionParser.prototype.getPrefix = function () {
    return this.isMethodCandidate && !this.hadKeyword ?
      this.METHOD_PREFIXES[this.fnType] + stringifyKey(this.key) :
      this.keyPrefix + this.FUNCTION_PREFIXES[this.fnType];
  };

  FunctionParser.prototype.tryParse = function () {
    var offset, result;
    if (this.fnString[this.fnString.length - 1] !== '}') {
      // Must be an arrow function
      return this.keyPrefix + this.fnString;
    }

    if (this.fnName && (result = this.tryStrippingName())) {
      return result;
    }

    if (this.tryParsePrefixTokens()) {
      if (result = this.tryStrippingName()) {
        return result;
      }
      offset = this.pos;
      switch (this.consumeSyntax('WORDLIKE')) {
        case 'WORDLIKE':
          if (this.isMethodCandidate && !this.hadKeyword) {
            offset = this.pos;
          }
          // fallthrough
        case '()':
          if (this.fnString.substring(this.pos, this.pos + 2) === '=>') {
            return this.keyPrefix + this.fnString;
          }
          this.pos = offset;
          // fallthrough
        case '"':
        case "'":
        case '[]':
          return this.getPrefix() + this.fnString.substring(this.pos);
      }
    }
  }

  /**
   * Attempt to parse the function from the current position by first stripping
   * the function's name from the front. This is not a fool-proof method on all
   * JavaScript engines, but yields good results on Node.js 4 (and slightly
   * less good results on Node.js 6 and 8).
   */
  FunctionParser.prototype.tryStrippingName = function () {
    if (METHOD_NAMES_ARE_QUOTED) {
      // ... then this approach is unnecessary (and potentially yields false positives).
      return;
    }

    var start = this.pos;
    if (this.fnString.substring(this.pos, this.pos + this.fnName.length) === this.fnName) {
      this.pos += this.fnName.length;
      if (this.consumeSyntax() === '()' && this.consumeSyntax() === '{}' && this.pos === this.fnString.length) {
        // Don't include the function's name if it will be included in the
        // prefix, or if it's invalid as a name in a function expression.
        if (this.isMethodCandidate || !isValidVariableName(this.fnName)) {
          start += this.fnName.length;
        }
        return this.getPrefix() + this.fnString.substring(start);
      }
    }
    this.pos = start;
  }

  /**
   * Attempt to advance the parser past the keywords expected to be at the
   * start of this function's definition. This method sets `this.hadKeyword`
   * based on whether or not a `function` keyword is consumed.
   *
   * @return {boolean}
   */
  FunctionParser.prototype.tryParsePrefixTokens = function () {
    var posPrev = this.pos, token;
    this.hadKeyword = false;
    switch (this.fnType) {
      case 'AsyncFunction':
        if (this.consumeSyntax() !== 'async') {
          return false;
        }
        posPrev = this.pos;
        // fallthrough
      case 'Function':
        if (this.consumeSyntax() === 'function') {
          this.hadKeyword = true;
        } else {
          this.pos = posPrev;
        }
        return true;
      case 'AsyncGeneratorFunction':
        if (this.consumeSyntax() !== 'async') {
          return false;
        }
        // fallthrough
      case 'GeneratorFunction':
        token = this.consumeSyntax();
        if (token === 'function') {
          token = this.consumeSyntax();
          this.hadKeyword = true;
        }
        return token === '*';
    }
  }

  /**
   * Advance the parser past one element of JavaScript syntax. This could be a
   * matched pair of delimiters, like braces or parentheses, or an atomic unit
   * like a keyword, variable, or operator. Return a normalized string
   * representation of the element parsed--for example, returns '{}' for a
   * matched pair of braces. Comments and whitespace are skipped.
   *
   * (This isn't a full parser, so the token scanning logic used here is as
   * simple as it can be. As a consequence, some things that are one token in
   * JavaScript, like decimal number literals or most multicharacter operators
   * like '&&', are split into more than one token here. However, awareness of
   * some multicharacter sequences like '=>' is necessary, so we match the few
   * of them that we care about.)
   *
   * @param  {string} wordLikeToken Value to return in place of a word-like token, if one is detected.
   * @return {string}
   */
  FunctionParser.prototype.consumeSyntax = function (wordLikeToken) {
    var match = this.consumeRegExp(/^(?:([A-Za-z_0-9$\xA0-\uFFFF]+)|=>|\+\+|\-\-|.)/);
    if (!match) {
      return;
    }
    this.consumeWhitespace();
    if (match[1]) {
      return wordLikeToken || match[1];
    }
    var token = match[0];
    switch (token) {
      case '(': return this.consumeSyntaxUntil('(', ')');
      case '[': return this.consumeSyntaxUntil('[', ']');
      case '{': return this.consumeSyntaxUntil('{', '}');
      case '`': return this.consumeTemplate();
      case '"': return this.consumeRegExp(/^(?:[^\\"]|\\.)*"/, '"');
      case "'": return this.consumeRegExp(/^(?:[^\\']|\\.)*'/, "'");
    }
    return token;
  }

  FunctionParser.prototype.consumeSyntaxUntil = function (startToken, endToken) {
    var isRegExpAllowed = true;
    for (;;) {
      var token = this.consumeSyntax();
      if (token === endToken) {
        return startToken + endToken;
      }
      if (!token || token === ')' || token === ']' || token === '}') {
        return;
      }
      if (token === '/' && isRegExpAllowed && this.consumeRegExp(/^(?:\\.|[^\\\/\n[]|\[(?:\\.|[^\]])*\])+\/[a-z]*/)) {
        isRegExpAllowed = false;
        this.consumeWhitespace();
      } else {
        isRegExpAllowed = this.TOKENS_PRECEDING_REGEXPS.hasOwnProperty(token);
      }
    }
  }

  /**
   * Advance the parser past an arbitrary regular expression. Return `token`,
   * or the match object of the regexp.
   */
  FunctionParser.prototype.consumeRegExp = function (re, token) {
    var match = re.exec(this.fnString.substring(this.pos));
    if (!match) {
      return;
    }
    this.pos += match[0].length;
    if (token) {
      this.consumeWhitespace();
    }
    return token || match;
  }

  /**
   * Advance the parser past a template string.
   */
  FunctionParser.prototype.consumeTemplate = function () {
    for (;;) {
      var match = this.consumeRegExp(/^(?:[^`$\\]|\\.|\$(?!{))*/);
      if (this.fnString[this.pos] === '`') {
        this.pos++;
        this.consumeWhitespace();
        return '`';
      }
      if (this.fnString.substring(this.pos, this.pos + 2) === '${') {
        this.pos += 2;
        this.consumeWhitespace();
        if (this.consumeSyntaxUntil('{', '}')) {
          continue;
        }
      }
      return;
    }
  }

  /**
   * Advance the parser past any whitespace or comments.
   */
  FunctionParser.prototype.consumeWhitespace = function () {
    this.consumeRegExp(/^(?:\s|\/\/.*|\/\*[^]*?\*\/)*/);
  }

  FunctionParser.prototype.FUNCTION_PREFIXES = {
    Function: 'function ',
    GeneratorFunction: 'function* ',
    AsyncFunction: 'async function ',
    AsyncGeneratorFunction: 'async function* ',
  };

  FunctionParser.prototype.METHOD_PREFIXES = {
    Function: '',
    GeneratorFunction: '*',
    AsyncFunction: 'async ',
    AsyncGeneratorFunction: 'async *',
  };

  FunctionParser.prototype.TOKENS_PRECEDING_REGEXPS = {};

  (
    'case delete else in instanceof new return throw typeof void ' +
    ', ; : + - ! ~ & | ^ * / % < > ? ='
  ).split(' ').map(function (token) {
    FunctionParser.prototype.TOKENS_PRECEDING_REGEXPS[token] = true;
  });


  /**
   * Convert JavaScript objects into strings.
   */
  var OBJECT_TYPES = {
    '[object Array]': stringifyArray,
    '[object Object]': stringifyObject,
    '[object Error]': function (error) {
      return 'new Error(' + stringify(error.message) + ')';
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
    '[object Set]': function (array, indent, next) {
      return 'new Set(' + stringify(Array.from(array), indent, next) + ')';
    },
    '[object Map]': function (array, indent, next) {
      return 'new Map(' + stringify(Array.from(array), indent, next) + ')';
    },
    '[object RegExp]': String,
    '[object Function]': stringifyFunction,
    '[object GeneratorFunction]': stringifyFunction,
    '[object AsyncFunction]': stringifyFunction,
    '[object AsyncGeneratorFunction]': stringifyFunction,
    '[object global]': toGlobalVariable,
    '[object Window]': toGlobalVariable
  };

  /**
   * Convert JavaScript primitives into strings.
   */
  var PRIMITIVE_TYPES = {
    'string': function (string) {
      return "'" + string.replace(ESCAPABLE, escapeChar) + "'";
    },
    'number': function (val) {
      return Object.is(val, -0) ? '-0' : String(val);
    },
    'object': String,
    'boolean': String,
    'symbol': String,
    'undefined': String
  };

  /**
   * Convert any value to a string.
   *
   * @param  {*}        value
   * @param  {string}   indent
   * @param  {Function} next
   * @return {string}
   */
  function stringify (value, indent, next) {
    // Convert primitives into strings.
    if (Object(value) !== value) {
      return PRIMITIVE_TYPES[typeof value](value, indent, next);
    }

    // Handle buffer objects before recursing (node < 6 was an object, node >= 6 is a `Uint8Array`).
    if (typeof Buffer === 'function' && Buffer.isBuffer(value)) {
      return 'new Buffer(' + next(value.toString()) + ')';
    }

    // Use the internal object string to select stringification method.
    var toString = OBJECT_TYPES[Object.prototype.toString.call(value)];

    // Convert objects into strings.
    return toString ? toString(value, indent, next) : undefined;
  }

  /**
   * Stringify an object into the literal string.
   *
   * @param  {*}               value
   * @param  {Function}        [replacer]
   * @param  {(number|string)} [space]
   * @param  {Object}          [options]
   * @return {string}
   */
  return function (value, replacer, space, options) {
    options = options || {}

    // Convert the spaces into a string.
    if (typeof space !== 'string') {
      space = stringRepeat(' ', space);
    }

    var maxDepth = Number(options.maxDepth) || 100;
    var references = !!options.references;
    var skipUndefinedProperties = !!options.skipUndefinedProperties;
    var valueCount = Number(options.maxValues) || 100000;

    var path = [];
    var stack = [];
    var encountered = [];
    var paths = [];
    var restore = [];

    /**
     * Stringify the next value in the stack.
     *
     * @param  {*}      value
     * @param  {string} key
     * @return {string}
     */
    function next (value, key) {
      if (skipUndefinedProperties && value === undefined) {
        return undefined;
      }

      path.push(key);
      var result = recurse(value, stringify);
      path.pop();
      return result;
    }

    /**
     * Handle recursion by checking if we've visited this node every iteration.
     *
     * @param  {*}        value
     * @param  {Function} stringify
     * @return {string}
     */
    var recurse = references ?
      function (value, stringify) {
        if (value && (typeof value === 'object' || typeof value === 'function')) {
          var seen = encountered.indexOf(value);

          // Track nodes to restore later.
          if (seen > -1) {
            restore.push(path.slice(), paths[seen]);
            return;
          }

          // Track encountered nodes.
          encountered.push(value);
          paths.push(path.slice());
        }

        // Stop when we hit the max depth.
        if (path.length > maxDepth || valueCount-- <= 0) {
          return;
        }

        // Stringify the value and fallback to
        return stringify(value, space, next);
      } :
      function (value, stringify) {
        var seen = stack.indexOf(value);

        if (seen > -1 || path.length > maxDepth || valueCount-- <= 0) {
          return;
        }

        stack.push(value);
        var value = stringify(value, space, next);
        stack.pop();
        return value;
      };

    // If the user defined a replacer function, make the recursion function
    // a double step process - `recurse -> replacer -> stringify`.
    if (typeof replacer === 'function') {
      var before = recurse

      // Intertwine the replacer function with the regular recursion.
      recurse = function (value, stringify) {
        return before(value, function (value, space, next) {
          return replacer(value, space, function (value) {
            return stringify(value, space, next);
          });
        });
      };
    }

    var result = recurse(value, stringify);

    // Attempt to restore circular references.
    if (restore.length) {
      var sep = space ? '\n' : '';
      var assignment = space ? ' = ' : '=';
      var eol = ';' + sep;
      var before = space ? '(function () {' : '(function(){'
      var after = '}())'
      var results = ['var x' + assignment + result];

      for (var i = 0; i < restore.length; i += 2) {
        results.push('x' + toPath(restore[i]) + assignment + 'x' + toPath(restore[i + 1]));
      }

      results.push('return x');

      return before + sep + results.join(eol) + eol + after
    }

    return result;
  };
});
