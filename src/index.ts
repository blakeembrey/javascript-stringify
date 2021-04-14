import { toString } from "./stringify";
import { stringifyPath } from "./quote";
import { Next, ToString } from "./types";

export interface Options {
  maxDepth?: number;
  maxValues?: number;
  references?: boolean;
  skipUndefinedProperties?: boolean;
}

/**
 * Root path node.
 */
const ROOT_SENTINEL = Symbol("root");

/**
 * Stringify any JavaScript value.
 */
export function stringify(
  value: any,
  replacer?: ToString | null,
  indent?: string | number | null,
  options: Options = {}
) {
  const space = typeof indent === "string" ? indent : " ".repeat(indent || 0);
  const path: PropertyKey[] = [];
  const stack = new Set();
  const tracking = new Map<any, PropertyKey[]>();
  const unpack = new Map<PropertyKey[], PropertyKey[]>();
  let valueCount = 0;

  const {
    maxDepth = 100,
    references = false,
    skipUndefinedProperties = false,
    maxValues = 100000,
  } = options;

  // Wrap replacer function to support falling back on supported stringify.
  const valueToString = replacerToString(replacer);

  // Every time you call `next(value)` execute this function.
  const onNext: Next = (value, key) => {
    if (++valueCount > maxValues) return;
    if (skipUndefinedProperties && value === undefined) return;
    if (path.length > maxDepth) return;

    // An undefined key is treated as an out-of-band "value".
    if (key === undefined) return valueToString(value, space, onNext, key);

    path.push(key);
    const result = builder(value, key === ROOT_SENTINEL ? undefined : key);
    path.pop();
    return result;
  };

  const builder: Next = references
    ? (value, key) => {
        if (
          value !== null &&
          (typeof value === "object" ||
            typeof value === "function" ||
            typeof value === "symbol")
        ) {
          // Track nodes to restore later.
          if (tracking.has(value)) {
            unpack.set(path.slice(1), tracking.get(value)!);
            // Use `undefined` as temporaray stand-in for referenced nodes
            return valueToString(undefined, space, onNext, key);
          }

          // Track encountered nodes.
          tracking.set(value, path.slice(1));
        }

        return valueToString(value, space, onNext, key);
      }
    : (value, key) => {
        // Stop on recursion.
        if (stack.has(value)) return;

        stack.add(value);
        const result = valueToString(value, space, onNext, key);
        stack.delete(value);
        return result;
      };

  const result = onNext(value, ROOT_SENTINEL);

  // Attempt to restore circular references.
  if (unpack.size) {
    const sp = space ? " " : "";
    const eol = space ? "\n" : "";
    let wrapper = `var x${sp}=${sp}${result};${eol}`;

    for (const [key, value] of unpack.entries()) {
      const keyPath = stringifyPath(key, onNext);
      const valuePath = stringifyPath(value, onNext);

      wrapper += `x${keyPath}${sp}=${sp}x${valuePath};${eol}`;
    }

    return `(function${sp}()${sp}{${eol}${wrapper}return x;${eol}}())`;
  }

  return result;
}

/**
 * Create `toString()` function from replacer.
 */
function replacerToString(replacer?: ToString | null): ToString {
  if (!replacer) return toString;

  return (value, space, next, key) => {
    return replacer(
      value,
      space,
      (value: any) => toString(value, space, next, key),
      key
    );
  };
}
