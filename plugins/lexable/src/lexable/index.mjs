import { loadConfig, PLUGIN_VERSION } from "./config.mjs";
import { login, logout, getSessionSnapshot } from "./auth/index.mjs";
import { can, getEntitlements, getStatus, getSubscription } from "./subscription/index.mjs";
import { getLiveProvider } from "./api/live-provider.mjs";
import { authorizedPost, fetchDiscovery } from "./api/client.mjs";
import { LexableNotEntitled } from "../format.mjs";

export async function createLexableClient(env = process.env) {
  const config = loadConfig(env);
  const client = {
    config,
    login: (options) => login(config, options),
    logout: () => logout(config),
    getCurrentUser: async () => (await getSessionSnapshot(config)).user,
    getSubscription: () => getSubscription(config),
    getEntitlements: () => getEntitlements(config),
    getStatus: () => getStatus(config),
    can: async (capability) => can(await getEntitlements(config), capability),
    assertCan: async (capability) => {
      if (await client.can(capability)) {
        return;
      }
      throw new LexableNotEntitled(capability, await client.getStatus());
    },
    track: async (event) => {
      const session = await getSessionSnapshot(config);
      if (!session.authenticated || session.mock || !session.tokens?.access_token) {
        return { ok: false, skipped: true };
      }
      try {
        const discovery = await fetchDiscovery(config);
        if (!discovery.document.events_endpoint) {
          return { ok: false, skipped: true };
        }
        return authorizedPost(discovery.document.events_endpoint, session.tokens.access_token, {
          event,
          plugin_version: PLUGIN_VERSION,
        });
      } catch {
        return { ok: false, skipped: true };
      }
    },
    remoteScan: async () => {
      const entitled = can(await getEntitlements(config), "lexable.remote_scan");
      if (!entitled) {
        return {
          status: "NOT_ENTITLED",
          message: "Lexable remote scan requires the lexable.remote_scan entitlement from the Lexable API.",
        };
      }
      if (config.devMode) {
        return {
          status: "REQUIRES_LEXABLE_BACKEND",
          message:
            "Development mode granted the entitlement, but mock mode does not call the Lexable scanner API.",
        };
      }
      const session = await getSessionSnapshot(config);
      if (!session.tokens?.access_token) {
        return { status: "NOT_ENTITLED", message: "Not authenticated." };
      }
      const live = getLiveProvider(config);
      try {
        const discovery = await live.discover();
        return await live.remoteScan(session.tokens.access_token, discovery);
      } catch (error) {
        return {
          status: "REQUIRES_LEXABLE_BACKEND",
          message: error.message,
        };
      }
    },
  };
  return client;
}
