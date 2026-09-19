import { can as hasCapability, CAPABILITY_CATALOG } from "../capabilities.mjs";
import { getSessionSnapshot } from "../auth/index.mjs";
import { getLiveProvider } from "../api/live-provider.mjs";
import { LOCAL_CAPABILITIES } from "../capabilities.mjs";
import { lexableWebUrl } from "../config.mjs";

export { hasCapability as can };

export async function getSubscription(config) {
  const session = await getSessionSnapshot(config);
  if (!session.authenticated) {
    return { plan: null, status: "none", source: session.source || "local" };
  }
  return session.subscription || { plan: null, status: "unknown", source: session.source };
}

export async function getEntitlements(config) {
  const session = await getSessionSnapshot(config);

  if (session.mock === true && config.devMode) {
    return session.entitlements;
  }

  if (session.authenticated && session.tokens?.access_token && config.apiBaseUrl) {
    const live = getLiveProvider(config);
    const discovery = await live.discover();
    const remote = await live.getEntitlements(session.tokens.access_token, discovery);
    return {
      source: "lexable-api",
      capabilities: remote.capabilities,
    };
  }

  return {
    source: session.entitlements?.source || "local-default",
    capabilities: session.entitlements?.capabilities || [...LOCAL_CAPABILITIES],
  };
}

export async function getStatus(config) {
  const session = await getSessionSnapshot(config);
  const entitlements = await getEntitlements(config);
  const subscription = await getSubscription(config);

  return {
    plugin: "Lexable Accessibility",
    publisher: "Bertoli Studios",
    environment: config.env,
    developmentMode: config.devMode,
    mock: session.mock === true,
    authenticated: session.authenticated === true,
    account: session.user,
    plan: subscription.plan,
    subscriptionStatus: subscription.status,
    entitlements,
    catalog: CAPABILITY_CATALOG,
    apiBaseUrlConfigured: Boolean(config.apiBaseUrl),
    registerUrl: lexableWebUrl(config, "/register"),
    billingUrl: lexableWebUrl(config, "/billing"),
    dashboardUrl: lexableWebUrl(config, "/dashboard"),
    warning: statusWarning(config, session),
  };
}

function statusWarning(config, session) {
  if (config.devMode) {
    return "DEVELOPMENT MODE is active. Session data is a mock and is not a real Lexable subscription.";
  }
  if (session.mock) {
    return "A mock session was ignored because development mode is off.";
  }
  if (!config.apiBaseUrl) {
    return "Lexable API is not configured. Cloud authentication, subscription, and remote scan require the backend contract.";
  }
  return null;
}
