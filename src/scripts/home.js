import gsap from "gsap";
import { whenPageLoaded } from "./page-loader.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function randomVinylGrooveHsl() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(78 + Math.random() * 21);
  const l = Math.floor(58 + Math.random() * 16);
  return `hsl(${h} ${s}% ${l}%)`;
}

function applyRandomVinylLineColors(card) {
  card.style.setProperty("--vinyl-line-thick", randomVinylGrooveHsl());
  card.style.setProperty("--vinyl-line-thin", randomVinylGrooveHsl());
  card.style.setProperty("--vinyl-line-dash", randomVinylGrooveHsl());
}

function initToolCardVinyl() {
  if (reduced) return;

  document.querySelectorAll(".link-card").forEach((card) => {
    const vinyl = card.querySelector(".link-card__vinyl");
    if (!vinyl) return;

    const spin = (11 + Math.random() * 13).toFixed(2);
    vinyl.style.setProperty("--vinyl-spin-duration", `${spin}s`);

    card.addEventListener("mouseenter", () => {
      applyRandomVinylLineColors(card);
    });
  });
}

function entrance() {
  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
  });

  tl.from(".hero__eyebrow", {
    y: 14,
    opacity: 0,
    duration: 0.45,
  })
    .from(
      ".hero__title-line",
      {
        y: 28,
        opacity: 0,
        duration: 0.62,
        stagger: 0.075,
      },
      "-=0.22",
    )
    .from(
      ".hero__lead",
      {
        y: 18,
        opacity: 0,
        duration: 0.52,
      },
      "-=0.38",
    )
    .from(
      ".home-hub__switch",
      {
        y: 12,
        opacity: 0,
        duration: 0.42,
      },
      "-=0.28",
    )
    .from(
      ".home-hub__panel.is-active .tool-card",
      {
        y: 36,
        opacity: 0,
        duration: 0.58,
        stagger: { each: 0.09, from: "start" },
      },
      "-=0.32",
    )
    .from(
      ".tool-section--links .tool-section__heading, .tool-section--links .tool-section__lead",
      {
        y: 16,
        opacity: 0,
        duration: 0.44,
        stagger: 0.07,
      },
      "-=0.22",
    )
    .from(
      ".link-card",
      {
        y: 34,
        opacity: 0,
        duration: 0.54,
        stagger: { each: 0.085, from: "start" },
      },
      "-=0.3",
    )
    .from(
      ".footer-inner",
      {
        y: 10,
        opacity: 0,
        duration: 0.4,
      },
      "-=0.35",
    );

  return tl;
}

function magneticCards() {
  const cards = document.querySelectorAll(".tool-card, .link-card");

  cards.forEach((card) => {
    const shineEl = card.querySelector(".tool-card__sheen, .link-card__shine");

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.06;
      const dy = (e.clientY - cy) * 0.06;

      gsap.to(card, {
        x: dx,
        y: dy,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });

      if (shineEl) {
        const ox = ((e.clientX - rect.left) / rect.width - 0.5) * 28;
        gsap.to(shineEl, {
          x: ox,
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    };

    const onLeave = () => {
      gsap.to(card, {
        x: 0,
        y: 0,
        duration: 0.65,
        ease: "elastic.out(1, 0.65)",
        overwrite: "auto",
      });
      if (shineEl) {
        gsap.to(shineEl, { x: 0, duration: 0.5, ease: "power3.out" });
      }
    };

    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
  });
}

function positionHubIndicator(switchEl, indicator) {
  const activeTab = switchEl.querySelector(".home-hub__tab.is-active");
  if (!activeTab || !indicator) return;
  indicator.style.left = `${activeTab.offsetLeft}px`;
  indicator.style.width = `${activeTab.offsetWidth}px`;
}

function initHomeHub() {
  const switchEl = document.querySelector(".home-hub__switch");
  if (!switchEl) return;

  const tabs = switchEl.querySelectorAll(".home-hub__tab");
  const panels = document.querySelectorAll(".home-hub__panel");
  const indicator = switchEl.querySelector(".home-hub__indicator");

  const setHub = (name, animate = true) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.hub === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach((panel) => {
      const active = panel.dataset.hubPanel === name;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    try {
      sessionStorage.setItem("ppl:home-hub", name);
    } catch (_) {}

    positionHubIndicator(switchEl, indicator);

    if (!reduced && animate) {
      const visibleCards = document.querySelectorAll(
        `.home-hub__panel[data-hub-panel="${name}"] .tool-card`,
      );
      gsap.fromTo(
        visibleCards,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "power3.out" },
      );
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("is-active")) return;
      setHub(tab.dataset.hub ?? "tools");
    });
  });

  window.addEventListener("resize", () => positionHubIndicator(switchEl, indicator));

  let initial = "tools";
  try {
    const saved = sessionStorage.getItem("ppl:home-hub");
    if (saved === "games" || saved === "tools") initial = saved;
  } catch (_) {}
  setHub(initial, false);
}

function boot() {
  initToolCardVinyl();
  initHomeHub();

  if (reduced) {
    return;
  }

  whenPageLoaded.then(() => {
    entrance();
    magneticCards();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
