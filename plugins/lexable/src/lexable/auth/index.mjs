import { createMockSnapshot, unauthenticatedSnapshot } from "../api/mock-provider.mjs";
import { getLiveProvider } from "../api/live-provider.mjs";
import { LexableBackendUnavailable } from "../api/client.mjs";
import { runDevBrowserLogin } from "./browser-login.mjs";
import { clearSession, readSession, writeSession } from "../session-store.mjs";

export async function login(config, options = {}) {
  if (config.devMode) {
    const snapshot = await runDevBrowserLogin(config, options);
    return writeSession(config, snapshot);
  }

  const live = getLiveProvider(config);
  try {
    await live.discover();
  } catch (error) {
    if (error instanceof LexableBackendUnavailable) {
      throw error;
    }
    throw new LexableBackendUnavailable(error.message);
  }

  throw new LexableBackendUnavailable(
    "Lexable plugin discovery was found, but the authorization-code + PKCE browser flow is not wired in this plugin version until the backend contract is confirmed. See docs/BACKEND-CONTRACT.md."
  );
}

export async function logout(config) {
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
