/*
 * surd.js — exact numbers of the form a + b√d.
 *
 *   a, b  Fractions
 *   d     a squarefree integer > 1 (BigInt), shared by every Surd in one computation
 *
 * Surds are immutable and support the same field operations as Fraction
 * (add, sub, mul, div, neg, isZero, equals, toDisplay), so row reduction and
 * matrix code can run on them unchanged. Operands may be Fractions or integers;
 * they are lifted to a + 0√d. Mixing two different d values is an error.
 *
 * Display: 2 + √3, 2 − √3, (1/2)√5, −√2, 7 − 4√3.
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;

  /* n = s²·d with d squarefree, for an integer n ≥ 1 (BigInt). */
  function squarePart(n) {
    let s = 1n;
    let d = 1n;
    let m = n;
    for (let p = 2n; p * p <= m; p += p === 2n ? 1n : 2n) {
      let e = 0n;
      while (m % p === 0n) {
        m /= p;
        e++;
      }
      s *= p ** (e / 2n);
      if (e % 2n === 1n) d *= p;
    }
    d *= m; // whatever is left is a prime (or 1)
    return { s, d };
  }

  function isSquarefree(n) {
    return n > 1n && squarePart(n).s === 1n;
  }

  class Surd {
    constructor(a, b, d) {
      this.a = Fraction.from(a);
      this.b = Fraction.from(b);
      this.d = BigInt(d);
      if (!isSquarefree(this.d)) throw new RangeError("Surd: d must be a squarefree integer greater than 1, got " + this.d);
      Object.freeze(this);
    }

    /* Lift a Fraction or integer to a + 0√d. */
    static of(x, d) {
      if (x instanceof Surd) {
        if (x.d !== BigInt(d)) throw new RangeError("Surd: cannot mix √" + x.d + " and √" + d);
        return x;
      }
      return new Surd(Fraction.from(x), Fraction.ZERO, d);
    }

    /*
     * The exact square root of a nonnegative Fraction q:
     * a Fraction when q is a perfect square, otherwise a Surd (k)√d.
     * Throws for q < 0 (complex).
     */
    static sqrt(q) {
      q = Fraction.from(q);
      if (q.isNegative()) throw new RangeError("Surd.sqrt: negative number has no real square root");
      if (q.isZero()) return Fraction.ZERO;
      // √(p/r) = √(p·r) / r, and p·r = s²·d
      const { s, d } = squarePart(q.num * q.den);
      const k = new Fraction(s, q.den);
      return d === 1n ? k : new Surd(Fraction.ZERO, k, d);
    }

    _lift(o) {
      return Surd.of(o, this.d);
    }

    zero() {
      return new Surd(Fraction.ZERO, Fraction.ZERO, this.d);
    }

    one() {
      return new Surd(Fraction.ONE, Fraction.ZERO, this.d);
    }

    add(o) {
      o = this._lift(o);
      return new Surd(this.a.add(o.a), this.b.add(o.b), this.d);
    }

    sub(o) {
      o = this._lift(o);
      return new Surd(this.a.sub(o.a), this.b.sub(o.b), this.d);
    }

    /* (a + b√d)(c + e√d) = (ac + bed) + (ae + bc)√d */
    mul(o) {
      o = this._lift(o);
      const D = new Fraction(this.d);
      return new Surd(this.a.mul(o.a).add(this.b.mul(o.b).mul(D)), this.a.mul(o.b).add(this.b.mul(o.a)), this.d);
    }

    /* The conjugate a − b√d. */
    conj() {
      return new Surd(this.a, this.b.neg(), this.d);
    }

    /* a² − d·b², always rational; nonzero unless the Surd is zero (d is not a square). */
    norm() {
      return this.a.mul(this.a).sub(new Fraction(this.d).mul(this.b).mul(this.b));
    }

    /* (a + b√d)⁻¹ = (a − b√d) / (a² − d·b²) */
    reciprocal() {
      if (this.isZero()) throw new RangeError("Surd: reciprocal of zero");
      const n = this.norm();
      return new Surd(this.a.div(n), this.b.neg().div(n), this.d);
    }

    div(o) {
      return this.mul(this._lift(o).reciprocal());
    }

    neg() {
      return new Surd(this.a.neg(), this.b.neg(), this.d);
    }

    isZero() {
      return this.a.isZero() && this.b.isZero();
    }

    isOne() {
      return this.a.isOne() && this.b.isZero();
    }

    isRational() {
      return this.b.isZero();
    }

    isInteger() {
      return this.b.isZero() && this.a.isInteger();
    }

    /* Display sign: true when the written form starts with a minus (used only for formatting). */
    isNegative() {
      return this.a.isNegative() || (this.a.isZero() && this.b.isNegative());
    }

    abs() {
      return this.isNegative() ? this.neg() : this;
    }

    equals(o) {
      if (!(o instanceof Surd)) o = Surd.of(o, this.d);
      return this.d === o.d && this.a.equals(o.a) && this.b.equals(o.b);
    }

    /* The rational part as a Fraction, when b = 0. */
    toFraction() {
      if (!this.b.isZero()) throw new RangeError("Surd: not rational");
      return this.a;
    }

    toDisplay() {
      const root = "√" + this.d.toString();
      if (this.b.isZero()) return this.a.toDisplay();
      const mag = this.b.abs();
      let bPart;
      if (mag.isOne()) bPart = root;
      else if (mag.isInteger()) bPart = mag.toDisplay() + root;
      else bPart = "(" + mag.toDisplay() + ")" + root;
      if (this.a.isZero()) return (this.b.isNegative() ? "−" : "") + bPart;
      return this.a.toDisplay() + (this.b.isNegative() ? " − " : " + ") + bPart;
    }

    toString() {
      return this.toDisplay();
    }
  }

  /* Lift every entry of a matrix (or vector) of Fractions to Surds over √d. */
  Surd.liftMatrix = function (M, d) {
    return M.map((row) => (Array.isArray(row) ? row.map((x) => Surd.of(x, d)) : Surd.of(row, d)));
  };

  Surd.squarePart = squarePart;

  global.Surd = Surd;
  if (typeof module !== "undefined" && module.exports) module.exports = { Surd };
})(typeof window !== "undefined" ? window : globalThis);
