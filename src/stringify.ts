import { quoteString } from "./quote";
import { Next } from "./types";
import { arrayToString } from "./array";
import { objectToString } from "./object";
import { functionToString } from "./function";

/**
 * Stringify primitive values.
 */
const PRIMITIVE_TYPES = {
  string: quoteString,
  number: (value: number) => (Object.is(value, -0) ? "-0" : String(value)),
  boolean: String,
  symbol: (value: symbol, space: string, next: Next) => {
    const key = Symbol.keyFor(value);

    if (key !== undefined) return `Symbol.for(${next(key)})`;

    // ES2018 `Symbol.description`.
    return `Symbol(${next((value as any).description)})`;
  },
  undefined: String
};

/**
 * Stringify global variable access.
 */
function globalToString(value: any, space: string, next: Next) {
  return `Function(${next("return this")})()`;
}

/**
 * Convert JavaScript objects into strings.
 */
const OBJECT_TYPES = {
  "[object Array]": arrayToString,
  "[object Object]": objectToString,
  "[object Error]": function(error: Error, space: string, next: Next) {
    return `new Error(${next(error.message)})`;
  },
  "[object Date]": function(date: Date) {
    return `new Date(${date.getTime()})`;
  },
  "[object String]": function(str: String, space: string, next: Next) {
    return `new String(${next(str.toString())})`;
  },
  "[object Number]": function(num: number) {
    return `new Number(${num})`;
  },
  "[object Boolean]": function(bool: boolean) {
    return `new Boolean(${bool})`;
  },
  "[object Set]": function(set: Set<any>, space: string, next: Next) {
    return `new Set(${next(Array.from(set))})`;
  },
  "[object Map]": function(map: Map<any, any>, space: string, next: Next) {
    return `new Map(${next(Array.from(map))})`;
  },
  "[object RegExp]": String,
  "[object Function]": functionToString,
  "[object GeneratorFunction]": functionToString,
  "[object AsyncFunction]": functionToString,
  "[object AsyncGeneratorFunction]": functionToString,
  "[object global]": globalToString,
  "[object Window]": globalToString
};

/**
 * Stringify a value recursively.
 */
export function toString(value: any, space: string, next: Next) {
  if (value === null) return "null";

  const typeOf = typeof value;

  if (PRIMITIVE_TYPES.hasOwnProperty(typeOf)) {
    return PRIMITIVE_TYPES[typeOf as keyof typeof PRIMITIVE_TYPES](
      value,
      space,
      next
    );
  }

  // Handle buffer objects before object types (node < 6 was an object, node >= 6 is a `Uint8Array`).
  if (typeof (Buffer as unknown) === "function" && Buffer.isBuffer(value)) {
    return `new Buffer(${next(value.toString())})`;
  }

  // Use the internal object string to select stringify method.
  const toString = Object.prototype.toString.call(value);

  // Convert objects into strings.
  if (OBJECT_TYPES.hasOwnProperty(toString)) {
    return OBJECT_TYPES[toString as keyof typeof OBJECT_TYPES](
      value,
      space,
      next
    );
  }
}
