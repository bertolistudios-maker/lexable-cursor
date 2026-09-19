---
name: lexable-login
description: Start Lexable authentication in the browser. Never collect a password in Cursor.
---

# /lexable-login

Start Lexable authentication. Do not ask the user to type a password into chat or into the plugin.

## Flow

```text
Cursor
  ↓
Lexable login command
  ↓
Browser
  ↓
Sign in, or register if there is no account
  ↓
Choose or buy a Lexable plan on the dashboard (same billing as the website)
  ↓
Authorize the Cursor plugin
  ↓
Cursor
```

## Steps

1. Prefer the `lexable_login` MCP tool. If MCP is unavailable, run:

```bash
node plugins/lexable/src/cli.mjs login
```

2. If development mode is active (`LEXABLE_ENV=development` and `LEXABLE_DEV_MODE=true`), this opens a local mock authorization page. That page is not a real Lexable login and must be labeled as a development mock.
3. If development mode is off, the plugin opens `https://app.lex-able.com` for OAuth PKCE. The user signs in on Lexable. If they do not have an account, they register on Lexable, verify email, and choose a plan (Starter trial or Pro/Agency checkout) — the same dashboard billing as using Lexable on the web. Then they authorize the plugin. Cursor receives an access token and server-side entitlements. Do not invent a successful login if discovery or token exchange fails.
4. After the command finishes, run status and show the result. Paid commands follow entitlements, not a local plan string.

Never print access tokens. Never request passwords.
