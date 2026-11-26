/*
 * diagonalization.js — Diagonalization and Cayley–Hamilton (slides E, Defs 5.7–5.8, Thms 5.9–5.12).
 *
 * Diagonalization, the slides' "Procedure for Diagonalizing a Matrix":
 *   1. a basis for each eigenspace (eigen.js); merge them into S. If |S| < n, A is not diagonalizable.
 *   2. P = [p₁ … pₙ] (eigenvalues largest first, each eigenspace's basis in the D3 order).
 *   3. P⁻¹ by Gauss–Jordan, D = diag(λ₁ … λₙ); check P⁻¹AP = D and AP = PD.
 *   Powers: Aᵏ = PDᵏP⁻¹, checked against repeated multiplication.
 *
 * Cayley–Hamilton (Thm 5.12):
 *   p(λ) = det(λIₙ − A) = c₀ + c₁λ + … + cₙλⁿ;  Q(λ) = adj(λIₙ − A) = Q₀ + Q₁λ + … + Qₙ₋₁λⁿ⁻¹
 *   (CONTEXT-v3 Q1: the adjoint, as the slides define it), with Q(λ)(λIₙ − A) = p(λ)Iₙ;
 *   p(A) = 0 term by term; Aᵏ as a combination of I, A, …, Aⁿ⁻¹ by using the characteristic
 *   equation repeatedly; A⁻¹ = −(1/c₀)(c₁I + c₂A + … + cₙAⁿ⁻¹) when c₀ ≠ 0.
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const Surd = global.Surd || require("./surd.js").Surd;
  const RR = global.RowReduce || require("./rowreduce.js");
  const Matrix = global.Matrix || require("./matrix.js");
  const MatOps = global.MatOps || require("./matops.js");
  const Eigen = global.Eigen || require("./eigen.js");
  const { sup } = RR;

  function matrixPower(A, k) {
    let R = Matrix.identity(A.length, A[0][0]);
    for (let i = 0; i < k; i++) R = Matrix.multiply(R, A);
    return R;
  }

  /* ---------- Diagonalization ---------- */

  /*
   * diagonalize(A, k?) ->
   *   { ok: false, reason: "complex" | "unsolved" | "deficient", eigen }
   *   { ok: true, eigen, d (surd radicand or null), P, D, inverse (matops), PinvAP, AP, PD,
   *     checkD, checkAPPD, distinct, powers: null | { k, Dk, Ak, direct, check } }
   */
  function diagonalize(Ain, k) {
    const eigen = Eigen.analyze(Ain, k);
    const n = eigen.n;
    if (eigen.complex) return { ok: false, reason: "complex", eigen };
    if (eigen.unsolved) return { ok: false, reason: "unsolved", eigen };
    const total = eigen.eigenvalues.reduce((s, e) => s + e.geometric, 0);
    if (total < n) return { ok: false, reason: "deficient", eigen, total };

    const surd = eigen.eigenvalues.find((e) => e.value instanceof Surd);
    const d = surd ? surd.value.d : null;
    const lift = (x) => (d ? Surd.of(x, d) : x);
    const A = eigen.A.map((row) => row.map(lift));
    const cols = [];
    const diag = [];
    eigen.eigenvalues.forEach((e) => e.basis.forEach((v) => {
      cols.push(v.map(lift));
      diag.push(lift(e.value));
    }));
    const P = cols[0].map((_, i) => cols.map((c) => c[i]));
    const D = Matrix.zeros(n, n, A[0][0]).map((row, i) => row.map((z, j) => (i === j ? diag[i] : z)));
    const inverse = MatOps.inverse(P);
    const Pinv = inverse.inverse;
    const PinvAP = Matrix.multiply(Matrix.multiply(Pinv, A), P);
    const AP = Matrix.multiply(A, P);
    const PD = Matrix.multiply(P, D);
    const out = {
      ok: true, eigen, n, d, A, P, D, diag, inverse, Pinv, PinvAP, AP, PD,
      checkD: Matrix.equals(PinvAP, D),
      checkAPPD: Matrix.equals(AP, PD),
      distinct: eigen.eigenvalues.length === n,
    };
    if (k !== undefined && k !== null) {
      const Dk = D.map((row, i) => row.map((z, j) => (i === j ? Eigen.power(diag[i], k) : z)));
      const Ak = Matrix.multiply(Matrix.multiply(P, Dk), Pinv);
      const direct = matrixPower(A, k);
      out.powers = { k, Dk, Ak, direct, check: Matrix.equals(Ak, direct) };
    }
    return out;
  }

  /* ---------- Cayley–Hamilton ---------- */

  const powName = (j) => (j === 0 ? "I" : j === 1 ? "A" : "A" + sup(j));
  /* "27A + 10I": a combination of I, A, …, Aᵐ from coefficients indexed by power. */
  function comboText(coeffs) {
    const terms = [];
    for (let j = coeffs.length - 1; j >= 0; j--) terms.push({ c: coeffs[j], s: powName(j) });
    return RR.linear(terms);
  }
  function comboValue(coeffs, powers) {
    return coeffs.reduce((S, c, j) => Matrix.add(S, Matrix.scale(c, powers[j])), Matrix.zeros(powers[0].length, powers[0].length));
  }

  /*
   * cayleyHamilton(A, k?) -> {
   *   n, A, C, p, coeffs [c₀ … cₙ], Q (adj(λI − A)), Qk [Q₀ … Qₙ₋₁], QC (Q(λ)(λI − A)), checkQ,
   *   powers [I, A, …, Aⁿ], terms [{ k, c, power, term }], pA (sum), checkZero,
   *   reduction: null | { k, lines: [string], coeffs, value, direct, check },
   *   inverse: { exists, lines, coeffs, value, check }
   * }
   */
  function cayleyHamilton(Ain, k) {
    const ch = Eigen.characteristic(Ain);
    const { A, C, p } = ch;
    const n = A.length;
    const coeffs = Array.from({ length: n + 1 }, (_, j) => p.coeff(j));
    const Q = Matrix.adjoint(C);
    const Qk = Array.from({ length: n }, (_, j) => Q.map((row) => row.map((q) => q.coeff(j))));
    const QC = Matrix.multiply(Q, C);
    const pI = Matrix.identity(n).map((row) => row.map((x) => (x.isZero() ? p.zero() : p)));
    const powers = [Matrix.identity(n)];
    for (let j = 1; j <= n; j++) powers.push(Matrix.multiply(powers[j - 1], A));
    const terms = coeffs.map((c, j) => ({ k: j, c, power: powers[j], term: Matrix.scale(c, powers[j]) }));
    const pA = terms.map((t) => t.term).reduce((S, T) => Matrix.add(S, T));
    const out = Object.assign({}, ch, {
      n, coeffs, Q, Qk, QC, checkQ: Matrix.equals(QC, pI), powers, terms, pA, checkZero: Matrix.isZeroMatrix(pA),
    });

    // From p(A) = 0 (monic): Aⁿ = −(c₀I + c₁A + … + cₙ₋₁Aⁿ⁻¹).
    const An = coeffs.slice(0, n).map((c) => c.neg());
    const lines = ["p(A) = " + comboText(coeffs) + " = 0, so " + powName(n) + " = " + comboText(An)];

    if (k !== undefined && k !== null && k >= n) {
      let cur = An.slice();
      for (let m = n; m < k; m++) {
        // A·Aᵐ: every power goes up by one; the Aⁿ term is replaced using the characteristic equation.
        const shifted = [Fraction.ZERO].concat(cur.slice(0, n - 1));
        const top = cur[n - 1];
        const shiftedText = comboText(shifted.concat([top]));
        const next = shifted.map((c, j) => c.add(top.mul(An[j])));
        lines.push(powName(m + 1) + " = A·" + powName(m) + " = " + shiftedText + (top.isZero() ? "" : " = " + comboText(next)));
        cur = next;
      }
      const value = comboValue(cur, powers);
      const direct = matrixPower(A, k);
      out.reduction = { k, lines, coeffs: cur, text: powName(k) + " = " + comboText(cur), value, direct, check: Matrix.equals(value, direct) };
    } else if (k !== undefined && k !== null) {
      out.reduction = { k, lines: [], coeffs: null, text: null, value: matrixPower(A, k), direct: matrixPower(A, k), check: true, belowN: true };
    } else {
      out.reduction = null;
    }

    // A⁻¹ from p(A) = 0: A(c₁I + c₂A + … + cₙAⁿ⁻¹) = −c₀I.
    const c0 = coeffs[0];
    const inner = coeffs.slice(1); // coefficient of Aʲ inside the bracket is cⱼ₊₁
    const inv = { exists: !c0.isZero(), lines: [] };
    inv.lines.push(comboText(coeffs) + " = 0");
    if (inv.exists) {
      inv.lines.push("A(" + comboText(inner) + ") = " + RR.linear([{ c: c0.neg(), s: "I" }]));
      const factorK = c0.neg().reciprocal();
      inv.coeffs = inner.map((c) => c.mul(factorK));
      inv.lines.push("A⁻¹ = " + RR.coef(factorK) + "(" + comboText(inner) + ") = " + comboText(inv.coeffs));
      inv.value = comboValue(inv.coeffs, powers);
      inv.check = Matrix.equals(Matrix.multiply(A, inv.value), Matrix.identity(n));
    }
    out.inverse = inv;
    return out;
  }

  const Diagonalization = { diagonalize, cayleyHamilton, matrixPower, comboText, powName };
  global.Diagonalization = Diagonalization;
  if (typeof module !== "undefined" && module.exports) module.exports = Diagonalization;
})(typeof window !== "undefined" ? window : globalThis);
