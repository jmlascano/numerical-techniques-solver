/*
 * app.js — topic tabs and hash routing (#ab1, #b2, #b3, #c, #d1, #d2, #d3, #d4, #e, #e2).
 * Each built topic is a <section id="panel-…"> in index.html with its own script (tab-*.js).
 * Planned topics are shown in the topic list but are not links.
 */
(function () {
  "use strict";

  const DEFAULT_TOPIC = "e2"; // the last topic in the course
  const SITE = "AMAT 105 Solver";

  const links = Array.from(document.querySelectorAll(".tab-list a[data-topic]"));
  const panels = Array.from(document.querySelectorAll(".panel"));
  const built = new Set(links.map((a) => a.dataset.topic));

  function topicFromHash() {
    const t = location.hash.replace(/^#/, "").toLowerCase();
    return built.has(t) ? t : DEFAULT_TOPIC;
  }

  function show(topic) {
    panels.forEach((p) => {
      p.hidden = p.id !== "panel-" + topic;
      if (!p.hidden) document.title = p.dataset.title + " — " + SITE;
    });
    links.forEach((a) => {
      if (a.dataset.topic === topic) {
        a.setAttribute("aria-current", "page");
        revealTab(a);
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  /* When the topic list is a sideways-scrolling row (narrow screens), center the active topic in it. */
  function revealTab(a) {
    const list = a.closest(".tab-list");
    if (list.scrollWidth <= list.clientWidth) return;
    const li = a.parentElement;
    list.scrollLeft = li.offsetLeft - list.offsetLeft - (list.clientWidth - li.offsetWidth) / 2;
  }

  window.addEventListener("hashchange", () => show(topicFromHash()));
  show(topicFromHash());
})();
