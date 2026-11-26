/*
 * tab-e.js — Eigenvalues and Eigenvectors tab.
 * Math: eigen.js (poly.js, surd.js, matrix.js, spaces.js). Rendering primitives: render.js.
 * Shared pieces (characteristic polynomial and factoring work) are exported as EigenView for tab-e2.js.
 */
(function (global) {
  "use strict";

  const R = Render;
  const { sub, sup } = RowReduce;

  const D = (x) => x.toDisplay();
  const paren = (x) => "(" + D(x) + ")";
  const list = (items) => items.join(", ");

  /* ---------- Shared views (also used by the Diagonalization tab) ---------- */

  /* Section: λIₙ − A and det(λIₙ − A) by cofactor expansion along row 1. */
  function characteristicSections(res, startNumber) {
    const n = res.A.length;
    const out = [];
    const s1 = R.section(startNumber + ". The matrix λI" + sub(n) + " − A", "Subtract each entry of A from λ on the diagonal and from 0 off it.");
    s1.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("A", res.A)), R.scroller(R.labeled("λI" + sub(n) + " − A", res.C))]));
    out.push(s1);

    const ex = res.expansion;
    const s2 = R.section(
      startNumber + 1 + ". det(λI" + sub(n) + " − A) by cofactor expansion along row 1",
      "det = " + ex.terms.map((t) => "b" + sub(1) + sub(t.j + 1) + "C" + sub(1) + sub(t.j + 1)).join(" + ") + ", where bᵢⱼ is the entry of λI − A and Cᵢⱼ = (−1)ⁱ⁺ʲMᵢⱼ."
    );
    const ol = R.el("ol", { class: "subst" });
    ex.terms.forEach((t) => {
      const j = t.j + 1;
      const li = R.el("li", {}, []);
      if (t.entry.isZero()) {
        li.appendChild(R.el("div", { class: "subst-eq", text: "b₁" + sub(j) + " = 0, so this term is 0." }));
      } else {
        li.appendChild(R.el("div", { class: "subst-eq", text: "b₁" + sub(j) + " = " + D(t.entry) + ";  C₁" + sub(j) + " = (−1)" + sup("1+" + j) + "·M₁" + sub(j) }));
        if (t.minor.length) li.appendChild(R.scroller(R.labeled("M₁" + sub(j), t.minor)));
        if (t.minor.length === 2) {
          const [[a, b], [c, d]] = t.minor;
          li.appendChild(R.el("div", { class: "subst-work", text: "M₁" + sub(j) + " = " + paren(a) + paren(d) + " − " + paren(b) + paren(c) + " = " + D(t.minorDet) }));
        } else if (t.minor.length > 2) {
          li.appendChild(R.el("div", { class: "subst-work", text: "M₁" + sub(j) + " = " + D(t.minorDet) + "  (expanded the same way)" }));
        }
        li.appendChild(R.el("div", { class: "subst-value", text: "C₁" + sub(j) + " = " + D(t.cofactor) }));
      }
      ol.appendChild(li);
    });
    s2.appendChild(ol);
    const nonzero = ex.terms.filter((t) => !t.entry.isZero());
    s2.appendChild(R.para("p(λ) = " + (nonzero.length ? nonzero.map((t) => paren(t.entry) + paren(t.cofactor)).join(" + ") : "0"), "subst-work"));
    s2.appendChild(R.para("p(λ) = " + D(res.p), "answer-line"));
    out.push(s2);
    return out;
  }

  /* Section: factoring p(λ) — rational root test, synthetic division, quadratic formula. */
  function factorSection(res, number) {
    const f = res.factorization;
    const w = f.work;
    const s = R.section(number + ". Factor p(λ)");
    if (w.zeroRoot) s.appendChild(R.para("The constant term is 0, so λ" + (w.zeroRoot > 1 ? sup(w.zeroRoot) : "") + " is a factor.", "check-line"));
    if (w.method === "rational-root") {
      if (w.cleared) s.appendChild(R.para("Clear the fractions: multiply by " + D(w.cleared.multiplier) + " to get " + D(w.cleared.poly) + ", which has the same roots.", "check-line"));
      s.appendChild(R.para("Rational root test: any rational root is ±(a divisor of the constant term)/(a divisor of the leading coefficient). The candidates are " + list(w.candidates.map(D)) + ".", "check-line"));
      if (w.tested.length) {
        s.appendChild(R.table(["r", "p(r)", "Root?"], w.tested.map((t) => [D(t.r), D(t.value), t.isRoot ? "yes" : "no"]), [true, true, false], "Candidates tested"));
      }
      w.divisions.forEach((dv) => {
        s.appendChild(R.para("Synthetic division of " + D(dv.dividend) + " by (λ − " + D(dv.r) + "):", "check-line"));
        const t = dv.table;
        const deg = t.top.length - 1;
        const powers = t.top.map((_, i) => (deg - i === 0 ? "1" : deg - i === 1 ? "λ" : "λ" + sup(deg - i)));
        s.appendChild(R.table(
          [""].concat(powers),
          [
            ["Coefficients"].concat(t.top.map(D)),
            ["× " + D(t.r) + ", add"].concat(t.middle.map((m) => (m ? D(m) : ""))),
            ["Result"].concat(t.bottom.map(D)),
          ],
          [false].concat(t.top.map(() => true)),
          "Synthetic division by λ − " + D(t.r)
        ));
        s.appendChild(R.para("Remainder 0, so " + D(dv.dividend) + " = (λ − " + D(dv.r) + ")(" + D(dv.quotient) + ").", "subst-work"));
      });
    }
    const q = w.quadratic;
    if (q) {
      s.appendChild(R.para("Quadratic formula for " + (w.method === "quadratic" ? "p(λ)" : "the remaining factor") + ": a = " + D(q.a) + ", b = " + D(q.b) + ", c = " + D(q.c) + ", and b² − 4ac = " + D(q.disc) + ".", "check-line"));
      if (q.roots.length) {
        s.appendChild(R.para("λ = (−b ± √(b² − 4ac)) / 2a = (" + D(q.b.neg()) + " ± " + D(q.sqrtDisc) + ") / " + D(q.a.mul(new Fraction(2n))) + ", so λ = " + list(q.roots.map(D)) + ".", "subst-work"));
      }
    }
    if (w.method === "linear" && !w.zeroRoot) s.appendChild(R.para("p(λ) is linear.", "check-line"));
    s.appendChild(R.para("p(λ) = " + f.factored, "answer-line"));
    if (res.complex) {
      s.appendChild(R.para("The factor " + D(res.complex.factor) + " has b² − 4ac = " + D(q.disc) + " < 0, so its roots λ = " + res.complex.text + " are complex, not real. Over ℝ they are not eigenvalues.", "verdict"));
    }
    if (res.unsolved) {
      s.classList.add("block-fail");
      s.appendChild(R.para("No candidate is a root, so " + D(res.unsolved.factor) + " has no rational roots and does not factor over ℚ. Its roots are not of the form a ± b√d, so they cannot be written exactly here (this solver does not use decimals).", "fail-text"));
    }
    return s;
  }

  /* "2 (algebraic multiplicity 2)" */
  const eigenLine = (e) => "λ = " + D(e.value) + (e.algebraic > 1 ? "  (algebraic multiplicity " + e.algebraic + ")" : "");

  global.EigenView = { characteristicSections, factorSection, eigenLine };

  /* ---------- The Eigenvalues and Eigenvectors tab ---------- */

  // E Test 1: A = [[3, 0], [8, −1]]
  const EXAMPLE = { A: [["3", "0"], ["8", "-1"]], k: "2" };

  const $ = (id) => document.getElementById(id);
  const form = $("e-form");
  if (!form) return;
  const sizeSelect = $("e-size");
  const kInput = $("e-k");
  const gridA = $("e-grid-a");
  const solveButton = $("e-solve");
  const message = $("e-message");
  const results = $("e-results");
  const body = $("e-body");
  const heading = $("e-results-heading");
  const update = R.requireFilled(solveButton, $("e-hint"), form, "find the eigenvalues");
  const place = (i, j) => "A, row " + (i + 1) + ", column " + (j + 1);

  R.fillSelect(sizeSelect, 2, 6, 3);

  function build(keep) {
    const n = Number(sizeSelect.value);
    R.buildInputGrid(gridA, n, n, place, keep);
    R.clearErrors(message, form);
    update();
  }

  function render(res) {
    const n = res.n;
    body.innerHTML = "";
    characteristicSections(res, 1).forEach((s) => body.appendChild(s));
    body.appendChild(factorSection(res, 3));

    const s4 = R.section("4. The eigenvalues", "The eigenvalues are the real roots of the characteristic equation det(λI" + sub(n) + " − A) = 0.");
    if (res.triangular) {
      s4.appendChild(R.para("A is " + res.triangular + " triangular, so by Thm 5.3 its eigenvalues are its diagonal entries: " + list(res.A.map((row, i) => D(row[i]))) + ".", "verdict"));
    }
    res.eigenvalues.forEach((e) => s4.appendChild(R.para(eigenLine(e), "answer-line")));
    if (res.complex) s4.appendChild(R.para("λ = " + res.complex.text + " (complex, not real: not eigenvalues over ℝ)", "check-line"));
    if (!res.eigenvalues.length && !res.complex) s4.appendChild(R.para("No real eigenvalue could be written exactly.", "check-line"));
    body.appendChild(s4);

    if (res.eigenvalues.length) {
      const s5 = R.section("5. The eigenspaces", "For each eigenvalue, solve (λI − A)x = 0. A basis of the solutions is a basis of the eigenspace; its dimension is the geometric multiplicity.");
      res.eigenvalues.forEach((e) => {
        s5.appendChild(R.para(eigenLine(e), "verdict"));
        const red = e.analysis.reduction;
        s5.appendChild(R.scroller(R.labeled(paren(e.value) + "I − A", e.matrix)));
        if (red.steps.length) s5.appendChild(R.disclosure("Show the row reduction (" + red.steps.length + " step" + (red.steps.length > 1 ? "s" : "") + ")", [R.stepList(red.steps)]));
        s5.appendChild(R.scroller(R.labeled("R", red.rref, { highlightCols: red.pivots })));
        const ns = e.analysis.nullSpace;
        s5.appendChild(R.para("Free variable" + (ns.free.length > 1 ? "s: " : ": ") + list(ns.free.map((f) => "x" + sub(f + 1))) + ". A basis for the eigenspace:", "check-line"));
        s5.appendChild(R.vectors(e.basis.map((v, i) => ({ name: "v" + sub(i + 1), vector: v }))));
        s5.appendChild(R.para("Dimension " + e.geometric + " (geometric multiplicity). " + (e.checks.every(Boolean) ? "Check: Av = λv for each basis vector." : "Av ≠ λv. This is a bug; please report it."), "check-line"));
      });
      body.appendChild(s5);
    }

    const s6 = R.section(res.eigenvalues.length ? "6. More" : "5. More");
    if (res.powers && !res.eigenvalues.length) {
      s6.appendChild(R.para("There is no real eigenvalue written exactly, so there is nothing to raise to the power " + res.powers.k + ".", "check-line"));
    } else if (res.powers) {
      const k = res.powers.k;
      s6.appendChild(R.para("By Thm 5.4, the eigenvalues of A" + sup(k) + " are λ" + sup(k) + " with the same eigenvectors:", "check-line"));
      res.powers.values.forEach((p) => s6.appendChild(R.para(paren(p.value) + sup(k) + " = " + D(p.power), "subst-work")));
    }
    s6.appendChild(
      R.para(
        res.zeroIsEigenvalue
          ? "0 is an eigenvalue (p(0) = 0), so by Thm 5.6 A is not invertible. det(A) = " + D(res.det) + "."
          : "0 is not an eigenvalue (p(0) ≠ 0), so by Thm 5.6 A is invertible. det(A) = " + D(res.det) + ".",
        "verdict"
      )
    );
    body.appendChild(s6);
  }

  function readK(input, errors) {
    const t = input.value.trim();
    if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > 50) {
      errors.push({ el: input, text: "k: “" + t + "” must be a whole number from 1 to 50." });
      return null;
    }
    return Number(t);
  }
  global.EigenView.readK = readK;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const { values, errors } = R.readInputGrid(gridA, place);
    const k = readK(kInput, errors);
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }
    render(Eigen.analyze(values, k));
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
  $("e-example").addEventListener("click", () => {
    sizeSelect.value = "2";
    build(false);
    R.fillInputGrid(gridA, EXAMPLE.A);
    kInput.value = EXAMPLE.k;
    update();
    results.hidden = true;
    solveButton.focus();
  });
  $("e-clear").addEventListener("click", () => {
    build(false);
    kInput.value = "";
    results.hidden = true;
  });

  build(false);
})(typeof window !== "undefined" ? window : globalThis);
