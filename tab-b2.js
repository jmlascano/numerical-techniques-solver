/*
 * tab-b2.js — Matrices and Matrix Operations tab: operation selector, inputs and rendering.
 * Math: matops.js. Rendering primitives: render.js.
 */
(function () {
  "use strict";

  const R = Render;
  const sub = RowReduce.sub;

  // Anton §1.3 matrices and the AMAT 105 Problem A matrix, as strings for the input grid.
  const M = {
    A13: [["3", "0"], ["-1", "2"], ["1", "1"]],
    B13: [["4", "-1"], ["0", "2"]],
    C13: [["1", "4", "2"], ["3", "1", "5"]],
    D13: [["1", "5", "2"], ["-1", "0", "1"], ["3", "2", "4"]],
    E13: [["6", "1", "3"], ["-1", "1", "2"], ["4", "1", "3"]],
    PA: [["2", "-1", "3"], ["1", "-3", "-2"], ["3", "2", "-1"]],
  };
  /* The first test case for each operation (CONTEXT-v3 §4, B2). */
  const EXAMPLES = {
    add: { A: M.D13, B: M.E13 },
    sub: { A: M.D13, B: M.E13 },
    scale: { A: M.A13, k: "5" },
    combo: { A: M.B13, B: M.C13, k: "2", m: "-1" }, // 2B − C from Anton §1.3: undefined
    mul: { A: M.A13, B: M.B13 },
    transpose: { A: M.A13 },
    trace: { A: M.D13 },
    inverse: { A: M.PA },
    elementary: { type: "1", n: "3", c: "2", k: "2", j: "1" },
    decompose: { A: M.PA },
  };

  const $ = (id) => document.getElementById(id);
  const form = $("b2-form");
  const opSelect = $("b2-op");
  const gridA = $("b2-grid-a");
  const gridB = $("b2-grid-b");
  const sizes = { aRows: $("b2-a-rows"), aCols: $("b2-a-cols"), bRows: $("b2-b-rows"), bCols: $("b2-b-cols") };
  const kInput = $("b2-k");
  const mInput = $("b2-m");
  const elem = { box: $("b2-elem"), type: $("b2-etype"), n: $("b2-en"), c: $("b2-ec"), k: $("b2-ek"), j: $("b2-ej") };
  const solveButton = $("b2-solve");
  const message = $("b2-message");
  const results = $("b2-results");
  const body = $("b2-body");
  const heading = $("b2-results-heading");
  const update = R.requireFilled(solveButton, $("b2-hint"), form, "compute");

  const needsB = (op) => ["add", "sub", "combo", "mul"].includes(op);
  const needsK = (op) => ["scale", "combo"].includes(op);

  Object.values(sizes).forEach((sel) => R.fillSelect(sel, 1, 6, 3));
  R.fillSelect(elem.n, 2, 6, 3);

  function buildA(keep) {
    R.buildInputGrid(gridA, Number(sizes.aRows.value), Number(sizes.aCols.value), (i, j) => "A, row " + (i + 1) + ", column " + (j + 1), keep);
  }
  function buildB(keep) {
    R.buildInputGrid(gridB, Number(sizes.bRows.value), Number(sizes.bCols.value), (i, j) => "B, row " + (i + 1) + ", column " + (j + 1), keep);
  }

  function syncElementary() {
    const n = Number(elem.n.value);
    R.fillSelect(elem.k, 1, n, 1);
    R.fillSelect(elem.j, 1, n, 2);
    const t = elem.type.value;
    $("b2-ec-field").hidden = t === "2";
    $("b2-ej-field").hidden = t === "1";
  }

  /* Show only the inputs the chosen operation needs. */
  function syncOperation() {
    const op = opSelect.value;
    const isElem = op === "elementary";
    $("b2-matrices").hidden = isElem;
    elem.box.hidden = !isElem;
    $("b2-block-b").hidden = !needsB(op);
    $("b2-k-field").hidden = !needsK(op);
    $("b2-m-field").hidden = op !== "combo";
    $("b2-scalars").hidden = !needsK(op);
    syncElementary();
    R.clearErrors(message, form);
    results.hidden = true;
    update();
  }

  function setSize(rowsSel, colsSel, Mx) {
    rowsSel.value = String(Mx.length);
    colsSel.value = String(Mx[0].length);
  }

  function loadExample() {
    const ex = EXAMPLES[opSelect.value];
    if (opSelect.value === "elementary") {
      elem.type.value = ex.type;
      elem.n.value = ex.n;
      syncElementary();
      elem.c.value = ex.c;
      elem.k.value = ex.k;
      elem.j.value = ex.j;
    } else {
      setSize(sizes.aRows, sizes.aCols, ex.A);
      buildA(false);
      R.fillInputGrid(gridA, ex.A);
      if (ex.B) {
        setSize(sizes.bRows, sizes.bCols, ex.B);
        buildB(false);
        R.fillInputGrid(gridB, ex.B);
      }
      kInput.value = ex.k || "";
      mInput.value = ex.m || "";
    }
    R.clearErrors(message, form);
    results.hidden = true;
    update();
    solveButton.focus();
  }

  /* ---------- Rendering ---------- */

  const sizeLine = (name, X) => name + " is " + MatOps.sizeText(X);

  function renderUndefined(res) {
    const s = R.section("Not defined");
    s.classList.add("block-fail");
    s.appendChild(R.para(res.reason, "fail-text"));
    body.appendChild(s);
  }

  function renderCombination(res, A, B, k, m) {
    const s = R.section(res.expr);
    s.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("A", A))].concat(B ? [R.scroller(R.labeled("B", B))] : [])));
    if (!res.ok) {
      body.appendChild(s);
      return renderUndefined(res);
    }
    s.appendChild(
      R.para(
        B
          ? "A and B are both " + MatOps.sizeText(A) + ", so each entry is (" + res.expr + ")ᵢⱼ = " + RowReduce.linear([{ c: k, s: "aᵢⱼ" }, { c: m, s: "bᵢⱼ" }]) + "."
          : "Each entry is multiplied by " + k.toDisplay() + ": (" + res.expr + ")ᵢⱼ = " + RowReduce.linear([{ c: k, s: "aᵢⱼ" }]) + ".",
        "check-line"
      )
    );
    s.appendChild(R.scroller(R.labeled(res.expr, res.result)));
    body.appendChild(s);
  }

  function renderProduct(res, A, B) {
    const s = R.section("AB");
    s.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("A", A)), R.scroller(R.labeled("B", B))]));
    if (!res.ok) {
      body.appendChild(s);
      return renderUndefined(res);
    }
    s.appendChild(R.para("A is " + MatOps.sizeText(A) + " and B is " + MatOps.sizeText(B) + ": the columns of A match the rows of B, so AB is defined and is " + MatOps.sizeText(res.result) + ". Each entry is cᵢⱼ = aᵢ₁b₁ⱼ + aᵢ₂b₂ⱼ + ⋯ (row i of A times column j of B).", "check-line"));
    s.appendChild(R.scroller(R.labeled("AB", res.result)));
    const ol = R.el("ol", { class: "subst" });
    res.entries.forEach((row) => row.forEach((e) => {
      ol.appendChild(R.el("li", {}, [R.el("div", { class: "subst-work", text: e.name + " = " + e.sum }), R.el("div", { class: "subst-value", text: e.name + " = " + e.value.toDisplay() })]));
    }));
    s.appendChild(R.disclosure("Show how each entry is computed", [ol]));
    body.appendChild(s);
  }

  function renderTranspose(res, A) {
    const s = R.section("Aᵀ", "Row i of A becomes column i of Aᵀ.");
    s.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("A", A)), R.scroller(R.labeled("Aᵀ", res.result))]));
    s.appendChild(R.para(sizeLine("A", A) + ", so Aᵀ is " + MatOps.sizeText(res.result) + ".", "check-line"));
    body.appendChild(s);
  }

  function renderTrace(res, A) {
    const s = R.section("tr(A)");
    s.appendChild(R.scroller(R.labeled("A", A)));
    if (!res.ok) {
      body.appendChild(s);
      return renderUndefined(res);
    }
    s.appendChild(R.para("The trace is the sum of the entries on the main diagonal.", "check-line"));
    s.appendChild(R.para("tr(A) = " + res.sum + " = " + res.value.toDisplay(), "answer-line"));
    body.appendChild(s);
  }

  function renderInverse(res, A) {
    if (!res.ok && !res.start) {
      const s = R.section("A⁻¹");
      s.appendChild(R.scroller(R.labeled("A", A)));
      body.appendChild(s);
      return renderUndefined(res);
    }
    const n = res.n;
    const s1 = R.section("1. Gauss–Jordan elimination on [A | I]", "Row reduce [A | I]. If the left side becomes I, the right side is A⁻¹.");
    s1.appendChild(R.scroller(R.labeled("[A | I]", res.start, { augment: n })));
    if (res.steps.length) s1.appendChild(R.stepList(res.steps, null, { augment: n }));
    body.appendChild(s1);
    if (!res.ok) {
      const f = R.section("A is singular");
      f.classList.add("block-fail");
      f.appendChild(R.para(res.reason, "fail-text"));
      f.appendChild(R.scroller(R.labeled("Current matrix", res.end, { augment: n, highlightRows: [res.zeroRow] })));
      body.appendChild(f);
      return;
    }
    const s2 = R.section("2. The inverse", "The left side is now I, so the right side is A⁻¹.");
    s2.appendChild(R.scroller(R.labeled("[I | A⁻¹]", res.end, { augment: n })));
    s2.appendChild(R.scroller(R.labeled("A⁻¹", res.inverse)));
    body.appendChild(s2);
    const s3 = R.section("3. Check");
    s3.appendChild(R.scroller(R.labeled("AA⁻¹", res.check)));
    s3.appendChild(R.para(Matrix.equals(res.check, Matrix.identity(n)) ? "AA⁻¹ = I: every entry matches." : "AA⁻¹ ≠ I. This is a bug; please report it.", "verdict"));
    body.appendChild(s3);
  }

  function renderElementary(e) {
    const s = R.section(e.name, "An elementary matrix is I with one elementary row operation applied: " + e.meaning + ".");
    s.appendChild(R.scroller(R.labeled(e.name, e.matrix)));
    body.appendChild(s);
  }

  function renderDecomposition(res, A) {
    if (!res.ok) {
      const s = R.section("A as a product of elementary matrices");
      s.appendChild(R.scroller(R.labeled("A", A)));
      body.appendChild(s);
      return renderUndefined({ reason: res.reason });
    }
    const p = res.steps.length;
    const s1 = R.section(
      "1. Reduce A to I, naming each operation's elementary matrix",
      "Each row operation is the same as multiplying on the left by an elementary matrix: E₁(c, k) multiplies row k by c, E₂(k, j) interchanges rows k and j, E₃(c, k, j) adds c times row k to row j."
    );
    s1.appendChild(R.scroller(R.labeled("A", A)));
    s1.appendChild(R.stepList(res.steps.map((st, i) => ({ text: st.text, note: "E" + sub(i + 1) + " = " + st.e.name, rows: st.rows, matrix: st.matrix }))));
    s1.appendChild(R.para(res.reduced, "answer-line"));
    body.appendChild(s1);

    const s2 = R.section(
      "2. Invert each elementary matrix",
      "Undo each operation: E₁(c, k)⁻¹ = E₁(1/c, k), E₂(k, j)⁻¹ = E₂(k, j), E₃(c, k, j)⁻¹ = E₃(−c, k, j)."
    );
    const ol = R.el("ol", { class: "subst" });
    res.steps.forEach((st, i) => ol.appendChild(R.el("li", {}, [R.el("div", { class: "subst-value", text: "E" + sub(i + 1) + "⁻¹ = " + st.inv.name })])));
    s2.appendChild(ol);
    s2.appendChild(R.vectors(res.steps.map((st, i) => ({ name: "E" + sub(i + 1) + "⁻¹", vector: st.inv.matrix }))));
    body.appendChild(s2);

    const s3 = R.section("3. A as a product of elementary matrices");
    s3.appendChild(R.para("Multiply " + res.reduced + " on the left by E" + sub(p) + "⁻¹, …, E" + sub(1) + "⁻¹ in turn:", "check-line"));
    s3.appendChild(R.para(res.productText + " = " + res.steps.map((st) => st.inv.name).join(MatOps.ZWSP), "answer-line"));
    s3.appendChild(R.para("The product, multiplied out:", "check-line"));
    s3.appendChild(R.scroller(R.labeled("E" + sub(1) + "⁻¹⋯E" + sub(p) + "⁻¹", res.value)));
    s3.appendChild(R.para(res.check ? "It equals A: every entry matches." : "It does not equal A. This is a bug; please report it.", "verdict"));
    body.appendChild(s3);
  }

  /* ---------- Events ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const op = opSelect.value;
    const errors = [];

    if (op === "elementary") {
      const type = Number(elem.type.value);
      const n = Number(elem.n.value);
      const k = Number(elem.k.value);
      const j = Number(elem.j.value);
      let c = null;
      if (type !== 2) {
        const r = R.readScalar(elem.c, "c");
        if (r.error) errors.push(r.error);
        else c = r.value;
        if (c && type === 1 && c.isZero()) errors.push({ el: elem.c, text: "c: must not be 0 (multiplying a row by 0 is not an elementary row operation)." });
      }
      if (type !== 1 && k === j) errors.push({ el: elem.j, text: "j: must differ from k." });
      if (errors.length) {
        R.showErrors(message, errors);
        results.hidden = true;
        return;
      }
      body.innerHTML = "";
      renderElementary(MatOps.elementary(type, n, c, k, j));
      R.reveal(results, heading);
      return;
    }

    const place = (name) => (i, j) => name + ", row " + (i + 1) + ", column " + (j + 1);
    const a = R.readInputGrid(gridA, place("A"));
    errors.push(...a.errors);
    let b = null;
    if (needsB(op)) {
      b = R.readInputGrid(gridB, place("B"));
      errors.push(...b.errors);
    }
    let k = null;
    let m = null;
    if (needsK(op)) {
      const r = R.readScalar(kInput, "k");
      r.error ? errors.push(r.error) : (k = r.value);
    }
    if (op === "combo") {
      const r = R.readScalar(mInput, "m");
      r.error ? errors.push(r.error) : (m = r.value);
    }
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }

    const A = a.values;
    const B = b && b.values;
    body.innerHTML = "";
    if (op === "add") renderCombination(MatOps.combine(1, A, 1, B), A, B, Fraction.ONE, Fraction.ONE);
    else if (op === "sub") renderCombination(MatOps.combine(1, A, -1, B), A, B, Fraction.ONE, Fraction.ONE.neg());
    else if (op === "scale") renderCombination(MatOps.combine(k, A), A, null, k, null);
    else if (op === "combo") renderCombination(MatOps.combine(k, A, m, B), A, B, k, m);
    else if (op === "mul") renderProduct(MatOps.product(A, B), A, B);
    else if (op === "transpose") renderTranspose(MatOps.transpose(A), A);
    else if (op === "trace") renderTrace(MatOps.trace(A), A);
    else if (op === "inverse") renderInverse(MatOps.inverse(A), A);
    else if (op === "decompose") renderDecomposition(MatOps.asElementaryProduct(A), A);
    R.reveal(results, heading);
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      update();
    }
  });

  opSelect.addEventListener("change", syncOperation);
  elem.type.addEventListener("change", () => {
    syncElementary();
    update();
  });
  elem.n.addEventListener("change", syncElementary);
  [sizes.aRows, sizes.aCols].forEach((sel) => sel.addEventListener("change", () => {
    buildA(true);
    results.hidden = true;
    update();
  }));
  [sizes.bRows, sizes.bCols].forEach((sel) => sel.addEventListener("change", () => {
    buildB(true);
    results.hidden = true;
    update();
  }));

  $("b2-example").addEventListener("click", loadExample);
  $("b2-clear").addEventListener("click", () => {
    buildA(false);
    buildB(false);
    kInput.value = "";
    mInput.value = "";
    elem.c.value = "";
    R.clearErrors(message, form);
    results.hidden = true;
    update();
  });

  buildA(false);
  buildB(false);
  syncOperation();
})();
