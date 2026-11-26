/*
 * lintrans.js — Linear Transformations (slides D4, Defs 4.33–4.44, Thms 4.36–4.45).
 *
 * A transformation T: ℝⁿ → ℝᵐ is given by its standard matrix A (m × n). Polynomials and
 * matrices are entered as coordinate vectors (the natural isomorphism), e.g. p(x) = c₀ + c₁x + c₂x²
 * as (c₀, c₁, c₂).
 *
 *   fromBasisImages   T(v₁) … T(vₙ) on a basis (Thm 4.36): T(x) = c₁T(v₁) + … + cₙT(vₙ) where
 *                     (x)_B = (c₁ … cₙ); standard matrix A = [T(v₁) … T(vₙ)]·[v₁ … vₙ]⁻¹
 *   kernelRange       Ker(T) = null space of A, R(T) = column space of A (spaces.js),
 *                     rank(T) + nullity(T) = n (Thm 4.40), one-to-one / onto / isomorphism
 *   relativeMatrix    [T]_{B′,B} has columns [T(uⱼ)]_{B′}: row reduce [B′ | T(u₁) … T(uₙ)]
 *                     → [I | [T]_{B′,B}]; T(x) found indirectly in 3 steps for a given x
 *   composition       T₂ ∘ T₁ has matrix A₂A₁
 *   inverse           T⁻¹ exists when T is bijective; its matrix is A⁻¹ (matops.js)
 */
(function (global) {
  "use strict";

  const Fraction = global.Fraction || require("./fraction.js").Fraction;
  const RR = global.RowReduce || require("./rowreduce.js");
  const Matrix = global.Matrix || require("./matrix.js");
  const Spaces = global.Spaces || require("./spaces.js");
  const MatOps = global.MatOps || require("./matops.js");
  const VS = global.VectorSpaces || require("./vectorspaces.js");

  const lift = (v) => v.map((x) => Fraction.from(x));
  const liftM = (M) => M.map(lift);
  const { columns, sup } = VS;
  const combo = (coeffs, vs) => vs[0].map((_, i) => vs.map((v, j) => coeffs[j].mul(v[i])).reduce((a, b) => a.add(b)));
  const R = (n) => "ℝ" + sup(n);

  /*
   * T from the images of a basis.
   *   { ok, n, m, V, images, coords (aug, reduction, c), Tx, work, inverse (matops result), A, checks }
   */
  function fromBasisImages(VIn, imagesIn, xIn) {
    const V = VIn.map(lift);
    const images = imagesIn.map(lift);
    const x = lift(xIn);
    const n = V.length;
    const m = images[0].length;
    const Vm = columns(V);
    const inverse = MatOps.inverse(Vm);
    if (!inverse.ok) {
      return { ok: false, n, m, reason: "{v₁, …, vₙ} is not a basis for " + R(n) + " (the vectors are linearly dependent), so the images do not determine T.", inverse };
    }
    const coords = VS.coordinates(V, x);
    const c = coords.coordinates;
    const Tx = combo(c, images);
    const Tm = columns(images);
    const A = Matrix.multiply(Tm, inverse.inverse);
    const checks = {
      Ax: Matrix.multiplyVector(A, x),
      basis: V.map((v, j) => Matrix.vectorsEqual(Matrix.multiplyVector(A, v), images[j])),
    };
    checks.ok = Matrix.vectorsEqual(checks.Ax, Tx) && checks.basis.every(Boolean);
    return { ok: true, n, m, V, images, x, coords, c, Tx, Tm, Vm, inverse, A, checks };
  }

  /* Kernel and range from the standard matrix. */
  function kernelRange(AIn) {
    const A = liftM(AIn);
    const m = A.length;
    const n = A[0].length;
    const analysis = Spaces.analyze(A);
    const oneToOne = analysis.nullity === 0;
    const onto = analysis.rank === m;
    return { m, n, A, analysis, oneToOne, onto, isomorphism: oneToOne && onto };
  }

  /*
   * [T]_{B′,B} for T with standard matrix A, B a basis of ℝⁿ, B′ a basis of ℝᵐ, and the
   * indirect computation of T(x).
   */
  function relativeMatrix(AIn, BIn, B2In, xIn) {
    const A = liftM(AIn);
    const B = BIn.map(lift);
    const B2 = B2In.map(lift);
    const x = lift(xIn);
    const m = A.length;
    const n = A[0].length;
    if (!VS.isBasis(B).basis) return { ok: false, reason: "B is not a basis for " + R(n) + "." };
    if (!VS.isBasis(B2).basis) return { ok: false, reason: "B′ is not a basis for " + R(m) + "." };
    const images = B.map((u) => Matrix.multiplyVector(A, u));
    const aug = columns(B2.concat(images));
    const reduction = RR.rref(aug);
    const M = reduction.rref.map((row) => row.slice(m));
    // The 3 steps for x
    const step1 = VS.coordinates(B, x); // [x]_B
    const xB = step1.coordinates;
    const TxB2 = Matrix.multiplyVector(M, xB); // [T(x)]_{B′}
    const Tx = combo(TxB2, B2); // T(x)
    const Ax = Matrix.multiplyVector(A, x);
    return { ok: true, m, n, A, B, B2, images, aug, reduction, M, x, step1, xB, TxB2, Tx, Ax, check: Matrix.vectorsEqual(Tx, Ax) };
  }

  /* T₂ ∘ T₁ with T₁: ℝⁿ → ℝᵏ (matrix A₁, k × n) and T₂: ℝᵏ → ℝᵐ (matrix A₂, m × k). */
  function composition(A1In, A2In) {
    const A1 = liftM(A1In);
    const A2 = liftM(A2In);
    if (A2[0].length !== A1.length) {
      return {
        ok: false,
        reason: "T₂ ∘ T₁ is undefined: T₁ maps into " + R(A1.length) + " but T₂ is defined on " + R(A2[0].length) +
          "; the codomain of T₁ must be the domain of T₂ (columns of A₂ = rows of A₁).",
      };
    }
    const product = MatOps.product(A2, A1);
    return { ok: true, A1, A2, n: A1[0].length, k: A1.length, m: A2.length, product, matrix: product.result };
  }

  /* T⁻¹: exists exactly when T is one-to-one and onto. */
  function inverse(AIn) {
    const A = liftM(AIn);
    const m = A.length;
    const n = A[0].length;
    if (m !== n) {
      return { ok: false, square: false, reason: "T maps " + R(n) + " to " + R(m) + ". Spaces of different dimensions cannot be matched one-to-one and onto, so T has no inverse." };
    }
    const inv = MatOps.inverse(A);
    return { ok: inv.ok, square: true, A, inv, reason: inv.ok ? null : "A is singular, so T is not one-to-one (its kernel is not {0}) and T⁻¹ does not exist." };
  }

  const LinTrans = { fromBasisImages, kernelRange, relativeMatrix, composition, inverse };
  global.LinTrans = LinTrans;
  if (typeof module !== "undefined" && module.exports) module.exports = LinTrans;
})(typeof window !== "undefined" ? window : globalThis);
