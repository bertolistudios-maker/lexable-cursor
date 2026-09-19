import { createServer } from "node:http";
import { fetchDiscovery, LexableBackendUnavailable, authorizedGet } from "../api/client.mjs";
import { openSystemBrowser } from "./browser-login.mjs";
import { authorizationUrl, generatePkce } from "./pkce.mjs";

export function createLoopbackCallbackServer({ port = 0, expectedState } = {}) {
  let resolveCallback;
  const completed = new Promise((resolve, reject) => {
    resolveCallback = { resolve, reject };
  });

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (error) {
      res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      res.end("<!DOCTYPE html><html lang=\"en\"><body><p>Authorization was denied. You can return to Cursor.</p></body></html>");
      resolveCallback.reject(new Error(`Lexable authorization failed: ${error}`));
      return;
    }
    if (!code || state !== expectedState) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Invalid callback");
      resolveCallback.reject(new Error("Invalid OAuth callback."));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(
      "<!DOCTYPE html><html lang=\"en\"><body><h1>Lexable connected</h1><p>You can return to Cursor. No password was stored in the plugin.</p></body></html>"
    );
    resolveCallback.resolve({ code, state });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        port: address.port,
        redirectUri: `http://127.0.0.1:${address.port}/callback`,
        completed,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });
}

export async function exchangeAuthorizationCode(tokenEndpoint, { clientId, code, redirectUri, verifier }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  let response;
  try {
    response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "user-agent": "lexable-cursor-plugin/1.1.0",
      },
      body,
    });
  } catch (error) {
    throw new LexableBackendUnavailable(`Could not reach Lexable token endpoint: ${error.message}`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new LexableBackendUnavailable(
      payload.error_description || `Lexable token exchange failed (${response.status}).`
    );
  }
  return payload;
}

export async function runLiveBrowserLogin(config, { openBrowser = openSystemBrowser, port = 0 } = {}) {
  const discovery = await fetchDiscovery(config);
  const pkce = generatePkce();
  const loopback = await createLoopbackCallbackServer({ port, expectedState: pkce.state });
  const authorize = authorizationUrl(discovery.document.authorization_endpoint, {
    clientId: config.clientId,
    redirectUri: loopback.redirectUri,
    state: pkce.state,
    challenge: pkce.challenge,
  });

  try {
    if (typeof openBrowser === "function") {
      await openBrowser(authorize);
    }
    const callback = await loopback.completed;
    const token = await exchangeAuthorizationCode(discovery.document.token_endpoint, {
      clientId: config.clientId,
      code: callback.code,
      redirectUri: loopback.redirectUri,
      verifier: pkce.verifier,
    });
    const user = await authorizedGet(discovery.document.userinfo_endpoint, token.access_token);
    const subscription = await authorizedGet(discovery.document.subscription_endpoint, token.access_token);
    const entitlements = await authorizedGet(discovery.document.entitlements_endpoint, token.access_token);
    if (!Array.isArray(entitlements?.capabilities)) {
      throw new LexableBackendUnavailable("Entitlements endpoint did not return a capabilities array.");
    }
    return {
      version: 1,
      mock: false,
      source: "lexable-api",
      authenticated: true,
      user: { id: user.id, email: user.email },
      subscription: {
        plan: subscription.plan ?? null,
        status: subscription.status ?? "unknown",
        source: "lexable-api",
      },
      entitlements: {
        source: "lexable-api",
        capabilities: entitlements.capabilities,
      },
      tokens: {
        access_token: token.access_token,
        token_type: token.token_type || "Bearer",
        mock: false,
      },
    };
  } finally {
    await loopback.close();
  }
}
