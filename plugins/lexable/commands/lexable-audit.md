---
name: lexable-audit
description: Analyze the current repository for accessibility issues using Lexable rules, local static analysis, and source review.
---

# /lexable-audit

Analyze the current project. Do not return a canned list of issues.

## Steps

1. Read the accessibility-auditor skill and follow it.
2. Run local static analysis on the workspace (or the paths the user named):

```bash
node plugins/lexable/src/cli.mjs audit
```

or MCP `lexable_local_audit`.

3. Then inspect matching source files yourself. The helper is incomplete on purpose; it does not replace a source review.
4. Produce:

```text
LEXABLE ACCESSIBILITY AUDIT

Issues found: X
```

followed by HIGH / MEDIUM / needs manual review items with file, line, WCAG criterion (only if supported), why, remediation, and verification type.

5. State clearly: this is plugin-local static analysis plus code review. It is not a Lexable cloud scan and not a WCAG conformance result.

6. If the user asked for a Lexable engine scan, also call `lexable_remote_scan` and report the adapter response. Do not fabricate engine findings.
