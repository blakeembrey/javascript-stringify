# JavaScript Stringify

Stringify is to `eval` as `JSON.stringify` is to `JSON.parse`.

[![Build Status](https://img.shields.io/travis/blakeembrey/javascript-stringify/master.svg)](https://travis-ci.org/blakeembrey/javascript-stringify)
[![NPM version](https://img.shields.io/npm/v/javascript-stringify.svg)](https://www.npmjs.org/package/javascript-stringify)

## Installation

```javascript
npm install javascript-stringify --save
bower install javascript-stringify --save
```

### Node

```javascript
var javascriptStringify = require('javascript-stringify');
```

### AMD

```javascript
define(function (require, exports, module) {
  var javascriptStringify = require('javascript-stringify');
});
```

### `<script>` tag

```html
<script src="javascript-stringify.js"></script>
```

## Usage

```javascript
javascriptStringify(value[, replacer [, space]])
```

The API is similar to `JSON.stringify`. However, any value returned by the replacer will be used literally. For this reason, the replacer is passed three arguments - `value`, `indentation` and `stringify`. If you need to continue the stringification process inside your replacer, you can call `stringify` with the updated value.

### Examples

```javascript
javascriptStringify({});    // "{}"
javascriptStringify(true);  // "true"
javascriptStringify('foo'); // "'foo'"

javascriptStringify({ x: 5, y: 6});       // "{x:5,y:6}"
javascriptStringify([1, 2, 3, 'string']); // "[1,2,3,'string']"

/**
 * Invalid key names are automatically stringified.
 */

javascriptStringify({ 'some-key': 10 }); // "{'some-key':10}"

/**
 * Some object types and values can remain identical.
 */

javascriptStringify([/.+/ig, new Number(10), new Date()]); // "[/.+/gi,new Number(10),new Date(1406623295732)]"

/**
 * Unknown or circular references are removed.
 */

var obj = { x: 10 };
obj.circular = obj;

javascriptStringify(obj); // "{x:10}"

/**
 * Specify indentation - just like `JSON.stringify`.
 */

javascriptStringify({ a: 2 }, null, ' ');             // "{\n a: 2\n}"
javascriptStringify({ uno: 1, dos : 2 }, null, '\t'); // "{\n\tuno: 1,\n\tdos: 2\n}"

/**
 * Add custom replacer behaviour - like double quoted strings.
 */

javascriptStringify(['test', 'string'], function (value, indent, stringify) {
  if (typeof value === 'string') {
    return '"' + value.replace(/"/g, '\\"') + '"';
  }

  return stringify(value);
});
//=> '["test","string"]'
```

## License

MIT
