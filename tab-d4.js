/*
 * tab-d4.js — Linear Transformations tab: T from basis images, kernel and range,
 * matrix relative to bases, composition, inverse.
 * Math: lintrans.js (on vectorspaces.js, spaces.js, matops.js). Rendering primitives: render.js.
 */
(function () {
  "use strict";

  const R = Render;
  const { sub } = RowReduce;
  const sup = VectorSpaces.sup;

  /* The first test case for each task (CONTEXT-v3 §4, D4). Bases and images are entered as columns. */
  const EXAMPLES = {
    // basis {(1,1,1), (1,1,0), (1,0,0)}, images (1,0), (2,−1), (4,3), x = (2,−3,5)
    images: { n: 3, m: 2, v: [[1, 1, 1], [1, 1, 0], [1, 0, 0]], t: [[1, 2, 4], [0, -1, 3]], x: [[2], [-3], [5]] },
    // D3 Test 1 matrix
    kernel: { n: 5, m: 4, a: [[1, -2, 0, 0, 3], [2, -5, -3, -2, 6], [0, 5, 15, 10, 0], [2, 6, 18, 8, 6]] },
    // Anton Example 2: T(x₁,x₂) = (x₂, −5x₁ + 13x₂, −7x₁ + 16x₂), B = {(3,1), (5,2)}, B′ = {(1,0,−1), (−1,2,2), (0,1,2)}
    relative: { n: 2, m: 3, a: [[0, 1], [-5, 13], [-7, 16]], b: [[3, 5], [1, 2]], b2: [[1, -1, 0], [0, 2, 1], [-1, 2, 2]], x: [[1], [1]] },
    // T₁(p) = x·p(x): P₂ → P₃, then T₂ = d/dx: P₃ → P₂ (coordinates in the standard bases)
    compose: { a1: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], a2: [[0, 1, 0, 0], [0, 0, 2, 0], [0, 0, 0, 3]] },
    // the Problem A matrix
    inverse: { n: 3, m: 3, a: [[2, -1, 3], [1, -3, -2], [3, 2, -1]] },
  };
  const BLOCKS = { images: ["v", "t", "x"], kernel: ["a"], relative: ["a", "b", "b2", "x"], compose: ["a1", "a2"], inverse: ["a"] };
  const NAMES = { v: "Basis", t: "Images", a: "A", b: "B", b2: "B′", x: "x", a1: "A₁", a2: "A₂" };

  const $ = (id) => document.getElementById(id);
  const form = $("d4-form");
  const modeSelect = $("d4-mode");
  const nSelect = $("d4-n");
  const mSelect = $("d4-m");
  const keys = ["v", "t", "a", "b", "b2", "x", "a1", "a2"];
  const grids = Object.fromEntries(keys.map((k) => [k, $("d4-grid-" + k)]));
  const sizes = { a1: [$("d4-a1-rows"), $("d4-a1-cols")], a2: [$("d4-a2-rows"), $("d4-a2-cols")] };
  const solveButton = $("d4-solve");
  const message = $("d4-message");
  const results = $("d4-results");
  const body = $("d4-body");
  const heading = $("d4-results-heading");
  const update = R.requireFilled(solveButton, $("d4-hint"), form, "compute");

  R.fillSelect(nSelect, 1, 6, 3);
  R.fillSelect(mSelect, 1, 6, 2);
  Object.values(sizes).forEach(([r, c]) => {
    R.fillSelect(r, 1, 6, 3);
    R.fillSelect(c, 1, 6, 3);
  });
  const Rk = (k) => "ℝ" + sup(k);

  function shape(key) {
    const n = Number(nSelect.value);
    const m = Number(mSelect.value);
    return {
      v: [n, n], t: [m, n], a: [m, n], b: [n, n], b2: [m, m], x: [n, 1],
      a1: sizes.a1.map((s) => Number(s.value)), a2: sizes.a2.map((s) => Number(s.value)),
    }[key];
  }

  function build(keep, only) {
    (only || keys).forEach((key) => {
      const [r, c] = shape(key);
      const many = key !== "x";
      R.buildInputGrid(grids[key], r, c, (i, j) => NAMES[key] + (many ? ", column " + (j + 1) : "") + ", entry " + (i + 1), keep);
    });
    $("d4-label-v").textContent = "v₁ … v" + sub(Number(nSelect.value));
    $("d4-label-t").textContent = "T(v₁) … T(v" + sub(Number(nSelect.value)) + ")";
    R.clearErrors(message, form);
    update();
  }

  function sync() {
    const mode = modeSelect.value;
    keys.forEach((key) => {
      $("d4-block-" + key).hidden = !BLOCKS[mode].includes(key);
    });
    $("d4-n-field").hidden = mode === "compose";
    $("d4-m-field").hidden = mode === "compose";
    R.clearErrors(message, form);
    results.hidden = true;
    update();
  }

  function fail(title, text) {
    const s = R.section(title);
    s.classList.add("block-fail");
    s.appendChild(R.para(text, "fail-text"));
    body.appendChild(s);
  }

  function reduction(s, start, name, red, augment, pivots) {
    s.appendChild(R.scroller(R.labeled(name, start, { augment })));
    if (red.steps.length) s.appendChild(R.stepList(red.steps, null, { augment }));
    else s.appendChild(R.para("It is already in reduced row echelon form, so no row operations are needed.", "check-line"));
    s.appendChild(R.scroller(R.labeled("R", red.rref, { augment, highlightCols: pivots ? red.pivots : [] })));
  }

  /* ---------- Tasks ---------- */

  function renderImages(res) {
    if (!res.ok) return fail("The basis", res.reason);
    const n = res.n;
    const s1 = R.section("1. Coordinates of x relative to the basis", "Write x = c₁v₁ + … + cₙvₙ by row reducing [v₁ … vₙ | x].");
    reduction(s1, res.coords.aug, "[v₁ … v" + sub(n) + " | x]", res.coords.reduction, n, false);
    s1.appendChild(R.para(res.c.map((c, j) => "c" + sub(j + 1) + " = " + c.toDisplay()).join(",  "), "verdict"));
    body.appendChild(s1);

    const s2 = R.section("2. T(x) = c₁T(v₁) + … + cₙT(vₙ)", "T is linear, so it is determined by the images of a basis (Thm 4.36).");
    s2.appendChild(R.para("T(x) = " + res.c.map((c, j) => RowReduce.factor(c) + R.tuple(res.images[j])).join(" + "), "subst-work"));
    s2.appendChild(R.para("T" + R.tuple(res.x) + " = " + R.tuple(res.Tx), "answer-line"));
    body.appendChild(s2);

    const s3 = R.section(
      "3. The standard matrix",
      "With V = [v₁ … vₙ] and T(V) = [T(v₁) … T(vₙ)], AV = T(V), so A = T(V)·V⁻¹."
    );
    s3.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("T(V)", res.Tm)), R.scroller(R.labeled("V⁻¹", res.inverse.inverse))]));
    const inv = R.el("div", {});
    reduction(inv, res.inverse.start, "[V | I]", { steps: res.inverse.steps, rref: res.inverse.end, pivots: [] }, n, false);
    s3.appendChild(R.disclosure("Show the Gauss–Jordan steps for V⁻¹", [inv]));
    s3.appendChild(R.scroller(R.labeled("A", res.A)));
    body.appendChild(s3);

    const s4 = R.section("4. Check");
    s4.appendChild(R.para("Ax = " + R.tuple(res.checks.Ax) + (Matrix.vectorsEqual(res.checks.Ax, res.Tx) ? " = T(x)." : ". This does not match T(x); please report it."), "check-line"));
    s4.appendChild(R.para(res.checks.basis.every(Boolean) ? "Avᵢ = T(vᵢ) for every basis vector." : "Avᵢ ≠ T(vᵢ) for some basis vector. This is a bug; please report it.", "verdict"));
    body.appendChild(s4);
  }

  function renderKernel(res) {
    const an = res.analysis;
    const ns = an.nullSpace;
    const s1 = R.section("1. Row reduce A", "Ker(T) is the null space of A and R(T) is the column space of A, so both come from the reduced row echelon form.");
    reduction(s1, res.A, "A", an.reduction, undefined, true);
    body.appendChild(s1);

    const s2 = R.section("2. The kernel: solve Ax = 0");
    if (ns.basis.length) {
      s2.appendChild(R.para("Free variables: " + ns.free.map((f) => "x" + sub(f + 1)).join(", ") + ". Let " + ns.free.map((f, k) => "x" + sub(f + 1) + " = " + ns.params[k]).join(", ") + ":", "check-line"));
      const parts = ["x", "=", R.matrix(ns.general)].concat(["="]);
      ns.basis.forEach((b, k) => parts.push(R.term((k ? "+ " : "") + b.param, R.matrix(b.vector))));
      s2.appendChild(R.scroller(R.mathRow(parts, "general solution")));
      s2.appendChild(R.para("A basis for Ker(T):", "check-line"));
      s2.appendChild(R.vectors(ns.basis.map((b, k) => ({ name: "k" + sub(k + 1), vector: b.vector }))));
    } else {
      s2.appendChild(R.para("There are no free variables, so Ker(T) = {0}. Its basis is empty.", "verdict"));
    }
    body.appendChild(s2);

    const s3 = R.section("3. The range: the column space of A", "The columns of A in the pivot positions (in blue) form a basis for R(T).");
    if (an.colBasis.length) {
      s3.appendChild(R.scroller(R.labeled("A", res.A, { highlightCols: an.reduction.pivots })));
      s3.appendChild(R.vectors(an.colBasis.map((c) => ({ name: "c" + sub(c.col + 1), vector: c.vector }))));
    } else {
      s3.appendChild(R.para("A has no pivot columns, so R(T) = {0}.", "verdict"));
    }
    body.appendChild(s3);

    const s4 = R.section("4. Rank, nullity and what T is");
    s4.appendChild(R.el("dl", { class: "facts" }, [
      R.el("dt", { text: "rank(T)" }), R.el("dd", { text: an.rank + "  (dimension of R(T))" }),
      R.el("dt", { text: "nullity(T)" }), R.el("dd", { text: an.nullity + "  (dimension of Ker(T))" }),
    ]));
    s4.appendChild(R.para("rank(T) + nullity(T) = " + an.rank + " + " + an.nullity + " = " + (an.rank + an.nullity) + " = n, the dimension of the domain " + Rk(res.n) + " (Thm 4.40).", "verdict"));
    s4.appendChild(R.para(res.oneToOne ? "Ker(T) = {0}, so T is one-to-one." : "Ker(T) ≠ {0}, so T is not one-to-one.", "check-line"));
    s4.appendChild(R.para(res.onto ? "rank(T) = " + res.m + " = m, so R(T) = " + Rk(res.m) + " and T is onto." : "rank(T) = " + an.rank + " < m = " + res.m + ", so T is not onto " + Rk(res.m) + ".", "check-line"));
    s4.appendChild(R.para(res.isomorphism ? "T is one-to-one and onto, so it is an isomorphism." : "T is not an isomorphism.", "verdict"));
    body.appendChild(s4);
  }

  function renderRelative(res) {
    if (!res.ok) return fail("The bases", res.reason);
    const { m, n } = res;
    const s1 = R.section("1. The images of the vectors of B", "T(uⱼ) = Auⱼ.");
    s1.appendChild(R.scroller(R.labeled("A", res.A)));
    s1.appendChild(R.vectors(res.images.map((v, j) => ({ name: "T(u" + sub(j + 1) + ")", vector: v }))));
    body.appendChild(s1);

    const s2 = R.section(
      "2. Their coordinates relative to B′",
      "The columns of [T](B′, B) are [T(u₁)](B′), …, [T(uₙ)](B′). Row reduce [B′ | T(u₁) … T(uₙ)] → [I | [T](B′, B)]."
    );
    reduction(s2, res.aug, "[B′ | T(u₁) … T(u" + sub(n) + ")]", res.reduction, m, false);
    s2.appendChild(R.scroller(R.labeled("[T](B′, B)", res.M)));
    body.appendChild(s2);

    const s3 = R.section("3. Finding T(x) indirectly", "x = " + R.tuple(res.x) + ", in three steps.");
    const ol = R.el("ol", { class: "subst" });
    ol.appendChild(R.el("li", {}, [
      R.el("div", { class: "subst-eq", text: "Coordinates of x relative to B: solve [B | x]." }),
      R.el("div", { class: "subst-value", text: "[x](B) = " + R.tuple(res.xB) }),
    ]));
    ol.appendChild(R.el("li", {}, [
      R.el("div", { class: "subst-eq", text: "Multiply by the matrix of T: [T(x)](B′) = [T](B′, B)[x](B)." }),
      R.scroller(R.mathRow(["[T(x)](B′)", "=", R.matrix(res.M), R.matrix(res.xB), "=", R.matrix(res.TxB2)], "step 2")),
    ]));
    ol.appendChild(R.el("li", {}, [
      R.el("div", { class: "subst-eq", text: "Rebuild T(x) from its B′-coordinates: T(x) = c′₁u′₁ + … + c′ₘu′ₘ." }),
      R.el("div", { class: "subst-work", text: "T(x) = " + res.TxB2.map((c, j) => RowReduce.factor(c) + R.tuple(res.B2[j])).join(" + ") }),
      R.el("div", { class: "subst-value", text: "T(x) = " + R.tuple(res.Tx) }),
    ]));
    s3.appendChild(ol);
    s3.appendChild(R.para("Check: Ax = " + R.tuple(res.Ax) + (res.check ? ", the same." : ". This does not match; please report it."), "verdict"));
    body.appendChild(s3);
  }

  function renderCompose(res, A1, A2) {
    const s = R.section("T₂ ∘ T₁", "(T₂ ∘ T₁)(x) = T₂(T₁(x)) = A₂(A₁x), so the matrix of T₂ ∘ T₁ is A₂A₁.");
    s.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("A₁", A1)), R.scroller(R.labeled("A₂", A2))]));
    body.appendChild(s);
    if (!res.ok) return fail("Not defined", res.reason);
    s.appendChild(R.para("T₁: " + Rk(res.n) + " → " + Rk(res.k) + " and T₂: " + Rk(res.k) + " → " + Rk(res.m) + ", so T₂ ∘ T₁: " + Rk(res.n) + " → " + Rk(res.m) + ".", "check-line"));
    s.appendChild(R.scroller(R.labeled("A₂A₁", res.matrix)));
    const ol = R.el("ol", { class: "subst" });
    res.product.entries.forEach((row) => row.forEach((e) => ol.appendChild(R.el("li", {}, [
      R.el("div", { class: "subst-work", text: e.name + " = " + e.sum }),
      R.el("div", { class: "subst-value", text: e.name + " = " + e.value.toDisplay() }),
    ]))));
    s.appendChild(R.disclosure("Show how each entry is computed", [ol]));
  }

  function renderInverse(res, A) {
    const s = R.section("1. Is T invertible?", "T⁻¹ exists exactly when T is one-to-one and onto; then its matrix is A⁻¹.");
    s.appendChild(R.scroller(R.labeled("A", A)));
    body.appendChild(s);
    if (!res.square) return fail("No inverse", res.reason);
    const n = A.length;
    const s2 = R.section("2. Gauss–Jordan elimination on [A | I]");
    reduction(s2, res.inv.start, "[A | I]", { steps: res.inv.steps, rref: res.inv.end, pivots: [] }, n, false);
    body.appendChild(s2);
    if (!res.ok) return fail("No inverse", res.inv.reason + " " + res.reason);
    const a = R.el("section", { class: "block answer" }, [R.el("h3", { text: "The matrix of T⁻¹" })]);
    a.appendChild(R.scroller(R.labeled("A⁻¹", res.inv.inverse)));
    a.appendChild(R.para(Matrix.equals(res.inv.check, Matrix.identity(n)) ? "Check: AA⁻¹ = I." : "AA⁻¹ ≠ I. This is a bug; please report it.", "check-line"));
    body.appendChild(a);
  }

  /* ---------- Events ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const mode = modeSelect.value;
    const read = {};
    const errors = [];
    BLOCKS[mode].forEach((key) => {
      const r = R.readInputGrid(grids[key], (i, j) => NAMES[key] + (key === "x" ? "" : ", column " + (j + 1)) + ", entry " + (i + 1));
      errors.push(...r.errors);
      read[key] = r.values;
    });
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }
    body.innerHTML = "";
    const vecs = (key) => R.columnsOf(read[key]);
    const col = (key) => read[key].map((r) => r[0]);
    if (mode === "images") renderImages(LinTrans.fromBasisImages(vecs("v"), vecs("t"), col("x")));
    else if (mode === "kernel") renderKernel(LinTrans.kernelRange(read.a));
    else if (mode === "relative") renderRelative(LinTrans.relativeMatrix(read.a, vecs("b"), vecs("b2"), col("x")));
    else if (mode === "compose") renderCompose(LinTrans.composition(read.a1, read.a2), read.a1, read.a2);
    else renderInverse(LinTrans.inverse(read.a), read.a);
    R.reveal(results, heading);
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      update();
    }
  });
  [nSelect, mSelect].forEach((sel) => sel.addEventListener("change", () => {
    build(true, ["v", "t", "a", "b", "b2", "x"]);
    results.hidden = true;
  }));
  Object.entries(sizes).forEach(([key, sels]) => sels.forEach((sel) => sel.addEventListener("change", () => {
    build(true, [key]);
    results.hidden = true;
  })));
  modeSelect.addEventListener("change", sync);

  $("d4-example").addEventListener("click", () => {
    const ex = EXAMPLES[modeSelect.value];
    if (ex.n) nSelect.value = String(ex.n);
    if (ex.m) mSelect.value = String(ex.m);
    if (ex.a1) [sizes.a1[0].value, sizes.a1[1].value] = [String(ex.a1.length), String(ex.a1[0].length)];
    if (ex.a2) [sizes.a2[0].value, sizes.a2[1].value] = [String(ex.a2.length), String(ex.a2[0].length)];
    build(false);
    keys.forEach((key) => {
      if (ex[key]) R.fillInputGrid(grids[key], ex[key].map((r) => r.map(String)));
    });
    sync();
    solveButton.focus();
  });
  $("d4-clear").addEventListener("click", () => {
    build(false);
    results.hidden = true;
  });

  build(false);
  sync();
})();
