import { loadConfig } from "./config.mjs";
import { login, logout, getSessionSnapshot } from "./auth/index.mjs";
import { can, getEntitlements, getStatus, getSubscription } from "./subscription/index.mjs";
import { getLiveProvider } from "./api/live-provider.mjs";
import { LexableBackendUnavailable } from "./api/client.mjs";

export async function createLexableClient(env = process.env) {
  const config = loadConfig(env);
  return {
    config,
    login: (options) => login(config, options),
    logout: () => logout(config),
    getCurrentUser: async () => (await getSessionSnapshot(config)).user,
    getSubscription: () => getSubscription(config),
    getEntitlements: () => getEntitlements(config),
    getStatus: () => getStatus(config),
    can: async (capability) => can(await getEntitlements(config), capability),
    remoteScan: async () => {
      const entitled = can(await getEntitlements(config), "lexable.remote_scan");
      if (!entitled) {
        return {
          status: "NOT_ENTITLED",
          message: "Remote Lexable scan requires the lexable.remote_scan entitlement from the Lexable API.",
        };
      }
      if (config.devMode) {
        return {
          status: "REQUIRES_LEXABLE_BACKEND",
          message:
            "Development mode granted the entitlement, but there is no Lexable scanner API connected. This plugin does not invent scan endpoints.",
        };
      }
      const live = getLiveProvider(config);
      try {
        const discovery = await live.discover();
        if (!discovery.document.scan_endpoint) {
          throw new LexableBackendUnavailable(
            "Discovery document has no scan_endpoint. Remote scan is not available."
          );
        }
      } catch (error) {
        return {
          status: "REQUIRES_LEXABLE_BACKEND",
          message: error.message,
        };
      }
      return {
        status: "REQUIRES_LEXABLE_BACKEND",
        message: "Scan endpoint is listed but not implemented by this plugin version.",
      };
    },
  };
}
