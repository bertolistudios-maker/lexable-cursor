import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeSource, auditPaths } from "../plugins/lexable/src/audit/local-audit.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)));

test("detects icon-only button, unlabeled input, and image without alt in HTML", async () => {
  const result = await auditPaths([path.join(root, "fixtures/inaccessible/example.html")], { cwd: root });
  const ids = result.issues.map((item) => item.id);
  assert.ok(ids.includes("button-missing-name"));
  assert.ok(ids.includes("input-missing-label"));
  assert.ok(ids.includes("img-missing-alt"));
  assert.ok(result.counts.HIGH >= 3);
});

test("detects the same issues in JSX", async () => {
  const result = await auditPaths([path.join(root, "fixtures/inaccessible/example.jsx")], { cwd: root });
  const ids = result.issues.map((item) => item.id);
  assert.ok(ids.includes("button-missing-name"));
  assert.ok(ids.includes("input-missing-label"));
  assert.ok(ids.includes("img-missing-alt"));
});

test("does not flag labeled, named, and alt-provided controls", async () => {
  const result = await auditPaths([path.join(root, "fixtures/accessible/example.html")], { cwd: root });
  const ids = result.issues.map((item) => item.id);
  assert.equal(ids.includes("button-missing-name"), false);
  assert.equal(ids.includes("input-missing-label"), false);
  assert.equal(ids.includes("img-missing-alt"), false);
});

test("does not invent WCAG criteria", () => {
  const findings = analyzeSource(`<button><svg /></button>`, "x.html");
  for (const finding of findings) {
    if (finding.wcagId) {
      assert.match(finding.wcagId, /^\d+\.\d+\.\d+$/);
    }
  }
  const button = findings.find((item) => item.id === "button-missing-name");
  assert.equal(button.wcagId, "4.1.2");
});
