import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createLexableClient } from "../plugins/lexable/src/lexable/index.mjs";
import { can } from "../plugins/lexable/src/lexable/capabilities.mjs";

async function clientWith(env) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lexable-session-"));
  return createLexableClient({
    ...env,
    LEXABLE_SESSION_PATH: path.join(dir, "session.json"),
  });
}

test("unauthenticated has only local capabilities", async () => {
  const client = await clientWith({});
  const status = await client.getStatus();
  assert.equal(status.authenticated, false);
  assert.equal(await client.can("accessibility.rules"), true);
  assert.equal(await client.can("accessibility.audit"), false);
  assert.equal(await client.can("accessibility.fix"), false);
  assert.equal(await client.can("lexable.remote_scan"), false);
});

test("dev login personas: free ≠ pro ≠ agency, expired ≠ active", async () => {
  const env = { LEXABLE_ENV: "development", LEXABLE_DEV_MODE: "true" };

  const free = await clientWith(env);
  await free.login({ persona: "free" });
  assert.equal(await free.can("accessibility.audit"), false);
  assert.equal(await free.can("accessibility.fix"), false);
  assert.equal((await free.getStatus()).plan, "free");
  assert.equal((await free.getStatus()).subscriptionStatus, "active");

  const pro = await clientWith(env);
  await pro.login({ persona: "pro" });
  assert.equal(await pro.can("accessibility.audit"), true);
  assert.equal(await pro.can("accessibility.fix"), true);
  assert.equal(await pro.can("lexable.remote_scan"), true);
  assert.equal(await pro.can("agency.workspace"), false);
  assert.equal((await pro.getStatus()).plan, "pro");

  const agency = await clientWith(env);
  await agency.login({ persona: "agency" });
  assert.equal(await agency.can("agency.workspace"), true);
  assert.equal(await agency.can("agency.higher_limits"), true);

  const expired = await clientWith(env);
  await expired.login({ persona: "expired" });
  const expiredStatus = await expired.getStatus();
  assert.equal(expiredStatus.authenticated, true);
  assert.equal(expiredStatus.plan, "pro");
  assert.equal(expiredStatus.subscriptionStatus, "expired");
  assert.equal(await expired.can("accessibility.audit"), false);
  assert.equal(await expired.can("lexable.remote_scan"), false);
});

test("can() uses entitlements array, not plan strings", () => {
  const fakeProPlan = { plan: "pro", capabilities: ["accessibility.rules"] };
  assert.equal(can(fakeProPlan, "accessibility.audit"), false);
  assert.equal(can({ capabilities: ["accessibility.audit"] }, "accessibility.audit"), true);
});

test("logout returns to unauthenticated", async () => {
  const client = await clientWith({ LEXABLE_ENV: "development", LEXABLE_DEV_MODE: "true" });
  await client.login({ persona: "pro" });
  assert.equal((await client.getStatus()).authenticated, true);
  await client.logout();
  const status = await client.getStatus();
  assert.equal(status.authenticated, false);
  assert.equal(await client.can("accessibility.audit"), false);
});

test("production ignores LEXABLE_DEV_MODE and mock sessions", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lexable-session-"));
  const sessionPath = path.join(dir, "session.json");
  const prod = await createLexableClient({
    LEXABLE_ENV: "production",
    LEXABLE_DEV_MODE: "true",
    LEXABLE_API_BASE_URL: "http://127.0.0.1:1",
    LEXABLE_SESSION_PATH: sessionPath,
  });
  assert.equal(prod.config.devMode, false);
  await assert.rejects(() => prod.login({ persona: "pro" }), /Development mode is not active|REQUIRES LEXABLE BACKEND|not available|Could not reach/);

  await writeFile(
    sessionPath,
    JSON.stringify({
      mock: true,
      authenticated: true,
      user: { email: "spoof@lexable.local" },
      subscription: { plan: "agency", status: "active" },
      entitlements: { capabilities: ["lexable.remote_scan"] },
    })
  );
  const status = await prod.getStatus();
  assert.equal(status.authenticated, false);
  assert.equal(await prod.can("lexable.remote_scan"), false);
});

test("login without backend in non-dev mode is REQUIRES_LEXABLE_BACKEND", async () => {
  const client = await clientWith({
    LEXABLE_ENV: "production",
    LEXABLE_API_BASE_URL: "http://127.0.0.1:1",
  });
  await assert.rejects(() => client.login(), (error) => error.code === "REQUIRES_LEXABLE_BACKEND");
});

test("remote scan never invents engine results", async () => {
  const client = await clientWith({ LEXABLE_ENV: "development", LEXABLE_DEV_MODE: "true" });
  await client.login({ persona: "pro" });
  const result = await client.remoteScan();
  assert.equal(result.status, "REQUIRES_LEXABLE_BACKEND");
});
