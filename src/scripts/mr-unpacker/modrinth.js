const API = "https://api.modrinth.com/v2";
export const USER_AGENT = "MrUnpacker/1.0 (+https://github.com/PepoHUI/ppl)";

const LS_PREFIX = "mrpacksol:v1:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const wrap = JSON.parse(raw);
    if (!wrap || typeof wrap.t !== "number" || Date.now() - wrap.t > CACHE_TTL_MS) {
      localStorage.removeItem(LS_PREFIX + key);
      return null;
    }
    return wrap.d;
  } catch {
    return null;
  }
}

function lsSet(key, data) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ t: Date.now(), d: data }));
  } catch {

  }
}

export async function mrFetch(path) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const cached = lsGet(`url:${url}`);
  if (cached !== null) return cached;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    const err = new Error(`Modrinth ${res.status} ${url}`);
     (err).status = res.status;
    throw err;
  }
  const data = await res.json();
  lsSet(`url:${url}`, data);
  return data;
}

export async function runPool(limit, tasks) {
  const results =  (new Array(tasks.length));
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= tasks.length) break;
      results[i] = await tasks[i]();
    }
  }

  const n = Math.min(Math.max(1, limit), tasks.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export async function fetchVersion(versionId) {
  return mrFetch(`/version/${encodeURIComponent(versionId)}`);
}

export async function fetchProject(projectId) {
  return mrFetch(`/project/${encodeURIComponent(projectId)}`);
}

export function versionsListPath(projectId, mcVersion, loaders) {
  const params = new URLSearchParams();
  params.set("loaders", JSON.stringify(loaders));
  params.set("game_versions", JSON.stringify([mcVersion]));
  return `/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
}
