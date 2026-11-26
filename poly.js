/*
 * poly.js — polynomials in λ with exact Fraction coefficients.
 *
 *   arithmetic   add, sub, mul, neg, scale, evaluate (at a Fraction or a Surd)
 *   division     synthetic division by (λ − r), with the table a student writes
 *   factoring    over ℚ: rational root test + synthetic division, then the quadratic
 *                formula for a leftover quadratic (which may give surd roots a ± b√d).
 *                A leftover factor of degree ≥ 3 with no rational roots, or a quadratic
 *                with negative discriminant, is reported as unresolved — never guessed.
 *
 * Polys implement add, sub, mul, neg, isZero, equals, toDisplay, zero() and one(),
 * so matrix.js can take determinants and adjoints of matrices with Poly entries (λI − A).
 *
 * Display: λ³ − 5λ² + 8λ − 4, and factored forms such as (λ − 2)²(λ − 1).
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const Surd = global.Surd || require("./surd.js").Surd;

  const SUP = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  const sup = (n) => String(n).split("").map((d) => SUP[Number(d)]).join("");

  const bigAbs = (n) => (n < 0n ? -n : n);
  function gcd(a, b) {
    a = bigAbs(a);
    b = bigAbs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  }
  const lcm = (a, b) => (a / gcd(a, b)) * b;

  /* Positive divisors of a nonzero BigInt, ascending. */
  function divisors(n) {
    n = bigAbs(n);
    const small = [];
    const large = [];
    for (let i = 1n; i * i <= n; i++) {
      if (n % i === 0n) {
        small.push(i);
        if (i * i !== n) large.unshift(n / i);
      }
    }
    return small.concat(large);
  }

  class Poly {
    /* coeffs: lowest degree first, e.g. [−4, 8, −5, 1] is λ³ − 5λ² + 8λ − 4. */
    constructor(coeffs, variable) {
      const c = (coeffs || []).map((x) => Fraction.from(x));
      while (c.length && c[c.length - 1].isZero()) c.pop();
      this.coeffs = c;
      this.variable = variable || "λ";
      Object.freeze(this.coeffs);
      Object.freeze(this);
    }

    static from(coeffs, variable) {
      return new Poly(coeffs, variable);
    }

    static constant(c) {
      return new Poly([c]);
    }

    /* The polynomial λ. */
    static get X() {
      return new Poly([0, 1]);
    }

    /* (λ − r) */
    static linear(r) {
      return new Poly([Fraction.from(r).neg(), 1]);
    }

    get degree() {
      return this.coeffs.length - 1; // −1 for the zero polynomial
    }

    coeff(k) {
      return this.coeffs[k] || Fraction.ZERO;
    }

    get lead() {
      return this.coeff(this.degree);
    }

    zero() {
      return new Poly([]);
    }

    one() {
      return new Poly([1]);
    }

    _lift(o) {
      return o instanceof Poly ? o : new Poly([o]);
    }

    add(o) {
      o = this._lift(o);
      const n = Math.max(this.coeffs.length, o.coeffs.length);
      return new Poly(Array.from({ length: n }, (_, k) => this.coeff(k).add(o.coeff(k))));
    }

    sub(o) {
      return this.add(this._lift(o).neg());
    }

    neg() {
      return new Poly(this.coeffs.map((c) => c.neg()));
    }

    scale(k) {
      k = Fraction.from(k);
      return new Poly(this.coeffs.map((c) => c.mul(k)));
    }

    mul(o) {
      o = this._lift(o);
      if (this.isZero() || o.isZero()) return this.zero();
      const out = Array.from({ length: this.coeffs.length + o.coeffs.length - 1 }, () => Fraction.ZERO);
      this.coeffs.forEach((a, i) => o.coeffs.forEach((b, j) => {
        out[i + j] = out[i + j].add(a.mul(b));
      }));
      return new Poly(out);
    }

    isZero() {
      return this.coeffs.length === 0;
    }

    isOne() {
      return this.degree === 0 && this.coeffs[0].isOne();
    }

    equals(o) {
      o = this._lift(o);
      return this.coeffs.length === o.coeffs.length && this.coeffs.every((c, k) => c.equals(o.coeffs[k]));
    }

    /* Horner's rule. x may be a Fraction, an integer, or a Surd (the result then has x's type). */
    evaluate(x) {
      if (typeof x !== "object") x = Fraction.from(x);
      let acc = typeof x.zero === "function" ? x.zero() : Fraction.ZERO;
      for (let k = this.degree; k >= 0; k--) acc = acc.mul(x).add(this.coeffs[k]);
      return acc;
    }

    /*
     * Synthetic division by (λ − r). Returns {
     *   quotient, remainder,
     *   table: { r, top: [aₙ … a₀], middle: [ , r·b …], bottom: [bₙ₋₁ … b₀, remainder] }
     * }
     */
    divideByLinear(r) {
      r = Fraction.from(r);
      const top = this.coeffs.slice().reverse();
      const bottom = [];
      const middle = [null];
      top.forEach((a, i) => {
        if (i === 0) {
          bottom.push(a);
          return;
        }
        const m = r.mul(bottom[i - 1]);
        middle.push(m);
        bottom.push(a.add(m));
      });
      const remainder = bottom[bottom.length - 1];
      const quotient = new Poly(bottom.slice(0, -1).reverse());
      return { quotient, remainder, table: { r, top, middle, bottom } };
    }

    /* λ³ − 5λ² + 8λ − 4 */
    toDisplay() {
      if (this.isZero()) return "0";
      const v = this.variable;
      let out = "";
      for (let k = this.degree; k >= 0; k--) {
        const c = this.coeffs[k];
        if (c.isZero()) continue;
        const mag = c.abs();
        let body;
        const power = k === 0 ? "" : k === 1 ? v : v + sup(k);
        if (k === 0) body = mag.toDisplay();
        else if (mag.isOne()) body = power;
        else if (mag.isInteger()) body = mag.toDisplay() + power;
        else body = "(" + mag.toDisplay() + ")" + power;
        if (out === "") out = (c.isNegative() ? "−" : "") + body;
        else out += (c.isNegative() ? " − " : " + ") + body;
      }
      return out;
    }

    toString() {
      return this.toDisplay();
    }

    /*
     * Factor over ℚ, keeping the work a student would show.
     * Returns {
     *   lead,                                    leading coefficient (1 for a characteristic polynomial)
     *   roots: [{ value: Fraction|Surd, multiplicity }],
     *   factors: [{ poly, multiplicity, roots }],  linear factors, and a quadratic with surd roots
     *   unresolved: null | { poly, reason: "no-rational-roots" | "complex" },
     *   work: {
     *     method: "linear" | "quadratic" | "rational-root",
     *     cleared: null | { multiplier, poly },  integer form used for the rational root test
     *     zeroRoot: k,                           λᵏ factored out first (constant term 0)
     *     candidates: [Fraction], tested: [{ r, value, isRoot }],
     *     divisions: [{ r, dividend, quotient, table }],
     *     quadratic: null | { a, b, c, disc, sqrtDisc, roots }
     *   },
     *   factored: "(λ − 1)(λ − 2)²"
     * }
     */
    factor() {
      if (this.degree < 1) throw new RangeError("factor: polynomial must have degree ≥ 1");
      const lead = this.lead;
      const roots = [];
      const factors = [];
      const work = { method: null, cleared: null, zeroRoot: 0, candidates: [], tested: [], divisions: [], quadratic: null };
      let unresolved = null;

      const addRoot = (value, multiplicity) => {
        const hit = roots.find((x) => (x.value instanceof Surd) === (value instanceof Surd) && x.value.equals(value));
        if (hit) hit.multiplicity += multiplicity;
        else roots.push({ value, multiplicity });
      };

      let p = this.scale(lead.reciprocal()); // monic

      // λᵏ divides p when the low coefficients are 0
      while (p.degree >= 1 && p.coeff(0).isZero()) {
        work.zeroRoot++;
        p = new Poly(p.coeffs.slice(1));
      }
      if (work.zeroRoot) addRoot(Fraction.ZERO, work.zeroRoot);

      if (p.degree >= 3) {
        work.method = "rational-root";
        // integer coefficients for the test: multiply by the lcm of the denominators
        const L = p.coeffs.reduce((acc, c) => lcm(acc, c.den), 1n);
        const ip = p.scale(new Fraction(L));
        if (L !== 1n) work.cleared = { multiplier: new Fraction(L), poly: ip };
        const a0 = ip.coeff(0).num;
        const an = ip.lead.num;
        const seen = new Set();
        divisors(a0).forEach((num) => divisors(an).forEach((den) => {
          [new Fraction(num, den), new Fraction(-num, den)].forEach((r) => {
            const key = r.toString();
            if (!seen.has(key)) {
              seen.add(key);
              work.candidates.push(r);
            }
          });
        }));
        work.candidates.sort((x, y) => {
          const dx = x.abs().sub(y.abs());
          if (!dx.isZero()) return dx.isNegative() ? -1 : 1;
          return x.isNegative() ? 1 : -1;
        });

        for (const r of work.candidates) {
          if (p.degree < 3) break;
          let value = p.evaluate(r);
          work.tested.push({ r, value, isRoot: value.isZero() });
          while (p.degree >= 1 && value.isZero()) {
            const d = p.divideByLinear(r);
            work.divisions.push({ r, dividend: p, quotient: d.quotient, table: d.table });
            addRoot(r, 1);
            p = d.quotient;
            value = p.degree >= 1 ? p.evaluate(r) : Fraction.ONE;
          }
        }
      } else {
        work.method = p.degree === 2 ? "quadratic" : "linear";
      }

      if (p.degree === 1) {
        addRoot(p.coeff(0).neg().div(p.coeff(1)), 1);
      } else if (p.degree === 2) {
        const a = p.coeff(2);
        const b = p.coeff(1);
        const c = p.coeff(0);
        const disc = b.mul(b).sub(new Fraction(4n).mul(a).mul(c));
        const q = { a, b, c, disc, sqrtDisc: null, roots: [] };
        work.quadratic = q;
        if (disc.isNegative()) {
          unresolved = { poly: p, reason: "complex" };
        } else {
          const s = Surd.sqrt(disc);
          q.sqrtDisc = s;
          const twoA = a.mul(new Fraction(2n));
          if (s instanceof Surd) {
            const plus = new Surd(b.neg().div(twoA), s.b.div(twoA), s.d);
            const minus = plus.conj();
            q.roots = [plus, minus];
            addRoot(plus, 1);
            addRoot(minus, 1);
            factors.push({ poly: p, multiplicity: 1, roots: [plus, minus] });
          } else {
            const r1 = b.neg().add(s).div(twoA);
            const r2 = b.neg().sub(s).div(twoA);
            q.roots = disc.isZero() ? [r1] : [r1, r2];
            if (disc.isZero()) addRoot(r1, 2);
            else {
              addRoot(r1, 1);
              addRoot(r2, 1);
            }
          }
        }
      } else if (p.degree >= 3) {
        unresolved = { poly: p, reason: "no-rational-roots" };
      }

      // Linear factors from the rational roots, in the order found.
      roots.forEach(({ value, multiplicity }) => {
        if (!(value instanceof Surd)) factors.push({ poly: Poly.linear(value), multiplicity, roots: [value] });
      });
      // Keep the surd quadratic after the linear factors.
      factors.sort((x, y) => x.poly.degree - y.poly.degree);

      const result = { lead, roots, factors, unresolved, work };
      result.factored = formatFactored(lead, factors, unresolved);
      return result;
    }
  }

  function formatFactored(lead, factors, unresolved) {
    let out = lead.isOne() ? "" : lead.equals(Fraction.ONE.neg()) ? "−" : lead.isInteger() && !lead.isNegative() ? lead.toDisplay() : "(" + lead.toDisplay() + ")";
    const all = factors.map((f) => ({ poly: f.poly, multiplicity: f.multiplicity }));
    if (unresolved) all.push({ poly: unresolved.poly, multiplicity: 1 });
    all.forEach(({ poly, multiplicity }) => {
      const exp = multiplicity > 1 ? sup(multiplicity) : "";
      if (poly.degree === 1 && poly.coeff(0).isZero()) out += poly.variable + exp; // λ, λ²
      else out += "(" + poly.toDisplay() + ")" + exp;
    });
    return out;
  }

  /* λIₙ − A as a matrix of Polys: diagonal λ − aᵢᵢ, off-diagonal −aᵢⱼ. */
  Poly.characteristicMatrix = function (A) {
    return A.map((row, i) => row.map((a, j) => {
      const c = Fraction.from(a).neg();
      return i === j ? new Poly([c, 1]) : new Poly([c]);
    }));
  };

  Poly.sup = sup;

  global.Poly = Poly;
  if (typeof module !== "undefined" && module.exports) module.exports = { Poly };
})(typeof window !== "undefined" ? window : globalThis);
