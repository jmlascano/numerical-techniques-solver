/*
 * lu.js — LU decomposition (Anton's convention) and triangular solves, with steps.
 *
 * Convention (Anton, Elementary Linear Algebra, 10th ed., "LU-Decompositions"):
 *   Reduce A to a row echelon form U using only
 *     (a) multiply a row by a nonzero constant, and
 *     (b) add a multiple of one row to a row BELOW it,
 *   with no row interchanges. U has leading 1s on its diagonal.
 *   L is lower triangular: each diagonal entry L[k][k] is the pivot that was scaled
 *   to 1, and each entry L[i][k] below it is the value that was eliminated from
 *   row i, column k. Then A = LU.
 *
 * All arithmetic is exact (Fraction). Row operations and their written form come
 * from rowreduce.js.
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const RR = global.RowReduce || require("./rowreduce.js");
  const { sub, factor, linear, toMatrix, clone } = RR;

  function toVector(b) {
    return b.map((x) => Fraction.from(x));
  }

  function zeros(n) {
    return Array.from({ length: n }, () => Array.from({ length: n }, () => Fraction.ZERO));
  }

  function isSquare(A) {
    return Array.isArray(A) && A.length > 0 && A.every((row) => Array.isArray(row) && row.length === A.length);
  }

  /* Exact determinant by elimination with row swaps (used only to classify a failed LU). */
  function determinant(Ain) {
    const A = clone(toMatrix(Ain));
    const n = A.length;
    let det = Fraction.ONE;
    for (let k = 0; k < n; k++) {
      let p = k;
      while (p < n && A[p][k].isZero()) p++;
      if (p === n) return Fraction.ZERO;
      if (p !== k) {
        RR.swapRows(A, p, k);
        det = det.neg();
      }
      det = det.mul(A[k][k]);
      for (let i = k + 1; i < n; i++) {
        if (!A[i][k].isZero()) RR.subtractMultiple(A, i, A[i][k].div(A[k][k]), k);
      }
    }
    return det;
  }

  /*
   * luDecompose(A) -> result
   *
   * On success:  { ok: true, n, L, U, steps }
   * On failure:  { ok: false, reason: "not-square" | "zero-pivot", message, n, steps, column, singular, det, matrix }
   *
   * Each step: { kind: "scale" | "add", rows, text, note, matrix }
   *   text   e.g. "R₂ → R₂ − (1/2)R₁"
   *   note   e.g. "L₂₁ = 1/2" (the entry of L this step determines)
   *   matrix the working matrix after the step, or null when no operation was needed
   */
  function luDecompose(Ain) {
    if (!isSquare(Ain)) {
      return {
        ok: false,
        reason: "not-square",
        message: "LU decomposition is defined here only for square matrices. A must have the same number of rows and columns.",
        steps: [],
      };
    }

    const A = toMatrix(Ain);
    const n = A.length;
    const W = clone(A);
    const L = zeros(n);
    const steps = [];
    const Lname = (i, k) => "L" + sub(i + 1) + sub(k + 1);

    for (let k = 0; k < n; k++) {
      const pivot = W[k][k];

      if (pivot.isZero()) {
        const det = determinant(A);
        const singular = det.isZero();
        let message =
          "The pivot in row " + (k + 1) + ", column " + (k + 1) + " is 0" + (steps.length ? " after the steps above" : "") + ". " +
          "This method allows no row interchanges, so it cannot continue: A has no LU decomposition of this form.";
        message += singular
          ? " A is also singular (det A = 0), so Ax = b does not have a unique solution."
          : " A is invertible (det A = " + det.toDisplay() + "), so a row interchange first would make it work (PA = LU), but that is a different method.";
        return { ok: false, reason: "zero-pivot", message, n, steps, column: k, singular, det, matrix: clone(W) };
      }

      // (a) Scale row k so the pivot becomes a leading 1. L[k][k] = pivot.
      L[k][k] = pivot;
      if (!pivot.isOne()) {
        const s = pivot.reciprocal();
        RR.scaleRow(W, k, s);
        steps.push({ kind: "scale", rows: [k], text: RR.scaleText(k, s), note: Lname(k, k) + " = " + pivot.toDisplay(), matrix: clone(W) });
      } else {
        steps.push({ kind: "scale", rows: [k], text: "Pivot in row " + (k + 1) + " is already 1; no scaling needed", note: Lname(k, k) + " = 1", matrix: null });
      }

      // (b) Eliminate below the pivot. L[i][k] = the value eliminated.
      for (let i = k + 1; i < n; i++) {
        const m = W[i][k];
        L[i][k] = m;
        if (m.isZero()) {
          steps.push({ kind: "add", rows: [i], text: "Entry in row " + (i + 1) + ", column " + (k + 1) + " is already 0; no operation needed", note: Lname(i, k) + " = 0", matrix: null });
          continue;
        }
        RR.subtractMultiple(W, i, m, k);
        steps.push({ kind: "add", rows: [i], text: RR.addText(i, m, k), note: Lname(i, k) + " = " + m.toDisplay(), matrix: clone(W) });
      }
    }

    return { ok: true, n, L, U: W, steps };
  }

  /*
   * Shared by forward and back substitution: solve row i of a triangular system for
   * its diagonal variable, given the variables already known.
   */
  function solveRow(M, rhs, i, known, symbol, from, to) {
    let sum = Fraction.ZERO;
    const products = [];
    for (let j = from; j <= to; j++) {
      if (j === i || M[i][j].isZero()) continue;
      sum = sum.add(M[i][j].mul(known[j]));
      products.push(factor(M[i][j]) + "·" + factor(known[j]));
    }
    const value = rhs.sub(sum).div(M[i][i]);
    const name = symbol + sub(i + 1);
    const numer = products.length ? rhs.toDisplay() + " − [" + products.join(" + ") + "]" : rhs.toDisplay();
    const work = M[i][i].isOne() ? numer : (products.length ? "(" + numer + ")" : numer) + " / " + factor(M[i][i]);
    const terms = [];
    for (let j = from; j <= to; j++) terms.push({ c: M[i][j], s: symbol + sub(j + 1) });
    return {
      value,
      step: { equation: linear(terms) + " = " + rhs.toDisplay(), work: name + " = " + work, value: name + " = " + value.toDisplay() },
    };
  }

  /* Solve Ly = b, L lower triangular with nonzero diagonal. Returns { y, steps }. */
  function forwardSubstitution(Lin, bin) {
    const L = toMatrix(Lin);
    const b = toVector(bin);
    const y = [];
    const steps = [];
    for (let i = 0; i < L.length; i++) {
      const r = solveRow(L, b[i], i, y, "y", 0, i);
      y[i] = r.value;
      steps.push(r.step);
    }
    return { y, steps };
  }

  /* Solve Ux = y, U upper triangular with nonzero diagonal. Returns { x, steps } (steps bottom row first). */
  function backSubstitution(Uin, yin) {
    const U = toMatrix(Uin);
    const y = toVector(yin);
    const n = U.length;
    const x = new Array(n);
    const steps = [];
    for (let i = n - 1; i >= 0; i--) {
      const r = solveRow(U, y[i], i, x, "x", i, n - 1);
      x[i] = r.value;
      steps.push(r.step);
    }
    return { x, steps };
  }

  function multiply(Ain, Bin) {
    const A = toMatrix(Ain);
    const B = toMatrix(Bin);
    return A.map((row) => B[0].map((_, j) => row.reduce((acc, a, k) => acc.add(a.mul(B[k][j])), Fraction.ZERO)));
  }

  function multiplyVector(Ain, vin) {
    const A = toMatrix(Ain);
    const v = toVector(vin);
    return A.map((row) => row.reduce((acc, a, k) => acc.add(a.mul(v[k])), Fraction.ZERO));
  }

  function matricesEqual(Ain, Bin) {
    const A = toMatrix(Ain);
    const B = toMatrix(Bin);
    return A.length === B.length && A.every((row, i) => row.length === B[i].length && row.every((a, j) => a.equals(B[i][j])));
  }

  function vectorsEqual(ain, bin) {
    const a = toVector(ain);
    const b = toVector(bin);
    return a.length === b.length && a.every((x, i) => x.equals(b[i]));
  }

  /* Full pipeline. b may be null to decompose only. */
  function solve(A, b) {
    const lu = luDecompose(A);
    const result = { lu };
    if (!lu.ok) return result;
    result.check = { LU: multiply(lu.L, lu.U) };
    result.check.luEqualsA = matricesEqual(result.check.LU, A);
    if (b) {
      result.forward = forwardSubstitution(lu.L, b);
      result.back = backSubstitution(lu.U, result.forward.y);
      result.check.Ax = multiplyVector(A, result.back.x);
      result.check.axEqualsB = vectorsEqual(result.check.Ax, b);
    }
    return result;
  }

  const LU = {
    luDecompose,
    forwardSubstitution,
    backSubstitution,
    multiply,
    multiplyVector,
    matricesEqual,
    vectorsEqual,
    determinant,
    solve,
    sub,
  };

  global.LU = LU;
  if (typeof module !== "undefined" && module.exports) module.exports = LU;
})(typeof window !== "undefined" ? window : globalThis);
