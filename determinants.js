/*
 * determinants.js — the three methods chosen for the Determinants topic
 * (Problem Set items 4a, 4b, 6; Anton Ch. 2):
 *
 *   (a) definition   Σ over every permutation σ of (1 … n) of sgn(σ)·a₁σ₁a₂σ₂⋯aₙσₙ,
 *                    sign from the number of inversions; n ≤ 4 (24 terms)
 *   (b) cofactors    expansion along a chosen row or column; minors written out down to 2 × 2
 *                    for n ≤ 4, top level only for n = 5, 6
 *   (c) adjoint      cofactor matrix, adj(A) = Cᵀ, A·adj(A) = det(A)·I, A⁻¹ = (1/det A)·adj(A)
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const RR = global.RowReduce || require("./rowreduce.js");
  const Matrix = global.Matrix || require("./matrix.js");
  const { sub, sup, factor, toMatrix } = RR;

  const MAX_DEFINITION = 4;
  const MAX_WRITTEN = 4; // cofactor expansion written out to 2 × 2 up to this size

  /* All permutations of [0 … n−1] in lexicographic order. */
  function permutations(n) {
    const out = [];
    const used = new Array(n).fill(false);
    const cur = [];
    (function go() {
      if (cur.length === n) {
        out.push(cur.slice());
        return;
      }
      for (let v = 0; v < n; v++) {
        if (used[v]) continue;
        used[v] = true;
        cur.push(v);
        go();
        cur.pop();
        used[v] = false;
      }
    })();
    return out;
  }

  const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));

  function inversions(p) {
    let k = 0;
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) k++;
    return k;
  }

  /*
   * (a) By definition. Returns
   *   { ok: true, n, rows: [{ perm: "(2, 1, 3)", inversions, parity, sign, product: "a₁₂a₂₁a₃₃", factors: "(−1)·1·(−1)", value, signed }], sum, value }
   *   { ok: false, n, reason }  for n > 4
   */
  function byDefinition(Ain) {
    const A = toMatrix(Ain);
    const n = A.length;
    if (n > MAX_DEFINITION) {
      return { ok: false, n, reason: "The definition has n! terms: " + n + "! = " + factorial(n) + " for a " + n + " × " + n + " matrix, too many to list. Use cofactor expansion or the adjoint method instead (this method is limited to 4 × 4, which has 24 terms)." };
    }
    const rows = permutations(n).map((p) => {
      const inv = inversions(p);
      const even = inv % 2 === 0;
      const value = p.map((c, r) => A[r][c]).reduce((x, y) => x.mul(y));
      return {
        perm: "(" + p.map((c) => c + 1).join(", ") + ")",
        inversions: inv,
        parity: even ? "even" : "odd",
        sign: even ? "+" : "−",
        product: p.map((c, r) => "a" + sub(r + 1) + sub(c + 1)).join(""),
        factors: p.map((c, r) => factor(A[r][c])).join("·"),
        value,
        signed: even ? value : value.neg(),
      };
    });
    const value = rows.map((r) => r.signed).reduce((x, y) => x.add(y));
    return { ok: true, n, rows, value };
  }

  /* "(−1)¹⁺²" */
  const signText = (i, j) => "(−1)" + sup(i + 1 + "+" + (j + 1));

  /*
   * (b) Cofactor expansion along row/column `index` (0-based), written out recursively.
   * Returns a tree:
   *   { n, along, index, matrix, value,
   *     twoByTwo: null | { a, b, c, d, text: "(a)(d) − (b)(c)" },        for a 2 × 2 matrix
   *     terms: [{ i, j, entry, minor, minorName: "M₁₂", sign, signText, cofactor, product,
   *               expansion: <tree for the minor> | null }] }
   * Minors are expanded along their first row while the original size is at most 4.
   */
  function cofactorTree(M, along, index, written, depth) {
    const n = M.length;
    const node = { n, along, index, matrix: M, terms: [], twoByTwo: null };
    if (n === 1) {
      node.value = M[0][0];
      return node;
    }
    if (n === 2) {
      const [[a, b], [c, d]] = M;
      node.twoByTwo = { a, b, c, d, text: factor(a) + "·" + factor(d) + " − " + factor(b) + "·" + factor(c) };
      node.value = a.mul(d).sub(b.mul(c));
      if (depth > 0) return node;
    }
    const ex = Matrix.cofactorExpansion(M, along, index);
    node.terms = ex.terms.map((t) => ({
      i: t.i,
      j: t.j,
      entry: t.entry,
      minor: t.minor,
      minorName: "M" + sub(t.i + 1) + sub(t.j + 1),
      cofactorName: "C" + sub(t.i + 1) + sub(t.j + 1),
      sign: t.sign,
      signText: signText(t.i, t.j),
      minorDet: t.minorDet,
      cofactor: t.cofactor,
      product: t.product,
      expansion: written && t.minor.length >= 2 ? cofactorTree(t.minor, "row", 0, written, depth + 1) : null,
    }));
    node.value = ex.value;
    return node;
  }

  function byCofactors(Ain, along, index) {
    const A = toMatrix(Ain);
    const n = A.length;
    const written = n <= MAX_WRITTEN;
    const tree = cofactorTree(A, along || "row", index || 0, written, 0);
    return { ok: true, n, written, tree, value: tree.value };
  }

  /*
   * (c) Adjoint method. Returns {
   *   n, cofactors: [[{ minorName, cofactorName, signText, minorDet, cofactor }]], C, adj,
   *   product (A·adj A), det, invertible, inverse | null, check (A·A⁻¹) | null
   * }
   */
  function byAdjoint(Ain) {
    const A = toMatrix(Ain);
    const n = A.length;
    const C = Matrix.cofactorMatrix(A);
    const cofactors = A.map((row, i) => row.map((_, j) => {
      const minorDet = n === 1 ? Fraction.ONE : Matrix.det(Matrix.minor(A, i, j));
      return { minorName: "M" + sub(i + 1) + sub(j + 1), cofactorName: "C" + sub(i + 1) + sub(j + 1), signText: signText(i, j), minorDet, cofactor: C[i][j] };
    }));
    const adj = Matrix.transpose(C);
    const product = Matrix.multiply(A, adj);
    const det = product[0][0];
    const invertible = !det.isZero();
    const inverse = invertible ? Matrix.scale(det.reciprocal(), adj) : null;
    return { n, cofactors, C, adj, product, det, invertible, inverse, check: inverse ? Matrix.multiply(A, inverse) : null };
  }

  const Determinants = { byDefinition, byCofactors, byAdjoint, permutations, inversions, MAX_DEFINITION, MAX_WRITTEN };
  global.Determinants = Determinants;
  if (typeof module !== "undefined" && module.exports) module.exports = Determinants;
})(typeof window !== "undefined" ? window : globalThis);
