import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../plugins/lexable/src/lexable/config.mjs";
import { createDevLoginServer } from "../plugins/lexable/src/lexable/auth/browser-login.mjs";
import { writeSession } from "../plugins/lexable/src/lexable/session-store.mjs";
import { createLexableClient } from "../plugins/lexable/src/lexable/index.mjs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("dev login page does not ask for a password and completes via browser callback", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lexable-session-"));
  const env = {
    LEXABLE_ENV: "development",
    LEXABLE_DEV_MODE: "true",
    LEXABLE_SESSION_PATH: path.join(dir, "session.json"),
  };
  const config = loadConfig(env);
  const server = await createDevLoginServer(config);
  try {
    const loginPage = await fetch(server.loginUrl);
    const html = await loginPage.text();
    assert.match(html, /Development mock only/i);
    assert.doesNotMatch(html, /<input[^>]*type=["']password["']/i);
    const callback = await fetch(`${server.callbackUrl}?persona=pro`);
    assert.equal(callback.status, 200);
    const snapshot = await server.completed;
    assert.equal(snapshot.authenticated, true);
    assert.equal(snapshot.mock, true);
    assert.equal(snapshot.subscription.plan, "pro");
    await writeSession(config, snapshot);
    const client = await createLexableClient(env);
    assert.equal((await client.getStatus()).authenticated, true);
    assert.equal((await client.getStatus()).developmentMode, true);
  } finally {
    await server.close();
  }
});
