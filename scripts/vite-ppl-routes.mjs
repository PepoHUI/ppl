const BASE = "/ppl";

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

function attachTrailingSlashMiddleware(server) {
  server.middlewares.use((req, res, next) => {
    const raw = req.url ?? "";
    const q = raw.indexOf("?");
    const path = q === -1 ? raw : raw.slice(0, q);
    const query = q === -1 ? "" : raw.slice(q);

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

export function pplRoutesPlugin() {
  return {
    name: "ppl-routes",
    transformIndexHtml(html) {
      return injectGhPagesRedirect(html);
    },
    configureServer(server) {
      attachTrailingSlashMiddleware(server);
    },
    configurePreviewServer(server) {
      attachTrailingSlashMiddleware(server);
    },
  };
}
