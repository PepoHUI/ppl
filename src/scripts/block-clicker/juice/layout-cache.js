let cached = null;

export function anchorRects(anchor, layer) {
  if (cached && cached.anchor === anchor && cached.layer === layer) return cached;
  cached = {
    anchor,
    layer,
    ar: anchor.getBoundingClientRect(),
    lr: layer.getBoundingClientRect(),
  };
  requestAnimationFrame(() => {
    cached = null;
  });
  return cached;
}
