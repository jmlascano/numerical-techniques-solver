/*
 * tab-b3.js — B3 LU Decomposition tab: input wiring and rendering.
 * Math: lu.js. Rendering primitives: render.js.
 */
(function () {
  "use strict";

  const R = Render;
  const sub = RowReduce.sub;

  const EXAMPLE = {
    // AMAT 105 Review & Exercises, Problem A
    A: [["2", "-1", "3"], ["1", "-3", "-2"], ["3", "2", "-1"]],
    b: [["9"], ["0"], ["-1"]],
  };

  const $ = (id) => document.getElementById(id);
  const form = $("b3-form");
  const sizeSelect = $("b3-size");
  const gridA = $("b3-grid-a");
  const gridB = $("b3-grid-b");
  const solveButton = $("b3-solve");
  const solveHint = $("b3-hint");
  const message = $("b3-message");
  const results = $("b3-results");
  const body = $("b3-body");
  const heading = $("b3-results-heading");

  function build(n, keep) {
    R.buildInputGrid(gridA, n, n, (i, j) => "A, row " + (i + 1) + ", column " + (j + 1), keep);
    R.buildInputGrid(gridB, n, 1, (i) => "b, row " + (i + 1), keep);
    R.clearErrors(message, form);
    updateSolveState();
  }

  function updateSolveState() {
    const missing = R.countEmpty(gridA);
    solveButton.disabled = missing > 0;
    solveHint.textContent = missing > 0 ? "Fill in every entry of A to solve (" + missing + " empty)." : "";
  }

  /* A is required; b is optional, but if any entry of b is filled, all must be. */
  function readInputs() {
    const a = R.readInputGrid(gridA, (i, j) => "A, row " + (i + 1) + ", column " + (j + 1));
    const errors = a.errors.slice();
    let b = null;
    const bEmpty = R.countEmpty(gridB);
    const n = a.values.length;
    if (bEmpty < n) {
      const bb = R.readInputGrid(gridB, (i) => "b, row " + (i + 1));
      bb.errors.forEach((e) => {
        if (e.el.value.trim() === "") e.text = e.text.replace("empty.", "empty. Fill in all of b, or leave all of b empty.");
        errors.push(e);
      });
      b = bb.values.map((row) => row[0]);
    }
    return { A: a.values, b, errors };
  }

  function render(A, b, out) {
    const lu = out.lu;
    body.innerHTML = "";

    // 1. Row operations
    const steps = R.section(
      "1. Row operations: reduce A to U",
      "Only two kinds of operations are used: multiply a row by a nonzero constant, and add a multiple of a row to a row below it. No row interchanges."
    );
    steps.appendChild(R.scroller(R.labeled("A", A)));
    let column = -1;
    steps.appendChild(
      R.stepList(lu.steps, (s) => {
        if (s.kind !== "scale" || s.rows[0] === column) return null;
        column = s.rows[0];
        return "Column " + (column + 1) + ": make the pivot 1, then make the entries below it 0";
      })
    );
    body.appendChild(steps);

    if (!lu.ok) {
      const fail = R.section("Cannot continue");
      fail.classList.add("block-fail");
      fail.appendChild(R.para(lu.message, "fail-text"));
      if (lu.matrix) fail.appendChild(R.scroller(R.labeled("Current matrix", lu.matrix)));
      body.appendChild(fail);
      return;
    }

    // 2. L and U
    const lus = R.section(
      "2. The factors L and U",
      "U is the row echelon form above. L has each pivot on its diagonal and each eliminated value below it, read from the steps."
    );
    lus.appendChild(R.el("div", { class: "pair" }, [R.scroller(R.labeled("L", lu.L)), R.scroller(R.labeled("U", lu.U))]));
    body.appendChild(lus);

    let num = 3;
    if (b) {
      const fwd = R.section(num++ + ". Forward substitution: solve Ly = b for y");
      fwd.appendChild(substitutionList(out.forward.steps));
      fwd.appendChild(R.scroller(R.labeled("y", out.forward.y)));
      body.appendChild(fwd);

      const back = R.section(num++ + ". Back substitution: solve Ux = y for x", "Work from the last row up.");
      back.appendChild(substitutionList(out.back.steps));
      body.appendChild(back);

      const ans = R.el("section", { class: "block answer" }, [R.el("h3", { text: "Solution x" })]);
      ans.appendChild(R.scroller(R.labeled("x", out.back.x)));
      ans.appendChild(R.para(out.back.x.map((v, i) => "x" + sub(i + 1) + " = " + v.toDisplay()).join(",  "), "answer-line"));
      body.appendChild(ans);
    }

    const check = R.section(num + ". Check");
    check.appendChild(R.para("LU, multiplied out:", "check-line"));
    check.appendChild(R.scroller(R.labeled("LU", out.check.LU)));
    check.appendChild(R.para(out.check.luEqualsA ? "LU = A: every entry matches." : "LU ≠ A. This is a bug; please report it.", "verdict"));
    if (b) {
      check.appendChild(R.para("A times the solution x:", "check-line"));
      check.appendChild(R.scroller(R.labeled("Ax", out.check.Ax)));
      check.appendChild(R.para(out.check.axEqualsB ? "Ax = b: every entry matches." : "Ax ≠ b. This is a bug; please report it.", "verdict"));
    }
    body.appendChild(check);
  }

  function substitutionList(steps) {
    const list = R.el("ol", { class: "subst" });
    steps.forEach((s) => {
      const li = R.el("li", {}, [R.el("div", { class: "subst-eq", text: s.equation })]);
      if (s.work !== s.value && s.work !== s.equation) li.appendChild(R.el("div", { class: "subst-work", text: s.work }));
      li.appendChild(R.el("div", { class: "subst-value", text: s.value }));
      list.appendChild(li);
    });
    return list;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const { A, b, errors } = readInputs();
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }
    render(A, b, LU.solve(A, b));
    R.reveal(results, heading);
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      updateSolveState();
    }
  });

  sizeSelect.addEventListener("change", () => {
    build(Number(sizeSelect.value), true);
    results.hidden = true;
  });

  $("b3-example").addEventListener("click", () => {
    sizeSelect.value = "3";
    build(3, false);
    R.fillInputGrid(gridA, EXAMPLE.A);
    R.fillInputGrid(gridB, EXAMPLE.b);
    updateSolveState();
    results.hidden = true;
    solveButton.focus();
  });

  $("b3-clear").addEventListener("click", () => {
    build(Number(sizeSelect.value), false);
    results.hidden = true;
    gridA.querySelector("input").focus();
  });

  build(Number(sizeSelect.value), false);
})();
