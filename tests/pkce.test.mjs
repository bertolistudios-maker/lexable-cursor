import assert from "node:assert/strict";
import test from "node:test";
import { authorizationUrl, generatePkce } from "../plugins/lexable/src/lexable/auth/pkce.mjs";
import { loadConfig } from "../plugins/lexable/src/lexable/config.mjs";

test("PKCE verifier and challenge are generated", () => {
  const pkce = generatePkce();
  assert.ok(pkce.verifier.length >= 43);
  assert.ok(pkce.challenge.length >= 43);
  assert.ok(pkce.state.length > 8);
});

test("authorization URL uses S256 and loopback redirect", () => {
  const url = authorizationUrl("https://app.lex-able.com/plugin/oauth/authorize", {
    clientId: "lexable-cursor",
    redirectUri: "http://127.0.0.1:1234/callback",
    state: "abc",
    challenge: "challenge",
  });
  assert.match(url, /code_challenge_method=S256/);
  assert.match(url, /client_id=lexable-cursor/);
  assert.match(url, /127\.0\.0\.1/);
});

test("production defaults to the Lexable app API", () => {
  const config = loadConfig({ LEXABLE_ENV: "production" });
  assert.equal(config.apiBaseUrl, "https://app.lex-able.com");
  assert.equal(config.clientId, "lexable-cursor");
  assert.equal(config.devMode, false);
});
