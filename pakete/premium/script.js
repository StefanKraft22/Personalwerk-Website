(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* -------------------------------------- HEADER + PROMO ON SCROLL ----- */
  function headerScroll() {
    const header = $("#header");
    const promo = $("#promobar");
    if (!header) return;
    let last = window.scrollY, ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-solid", y > 60);
      if (promo) promo.classList.toggle("is-hidden", y > 60);
      if (y > 300 && y > last + 6) header.classList.add("is-down");
      else if (y < last - 6 || y < 120) header.classList.remove("is-down");
      last = y;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();
  }

  /* -------------------------------------------- MOBILE MENU ------------ */
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
  }

  /* -------------------------------------------- REVEAL ON SCROLL ------- */
  function revealObserver() {
    const els = $$(".bcard, .premium-card, .rstat");
    els.forEach((el) => el.setAttribute("data-reveal", ""));
    const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (RM || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 80}ms`;
      io.observe(el);
    });
  }

  /* ---------------------------------------- SMOOTH ANCHOR SCROLL ------- */
  function anchorNav() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    headerScroll();
    mobileMenu();
    revealObserver();
    anchorNav();
  });
})();
