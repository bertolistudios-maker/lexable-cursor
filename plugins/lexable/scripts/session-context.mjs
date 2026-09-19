#!/usr/bin/env node

import { createLexableClient } from "../src/lexable/index.mjs";
import { can, CAPABILITY_CATALOG } from "../src/lexable/capabilities.mjs";

const client = await createLexableClient(process.env);
const status = await client.getStatus();

const featureLines = CAPABILITY_CATALOG.map((item) => {
  const ok = can(status.entitlements, item.id);
  return `${ok ? "yes" : "no"}: ${item.id} (${item.label})`;
});

const context = [
  "Lexable Accessibility plugin context:",
  status.developmentMode ? "MODE: DEVELOPMENT MOCK. Do not treat this as a real Lexable subscription." : "MODE: not development.",
  `Authenticated: ${status.authenticated ? "yes" : "no"}`,
  `Plan display value: ${status.plan || "none"}`,
  `Subscription status: ${status.subscriptionStatus || "none"}`,
  "Entitlements (source of access; do not infer from plan strings):",
  ...featureLines,
  "Never claim WCAG conformance from static analysis alone.",
  "Do not invent WCAG criteria or Lexable API responses.",
  status.warning || "",
].filter(Boolean);

process.stdout.write(
  JSON.stringify({
    additional_context: context.join("\n"),
  })
);
