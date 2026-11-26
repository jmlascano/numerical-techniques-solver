/*
 * tab-d2.js — Coordinates and Bases tab: basis test, coordinates, reduce/extend, change of basis.
 * Math: vectorspaces.js. Rendering primitives: render.js.
 * Notation on the page: [v](B) = coordinate vector of v relative to B; P(B′→B) = transition matrix from B′ to B
 * (Anton's convention, CONTEXT-v3 Q2): [v](B) = P(B′→B)[v](B′).
 */
(function () {
  "use strict";

  const R = Render;
  const { sub } = RowReduce;
  const VS = VectorSpaces;

  /* The first test case for each task (CONTEXT-v3 §4, D2). Columns are vectors. */
  const B3 = [[1, 2, 3], [2, 9, 3], [1, 0, 4]]; // B = {(1,2,1), (2,9,0), (3,3,4)}
  const EXAMPLES = {
    basis: { n: 3, s: B3 },
    coords: { n: 3, b: B3, x: [[5], [-1], [9]], dir: "to" },
    extend: { n: 3, s: [[-1, 1], [2, -2], [3, -2]] }, // {(−1,2,3), (1,−2,−2)}
    change: { n: 2, b: [[1, 0], [0, 1]], b2: [[1, 2], [1, 1]], v: [[3], [-2]], from: "B" }, // B′ = {(1,1), (2,1)}
  };

  const $ = (id) => document.getElementById(id);
  const form = $("d2-form");
  const modeSelect = $("d2-mode");
  const nSelect = $("d2-n");
  const kSelect = $("d2-k");
  const dirSelect = $("d2-dir");
  const fromSelect = $("d2-from");
  const grids = { s: $("d2-grid-s"), b: $("d2-grid-b"), b2: $("d2-grid-b2"), x: $("d2-grid-x"), v: $("d2-grid-v") };
  const solveButton = $("d2-solve");
  const message = $("d2-message");
  const results = $("d2-results");
  const body = $("d2-body");
  const heading = $("d2-results-heading");
  const update = R.requireFilled(solveButton, $("d2-hint"), form, "compute");

  R.fillSelect(nSelect, 1, 6, 3);
  R.fillSelect(kSelect, 1, 6, 3);

  const Rn = () => "ℝ" + VS.sup(Number(nSelect.value));
  const BLOCKS = { basis: ["s"], coords: ["b", "x"], extend: ["s"], change: ["b", "b2", "v"] };

  function build(keep) {
    const n = Number(nSelect.value);
    const k = Number(kSelect.value);
    R.buildInputGrid(grids.s, n, k, (i, j) => "S, vector " + (j + 1) + ", entry " + (i + 1), keep);
    R.buildInputGrid(grids.b, n, n, (i, j) => "B, vector " + (j + 1) + ", entry " + (i + 1), keep);
    R.buildInputGrid(grids.b2, n, n, (i, j) => "B′, vector " + (j + 1) + ", entry " + (i + 1), keep);
    R.buildInputGrid(grids.x, n, 1, (i) => "x, entry " + (i + 1), keep);
    R.buildInputGrid(grids.v, n, 1, (i) => "[v], entry " + (i + 1), keep);
    R.clearErrors(message, form);
    update();
  }

  function sync() {
    const mode = modeSelect.value;
    Object.keys(grids).forEach((key) => {
      $("d2-block-" + key).hidden = !BLOCKS[mode].includes(key);
    });
    $("d2-k-field").hidden = !["basis", "extend"].includes(mode);
    $("d2-dir-field").hidden = mode !== "coords";
    $("d2-from-field").hidden = mode !== "change";
    $("d2-label-x").textContent = dirSelect.value === "to" ? "x" : "[x](B)";
    $("d2-label-v").textContent = "[v](" + fromSelect.value + ")";
    R.clearErrors(message, form);
    results.hidden = true;
    update();
  }

  function reductionSection(title, intro, start, startName, reduction, augment, pivots) {
    const s = R.section(title, intro);
    s.appendChild(R.scroller(R.labeled(startName, start, { augment })));
    if (reduction.steps.length) s.appendChild(R.stepList(reduction.steps, null, { augment }));
    else s.appendChild(R.para("It is already in reduced row echelon form, so no row operations are needed.", "check-line"));
    s.appendChild(R.scroller(R.labeled("R", reduction.rref, { augment, highlightCols: pivots ? reduction.pivots : [] })));
    return s;
  }

  function fail(title, text) {
    const s = R.section(title);
    s.classList.add("block-fail");
    s.appendChild(R.para(text, "fail-text"));
    body.appendChild(s);
  }

  function renderBasis(res) {
    const n = res.n;
    if (!res.sizeOk) {
      const s = R.section("1. Count the vectors");
      s.appendChild(R.scroller(R.labeled("S", res.M)));
      body.appendChild(s);
      return fail("2. Conclusion", res.reason + " S is not a basis for " + Rn() + ".");
    }
    body.appendChild(
      reductionSection(
        "1. Check linear independence",
        "S has n = " + n + " vectors in " + Rn() + ", so by Thm 4.22 it is a basis exactly when it is linearly independent (then it also spans). Row reduce the matrix whose columns are the vectors of S.",
        res.M, "S", res.reduction, undefined, true
      )
    );
    if (res.basis) {
      const s = R.section("2. Conclusion");
      s.appendChild(R.para("rank = " + res.rank + " = n: every column has a leading 1, so S is linearly independent and is a basis for " + Rn() + ".", "verdict"));
      body.appendChild(s);
    } else {
      fail("2. Conclusion", "rank = " + res.rank + " < n = " + n + ": S is linearly dependent, so it is not a basis for " + Rn() + ".");
    }
  }

  function renderCoordinates(B, x, dir) {
    if (dir === "to") {
      const res = VS.coordinates(B, x);
      body.appendChild(
        reductionSection(
          "1. Solve c₁b₁ + … + cₙbₙ = x",
          "The coordinates of x relative to B are the weights c₁, …, cₙ. Row reduce [b₁ … bₙ | x].",
          res.aug, "[B | x]", res.reduction, B.length, false
        )
      );
      if (!res.ok) return fail("2. Conclusion", res.reason);
      const s = R.el("section", { class: "block answer" }, [R.el("h3", { text: "The coordinates" })]);
      s.appendChild(R.para("[x](B) = " + R.tuple(res.coordinates), "answer-line"));
      s.appendChild(R.scroller(R.labeled("[x](B)", res.coordinates)));
      s.appendChild(R.para("Check: " + RowReduce.linear(res.coordinates.map((c, j) => ({ c, s: "b" + sub(j + 1) }))) + " = x " + (res.check ? "holds." : "fails. This is a bug; please report it."), "check-line"));
      body.appendChild(s);
    } else {
      const res = VS.fromCoordinates(B, x);
      if (!res.basisCheck.basis) return fail("Conclusion", "B is not a basis for " + Rn() + ", so coordinates relative to B are not defined.");
      const s = R.section("1. x = c₁b₁ + … + cₙbₙ", "Coordinates are the weights on the basis vectors, so multiply and add.");
      s.appendChild(R.scroller(R.labeled("B", VS.columns(B))));
      s.appendChild(R.para("x = " + res.work, "subst-work"));
      body.appendChild(s);
      const a = R.el("section", { class: "block answer" }, [R.el("h3", { text: "The vector" })]);
      a.appendChild(R.para("x = " + R.tuple(res.vector), "answer-line"));
      body.appendChild(a);
    }
  }

  function renderExtend(res) {
    const k = res.k;
    const n = res.n;
    const s1 = reductionSection(
      "1. Row reduce [S | e₁ … eₙ]",
      "Append the standard basis e₁, …, eₙ after the vectors of S and row reduce. The pivot columns form a basis for " + Rn() + " (Thm 4.23): pivot columns among S keep those vectors; pivot columns among the eᵢ add them.",
      res.aug, "[S | I]", res.reduction, k, true
    );
    body.appendChild(s1);
    const s2 = R.section("2. Reading the pivot columns");
    const keptNames = res.kept.map((j) => "s" + sub(j + 1));
    const addedNames = res.added.map((i) => "e" + sub(i + 1));
    s2.appendChild(R.el("dl", { class: "facts" }, [
      R.el("dt", { text: "Kept from S" }),
      R.el("dd", { text: keptNames.length ? keptNames.join(", ") : "none" }),
      R.el("dt", { text: "Added" }),
      R.el("dd", { text: addedNames.length ? addedNames.join(", ") : "none" }),
    ]));
    const notes = [];
    if (!res.independent) notes.push("S is linearly dependent, so it was reduced: the vectors of S without a leading 1 are combinations of the earlier ones and were dropped.");
    if (!res.spans) notes.push("S does not span " + Rn() + ", so it was extended with " + addedNames.join(", ") + ".");
    if (res.independent && res.spans) notes.push("S is already a basis for " + Rn() + ": nothing was dropped or added.");
    notes.forEach((t) => s2.appendChild(R.para(t, "check-line")));
    body.appendChild(s2);
    const a = R.el("section", { class: "block answer" }, [R.el("h3", { text: "A basis for " + Rn() })]);
    a.appendChild(R.para("{" + res.basis.map(R.tuple).join(", ") + "}", "answer-line"));
    a.appendChild(R.para(res.basis.length + " vectors, as a basis for " + Rn() + " must have (n = " + n + ").", "check-line"));
    body.appendChild(a);
  }

  function renderChange(B, B2, v, from) {
    const res = VS.changeOfBasis(B, B2);
    const n = B.length;
    const s1 = reductionSection(
      "1. P(B′→B): row reduce [B | B′] → [I | P(B′→B)]",
      "The columns of P(B′→B) are the coordinate vectors of the vectors of B′ relative to B, [u′₁](B), …, [u′ₙ](B).",
      res.toB.aug, "[B | B′]", res.toB.reduction, n, false
    );
    body.appendChild(s1);
    if (!res.ok) return fail("Conclusion", res.reason);
    s1.appendChild(R.scroller(R.labeled("P(B′→B)", res.toB.P)));
    const s2 = reductionSection(
      "2. P(B→B′): row reduce [B′ | B] → [I | P(B→B′)]",
      "The columns of P(B→B′) are [u₁](B′), …, [uₙ](B′).",
      res.toB2.aug, "[B′ | B]", res.toB2.reduction, n, false
    );
    s2.appendChild(R.scroller(R.labeled("P(B→B′)", res.toB2.P)));
    body.appendChild(s2);
    const s3 = R.section("3. Check: the two matrices are inverses");
    s3.appendChild(R.scroller(R.labeled("P(B→B′)·P(B′→B)", res.product)));
    s3.appendChild(R.para(Matrix.equals(res.product, Matrix.identity(n)) ? "The product is I, so P(B→B′) = P(B′→B)⁻¹." : "The product is not I. This is a bug; please report it.", "verdict"));
    body.appendChild(s3);
    const other = from === "B" ? "B′" : "B";
    const P = from === "B" ? "P(B→B′)" : "P(B′→B)";
    const Pback = from === "B" ? "P(B′→B)" : "P(B→B′)";
    const cv = VS.convert(res, v, from);
    const s4 = R.el("section", { class: "block answer" }, [R.el("h3", { text: "4. Converting coordinates" })]);
    s4.appendChild(R.para("[v](" + other + ") = " + P + "[v](" + from + ") = " + R.tuple(cv.result), "answer-line"));
    s4.appendChild(R.scroller(R.mathRow(["[v](" + other + ")", "=", R.matrix(from === "B" ? res.toB2.P : res.toB.P), R.matrix(v), "=", R.matrix(cv.result)], "conversion")));
    s4.appendChild(R.para("And back again: " + Pback + "[v](" + other + ") = " + R.tuple(cv.back) + (cv.roundTrip ? ", which is the [v](" + from + ") you entered." : ". This is a bug; please report it."), "check-line"));
    body.appendChild(s4);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const mode = modeSelect.value;
    const read = {};
    const errors = [];
    BLOCKS[mode].forEach((key) => {
      const label = { s: "S", b: "B", b2: "B′", x: $("d2-label-x").textContent, v: $("d2-label-v").textContent }[key];
      const r = R.readInputGrid(grids[key], (i, j) => label + (key === "x" || key === "v" ? ", entry " + (i + 1) : ", vector " + (j + 1) + ", entry " + (i + 1)));
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
    if (mode === "basis") renderBasis(VS.isBasis(vecs("s")));
    else if (mode === "coords") renderCoordinates(vecs("b"), col("x"), dirSelect.value);
    else if (mode === "extend") renderExtend(VS.reduceOrExtend(vecs("s")));
    else renderChange(vecs("b"), vecs("b2"), col("v"), fromSelect.value);
    R.reveal(results, heading);
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      update();
    }
  });
  [nSelect, kSelect].forEach((sel) => sel.addEventListener("change", () => {
    build(true);
    results.hidden = true;
  }));
  [modeSelect, dirSelect, fromSelect].forEach((sel) => sel.addEventListener("change", sync));

  $("d2-example").addEventListener("click", () => {
    const ex = EXAMPLES[modeSelect.value];
    nSelect.value = String(ex.n);
    if (ex.s) kSelect.value = String(ex.s[0].length);
    if (ex.dir) dirSelect.value = ex.dir;
    if (ex.from) fromSelect.value = ex.from;
    build(false);
    ["s", "b", "b2", "x", "v"].forEach((key) => {
      if (ex[key]) R.fillInputGrid(grids[key], ex[key].map((r) => r.map(String)));
    });
    sync();
    solveButton.focus();
  });
  $("d2-clear").addEventListener("click", () => {
    build(false);
    results.hidden = true;
  });

  build(false);
  sync();
})();
