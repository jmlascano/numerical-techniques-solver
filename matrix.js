/*
 * matrix.js — generic matrix helpers shared by every topic.
 *
 * Entries may be any exact type with add, sub, mul, neg, isZero, equals and
 * toDisplay: Fraction, Surd, or Poly (polynomials in λ). Division is never used
 * here, so the cofactor determinant and adjoint also work for polynomial entries
 * such as λI − A.
 *
 * Plain numbers and strings are turned into Fractions (RowReduce.lift).
 */
(function (global) {
  "use strict";

  const RR = global.RowReduce || require("./rowreduce.js");
  const { zeroOf, oneOf, lift } = RR;

  const toMatrix = (A) => A.map((row) => row.map(lift));
  const toVector = (v) => v.map(lift);
  const size = (A) => [A.length, A.length ? A[0].length : 0];

  /* n×n identity whose entries have the same type as `like` (default Fraction). */
  function identity(n, like) {
    const z = zeroOf(like);
    const o = oneOf(like);
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? o : z)));
  }

  function zeros(m, n, like) {
    const z = zeroOf(like);
    return Array.from({ length: m }, () => Array.from({ length: n }, () => z));
  }

  /* Sum of a nonempty list of field elements. */
  function sum(list) {
    return list.reduce((acc, x) => acc.add(x));
  }

  function multiply(Ain, Bin) {
    const A = toMatrix(Ain);
    const B = toMatrix(Bin);
    if (A[0].length !== B.length) throw new RangeError("multiply: columns of A must equal rows of B");
    return A.map((row) => B[0].map((_, j) => sum(row.map((a, k) => a.mul(B[k][j])))));
  }

  function multiplyVector(Ain, vin) {
    const A = toMatrix(Ain);
    const v = toVector(vin);
    if (A[0].length !== v.length) throw new RangeError("multiplyVector: columns of A must equal the length of v");
    return A.map((row) => sum(row.map((a, k) => a.mul(v[k]))));
  }

  function add(A, B) {
    return toMatrix(A).map((row, i) => row.map((a, j) => a.add(lift(B[i][j]))));
  }

  function subtract(A, B) {
    return toMatrix(A).map((row, i) => row.map((a, j) => a.sub(lift(B[i][j]))));
  }

  function scale(k, A) {
    k = lift(k);
    return toMatrix(A).map((row) => row.map((a) => k.mul(a)));
  }

  function transpose(Ain) {
    const A = toMatrix(Ain);
    return A[0].map((_, j) => A.map((row) => row[j]));
  }

  function equals(Ain, Bin) {
    const A = toMatrix(Ain);
    const B = toMatrix(Bin);
    return A.length === B.length && A.every((row, i) => row.length === B[i].length && row.every((a, j) => a.equals(B[i][j])));
  }

  function vectorsEqual(ain, bin) {
    const a = toVector(ain);
    const b = toVector(bin);
    return a.length === b.length && a.every((x, i) => x.equals(b[i]));
  }

  function isZeroMatrix(A) {
    return A.every((row) => row.every((x) => x.isZero()));
  }

  /* The matrix left after deleting row i and column j (0-based). */
  function minor(A, i, j) {
    return A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
  }

  const signOf = (i, j) => ((i + j) % 2 === 0 ? 1 : -1);

  /* Determinant by cofactor expansion along the first row (recursive, no division). */
  function det(Ain) {
    const A = toMatrix(Ain);
    const n = A.length;
    if (n === 0 || A.some((row) => row.length !== n)) throw new RangeError("det: A must be square");
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0].mul(A[1][1]).sub(A[0][1].mul(A[1][0]));
    let total = zeroOf(A[0][0]);
    for (let j = 0; j < n; j++) {
      if (A[0][j].isZero()) continue;
      const t = A[0][j].mul(det(minor(A, 0, j)));
      total = signOf(0, j) > 0 ? total.add(t) : total.sub(t);
    }
    return total;
  }

  /*
   * One level of cofactor expansion, along row `index` (along = "row") or column `index`
   * (along = "col"), 0-based. Returns {
   *   along, index,
   *   terms: [{ i, j, entry, sign (+1 | −1), minor, minorDet, cofactor, product }],
   *   value
   * }
   * cofactor = (−1)^(i+j)·minorDet, product = entry·cofactor, value = Σ product.
   */
  function cofactorExpansion(Ain, along, index) {
    const A = toMatrix(Ain);
    const n = A.length;
    along = along || "row";
    index = index || 0;
    const terms = [];
    for (let k = 0; k < n; k++) {
      const i = along === "row" ? index : k;
      const j = along === "row" ? k : index;
      const M = minor(A, i, j);
      const minorDet = n === 1 ? oneOf(A[0][0]) : det(M);
      const sign = signOf(i, j);
      const cofactor = sign > 0 ? minorDet : minorDet.neg();
      terms.push({ i, j, entry: A[i][j], sign, minor: M, minorDet, cofactor, product: A[i][j].mul(cofactor) });
    }
    return { along, index, terms, value: sum(terms.map((t) => t.product)) };
  }

  /* Matrix of cofactors C[i][j] = (−1)^(i+j)·det(Mᵢⱼ). */
  function cofactorMatrix(Ain) {
    const A = toMatrix(Ain);
    const n = A.length;
    if (n === 1) return [[oneOf(A[0][0])]];
    return A.map((row, i) => row.map((_, j) => {
      const m = det(minor(A, i, j));
      return signOf(i, j) > 0 ? m : m.neg();
    }));
  }

  /* adj(A) = (matrix of cofactors)ᵀ */
  function adjoint(A) {
    return transpose(cofactorMatrix(A));
  }

  const Matrix = {
    toMatrix,
    toVector,
    size,
    identity,
    zeros,
    multiply,
    multiplyVector,
    add,
    subtract,
    scale,
    transpose,
    equals,
    vectorsEqual,
    isZeroMatrix,
    minor,
    det,
    cofactorExpansion,
    cofactorMatrix,
    adjoint,
  };

  global.Matrix = Matrix;
  if (typeof module !== "undefined" && module.exports) module.exports = Matrix;
})(typeof window !== "undefined" ? window : globalThis);
