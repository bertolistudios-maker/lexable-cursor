# Lexable plugin discovery contract

This document lists **exactly** what the Lexable backend must provide before this Cursor plugin can perform real authentication, subscription checks, or remote scans.

Until that contract is live, the plugin uses an isolated adapter. Production login **does not succeed**. Development mock login is a separate path and is never treated as a real subscription.

## Current status

| Capability | Status |
| --- | --- |
| Plugin-local rules, skills, agent, commands | Implemented |
| Local static analysis helper | Implemented |
| Development mock login (browser, no password) | Mocked, explicit opt-in |
| Real OAuth/browser login | Implemented against `https://app.lex-able.com` |
| Server-side entitlements | Implemented (`/plugin/v1/entitlements`) |
| Existing Lexable scan listing | Implemented (`/plugin/v1/scans`) |
| Usage events for admin stats | Implemented (`/plugin/v1/events`) |

The plugin calls `https://app.lex-able.com` by default. Override only for staging.

## Discovery document

Publish a JSON document at:

```text
{LEXABLE_API_BASE_URL}{LEXABLE_DISCOVERY_PATH}
```

Default path:

```text
https://app.lex-able.com/.well-known/lexable-plugin.json
```

Required fields (all absolute HTTPS URLs):

```json
{
  "authorization_endpoint": "https://…",
  "token_endpoint": "https://…",
  "userinfo_endpoint": "https://…",
  "subscription_endpoint": "https://…",
  "entitlements_endpoint": "https://…",
  "logout_endpoint": "https://…",
  "scan_endpoint": "https://…",
  "events_endpoint": "https://…",
  "dashboard_url": "https://…/dashboard",
  "billing_url": "https://…/billing",
  "register_url": "https://…/register",
  "client_id": "lexable-cursor"
}
```

`logout_endpoint`, `scan_endpoint`, `events_endpoint`, `dashboard_url`, `billing_url`, and `register_url` may be omitted until those features ship. Missing `scan_endpoint` means remote scan stays `REQUIRES_LEXABLE_BACKEND`. The plugin still uses `{API}/register` and `{API}/billing` as fallbacks so users can create an account and buy a plan on the Lexable dashboard.

## Browser login (no passwords in Cursor)

Implement OAuth 2.1 authorization code with PKCE:

1. Cursor CLI starts a loopback callback on `127.0.0.1`.
2. Browser opens `authorization_endpoint` with `client_id`, `redirect_uri`, `state`, `code_challenge`.
3. User authenticates on Lexable-owned pages. If they have no account, they register, verify email, and choose a plan using the same dashboard billing as the website (Starter trial or Pro/Agency checkout). Then they authorize the plugin.
4. Lexable redirects to the loopback `redirect_uri` with `code`.
5. Plugin exchanges `code` at `token_endpoint`.
6. Plugin calls `userinfo_endpoint`, `subscription_endpoint`, and `entitlements_endpoint` with the access token.

`LEXABLE_CLIENT_ID` is a public OAuth client id, not a secret. Do not issue a client secret to this plugin.

## Entitlements

`entitlements_endpoint` MUST return a JSON object that includes:

```json
{
  "capabilities": [
    "accessibility.audit",
    "accessibility.fix"
  ]
}
```

The plugin grants access only from this array. It must not grant paid capabilities from a locally stored plan string.

Capability ids the plugin understands:

- `accessibility.rules`
- `accessibility.guidance`
- `accessibility.review.basic`
- `accessibility.audit`
- `accessibility.fix`
- `accessibility.review.advanced`
- `lexable.remote_scan`
- `advanced.report`
- `agency.workspace`
- `agency.higher_limits`

Plan names (`free`, `starter`, `pro`, `agency`) are display-only. Do not send prices to the plugin.

## Subscription display

`subscription_endpoint` should return display data, for example:

```json
{
  "plan": "pro",
  "status": "active"
}
```

`status` values the plugin knows how to display: `active`, `expired`, `none`. Unknown values are shown as-is and still do not grant capabilities.

## Environment variables

Set only when the backend is ready:

```text
LEXABLE_API_BASE_URL=
LEXABLE_CLIENT_ID=
LEXABLE_ENV=production
```

Development mock (local testing only):

```text
LEXABLE_ENV=development
LEXABLE_DEV_MODE=true
```

`LEXABLE_DEV_MODE` is ignored when `LEXABLE_ENV=production`.

## Out of scope for this plugin

- New detectors in the Lexable WCAG scanner engine
- Hardcoded production API hosts
- Storing passwords or refresh-token secrets in the git repository
