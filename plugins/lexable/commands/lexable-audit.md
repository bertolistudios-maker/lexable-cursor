---
name: lexable-audit
description: Analyze the current repository for accessibility issues using Lexable rules, local static analysis, and source review.
---

# /lexable-audit

Analyze the current project. Do not return a canned list of issues.

## Steps

1. Check `lexable_can` for `accessibility.audit` (or `node plugins/lexable/src/cli.mjs can accessibility.audit`). If it is false, run `lexable_status`, show the NOT ENTITLED output, and stop. Do not audit. Unauthenticated users must `/lexable-login`. Users without this entitlement must buy or change the plan on the Lexable dashboard (same billing as the website).
2. Read the accessibility-auditor skill and follow it.
3. Run local static analysis on the workspace (or the paths the user named):

```bash
node plugins/lexable/src/cli.mjs audit
```

or MCP `lexable_local_audit`.

4. Then inspect matching source files yourself. The helper is incomplete on purpose; it does not replace a source review.
5. Produce:

```text
LEXABLE ACCESSIBILITY AUDIT

Issues found: X
```

followed by HIGH / MEDIUM / needs manual review items with file, line, WCAG criterion (only if supported), why, remediation, and verification type.

6. State clearly: this is plugin-local static analysis plus code review. It is not a Lexable cloud scan and not a WCAG conformance result.

7. If the user asked for a Lexable engine scan, also call `lexable_remote_scan` and report the adapter response. Do not fabricate engine findings.
