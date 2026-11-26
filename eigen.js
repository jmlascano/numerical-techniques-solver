/*
 * eigen.js — Eigenvalues and Eigenvectors (slides E, Def 5.1, Thms 5.2–5.6).
 *
 *   characteristic   λIₙ − A as a matrix of polynomials, det(λIₙ − A) by cofactor expansion
 *                    along row 1 (matrix.js), then p(λ) factored over ℚ (poly.js)
 *   eigenvalues      the real roots of p(λ), rational or a ± b√d, largest first, with their
 *                    algebraic multiplicity. Complex roots are written exactly (CONTEXT-v3 Q3)
 *                    and marked as not real; a factor of degree ≥ 3 with no rational root is
 *                    reported as not solvable exactly here.
 *   eigenspaces      (λI − A)x = 0 by row reduction (spaces.js), over Surd when λ is a surd
 *   extras           eigenvalues of Aᵏ (Thm 5.4), invertibility (Thm 5.6), triangular A (Thm 5.3)
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const Surd = global.Surd || require("./surd.js").Surd;
  const Poly = global.Poly || require("./poly.js").Poly;
  const Matrix = global.Matrix || require("./matrix.js");
  const Spaces = global.Spaces || require("./spaces.js");

  const liftM = (A) => A.map((row) => row.map((x) => Fraction.from(x)));

  function isTriangular(A) {
    const n = A.length;
    let upper = true;
    let lower = true;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i > j && !A[i][j].isZero()) upper = false;
        if (i < j && !A[i][j].isZero()) lower = false;
      }
    }
    return upper ? "upper" : lower ? "lower" : null;
  }

  function power(x, k) {
    let r = typeof x.one === "function" ? x.one() : Fraction.ONE;
    for (let i = 0; i < k; i++) r = r.mul(x);
    return r;
  }

  /* p(λ) = det(λIₙ − A), with the expansion along row 1 and the factorization. */
  function characteristic(Ain) {
    const A = liftM(Ain);
    const C = Poly.characteristicMatrix(A);
    const expansion = Matrix.cofactorExpansion(C, "row", 0);
    const p = expansion.value;
    return { A, C, expansion, p, factorization: p.factor() };
  }

  /* λI − A evaluated at a number λ (Fraction or Surd); entries lifted to Surd when λ is a surd. */
  function shifted(C, lam) {
    const M = C.map((row) => row.map((q) => q.evaluate(lam)));
    return lam instanceof Surd ? Surd.liftMatrix(M, lam.d) : M;
  }

  /*
   * analyze(A, k?) -> {
   *   n, A, C, expansion, p, factorization,
   *   eigenvalues: [{ value, algebraic, geometric, matrix (λI − A), analysis (spaces.js), basis: [vector], checks: [bool] }],
   *   complex: null | { re, im, text, factor },  unsolved: null | { factor },
   *   triangular: null | "upper" | "lower", det, invertible,
   *   powers: null | { k, values: [{ value, power, algebraic }] }
   * }
   */
  function analyze(Ain, k) {
    const ch = characteristic(Ain);
    const { A, C, p, factorization } = ch;
    const n = A.length;
    const roots = factorization.roots.slice().sort((x, y) => Surd.compare(y.value, x.value));
    const eigenvalues = roots.map(({ value, multiplicity }) => {
      const M = shifted(C, value);
      const analysis = Spaces.analyze(M);
      const basis = analysis.nullSpace.basis.map((b) => b.vector);
      const AL = value instanceof Surd ? Surd.liftMatrix(A, value.d) : A;
      const checks = basis.map((v) => Matrix.vectorsEqual(Matrix.multiplyVector(AL, v), v.map((x) => x.mul(value))));
      return { value, algebraic: multiplicity, geometric: basis.length, matrix: M, analysis, basis, checks };
    });
    const un = factorization.unresolved;
    const complex = un && un.reason === "complex" ? Object.assign({ factor: un.poly }, un.complex) : null;
    const unsolved = un && un.reason === "no-rational-roots" ? { factor: un.poly } : null;
    const det = Matrix.det(A);
    const out = Object.assign({}, ch, {
      n,
      eigenvalues,
      complex,
      unsolved,
      triangular: isTriangular(A),
      det,
      invertible: !det.isZero(),
      zeroIsEigenvalue: p.coeff(0).isZero(),
    });
    if (k !== undefined && k !== null) {
      out.powers = { k, values: eigenvalues.map((e) => ({ value: e.value, power: power(e.value, k), algebraic: e.algebraic })) };
    }
    return out;
  }

  const Eigen = { analyze, characteristic, shifted, isTriangular, power };
  global.Eigen = Eigen;
  if (typeof module !== "undefined" && module.exports) module.exports = Eigen;
})(typeof window !== "undefined" ? window : globalThis);
