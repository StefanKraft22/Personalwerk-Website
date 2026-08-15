/* =========================================================================
   PERSONALWERK — Mood 7 · motion layer
   Vanilla JS. No dependencies. Honors prefers-reduced-motion.
   ========================================================================= */
(function () {
  "use strict";
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------- LOADER ------ */
  function runLoader() {
    const loader = $("#loader");
    const bar = $(".loader__bar i");
    const pct = $("#loaderPct");
    let p = 0;

    const finish = () => {
      document.body.classList.remove("is-loading");
      loader && loader.classList.add("is-done");
      document.body.classList.add("is-ready");
      playHero();
      setTimeout(() => loader && loader.remove(), 1100);
    };

    if (RM || !loader) { finish(); return; }

    const tick = () => {
      p += Math.max(1, (100 - p) * 0.12);
      if (p >= 100) p = 100;
      if (bar) bar.style.width = p + "%";
      if (pct) pct.textContent = String(Math.round(p)).padStart(2, "0");
      if (p < 100) requestAnimationFrame(tick);
      else setTimeout(finish, 350);
    };
    requestAnimationFrame(tick);
  }

  /* --------------------------------------------------- HERO INTRO ------ */
  function playHero() {
    const lines = $$(".hero__title .line > span");
    lines.forEach((l, i) => {
      setTimeout(() => (l.style.transform = "translateY(0)"), RM ? 0 : 120 + i * 90);
    });
    $$("#hero [data-reveal]").forEach((el, i) => {
      setTimeout(() => el.classList.add("is-in"), RM ? 0 : 260 + i * 90);
    });
    startCounters($("#hero"));
  }

  /* -------------------------------------- HEADER + PROMO ON SCROLL ----- */
  function headerScroll() {
    const header = $("#header");
    const promo = $("#promobar");
    const totop = $("#totop");
    let last = window.scrollY, ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-solid", y > 60);
      if (promo) promo.classList.toggle("is-hidden", y > 60);
      // hide-on-down / show-on-up
      if (y > 300 && y > last + 6) header.classList.add("is-down");
      else if (y < last - 6 || y < 120) header.classList.remove("is-down");
      totop && totop.classList.toggle("is-show", y > 700);
      last = y;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------ REVEAL OBSERVER ---- */
  function revealObserver() {
    const els = $$("[data-reveal]").filter((el) => !el.closest("#hero"));
    // stagger siblings sharing a parent
    els.forEach((el) => {
      const sibs = el.parentElement ? $$("[data-reveal]", el.parentElement) : [el];
      const idx = sibs.indexOf(el);
      if (idx > 0 && idx < 5) el.classList.add("d" + idx);
    });
    if (RM) { els.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------- WORD-BY-WORD LIGHT --- */
  function splitWords() {
    $$("[data-splitwords]").forEach((node) => {
      // keep explicit <br> line breaks, split each segment into words
      const segments = node.innerHTML.split(/<br\s*\/?>/i);
      node.innerHTML = segments
        .map((seg) => {
          const tmp = document.createElement("div");
          tmp.innerHTML = seg;
          const words = tmp.textContent.trim().split(/\s+/).filter(Boolean);
          return words.map((w) => `<span class="w">${w}</span>`).join(" ");
        })
        .join("<br>");
    });
    if (RM) { $$("[data-splitwords] .w").forEach((w) => w.classList.add("lit")); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const ws = $$(".w", e.target);
        // light words progressively as the block scrolls through
        e.target._light = () => {
          const r = e.target.getBoundingClientRect();
          const vh = window.innerHeight;
          const prog = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
          const n = Math.round(prog * ws.length);
          ws.forEach((w, i) => w.classList.toggle("lit", i < n));
        };
        e.target._light();
      });
    }, { threshold: 0 });
    $$("[data-splitwords]").forEach((n) => io.observe(n));

    window.addEventListener("scroll", () => {
      $$("[data-splitwords]").forEach((n) => n._light && n._light());
    }, { passive: true });
  }

  /* -------------------------- CTA TITLE (translate-up words) ---------- */
  function ctaTitle() {
    const t = $(".ctaband__title");
    if (!t) return;
    if (RM) { $$(".w", t).forEach((w) => w.classList.add("lit")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        $$(".w", t).forEach((w, i) => setTimeout(() => w.classList.add("lit"), i * 60));
        io.disconnect();
      });
    }, { threshold: 0.4 });
    io.observe(t);
  }

  /* ------------------------------------------------------ COUNTERS ---- */
  function startCounters(scope) {
    $$("[data-count]", scope || document).forEach((el) => {
      if (el._done) return; el._done = true;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      if (RM) { el.textContent = target + suffix; return; }
      const dur = 1600; let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = clamp((ts - start) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  function counterObserver() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { startCounters(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    $$("[data-count]").forEach((el) => { if (!el.closest("#hero")) io.observe(el); });
  }

  /* -------------------------------------------------- PARALLAX -------- */
  function parallax() {
    if (RM) return;
    const items = $$("[data-parallax]").map((el) => ({
      el, speed: parseFloat(el.dataset.parallax) || 0.2
    }));
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      items.forEach(({ el, speed }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const center = r.top + r.height / 2 - vh / 2;
        el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* --------------------------------------- PERF SCROLLYTELLING -------- */
  function perfScrolly() {
    const section = $(".perf");
    if (!section) return;
    const steps = $$(".perf__step");
    const coreNum = $("#perfCoreNum");
    const coreSuffix = $("#perfCoreSuffix");
    const hand = $("#perfHand");
    const isMobile = () => window.matchMedia("(max-width:1080px)").matches;
    let current = -1;

    const setDial = (i) => {
      const s = steps[i];
      if (!s) return;
      const num = parseFloat(s.dataset.num);
      const suffix = s.dataset.suffix || "";
      coreSuffix.textContent = suffix;
      coreNum.classList.remove("is-big");
      if (hand) hand.style.transform = `rotate(${(i / (steps.length - 1)) * 300 - 30}deg)`;
      const fmt = (v) => v.toLocaleString("de-DE");
      // animate the core number
      if (RM) { coreNum.textContent = fmt(num); if (s.dataset.big) coreNum.classList.add("is-big"); return; }
      const from = parseFloat(coreNum.textContent.replace(/\./g, "")) || 0;
      const dur = 700; let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = clamp((ts - start) / dur, 0, 1);
        const val = Math.round(lerp(from, num, 1 - Math.pow(1 - p, 3)));
        coreNum.textContent = fmt(val);
        if (p < 1) requestAnimationFrame(step);
        else if (s.dataset.big) coreNum.classList.add("is-big");
      };
      requestAnimationFrame(step);
    };

    // Auf Mobil bleibt die Uhr/der Drehzahlmesser statisch stehen, bis alle
    // Felder darunter durchgelaufen sind — erst dann springt sie auf den Endwert.
    let dialRevealed = false;
    const setActive = (i) => {
      if (i === current) return; current = i;
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
      if (!isMobile()) setDial(i);
    };

    let ticking = false;
    const onScroll = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = section.offsetHeight - vh;
      const rawProg = total > 0 ? (-r.top) / total : 0;
      const prog = clamp(rawProg, 0, 0.999);
      setActive(Math.floor(prog * steps.length));
      if (isMobile() && !dialRevealed && rawProg >= 1) {
        dialRevealed = true;
        setDial(steps.length - 1);
      }
      ticking = false;
    };
    // Kurze Scroll-Länge: pro Punkt reicht ~ein Mausrad-Schritt (statt mehrfach scrollen).
    // Reserve: 100vh für das Pinning + ~10vh Weg je Punkt.
    section.style.minHeight = (100 + steps.length * 10) + "vh";
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------- CARD TILT ------ */
  function cardTilt() {
    if (RM || window.matchMedia("(pointer: coarse)").matches) return;
    $$("[data-tilt]").forEach((card) => {
      const img = $(".card__img", card);
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-6px)`;
        if (img) img.style.transform = `scale(1.09) translate(${x * -14}px, ${y * -14}px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
        if (img) img.style.transform = "";
      });
    });
  }

  /* --------------------------------------------- CASES CAROUSEL ------ */
  function carousel() {
    const vp = $("[data-carousel-viewport]");
    const track = $("[data-carousel-track]");
    if (!vp || !track) return;
    let x = 0, max = 0;
    const measure = () => { max = Math.max(0, track.scrollWidth - vp.clientWidth + 24); };
    const apply = () => { track.style.transform = `translate3d(${-x}px,0,0)`; };
    const go = (dx) => { x = clamp(x + dx, 0, max); apply(); };
    measure(); window.addEventListener("resize", () => { measure(); x = clamp(x, 0, max); apply(); });

    $$("[data-carousel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = $(".case", track);
        const step = card ? card.offsetWidth + 22 : 400;
        go(btn.dataset.carousel === "next" ? step : -step);
      });
    });

    // drag
    let down = false, startX = 0, startPos = 0, moved = 0;
    const press = (e) => { down = true; moved = 0; startX = e.clientX; startPos = x; vp.classList.add("is-drag"); };
    const move = (e) => {
      if (!down) return;
      const d = e.clientX - startX; moved = Math.abs(d);
      x = clamp(startPos - d, 0, max); apply();
    };
    const up = () => { down = false; vp.classList.remove("is-drag"); };
    vp.addEventListener("pointerdown", press);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    vp.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); go(e.deltaX); }
    }, { passive: false });
  }

  /* ------------------------------------------- CASE STORYBOARDS ------- */
  function caseStories() {
    const cases = $$("[data-case-story]");
    if (!cases.length) return;
    cases.forEach((card) => {
      card.addEventListener("click", (e) => {
        if (!window.matchMedia("(hover: hover)").matches) e.stopPropagation();
        const willOpen = !card.classList.contains("is-open");
        cases.forEach((c) => c.classList.remove("is-open"));
        if (willOpen) card.classList.add("is-open");
      });
    });
    document.addEventListener("click", () => cases.forEach((c) => c.classList.remove("is-open")));
  }

  /* -------------------------------------------------- MAGNETIC ------- */
  function magnetic() {
    if (RM || window.matchMedia("(pointer: coarse)").matches) return;
    $$("[data-magnetic]").forEach((el) => {
      const strength = 0.35;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------- MOBILE MENU -------- */
  function mobileMenu() {
    const burger = $("#burger");
    const menu = $("#menu");
    if (!burger || !menu) return;
    const toggle = (open) => {
      const isOpen = open ?? !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", isOpen);
      burger.classList.toggle("is-open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
      menu.setAttribute("aria-hidden", String(!isOpen));
      document.body.classList.toggle("menu-open", isOpen);
    };
    burger.addEventListener("click", () => toggle());
    $$(".menu__link", menu).forEach((a) => a.addEventListener("click", () => toggle(false)));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
  }

  /* ---------------------------------------------- CUSTOM CURSOR ------ */
  function cursor() {
    const dot = $("[data-cursor]");
    if (!dot || window.matchMedia("(pointer: coarse)").matches) return;
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    window.addEventListener("pointermove", (e) => {
      cx = e.clientX; cy = e.clientY;
      dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    }, { passive: true });
    $$("[data-magnetic], a, button, summary, input, .card, [data-tilt]").forEach((el) => {
      el.addEventListener("mouseenter", () => dot.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => dot.classList.remove("is-hover"));
    });
    document.body.style.cursor = "none";
  }

  /* ---------------------------------------------- SMOOTH ANCHORS ----- */
  function anchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const t = $(id);
        if (!t) return;
        e.preventDefault();
        const y = t.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: RM ? "auto" : "smooth" });
      });
    });
    const totop = $("#totop");
    totop && totop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }));
  }

  /* ------------------------------------------------------- INIT ------ */
  document.addEventListener("DOMContentLoaded", () => {
    splitWords();
    headerScroll();
    revealObserver();
    counterObserver();
    parallax();
    perfScrolly();
    cardTilt();
    carousel();
    caseStories();
    magnetic();
    mobileMenu();
    anchors();
    ctaTitle();
    cursor();
  });
  window.addEventListener("load", runLoader);
})();

/* =========================================================================
   MULTIPOSTING — LOOP-ANIMATION (Panel 01)
   Sequenziert die Szenen über .is-* Klassen.
   Läuft nur, wenn die Szene im Viewport ist. Achtet auf reduced-motion.
   ========================================================================= */
(function () {
  "use strict";
  const scene = document.querySelector("[data-mp-scene]");
  if (!scene) return;

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PHASES = ["is-type", "is-ad", "is-post", "is-apply", "is-hire", "is-outro", "is-flash"];

  /* Reduced motion → statischer Endzustand (Abschluss), keine Timeline */
  if (RM) {
    scene.classList.add("is-ad", "is-post", "is-apply", "is-hire", "is-outro");
    return;
  }

  let timers = [];
  let running = false;

  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const clearAll = () => {
    clearTimers();
    PHASES.forEach((c) => scene.classList.remove(c));
  };

  /* Inhalts-Phasen (alles außer dem Abschluss-Outro) */
  const CONTENT = ["is-type", "is-ad", "is-post", "is-apply", "is-hire", "is-flash"];

  /* Eine komplette Loop-Runde */
  const runCycle = () => {
    /* Nur die Inhalts-Phasen zurücksetzen. Ein noch sichtbares Outro
       bleibt stehen und deckt den Neustart ab – so blitzt weder der
       Handschlag noch eine weiße Fläche auf, bevor es von vorn losgeht. */
    clearTimers();
    CONTENT.forEach((c) => scene.classList.remove(c));
    void scene.offsetWidth; // Reflow → CSS-Animationen starten sauber neu

    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    scene.classList.add("is-type");                   // Szene 1: Tippen (läuft ggf. unter dem Outro an)
    at(600,  () => scene.classList.remove("is-outro")); // Outro sanft ausblenden → gibt die frische Szene frei
    at(2900, () => scene.classList.add("is-ad"));     // Szene 2: Anzeige (Pling)
    at(3900, () => scene.classList.add("is-post"));   // Szene 3: Logos bilden den Kreis
    at(6400, () => scene.classList.add("is-apply"));  // Szene 4: erst Briefe einfliegen, dann stapeln sich die CVs
    at(9800, () => scene.classList.add("is-hire"));   // Szene 5: Handschlag + grüner Haken
    at(12600, () => scene.classList.add("is-outro")); // Szene 6: „Multiposting von personalwerk.“ — Abschluss
    at(15800, runCycle);                              // Loop: Outro bleibt stehen und deckt den Neustart ab
  };

  const start = () => { if (!running) { running = true; clearAll(); runCycle(); } };
  const stop = () => { running = false; clearAll(); };

  /* Nur animieren, wenn sichtbar */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
    { threshold: 0.25 }
  );
  io.observe(scene);

  /* Bei Tab-Wechsel pausieren/fortsetzen */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (scene.getBoundingClientRect().top < window.innerHeight && scene.getBoundingClientRect().bottom > 0) start();
  });
})();

/* =========================================================================
   EMPLOYER-BRANDING-VIDEO (Panel 02)
   Spielt (stumm) im Loop; nach dem Ende kurz „Employer Branding von
   personalwerk.“ einblenden, dann wieder von vorn. Nur wenn sichtbar.
   ========================================================================= */
(function () {
  "use strict";
  const scene = document.querySelector("[data-eb-scene]");
  const video = scene && scene.querySelector("[data-eb-video]");
  if (!scene || !video) return;

  const playBtn = scene.querySelector("[data-eb-play]");
  const soundBtn = scene.querySelector("[data-eb-sound]");
  const OUTRO_MS = 2800;
  let outroTimer = 0;

  /* Ton-Symbol/Label an den aktuellen Zustand angleichen */
  const syncSound = () => {
    scene.classList.toggle("is-muted", video.muted);
    if (soundBtn) soundBtn.setAttribute("aria-label", video.muted ? "Ton einschalten" : "Ton ausschalten");
  };

  /* Kein Autostart: Video erst per Klick starten – dabei den Ton einblenden */
  const play = () => {
    clearTimeout(outroTimer);
    scene.classList.remove("is-outro");
    scene.classList.add("is-playing");
    video.muted = false;               // Nutzerklick erlaubt Wiedergabe mit Ton
    syncSound();
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };

  if (playBtn) playBtn.addEventListener("click", play);
  if (soundBtn) soundBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    syncSound();
  });

  /* Nach dem Video kurz die Abschluss-Einblendung, dann zurück zum Startbild + Play-Button */
  video.addEventListener("ended", () => {
    scene.classList.remove("is-playing");
    scene.classList.add("is-outro");
    clearTimeout(outroTimer);
    outroTimer = setTimeout(() => {
      scene.classList.remove("is-outro");
      try { video.currentTime = 0; } catch (e) {}
    }, OUTRO_MS);
  });

  /* Beim Wegscrollen / Tab-Wechsel pausieren (nie automatisch starten) */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (!e.isIntersecting) video.pause(); }),
    { threshold: 0.35 }
  );
  io.observe(scene);
  document.addEventListener("visibilitychange", () => { if (document.hidden) video.pause(); });
})();

/* =========================================================================
   PERSONALBERATUNG — LOOP-ANIMATION (Panel 03)
   Verdeckter Markt → Zugang → Diskretion → drei Zusagen → beide zufrieden.
   Läuft nur im Viewport, achtet auf reduced-motion, sauberer Loop.
   ========================================================================= */
(function () {
  "use strict";
  const scene = document.querySelector("[data-pb-scene]");
  if (!scene) return;

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PHASES = ["is-pool", "is-search", "is-info", "is-promise", "is-match", "is-outro"];

  /* Reduced motion → statischer Abschluss, keine Timeline */
  if (RM) { scene.classList.add("is-outro"); return; }

  let timers = [];
  let running = false;

  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const clearAll = () => { clearTimers(); PHASES.forEach((c) => scene.classList.remove(c)); };

  /* Inhalts-Phasen (alles außer dem Abschluss-Outro) */
  const CONTENT = ["is-pool", "is-search", "is-info", "is-promise", "is-match"];

  const runCycle = () => {
    /* Nur Inhalts-Phasen zurücksetzen; ein noch sichtbares Outro bleibt stehen
       und deckt den Neustart ab – kein Aufblitzen vor dem nächsten Durchlauf. */
    clearTimers();
    CONTENT.forEach((c) => scene.classList.remove(c));
    void scene.offsetWidth;

    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    scene.classList.add("is-pool");                     // Talentpool erscheint
    at(600,   () => scene.classList.remove("is-outro")); // Outro sanft ausblenden
    at(2600,  () => scene.classList.add("is-search"));  // Sweep, Treffer leuchten auf
    at(5200,  () => scene.classList.add("is-info"));    // Diskretion + Marktkenntnis
    at(8000,  () => scene.classList.add("is-promise")); // die drei Zusagen
    at(11600, () => scene.classList.add("is-match"));   // beide zufrieden + Haken
    at(14000, () => scene.classList.add("is-outro"));   // „Personalberatung von personalwerk.“
    at(16800, runCycle);                                // Loop
  };

  const start = () => { if (!running) { running = true; clearAll(); runCycle(); } };
  const stop = () => { running = false; clearAll(); };

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
    { threshold: 0.25 }
  );
  io.observe(scene);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (scene.getBoundingClientRect().top < window.innerHeight && scene.getBoundingClientRect().bottom > 0) start();
  });
})();

/* =========================================================================
   STÖRER — schließen / wieder anzeigen (Session-übergreifend gemerkt)
   ========================================================================= */
(function () {
  "use strict";
  const root = document.querySelector("[data-stoerer]");
  if (!root) return;

  const KEY = "pw-stoerer-closed";
  let store = null;
  try { store = window.sessionStorage; } catch (_) { store = null; }

  const setClosed = (closed) => {
    root.classList.toggle("is-closed", closed);
    try { store && store.setItem(KEY, closed ? "1" : "0"); } catch (_) {}
  };

  /* Standard: aufgeklappt (Karte sichtbar). Nur einklappen, wenn der Nutzer es in dieser Session selbst getan hat. */
  if (store && store.getItem(KEY) === "1") root.classList.add("is-closed");

  const close = root.querySelector("[data-stoerer-close]");
  const open = root.querySelector("[data-stoerer-open]");
  const cta = root.querySelector("[data-stoerer-cta]");

  close && close.addEventListener("click", () => setClosed(true));
  open && open.addEventListener("click", () => setClosed(false));
  /* Nach Klick auf den CTA einklappen — der Nutzer ist beim Kontaktformular. */
  cta && cta.addEventListener("click", () => setClosed(true));
})();
