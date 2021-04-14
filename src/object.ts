import { Next, ToString } from "./types";
import { quoteKey } from "./quote";
import { USED_METHOD_KEY } from "./function";
import { arrayToString } from "./array";

/**
 * Transform an object into a string.
 */
export const objectToString: ToString = (value, space, next, key) => {
  // Support buffer in all environments.
  if (typeof Buffer === "function" && Buffer.isBuffer(value)) {
    return `Buffer.from(${next(value.toString("base64"))}, 'base64')`;
  }

  // Support `global` under test environments that don't print `[object global]`.
  if (typeof global === "object" && value === global) {
    return globalToString(value, space, next, key);
  }

  // Use the internal object string to select stringify method.
  const toString = OBJECT_TYPES[Object.prototype.toString.call(value)];
  return toString ? toString(value, space, next, key) : undefined;
};

/**
 * Stringify an object of keys and values.
 */
const rawObjectToString: ToString = (obj, indent, next, key) => {
  const eol = indent ? "\n" : "";
  const space = indent ? " " : "";

  // Iterate over object keys and concat string together.
  const values = Object.keys(obj)
    .reduce(function (values, key) {
      const fn = obj[key];
      const result = next(fn, key);

      // Omit `undefined` object entries.
      if (result === undefined) return values;

      // String format the value data.
      const value = result.split("\n").join(`\n${indent}`);

      // Skip `key` prefix for function parser.
      if (USED_METHOD_KEY.has(fn)) {
        values.push(`${indent}${value}`);
        return values;
      }

      values.push(`${indent}${quoteKey(key, next)}:${space}${value}`);
      return values;
    }, [] as string[])
    .join(`,${eol}`);

  // Avoid new lines in an empty object.
  if (values === "") return "{}";

  return `{${eol}${values}${eol}}`;
};

/**
 * Stringify global variable access.
 */
const globalToString: ToString = (value, space, next) => {
  return `Function(${next("return this")})()`;
};

/**
 * Convert JavaScript objects into strings.
 */
const OBJECT_TYPES: Record<string, ToString> = {
  "[object Array]": arrayToString,
  "[object Object]": rawObjectToString,
  "[object Error]": (error: Error, space: string, next: Next) => {
    return `new Error(${next(error.message)})`;
  },
  "[object Date]": (date: Date) => {
    return `new Date(${date.getTime()})`;
  },
  "[object String]": (str: string, space: string, next: Next) => {
    return `new String(${next(str.toString())})`;
  },
  "[object Number]": (num: number) => {
    return `new Number(${num})`;
  },
  "[object Boolean]": (bool: boolean) => {
    return `new Boolean(${bool})`;
  },
  "[object Set]": (set: Set<any>, space: string, next: Next) => {
    return `new Set(${next(Array.from(set))})`;
  },
  "[object Map]": (map: Map<any, any>, space: string, next: Next) => {
    return `new Map(${next(Array.from(map))})`;
  },
  "[object RegExp]": String,
  "[object global]": globalToString,
  "[object Window]": globalToString,
};
