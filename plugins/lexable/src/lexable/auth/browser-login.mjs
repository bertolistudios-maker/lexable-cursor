import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createMockSnapshot } from "../api/mock-provider.mjs";
import { assertDevMode } from "../config.mjs";

const ALLOWED_PERSONAS = new Set(["unauthorized", "free", "pro", "agency", "expired"]);

function htmlPage(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 40rem; margin: 3rem auto; padding: 0 1.5rem; }
    h1 { font-size: 1.5rem; }
    p { line-height: 1.5; }
    .banner { background: #fef3c7; border: 1px solid #b45309; color: #0f172a; padding: 0.75rem 1rem; border-radius: 0.5rem; }
    ul { list-style: none; padding: 0; display: grid; gap: 0.75rem; }
    a.button { display: block; width: 100%; box-sizing: border-box; text-align: center; text-decoration: none; background: #0284c7; color: #fff; padding: 0.75rem 1rem; border-radius: 0.5rem; font-weight: 600; }
    a.button:focus-visible { outline: 3px solid #0f172a; outline-offset: 3px; }
    .secondary { background: #334155; }
  </style>
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

export function openSystemBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", reject);
    child.unref();
    resolve();
  });
}

export function createDevLoginServer(config, { port = 0 } = {}) {
  assertDevMode(config);

  let resolveSnapshot;
  const completed = new Promise((resolve) => {
    resolveSnapshot = resolve;
  });

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");

    if (url.pathname === "/login") {
      const body = `
        <h1>Lexable development login</h1>
        <p class="banner"><strong>Development mock only.</strong> This is not a real Lexable account, password, or subscription. Production authentication is not implemented until the Lexable backend publishes plugin discovery.</p>
        <p>Authorize this Cursor plugin as a development persona. No password is requested.</p>
        <ul>
          <li><a class="button" href="/callback?persona=free">Authorize as Free</a></li>
          <li><a class="button" href="/callback?persona=pro">Authorize as Pro</a></li>
          <li><a class="button" href="/callback?persona=agency">Authorize as Agency</a></li>
          <li><a class="button secondary" href="/callback?persona=expired">Authorize as expired subscription</a></li>
          <li><a class="button secondary" href="/callback?persona=unauthorized">Continue unauthenticated</a></li>
        </ul>`;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(htmlPage("Lexable development login", body));
      return;
    }

    if (url.pathname === "/callback") {
      const selected = url.searchParams.get("persona") || "unauthorized";
      const persona = ALLOWED_PERSONAS.has(selected) ? selected : "unauthorized";
      const snapshot = createMockSnapshot(persona);
      const body = `
        <h1>Authorization complete</h1>
        <p class="banner">Development mock session stored. Return to Cursor. This does not create a real Lexable subscription.</p>
        <p>Persona: <strong>${persona}</strong></p>`;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(htmlPage("Lexable authorization complete", body));
      resolveSnapshot(snapshot);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  const listening = new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        port: address.port,
        loginUrl: `http://127.0.0.1:${address.port}/login`,
        callbackUrl: `http://127.0.0.1:${address.port}/callback`,
        completed,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });

  return listening;
}

export async function runDevBrowserLogin(config, { persona, openBrowser = openSystemBrowser, port = 0 } = {}) {
  assertDevMode(config);

  if (persona) {
    const selected = ALLOWED_PERSONAS.has(persona) ? persona : null;
    if (!selected) {
      const error = new Error(`Unknown development persona "${persona}". Use unauthorized, free, pro, agency, or expired.`);
      error.code = "UNKNOWN_PERSONA";
      throw error;
    }
    return createMockSnapshot(selected);
  }

  const session = await createDevLoginServer(config, { port });
  try {
    if (typeof openBrowser === "function") {
      await openBrowser(session.loginUrl);
    }
    const snapshot = await session.completed;
    return snapshot;
  } finally {
    await session.close();
  }
}
