/**
 * Capability catalog for the Cursor plugin.
 *
 * Granting capabilities MUST come from getEntitlements().capabilities.
 * Never infer access with `if (plan === "pro")` on local data.
 *
 * Plan names are display-only. Prices are not defined here.
 */

export const LOCAL_CAPABILITIES = [
  "accessibility.rules",
  "accessibility.guidance",
  "accessibility.review.basic",
];

export const PRO_CAPABILITIES = [
  ...LOCAL_CAPABILITIES,
  "accessibility.audit",
  "accessibility.fix",
  "accessibility.review.advanced",
  "lexable.remote_scan",
  "advanced.report",
];

export const AGENCY_CAPABILITIES = [
  ...PRO_CAPABILITIES,
  "agency.workspace",
  "agency.higher_limits",
];

export const CAPABILITY_CATALOG = [
  { id: "accessibility.rules", label: "Accessibility rules", local: true },
  { id: "accessibility.guidance", label: "Basic guidance", local: true },
  { id: "accessibility.review.basic", label: "Basic review", local: true },
  { id: "accessibility.audit", label: "Accessibility audit", local: false },
  { id: "accessibility.fix", label: "Accessibility remediation", local: false },
  { id: "accessibility.review.advanced", label: "Advanced review", local: false },
  { id: "lexable.remote_scan", label: "Lexable scan", local: false, requiresBackend: true },
  { id: "advanced.report", label: "Advanced reports", local: false, requiresBackend: true },
  { id: "agency.workspace", label: "Agency functionality", local: false, requiresBackend: true },
  { id: "agency.higher_limits", label: "Higher limits", local: false, requiresBackend: true },
];

export const DEV_PERSONAS = {
  unauthorized: {
    authenticated: false,
    account: null,
    plan: null,
    subscriptionStatus: "none",
    capabilities: [...LOCAL_CAPABILITIES],
  },
  free: {
    authenticated: true,
    account: { id: "dev-user-free", email: "dev-free@lexable.local" },
    plan: "free",
    subscriptionStatus: "active",
    capabilities: [...LOCAL_CAPABILITIES],
  },
  pro: {
    authenticated: true,
    account: { id: "dev-user-pro", email: "dev-pro@lexable.local" },
    plan: "pro",
    subscriptionStatus: "active",
    capabilities: [...PRO_CAPABILITIES],
  },
  agency: {
    authenticated: true,
    account: { id: "dev-user-agency", email: "dev-agency@lexable.local" },
    plan: "agency",
    subscriptionStatus: "active",
    capabilities: [...AGENCY_CAPABILITIES],
  },
  expired: {
    authenticated: true,
    account: { id: "dev-user-expired", email: "dev-expired@lexable.local" },
    plan: "pro",
    subscriptionStatus: "expired",
    capabilities: [...LOCAL_CAPABILITIES],
  },
};

export function can(entitlements, capability) {
  if (!capability || typeof capability !== "string") {
    return false;
  }
  const list = entitlements?.capabilities;
  if (!Array.isArray(list)) {
    return false;
  }
  return list.includes(capability);
}

export function describeCapability(id) {
  return CAPABILITY_CATALOG.find((item) => item.id === id) || { id, label: id };
}
