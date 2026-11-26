/*
 * tab-ab1.js — Systems of Linear Equations tab: input wiring and rendering.
 * Math: systems.js (Gaussian elimination + back-substitution). Rendering primitives: render.js.
 */
(function () {
  "use strict";

  const R = Render;

  // Problem A (AMAT 105 Review & Exercises): 2x − y + 3z = 9, x − 3y − 2z = 0, 3x + 2y − z = −1
  const EXAMPLE = {
    A: [["2", "-1", "3"], ["1", "-3", "-2"], ["3", "2", "-1"]],
    b: [["9"], ["0"], ["-1"]],
  };

  const $ = (id) => document.getElementById(id);
  const form = $("ab1-form");
  const rowsSelect = $("ab1-rows");
  const colsSelect = $("ab1-cols");
  const namesSelect = $("ab1-names");
  const gridA = $("ab1-grid-a");
  const gridB = $("ab1-grid-b");
  const solveButton = $("ab1-solve");
  const message = $("ab1-message");
  const results = $("ab1-results");
  const body = $("ab1-body");
  const heading = $("ab1-results-heading");
  const update = R.requireFilled(solveButton, $("ab1-hint"), form, "solve");

  R.fillSelect(rowsSelect, 1, 6, 3);
  R.fillSelect(colsSelect, 1, 6, 3);

  function build(keep) {
    const m = Number(rowsSelect.value);
    const n = Number(colsSelect.value);
    R.buildInputGrid(gridA, m, n, (i, j) => "A, equation " + (i + 1) + ", coefficient " + (j + 1), keep);
    R.buildInputGrid(gridB, m, 1, (i) => "b, equation " + (i + 1), keep);
    R.clearErrors(message, form);
    update();
  }

  const list = (items) => (items.length <= 2 ? items.join(" and ") : items.slice(0, -1).join(", ") + " and " + items[items.length - 1]);

  /* "0x + 0y = 1": the contradictory row, whose coefficients are all 0. */
  function rowEquation(row, names) {
    return names.map((v) => "0" + v).join(" + ") + " = " + row[names.length].toDisplay();
  }

  function render(res) {
    const { n, names, aug, reduction } = res;
    const W = reduction.ref;
    body.innerHTML = "";

    // 1. Gaussian elimination
    const s1 = R.section(
      "1. Gaussian elimination: reduce [A | b] to row echelon form",
      "Three elementary row operations are used: interchange two rows, multiply a row by a nonzero constant, and add a multiple of one row to another."
    );
    s1.appendChild(R.scroller(R.labeled("[A | b]", aug, { augment: n })));
    if (reduction.steps.length) {
      s1.appendChild(R.stepList(reduction.steps, null, { augment: n }));
    } else {
      s1.appendChild(R.para("[A | b] is already in row echelon form, so no row operations are needed.", "check-line"));
    }
    s1.appendChild(R.para("The row echelon form:", "check-line"));
    s1.appendChild(R.scroller(R.labeled("REF", W, { augment: n, highlightRows: res.status === "inconsistent" ? [res.badRow] : [] })));
    body.appendChild(s1);

    // 2. Consistency
    const s2 = R.section("2. Is the system consistent?");
    if (res.status === "inconsistent") {
      s2.classList.add("block-fail");
      const row = W[res.badRow];
      s2.appendChild(
        R.para(
          "Row " + (res.badRow + 1) + " of the row echelon form (in blue) reads " + rowEquation(row, names) + ", that is, 0 = " + row[n].toDisplay() +
            ". No values of " + list(names) + " make this true, so the system is inconsistent: it has no solution.",
          "fail-text"
        )
      );
      body.appendChild(s2);
      return;
    }
    const facts = [
      R.el("dt", { text: "Leading variables" }),
      R.el("dd", { text: res.leading.length ? list(res.leading.map((j) => names[j])) : "none" }),
      R.el("dt", { text: "Free variables" }),
      R.el("dd", { text: res.free.length ? list(res.free.map((j) => names[j])) : "none" }),
    ];
    s2.appendChild(R.el("dl", { class: "facts" }, facts));
    if (res.zeroRows.length) {
      s2.appendChild(R.para("Row" + (res.zeroRows.length > 1 ? "s " : " ") + list(res.zeroRows.map((i) => String(i + 1))) + " of the echelon form " + (res.zeroRows.length > 1 ? "are" : "is") + " all zeros (0 = 0) and give" + (res.zeroRows.length > 1 ? "" : "s") + " no condition.", "check-line"));
    }
    s2.appendChild(
      R.para(
        res.status === "unique"
          ? "No row reads 0 = 1, so the system is consistent. Every variable is a leading variable, so the solution is unique."
          : "No row reads 0 = 1, so the system is consistent. " + list(res.free.map((j) => names[j])) + (res.free.length > 1 ? " are" : " is") +
            " free, so the system has infinitely many solutions.",
        "verdict"
      )
    );
    body.appendChild(s2);

    // 3. Back-substitution
    const s3 = R.section(
      "3. Back-substitution",
      "Write each nonzero row as an equation and solve it for its leading variable, starting from the last one and substituting the values already found."
    );
    const ol = R.el("ol", { class: "subst" });
    res.back.forEach((st) => {
      const li = R.el("li", {}, [R.el("div", { class: "subst-eq", text: st.equation })]);
      if (st.substitution) li.appendChild(R.el("div", { class: "subst-work", text: st.substitution }));
      li.appendChild(R.el("div", { class: "subst-value", text: st.result }));
      ol.appendChild(li);
    });
    s3.appendChild(ol);
    body.appendChild(s3);

    // Answer
    const ans = R.el("section", { class: "block answer" }, [R.el("h3", { text: res.status === "unique" ? "The solution" : "The solution set" })]);
    if (res.status === "unique") {
      ans.appendChild(R.para(res.values.map((v, j) => names[j] + " = " + v.toDisplay()).join(",  "), "answer-line"));
    } else {
      const freeNames = res.free.map((j) => names[j]);
      ans.appendChild(R.para(list(freeNames) + (freeNames.length > 1 ? " can be any real numbers, and" : " can be any real number, and"), "check-line"));
      res.leading.forEach((p) => ans.appendChild(R.para(names[p] + " = " + Systems.affDisplay(res.solution[p], names), "answer-line")));
      ans.appendChild(
        R.para("(" + names.join(", ") + ") = (" + res.solution.map((x) => Systems.affDisplay(x, names)).join(", ") + ")", "check-line")
      );
    }
    body.appendChild(ans);

    // Check
    const s4 = R.section("4. Check");
    if (res.status === "unique") {
      s4.appendChild(R.para("A times the solution:", "check-line"));
    } else {
      s4.appendChild(R.para("With every free variable set to 0, the solution is (" + res.check.particular.map((x) => x.toDisplay()).join(", ") + "). A times it:", "check-line"));
    }
    s4.appendChild(R.scroller(R.mathRow(["A(" + names.join(", ") + ")", "=", R.matrix(res.check.Ax)], "A times the solution")));
    s4.appendChild(R.para(res.check.ok ? "It equals b: every equation holds." : "It does not equal b. This is a bug; please report it.", "verdict"));
    res.check.directions.forEach((d) => {
      s4.appendChild(
        R.para(
          "Increasing " + names[d.free] + " by 1 changes the solution by (" + d.vector.map((x) => x.toDisplay()).join(", ") + "), and A times that is " +
            (d.ok ? "0, so every value of " + names[d.free] + " gives a solution." : "not 0. This is a bug; please report it."),
          "check-line"
        )
      );
    });
    body.appendChild(s4);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    R.clearErrors(message, form);
    const a = R.readInputGrid(gridA, (i, j) => "A, equation " + (i + 1) + ", coefficient " + (j + 1));
    const b = R.readInputGrid(gridB, (i) => "b, equation " + (i + 1));
    const errors = a.errors.concat(b.errors);
    if (errors.length) {
      R.showErrors(message, errors);
      results.hidden = true;
      return;
    }
    const names = Systems.variableNames(Number(colsSelect.value), namesSelect.value);
    render(Systems.solve(a.values, b.values.map((r) => r[0]), names));
    R.reveal(results, heading);
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      update();
    }
  });

  [rowsSelect, colsSelect].forEach((sel) => sel.addEventListener("change", () => {
    build(true);
    results.hidden = true;
  }));
  namesSelect.addEventListener("change", () => {
    results.hidden = true;
  });

  $("ab1-example").addEventListener("click", () => {
    rowsSelect.value = "3";
    colsSelect.value = "3";
    build(false);
    R.fillInputGrid(gridA, EXAMPLE.A);
    R.fillInputGrid(gridB, EXAMPLE.b);
    update();
    results.hidden = true;
    solveButton.focus();
  });

  $("ab1-clear").addEventListener("click", () => {
    build(false);
    results.hidden = true;
    gridA.querySelector("input").focus();
  });

  build(false);
})();
