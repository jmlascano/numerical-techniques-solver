/*
 * tab-d1.js — Real Vector Spaces tab (ℝⁿ): linear combination, span, linear independence.
 * Math: vectorspaces.js. Rendering primitives: render.js.
 */
(function () {
  "use strict";

  const R = Render;
  const { sub, linear } = RowReduce;

  /* The first test case for each question (D1 slides). Columns are vectors. */
  const EXAMPLES = {
    combination: { n: 3, v: [[1, 6], [2, 4], [-1, 2]], w: [[9], [2], [7]] }, // u = (1,2,−1), v = (6,4,2), w = (9,2,7)
    span: { n: 3, v: [[1, 1, 2], [1, 0, 1], [2, 1, 3]] }, // (1,1,2), (1,0,1), (2,1,3)
    independence: { n: 3, v: [[1, 5, 3], [-2, 6, 2], [3, -1, 1]] }, // (1,−2,3), (5,6,−1), (3,2,1)
  };

  const $ = (id) => document.getElementById(id);
  const form = $("d1-form");
  const modeSelect = $("d1-mode");
  const nSelect = $("d1-n");
  const kSelect = $("d1-k");
  const gridV = $("d1-grid-v");
  const gridW = $("d1-grid-w");
  const solveButton = $("d1-solve");
  const message = $("d1-message");
  const results = $("d1-results");
  const body = $("d1-body");
  const heading = $("d1-results-heading");
  const update = R.requireFilled(solveButton, $("d1-hint"), form, "check");

  R.fillSelect(nSelect, 1, 6, 3);
  R.fillSelect(kSelect, 1, 6, 2);

  const vName = (j) => "v" + sub(j + 1);
  const names = (k) => Array.from({ length: k }, (_, j) => vName(j));
  /* "v₁", "v₁, v₂", "v₁, v₂, v₃", "v₁, …, v₄" */
  const span = (k) => (k <= 3 ? names(k).join(", ") : "v₁, …, " + vName(k - 1));

  function build(keep) {
    const n = Number(nSelect.value);
    const k = Number(kSelect.value);
    R.buildInputGrid(gridV, n, k, (i, j) => vName(j) + ", entry " + (i + 1), keep);
    R.buildInputGrid(gridW, n, 1, (i) => "w, entry " + (i + 1), keep);
    $("d1-label-v").textContent = k === 1 ? "v₁" : "v₁ … " + vName(k - 1);
    R.clearErrors(message, form);
    update();
  }

  function sync() {
    $("d1-block-w").hidden = modeSelect.value !== "combination";
    R.clearErrors(message, form);
    results.hidden = true;
    update();
  }

  function stepsSection(title, intro, start, startName, reduction, augment, pivotsInBlue) {
    const s = R.section(title, intro);
    s.appendChild(R.scroller(R.labeled(startName, start, { augment })));
    if (reduction.steps.length) s.appendChild(R.stepList(reduction.steps, null, { augment }));
    else s.appendChild(R.para("It is already in reduced row echelon form, so no row operations are needed.", "check-line"));
    s.appendChild(R.para("The reduced row echelon form" + (pivotsInBlue ? ", with the pivot columns in blue:" : ":"), "check-line"));
    s.appendChild(R.scroller(R.labeled("R", reduction.rref, { augment, highlightCols: pivotsInBlue ? reduction.pivots : [] })));
    return s;
  }

  function renderCombination(res, k) {
    body.appendChild(
      stepsSection(
        "1. Solve c₁v₁ + … + cₖvₖ = w",
        "w is a linear combination of " + span(k) + " exactly when this system is consistent. Its augmented matrix has the vectors as columns.",
        res.aug, "[" + names(k).join(" ") + " | w]", res.reduction, k, false
      )
    );
    const s2 = R.section("2. Conclusion");
    if (!res.ok) {
      s2.classList.add("block-fail");
      s2.appendChild(R.para("Row " + (res.badRow + 1) + " of R reads 0 = 1, so the system has no solution: w is not a linear combination of " + span(k) + ".", "fail-text"));
      body.appendChild(s2);
      return;
    }
    s2.appendChild(R.para("The system is consistent, so w is a linear combination of " + span(k) + ".", "verdict"));
    if (!res.unique) {
      s2.appendChild(R.para("The coefficients are not unique (" + res.free.map((j) => "c" + sub(j + 1)).join(", ") + " can be any number); setting them to 0 gives one choice.", "check-line"));
    }
    s2.appendChild(R.para(res.coefficients.map((c, j) => "c" + sub(j + 1) + " = " + c.toDisplay()).join(",  "), "check-line"));
    s2.appendChild(R.para("w = " + linear(res.coefficients.map((c, j) => ({ c, s: vName(j) }))), "answer-line"));
    s2.appendChild(R.para("Check: " + linear(res.coefficients.map((c, j) => ({ c, s: vName(j) }))) + " = " + R.tuple(res.combination) + (res.check ? ", which is w." : ". This is a bug; please report it."), "check-line"));
    body.appendChild(s2);
  }

  function renderSpan(res, k) {
    const n = res.n;
    body.appendChild(
      stepsSection(
        "1. Row reduce [" + names(k).join(" ") + "]",
        span(k) + " span ℝ" + VectorSpaces.sup(n) + " exactly when the system [" + names(k).join(" ") + "]c = b is consistent for every b, that is, when the rank is n = " + n + ".",
        res.M, "[" + names(k).join(" ") + "]", res.reduction, undefined, true
      )
    );
    const s2 = R.section("2. Conclusion");
    if (res.spans) {
      s2.appendChild(R.para("rank = " + res.rank + " = n, so every row of R has a leading 1 and " + span(k) + " span ℝ" + VectorSpaces.sup(n) + ".", "verdict"));
    } else {
      s2.classList.add("block-fail");
      s2.appendChild(
        R.para(
          "rank = " + res.rank + " < n = " + n + ", so " + span(k) + " do not span ℝ" + VectorSpaces.sup(n) + "." +
            (res.tooFew ? " (Fewer than n vectors can never span ℝ" + VectorSpaces.sup(n) + ".)" : ""),
          "fail-text"
        )
      );
      const w = res.witness;
      const e = "e" + sub(w.index + 1);
      s2.appendChild(R.para("For example, " + e + " = " + R.tuple(w.vector) + " is not in the span: [" + names(k).join(" ") + " | " + e + "] row reduces to a matrix with the row 0 = 1 (in blue).", "check-line"));
      s2.appendChild(R.scroller(R.labeled("R", w.reduction.rref, { augment: k, highlightRows: [w.badRow] })));
    }
    body.appendChild(s2);
  }

  function renderIndependence(res, k) {
    const s1 = stepsSection(
      "1. Solve k₁v₁ + … + kₖvₖ = 0",
      "The vectors are linearly independent exactly when the only solution is k₁ = … = kₖ = 0, that is, when every column of R has a leading 1.",
      res.M, "[" + names(k).join(" ") + "]", res.analysis.reduction, undefined, true
    );
    if (res.moreThanN) {
      s1.insertBefore(R.para("There are k = " + k + " vectors in ℝ" + VectorSpaces.sup(res.n) + " and k > n, so by Thm 4.13 the set is linearly dependent. The reduction below finds a relation.", "verdict"), s1.children[2]);
    }
    body.appendChild(s1);
    const s2 = R.section("2. Conclusion");
    if (res.independent) {
      s2.appendChild(R.para("Every column of R has a leading 1, so the only solution is k₁ = … = kₖ = 0: " + span(k) + " are linearly independent.", "verdict"));
      body.appendChild(s2);
      return;
    }
    const free = res.analysis.nullSpace.free.map((j) => "k" + sub(j + 1));
    s2.appendChild(R.para(free.join(", ") + (free.length > 1 ? " are free" : " is free") + ", so there are nontrivial solutions: " + span(k) + " are linearly dependent.", "verdict"));
    s2.appendChild(R.para("One nontrivial solution, scaled to whole numbers: (" + res.relation.map((c, j) => "k" + sub(j + 1)).join(", ") + ") = " + R.tuple(res.relation) + ", so", "check-line"));
    s2.appendChild(R.para(linear(res.relation.map((c, j) => ({ c, s: vName(j) }))) + " = 0", "answer-line"));
    s2.appendChild(R.para("Check: it equals " + R.tuple(res.relationCheck) + ".", "check-line"));
    s2.appendChild(R.para("Solving for " + vName(res.solvedFor) + ":", "check-line"));
    s2.appendChild(R.para(vName(res.solvedFor) + " = " + linear(res.expression.map((e) => ({ c: e.c, s: vName(e.j) }))), "answer-line"));
    body.appendChild(s2);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const mode = modeSelect.value;
    const v = R.readInputGrid(gridV, (i, j) => vName(j) + ", entry " + (i + 1));
    const w = mode === "combination" ? R.readInputGrid(gridW, (i) => "w, entry " + (i + 1)) : { values: [], errors: [] };
    const errors = v.errors.concat(w.errors);
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }
    const vectors = R.columnsOf(v.values);
    const k = vectors.length;
    body.innerHTML = "";
    if (mode === "combination") renderCombination(VectorSpaces.linearCombination(vectors, w.values.map((r) => r[0])), k);
    else if (mode === "span") renderSpan(VectorSpaces.span(vectors), k);
    else renderIndependence(VectorSpaces.independence(vectors), k);
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
  modeSelect.addEventListener("change", sync);

  $("d1-example").addEventListener("click", () => {
    const ex = EXAMPLES[modeSelect.value];
    nSelect.value = String(ex.n);
    kSelect.value = String(ex.v[0].length);
    build(false);
    R.fillInputGrid(gridV, ex.v.map((r) => r.map(String)));
    if (ex.w) R.fillInputGrid(gridW, ex.w.map((r) => r.map(String)));
    update();
    results.hidden = true;
    solveButton.focus();
  });
  $("d1-clear").addEventListener("click", () => {
    build(false);
    results.hidden = true;
  });

  build(false);
  sync();
})();
