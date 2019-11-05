/**
 * Call `next()` every time you want to stringify a new value.
 */
export type Next = (value: any, key?: PropertyKey) => string | undefined;

/**
 * Stringify a value.
 */
export type ToString = (
  value: any,
  space: string,
  next: Next,
  key: PropertyKey | undefined
) => string | undefined;
