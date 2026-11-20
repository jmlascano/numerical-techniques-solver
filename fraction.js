/*
 * fraction.js — exact rational arithmetic.
 *
 * A Fraction is num/den with BigInt parts. Invariants, kept by the constructor:
 *   - den > 0 (the sign lives in the numerator)
 *   - gcd(|num|, den) = 1 (always fully reduced)
 *   - zero is stored as 0/1
 * Fractions are immutable; every operation returns a new Fraction.
 */
(function (global) {
  "use strict";

  function bigAbs(n) {
    return n < 0n ? -n : n;
  }

  function gcd(a, b) {
    a = bigAbs(a);
    b = bigAbs(b);
    while (b !== 0n) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  function toBig(x) {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") {
      if (!Number.isInteger(x)) {
        throw new TypeError("Fraction: use a string such as '0.5' or '1/2' for non-integers, not the float " + x);
      }
      return BigInt(x);
    }
    throw new TypeError("Fraction: expected an integer or BigInt, got " + typeof x);
  }

  class Fraction {
    constructor(num, den = 1n) {
      let n = toBig(num);
      let d = toBig(den);
      if (d === 0n) throw new RangeError("Fraction: denominator is zero");
      if (d < 0n) {
        n = -n;
        d = -d;
      }
      const g = gcd(n, d);
      if (g > 1n) {
        n /= g;
        d /= g;
      }
      if (n === 0n) d = 1n;
      this.num = n;
      this.den = d;
      Object.freeze(this);
    }

    static from(x) {
      if (x instanceof Fraction) return x;
      if (typeof x === "string") return Fraction.parse(x);
      return new Fraction(x, 1n);
    }

    /*
     * Parse user input. Accepts integers ("-3"), decimals ("0.25", "-.5", "2."),
     * and fractions of integers ("-3/4", "6/-8"). Surrounding spaces are ignored,
     * and the Unicode minus sign (−) is accepted as "-".
     * Throws an Error with a plain-language message on anything else.
     */
    static parse(text) {
      const s = String(text).trim().replace(/−/g, "-");
      if (s === "") throw new Error("empty");

      let m = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(s);
      if (m) {
        const d = BigInt(m[2]);
        if (d === 0n) throw new Error("the denominator cannot be 0");
        return new Fraction(BigInt(m[1]), d);
      }

      m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s);
      if (m && (m[2] !== "" || (m[3] !== undefined && m[3] !== ""))) {
        const sign = m[1] === "-" ? -1n : 1n;
        const intPart = m[2] === "" ? "0" : m[2];
        const fracPart = m[3] || "";
        const num = BigInt(intPart + fracPart);
        const den = 10n ** BigInt(fracPart.length);
        return new Fraction(sign * num, den);
      }

      throw new Error("not a number; use forms like 3, -0.25, or -3/4");
    }

    add(o) {
      o = Fraction.from(o);
      return new Fraction(this.num * o.den + o.num * this.den, this.den * o.den);
    }

    sub(o) {
      o = Fraction.from(o);
      return new Fraction(this.num * o.den - o.num * this.den, this.den * o.den);
    }

    mul(o) {
      o = Fraction.from(o);
      return new Fraction(this.num * o.num, this.den * o.den);
    }

    div(o) {
      o = Fraction.from(o);
      if (o.num === 0n) throw new RangeError("Fraction: division by zero");
      return new Fraction(this.num * o.den, this.den * o.num);
    }

    neg() {
      return new Fraction(-this.num, this.den);
    }

    reciprocal() {
      if (this.num === 0n) throw new RangeError("Fraction: reciprocal of zero");
      return new Fraction(this.den, this.num);
    }

    isZero() {
      return this.num === 0n;
    }

    isOne() {
      return this.num === 1n && this.den === 1n;
    }

    isNegative() {
      return this.num < 0n;
    }

    isInteger() {
      return this.den === 1n;
    }

    equals(o) {
      o = Fraction.from(o);
      return this.num === o.num && this.den === o.den;
    }

    abs() {
      return this.num < 0n ? this.neg() : this;
    }

    /* ASCII form, e.g. "-5/2". Used by tests and for copy/paste. */
    toString() {
      return this.den === 1n ? this.num.toString() : this.num.toString() + "/" + this.den.toString();
    }

    /* Display form with a true minus sign, e.g. "−5/2". */
    toDisplay() {
      return this.toString().replace("-", "−");
    }
  }

  Fraction.ZERO = new Fraction(0n);
  Fraction.ONE = new Fraction(1n);

  global.Fraction = Fraction;
  if (typeof module !== "undefined" && module.exports) module.exports = { Fraction };
})(typeof window !== "undefined" ? window : globalThis);
