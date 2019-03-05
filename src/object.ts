import { Next } from "./types";
import { quoteKey } from "./quote";
import { FunctionParser } from "./function";

/**
 * Stringify an object of keys and values.
 */
export function objectToString(obj: any, indent: string, next: Next) {
  const eol = indent ? "\n" : "";

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
}
