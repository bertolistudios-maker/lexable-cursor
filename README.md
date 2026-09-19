# Lexable Accessibility for Cursor

Official Cursor plugin from **Bertoli Studios**. Namespace `@bertolistudios`. Plugin id `lexable`.

Lexable brings web accessibility and WCAG 2.2 into Cursor so you can find potential issues, understand the related criterion, fix the code, and re-review the change.

**Lexable does not claim WCAG conformance from static code analysis alone.**

## What is Lexable?

[Lexable](https://www.lex-able.com) is Bertoli Studios' accessibility product: WCAG-oriented monitoring, remediation support, and related workflows. This repository is the **Cursor Marketplace plugin**, not the Lexable scanner engine.

This plugin helps you:

- spot potential accessibility issues in source;
- map supported findings to a WCAG criterion;
- apply a small remediation;
- re-review the edited files;
- separate statically detectable issues from runtime / manual testing;
- plug in the real Lexable API/MCP later, without inventing endpoints today.

## Features

| Area | What ships in v1 |
| --- | --- |
| Rules | Persistent WCAG-oriented guidance (semantic HTML, keyboard, forms, images, ARIA) |
| Skills | Audit, fix, review, and report workflows |
| Agent | `lexable-auditor` specialist |
| Commands | `/lexable-login`, `/lexable-status`, `/lexable-audit`, `/lexable-fix`, `/lexable-review` |
| Local static helper | Detects missing names, labels, and text alternatives in HTML/JSX and similar files |
| Auth adapter | Isolated client with `getCurrentUser`, `getSubscription`, `getEntitlements`, `login`, `logout` |
| Development mode | Explicit mock personas: unauthorized, free, pro, agency, expired |
| Remote Lexable scan | Adapter only — returns `REQUIRES_LEXABLE_BACKEND` until discovery exists |

## Installation

1. Clone this repository.
2. Run `npm test` (Node.js 18+).
3. Submit or install the GitHub repository through the Cursor plugin flow (Cursor Marketplace publish, or a local plugin install pointing at `plugins/lexable`).

Repository: https://github.com/bertolistudios-maker/lexable-cursor

## Commands

```text
/lexable-login
/lexable-status
/lexable-audit
/lexable-fix
/lexable-review
```

`/lexable-audit` analyzes the **current** project. It is not a canned response. It runs the local helper and then reviews source. It still does not prove WCAG conformance.

## Authentication

Login is browser-based. The plugin never asks for a password in Cursor.

```text
Cursor → /lexable-login → Browser → Lexable authentication → token → Cursor
```

That production flow is **not live**. The adapter refuses to guess API URLs. See [docs/BACKEND-CONTRACT.md](docs/BACKEND-CONTRACT.md).

For local testing, development mode opens a **mock** authorization page. Mock sessions are labeled as mocks and are ignored when `LEXABLE_ENV=production`.

## Subscription

Subscription and entitlements are **server-side**. The plugin calls `getEntitlements()` and `can("accessibility.audit")`. It does not grant paid features with `if (plan === "pro")` on local data.

Until the Lexable API publishes a discovery document, only development mocks can simulate account states. A mock is not a real subscription.

## Free vs paid capabilities

Capability ids (not prices — prices are not defined in this plugin):

**Always local (plugin files, no Lexable account required)**

- `accessibility.rules`
- `accessibility.guidance`
- `accessibility.review.basic`

**Account entitlements (from the Lexable API, mocked only in development)**

- `accessibility.audit`
- `accessibility.fix`
- `accessibility.review.advanced`
- `lexable.remote_scan` (also requires backend)
- `advanced.report` (also requires backend)
- `agency.workspace` / `agency.higher_limits` (also requires backend)

Development personas `free`, `pro`, `agency`, and `expired` exist so these gates can be tested. `expired` can display plan `pro` while still withholding paid capabilities.

## Development mode

Mock mode is **off** unless both are set:

```bash
export LEXABLE_ENV=development
export LEXABLE_DEV_MODE=true
```

`LEXABLE_DEV_MODE` is ignored when `LEXABLE_ENV=production`.

```bash
export LEXABLE_SESSION_PATH=/tmp/lexable-dev-session.json
node plugins/lexable/src/cli.mjs login --persona free --no-browser
node plugins/lexable/src/cli.mjs status
node plugins/lexable/src/cli.mjs login --persona pro --no-browser
node plugins/lexable/src/cli.mjs can accessibility.audit
node plugins/lexable/src/cli.mjs audit tests/fixtures/inaccessible
node plugins/lexable/src/cli.mjs logout
```

`--persona` is rejected outside development mode.

## Limitations

- Lexable does not claim WCAG conformance from static code analysis alone.
- Keyboard, screen reader, computed contrast, target size, and dynamic behavior are not tested by this plugin.
- This plugin does not add detectors to the Lexable scanner engine.
- Real authentication, server-side entitlements, remote scan, and hosted reports require the backend contract.

## Examples

### 1. Inaccessible button

```html
<button><svg /></button>
```

Detected issue: control has no accessible name (WCAG 4.1.2). Remediation: visible text or `aria-label` on a native `button`.

### 2. Missing form label

```html
<input type="text" name="email" />
```

Detected issue: no associated label (WCAG 3.3.2). Remediation: `<label for="email">` plus matching `id`.

### 3. Image without an appropriate text alternative

```html
<img src="photo.jpg" />
```

Detected issue: missing `alt` (WCAG 1.1.1). Remediation: descriptive `alt` if informative, or `alt=""` if decorative and not the only content of a control.

## CLI

```bash
node plugins/lexable/src/cli.mjs status
node plugins/lexable/src/cli.mjs audit path/to/ui
node plugins/lexable/src/cli.mjs remote-scan
```

## Tests

```bash
npm test
```

That runs the Node test suite and `scripts/validate-template.mjs` from the official Cursor plugin template.

## License

MIT. Marketplace manifests follow the Cursor plugin template conventions.
