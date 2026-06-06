// Pure, DOM-free helpers for the Background tool. Node-importable for testing.

export const MENUBG_DIR = "assets/pplmini/menubg";
export const DEFAULT_FPS = 24;

/**
 * Sample times (seconds) for extracting frames at a fixed fps cap.
 * Steps by 1/fps from 0, stopping before `duration`.
 * @param {number} duration seconds
 * @param {number} [fps]
 * @returns {number[]}
 */
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

/**
 * Zip path for the i-th frame: assets/pplmini/menubg/<i>.png
 * @param {number} i zero-based frame index
 * @returns {string}
 */
export function framePath(i) {
  return `${MENUBG_DIR}/${i}.png`;
}
