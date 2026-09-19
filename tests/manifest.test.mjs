import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return null;
  }
  const closingIndex = content.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }
  const fields = {};
  for (const line of content.slice(4, closingIndex).split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

test("marketplace and plugin manifests are valid and consistent", async () => {
  const marketplace = JSON.parse(await readFile(path.join(repoRoot, ".cursor-plugin/marketplace.json"), "utf8"));
  const plugin = JSON.parse(await readFile(path.join(repoRoot, "plugins/lexable/.cursor-plugin/plugin.json"), "utf8"));
  assert.equal(marketplace.name, "bertolistudios");
  assert.equal(marketplace.owner.name, "Bertoli Studios");
  assert.equal(plugin.name, "lexable");
  assert.equal(plugin.displayName, "Lexable Accessibility");
  assert.equal(plugin.version, "1.0.0");
  assert.equal(marketplace.plugins[0].name, plugin.name);
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  assert.ok(plugin.keywords.includes("wcag-2.2"));
  assert.equal(plugin.logo, "assets/logo.svg");
  const logo = await readFile(path.join(repoRoot, "plugins/lexable/assets/logo.svg"), "utf8");
  assert.ok(logo.includes("<svg"));
  assert.equal(logo.includes("example.com"), false);
});

test("command files have required frontmatter", async () => {
  const names = ["lexable-login", "lexable-status", "lexable-audit", "lexable-fix", "lexable-review"];
  for (const name of names) {
    const content = await readFile(path.join(repoRoot, "plugins/lexable/commands", `${name}.md`), "utf8");
    const fields = parseFrontmatter(content);
    assert.ok(fields, `${name} missing frontmatter`);
    assert.equal(fields.name, name);
    assert.ok(fields.description.length > 0);
  }
});

test("skills, agent, and rules have required frontmatter", async () => {
  const skillNames = ["accessibility-auditor", "accessibility-fixer", "wcag-reviewer", "accessibility-report"];
  for (const name of skillNames) {
    const content = await readFile(path.join(repoRoot, "plugins/lexable/skills", name, "SKILL.md"), "utf8");
    const fields = parseFrontmatter(content);
    assert.equal(fields.name, name);
    assert.ok(fields.description);
  }
  const agent = parseFrontmatter(await readFile(path.join(repoRoot, "plugins/lexable/agents/lexable-auditor.md"), "utf8"));
  assert.equal(agent.name, "lexable-auditor");
  const rule = parseFrontmatter(await readFile(path.join(repoRoot, "plugins/lexable/rules/accessibility-core.mdc"), "utf8"));
  assert.ok(rule.description);
});
