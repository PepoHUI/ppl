const BASE = "/ppl";

const MPA_DEV_ROUTES = new Map([
  [`${BASE}/`, "index.html"],
  [`${BASE}/faq/`, "faq/index.html"],
  [`${BASE}/privacy-policy/`, "privacy-policy/index.html"],
  [`${BASE}/tools/item-ids/`, "tools/item-ids/index.html"],
  [`${BASE}/tools/block-palette-mixer/`, "tools/block-palette-mixer/index.html"],
  [`${BASE}/tools/img2display/`, "tools/img2display/index.html"],
  [`${BASE}/tools/gradients/`, "tools/gradients/index.html"],
  [`${BASE}/tools/calculator/`, "tools/calculator/index.html"],
  [`${BASE}/tools/obhod/`, "tools/obhod/index.html"],
  [`${BASE}/tools/jar-checker/`, "tools/jar-checker/index.html"],
  [`${BASE}/tools/dependency-checker/`, "tools/dependency-checker/index.html"],
  [`${BASE}/tools/mr-unpacker/`, "tools/mr-unpacker/index.html"],
  [`${BASE}/tools/tetris/`, "tools/tetris/index.html"],
  [`${BASE}/tools/block-clicker/`, "tools/block-clicker/index.html"],
  [`${BASE}/tools/game-2048/`, "tools/game-2048/index.html"],
]);

const GH_PAGES_REDIRECT = `    <script>
      (function () {
        var p = location.pathname;
        if (p === "/ppl") {
          location.replace("/ppl/" + location.search + location.hash);
          return;
        }
        if (p.indexOf("/tools/") === 0 && p.indexOf("/ppl/") !== 0) {
          location.replace("/ppl" + p + location.search + location.hash);
        }
      })();
    </script>`;

function injectGhPagesRedirect(html) {
  if (html.includes('location.replace("/ppl"')) return html;
  return html.replace("<meta charset=\"UTF-8\" />", `<meta charset="UTF-8" />\n${GH_PAGES_REDIRECT}`);
}

function splitUrl(raw) {
  const q = raw.indexOf("?");
  return {
    path: q === -1 ? raw : raw.slice(0, q),
    query: q === -1 ? "" : raw.slice(q),
  };
}

function isAssetRequest(path) {
  const last = path.split("/").pop() ?? "";
  return last.includes(".") && !last.endsWith(".html");
}

function attachMpaDevFallback(server) {
  server.middlewares.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const { path, query } = splitUrl(req.url ?? "");
    if (isAssetRequest(path)) return next();

    const withSlash = path.endsWith("/") ? path : `${path}/`;
    const htmlFile = MPA_DEV_ROUTES.get(withSlash) ?? MPA_DEV_ROUTES.get(path);
    if (!htmlFile) return next();

    req.url = `${BASE}/${htmlFile}${query}`;
    next();
  });
}

function attachTrailingSlashMiddleware(server) {
  server.middlewares.use((req, res, next) => {
    const { path, query } = splitUrl(req.url ?? "");

    if (path === BASE) {
      res.writeHead(301, { Location: `${BASE}/${query}` });
      res.end();
      return;
    }

    if (path === `${BASE}/tools/2048` || path === `${BASE}/tools/2048/`) {
      res.writeHead(301, { Location: `${BASE}/tools/game-2048/${query}` });
      res.end();
      return;
    }

    if (
      path.startsWith(`${BASE}/tools/`) &&
      path.length > `${BASE}/tools/`.length &&
      !path.endsWith("/") &&
      !path.includes(".")
    ) {
      res.writeHead(301, { Location: `${path}/${query}` });
      res.end();
      return;
    }

    if (
      (path === `${BASE}/faq` || path === `${BASE}/privacy-policy`) &&
      !path.endsWith("/")
    ) {
      res.writeHead(301, { Location: `${path}/${query}` });
      res.end();
      return;
    }

    next();
  });
}

function attachDevRoutes(server) {
  attachTrailingSlashMiddleware(server);
  attachMpaDevFallback(server);
}

export function pplRoutesPlugin() {
  return {
    name: "ppl-routes",
    transformIndexHtml(html) {
      return injectGhPagesRedirect(html);
    },
    configureServer(server) {
      attachDevRoutes(server);
    },
    configurePreviewServer(server) {
      attachDevRoutes(server);
    },
  };
}
