import { ToString } from "./types";

/**
 * Stringify an array of values.
 */
export const arrayToString: ToString = (array: any[], space, next) => {
  // Map array values to their stringified values with correct indentation.
  const values = array
    .map(function (value, index) {
      const result = next(value, index);

      if (result === undefined) return String(result);

      return space + result.split("\n").join(`\n${space}`);
    })
    .join(space ? ",\n" : ",");

  const eol = space && values ? "\n" : "";
  return `[${eol}${values}${eol}]`;
};
