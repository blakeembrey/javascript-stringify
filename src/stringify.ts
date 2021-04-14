import { quoteString } from "./quote";
import { Next, ToString } from "./types";
import { objectToString } from "./object";
import { functionToString } from "./function";

/**
 * Stringify primitive values.
 */
const PRIMITIVE_TYPES: Record<string, ToString> = {
  string: quoteString,
  number: (value: number) => (Object.is(value, -0) ? "-0" : String(value)),
  boolean: String,
  symbol: (value: symbol, space: string, next: Next) => {
    const key = Symbol.keyFor(value);

    if (key !== undefined) return `Symbol.for(${next(key)})`;

    // ES2018 `Symbol.description`.
    return `Symbol(${next((value as any).description)})`;
  },
  bigint: (value: bigint, space: string, next: Next) => {
    return `BigInt(${next(String(value))})`;
  },
  undefined: String,
  object: objectToString,
  function: functionToString,
};

/**
 * Stringify a value recursively.
 */
export const toString: ToString = (value, space, next, key) => {
  if (value === null) return "null";

  return PRIMITIVE_TYPES[typeof value](value, space, next, key);
};
