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
 * All arithmetic is exact (Fraction). Matrices are arrays of rows of Fractions.
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || (typeof require !== "undefined" ? require("./fraction.js").Fraction : null);

  const SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
  function sub(n) {
    return String(n).split("").map((d) => SUB[Number(d)]).join("");
  }

  function clone(M) {
    return M.map((row) => row.slice());
  }

  function identityLike(n) {
    const M = [];
    for (let i = 0; i < n; i++) {
      M.push([]);
      for (let j = 0; j < n; j++) M[i].push(Fraction.ZERO);
    }
    return M;
  }

  function toMatrix(A) {
    return A.map((row) => row.map((x) => Fraction.from(x)));
  }

  function toVector(b) {
    return b.map((x) => Fraction.from(x));
  }

  /* "(1/2)", "(−2/5)", "3", "" (for 1) — a coefficient written in front of a symbol. */
  function coef(f) {
    if (f.isOne()) return "";
    if (f.isInteger() && !f.isNegative()) return f.toDisplay();
    return "(" + f.toDisplay() + ")";
  }

  /* A value written as a factor inside a product, parenthesized when it is not a plain nonnegative integer. */
  function factor(f) {
    if (f.isInteger() && !f.isNegative()) return f.toDisplay();
    return "(" + f.toDisplay() + ")";
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
        const t = A[p];
        A[p] = A[k];
        A[k] = t;
        det = det.neg();
      }
      det = det.mul(A[k][k]);
      for (let i = k + 1; i < n; i++) {
        if (A[i][k].isZero()) continue;
        const m = A[i][k].div(A[k][k]);
        for (let j = k; j < n; j++) A[i][j] = A[i][j].sub(m.mul(A[k][j]));
      }
    }
    return det;
  }

  /*
   * luDecompose(A) -> result
   *
   * On success:
   *   { ok: true, n, L, U, steps }
   * On failure (no row-exchange-free LU):
   *   { ok: false, reason, message, n, steps, column, singular, det }
   *   reason is "not-square" or "zero-pivot".
   *
   * Each step: { kind: "scale" | "eliminate", row, text, lNote, matrix }
   *   row    index of the row this step changed
   *   text   e.g. "R₂ → R₂ − (1/2)R₁"
   *   lNote  e.g. "L₂₁ = 1/2" (which entry of L this step determines)
   *   matrix the whole working matrix after the step
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
    const L = identityLike(n);
    const steps = [];

    for (let k = 0; k < n; k++) {
      const pivot = W[k][k];

      if (pivot.isZero()) {
        const det = determinant(A);
        const singular = det.isZero();
        const pos = "row " + (k + 1) + ", column " + (k + 1);
        let message =
          "The pivot in " + pos + " is 0" + (steps.length ? " after the steps above" : "") + ". " +
          "This method allows no row interchanges, so it cannot continue: A has no LU decomposition of this form.";
        if (singular) {
          message += " A is also singular (det A = 0), so Ax = b does not have a unique solution.";
        } else {
          message += " A is invertible (det A = " + det.toDisplay() + "), so a row interchange first would make it work (PA = LU), but that is a different method.";
        }
        return { ok: false, reason: "zero-pivot", message, n, steps, column: k, singular, det, matrix: clone(W) };
      }

      // (a) Scale row k so the pivot becomes a leading 1. L[k][k] = pivot.
      L[k][k] = pivot;
      if (!pivot.isOne()) {
        const s = pivot.reciprocal();
        for (let j = 0; j < n; j++) W[k][j] = W[k][j].mul(s);
        steps.push({
          kind: "scale",
          row: k,
          text: "R" + sub(k + 1) + " → " + coef(s) + "R" + sub(k + 1),
          lNote: "L" + sub(k + 1) + sub(k + 1) + " = " + pivot.toDisplay(),
          matrix: clone(W),
        });
      } else {
        steps.push({
          kind: "scale",
          row: k,
          row: k,
          text: "Pivot in row " + (k + 1) + " is already 1; no scaling needed",
          lNote: "L" + sub(k + 1) + sub(k + 1) + " = 1",
          matrix: null,
        });
      }

      // (b) Eliminate below the pivot. L[i][k] = the value eliminated.
      for (let i = k + 1; i < n; i++) {
        const m = W[i][k];
        L[i][k] = m;
        if (m.isZero()) {
          steps.push({
            kind: "eliminate",
            row: i,
            text: "Entry in row " + (i + 1) + ", column " + (k + 1) + " is already 0; no operation needed",
            lNote: "L" + sub(i + 1) + sub(k + 1) + " = 0",
            matrix: null,
          });
          continue;
        }
        for (let j = 0; j < n; j++) W[i][j] = W[i][j].sub(m.mul(W[k][j]));
        const sign = m.isNegative() ? " + " : " − ";
        steps.push({
          kind: "eliminate",
            row: i,
          text: "R" + sub(i + 1) + " → R" + sub(i + 1) + sign + coef(m.abs()) + "R" + sub(k + 1),
          lNote: "L" + sub(i + 1) + sub(k + 1) + " = " + m.toDisplay(),
          matrix: clone(W),
        });
      }
    }

    return { ok: true, n, L, U: W, steps };
  }

  /*
   * Forward substitution: solve Ly = b, L lower triangular with nonzero diagonal.
   * Returns { y, steps } where each step is { equation, work, value } (display strings).
   */
  function forwardSubstitution(Lin, bin) {
    const L = toMatrix(Lin);
    const b = toVector(bin);
    const n = L.length;
    const y = [];
    const steps = [];
    for (let i = 0; i < n; i++) {
      let sum = Fraction.ZERO;
      const known = [];
      for (let j = 0; j < i; j++) {
        if (L[i][j].isZero()) continue;
        sum = sum.add(L[i][j].mul(y[j]));
        known.push(factor(L[i][j]) + "·" + factor(y[j]));
      }
      y.push(b[i].sub(sum).div(L[i][i]));

      const equation = linearEquation(L[i], "y", 0, i, b[i]);
      const numer = known.length ? b[i].toDisplay() + " − [" + known.join(" + ") + "]" : b[i].toDisplay();
      const work = L[i][i].isOne() ? numer : (known.length ? "(" + numer + ")" : numer) + " / " + factor(L[i][i]);
      steps.push({ equation, work: "y" + sub(i + 1) + " = " + work, value: "y" + sub(i + 1) + " = " + y[i].toDisplay() });
    }
    return { y, steps };
  }

  /*
   * Back substitution: solve Ux = y, U upper triangular with nonzero diagonal
   * (with Anton's U the diagonal is all 1s, but this handles any nonzero diagonal).
   */
  function backSubstitution(Uin, yin) {
    const U = toMatrix(Uin);
    const y = toVector(yin);
    const n = U.length;
    const x = new Array(n);
    const steps = [];
    for (let i = n - 1; i >= 0; i--) {
      let sum = Fraction.ZERO;
      const known = [];
      for (let j = i + 1; j < n; j++) {
        if (U[i][j].isZero()) continue;
        sum = sum.add(U[i][j].mul(x[j]));
        known.push(factor(U[i][j]) + "·" + factor(x[j]));
      }
      x[i] = y[i].sub(sum).div(U[i][i]);

      const equation = linearEquation(U[i], "x", i, n - 1, y[i]);
      const numer = known.length ? y[i].toDisplay() + " − [" + known.join(" + ") + "]" : y[i].toDisplay();
      const work = U[i][i].isOne() ? numer : (known.length ? "(" + numer + ")" : numer) + " / " + factor(U[i][i]);
      steps.push({ equation, work: "x" + sub(i + 1) + " = " + work, value: "x" + sub(i + 1) + " = " + x[i].toDisplay() });
    }
    return { x, steps };
  }

  /* e.g. row [1, −5/2, 0], symbol "y", cols 0..1, rhs 0  ->  "y₁ − (5/2)y₂ = 0" */
  function linearEquation(row, symbol, from, to, rhs) {
    let out = "";
    for (let j = from; j <= to; j++) {
      const c = row[j];
      if (c.isZero()) continue;
      const term = coef(c.abs()) + symbol + sub(j + 1);
      if (out === "") out = (c.isNegative() ? "−" : "") + term;
      else out += (c.isNegative() ? " − " : " + ") + term;
    }
    if (out === "") out = "0";
    return out + " = " + rhs.toDisplay();
  }

  function multiply(Ain, Bin) {
    const A = toMatrix(Ain);
    const B = toMatrix(Bin);
    return A.map((row) =>
      B[0].map((_, j) => row.reduce((acc, a, k) => acc.add(a.mul(B[k][j])), Fraction.ZERO))
    );
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
