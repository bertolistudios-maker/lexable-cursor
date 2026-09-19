---
name: accessibility-auditor
description: Audit web UI source for accessibility issues, map supported findings to WCAG 2.2 criteria, and separate static detections from runtime or manual review. Use when the user asks for an accessibility audit, a11y scan, WCAG review of code, or runs /lexable-audit.
---

# Accessibility auditor

## When to use

- `/lexable-audit`
- Requests to audit, scan, or find accessibility issues in the current project

## Workflow

1. Run plugin-local status (`lexable_status` MCP tool or `node plugins/lexable/src/cli.mjs status`) so the report can state authentication mode. If development mode is on, label results as mock account data.
2. Run plugin-local static analysis (`lexable_local_audit` or `node plugins/lexable/src/cli.mjs audit <paths>`). Treat those findings as candidates, not as a complete audit.
3. Inspect the relevant source yourself. Do not stop at the helper output. Search HTML/JSX/TSX/Vue/Svelte for controls, forms, images, dialogs, and dynamic UI.
4. For each issue, record file and line when possible, severity, a supported WCAG criterion, why it matters, remediation, and verification type.
5. Drop anything you cannot support. Never invent a WCAG criterion.
6. Do not call the result WCAG compliant. Static analysis never establishes conformance.

## Severity

- HIGH: missing name, missing label, missing alt on informative images, missing document language, iframe without name
- MEDIUM: non-native interactive elements, positive tabindex, weak name source (title only)
- NEEDS MANUAL REVIEW: quality of text alternatives, heading sense, link purpose, error copy
- RUNTIME VERIFICATION REQUIRED: keyboard, focus visibility, contrast, target size, traps, live updates

## Output format

```text
LEXABLE ACCESSIBILITY AUDIT

Issues found: X

[HIGH]
WCAG X.X.X — Criterion name

File:
src/components/Button.tsx:42

Issue:
...

Why:
...

Suggested remediation:
...

Verification:
Static / Runtime / Manual
```

If the local helper and the source review disagree, prefer the source review and explain.

Remote Lexable engine scans are out of scope unless `lexable_remote_scan` returns a real result. If it returns `REQUIRES_LEXABLE_BACKEND`, say so. Do not fabricate scan JSON.
