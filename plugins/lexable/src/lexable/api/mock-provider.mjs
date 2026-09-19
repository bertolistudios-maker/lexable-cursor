import { DEV_PERSONAS, LOCAL_CAPABILITIES } from "../capabilities.mjs";
import { assertDevMode } from "../config.mjs";

export function createMockSnapshot(persona) {
  const key = persona && DEV_PERSONAS[persona] ? persona : "unauthorized";
  const source = DEV_PERSONAS[key];
  return {
    version: 1,
    mock: true,
    persona: key,
    source: "development-mock",
    authenticated: source.authenticated,
    user: source.account,
    subscription: source.authenticated
      ? {
          plan: source.plan,
          status: source.subscriptionStatus,
          source: "development-mock",
        }
      : null,
    entitlements: {
      source: "development-mock",
      capabilities: [...source.capabilities],
    },
    tokens: source.authenticated
      ? {
          access_token: `dev-mock-token-${key}`,
          token_type: "Bearer",
          mock: true,
        }
      : null,
  };
}

export function getMockProvider(config) {
  assertDevMode(config);
  return {
    kind: "mock",
    async snapshotFor(persona) {
      return createMockSnapshot(persona);
    },
    async remoteScan() {
      return {
        status: "REQUIRES_LEXABLE_BACKEND",
        message:
          "Development mode cannot perform a Lexable remote scan. The Lexable scanner API is not connected.",
      };
    },
  };
}

export function unauthenticatedSnapshot() {
  return {
    version: 1,
    mock: false,
    persona: "unauthorized",
    source: "local",
    authenticated: false,
    user: null,
    subscription: null,
    entitlements: {
      source: "local-default",
      capabilities: [...LOCAL_CAPABILITIES],
    },
    tokens: null,
  };
}
