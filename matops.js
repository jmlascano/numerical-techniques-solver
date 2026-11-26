/*
 * matops.js — Matrices and Matrix Operations (slides B2, Defs 2.6–2.24).
 *
 *   arithmetic        A + B, A − B, kA, kA + mB, AB (with each cᵢⱼ = Σ aᵢₖbₖⱼ), Aᵀ, tr(A),
 *                     each with a plain-language reason when the sizes do not allow it
 *   inverse           Gauss–Jordan on [A | I] → [I | A⁻¹]; stops when the left side gets a zero row
 *   elementary        the professor's notation:
 *                       E₁(c, k)     multiply row k by c
 *                       E₂(k, j)     interchange rows k and j
 *                       E₃(c, k, j)  add c times row k to row j
 *   decomposition     Eₚ⋯E₂E₁A = I, so A = E₁⁻¹E₂⁻¹⋯Eₚ⁻¹ (Thm 2.24, Problem A.3)
 *
 * Row and column numbers in this file's public results are 1-based, as written on the page.
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const RR = global.RowReduce || require("./rowreduce.js");
  const Matrix = global.Matrix || require("./matrix.js");
  const { sub, factor, linear, toMatrix } = RR;

  const ZWSP = "\u200B";
  const sizeText = (M) => M.length + " × " + M[0].length;
  const undefinedResult = (expr, reason) => ({ ok: false, expr, reason: expr + " is undefined: " + reason });

  /* "2A − B", "A + B", "5A" */
  function comboName(k, m) {
    const terms = [{ c: k, s: "A" }];
    if (m) terms.push({ c: m, s: "B" });
    return linear(terms);
  }

  /* kA + mB (m may be null for kA). */
  function combine(k, Ain, m, Bin) {
    k = Fraction.from(k);
    const A = toMatrix(Ain);
    const expr = comboName(k, m === null || m === undefined ? null : Fraction.from(m));
    if (m === null || m === undefined) return { ok: true, expr, result: Matrix.scale(k, A) };
    m = Fraction.from(m);
    const B = toMatrix(Bin);
    if (A.length !== B.length || A[0].length !== B[0].length) {
      return undefinedResult(expr, "A is " + sizeText(A) + " and B is " + sizeText(B) + "; A and B must have the same size.");
    }
    return { ok: true, expr, result: Matrix.add(Matrix.scale(k, A), Matrix.scale(m, B)) };
  }

  /*
   * AB with the work for every entry:
   * entries[i][j] = { name: "c₁₂", sum: "3·(−1) + 0·2", value }
   */
  function product(Ain, Bin) {
    const A = toMatrix(Ain);
    const B = toMatrix(Bin);
    if (A[0].length !== B.length) {
      return undefinedResult("AB", "A is " + sizeText(A) + " and B is " + sizeText(B) + "; the number of columns of A must equal the number of rows of B.");
    }
    const result = Matrix.multiply(A, B);
    const entries = result.map((row, i) => row.map((value, j) => ({
      name: "c" + sub(i + 1) + sub(j + 1),
      sum: A[i].map((a, k) => factor(a) + "·" + factor(B[k][j])).join(" + "),
      value,
    })));
    return { ok: true, expr: "AB", result, entries, size: sizeText(A) + " times " + sizeText(B) + " gives " + sizeText(result) };
  }

  function transpose(Ain) {
    const A = toMatrix(Ain);
    return { ok: true, expr: "Aᵀ", result: Matrix.transpose(A) };
  }

  function trace(Ain) {
    const A = toMatrix(Ain);
    if (A.length !== A[0].length) return undefinedResult("tr(A)", "A is " + sizeText(A) + "; the trace is defined only for square matrices.");
    const diag = A.map((row, i) => row[i]);
    const value = diag.reduce((s, x) => s.add(x));
    return { ok: true, expr: "tr(A)", diag, sum: diag.map((x) => (x.isNegative() ? "(" + x.toDisplay() + ")" : x.toDisplay())).join(" + "), value };
  }

  /* Does row i of M have zeros in its first n entries? */
  const leftZeroRow = (M, n) => M.findIndex((row) => row.slice(0, n).every((x) => x.isZero()));

  /*
   * Inverse by Gauss–Jordan on [A | I]. Returns
   *   { ok: true,  start, steps, end, inverse, check (A·A⁻¹) }
   *   { ok: false, start, steps, end, zeroRow, reason }   singular: stopped when the left side got a zero row
   */
  function inverse(Ain) {
    const A = toMatrix(Ain);
    const n = A.length;
    if (n !== A[0].length) return undefinedResult("A⁻¹", "A is " + sizeText(A) + "; only square matrices can have an inverse.");
    const I = Matrix.identity(n, A[0][0]);
    const start = A.map((row, i) => row.concat(I[i]));
    const red = RR.rref(start);

    // Stop at the first matrix whose left side has a row of zeros.
    let zeroRow = leftZeroRow(start, n);
    let cut = zeroRow === -1 ? -1 : 0;
    if (cut === -1) {
      for (let s = 0; s < red.steps.length; s++) {
        const z = leftZeroRow(red.steps[s].matrix, n);
        if (z !== -1) {
          zeroRow = z;
          cut = s + 1;
          break;
        }
      }
    }
    if (cut !== -1) {
      const steps = red.steps.slice(0, cut);
      const end = steps.length ? steps[steps.length - 1].matrix : start;
      return {
        ok: false, start, steps, end, zeroRow, n,
        reason: "Row " + (zeroRow + 1) + " of the left side is all zeros, so the left side can never become I. A is singular (not invertible).",
      };
    }
    const end = red.rref;
    const inv = end.map((row) => row.slice(n));
    return { ok: true, start, steps: red.steps, end, inverse: inv, n, check: Matrix.multiply(A, inv) };
  }

  /* ---------- Elementary matrices (1-based k, j as on the slides) ---------- */

  function E1(c, k, n) {
    c = Fraction.from(c);
    if (c.isZero()) throw new RangeError("E₁(c, k) needs c ≠ 0");
    const E = Matrix.identity(n);
    E[k - 1][k - 1] = c;
    return E;
  }

  function E2(k, j, n) {
    if (k === j) throw new RangeError("E₂(k, j) needs k ≠ j");
    const E = Matrix.identity(n);
    [E[k - 1], E[j - 1]] = [E[j - 1], E[k - 1]];
    return E;
  }

  function E3(c, k, j, n) {
    if (k === j) throw new RangeError("E₃(c, k, j) needs k ≠ j");
    const E = Matrix.identity(n);
    E[j - 1][k - 1] = Fraction.from(c);
    return E;
  }

  const arg = (c) => c.toDisplay();
  const label = {
    E1: (c, k) => "E₁(" + arg(c) + ", " + k + ")",
    E2: (k, j) => "E₂(" + k + ", " + j + ")",
    E3: (c, k, j) => "E₃(" + arg(c) + ", " + k + ", " + j + ")",
  };
  const meaning = {
    E1: (c, k) => "multiply row " + k + " by " + arg(c),
    E2: (k, j) => "interchange rows " + k + " and " + j,
    E3: (c, k, j) => "add " + arg(c) + " times row " + k + " to row " + j,
  };

  /* One elementary matrix from its notation. type: 1 | 2 | 3. */
  function elementary(type, n, c, k, j) {
    if (type === 1) return { name: label.E1(Fraction.from(c), k), meaning: meaning.E1(Fraction.from(c), k), matrix: E1(c, k, n) };
    if (type === 2) return { name: label.E2(k, j), meaning: meaning.E2(k, j), matrix: E2(k, j, n) };
    return { name: label.E3(Fraction.from(c), k, j), meaning: meaning.E3(Fraction.from(c), k, j), matrix: E3(c, k, j, n) };
  }

  /* The elementary matrix of a row-reduction step, and its inverse. */
  function fromStep(op, n) {
    if (op.type === "swap") {
      const k = op.i + 1, j = op.j + 1;
      const e = { name: label.E2(k, j), matrix: E2(k, j, n) };
      return { e, inv: e };
    }
    if (op.type === "scale") {
      const k = op.i + 1;
      const ci = op.c.reciprocal();
      return { e: { name: label.E1(op.c, k), matrix: E1(op.c, k, n) }, inv: { name: label.E1(ci, k), matrix: E1(ci, k, n) } };
    }
    const k = op.source + 1, j = op.target + 1;
    const ci = op.c.neg();
    return { e: { name: label.E3(op.c, k, j), matrix: E3(op.c, k, j, n) }, inv: { name: label.E3(ci, k, j), matrix: E3(ci, k, j, n) } };
  }

  /*
   * A as a product of elementary matrices.
   *   { ok: true, steps: [{ text, matrix, e: {name, matrix}, inv: {name, matrix} }],
   *     reduced: "Eₚ⋯E₂E₁A = I", product: "A = E₁⁻¹E₂⁻¹⋯Eₚ⁻¹", value (the product), check }
   *   { ok: false, reason }  when A is singular
   */
  function asElementaryProduct(Ain) {
    const A = toMatrix(Ain);
    const n = A.length;
    if (n !== A[0].length) return { ok: false, reason: "A is " + sizeText(A) + "; only a square invertible matrix is a product of elementary matrices." };
    const red = RR.rref(A);
    if (red.rank < n) {
      return { ok: false, red, reason: "The reduced row echelon form of A is not I (it has a row of zeros), so A is singular and is not a product of elementary matrices (Thm 2.24)." };
    }
    const steps = red.steps.map((s) => Object.assign({ text: s.text, matrix: s.matrix, rows: s.rows }, fromStep(s.op, n)));
    const p = steps.length;
    const value = steps.length ? steps.map((s) => s.inv.matrix).reduce((P, M) => Matrix.multiply(P, M)) : Matrix.identity(n);
    return {
      ok: true,
      steps,
      // ZWSP (U+200B) between factors lets a long product wrap on a phone without showing a space.
      reduced: (p ? steps.map((_, i) => "E" + sub(p - i)).join(ZWSP) + ZWSP : "") + "A = I",
      productText: "A = " + (p ? steps.map((_, i) => "E" + sub(i + 1) + "⁻¹").join(ZWSP) : "I"),
      value,
      check: Matrix.equals(value, A),
    };
  }

  const MatOps = { ZWSP, combine, product, transpose, trace, inverse, elementary, E1, E2, E3, asElementaryProduct, sizeText };
  global.MatOps = MatOps;
  if (typeof module !== "undefined" && module.exports) module.exports = MatOps;
})(typeof window !== "undefined" ? window : globalThis);
