import gsap from "gsap";
import "./logo-hover.js";
import "./grid-parallax.js";

const WELCOME_DONE_KEY = "ppl:welcome-done";

const FONT_READY_MAX_MS = 2800;

const LOADER_FAILSAFE_MS = 12000;

let loaderFailsafeId = 0;

let resolveReady;
export const whenPageLoaded = new Promise((r) => {
  resolveReady = r;
});

const reduced =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function markWelcomeDone() {
  try {
    sessionStorage.setItem(WELCOME_DONE_KEY, "1");
  } catch {

  }
}

function shouldSkipWelcome() {
  try {
    return sessionStorage.getItem(WELCOME_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function finish() {
  if (loaderFailsafeId) {
    clearTimeout(loaderFailsafeId);
    loaderFailsafeId = 0;
  }
  document.body.classList.remove("is-loading");
  document.documentElement.classList.remove("ppl-skip-welcome");
  resolveReady();
}

function runIntro(loader) {
  const tl = gsap.timeline({
    onComplete: () => {
      markWelcomeDone();
      loader.remove();
      finish();
    },
  });

  gsap.set(".page-loader__mark", { scale: 0.35, rotation: -28, opacity: 0 });
  gsap.set(".page-loader__brand", { y: 28, opacity: 0, filter: "blur(8px)" });
  gsap.set(".page-loader__line", { scaleX: 0, opacity: 1 });
  gsap.set(".page-loader__sub", { opacity: 0, letterSpacing: "0.35em" });
  gsap.set(".page-loader__frame span", { opacity: 0, scale: 0.85 });

  tl.to(".page-loader__mark", {
    scale: 1,
    rotation: 0,
    opacity: 1,
    duration: 0.62,
    ease: "back.out(1.55)",
  })
    .to(
      ".page-loader__brand",
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.48,
        ease: "power3.out",
      },
      "-=0.28",
    )
    .to(
      ".page-loader__line",
      {
        scaleX: 1,
        duration: 0.58,
        ease: "power2.inOut",
      },
      "-=0.22",
    )
    .to(
      ".page-loader__sub",
      {
        opacity: 1,
        letterSpacing: "0.16em",
        duration: 0.42,
        ease: "power2.out",
      },
      "-=0.32",
    )
    .to(
      ".page-loader__frame span",
      { opacity: 1, scale: 1, duration: 0.35, stagger: 0.06, ease: "power2.out" },
      "-=0.4",
    )
    .to({}, { duration: 0.14 })
    .to("#page-loader", {
      clipPath: "inset(0 0 100% 0)",
      duration: 0.92,
      ease: "power4.inOut",
    });
}

(async () => {
  const loader = document.getElementById("page-loader");

  if (!loader) {
    finish();
    return;
  }

  if (shouldSkipWelcome()) {
    loader.remove();
    finish();
    return;
  }

  if (reduced) {
    markWelcomeDone();
    loader.remove();
    finish();
    return;
  }

  loaderFailsafeId = window.setTimeout(() => {
    loaderFailsafeId = 0;
    const el = document.getElementById("page-loader");
    if (!el) return;
    markWelcomeDone();
    el.remove();
    finish();
  }, LOADER_FAILSAFE_MS);

  try {
    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => {
          setTimeout(resolve, FONT_READY_MAX_MS);
        }),
      ]);
    }
  } catch {

  }

  requestAnimationFrame(() => {
    try {
      runIntro(loader);
    } catch {
      markWelcomeDone();
      loader.remove();
      finish();
    }
  });
})();
