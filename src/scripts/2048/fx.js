import gsap from "gsap";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MOVE_MS = reduced ? 0 : 0.13;
const SPAWN_MS = reduced ? 0 : 0.22;

function q(sel, root = document) {
  return root.querySelector(sel);
}

export function init2048Fx() {
  if (reduced) return;

  const glow = q(".g2048-arena__glow");
  const glowAlt = q(".g2048-arena__glow--alt");

  if (glow) {
    gsap.to(glow, {
      opacity: 0.9,
      scale: 1.12,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  if (glowAlt) {
    gsap.to(glowAlt, {
      opacity: 0.55,
      scale: 0.92,
      duration: 4.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 0.6,
    });
  }
}

export function pageEntrance() {
  if (reduced) return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.from(".g2048-arena", { y: 24, opacity: 0, duration: 0.55 })
    .from(".g2048-board-wrap__corner", { scale: 0, opacity: 0, duration: 0.32, stagger: 0.05 }, "-=0.42")
    .from(".g2048-board", { scale: 0.94, opacity: 0, duration: 0.48 }, "-=0.32")
    .from(
      ".g2048-sidebar > *",
      { x: 18, opacity: 0, duration: 0.42, stagger: 0.07, clearProps: "transform" },
      "-=0.28",
    );

  return tl;
}

export function setTilePosition(el, row, col, posFn) {
  const { x, y } = posFn(row, col);
  gsap.set(el, { x, y });
}

export function animateTileTo(el, row, col, posFn) {
  const { x, y } = posFn(row, col);
  if (reduced) {
    gsap.set(el, { x, y });
    return gsap.delayedCall(0, () => {});
  }
  return gsap.to(el, { x, y, duration: MOVE_MS, ease: "power2.out" });
}

export function animateSpawn(el) {
  if (reduced) {
    gsap.set(el, { scale: 1, opacity: 1 });
    return gsap.delayedCall(0, () => {});
  }
  gsap.set(el, { scale: 0.35, opacity: 0.4 });
  return gsap.to(el, {
    scale: 1,
    opacity: 1,
    duration: SPAWN_MS,
    ease: "back.out(2.2)",
  });
}

export function animateMerge(el, value) {
  if (reduced) return gsap.delayedCall(0, () => {});

  const tl = gsap.timeline();
  tl.to(el, { scale: 1.14, duration: 0.1, ease: "power2.out" })
    .to(el, { scale: 1, duration: 0.18, ease: "elastic.out(1.2)" });

  if (value >= 128) {
    tl.add(
      () => {
        el.classList.add("g2048-tile--flash");
        setTimeout(() => el.classList.remove("g2048-tile--flash"), 320);
      },
      0,
    );
  }

  return tl;
}

export function shakeBoard(board) {
  if (reduced || !board) return;
  gsap.fromTo(
    board,
    { x: -5 },
    { x: 0, duration: 0.35, ease: "elastic.out(2.5)" },
  );
}

export function bumpScore(scoreEl, delta) {
  if (!scoreEl || reduced || delta <= 0) return;
  gsap.fromTo(
    scoreEl,
    { scale: 1, color: "var(--g2048-score-bump, #fde68a)" },
    { scale: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" },
  );
  gsap.fromTo(
    scoreEl,
    { textShadow: "0 0 18px rgba(251, 191, 36, 0.65)" },
    { textShadow: "0 0 0 transparent", duration: 0.5, delay: 0.1 },
  );
}

export function showOverlay(overlay, titleEl, subtitleEl, mode) {
  if (!overlay) return;

  if (mode === "win") {
    if (titleEl) titleEl.textContent = "2048!";
    if (subtitleEl) subtitleEl.textContent = "Вы собрали плитку 2048";
  } else if (mode === "over") {
    if (titleEl) titleEl.textContent = "Конец игры";
    if (subtitleEl) subtitleEl.textContent = "Ходов больше нет";
  }

  overlay.hidden = false;

  if (reduced) return;

  gsap.killTweensOf(overlay);
  gsap.fromTo(
    overlay,
    { opacity: 0 },
    { opacity: 1, duration: 0.28, ease: "power2.out" },
  );
  const card = overlay.querySelector(".g2048-overlay__card");
  if (card) {
    gsap.fromTo(
      card,
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.36, ease: "power3.out", clearProps: "transform" },
    );
  }
}

export function hideOverlay(overlay) {
  if (!overlay) return;
  if (reduced) {
    overlay.hidden = true;
    return;
  }
  gsap.to(overlay, {
    opacity: 0,
    duration: 0.2,
    onComplete: () => {
      overlay.hidden = true;
      gsap.set(overlay, { opacity: 1 });
    },
  });
}

export function celebrateWin(board) {
  if (reduced || !board) return;
  gsap.fromTo(
    board,
    { boxShadow: "0 0 0 rgba(251, 191, 36, 0)" },
    {
      boxShadow: "0 0 48px rgba(251, 191, 36, 0.45), inset 0 0 24px rgba(251, 191, 36, 0.08)",
      duration: 0.6,
      yoyo: true,
      repeat: 2,
      ease: "sine.inOut",
    },
  );
}

export function getAnimDuration() {
  return reduced ? 0 : MOVE_MS * 1000 + 40;
}
