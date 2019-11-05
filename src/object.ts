import { Next, ToString } from "./types";
import { quoteKey } from "./quote";
import { USED_METHOD_KEY } from "./function";
import { arrayToString } from "./array";

/**
 * Transform an object into a string.
 */
export const objectToString: ToString = (value, space, next, key) => {
  if (typeof (Buffer as unknown) === "function" && Buffer.isBuffer(value)) {
    return `new Buffer(${next(value.toString())})`;
  }

  // Use the internal object string to select stringify method.
  const toString = OBJECT_TYPES[Object.prototype.toString.call(value)];
  return toString ? toString(value, space, next, key) : undefined;
};

/**
 * Stringify an object of keys and values.
 */
const rawObjectToString: ToString = (obj, indent, next) => {
  const eol = indent ? "\n" : "";
  const space = indent ? " " : "";

  // Iterate over object keys and concat string together.
  const values = Object.keys(obj)
    .reduce(
      function(values, key) {
        if (typeof obj[key] === "function") {
          const parser = new FunctionParser(obj[key], indent, next, key);
          const result = parser.stringify();
          values.push(indent + result.split("\n").join(`\n${indent}`));
          return values;
        }

        const result = next(obj[key], key);

        // Omit `undefined` object entries.
        if (result === undefined) return values;

        // String format the value data.
        const value = result.split("\n").join(`\n${indent}`);

        values.push(
          `${indent}${quoteKey(key, next)}:${indent ? " " : ""}${value}`
        );

        return values;
      },
      [] as string[]
    )
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
  "[object String]": (str: String, space: string, next: Next) => {
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
  "[object Window]": globalToString
};
