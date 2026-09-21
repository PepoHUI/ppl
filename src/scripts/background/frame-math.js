export const MENUBG_DIR = "assets/pplmini/menubg";
export const DEFAULT_FPS = 24;

export function frameTimes(duration, fps = DEFAULT_FPS) {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error("fps must be a positive number");
  }
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const dt = 1 / fps;
  const upperBound = Math.ceil(duration / dt);
  const times = [];
  for (let i = 0; i < upperBound; i++) {
    const t = i * dt;
    if (t >= duration) break;
    times.push(t);
  }
  return times;
}

export function framePath(i) {
  return `${MENUBG_DIR}/${i}.png`;
}
