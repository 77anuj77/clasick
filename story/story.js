/* ==========================================================================
   Clasick — scroll story engine
   - one passive scroll listener, one rAF update per frame
   - CSS variables + classes only (no layout animation)
   - every scroll state is derived from position, so it reverses cleanly
   ========================================================================== */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reduceQuery.matches;
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* ------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */
  var THEME_KEY = "clasick-theme";

  function readTheme() {
    try { return window.localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function storeTheme(value) {
    try { window.localStorage.setItem(THEME_KEY, value); } catch (e) { /* private mode */ }
  }
  function setTheme(theme, persist) {
    var dark = theme === "dark";
    doc.classList.toggle("dark", dark);
    doc.dataset.theme = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(dark));
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#10131a" : "#eceef4");
    if (persist) storeTheme(theme);
  }

  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  var storedTheme = readTheme();
  setTheme(storedTheme || (systemDark.matches ? "dark" : "light"), false);

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(doc.classList.contains("dark") ? "light" : "dark", true);
    });
  });

  if (systemDark.addEventListener) {
    systemDark.addEventListener("change", function (event) {
      if (!readTheme()) setTheme(event.matches ? "dark" : "light", false);
    });
  }

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */
  var menu = document.getElementById("mobile-menu");
  var menuBtn = document.querySelector("[data-menu-toggle]");

  if (menu && menuBtn) {
    var setMenu = function (open) {
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
      if (open) {
        var first = menu.querySelector("a, button");
        if (first) first.focus({ preventScroll: true });
      }
    };

    menuBtn.addEventListener("click", function () {
      setMenu(menu.hidden);
    });
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    var desktopQuery = window.matchMedia("(min-width: 1041px)");
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", function (event) {
        if (event.matches) setMenu(false);
      });
    }
  }

  /* ------------------------------------------------------------------------
     Scroll reveals (one-shot entrance, deterministic)
     ------------------------------------------------------------------------ */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    Array.prototype.slice.call(group.querySelectorAll("[data-reveal]")).forEach(function (el, index) {
      if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", String(index));
    });
  });

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Jobs connector line: reveal once the board is in view */
  document.querySelectorAll("[data-jobs]").forEach(function (section) {
    if (!("IntersectionObserver" in window)) { section.classList.add("is-in"); return; }
    var jobObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        section.classList.add("is-in");
        jobObserver.disconnect();
      });
    }, { threshold: 0.18 });
    jobObserver.observe(section.querySelector(".jobs-board") || section);
  });

  /* ------------------------------------------------------------------------
     Counters (score rings and numeric values)
     ------------------------------------------------------------------------ */
  function setCounter(el, value) {
    var textEl = el.hasAttribute("data-count-text") ? el : el.querySelector("[data-count-text]");
    if (textEl) textEl.textContent = String(Math.round(value));
    if (el.classList.contains("ring")) el.style.setProperty("--value", value.toFixed(2));
  }

  function animateCounter(el) {
    var target = parseFloat(el.dataset.count) || 0;
    if (reduced) { setCounter(el, target); return; }

    var start = 0;
    var duration = 1100;
    var startedAt = null;

    var tick = function (now) {
      if (startedAt === null) startedAt = now;
      var t = clamp((now - startedAt) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      setCounter(el, target * eased);
      if (t < 1) window.requestAnimationFrame(tick);
    };
    setCounter(el, start);
    window.requestAnimationFrame(tick);
  }

  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  if ("IntersectionObserver" in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        animateCounter(entry.target);
      });
    }, { threshold: 0.45 });
    counters.forEach(function (el) { countObserver.observe(el); });
  } else {
    counters.forEach(function (el) { setCounter(el, parseFloat(el.dataset.count) || 0); });
  }

  /* ------------------------------------------------------------------------
     Scroll state
     ------------------------------------------------------------------------ */
  var hero = document.querySelector("[data-hero]");
  var progressEls = Array.prototype.slice.call(document.querySelectorAll("[data-progress]"));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll("[data-rail-link]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
  var stage = document.querySelector("[data-stage]");
  var steps = Array.prototype.slice.call(document.querySelectorAll("[data-step]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var improve = document.querySelector("[data-improve]");
  var blobs = Array.prototype.slice.call(document.querySelectorAll("[data-blob]"));

  var navMap = {
    challenge: "why",
    meet: "score",
    understand: "features",
    improve: "features",
    opportunities: "features",
    faq: "faq"
  };

  var viewportH = window.innerHeight;
  var docHeight = 1;
  var ticking = false;
  var lastStage = 0;
  var lastChapter = "";
  var lastStep = -1;
  var lastJobsInView = null;

  function measure() {
    viewportH = window.innerHeight;
    docHeight = Math.max(1, doc.scrollHeight - viewportH);
  }

  function setActiveRail(chapter) {
    railLinks.forEach(function (link) {
      var target = (link.getAttribute("href") || "").replace("#", "");
      link.classList.toggle("is-active", target === chapter);
    });
  }

  function setActiveNav(chapter) {
    var active = navMap[chapter] || null;
    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.dataset.nav === active);
    });
  }

  function updateStage() {
    if (!stage) return;
    var rect = stage.getBoundingClientRect();
    var start = viewportH * 0.9;
    var end = -rect.height + viewportH * 0.2;
    var p = clamp((start - rect.top) / Math.max(360, start - end), 0, 1);
    var next = p < 0.3 ? 1 : p < 0.6 ? 2 : 3;
    if (next === lastStage) return;
    lastStage = next;
    stage.classList.toggle("stage-1", next === 1);
    stage.classList.toggle("stage-2", next === 2);
    stage.classList.toggle("stage-3", next === 3);
    stage.dataset.active = String(next);
  }

  function updateScrolly() {
    if (!steps.length) return;
    var center = viewportH * 0.5;
    var best = 0;
    var bestDistance = Infinity;

    steps.forEach(function (step, index) {
      var rect = step.getBoundingClientRect();
      var distance = Math.abs((rect.top + rect.bottom) / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });

    if (best === lastStep) return;
    lastStep = best;

    steps.forEach(function (step, index) {
      step.classList.toggle("is-active", index === best);
    });
    panels.forEach(function (panel, index) {
      var active = index === best;
      panel.classList.toggle("is-active", active);
      var dots = panel.querySelectorAll(".pf-dots i");
      Array.prototype.forEach.call(dots, function (dot, dotIndex) {
        dot.classList.toggle("on", dotIndex === best);
      });
    });
  }

  function updateCompare() {
    if (!improve) return;
    var rect = improve.getBoundingClientRect();
    var live = rect.top < viewportH * 0.7 && rect.bottom > viewportH * 0.16;
    improve.classList.toggle("is-live", live);
  }

  function update() {
    ticking = false;

    var y = window.scrollY || window.pageYOffset || 0;
    var progress = clamp(y / docHeight, 0, 1);
    progressEls.forEach(function (el) {
      el.style.setProperty("--progress", progress.toFixed(4));
    });

    if (hero) {
      var heroHeight = hero.offsetHeight || viewportH;
      var heroP = clamp(y / heroHeight, 0, 1);
      hero.style.setProperty("--hero-p", heroP.toFixed(4));
    }

    if (!reduced && blobs.length) {
      var drift = Math.sin(y / 900) * 54;
      blobs.forEach(function (blob, index) {
        var depth = index === 0 ? 1 : index === 1 ? -1.15 : 0.55;
        blob.style.transform = "translate3d(0," + (drift * depth).toFixed(1) + "px,0)";
      });
    }

    updateStage();
    updateScrolly();
    updateCompare();

    /* current chapter */
    var chapter = chapters.length ? chapters[0].dataset.chapter : "";
    chapters.forEach(function (section) {
      if (section.getBoundingClientRect().top <= viewportH * 0.42) {
        chapter = section.dataset.chapter;
      }
    });

    if (chapter !== lastChapter) {
      lastChapter = chapter;
      setActiveRail(chapter);
      setActiveNav(chapter);
    }
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", function () { measure(); requestUpdate(); }, { passive: true });

  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener("change", function (event) {
      reduced = event.matches;
      if (reduced) {
        blobs.forEach(function (blob) { blob.style.transform = ""; });
      }
      lastStage = 0;
      lastStep = -1;
      requestUpdate();
    });
  }

  /* ------------------------------------------------------------------------
     Mascot
     ------------------------------------------------------------------------ */
  var mascot = document.querySelector("[data-mascot]");
  if (mascot) {
    var reactions = mascot.querySelector(".mascot-layer.reactions");
    var frame = 0;
    var reactionTimer = null;
    var boopTimer = null;
    var frames = ["0% 0%", "50% 0%", "100% 0%", "0% 50%", "100% 50%", "0% 100%", "50% 100%", "100% 100%"];

    mascot.addEventListener("click", function () {
      mascot.classList.remove("is-boop");
      void mascot.offsetWidth;
      mascot.classList.add("is-boop");
      window.clearTimeout(boopTimer);
      boopTimer = window.setTimeout(function () { mascot.classList.remove("is-boop"); }, 700);

      if (reactions) {
        reactions.style.backgroundPosition = frames[frame % frames.length];
        frame += 1;
        reactions.style.opacity = "1";
        window.clearTimeout(reactionTimer);
        reactionTimer = window.setTimeout(function () { reactions.style.opacity = "0"; }, 950);
      }
    });
  }

  /* ------------------------------------------------------------------------
     FAQ: one open at a time
     ------------------------------------------------------------------------ */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll(".faq-list .faq-item"));
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  measure();
  update();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); requestUpdate(); });
  }
  window.addEventListener("load", function () { measure(); requestUpdate(); }, { once: true });
})();
