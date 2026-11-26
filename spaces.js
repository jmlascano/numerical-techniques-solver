/*
 * spaces.js — row space, column space and null space of an m×n matrix (Anton §4.7).
 *
 *   row space    basis = the nonzero rows of R = rref(A)
 *   column space basis = the columns of the ORIGINAL A in the pivot positions of R
 *                (row operations change the column space but preserve the dependency
 *                relations among the columns)
 *   null space   solve Ax = 0 via Rx = 0; one basis vector per free variable
 *   rank(A) + nullity(A) = n   (Dimension Theorem for Matrices)
 *
 * All arithmetic is exact and field-generic: Fraction entries, or Surd entries
 * (for example λI − A when λ = 2 + √3).
 */
(function (global) {
  "use strict";

  const RR = global.RowReduce || require("./rowreduce.js");
  const Matrix = global.Matrix || require("./matrix.js");
  const { sub, linear, toMatrix, zeroOf, oneOf } = RR;

  /* Parameter names: t; s, t; r, s, t; then t₁, t₂, … for four or more. */
  function paramNames(k) {
    if (k === 1) return ["t"];
    if (k === 2) return ["s", "t"];
    if (k === 3) return ["r", "s", "t"];
    return Array.from({ length: k }, (_, i) => "t" + sub(i + 1));
  }

  const xName = (j) => "x" + sub(j + 1);

  /*
   * Null space from R = rref(A) and its pivot columns.
   * Returns {
   *   leading: [col], free: [col], params: ["s", "t"],
   *   equations: [{ equation: "x₁ − 2x₄ + 3x₅ = 0", solved: "x₁ = 2x₄ − 3x₅" }],
   *   general: ["2s − 3t", "s", …]   one expression per variable x₁…xₙ,
   *   basis: [{ param: "s", free: col, vector: [Fraction] }]
   * }
   */
  function nullSpace(R, pivots, n) {
    const isPivot = new Set(pivots);
    const free = [];
    for (let j = 0; j < n; j++) if (!isPivot.has(j)) free.push(j);
    const params = paramNames(free.length);
    const paramOf = new Map(free.map((f, k) => [f, params[k]]));

    const equations = pivots.map((p, i) => {
      const lhs = [];
      for (let j = 0; j < n; j++) lhs.push({ c: R[i][j], s: xName(j) });
      const rhs = free.map((f) => ({ c: R[i][f].neg(), s: xName(f) }));
      return { equation: linear(lhs) + " = 0", solved: xName(p) + " = " + linear(rhs) };
    });

    const general = [];
    for (let j = 0; j < n; j++) {
      if (paramOf.has(j)) {
        general.push(paramOf.get(j));
      } else {
        const i = pivots.indexOf(j);
        general.push(linear(free.map((f) => ({ c: R[i][f].neg(), s: paramOf.get(f) }))));
      }
    }

    const like = R[0][0];
    const basis = free.map((f, k) => {
      const v = Array.from({ length: n }, () => zeroOf(like));
      v[f] = oneOf(like);
      pivots.forEach((p, i) => {
        v[p] = R[i][f].neg();
      });
      return { param: params[k], free: f, vector: v };
    });

    return { leading: pivots.slice(), free, params, equations, general, basis };
  }

  /*
   * analyze(A) -> {
   *   m, n, A, reduction: { steps, rref, pivots, rank },
   *   rowBasis: [[Fraction]],                       nonzero rows of R
   *   colBasis: [{ col, vector: [Fraction] }],      columns of A at the pivots
   *   nullSpace: (see above),
   *   rank, nullity, dimensionTheoremHolds,
   *   checks: [{ param, vector, product, isZero }]  A·v for each null space basis vector
   * }
   */
  function analyze(Ain) {
    const A = toMatrix(Ain);
    const m = A.length;
    const n = m ? A[0].length : 0;
    if (m === 0 || n === 0 || A.some((row) => row.length !== n)) {
      throw new Error("A must be a nonempty m×n matrix with every row the same length");
    }

    const reduction = RR.rref(A);
    const R = reduction.rref;
    const pivots = reduction.pivots;
    const rank = reduction.rank;

    const rowBasis = R.slice(0, rank).map((row) => row.slice());
    const colBasis = pivots.map((c) => ({ col: c, vector: A.map((row) => row[c]) }));
    const ns = nullSpace(R, pivots, n);
    const nullity = ns.basis.length;

    const checks = ns.basis.map(({ param, vector }) => {
      const product = Matrix.multiplyVector(A, vector);
      return { param, vector, product, isZero: product.every((x) => x.isZero()) };
    });

    return {
      m,
      n,
      A,
      reduction,
      rowBasis,
      colBasis,
      nullSpace: ns,
      rank,
      nullity,
      dimensionTheoremHolds: rank + nullity === n,
      checks,
    };
  }

  const Spaces = { analyze, nullSpace, paramNames };

  global.Spaces = Spaces;
  if (typeof module !== "undefined" && module.exports) module.exports = Spaces;
})(typeof window !== "undefined" ? window : globalThis);
