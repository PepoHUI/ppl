import gsap from "gsap";
import { hasUnlock } from "../core/state.js";
import { getGolemPhase, golemPhaseProgress } from "../core/golem.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let eyeTween = null;

let phaseTween = null;

function golemEl() {
  return document.getElementById("bc-golem");
}

function killGolemTweens() {
  eyeTween?.kill();
  eyeTween = null;
  phaseTween?.kill();
  phaseTween = null;
}

export function applyGolemPhase(phase, animate = true) {
  const golem = golemEl();
  if (!golem) return;

  if (!hasUnlock("golem")) {
    golem.classList.remove("bc-golem--work", "bc-golem--rest");
    killGolemTweens();
    gsap.set(golem, { clearProps: "opacity,transform,filter" });
    return;
  }

  const isWork = phase === "work";
  golem.classList.toggle("bc-golem--work", isWork);
  golem.classList.toggle("bc-golem--rest", !isWork);

  const eye = golem.querySelector(".bc-golem__eye");
  killGolemTweens();

  if (reduced || !animate) {
    gsap.set(golem, { opacity: isWork ? 1 : 0.62, y: isWork ? 0 : 3, scale: 1 });
    if (eye) gsap.set(eye, { scaleY: isWork ? 1 : 0.2, opacity: isWork ? 1 : 0.35 });
    return;
  }

  phaseTween = gsap.timeline();
  if (isWork) {
    phaseTween
      .fromTo(golem, { opacity: 0.55, y: 5, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2)" })
      .fromTo(
        eye,
        { scaleY: 0.15, opacity: 0.3 },
        { scaleY: 1, opacity: 1, duration: 0.35, ease: "power2.out" },
        0.12,
      );
    eyeTween = gsap.to(eye, {
      scale: hasUnlock("golemRage") ? 1.45 : 1.2,
      duration: 0.45,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  } else {
    phaseTween
      .to(golem, { opacity: 0.58, y: 4, scale: 0.96, duration: 0.65, ease: "power2.inOut" })
      .to(eye, { scaleY: 0.15, opacity: 0.25, duration: 0.4, ease: "power2.in" }, 0);
    gsap.fromTo(
      golem.querySelector(".bc-golem__zzz"),
      { opacity: 0, y: 0 },
      { opacity: 1, y: -6, duration: 0.5, ease: "power1.out" },
    );
  }
}

export function syncGolemPhaseMeter(now = performance.now()) {
  const meter = document.querySelector(".bc-golem__phase");
  if (!meter || !hasUnlock("golem")) return;
  meter.style.setProperty("--bc-golem-phase", String(golemPhaseProgress(now)));
  meter.dataset.phase = getGolemPhase();
}
