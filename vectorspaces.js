/*
 * vectorspaces.js — Real Vector Spaces (slides D1) and Coordinates and Bases (slides D2), in ℝⁿ.
 *
 * Vectors are arrays of Fractions. A list of vectors is turned into a matrix whose
 * COLUMNS are the vectors, and every question becomes a row reduction (rowreduce.js):
 *
 *   D1  linear combination   [v₁ … vₖ | w]           consistent?  coefficients
 *       span ℝⁿ              rank [v₁ … vₖ] = n?       if not, a standard vector eᵢ outside the span
 *       independence         k₁v₁ + … + kₖvₖ = 0       nontrivial relation (Thm 4.13 when k > n)
 *   D2  basis test           |S| = n and independent (Thm 4.22 shortcut)
 *       coordinates          [b₁ … bₙ | x] → (x)_B, and x = c₁b₁ + … + cₙbₙ back
 *       reduce / extend      [S | e₁ … eₙ]: the pivot columns form a basis (Thm 4.23)
 *       change of basis      Anton's convention (CONTEXT-v3 Q2, confirmed by the student):
 *                            P_{B′→B} = [[u′₁]_B … [u′ₙ]_B], found from [B | B′] → [I | P_{B′→B}],
 *                            and [v]_B = P_{B′→B}[v]_{B′}
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const RR = global.RowReduce || require("./rowreduce.js");
  const Matrix = global.Matrix || require("./matrix.js");
  const Spaces = global.Spaces || require("./spaces.js");
  const { sub, linear } = RR;

  const lift = (v) => v.map((x) => Fraction.from(x));
  /* The matrix whose columns are the given vectors. */
  const columns = (vs) => vs[0].map((_, i) => vs.map((v) => v[i]));
  const unit = (i, n) => Array.from({ length: n }, (_, r) => (r === i ? Fraction.ONE : Fraction.ZERO));
  const combo = (coeffs, vs) => vs[0].map((_, i) => vs.map((v, j) => coeffs[j].mul(v[i])).reduce((a, b) => a.add(b)));
  const vName = (j, letter) => (letter || "v") + sub(j + 1);

  const bigAbs = (n) => (n < 0n ? -n : n);
  const gcd = (a, b) => {
    a = bigAbs(a);
    b = bigAbs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  };

  /* Scale a relation to the smallest integers with the first nonzero coefficient positive. */
  function integerize(v) {
    const L = v.reduce((acc, x) => (acc / gcd(acc, x.den)) * x.den, 1n);
    let ints = v.map((x) => x.mul(new Fraction(L)).num);
    const g = ints.reduce((acc, x) => gcd(acc, x), 0n) || 1n;
    ints = ints.map((x) => x / g);
    const first = ints.find((x) => x !== 0n);
    if (first < 0n) ints = ints.map((x) => -x);
    return ints.map((x) => new Fraction(x));
  }

  /* ---------- D1 ---------- */

  /*
   * Is w a linear combination of v₁ … vₖ?
   *   { ok: true, aug, reduction, coefficients, unique, free, combination, check }
   *   { ok: false, aug, reduction, badRow }   the 0 = 1 row
   */
  function linearCombination(vsIn, wIn) {
    const vs = vsIn.map(lift);
    const w = lift(wIn);
    const k = vs.length;
    const aug = columns(vs.concat([w]));
    const reduction = RR.rref(aug);
    const badRow = reduction.pivots.indexOf(k);
    if (badRow !== -1) return { ok: false, aug, reduction, badRow, k };
    const coefficients = Array.from({ length: k }, () => Fraction.ZERO);
    reduction.pivots.forEach((p, i) => {
      coefficients[p] = reduction.rref[i][k];
    });
    const free = [];
    for (let j = 0; j < k; j++) if (!reduction.pivots.includes(j)) free.push(j);
    const combination = combo(coefficients, vs);
    return { ok: true, aug, reduction, k, coefficients, unique: free.length === 0, free, combination, check: Matrix.vectorsEqual(combination, w) };
  }

  /*
   * Do v₁ … vₖ span ℝⁿ?  { M, reduction, rank, n, k, spans, tooFew, witness: null | { index, vector, reduction, badRow } }
   */
  function span(vsIn) {
    const vs = vsIn.map(lift);
    const n = vs[0].length;
    const k = vs.length;
    const M = columns(vs);
    const reduction = RR.rref(M);
    const rank = reduction.rank;
    const spans = rank === n;
    let witness = null;
    if (!spans) {
      for (let i = 0; i < n; i++) {
        const e = unit(i, n);
        const r = RR.rref(columns(vs.concat([e])));
        const bad = r.pivots.indexOf(k);
        if (bad !== -1) {
          witness = { index: i, vector: e, reduction: r, badRow: bad };
          break;
        }
      }
    }
    return { M, reduction, rank, n, k, spans, tooFew: k < n, witness };
  }

  /*
   * Are v₁ … vₖ linearly independent?
   *   { M, analysis (spaces.js), n, k, independent, moreThanN,
   *     relation: [Fraction] (integers), solvedFor: j, expression: [{ c, j }] }  (dependent only)
   */
  function independence(vsIn) {
    const vs = vsIn.map(lift);
    const n = vs[0].length;
    const k = vs.length;
    const M = columns(vs);
    const analysis = Spaces.analyze(M);
    const independent = analysis.nullity === 0;
    const out = { M, analysis, n, k, independent, moreThanN: k > n };
    if (!independent) {
      const relation = integerize(analysis.nullSpace.basis[0].vector);
      let j = k - 1;
      while (relation[j].isZero()) j--;
      const expression = [];
      relation.forEach((c, i) => {
        if (i !== j && !c.isZero()) expression.push({ c: c.neg().div(relation[j]), j: i });
      });
      Object.assign(out, { relation, solvedFor: j, expression, relationCheck: combo(relation, vs) });
    }
    return out;
  }

  /* ---------- D2 ---------- */

  /*
   * Is S a basis for ℝⁿ?  { n, k, sizeOk, reason?, M, reduction, rank, basis }
   */
  function isBasis(SIn) {
    const S = SIn.map(lift);
    const n = S[0].length;
    const k = S.length;
    const M = columns(S);
    const reduction = RR.rref(M);
    const rank = reduction.rank;
    const out = { n, k, M, reduction, rank };
    if (k !== n) {
      out.sizeOk = false;
      out.basis = false;
      out.reason = k < n
        ? "S has " + k + " vector" + (k === 1 ? "" : "s") + ", fewer than n = " + n + ", so it cannot span ℝ" + sup(n) + "."
        : "S has " + k + " vectors, more than n = " + n + ", so it is linearly dependent (Thm 4.13).";
      return out;
    }
    out.sizeOk = true;
    out.basis = rank === n;
    return out;
  }

  const SUPS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  function sup(n) {
    return String(n).split("").map((d) => SUPS[Number(d)]).join("");
  }

  /*
   * Coordinates of x relative to B:  { ok, aug, reduction, coordinates, check }
   * (ok false when B is not a basis of ℝⁿ)
   */
  function coordinates(BIn, xIn) {
    const B = BIn.map(lift);
    const x = lift(xIn);
    const n = x.length;
    const aug = columns(B.concat([x]));
    const reduction = RR.rref(aug);
    if (B.length !== n || reduction.pivots.slice(0, n).some((p, i) => p !== i) || reduction.rank < n || reduction.pivots.includes(n)) {
      return { ok: false, aug, reduction, reason: "B is not a basis for ℝ" + sup(n) + " (the vectors of B are not linearly independent), so coordinates relative to B are not defined." };
    }
    const c = reduction.rref.map((row) => row[n]);
    return { ok: true, aug, reduction, coordinates: c, check: Matrix.vectorsEqual(combo(c, B), x) };
  }

  /* x from its coordinates: x = c₁b₁ + … + cₙbₙ, with the work. */
  function fromCoordinates(BIn, cIn) {
    const B = BIn.map(lift);
    const c = lift(cIn);
    const vector = combo(c, B);
    const terms = c.map((ci, j) => RR.factor(ci) + "(" + B[j].map((x) => x.toDisplay()).join(", ") + ")");
    return { vector, work: terms.join(" + "), basisCheck: isBasis(B) };
  }

  /*
   * Reduce a spanning set or extend an independent set to a basis of ℝⁿ (Thm 4.23):
   * row reduce [S | e₁ … eₙ]; the pivot columns form a basis.
   *   { aug, reduction, kept: [j] (from S), added: [i] (eᵢ), basis: [vector], independent, spans }
   */
  function reduceOrExtend(SIn) {
    const S = SIn.map(lift);
    const n = S[0].length;
    const k = S.length;
    const E = Array.from({ length: n }, (_, i) => unit(i, n));
    const aug = columns(S.concat(E));
    const reduction = RR.rref(aug);
    const kept = reduction.pivots.filter((p) => p < k);
    const added = reduction.pivots.filter((p) => p >= k).map((p) => p - k);
    const basis = kept.map((j) => S[j]).concat(added.map((i) => E[i]));
    return { aug, reduction, k, n, kept, added, basis, independent: kept.length === k, spans: added.length === 0 };
  }

  /*
   * Change of basis between B and B′ (both bases of ℝⁿ), Anton's convention.
   *   { ok, toB: { aug, reduction, P },   P_{B′→B}, from [B | B′]
   *         toB2: { aug, reduction, P },  P_{B→B′}, from [B′ | B]
   *     product: P_{B→B′}·P_{B′→B} (= I) }
   */
  function changeOfBasis(BIn, B2In) {
    const B = BIn.map(lift);
    const B2 = B2In.map(lift);
    const n = B[0].length;
    const half = (vs1, vs2) => {
      const aug = columns(vs1.concat(vs2));
      const reduction = RR.rref(aug);
      const ok = reduction.pivots.length >= n && reduction.pivots.slice(0, n).every((p, i) => p === i);
      return { aug, reduction, ok, P: reduction.rref.map((row) => row.slice(n)) };
    };
    const toB = half(B, B2);
    const toB2 = half(B2, B);
    if (!toB.ok || !toB2.ok) {
      return { ok: false, toB, toB2, reason: (!toB.ok ? "B" : "B′") + " is not a basis for ℝ" + sup(n) + " (its vectors are linearly dependent), so the transition matrices do not exist." };
    }
    return { ok: true, n, toB, toB2, product: Matrix.multiply(toB2.P, toB.P) };
  }

  /* Convert a coordinate vector given in `from` ("B" or "B′") to the other basis, and back again. */
  function convert(cob, vIn, from) {
    const v = lift(vIn);
    const forward = from === "B" ? cob.toB2.P : cob.toB.P;
    const backward = from === "B" ? cob.toB.P : cob.toB2.P;
    const result = Matrix.multiplyVector(forward, v);
    const back = Matrix.multiplyVector(backward, result);
    return { result, back, roundTrip: Matrix.vectorsEqual(back, v) };
  }

  const VectorSpaces = {
    columns, linearCombination, span, independence, integerize,
    isBasis, coordinates, fromCoordinates, reduceOrExtend, changeOfBasis, convert,
    vName, linear, sup,
  };
  global.VectorSpaces = VectorSpaces;
  if (typeof module !== "undefined" && module.exports) module.exports = VectorSpaces;
})(typeof window !== "undefined" ? window : globalThis);
