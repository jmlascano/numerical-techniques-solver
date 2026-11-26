/*
 * render.js — shared DOM rendering for every topic tab:
 *   matrices and vectors with brackets, step lists, sections, and the matrix input grid.
 * No math here; values arrive as Fractions (or plain strings for symbolic entries).
 */
(function (global) {
  "use strict";

  /* ---------- Elements ---------- */

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] === undefined || attrs[k] === null) continue;
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  const text = (v) => (v && typeof v.toDisplay === "function" ? v.toDisplay() : String(v));

  /* ---------- Matrices ---------- */

  /*
   * A matrix (array of rows) or a vector (flat array) between square brackets.
   * A flat array is a column vector unless opts.asRow is set.
   * opts: { label, highlightRows: [i], highlightCols: [j], asRow, augment }
   * augment: draw the bar of an augmented matrix [A | B] before this column index.
   */
  function matrix(M, opts) {
    opts = opts || {};
    const rows = Array.isArray(M[0]) ? M : opts.asRow ? [M] : M.map((x) => [x]);
    const hr = new Set(opts.highlightRows || []);
    const hc = new Set(opts.highlightCols || []);
    const grid = el("div", { class: "m-grid", role: "table", "aria-label": opts.label || "matrix" });
    rows.forEach((row, i) => {
      const r = el("div", { class: "m-row" + (hr.has(i) ? " is-changed" : ""), role: "row" });
      row.forEach((v, j) => r.appendChild(el("span", { class: "m-cell" + (hc.has(j) ? " is-changed" : "") + (opts.augment === j ? " is-aug" : ""), role: "cell", text: text(v) })));
      grid.appendChild(r);
    });
    return el("div", { class: "m-bracket" }, [grid]);
  }

  /* "name = [matrix]" */
  function labeled(name, M, opts) {
    return el("figure", { class: "labeled" }, [
      el("figcaption", { class: "m-name", text: name }),
      el("span", { class: "eq", "aria-hidden": "true", text: "=" }),
      matrix(M, Object.assign({ label: name }, opts)),
    ]);
  }

  /* An inline math row from strings and nodes, e.g. ["x", "=", matrix(...), "+", ...]. */
  function mathRow(parts, label) {
    return el(
      "div",
      { class: "labeled math-row", role: "group", "aria-label": label },
      parts.map((p) => (typeof p === "string" ? el("span", { class: p.length <= 2 ? "eq" : "m-name", text: p }) : p))
    );
  }

  /* A coefficient and the matrix it multiplies, kept on one line: "+ t [v]". */
  function term(coefText, node) {
    return el("span", { class: "term" }, [el("span", { class: "eq", text: coefText }), node]);
  }

  /* Several labeled vectors side by side, wrapping as needed. items: [{ name, vector, opts }] */
  function vectors(items) {
    return el("div", { class: "vector-list" }, items.map((it) => scroller(labeled(it.name, it.vector, it.opts))));
  }

  /* "(1, −2, 3)" */
  function tuple(v) {
    return "(" + v.map(text).join(", ") + ")";
  }

  /* The columns of a matrix (array of rows) as a list of vectors. */
  function columnsOf(M) {
    return M[0].map((_, j) => M.map((row) => row[j]));
  }

  /* ---------- Layout ---------- */

  function section(title, intro) {
    const s = el("section", { class: "block" }, [el("h3", { text: title })]);
    if (intro) s.appendChild(el("p", { class: "block-intro", text: intro }));
    return s;
  }

  function scroller(child) {
    return el("div", { class: "scroll-x" }, [child]);
  }

  function para(content, cls) {
    return el("p", { class: cls, text: content });
  }

  /*
   * Numbered list of row operations, each followed by the matrix after it.
   * steps: [{ text, note?, rows?, matrix (null for a no-op step) }]
   * groupLabel(step, index) -> a heading string to insert before this step, or null.
   * matrixOpts: extra options for every step matrix, e.g. { augment: n }.
   */
  function stepList(steps, groupLabel, matrixOpts) {
    const list = el("ol", { class: "steps" });
    steps.forEach((s, idx) => {
      const g = groupLabel ? groupLabel(s, idx) : null;
      if (g) list.appendChild(el("li", { class: "step-group", "aria-hidden": "true" }, [el("span", { text: g })]));
      const head = el("div", { class: "step-head" }, [el("span", { class: "op", text: s.text })]);
      if (s.note) head.appendChild(el("span", { class: "l-note", text: s.note }));
      const item = el("li", { class: "step" + (s.matrix ? "" : " is-skip") }, [head]);
      if (s.matrix) item.appendChild(scroller(matrix(s.matrix, Object.assign({ highlightRows: s.rows, label: "matrix after " + s.text }, matrixOpts))));
      list.appendChild(item);
    });
    return list;
  }

  /* A closed-by-default disclosure: <details><summary>…</summary>…</details>. */
  function disclosure(summaryText, children) {
    return el("details", { class: "disclosure" }, [el("summary", { text: summaryText })].concat(children));
  }

  /* A simple data table. head: [string], rows: [[string]], numeric: [bool per column]. */
  function table(head, rows, numeric, label) {
    const isNum = (j) => numeric && numeric[j];
    const t = el("table", { class: "data-table", "aria-label": label }, [
      el("thead", {}, [el("tr", {}, head.map((h, j) => el("th", { class: isNum(j) ? "num" : null, scope: "col", text: h })))]),
      el("tbody", {}, rows.map((r) => el("tr", {}, r.map((c, j) => el("td", { class: isNum(j) ? "num" : null, text: c }))))),
    ]);
    return scroller(t);
  }

  /* ---------- Matrix input grid ---------- */

  /*
   * Build (or rebuild) a grid of text inputs inside `container`.
   * keep: preserve values already typed where the cell still exists.
   * label(i, j) gives each input's accessible name.
   */
  function buildInputGrid(container, rows, cols, label, keep) {
    const old = keep ? readRaw(container) : [];
    container.innerHTML = "";
    container.style.setProperty("--cols", cols);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const input = el("input", {
          type: "text",
          inputmode: "text",
          autocomplete: "off",
          spellcheck: "false",
          class: "cell",
          "aria-label": label(i, j),
          "data-row": i,
          "data-col": j,
        });
        input.value = (old[i] && old[i][j]) || "";
        container.appendChild(input);
      }
    }
  }

  function readRaw(container) {
    const out = [];
    container.querySelectorAll("input").forEach((inp) => {
      const i = Number(inp.dataset.row);
      (out[i] = out[i] || [])[Number(inp.dataset.col)] = inp.value;
    });
    return out;
  }

  function fillInputGrid(container, values) {
    container.querySelectorAll("input").forEach((inp) => {
      const row = values[Number(inp.dataset.row)];
      inp.value = row ? row[Number(inp.dataset.col)] : "";
    });
  }

  function countEmpty(container) {
    return Array.from(container.querySelectorAll("input")).filter((inp) => inp.value.trim() === "").length;
  }

  function describeParseError(value, err) {
    if (value.trim() === "") return "empty.";
    return "“" + value.trim() + "” is " +
      (err.message === "the denominator cannot be 0" ? "invalid; the denominator cannot be 0." : "not a number. Use forms like 3, -0.25, or -3/4.");
  }

  /*
   * Parse every input as an exact Fraction.
   * place(i, j) names the cell in error messages, e.g. "A, row 2, column 3".
   * Returns { values: [[Fraction]], errors: [{ el, text }] }.
   */
  function readInputGrid(container, place) {
    const values = [];
    const errors = [];
    container.querySelectorAll("input").forEach((inp) => {
      const i = Number(inp.dataset.row);
      const j = Number(inp.dataset.col);
      values[i] = values[i] || [];
      try {
        values[i][j] = global.Fraction.parse(inp.value);
      } catch (e) {
        errors.push({ el: inp, text: place(i, j) + ": " + describeParseError(inp.value, e) });
      }
    });
    return { values, errors };
  }

  /* Show an inline error message and mark the bad cells. */
  function showErrors(messageEl, errors) {
    errors.forEach((x) => x.el.setAttribute("aria-invalid", "true"));
    messageEl.textContent =
      (errors.length === 1 ? "Fix this entry: " : "Fix these " + errors.length + " entries: ") + errors.map((x) => x.text).join(" ");
    messageEl.classList.add("is-visible");
    errors[0].el.focus();
  }

  function clearErrors(messageEl, scope) {
    messageEl.textContent = "";
    messageEl.classList.remove("is-visible");
    scope.querySelectorAll("input[aria-invalid]").forEach((inp) => inp.removeAttribute("aria-invalid"));
  }

  /* Fill a <select> with the integers from..to; keeps the current value when it is still in range. */
  function fillSelect(select, from, to, selected) {
    const keep = select.value;
    select.innerHTML = "";
    for (let v = from; v <= to; v++) select.appendChild(el("option", { value: v, text: String(v) }));
    const want = keep && Number(keep) >= from && Number(keep) <= to ? keep : String(selected);
    select.value = want;
  }

  /*
   * Keep a primary button disabled until every visible input in `scope` is filled.
   * Returns an update() function; the hint names how many entries are still empty.
   */
  function requireFilled(button, hintEl, scope, what) {
    return function update() {
      const inputs = Array.from(scope.querySelectorAll("input")).filter((inp) => !inp.closest("[hidden]"));
      const missing = inputs.filter((inp) => inp.value.trim() === "").length;
      button.disabled = missing > 0;
      hintEl.textContent = missing > 0 ? "Fill in every entry to " + what + " (" + missing + " empty)." : "";
    };
  }

  /* Parse one scalar <input> as a Fraction; returns { value } or { error: { el, text } }. */
  function readScalar(input, name) {
    try {
      return { value: global.Fraction.parse(input.value) };
    } catch (e) {
      return { error: { el: input, text: name + ": " + describeParseError(input.value, e) } };
    }
  }

  /* Reveal a results section, scroll to it, and move focus to its heading. */
  function reveal(resultsEl, headingEl) {
    resultsEl.hidden = false;
    const reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    headingEl.focus({ preventScroll: true });
  }

  global.Render = {
    el,
    matrix,
    labeled,
    mathRow,
    term,
    vectors,
    tuple,
    columnsOf,
    section,
    scroller,
    para,
    stepList,
    disclosure,
    table,
    fillSelect,
    requireFilled,
    readScalar,
    buildInputGrid,
    fillInputGrid,
    readInputGrid,
    countEmpty,
    showErrors,
    clearErrors,
    reveal,
  };
})(typeof window !== "undefined" ? window : globalThis);
