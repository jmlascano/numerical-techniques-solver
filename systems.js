/*
 * systems.js — Systems of Linear Equations (slides AB1, Thms 1.2–1.3, Defs 1.6–1.7).
 *
 * Gaussian elimination brings the augmented matrix [A | b] to a row echelon form
 * with leading 1s (rowreduce.js forward phase). Then:
 *   - a leading 1 in the b column means a row 0 = 1: the system is inconsistent;
 *   - otherwise back-substitution (Thm 1.2) runs from the last nonzero row up, and the
 *     system has a unique solution (every variable leading) or infinitely many
 *     (some variables free, Def 1.7).
 *
 * Solutions are affine expressions in the free variables: constant + Σ coefficient·(free variable).
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const RR = global.RowReduce || require("./rowreduce.js");
  const Matrix = global.Matrix || require("./matrix.js");
  const { sub, factor, linear, toMatrix } = RR;

  /* Variable names: x₁ … xₙ (default), or letters x; x, y; x, y, z; w, x, y, z (falls back to x₁ … for n ≥ 5). */
  function variableNames(n, style) {
    if (style === "letters") {
      const letters = { 1: ["x"], 2: ["x", "y"], 3: ["x", "y", "z"], 4: ["w", "x", "y", "z"] }[n];
      if (letters) return letters;
    }
    return Array.from({ length: n }, (_, j) => "x" + sub(j + 1));
  }

  /* ---------- Affine expressions: { c: Fraction, t: [Fraction per variable] } ---------- */

  const affConst = (c, n) => ({ c, t: Array.from({ length: n }, () => Fraction.ZERO) });
  function affVar(j, n) {
    const a = affConst(Fraction.ZERO, n);
    a.t[j] = Fraction.ONE;
    return a;
  }
  const affAdd = (x, y) => ({ c: x.c.add(y.c), t: x.t.map((v, j) => v.add(y.t[j])) });
  const affScale = (k, x) => ({ c: k.mul(x.c), t: x.t.map((v) => k.mul(v)) });
  const affIsConst = (x) => x.t.every((v) => v.isZero());

  /* "5 + y − 2z", "−1", "y" */
  function affDisplay(x, names) {
    const terms = linear(x.t.map((c, j) => ({ c, s: names[j] })));
    if (terms === "0") return x.c.toDisplay();
    if (x.c.isZero()) return terms;
    return x.c.toDisplay() + (terms.startsWith("−") ? " − " + terms.slice(1) : " + " + terms);
  }

  /*
   * solve(A, b, names?) -> {
   *   m, n, names, aug,
   *   reduction: { steps, ref, pivots },
   *   status: "unique" | "infinite" | "inconsistent",
   *   badRow: index of the 0 = 1 row (inconsistent),
   *   leading: [col], free: [col],
   *   zeroRows: [row index of 0 = 0 rows],
   *   back: [{ variable, equation, substitution|null, result }]   bottom row first,
   *   solution: [affine per variable], values: [Fraction] (unique only),
   *   check: { particular, Ax, ok, directions: [{ free, vector, Av, ok }] }
   * }
   */
  function solve(Ain, bin, namesIn) {
    const A = toMatrix(Ain);
    const b = bin.map((x) => Fraction.from(x));
    const m = A.length;
    const n = A[0].length;
    const names = namesIn || variableNames(n);
    const aug = A.map((row, i) => row.concat([b[i]]));
    const red = RR.ref(aug);
    const W = red.ref;
    const result = { m, n, names, aug, reduction: { steps: red.steps, ref: W, pivots: red.pivots } };

    const badIndex = red.pivots.indexOf(n);
    if (badIndex !== -1) {
      return Object.assign(result, { status: "inconsistent", badRow: badIndex, leading: [], free: [], zeroRows: [], back: [] });
    }

    const leading = red.pivots.slice();
    const free = [];
    for (let j = 0; j < n; j++) if (!leading.includes(j)) free.push(j);
    const zeroRows = [];
    for (let i = leading.length; i < m; i++) zeroRows.push(i);

    // Back-substitution from the last leading row up.
    const solution = new Array(n);
    free.forEach((j) => {
      solution[j] = affVar(j, n);
    });
    const back = [];
    for (let i = leading.length - 1; i >= 0; i--) {
      const p = leading[i];
      const rhs = W[i][n];
      const lhsTerms = [];
      for (let j = p; j < n; j++) lhsTerms.push({ c: W[i][j], s: names[j] });
      const equation = linear(lhsTerms) + " = " + rhs.toDisplay();

      let value = affConst(rhs, n);
      const shown = [];
      for (let j = p + 1; j < n; j++) {
        const a = W[i][j];
        if (a.isZero()) continue;
        value = affAdd(value, affScale(a.neg(), solution[j]));
        const known = solution[j];
        const isFreeName = free.includes(j);
        let what;
        if (isFreeName) what = names[j];
        else if (affIsConst(known)) what = factor(known.c);
        else what = "(" + affDisplay(known, names) + ")";
        shown.push(factor(a) + "·" + what);
      }
      solution[p] = value;
      back.push({
        variable: names[p],
        equation,
        substitution: shown.length ? names[p] + " = " + rhs.toDisplay() + " − [" + shown.join(" + ") + "]" : null,
        result: names[p] + " = " + affDisplay(value, names),
      });
    }

    const status = free.length ? "infinite" : "unique";
    Object.assign(result, { status, leading, free, zeroRows, back, solution });

    // Check: the particular solution (free variables = 0) satisfies Ax = b;
    // each direction (one free variable = 1, the others 0, constant dropped) satisfies Av = 0.
    const particular = solution.map((x) => x.c);
    const Ax = Matrix.multiplyVector(A, particular);
    const check = { particular, Ax, ok: Matrix.vectorsEqual(Ax, b), directions: [] };
    free.forEach((f) => {
      const v = solution.map((x) => x.t[f]);
      const Av = Matrix.multiplyVector(A, v);
      check.directions.push({ free: f, vector: v, Av, ok: Av.every((x) => x.isZero()) });
    });
    result.check = check;
    if (status === "unique") result.values = particular;
    return result;
  }

  const Systems = { solve, variableNames, affDisplay };
  global.Systems = Systems;
  if (typeof module !== "undefined" && module.exports) module.exports = Systems;
})(typeof window !== "undefined" ? window : globalThis);
