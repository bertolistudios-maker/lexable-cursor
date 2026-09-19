---
name: lexable-status
description: Show Lexable account, authentication, subscription display data, and entitlements.
---

# /lexable-status

Show the current Lexable adapter status.

## Steps

1. Call `lexable_status` or run:

```bash
node plugins/lexable/src/cli.mjs status
```

2. Return the CLI output without rewriting mock sessions as real subscriptions.
3. If unauthenticated, keep this shape:

```text
Not authenticated.

Run /lexable-login to connect your Lexable account.
If you do not have an account, the same browser flow lets you register on Lexable.
Plans are purchased on the Lexable dashboard, same as using Lexable on the web.
```

4. If authenticated, keep this shape:

```text
LEXABLE

Account: authenticated
Plan: Pro
Subscription: active

Available:
✓ Accessibility audit
✓ Accessibility remediation
✓ Lexable scan
✓ Advanced reports
```

Access comes from entitlements (`can(capability)`), not from a local `if (plan === "pro")` check. If development mode is on, the first line after LEXABLE must state that the session is a mock.

If a paid capability is missing, tell the user to buy or change the plan on the Lexable dashboard billing page. Do not invent a plan upgrade inside Cursor.
