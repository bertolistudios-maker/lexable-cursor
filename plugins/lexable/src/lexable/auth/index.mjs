import { createMockSnapshot, unauthenticatedSnapshot } from "../api/mock-provider.mjs";
import { runDevBrowserLogin } from "./browser-login.mjs";
import { runLiveBrowserLogin } from "./live-login.mjs";
import { clearSession, readSession, writeSession } from "../session-store.mjs";
import { authorizedPost, fetchDiscovery } from "../api/client.mjs";

export async function login(config, options = {}) {
  if (config.devMode) {
    const snapshot = await runDevBrowserLogin(config, options);
    return writeSession(config, snapshot);
  }

  const snapshot = await runLiveBrowserLogin(config, options);
  return writeSession(config, snapshot);
}

export async function logout(config) {
  const session = await readSession(config);
  if (session.authenticated && session.mock !== true && session.tokens?.access_token && config.apiBaseUrl) {
    try {
      const discovery = await fetchDiscovery(config);
      if (discovery.document.logout_endpoint) {
        await authorizedPost(discovery.document.logout_endpoint, session.tokens.access_token, {});
      }
    } catch {
      // Local logout still proceeds if revoke cannot reach the API.
    }
  }
  await clearSession(config);
  return unauthenticatedSnapshot();
}

export async function getCurrentUser(config) {
  const session = await readSession(config);
  if (!session.authenticated) {
    return null;
  }
  if (session.mock && !config.devMode) {
    return null;
  }
  return session.user;
}

export async function getSessionSnapshot(config) {
  const session = await readSession(config);
  if (!session.authenticated) {
    return unauthenticatedSnapshot();
  }
  if (session.mock === true) {
    if (!config.devMode) {
      return unauthenticatedSnapshot();
    }
    return session;
  }

  if (!config.apiBaseUrl) {
    return unauthenticatedSnapshot();
  }

  return session;
}

export { createMockSnapshot };
