/*
 * rowreduce.js — elementary row operations, their written form, and Gauss–Jordan
 * elimination on any m×n matrix. Shared by lu.js (B3) and spaces.js (D3).
 *
 * Field-generic: entries may be any exact number type with add, sub, mul, div, neg,
 * isZero, equals and toDisplay (Fraction, Surd). One and zero are taken from the
 * entries themselves (x.one() / x.zero() when present, else Fraction).
 *
 * Operation text uses the course notation:
 *   R₁ ↔ R₃          interchange two rows
 *   R₂ → (1/3)R₂     multiply a row by a nonzero constant
 *   R₂ → R₂ − 2R₁    add a multiple of one row to another
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;

  /* ---------- Field helpers ---------- */

  const zeroOf = (x) => (x && typeof x.zero === "function" ? x.zero() : Fraction.ZERO);
  const oneOf = (x) => (x && typeof x.one === "function" ? x.one() : Fraction.ONE);
  const isOne = (x) => (typeof x.isOne === "function" ? x.isOne() : x.equals(oneOf(x)));
  const isNeg = (x) => (typeof x.isNegative === "function" ? x.isNegative() : false);
  const absOf = (x) => (isNeg(x) ? x.neg() : x);
  const isPlainInt = (x) => typeof x.isInteger === "function" && x.isInteger() && !isNeg(x);
  const reciprocal = (x) => oneOf(x).div(x);

  /* Keep field elements as they are; turn integers, BigInts and strings into Fractions. */
  function lift(x) {
    return x !== null && typeof x === "object" && typeof x.add === "function" ? x : Fraction.from(x);
  }

  /* ---------- Formatting ---------- */

  const SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

  /* Subscript digits: sub(12) -> "₁₂" */
  function sub(n) {
    return String(n).split("").map((d) => SUB[Number(d)]).join("");
  }

  /* A coefficient written in front of a symbol: "" for 1, "3", "(1/2)", "(−2/5)", "(2 + √3)". */
  function coef(f) {
    if (isOne(f)) return "";
    if (isPlainInt(f)) return f.toDisplay();
    return "(" + f.toDisplay() + ")";
  }

  /* A value used as a factor in a product: "3", "(−1)", "(9/2)". */
  function factor(f) {
    if (isPlainInt(f)) return f.toDisplay();
    return "(" + f.toDisplay() + ")";
  }

  /*
   * A linear combination, skipping zero coefficients.
   * terms: [{ c: Fraction, s: "x₁" }]  ->  "x₁ − (5/2)x₂ + 3x₃", or "0" if every c is 0.
   */
  function linear(terms) {
    let out = "";
    terms.forEach(({ c, s }) => {
      if (c.isZero()) return;
      const term = coef(absOf(c)) + s;
      if (out === "") out = (isNeg(c) ? "−" : "") + term;
      else out += (isNeg(c) ? " − " : " + ") + term;
    });
    return out === "" ? "0" : out;
  }

  const R = (i) => "R" + sub(i + 1);

  function scaleText(i, s) {
    if (isOne(s.neg())) return R(i) + " → −" + R(i);
    return R(i) + " → " + coef(s) + R(i);
  }

  /* Text for R_t → R_t − m·R_s (written with + when m is negative). */
  function addText(t, m, s) {
    return R(t) + " → " + R(t) + (isNeg(m) ? " + " : " − ") + coef(absOf(m)) + R(s);
  }

  function swapText(i, j) {
    return R(i) + " ↔ " + R(j);
  }

  /* ---------- Matrices and row operations (in place) ---------- */

  function toMatrix(A) {
    return A.map((row) => row.map(lift));
  }

  function clone(M) {
    return M.map((row) => row.slice());
  }

  function scaleRow(W, i, s) {
    W[i] = W[i].map((x) => x.mul(s));
  }

  /* R_t → R_t − m·R_s */
  function subtractMultiple(W, t, m, s) {
    W[t] = W[t].map((x, j) => x.sub(m.mul(W[s][j])));
  }

  function swapRows(W, i, j) {
    const tmp = W[i];
    W[i] = W[j];
    W[j] = tmp;
  }

  /* ---------- Gauss–Jordan elimination ---------- */

  /*
   * rref(A) -> { steps, rref, pivots, rank }
   *
   * Anton's two phases:
   *   forward:  left to right, find a nonzero entry at or below the current row
   *             (interchange rows if needed), make it a leading 1, zero the entries below it;
   *   backward: from the last leading 1 up, zero the entries above each leading 1.
   *
   * Each step: { kind: "swap" | "scale" | "add", phase: "forward" | "backward",
   *              text, rows (indices changed), matrix (after the step) }
   * pivots: 0-based column index of each leading 1, top to bottom.
   */
  function rref(Ain) {
    const W = clone(toMatrix(Ain));
    const m = W.length;
    const n = m ? W[0].length : 0;
    const steps = [];
    const pivots = [];
    const record = (kind, phase, text, rows) => steps.push({ kind, phase, text, rows, matrix: clone(W) });

    let r = 0;
    for (let c = 0; c < n && r < m; c++) {
      let p = r;
      while (p < m && W[p][c].isZero()) p++;
      if (p === m) continue;

      if (p !== r) {
        swapRows(W, p, r);
        record("swap", "forward", swapText(r, p), [r, p]);
      }
      const pivot = W[r][c];
      if (!isOne(pivot)) {
        const s = reciprocal(pivot);
        scaleRow(W, r, s);
        record("scale", "forward", scaleText(r, s), [r]);
      }
      for (let i = r + 1; i < m; i++) {
        const v = W[i][c];
        if (v.isZero()) continue;
        subtractMultiple(W, i, v, r);
        record("add", "forward", addText(i, v, r), [i]);
      }
      pivots.push(c);
      r++;
    }

    for (let k = pivots.length - 1; k >= 0; k--) {
      const c = pivots[k];
      for (let i = k - 1; i >= 0; i--) {
        const v = W[i][c];
        if (v.isZero()) continue;
        subtractMultiple(W, i, v, k);
        record("add", "backward", addText(i, v, k), [i]);
      }
    }

    return { steps, rref: W, pivots, rank: pivots.length };
  }

  const RowReduce = {
    zeroOf,
    oneOf,
    isOne,
    isNeg,
    absOf,
    reciprocal,
    lift,
    sub,
    coef,
    factor,
    linear,
    scaleText,
    addText,
    swapText,
    toMatrix,
    clone,
    scaleRow,
    subtractMultiple,
    swapRows,
    rref,
  };

  global.RowReduce = RowReduce;
  if (typeof module !== "undefined" && module.exports) module.exports = RowReduce;
})(typeof window !== "undefined" ? window : globalThis);
