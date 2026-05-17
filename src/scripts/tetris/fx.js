import gsap from "gsap";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let playingTl = null;
let scoreTween = null;

function q(sel, root = document) {
  return root.querySelector(sel);
}

export function initTetrisFx() {
  if (reduced) return;

  const glow = q(".tetris-arena__glow");
  const scan = q(".tetris-board-wrap__scan");

  if (glow) {
    gsap.to(glow, {
      opacity: 0.85,
      scale: 1.08,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  if (scan) {
    gsap.set(scan, { yPercent: -110 });
    gsap.to(scan, {
      yPercent: 110,
      duration: 4.5,
      repeat: -1,
      ease: "none",
    });
  }
}

export function pageEntrance() {
  if (reduced) return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.from(".tetris-arena", { y: 20, opacity: 0, duration: 0.55 })
    .from(
      ".tetris-board-wrap__corner",
      { scale: 0, opacity: 0, duration: 0.35, stagger: 0.06 },
      "-=0.45",
    )
    .from("#tetris-canvas", { opacity: 0, duration: 0.45 }, "-=0.35")
    .from(
      ".tetris-sidebar > *",
      { x: 20, opacity: 0, duration: 0.45, stagger: 0.07 },
      "-=0.3",
    );

  return tl;
}

export function startPlayingFx() {
  if (reduced) return;
  playingTl?.kill();
  const arena = q(".tetris-arena");
  if (!arena) return;
  playingTl = gsap.timeline({ repeat: -1, yoyo: true });
  playingTl.to(arena, {
    "--arena-pulse": 1,
    duration: 1.6,
    ease: "sine.inOut",
  });
}

export function stopPlayingFx() {
  playingTl?.kill();
  playingTl = null;
}

export function animateScore(el, from, to) {
  if (!el) return;
  if (reduced) {
    el.textContent = String(to);
    return;
  }
  const obj = { v: from };
  scoreTween?.kill();
  scoreTween = gsap.to(obj, {
    v: to,
    duration: 0.55 + Math.min(0.35, (to - from) / 1200),
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = String(Math.round(obj.v));
    },
  });
}

export function showComboMessage(el, meta) {
  if (!el || meta.gained <= 0) return;

  const labels = [];
  if (meta.cleared === 4) labels.push("Tetris");
  else if (meta.cleared === 3) labels.push("Triple");
  else if (meta.cleared === 2) labels.push("Double");

  if (meta.isAllClear) labels.push("Perfect clear");
  if (meta.combo > 1) labels.push(`Комбо ×${meta.combo}`);

  labels.push(`+${meta.gained}`);

  el.hidden = false;
  el.textContent = labels.join(" · ");

  if (reduced) return;

  gsap.killTweensOf(el);
  gsap.fromTo(
    el,
    { opacity: 0, y: 8, scale: 0.92 },
    { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "back.out(1.7)" },
  );
  gsap.to(el, {
    opacity: 0,
    y: -6,
    duration: 0.35,
    delay: 1.15,
    ease: "power2.in",
    onComplete: () => {
      el.hidden = true;
    },
  });
}

export function onLineClear(count) {
  if (reduced) return;

  const boardWrap = q("#tetris-board-wrap");
  const arena = q(".tetris-arena");
  const flash = q(".tetris-arena__flash");

  if (boardWrap) {
    gsap
      .timeline()
      .to(boardWrap, { scale: 1.015, duration: 0.07, ease: "power2.out" })
      .to(boardWrap, { scale: 1, duration: 0.35, ease: "elastic.out(1, 0.55)" });
  }

  if (flash) {
    gsap
      .timeline()
      .set(flash, { opacity: 0.55 })
      .to(flash, { opacity: 0, duration: 0.45 + count * 0.08, ease: "power2.out" });
  }

  if (arena && count >= 4) {
    gsap.fromTo(
      arena,
      { rotation: -0.6 },
      { rotation: 0.6, duration: 0.06, repeat: 5, yoyo: true, ease: "power1.inOut" },
    );
    gsap.set(arena, { rotation: 0, delay: 0.4 });
  }
}

export function onLevelUp() {
  if (reduced) return;
  const levelEl = document.getElementById("tetris-level");
  const boardWrap = q("#tetris-board-wrap");
  if (levelEl) {
    gsap.fromTo(
      levelEl,
      { scale: 1.45, color: "#fde68a", textShadow: "0 0 24px rgba(251, 191, 36, 0.8)" },
      {
        scale: 1,
        color: "",
        textShadow: "",
        duration: 0.65,
        ease: "elastic.out(1, 0.5)",
        clearProps: "color,textShadow",
      },
    );
  }
  if (boardWrap) {
    gsap.fromTo(
      boardWrap,
      { borderColor: "rgba(251, 191, 36, 0.65)" },
      { borderColor: "", duration: 0.8, ease: "power2.out" },
    );
  }
}

export function onPieceLand() {
  if (reduced) return;
  const boardWrap = q("#tetris-board-wrap");
  if (!boardWrap) return;
  gsap.fromTo(
    boardWrap,
    { y: 0 },
    { y: 3, duration: 0.05, ease: "power2.in", yoyo: true, repeat: 1 },
  );
}

export function onPieceSpawn() {
  if (reduced) return;

  const boardWrap = q("#tetris-board-wrap");
  const canvas = q("#tetris-canvas");
  const nextPanel = q(".tetris-next");

  if (boardWrap) {
    gsap.killTweensOf(boardWrap);
    gsap.fromTo(
      boardWrap,
      { scale: 0.992 },
      { scale: 1, duration: 0.32, ease: "power2.out" },
    );
  }

  if (canvas) {
    gsap.killTweensOf(canvas);
    gsap.fromTo(
      canvas,
      { filter: "brightness(1.2)" },
      { filter: "brightness(1)", duration: 0.38, ease: "power2.out" },
    );
  }

  if (nextPanel) {
    gsap.killTweensOf(nextPanel);
    gsap.fromTo(
      nextPanel,
      { scale: 0.94, opacity: 0.72 },
      { scale: 1, opacity: 1, duration: 0.34, ease: "back.out(1.8)" },
    );
  }
}

export function showOverlay(overlay, actionBtn) {
  if (!overlay) return;
  overlay.hidden = false;

  if (reduced) return;

  gsap.killTweensOf([overlay, actionBtn]);
  gsap.set(overlay, { opacity: 0, scale: 0.92, backdropFilter: "blur(0px)" });
  gsap.to(overlay, {
    opacity: 1,
    scale: 1,
    backdropFilter: "blur(12px)",
    duration: 0.4,
    ease: "power3.out",
  });
  if (actionBtn) {
    gsap.fromTo(
      actionBtn,
      { y: 16, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, delay: 0.1, ease: "back.out(1.6)" },
    );
  }
}

export function hideOverlay(overlay) {
  if (!overlay) return;

  if (reduced) {
    overlay.hidden = true;
    return;
  }

  gsap.killTweensOf(overlay);
  gsap.to(overlay, {
    opacity: 0,
    scale: 1.03,
    duration: 0.28,
    ease: "power2.in",
    onComplete: () => {
      overlay.hidden = true;
      gsap.set(overlay, { clearProps: "opacity,scale,backdropFilter" });
    },
  });
}
