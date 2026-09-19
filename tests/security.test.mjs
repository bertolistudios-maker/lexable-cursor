import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if ([".git", "node_modules"].includes(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

test(".gitignore excludes secrets and session files", async () => {
  const gitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");
  for (const pattern of [".env", ".env.*", "credentials", "tokens", ".lexable/"]) {
    assert.ok(gitignore.includes(pattern), `missing ${pattern}`);
  }
});

test("repository files do not contain production secrets or example.com marketplace owner", async () => {
  const files = await walk(repoRoot);
  const blocked = /(api[_-]?secret|client_secret\s*[:=]\s*['\"][^'\"]+|password\s*[:=]\s*['\"][^'\"]+)/i;
  for (const file of files) {
    if (file.endsWith(".png") || file.endsWith(".jpg")) {
      continue;
    }
    const content = await readFile(file, "utf8");
    assert.equal(blocked.test(content), false, `secret-like pattern in ${path.relative(repoRoot, file)}`);
  }
  const marketplace = await readFile(path.join(repoRoot, ".cursor-plugin/marketplace.json"), "utf8");
  assert.equal(marketplace.includes("example.com"), false);
});
