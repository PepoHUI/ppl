import gsap from "gsap";
import { formatNum } from "../core/economy.js";
import { escalation } from "../core/progression.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { formatNum };

export function pageEntrance(root) {
  if (reduced || !root) return;
  gsap.from(root.querySelectorAll(".bc-hud__stat, .bc-world, .bc-workshop"), {
    y: 24,
    opacity: 0,
    duration: 0.6,
    stagger: 0.06,
    ease: "power3.out",
  });
}

export function initIdleMotion() {
  if (reduced) return;

  gsap.to(".bc-bg__orb--a", {
    x: 30,
    y: -20,
    duration: 5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
  gsap.to(".bc-bg__orb--b", {
    x: -25,
    y: 25,
    duration: 6.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  gsap.to(".bc-hud__pulse", {
    scale: 1.4,
    opacity: 0.5,
    duration: 1.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  gsap.to(".bc-arena__scan", {
    yPercent: 120,
    duration: 3.5,
    repeat: -1,
    ease: "none",
  });

  gsap.utils.toArray(".bc-hud__stat .bc-hud__value").forEach((el, i) => {
    gsap.to(el, {
      scale: 1.03,
      duration: 1.8 + i * 0.12,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      transformOrigin: "left center",
    });
  });
}

export function onClickSquash(blockBtn, hpFill, dmg, crit) {
  if (reduced) return;
  gsap.fromTo(
    blockBtn,
    { scaleX: 1, scaleY: 1 },
    {
      scaleX: crit ? 1.08 : 1.04,
      scaleY: crit ? 0.82 : 0.88,
      duration: 0.05,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
    },
  );
  if (hpFill) {
    gsap.fromTo(hpFill, { filter: "brightness(1.6)" }, { filter: "brightness(1)", duration: 0.2 });
  }
}

export function onBreakPop(blockBtn) {
  if (reduced || !blockBtn) return;
  gsap.killTweensOf(blockBtn);
  gsap.killTweensOf(blockBtn.querySelectorAll(".bc-block-hit__tex-wrap, .bc-hp"));
  gsap.to(blockBtn, {
    scale: 1.18,
    rotation: 7,
    opacity: 0,
    duration: 0.14,
    ease: "power2.in",
  });
}

export function animateBlockSpawn(blockBtn, opts = {}) {
  if (!blockBtn) return;

  const tex = blockBtn.querySelector(".bc-block-hit__tex-wrap");
  const hp = blockBtn.querySelector(".bc-hp");
  const playZone = blockBtn.closest(".bc-play-zone");

  gsap.killTweensOf(blockBtn);
  if (tex) gsap.killTweensOf(tex);
  if (hp) gsap.killTweensOf(hp);
  if (playZone) gsap.killTweensOf(playZone);

  if (reduced) {
    gsap.set(blockBtn, { clearProps: "transform,opacity" });
    if (tex) gsap.set(tex, { clearProps: "transform,opacity" });
    if (hp) gsap.set(hp, { clearProps: "transform,opacity" });
    return;
  }

  const hpTier = opts.hpTier ?? 1;
  const punchy = opts.golden || hpTier >= 25;
  const startScale = punchy ? 0.62 : 0.72;

  gsap.set(blockBtn, { scale: startScale, opacity: 0, rotation: 0 });
  if (tex) gsap.set(tex, { scale: 0.35, opacity: 0, rotation: punchy ? -18 : -10 });
  if (hp) gsap.set(hp, { opacity: 0, y: 10 });

  const tl = gsap.timeline();
  tl.to(
    blockBtn,
    {
      scale: 1,
      opacity: 1,
      duration: punchy ? 0.44 : 0.34,
      ease: punchy ? "back.out(2.2)" : "back.out(1.85)",
    },
    0,
  );

  if (tex) {
    tl.to(
      tex,
      {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: punchy ? 0.4 : 0.32,
        ease: "back.out(2.4)",
      },
      0.05,
    );
  }

  if (hp) {
    tl.to(hp, { opacity: 1, y: 0, duration: 0.26, ease: "power2.out" }, 0.12);
  }

  if (playZone) {
    tl.fromTo(
      playZone,
      { scale: 0.97 },
      { scale: 1, duration: 0.36, ease: "power2.out" },
      0,
    );
  }

  if (opts.golden || opts.lucky || hpTier > 1) {
    tl.fromTo(
      blockBtn,
      { filter: "brightness(1.35)" },
      { filter: "brightness(1)", duration: 0.45, ease: "power2.out" },
      0.08,
    );
  }
}

export function spawnFloat(layer, text, kind = "dmg", anchor = null) {
  if (!layer) return;
  const el = document.createElement("span");
  el.className = `bc-float bc-float--${kind}`;
  el.textContent = text;
  const esc = escalation();

  if (anchor) {
    const ar = anchor.getBoundingClientRect();
    const lr = layer.getBoundingClientRect();
    const x = ar.left - lr.left + ar.width * (0.35 + Math.random() * 0.3);
    const y = ar.top - lr.top + ar.height * (0.15 + Math.random() * 0.25);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  } else {
    el.style.left = `${30 + Math.random() * 40}%`;
    el.style.top = `${20 + Math.random() * 30}%`;
  }

  layer.appendChild(el);

  if (reduced) {
    setTimeout(() => el.remove(), 400);
    return;
  }

  const scale = kind === "jackpot" ? 1.6 + esc : kind === "crit" ? 1.3 + esc * 0.2 : 1;
  gsap.fromTo(
    el,
    { opacity: 0, y: 16, scale: 0.5, rotation: (Math.random() - 0.5) * 20 },
    {
      opacity: 1,
      y: -60 - Math.random() * 40,
      scale,
      rotation: 0,
      duration: 0.7 + Math.random() * 0.25,
      ease: "power2.out",
      onComplete: () => el.remove(),
    },
  );
}

export function animateCoins(el, from, to) {
  if (!el) return;
  if (reduced) {
    el.textContent = formatNum(to);
    return;
  }
  const obj = { v: from };
  gsap.to(obj, {
    v: to,
    duration: 0.5,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = formatNum(Math.round(obj.v));
    },
  });
  gsap.fromTo(el, { scale: 1.15 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
}

export function pulseCombo(hudEl, combo) {
  if (!hudEl) return;
  hudEl.textContent = `×${combo}`;
  if (reduced) return;
  gsap.fromTo(hudEl, { scale: 1.35, color: "#fde68a" }, { scale: 1, duration: 0.4, ease: "back.out(2)" });
}

export function celebrateNode(card) {
  if (reduced) return;
  gsap.timeline()
    .to(card, { scale: 1.08, borderColor: "rgba(251,191,36,0.9)", duration: 0.15 })
    .to(card, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)" });
}

export function showBanner(banner, title, sub) {
  if (!banner) return;
  banner.hidden = false;
  banner.innerHTML = `<strong>${title}</strong><span>${sub}</span>`;
  if (reduced) {
    setTimeout(() => {
      banner.hidden = true;
    }, 2800);
    return;
  }
  gsap.fromTo(banner, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" });
  gsap.to(banner, {
    opacity: 0,
    y: -12,
    delay: 2.6,
    duration: 0.4,
    onComplete: () => {
      banner.hidden = true;
    },
  });
}

export function updateCracks(cracks, hpRatio) {
  if (!cracks) return;
  const n = hpRatio > 0.66 ? 0 : hpRatio > 0.33 ? 1 : 2;
  cracks.dataset.stage = String(n);
}

export function applyChaosTier(app, tier) {
  if (!app) return;
  app.dataset.tier = String(tier);
  app.style.setProperty("--bc-chaos", String(tier * 0.2));
}
