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
Lexable authentication
  ↓
Authorization/token
  ↓
Cursor
```

## Steps

1. Prefer the `lexable_login` MCP tool. If MCP is unavailable, run:

```bash
node plugins/lexable/src/cli.mjs login
```

2. If development mode is active (`LEXABLE_ENV=development` and `LEXABLE_DEV_MODE=true`), this opens a local mock authorization page. That page is not a real Lexable login and must be labeled as a development mock.
3. If development mode is off, the adapter looks for Lexable plugin discovery. If discovery is missing, report `REQUIRES LEXABLE BACKEND` and point to `docs/BACKEND-CONTRACT.md`. Do not invent endpoints, tokens, or a successful production login.
4. After the command finishes, run status and show the result.

Never print access tokens. Never request passwords.
