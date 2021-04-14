import { Next, ToString } from "./types";
import { quoteKey, isValidVariableName } from "./quote";

/**
 * Used in function stringification.
 */
/* istanbul ignore next */
const METHOD_NAMES_ARE_QUOTED =
  {
    " "() {
      /* Empty. */
    },
  }[" "]
    .toString()
    .charAt(0) === '"';

const FUNCTION_PREFIXES = {
  Function: "function ",
  GeneratorFunction: "function* ",
  AsyncFunction: "async function ",
  AsyncGeneratorFunction: "async function* ",
};

const METHOD_PREFIXES = {
  Function: "",
  GeneratorFunction: "*",
  AsyncFunction: "async ",
  AsyncGeneratorFunction: "async *",
};

const TOKENS_PRECEDING_REGEXPS = new Set(
  (
    "case delete else in instanceof new return throw typeof void " +
    ", ; : + - ! ~ & | ^ * / % < > ? ="
  ).split(" ")
);

/**
 * Track function parser usage.
 */
export const USED_METHOD_KEY = new WeakSet<(...args: unknown[]) => unknown>();

/**
 * Stringify a function.
 */
export const functionToString: ToString = (fn, space, next, key) => {
  const name = typeof key === "string" ? key : undefined;

  // Track in function parser for object stringify to avoid duplicate output.
  if (name !== undefined) USED_METHOD_KEY.add(fn);

  return new FunctionParser(fn, space, next, name).stringify();
};

/**
 * Rewrite a stringified function to remove initial indentation.
 */
export function dedentFunction(fnString: string) {
  let found: string | undefined;

  for (const line of fnString.split("\n").slice(1)) {
    const m = /^[\s\t]+/.exec(line);
    if (!m) return fnString; // Early exit without indent.

    const [str] = m;

    if (found === undefined) found = str;
    else if (str.length < found.length) found = str;
  }

  return found ? fnString.split(`\n${found}`).join("\n") : fnString;
}

/**
 * Function parser and stringify.
 */
export class FunctionParser {
  fnString: string;
  fnType: keyof typeof FUNCTION_PREFIXES;
  keyQuote: string | undefined;
  keyPrefix: string;
  isMethodCandidate: boolean;

  pos = 0;
  hadKeyword = false;

  constructor(
    public fn: (...args: unknown[]) => unknown,
    public indent: string,
    public next: Next,
    public key?: string
  ) {
    this.fnString = Function.prototype.toString.call(fn);
    this.fnType = fn.constructor.name as keyof typeof FUNCTION_PREFIXES;
    this.keyQuote = key === undefined ? "" : quoteKey(key, next);
    this.keyPrefix =
      key === undefined ? "" : `${this.keyQuote}:${indent ? " " : ""}`;
    this.isMethodCandidate =
      key === undefined ? false : this.fn.name === "" || this.fn.name === key;
  }

  stringify() {
    const value = this.tryParse();

    // If we can't stringify this function, return a void expression; for
    // bonus help with debugging, include the function as a string literal.
    if (!value) {
      return `${this.keyPrefix}void ${this.next(this.fnString)}`;
    }

    return dedentFunction(value);
  }

  getPrefix() {
    if (this.isMethodCandidate && !this.hadKeyword) {
      return METHOD_PREFIXES[this.fnType] + this.keyQuote;
    }

    return this.keyPrefix + FUNCTION_PREFIXES[this.fnType];
  }

  tryParse() {
    if (this.fnString[this.fnString.length - 1] !== "}") {
      // Must be an arrow function.
      return this.keyPrefix + this.fnString;
    }

    // Attempt to remove function prefix.
    if (this.fn.name) {
      const result = this.tryStrippingName();
      if (result) return result;
    }

    // Support class expressions.
    const prevPos = this.pos;
    if (this.consumeSyntax() === "class") return this.fnString;
    this.pos = prevPos;

    if (this.tryParsePrefixTokens()) {
      const result = this.tryStrippingName();
      if (result) return result;

      let offset = this.pos;

      switch (this.consumeSyntax("WORD_LIKE")) {
        case "WORD_LIKE":
          if (this.isMethodCandidate && !this.hadKeyword) {
            offset = this.pos;
          }
        case "()":
          if (this.fnString.substr(this.pos, 2) === "=>") {
            return this.keyPrefix + this.fnString;
          }

          this.pos = offset;
        case '"':
        case "'":
        case "[]":
          return this.getPrefix() + this.fnString.substr(this.pos);
      }
    }
  }

  /**
   * Attempt to parse the function from the current position by first stripping
   * the function's name from the front. This is not a fool-proof method on all
   * JavaScript engines, but yields good results on Node.js 4 (and slightly
   * less good results on Node.js 6 and 8).
   */
  tryStrippingName() {
    if (METHOD_NAMES_ARE_QUOTED) {
      // ... then this approach is unnecessary and yields false positives.
      return;
    }

    let start = this.pos;
    const prefix = this.fnString.substr(this.pos, this.fn.name.length);

    if (prefix === this.fn.name) {
      this.pos += prefix.length;

      if (
        this.consumeSyntax() === "()" &&
        this.consumeSyntax() === "{}" &&
        this.pos === this.fnString.length
      ) {
        // Don't include the function's name if it will be included in the
        // prefix, or if it's invalid as a name in a function expression.
        if (this.isMethodCandidate || !isValidVariableName(prefix)) {
          start += prefix.length;
        }

        return this.getPrefix() + this.fnString.substr(start);
      }
    }

    this.pos = start;
  }

  /**
   * Attempt to advance the parser past the keywords expected to be at the
   * start of this function's definition. This method sets `this.hadKeyword`
   * based on whether or not a `function` keyword is consumed.
   */
  tryParsePrefixTokens(): boolean {
    let posPrev = this.pos;

    this.hadKeyword = false;

    switch (this.fnType) {
      case "AsyncFunction":
        if (this.consumeSyntax() !== "async") return false;

        posPrev = this.pos;
      case "Function":
        if (this.consumeSyntax() === "function") {
          this.hadKeyword = true;
        } else {
          this.pos = posPrev;
        }
        return true;
      case "AsyncGeneratorFunction":
        if (this.consumeSyntax() !== "async") return false;
      case "GeneratorFunction":
        let token = this.consumeSyntax();

        if (token === "function") {
          token = this.consumeSyntax();
          this.hadKeyword = true;
        }

        return token === "*";
    }
  }

  /**
   * Advance the parser past one element of JavaScript syntax. This could be a
   * matched pair of delimiters, like braces or parentheses, or an atomic unit
   * like a keyword, variable, or operator. Return a normalized string
   * representation of the element parsed--for example, returns '{}' for a
   * matched pair of braces. Comments and whitespace are skipped.
   *
   * (This isn't a full parser, so the token scanning logic used here is as
   * simple as it can be. As a consequence, some things that are one token in
   * JavaScript, like decimal number literals or most multi-character operators
   * like '&&', are split into more than one token here. However, awareness of
   * some multi-character sequences like '=>' is necessary, so we match the few
   * of them that we care about.)
   */
  consumeSyntax(wordLikeToken?: string) {
    const m = this.consumeMatch(
      /^(?:([A-Za-z_0-9$\xA0-\uFFFF]+)|=>|\+\+|\-\-|.)/
    );

    if (!m) return;

    const [token, match] = m;
    this.consumeWhitespace();

    if (match) return wordLikeToken || match;

    switch (token) {
      case "(":
        return this.consumeSyntaxUntil("(", ")");
      case "[":
        return this.consumeSyntaxUntil("[", "]");
      case "{":
        return this.consumeSyntaxUntil("{", "}");
      case "`":
        return this.consumeTemplate();
      case '"':
        return this.consumeRegExp(/^(?:[^\\"]|\\.)*"/, '"');
      case "'":
        return this.consumeRegExp(/^(?:[^\\']|\\.)*'/, "'");
    }

    return token;
  }

  consumeSyntaxUntil(startToken: string, endToken: string): string | undefined {
    let isRegExpAllowed = true;

    for (;;) {
      const token = this.consumeSyntax();
      if (token === endToken) return startToken + endToken;
      if (!token || token === ")" || token === "]" || token === "}") return;

      if (
        token === "/" &&
        isRegExpAllowed &&
        this.consumeMatch(/^(?:\\.|[^\\\/\n[]|\[(?:\\.|[^\]])*\])+\/[a-z]*/)
      ) {
        isRegExpAllowed = false;
        this.consumeWhitespace();
      } else {
        isRegExpAllowed = TOKENS_PRECEDING_REGEXPS.has(token);
      }
    }
  }

  consumeMatch(re: RegExp) {
    const m = re.exec(this.fnString.substr(this.pos));
    if (m) this.pos += m[0].length;
    return m;
  }

  /**
   * Advance the parser past an arbitrary regular expression. Return `token`,
   * or the match object of the regexp.
   */
  consumeRegExp(re: RegExp, token: string): string | undefined {
    const m = re.exec(this.fnString.substr(this.pos));
    if (!m) return;
    this.pos += m[0].length;
    this.consumeWhitespace();
    return token;
  }

  /**
   * Advance the parser past a template string.
   */
  consumeTemplate() {
    for (;;) {
      this.consumeMatch(/^(?:[^`$\\]|\\.|\$(?!{))*/);

      if (this.fnString[this.pos] === "`") {
        this.pos++;
        this.consumeWhitespace();
        return "`";
      }

      if (this.fnString.substr(this.pos, 2) === "${") {
        this.pos += 2;
        this.consumeWhitespace();

        if (this.consumeSyntaxUntil("{", "}")) continue;
      }

      return;
    }
  }

  /**
   * Advance the parser past any whitespace or comments.
   */
  consumeWhitespace() {
    this.consumeMatch(/^(?:\s|\/\/.*|\/\*[^]*?\*\/)*/);
  }
}
