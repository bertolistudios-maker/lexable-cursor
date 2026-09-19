import { authorizedGet, fetchDiscovery, LexableBackendUnavailable } from "./client.mjs";

export function getLiveProvider(config) {
  return {
    kind: "live",
    async discover() {
      return fetchDiscovery(config);
    },
    async getCurrentUser(accessToken, discovery) {
      return authorizedGet(discovery.document.userinfo_endpoint, accessToken);
    },
    async getSubscription(accessToken, discovery) {
      return authorizedGet(discovery.document.subscription_endpoint, accessToken);
    },
    async getEntitlements(accessToken, discovery) {
      const body = await authorizedGet(discovery.document.entitlements_endpoint, accessToken);
      if (!Array.isArray(body?.capabilities)) {
        throw new LexableBackendUnavailable(
          "Lexable entitlements endpoint did not return a capabilities array. Access cannot be granted from local plan names."
        );
      }
      return body;
    },
    async remoteScan(accessToken, discovery) {
      if (!discovery.document.scan_endpoint) {
        throw new LexableBackendUnavailable(
          "Discovery document has no scan_endpoint. Remote scan is not available."
        );
      }
      return authorizedGet(discovery.document.scan_endpoint, accessToken);
    },
  };
}
