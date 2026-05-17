import gsap from "gsap";

const WINDOW_MS = 1000;

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stacks = new Map();

export function comboColor(combo) {
  const t = Math.min(1, Math.max(0, (combo - 1) / 14));
  const r = Math.round(239 + (253 - 239) * t);
  const g = Math.round(68 + (224 - 68) * t);
  const b = Math.round(68 + (71 - 68) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function stackKey(kind, value, crit, combo) {
  if (kind === "combo") return `combo-${combo}`;
  return `${kind}-${value}-${crit ? 1 : 0}`;
}

function formatText(b) {
  if (b.kind === "combo") {
    return b.count > 1 ? `×${b.combo} (×${b.count})` : `×${b.combo}`;
  }
  if (b.kind === "coin") {
    return b.count > 1 ? `+${b.value} (×${b.count})` : `+${b.value}`;
  }
  if (b.kind === "jackpot") {
    return b.count > 1 ? `+${b.value} (×${b.count})` : `+${b.value}`;
  }
  return b.count > 1 ? `-${b.value} (×${b.count})` : `-${b.value}`;
}

function placeEl(el, anchor, layer) {
  if (anchor && layer) {
    const ar = anchor.getBoundingClientRect();
    const lr = layer.getBoundingClientRect();
    el.style.left = `${ar.left - lr.left + ar.width * (0.38 + Math.random() * 0.18)}px`;
    el.style.top = `${ar.top - lr.top + ar.height * (0.12 + Math.random() * 0.18)}px`;
  } else {
    el.style.left = `${32 + Math.random() * 36}%`;
    el.style.top = `${18 + Math.random() * 28}%`;
  }
}

function flushStack(key, layer) {
  const b = stacks.get(key);
  if (!b) return;
  clearTimeout(b.timer);
  if (b.el) {
    const el = b.el;
    if (reduced) {
      el.remove();
    } else {
      gsap.to(el, {
        opacity: 0,
        y: -28,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => el.remove(),
      });
    }
  }
  stacks.delete(key);
}

export function stackFloat(layer, value, opts = {}) {
  if (!layer) return;
  const kind = opts.kind ?? "dmg";
  const crit = opts.crit ?? false;
  const combo = opts.combo ?? 0;
  const anchor = opts.anchor ?? null;
  const key = stackKey(kind, value, crit, combo);
  const now = performance.now();

  let b = stacks.get(key);
  if (b && now - b.lastAt > WINDOW_MS) {
    flushStack(key, layer);
    b = undefined;
  }

  if (!b) {
    b = {
      value,
      count: 0,
      kind,
      crit,
      combo,
      anchor,
      el: null,
      lastAt: now,
      timer:  (0),
    };
    stacks.set(key, b);
  }

  b.count += 1;
  b.lastAt = now;
  b.anchor = anchor;

  if (!b.el) {
    const el = document.createElement("span");
    el.className = `bc-float bc-float--stack bc-float--${kind}${crit ? " bc-float--crit" : ""}`;
    placeEl(el, anchor, layer);
    layer.appendChild(el);
    b.el = el;
    if (!reduced) {
      gsap.fromTo(el, { opacity: 0, scale: 0.85, y: 6 }, { opacity: 1, scale: 1, y: 0, duration: 0.12 });
    }
  } else {
    placeEl(b.el, anchor, layer);
    if (!reduced) {
      gsap.fromTo(b.el, { scale: 1.08 }, { scale: 1, duration: 0.1 });
    }
  }

  if (b.el) {
    b.el.textContent = formatText(b);
    if (kind === "combo") {
      b.el.style.color = comboColor(combo);
      b.el.style.textShadow = `0 0 10px ${comboColor(combo)}`;
    }
  }

  clearTimeout(b.timer);
  b.timer = setTimeout(() => flushStack(key, layer), WINDOW_MS);
}

export function flushAllFloatStacks(layer) {
  if (!layer) return;
  [...stacks.keys()].forEach((k) => flushStack(k, layer));
}

export function resetFloatStacks() {
  stacks.forEach((b) => clearTimeout(b.timer));
  stacks.clear();
}
