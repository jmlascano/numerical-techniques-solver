/*
 * tab-c.js — Determinants tab: by definition, cofactor expansion, adjoint.
 * Math: determinants.js (on matrix.js). Rendering primitives: render.js.
 */
(function () {
  "use strict";

  const R = Render;
  const { sub, factor } = RowReduce;

  // Problem A matrix (AMAT 105 Review & Exercises): det = 52
  const EXAMPLE = [["2", "-1", "3"], ["1", "-3", "-2"], ["3", "2", "-1"]];

  const $ = (id) => document.getElementById(id);
  const form = $("c-form");
  const sizeSelect = $("c-size");
  const methodSelect = $("c-method");
  const alongSelect = $("c-along");
  const gridA = $("c-grid-a");
  const solveButton = $("c-solve");
  const message = $("c-message");
  const results = $("c-results");
  const body = $("c-body");
  const heading = $("c-results-heading");
  const update = R.requireFilled(solveButton, $("c-hint"), form, "find the determinant");
  const place = (i, j) => "A, row " + (i + 1) + ", column " + (j + 1);

  R.fillSelect(sizeSelect, 2, 6, 3);

  function fillAlong() {
    const n = Number(sizeSelect.value);
    const keep = alongSelect.value;
    alongSelect.innerHTML = "";
    for (const kind of ["row", "col"]) {
      for (let i = 0; i < n; i++) {
        alongSelect.appendChild(R.el("option", { value: kind + ":" + i, text: (kind === "row" ? "Row " : "Column ") + (i + 1) }));
      }
    }
    alongSelect.value = Array.from(alongSelect.options).some((o) => o.value === keep) ? keep : "row:0";
  }

  function syncMethod() {
    $("c-along-field").hidden = methodSelect.value !== "cofactor";
    results.hidden = true;
  }

  function build(keep) {
    const n = Number(sizeSelect.value);
    R.buildInputGrid(gridA, n, n, place, keep);
    fillAlong();
    R.clearErrors(message, form);
    update();
  }

  function answer(value) {
    const ans = R.el("section", { class: "block answer" }, [R.el("h3", { text: "The determinant" })]);
    ans.appendChild(R.para("det(A) = " + value.toDisplay(), "answer-line"));
    body.appendChild(ans);
  }

  /* ---------- (a) Definition ---------- */

  function renderDefinition(res, A) {
    const s = R.section(
      "1. Sum over all permutations",
      "det(A) is the sum of all signed elementary products: for each permutation (j₁, …, jₙ) of (1, …, n), take a₁ⱼ₁a₂ⱼ₂⋯aₙⱼₙ, with sign + if the permutation is even (an even number of inversions) and − if it is odd."
    );
    s.appendChild(R.scroller(R.labeled("A", A)));
    if (!res.ok) {
      s.classList.add("block-fail");
      s.appendChild(R.para(res.reason, "fail-text"));
      body.appendChild(s);
      return;
    }
    s.appendChild(R.para(res.rows.length + " permutations of (" + Array.from({ length: res.n }, (_, i) => i + 1).join(", ") + "):", "check-line"));
    s.appendChild(
      R.table(
        ["Permutation", "Inversions", "Even or odd", "Elementary product", "Value", "Signed term"],
        res.rows.map((r) => [r.perm, String(r.inversions), r.parity, r.product, r.factors + " = " + r.value.toDisplay(), r.sign + factor(r.value)]),
        [false, true, false, false, true, true],
        "Signed elementary products"
      )
    );
    body.appendChild(s);
    const s2 = R.section("2. Add the signed terms");
    const terms = res.rows.filter((r) => !r.signed.isZero());
    s2.appendChild(
      R.para(
        "det(A) = " + (terms.length ? terms.map((r, i) => (i === 0 ? (r.sign === "−" ? "−" : "") : " " + r.sign + " ") + factor(r.value)).join("") : "0") + " = " + res.value.toDisplay(),
        "subst-work"
      )
    );
    if (terms.length < res.rows.length) s2.appendChild(R.para("Terms that are 0 are left out of the sum.", "check-line"));
    body.appendChild(s2);
    answer(res.value);
  }

  /* ---------- (b) Cofactor expansion ---------- */

  const sumLine = (node) => node.terms.map((t) => factor(t.entry) + "·" + factor(t.cofactor)).join(" + ");

  /* One expansion level: a list of cofactors, each with its minor worked out. */
  function renderExpansion(node, matrixName) {
    const ol = R.el("ol", { class: "subst" });
    node.terms.forEach((t) => {
      const minorName = matrixName === "A" ? t.minorName : "(" + matrixName + ")" + sub(t.i + 1) + sub(t.j + 1);
      const cofName = matrixName === "A" ? t.cofactorName : "C" + sub(t.i + 1) + sub(t.j + 1) + " of " + matrixName;
      const li = R.el("li", {}, [R.el("div", { class: "subst-eq", text: cofName + " = " + t.signText + "·" + minorName })]);
      li.appendChild(R.scroller(R.labeled(minorName, t.minor)));
      const e = t.expansion;
      if (t.minor.length === 1) {
        li.appendChild(R.el("div", { class: "subst-work", text: minorName + " = " + t.minorDet.toDisplay() }));
      } else if (e && e.twoByTwo) {
        li.appendChild(R.el("div", { class: "subst-work", text: minorName + " = " + e.twoByTwo.text + " = " + t.minorDet.toDisplay() }));
      } else if (e) {
        li.appendChild(R.el("div", { class: "subst-work", text: "Expand " + minorName + " along its row 1:" }));
        li.appendChild(renderExpansion(e, minorName));
        li.appendChild(R.el("div", { class: "subst-work", text: minorName + " = " + sumLine(e) + " = " + t.minorDet.toDisplay() }));
      } else {
        li.appendChild(R.el("div", { class: "subst-work", text: minorName + " = " + t.minorDet.toDisplay() + "  (a " + t.minor.length + " × " + t.minor.length + " determinant, not written out)" }));
      }
      li.appendChild(R.el("div", { class: "subst-value", text: cofName + " = " + t.signText + "·" + factor(t.minorDet) + " = " + t.cofactor.toDisplay() }));
      ol.appendChild(li);
    });
    return ol;
  }

  function renderCofactor(res, A) {
    const t = res.tree;
    const where = (t.along === "row" ? "row " : "column ") + (t.index + 1);
    const generic = t.terms.map((x) => "a" + sub(x.i + 1) + sub(x.j + 1) + x.cofactorName).join(" + ");
    const s = R.section(
      "1. Expand along " + where,
      "det(A) = " + generic + ", where the cofactor Cᵢⱼ = (−1)ⁱ⁺ʲMᵢⱼ and the minor Mᵢⱼ is the determinant of A with row i and column j deleted."
    );
    s.appendChild(R.scroller(R.labeled("A", A, t.along === "row" ? { highlightRows: [t.index] } : { highlightCols: [t.index] })));
    if (!res.written) {
      s.appendChild(R.para("For a " + res.n + " × " + res.n + " matrix the minors are " + (res.n - 1) + " × " + (res.n - 1) + "; their determinants are given as numbers, not written out.", "check-line"));
    }
    s.appendChild(renderExpansion(t, "A"));
    body.appendChild(s);
    const s2 = R.section("2. Add the products aᵢⱼCᵢⱼ");
    s2.appendChild(R.para("det(A) = " + sumLine(t) + " = " + res.value.toDisplay(), "subst-work"));
    body.appendChild(s2);
    answer(res.value);
  }

  /* ---------- (c) Adjoint ---------- */

  function renderAdjoint(res, A) {
    const n = res.n;
    const s1 = R.section("1. The cofactors", "Cᵢⱼ = (−1)ⁱ⁺ʲMᵢⱼ, where the minor Mᵢⱼ is the determinant of A with row i and column j deleted.");
    s1.appendChild(R.scroller(R.labeled("A", A)));
    const ol = R.el("ol", { class: "subst" });
    res.cofactors.forEach((row) => row.forEach((c) => {
      ol.appendChild(R.el("li", {}, [R.el("div", { class: "subst-value", text: c.cofactorName + " = " + c.signText + "·" + factor(c.minorDet) + " = " + c.cofactor.toDisplay() })]));
    }));
    s1.appendChild(ol);
    s1.appendChild(R.para("The matrix of cofactors:", "check-line"));
    s1.appendChild(R.scroller(R.labeled("C", res.C)));
    body.appendChild(s1);

    const s2 = R.section("2. The adjoint", "adj(A) is the transpose of the matrix of cofactors.");
    s2.appendChild(R.scroller(R.labeled("adj(A)", res.adj)));
    body.appendChild(s2);

    const s3 = R.section("3. The determinant from A·adj(A) = det(A)·I");
    s3.appendChild(R.scroller(R.labeled("A·adj(A)", res.product)));
    s3.appendChild(R.para("Every diagonal entry is " + res.det.toDisplay() + " and every other entry is 0, so det(A) = " + res.det.toDisplay() + ".", "verdict"));
    body.appendChild(s3);

    const s4 = R.section("4. The inverse");
    if (res.invertible) {
      s4.appendChild(R.para("det(A) ≠ 0, so A⁻¹ = (1/det A)·adj(A) = (1/" + res.det.toDisplay() + ")·adj(A):", "check-line"));
      s4.appendChild(R.scroller(R.labeled("A⁻¹", res.inverse)));
      s4.appendChild(R.scroller(R.labeled("AA⁻¹", res.check)));
      s4.appendChild(R.para(Matrix.equals(res.check, Matrix.identity(n)) ? "AA⁻¹ = I: every entry matches." : "AA⁻¹ ≠ I. This is a bug; please report it.", "verdict"));
    } else {
      s4.classList.add("block-fail");
      s4.appendChild(R.para("det(A) = 0, so A is singular and A⁻¹ does not exist.", "fail-text"));
    }
    body.appendChild(s4);
    answer(res.det);
  }

  /* ---------- Events ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const { values, errors } = R.readInputGrid(gridA, place);
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }
    body.innerHTML = "";
    const method = methodSelect.value;
    if (method === "definition") renderDefinition(Determinants.byDefinition(values), values);
    else if (method === "adjoint") renderAdjoint(Determinants.byAdjoint(values), values);
    else {
      const [kind, idx] = alongSelect.value.split(":");
      renderCofactor(Determinants.byCofactors(values, kind, Number(idx)), values);
    }
    R.reveal(results, heading);
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      update();
    }
  });

  sizeSelect.addEventListener("change", () => {
    build(true);
    results.hidden = true;
  });
  methodSelect.addEventListener("change", syncMethod);
  alongSelect.addEventListener("change", () => {
    results.hidden = true;
  });

  $("c-example").addEventListener("click", () => {
    sizeSelect.value = "3";
    build(false);
    R.fillInputGrid(gridA, EXAMPLE);
    update();
    results.hidden = true;
    solveButton.focus();
  });

  $("c-clear").addEventListener("click", () => {
    build(false);
    results.hidden = true;
    gridA.querySelector("input").focus();
  });

  build(false);
  syncMethod();
})();
