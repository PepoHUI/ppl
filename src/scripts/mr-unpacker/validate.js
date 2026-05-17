import { fetchProject, fetchVersion, mrFetch, runPool, versionsListPath } from "./modrinth.js";



function projectWebUrl(p) {
  if (!p || typeof p !== "object") return null;
  const o =  (p);
  const slug = typeof o.slug === "string" ? o.slug : null;
  if (!slug) return `https://modrinth.com/project/${encodeURIComponent(String(o.id || ""))}`;
  const t = typeof o.project_type === "string" && o.project_type !== "collection" ? o.project_type : "mod";
  return `https://modrinth.com/${encodeURIComponent(t)}/${encodeURIComponent(slug)}`;
}



function versionMatchesPack(v, mc, packLoaders) {
  const g =  (Array.isArray(v.game_versions) ? v.game_versions : []);
  const l =  (Array.isArray(v.loaders) ? v.loaders : []);
  const mcOk = g.includes(mc);
  const loadersOk = packLoaders.some((pl) => l.includes(pl));
  return { mcOk, loadersOk, gameVersions: g, loaders: l };
}



function checkRequiredDeps(v, projectIdsInPack) {
  const hints = [];
  const deps = Array.isArray(v.dependencies) ? v.dependencies : [];
  let allOk = true;
  for (const d of deps) {
    if (!d || typeof d !== "object") continue;
    const o =  (d);
    if (o.dependency_type !== "required") continue;
    const pid = typeof o.project_id === "string" ? o.project_id : o.project_id != null ? String(o.project_id) : null;
    if (!pid) continue;
    if (!projectIdsInPack.has(pid)) {
      allOk = false;
      hints.push(`Требуется проект ${pid}, не найден среди файлов пака`);
    }
  }
  if (!deps.length) return { ok: true, hints };
  return { ok: allOk, hints };
}



async function validateOneFile(file, ctx) {
  const { mcVersion, loaders, projectIdsInPack } = ctx;
  const base = {
    path: file.path,
    kind: file.projectId && file.versionId ? "modrinth" : "external",
    status: "ok",
    title: file.path,
    slug: null,
    projectId: file.projectId,
    versionId: file.versionId,
    messages: [],
    modrinthUrl: null,
    versionLabel: null,
    updateAvailable: false,
    updateLabel: null,
    updateUrl: null,
    gameVersionsOk: null,
    loadersOk: null,
    depsRequiredOk: null,
    depsHints: [],
  };

  if (!file.projectId || !file.versionId) {
    base.kind = "external";
    if (!file.downloads || file.downloads.length === 0) {
      base.status = "warn";
      base.messages.push("Внешний файл без Modrinth ID и без URL в downloads");
    } else {
      base.messages.push("Внешний файл (не через Modrinth API)");
    }
    return base;
  }

  try {
    const version = await fetchVersion(file.versionId);
    const project = await fetchProject(version.project_id || file.projectId);
    base.title = typeof project.title === "string" ? project.title : file.path;
    base.slug = typeof project.slug === "string" ? project.slug : null;
    base.modrinthUrl = projectWebUrl(project);

    const vid = typeof version.id === "string" ? version.id : String(version.id);
    base.versionLabel = typeof version.name === "string" ? version.name : version.version_number || vid;

    if (file.projectId && version.project_id && file.projectId !== version.project_id) {
      base.status = "warn";
      base.messages.push("projectID в индексе не совпадает с project_id версии API");
    }

    if (mcVersion) {
      const { mcOk, loadersOk, gameVersions, loaders: vLoaders } = versionMatchesPack(version, mcVersion, loaders);
      base.gameVersionsOk = mcOk;
      base.loadersOk = loadersOk;
      if (!mcOk) {
        base.status = "error";
        base.messages.push(`Версия Minecraft пака ${mcVersion} не входит в game_versions файла (${gameVersions.slice(0, 6).join(", ")}…)`);
      } else if (!loadersOk) {
        base.status = "warn";
        base.messages.push(
          `Загрузчики пака (${loaders.join(", ")}) не пересекаются с loaders версии (${vLoaders.join(", ")})`,
        );
      }
    } else {
      base.messages.push("В манифесте не указана dependencies.minecraft — пропуск проверки MC/loader");
    }

    const depChk = checkRequiredDeps(version, projectIdsInPack);
    base.depsRequiredOk = depChk.ok;
    base.depsHints = depChk.hints;
    if (!depChk.ok) {
      base.status = base.status === "error" ? "error" : "warn";
    }

    if (mcVersion && loaders.length) {
      try {
        const list = await mrFetch(versionsListPath(version.project_id, mcVersion, loaders));
        if (Array.isArray(list) && list.length) {
          const newest = list[0];
          const nid = typeof newest.id === "string" ? newest.id : String(newest.id);
          if (nid && nid !== vid) {
            base.updateAvailable = true;
            base.updateLabel = typeof newest.name === "string" ? newest.name : newest.version_number || nid;
            const pf = Array.isArray(newest.files) ? newest.files.find(( f) => f && f.primary) : null;
            const f0 = pf || (Array.isArray(newest.files) ? newest.files[0] : null);
            base.updateUrl = f0 && f0.url ? String(f0.url) : null;
          }
        }
      } catch {
        base.messages.push("Не удалось запросить список версий для проверки обновлений");
      }
    }
  } catch (e) {
    base.status = "error";
    base.messages.push(e instanceof Error ? e.message : String(e));
  }

  return base;
}



export async function validateAllFiles(files, env, onProgress) {
  const projectIdsInPack = new Set();
  for (const f of files) {
    if (f.projectId) projectIdsInPack.add(f.projectId);
  }
  const ctx = { mcVersion: env.minecraft, loaders: env.loaders, projectIdsInPack };
  let completed = 0;
  const total = files.length;
  const tasks = files.map((f) => async () => {
    const r = await validateOneFile(f, ctx);
    completed++;
    onProgress?.(completed, total);
    return r;
  });
  return runPool(4, tasks);
}
