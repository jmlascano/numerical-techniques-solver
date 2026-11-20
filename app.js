/*
 * app.js — UI wiring and rendering. All math lives in fraction.js and lu.js.
 */
(function () {
  "use strict";

  const EXAMPLE = {
    // AMAT 105 Review & Exercises, Problem A
    A: [["2", "-1", "3"], ["1", "-3", "-2"], ["3", "2", "-1"]],
    b: ["9", "0", "-1"],
  };

  const sizeSelect = document.getElementById("size");
  const gridA = document.getElementById("grid-a");
  const gridB = document.getElementById("grid-b");
  const form = document.getElementById("input-form");
  const solveButton = document.getElementById("solve");
  const solveHint = document.getElementById("solve-hint");
  const message = document.getElementById("message");
  const results = document.getElementById("results");
  const resultsBody = document.getElementById("results-body");
  const resultsHeading = document.getElementById("results-heading");

  const sub = LU.sub;
  let n = Number(sizeSelect.value);

  /* ---------- Input grid ---------- */

  function makeInput(label, value) {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "text"; // allow "/" and "-" on phone keyboards
    input.autocomplete = "off";
    input.spellcheck = false;
    input.className = "cell";
    input.setAttribute("aria-label", label);
    input.value = value || "";
    return input;
  }

  function currentValues() {
    const a = [];
    const b = [];
    gridA.querySelectorAll("input").forEach((el) => {
      const i = Number(el.dataset.row);
      const j = Number(el.dataset.col);
      (a[i] = a[i] || [])[j] = el.value;
    });
    gridB.querySelectorAll("input").forEach((el) => {
      b[Number(el.dataset.row)] = el.value;
    });
    return { a, b };
  }

  function buildGrid(size, keep) {
    const old = keep ? currentValues() : { a: [], b: [] };
    gridA.innerHTML = "";
    gridB.innerHTML = "";
    gridA.style.setProperty("--cols", size);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const input = makeInput("A, row " + (i + 1) + ", column " + (j + 1), old.a[i] && old.a[i][j]);
        input.dataset.row = i;
        input.dataset.col = j;
        gridA.appendChild(input);
      }
      const bi = makeInput("b, row " + (i + 1), old.b[i]);
      bi.dataset.row = i;
      gridB.appendChild(bi);
    }
    n = size;
    clearMessage();
    updateSolveState();
  }

  function allInputs() {
    return Array.from(form.querySelectorAll("input.cell"));
  }

  function updateSolveState() {
    const missing = Array.from(gridA.querySelectorAll("input")).filter((el) => el.value.trim() === "").length;
    solveButton.disabled = missing > 0;
    solveHint.textContent = missing > 0 ? "Fill in every entry of A to solve (" + missing + " empty)." : "";
  }

  /* ---------- Messages ---------- */

  function clearMessage() {
    message.textContent = "";
    message.classList.remove("is-visible");
    allInputs().forEach((el) => el.removeAttribute("aria-invalid"));
  }

  function showMessage(text) {
    message.textContent = text;
    message.classList.add("is-visible");
  }

  /* ---------- Parsing ---------- */

  function readInputs() {
    const errors = [];
    const A = [];
    for (let i = 0; i < n; i++) A.push([]);
    gridA.querySelectorAll("input").forEach((el) => {
      const i = Number(el.dataset.row);
      const j = Number(el.dataset.col);
      try {
        A[i][j] = Fraction.parse(el.value);
      } catch (e) {
        errors.push({ el, text: "A, row " + (i + 1) + ", column " + (j + 1) + ": " + describe(el.value, e) });
      }
    });

    const bInputs = Array.from(gridB.querySelectorAll("input"));
    const filled = bInputs.filter((el) => el.value.trim() !== "");
    let b = null;
    if (filled.length > 0) {
      b = [];
      bInputs.forEach((el) => {
        const i = Number(el.dataset.row);
        if (el.value.trim() === "") {
          errors.push({ el, text: "b, row " + (i + 1) + ": empty. Fill in all of b, or leave all of b empty." });
          return;
        }
        try {
          b[i] = Fraction.parse(el.value);
        } catch (e) {
          errors.push({ el, text: "b, row " + (i + 1) + ": " + describe(el.value, e) });
        }
      });
    }
    return { A, b, errors };
  }

  function describe(value, err) {
    if (value.trim() === "") return "empty.";
    return "“" + value.trim() + "” is " + (err.message === "the denominator cannot be 0" ? "invalid; the denominator cannot be 0." : "not a number. Use forms like 3, -0.25, or -3/4.");
  }

  /* ---------- Rendering helpers ---------- */

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  /* A matrix (array of rows) or column vector (array) drawn with brackets. */
  function matrix(M, opts) {
    opts = opts || {};
    const rows = Array.isArray(M[0]) ? M : M.map((x) => [x]);
    const cols = rows[0].length;
    const grid = el("div", { class: "m-grid", role: "table", "aria-label": opts.label || "matrix" });
    grid.style.setProperty("--cols", cols);
    rows.forEach((row, i) => {
      const r = el("div", { class: "m-row" + (opts.highlightRow === i ? " is-changed" : ""), role: "row" });
      row.forEach((f) => r.appendChild(el("span", { class: "m-cell", role: "cell", text: f.toDisplay() })));
      grid.appendChild(r);
    });
    return el("div", { class: "m-bracket" }, [grid]);
  }

  function labeled(name, M, opts) {
    return el("figure", { class: "labeled" }, [
      el("figcaption", { class: "m-name", text: name }),
      el("span", { class: "eq", "aria-hidden": "true", text: "=" }),
      matrix(M, Object.assign({ label: name }, opts)),
    ]);
  }

  function section(title, intro) {
    const s = el("section", { class: "block" }, [el("h3", { text: title })]);
    if (intro) s.appendChild(el("p", { class: "block-intro", text: intro }));
    return s;
  }

  function scroller(child) {
    return el("div", { class: "scroll-x" }, [child]);
  }

  /* ---------- Render the full solution ---------- */

  function render(A, b, out) {
    const lu = out.lu;
    resultsBody.innerHTML = "";

    // 1. Row operations
    const steps = section(
      "1. Row operations: reduce A to U",
      "Only two kinds of operations are used: multiply a row by a nonzero constant, and add a multiple of a row to a row below it. No row interchanges."
    );
    steps.appendChild(scroller(labeled("A", A)));
    const list = el("ol", { class: "steps" });
    let column = -1;
    lu.steps.forEach((s) => {
      const k = s.kind === "scale" ? s.row : null;
      if (k !== null && k !== column) {
        column = k;
        list.appendChild(
          el("li", { class: "step-group", "aria-hidden": "true" }, [
            el("span", { text: "Column " + (k + 1) + ": make the pivot 1, then make the entries below it 0" }),
          ])
        );
      }
      const item = el("li", { class: "step" + (s.matrix ? "" : " is-skip") }, [
        el("div", { class: "step-head" }, [
          el("span", { class: "op", text: s.text }),
          el("span", { class: "l-note", text: s.lNote }),
        ]),
      ]);
      if (s.matrix) item.appendChild(scroller(matrix(s.matrix, { highlightRow: s.row, label: "matrix after " + s.text })));
      list.appendChild(item);
    });
    steps.appendChild(list);
    resultsBody.appendChild(steps);

    // Failure: zero pivot
    if (!lu.ok) {
      const fail = section("Cannot continue");
      fail.classList.add("block-fail");
      fail.appendChild(el("p", { class: "fail-text", text: lu.message }));
      if (lu.matrix) fail.appendChild(scroller(labeled("Current matrix", lu.matrix)));
      resultsBody.appendChild(fail);
      return;
    }

    // 2. L and U
    const lus = section(
      "2. The factors L and U",
      "U is the row echelon form above. L has each pivot on its diagonal and each eliminated value below it, read from the steps."
    );
    lus.appendChild(el("div", { class: "pair" }, [scroller(labeled("L", lu.L)), scroller(labeled("U", lu.U))]));
    resultsBody.appendChild(lus);

    let num = 3;
    if (b) {
      // 3. Forward substitution
      const fwd = section(num++ + ". Forward substitution: solve Ly = b for y");
      fwd.appendChild(substitutionList(out.forward.steps));
      fwd.appendChild(scroller(labeled("y", out.forward.y)));
      resultsBody.appendChild(fwd);

      // 4. Back substitution
      const back = section(num++ + ". Back substitution: solve Ux = y for x", "Work from the last row up.");
      back.appendChild(substitutionList(out.back.steps));
      resultsBody.appendChild(back);

      // Answer
      const ans = el("section", { class: "block answer" }, [el("h3", { text: "Solution x" })]);
      ans.appendChild(scroller(labeled("x", out.back.x)));
      ans.appendChild(
        el("p", { class: "answer-line", text: out.back.x.map((v, i) => "x" + sub(i + 1) + " = " + v.toDisplay()).join(",  ") })
      );
      resultsBody.appendChild(ans);
    }

    // Check
    const check = section(num + ". Check");
    check.appendChild(el("p", { class: "check-line", text: "LU, multiplied out:" }));
    check.appendChild(scroller(labeled("LU", out.check.LU)));
    check.appendChild(el("p", { class: "verdict", text: out.check.luEqualsA ? "LU = A: every entry matches." : "LU ≠ A. This is a bug; please report it." }));
    if (b) {
      check.appendChild(el("p", { class: "check-line", text: "A times the solution x:" }));
      check.appendChild(scroller(labeled("Ax", out.check.Ax)));
      check.appendChild(el("p", { class: "verdict", text: out.check.axEqualsB ? "Ax = b: every entry matches." : "Ax ≠ b. This is a bug; please report it." }));
    }
    resultsBody.appendChild(check);
  }

  function substitutionList(steps) {
    const list = el("ol", { class: "subst" });
    steps.forEach((s) => {
      const li = el("li", {}, [el("div", { class: "subst-eq", text: s.equation })]);
      if (s.work !== s.value && s.work !== s.equation) li.appendChild(el("div", { class: "subst-work", text: s.work }));
      li.appendChild(el("div", { class: "subst-value", text: s.value }));
      list.appendChild(li);
    });
    return list;
  }

  /* ---------- Events ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (solveButton.disabled) return;
    clearMessage();
    const { A, b, errors } = readInputs();
    if (errors.length) {
      errors.forEach((x) => x.el.setAttribute("aria-invalid", "true"));
      showMessage(
        (errors.length === 1 ? "Fix this entry: " : "Fix these " + errors.length + " entries: ") + errors.map((x) => x.text).join(" ")
      );
      errors[0].el.focus();
      results.hidden = true;
      return;
    }
    const out = LU.solve(A, b);
    render(A, b, out);
    results.hidden = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    results.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    resultsHeading.focus({ preventScroll: true });
  });

  form.addEventListener("input", (e) => {
    if (e.target.matches("input.cell")) {
      e.target.removeAttribute("aria-invalid");
      updateSolveState();
    }
  });

  sizeSelect.addEventListener("change", () => {
    buildGrid(Number(sizeSelect.value), true);
    results.hidden = true;
  });

  document.getElementById("load-example").addEventListener("click", () => {
    sizeSelect.value = "3";
    buildGrid(3, false);
    gridA.querySelectorAll("input").forEach((el) => {
      el.value = EXAMPLE.A[el.dataset.row][el.dataset.col];
    });
    gridB.querySelectorAll("input").forEach((el) => {
      el.value = EXAMPLE.b[el.dataset.row];
    });
    updateSolveState();
    results.hidden = true;
    solveButton.focus();
  });

  document.getElementById("clear").addEventListener("click", () => {
    allInputs().forEach((el) => (el.value = ""));
    clearMessage();
    updateSolveState();
    results.hidden = true;
    const first = gridA.querySelector("input");
    if (first) first.focus();
  });

  buildGrid(n, false);
})();
