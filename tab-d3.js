/*
 * tab-d3.js — D3 Row, Column and Null Spaces tab: input wiring and rendering.
 * Math: spaces.js (on top of rowreduce.js). Rendering primitives: render.js.
 */
(function () {
  "use strict";

  const R = Render;
  const sub = RowReduce.sub;

  const EXAMPLE = [
    ["1", "-2", "0", "0", "3"],
    ["2", "-5", "-3", "-2", "6"],
    ["0", "5", "15", "10", "0"],
    ["2", "6", "18", "8", "6"],
  ];

  const $ = (id) => document.getElementById(id);
  const form = $("d3-form");
  const rowsSelect = $("d3-rows");
  const colsSelect = $("d3-cols");
  const gridA = $("d3-grid-a");
  const solveButton = $("d3-solve");
  const solveHint = $("d3-hint");
  const message = $("d3-message");
  const results = $("d3-results");
  const body = $("d3-body");
  const heading = $("d3-results-heading");

  const place = (i, j) => "A, row " + (i + 1) + ", column " + (j + 1);
  const x = (j) => "x" + sub(j + 1);
  const list = (items) => items.join(", ");

  function build(keep) {
    R.buildInputGrid(gridA, Number(rowsSelect.value), Number(colsSelect.value), place, keep);
    R.clearErrors(message, form);
    updateSolveState();
  }

  function updateSolveState() {
    const missing = R.countEmpty(gridA);
    solveButton.disabled = missing > 0;
    solveHint.textContent = missing > 0 ? "Fill in every entry of A to find the bases (" + missing + " empty)." : "";
  }

  function render(res) {
    const { A, n, reduction, rank, nullity } = res;
    const pivots = reduction.pivots;
    const pivotList = list(pivots.map((p) => String(p + 1)));
    const ns = res.nullSpace;
    body.innerHTML = "";

    // 1. Row reduction
    const s1 = R.section(
      "1. Reduce A to reduced row echelon form R",
      "Gauss–Jordan elimination. Forward phase: make each leading 1 and the zeros below it. Backward phase: make the zeros above each leading 1."
    );
    s1.appendChild(R.scroller(R.labeled("A", A)));
    if (reduction.steps.length === 0) {
      s1.appendChild(R.para("A is already in reduced row echelon form, so no row operations are needed.", "check-line"));
    } else {
      let phase = null;
      s1.appendChild(
        R.stepList(reduction.steps, (s) => {
          if (s.phase === phase) return null;
          phase = s.phase;
          return phase === "forward" ? "Forward phase" : "Backward phase";
        })
      );
    }
    s1.appendChild(R.para("The reduced row echelon form, with the pivot columns (the columns with leading 1s) in blue:", "check-line"));
    s1.appendChild(R.scroller(R.labeled("R", reduction.rref, { highlightCols: pivots })));
    s1.appendChild(
      R.para(pivots.length ? "Pivot columns: " + pivotList + "." : "R has no leading 1s, so there are no pivot columns.", "verdict")
    );
    body.appendChild(s1);

    // 2. Row space
    const s2 = R.section("2. Basis for the row space of A", "The nonzero rows of R form a basis for the row space of A.");
    if (res.rowBasis.length) {
      s2.appendChild(R.vectors(res.rowBasis.map((row, i) => ({ name: "r" + sub(i + 1), vector: row, opts: { asRow: true } }))));
    } else {
      s2.appendChild(R.para("R has no nonzero rows, so the row space of A is {0}. Its basis is empty.", "verdict"));
    }
    body.appendChild(s2);

    // 3. Column space
    const s3 = R.section(
      "3. Basis for the column space of A",
      "Row operations change the column space, but they preserve the dependency relations among the columns. So the columns of the original A in the pivot positions form a basis."
    );
    if (res.colBasis.length) {
      s3.appendChild(R.para("Pivot columns " + pivotList + " of A, in blue:", "check-line"));
      s3.appendChild(R.scroller(R.labeled("A", A, { highlightCols: pivots })));
      s3.appendChild(R.vectors(res.colBasis.map((c) => ({ name: "c" + sub(c.col + 1), vector: c.vector }))));
    } else {
      s3.appendChild(R.para("There are no pivot columns, so the column space of A is {0}. Its basis is empty.", "verdict"));
    }
    body.appendChild(s3);

    // 4. Null space
    const s4 = R.section("4. Basis for the null space of A", "Ax = 0 has the same solutions as Rx = 0. Solve each equation of Rx = 0 for its leading variable.");
    if (ns.equations.length) {
      const eqs = R.el("ol", { class: "subst" });
      ns.equations.forEach((e) => {
        const li = R.el("li", {}, [R.el("div", { class: "subst-eq", text: e.equation })]);
        if (e.solved !== e.equation) li.appendChild(R.el("div", { class: "subst-value", text: e.solved }));
        eqs.appendChild(li);
      });
      s4.appendChild(eqs);
    } else {
      s4.appendChild(R.para("R has no nonzero rows, so every equation of Rx = 0 reads 0 = 0 and puts no condition on x.", "check-line"));
    }
    s4.appendChild(
      R.el("dl", { class: "facts" }, [
        R.el("dt", { text: "Leading variables" }),
        R.el("dd", { text: ns.leading.length ? list(ns.leading.map(x)) : "none" }),
        R.el("dt", { text: "Free variables" }),
        R.el("dd", { text: ns.free.length ? list(ns.free.map(x)) : "none" }),
      ])
    );

    if (ns.free.length) {
      s4.appendChild(R.para("Let " + list(ns.free.map((f, k) => x(f) + " = " + ns.params[k])) + ". The general solution in parametric vector form is", "check-line"));
      const parts = ["x", "=", R.matrix(ns.general, { label: "general solution" }), "="];
      ns.basis.forEach((b, k) => {
        // keep "+ t" together with its vector when the row wraps on a phone
        parts.push(R.term((k > 0 ? "+ " : "") + b.param, R.matrix(b.vector, { label: "v" + sub(k + 1) })));
      });
      s4.appendChild(R.scroller(R.mathRow(parts, "general solution in parametric vector form")));
      s4.appendChild(R.para("The vectors multiplying the parameters form a basis for the null space of A:", "check-line"));
      s4.appendChild(R.vectors(ns.basis.map((b, k) => ({ name: "v" + sub(k + 1), vector: b.vector }))));
    } else {
      s4.appendChild(
        R.para("There are no free variables, so the only solution of Ax = 0 is x = 0. The null space of A is {0}, and its basis is empty.", "verdict")
      );
    }
    body.appendChild(s4);

    // 5. Rank and nullity
    const s5 = R.section("5. Rank, nullity and the Dimension Theorem");
    s5.appendChild(
      R.el("dl", { class: "facts" }, [
        R.el("dt", { text: "rank(A)" }),
        R.el("dd", { text: rank + "  (the number of leading 1s in R, the dimension of the row and column spaces)" }),
        R.el("dt", { text: "nullity(A)" }),
        R.el("dd", { text: nullity + "  (the number of free variables, the dimension of the null space)" }),
      ])
    );
    s5.appendChild(
      R.para(
        "rank(A) + nullity(A) = " + rank + " + " + nullity + " = " + (rank + nullity) + ", and n = " + n + " (the number of columns of A). " +
          (res.dimensionTheoremHolds ? "Both sides agree: rank(A) + nullity(A) = n." : "The two sides differ. This is a bug; please report it."),
        "verdict"
      )
    );
    body.appendChild(s5);

    // 6. Verification
    const s6 = R.section("6. Verification: Av = 0 for each null space basis vector");
    if (res.checks.length) {
      res.checks.forEach((c, k) => {
        const name = "v" + sub(k + 1);
        s6.appendChild(R.scroller(R.mathRow(["A" + name, "=", R.matrix(c.product, { label: "A" + name })], "A" + name)));
        s6.appendChild(R.para(c.isZero ? "A" + name + " = 0: every entry is 0." : "A" + name + " ≠ 0. This is a bug; please report it.", "verdict"));
      });
    } else {
      s6.appendChild(R.para("The null space basis is empty, so there is nothing to check (A·0 = 0 always holds).", "check-line"));
    }
    body.appendChild(s6);
  }

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
    render(Spaces.analyze(values));
    R.reveal(results, heading);
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      updateSolveState();
    }
  });

  [rowsSelect, colsSelect].forEach((sel) =>
    sel.addEventListener("change", () => {
      build(true);
      results.hidden = true;
    })
  );

  $("d3-example").addEventListener("click", () => {
    rowsSelect.value = "4";
    colsSelect.value = "5";
    build(false);
    R.fillInputGrid(gridA, EXAMPLE);
    updateSolveState();
    results.hidden = true;
    solveButton.focus();
  });

  $("d3-clear").addEventListener("click", () => {
    build(false);
    results.hidden = true;
    gridA.querySelector("input").focus();
  });

  build(false);
})();
