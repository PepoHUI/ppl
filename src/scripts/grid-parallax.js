

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const PARALLAX_FACTOR = 0.18;

let ticking = false;

function applyParallax() {
  ticking = false;
  if (motionQuery.matches) {
    document.documentElement.style.removeProperty("--ppl-grid-parallax-y");
    return;
  }
  const y = window.scrollY * PARALLAX_FACTOR;
  document.documentElement.style.setProperty("--ppl-grid-parallax-y", `${y}px`);
}

function onScroll() {
  if (motionQuery.matches) return;
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(applyParallax);
  }
}

function init() {
  applyParallax();
  window.addEventListener("scroll", onScroll, { passive: true });
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", applyParallax);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(applyParallax);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
