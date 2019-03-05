import { Next } from "./types";

/**
 * Stringify an array of values.
 */
export function arrayToString(array: any[], space: string, next: Next) {
  // Map array values to their stringified values with correct indentation.
  const values = array
    .map(function(value, index) {
      const result = next(value, index);

      if (result === undefined) return String(result);

      return space + result.split("\n").join(`\n${space}`);
    })
    .join(space ? ",\n" : ",");

  // Wrap the array in newlines if we have indentation set.
  if (space && values) {
    return "[\n" + values + "\n]";
  }

  return "[" + values + "]";
}
