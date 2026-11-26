/*
 * tab-e2.js — Diagonalization and Cayley–Hamilton tab (one "Part" select, one primary button).
 * Math: diagonalization.js (on eigen.js). Rendering primitives: render.js, plus EigenView from tab-e.js.
 */
(function () {
  "use strict";

  const R = Render;
  const { sub, sup } = RowReduce;
  const D = (x) => x.toDisplay();
  const paren = (x) => "(" + D(x) + ")";

  /* The first test case for each part (CONTEXT-v3 §4, E2). */
  const EXAMPLES = {
    diag: { A: [["0", "0", "-2"], ["1", "2", "1"], ["1", "0", "3"]], k: "3" },
    ch: { A: [["1", "2"], ["3", "4"]], k: "4" },
  };
  const BUTTON = { diag: "Diagonalize", ch: "Verify Cayley–Hamilton" };

  const $ = (id) => document.getElementById(id);
  const form = $("e2-form");
  const partSelect = $("e2-part");
  const sizeSelect = $("e2-size");
  const kInput = $("e2-k");
  const gridA = $("e2-grid-a");
  const solveButton = $("e2-solve");
  const message = $("e2-message");
  const results = $("e2-results");
  const body = $("e2-body");
  const heading = $("e2-results-heading");
  const update = R.requireFilled(solveButton, $("e2-hint"), form, "continue");
  const place = (i, j) => "A, row " + (i + 1) + ", column " + (j + 1);

  R.fillSelect(sizeSelect, 2, 6, 3);

  function build(keep) {
    const n = Number(sizeSelect.value);
    R.buildInputGrid(gridA, n, n, place, keep);
    R.clearErrors(message, form);
    update();
  }

  function sync() {
    solveButton.textContent = BUTTON[partSelect.value];
    results.hidden = true;
  }

  function fail(title, text) {
    const s = R.section(title);
    s.classList.add("block-fail");
    s.appendChild(R.para(text, "fail-text"));
    body.appendChild(s);
    return s;
  }

  const eigenTable = (ev) => R.table(
    ["Eigenvalue", "Algebraic multiplicity", "Geometric multiplicity (dimension of eigenspace)"],
    ev.map((e) => [D(e.value), String(e.algebraic), String(e.geometric)]),
    [true, true, true],
    "Multiplicities"
  );

  /* ---------- Diagonalization ---------- */

  function renderDiag(res) {
    const eg = res.eigen;
    const n = eg.n;
    const s1 = R.section("1. Eigenvalues and a basis for each eigenspace", "p(λ) = det(λI" + sub(n) + " − A) = " + D(eg.p) + " = " + eg.factorization.factored + ".");
    s1.appendChild(R.scroller(R.labeled("A", eg.A)));
    const more = R.el("p", { class: "check-line" }, ["The full work (cofactor expansion, factoring, row reductions) is in ", R.el("a", { href: "#e", text: "Eigenvalues and Eigenvectors" }), "."]);
    s1.appendChild(more);
    let count = 0;
    eg.eigenvalues.forEach((e) => {
      s1.appendChild(R.para(EigenView.eigenLine(e), "verdict"));
      s1.appendChild(R.vectors(e.basis.map((v) => ({ name: "p" + sub(++count), vector: v }))));
    });
    body.appendChild(s1);

    if (!res.ok) {
      if (res.reason === "complex") {
        return fail("Not diagonalizable over ℝ", "p(λ) has the complex roots λ = " + eg.complex.text + ", which are not real. A real matrix P cannot be built, so A is not diagonalizable over ℝ.");
      }
      if (res.reason === "unsolved") {
        return fail("Cannot finish exactly", "The factor " + D(eg.unsolved.factor) + " has no rational roots, and its roots are not of the form a ± b√d, so the eigenvalues cannot be written exactly here and diagonalization stops.");
      }
      const f = fail("Not diagonalizable", "The eigenspace bases give only " + res.total + " linearly independent eigenvectors, fewer than n = " + n + ", so there is no invertible P: A is not diagonalizable.");
      f.appendChild(eigenTable(eg.eigenvalues));
      f.appendChild(R.para("A is diagonalizable exactly when, for every eigenvalue, the geometric multiplicity equals the algebraic multiplicity.", "check-line"));
      return;
    }
    const s1b = R.para("Together these are n = " + n + " linearly independent eigenvectors, so A is diagonalizable." + (res.distinct ? " (A has n distinct eigenvalues, so by Thm 5.11 it was certain to be.)" : ""), "verdict");
    s1.appendChild(s1b);

    const s2 = R.section("2. Form P and D", "The columns of P are the eigenvectors p₁, …, pₙ; D has the matching eigenvalues on its diagonal, in the same order.");
    s2.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("P", res.P)), R.scroller(R.labeled("D", res.D))]));
    body.appendChild(s2);

    const s3 = R.section("3. P⁻¹ by Gauss–Jordan elimination");
    s3.appendChild(R.scroller(R.labeled("P⁻¹", res.Pinv)));
    const steps = R.el("div", {}, [R.scroller(R.labeled("[P | I]", res.inverse.start, { augment: n })), R.stepList(res.inverse.steps, null, { augment: n })]);
    s3.appendChild(R.disclosure("Show steps", [steps]));
    body.appendChild(s3);

    const s4 = R.section("4. Check: P⁻¹AP = D");
    s4.appendChild(R.scroller(R.labeled("P⁻¹AP", res.PinvAP)));
    s4.appendChild(R.para(res.checkD ? "P⁻¹AP = D: every entry matches." : "P⁻¹AP ≠ D. This is a bug; please report it.", "verdict"));
    s4.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("AP", res.AP)), R.scroller(R.labeled("PD", res.PD))]));
    s4.appendChild(R.para(res.checkAPPD ? "AP = PD as well." : "AP ≠ PD. This is a bug; please report it.", "check-line"));
    body.appendChild(s4);

    if (res.powers) {
      const k = res.powers.k;
      const s5 = R.el("section", { class: "block answer" }, [R.el("h3", { text: "5. A" + sup(k) + " = PD" + sup(k) + "P⁻¹" })]);
      s5.appendChild(R.para("D" + sup(k) + " raises each diagonal entry to the power " + k + ":", "check-line"));
      s5.appendChild(R.scroller(R.labeled("D" + sup(k), res.powers.Dk)));
      s5.appendChild(R.scroller(R.labeled("A" + sup(k), res.powers.Ak)));
      s5.appendChild(R.para(res.powers.check ? "Check: multiplying A by itself " + k + " times gives the same matrix." : "Direct multiplication gives a different matrix. This is a bug; please report it.", "check-line"));
      s5.appendChild(R.para("The eigenvalues of A" + sup(k) + " are " + res.eigen.eigenvalues.map((e) => paren(e.value) + sup(k) + " = " + D(Eigen.power(e.value, k))).join(", ") + ", with the same eigenspaces (Thm 5.4).", "check-line"));
      body.appendChild(s5);
    }
  }

  /* ---------- Cayley–Hamilton ---------- */

  function renderCH(res) {
    const n = res.n;
    const pw = (j) => Diagonalization.powName(j);
    const s1 = R.section("1. The characteristic polynomial");
    s1.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("A", res.A)), R.scroller(R.labeled("λI" + sub(n) + " − A", res.C))]));
    s1.appendChild(R.para("p(λ) = det(λI" + sub(n) + " − A) = " + D(res.p), "answer-line"));
    s1.appendChild(R.para(res.coeffs.map((c, j) => "c" + sub(j) + " = " + D(c)).join(",  "), "check-line"));
    body.appendChild(s1);

    const s2 = R.section(
      "2. Q(λ) = adj(λI" + sub(n) + " − A)",
      "Q(λ) is the adjoint (the transpose of the matrix of cofactors) of λI − A. Its entries are polynomials of degree at most " + (n - 1) + ", so Q(λ) = Q₀ + Q₁λ + ⋯ + Q" + sub(n - 1) + "λ" + (n - 1 > 1 ? sup(n - 1) : "") + "."
    );
    s2.appendChild(R.scroller(R.labeled("Q(λ)", res.Q)));
    s2.appendChild(R.vectors(res.Qk.map((M, j) => ({ name: "Q" + sub(j), vector: M }))));
    s2.appendChild(R.para("Check: Q(λ)(λI − A), multiplied out:", "check-line"));
    s2.appendChild(R.scroller(R.labeled("Q(λ)(λI − A)", res.QC)));
    s2.appendChild(R.para(res.checkQ ? "It equals p(λ)I: every diagonal entry is p(λ) and every other entry is 0." : "It does not equal p(λ)I. This is a bug; please report it.", "verdict"));
    body.appendChild(s2);

    const s3 = R.section("3. Verify p(A) = 0", "Replace λᵏ by Aᵏ (and the constant c₀ by c₀I), then add.");
    s3.appendChild(R.para("p(A) = " + Diagonalization.comboText(res.coeffs), "subst-work"));
    s3.appendChild(R.vectors(res.powers.slice(2).map((M, j) => ({ name: pw(j + 2), vector: M }))));
    s3.appendChild(R.vectors(res.terms.filter((t) => !t.c.isZero()).map((t) => ({ name: RowReduce.coef(t.c) + pw(t.k), vector: t.term }))));
    s3.appendChild(R.scroller(R.labeled("p(A)", res.pA)));
    s3.appendChild(R.para(res.checkZero ? "p(A) = 0, as the Cayley–Hamilton theorem says." : "p(A) ≠ 0. This is a bug; please report it.", "verdict"));
    body.appendChild(s3);

    const red = res.reduction;
    if (red) {
      const k = red.k;
      const s4 = R.section("4. A" + sup(k) + " from the characteristic equation", "Use p(A) = 0 to rewrite " + pw(n) + ", then multiply by A and rewrite " + pw(n) + " again, one power at a time.");
      if (red.belowN) {
        s4.appendChild(R.para("k = " + k + " is below n = " + n + ", so A" + sup(k) + " is already one of I, A, …, " + pw(n - 1) + ".", "check-line"));
        s4.appendChild(R.scroller(R.labeled(pw(k), red.value)));
      } else {
        const ol = R.el("ol", { class: "subst" });
        red.lines.forEach((t) => ol.appendChild(R.el("li", {}, [R.el("div", { class: "subst-work", text: t })])));
        s4.appendChild(ol);
        s4.appendChild(R.para(red.text, "answer-line"));
        s4.appendChild(R.scroller(R.labeled(pw(k), red.value)));
        s4.appendChild(R.para(red.check ? "Check: direct multiplication gives the same matrix." : "Direct multiplication differs. This is a bug; please report it.", "check-line"));
      }
      body.appendChild(s4);
    }

    const inv = res.inverse;
    const s5 = R.section((red ? "5" : "4") + ". A⁻¹ from p(A) = 0");
    if (inv.exists) {
      const ol = R.el("ol", { class: "subst" });
      inv.lines.forEach((t) => ol.appendChild(R.el("li", {}, [R.el("div", { class: "subst-work", text: t })])));
      s5.appendChild(ol);
      s5.appendChild(R.scroller(R.labeled("A⁻¹", inv.value)));
      s5.appendChild(R.para(inv.check ? "Check: AA⁻¹ = I." : "AA⁻¹ ≠ I. This is a bug; please report it.", "verdict"));
    } else {
      s5.classList.add("block-fail");
      s5.appendChild(R.para("c₀ = p(0) = 0, so A is singular and A⁻¹ does not exist.", "fail-text"));
    }
    body.appendChild(s5);
  }

  /* ---------- Events ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const { values, errors } = R.readInputGrid(gridA, place);
    const k = EigenView.readK(kInput, errors);
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }
    body.innerHTML = "";
    if (partSelect.value === "diag") renderDiag(Diagonalization.diagonalize(values, k));
    else renderCH(Diagonalization.cayleyHamilton(values, k));
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
  partSelect.addEventListener("change", sync);
  $("e2-example").addEventListener("click", () => {
    const ex = EXAMPLES[partSelect.value];
    sizeSelect.value = String(ex.A.length);
    build(false);
    R.fillInputGrid(gridA, ex.A);
    kInput.value = ex.k;
    update();
    results.hidden = true;
    solveButton.focus();
  });
  $("e2-clear").addEventListener("click", () => {
    build(false);
    kInput.value = "";
    results.hidden = true;
  });

  build(false);
  sync();
})();
