import { can, CAPABILITY_CATALOG } from "./lexable/capabilities.mjs";

export function formatStatus(status) {
  const lines = [];
  lines.push("LEXABLE");
  if (status.developmentMode) {
    lines.push("MODE: DEVELOPMENT (mock) — not a real Lexable account or subscription");
  }
  lines.push("");
  if (!status.authenticated) {
    lines.push("Not authenticated.");
    lines.push("");
    lines.push("Run /lexable-login to connect your Lexable account.");
    if (!status.developmentMode && !status.apiBaseUrlConfigured) {
      lines.push("");
      lines.push("Real browser login requires the Lexable backend discovery document.");
      lines.push("For local testing only: LEXABLE_ENV=development LEXABLE_DEV_MODE=true");
    }
    lines.push("");
    lines.push("Plugin-local (does not require a Lexable account):");
    for (const item of CAPABILITY_CATALOG.filter((entry) => entry.local)) {
      lines.push(`✓ ${item.label}`);
    }
    lines.push("");
    lines.push("Lexable account:");
    lines.push("✗ Authentication");
    lines.push("✗ Lexable scan");
    lines.push("✗ Advanced reports");
    return lines.join("\n");
  }

  const account = status.account?.email || status.account?.id || "authenticated";
  lines.push(`Account: authenticated (${account})`);
  lines.push(`Plan: ${status.plan || "unknown"}`);
  lines.push(`Subscription: ${status.subscriptionStatus || "unknown"}`);
  if (status.mock) {
    lines.push("Source: development mock");
  }
  lines.push("");
  lines.push("Available:");
  for (const item of CAPABILITY_CATALOG) {
    const ok = can(status.entitlements, item.id);
    const suffix = item.requiresBackend ? " (requires Lexable backend)" : "";
    lines.push(`${ok ? "✓" : "✗"} ${item.label}${ok && item.requiresBackend ? suffix : ""}`);
  }
  if (status.warning) {
    lines.push("");
    lines.push(status.warning);
  }
  return lines.join("\n");
}

export function formatAudit(result) {
  const lines = [];
  lines.push("LEXABLE ACCESSIBILITY AUDIT");
  lines.push("");
  lines.push(result.note);
  lines.push(`Scanned files: ${result.scannedFileCount}`);
  lines.push(`Issues found: ${result.counts.total}`);
  lines.push("");
  if (result.counts.total === 0) {
    lines.push("No statically detectable issues in the scanned files.");
    lines.push("This is not a WCAG conformance result. Keyboard, screen reader, contrast, and dynamic behavior remain not tested.");
    return lines.join("\n");
  }
  lines.push(`${result.counts.HIGH} HIGH`);
  lines.push(`${result.counts.MEDIUM} MEDIUM`);
  lines.push(`${result.counts.LOW} LOW`);
  lines.push("");
  for (const finding of result.issues) {
    lines.push(`[${finding.severity}]`);
    lines.push(finding.wcag ? `WCAG ${finding.wcag}` : "WCAG criterion not asserted");
    lines.push("");
    lines.push("File:");
    lines.push(`${finding.file}:${finding.line}`);
    lines.push("");
    lines.push("Issue:");
    lines.push(finding.issue);
    lines.push("");
    lines.push("Why:");
    lines.push(finding.why);
    lines.push("");
    lines.push("Suggested remediation:");
    lines.push(finding.suggestedRemediation);
    lines.push("");
    lines.push("Verification:");
    lines.push(finding.verification);
    lines.push("");
  }
  lines.push("Manual verification still required:");
  lines.push("□ Keyboard-only navigation");
  lines.push("□ Screen reader behavior");
  lines.push("□ Dynamic interaction");
  lines.push("□ Runtime contrast");
  return lines.join("\n");
}
