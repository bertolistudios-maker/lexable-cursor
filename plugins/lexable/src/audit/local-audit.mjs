import { promises as fs } from "node:fs";
import path from "node:path";
import { criterion } from "./wcag-criteria.mjs";

const SCAN_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".xhtml",
  ".jsx",
  ".tsx",
  ".vue",
  ".svelte",
  ".mdx",
]);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  ".lexable",
]);

function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === "\n") {
      line += 1;
    }
  }
  return line;
}

function stripComments(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function hasAttr(attrs, name) {
  const pattern = new RegExp(`(?:^|\\s)${name}(?:\\s|=|/|>|$)`, "i");
  return pattern.test(attrs);
}

function attrValue(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|\\{([^}]*)\\})`, "i"));
  if (!match) {
    return null;
  }
  return match[2] ?? match[3] ?? match[4] ?? "";
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<path[\s\S]*?<\/path>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]+\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAccessibleName(attrs, inner) {
  const labelledBy = attrValue(attrs, "aria-labelledby");
  const ariaLabel = attrValue(attrs, "aria-label");
  const title = attrValue(attrs, "title");
  if (labelledBy && labelledBy.trim()) {
    return true;
  }
  if (ariaLabel && ariaLabel.trim()) {
    return true;
  }
  if (title && title.trim()) {
    return true;
  }
  if (visibleText(inner)) {
    return true;
  }
  const imgAlt = [...inner.matchAll(/<img\b([^>]*)>/gi)].some((match) => {
    const alt = attrValue(match[1], "alt");
    return typeof alt === "string" && alt.trim().length > 0;
  });
  return imgAlt;
}

function issue({ id, severity, wcag, file, index, content, message, why, remediation, verification }) {
  const sc = criterion(wcag);
  return {
    id,
    severity,
    wcag: sc ? `${sc.id} — ${sc.handle}` : null,
    wcagId: sc ? sc.id : null,
    wcagLevel: sc ? sc.level : null,
    file,
    line: lineNumberAt(content, index),
    issue: message,
    why,
    suggestedRemediation: remediation,
    verification,
  };
}

function collectLabelTargets(content) {
  const ids = new Set();
  const wrapping = [];
  for (const match of content.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const htmlFor = attrValue(match[1], "for");
    if (htmlFor && htmlFor.trim()) {
      ids.add(htmlFor.trim());
    }
    wrapping.push({ start: match.index, end: match.index + match[0].length });
  }
  return { ids, wrapping };
}

function isInside(index, ranges) {
  return ranges.some((range) => index >= range.start && index < range.end);
}

export function analyzeSource(content, filePath) {
  const findings = [];
  const source = stripComments(content);
  const labels = collectLabelTargets(source);
  const relative = filePath;

  if (/<html\b/i.test(source) && !/<html\b[^>]*\blang\s*=/i.test(source)) {
    findings.push(
      issue({
        id: "html-lang",
        severity: "HIGH",
        wcag: "3.1.1",
        file: relative,
        index: source.search(/<html\b/i),
        content: source,
        message: "The document html element has no lang attribute.",
        why: "Assistive technologies need a page language to pronounce content correctly.",
        remediation: 'Add a valid BCP 47 lang attribute, for example lang="en" or lang="it".',
        verification: "Static",
      })
    );
  }

  for (const match of source.matchAll(/<img\b([^>]*?)(\/?)>/gi)) {
    const attrs = match[1];
    if (!hasAttr(attrs, "alt")) {
      findings.push(
        issue({
          id: "img-missing-alt",
          severity: "HIGH",
          wcag: "1.1.1",
          file: relative,
          index: match.index,
          content: source,
          message: "Image is missing an alt attribute.",
          why: "Without alt, assistive technologies cannot determine an equivalent for the image.",
          remediation:
            "Add alt with a concise description if the image is informative. Use alt=\"\" only when the image is decorative and not the only content of a control.",
          verification: "Static",
        })
      );
    }
  }

  for (const match of source.matchAll(/<(?:Image)\b([^>]*?)(\/?)>/g)) {
    const attrs = match[1];
    if (!hasAttr(attrs, "alt")) {
      findings.push(
        issue({
          id: "next-image-missing-alt",
          severity: "HIGH",
          wcag: "1.1.1",
          file: relative,
          index: match.index,
          content: source,
          message: "Next.js Image component is missing an alt attribute.",
          why: "Informative images need a text alternative. Decorative images need alt=\"\".",
          remediation: "Add alt text, or alt=\"\" if the image is decorative.",
          verification: "Static",
        })
      );
    }
  }

  for (const match of source.matchAll(/<input\b([^>]*?)(\/?)>/gi)) {
    const attrs = match[1];
    const type = (attrValue(attrs, "type") || "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) {
      continue;
    }
    if (hasAttr(attrs, "aria-label") && attrValue(attrs, "aria-label")?.trim()) {
      continue;
    }
    if (hasAttr(attrs, "aria-labelledby") && attrValue(attrs, "aria-labelledby")?.trim()) {
      continue;
    }
    const id = attrValue(attrs, "id");
    if (id && labels.ids.has(id.trim())) {
      continue;
    }
    if (isInside(match.index, labels.wrapping)) {
      continue;
    }
    if (hasAttr(attrs, "title") && attrValue(attrs, "title")?.trim()) {
      findings.push(
        issue({
          id: "input-title-only",
          severity: "MEDIUM",
          wcag: "3.3.2",
          file: relative,
          index: match.index,
          content: source,
          message: "Input appears to use title as its only accessible name.",
          why: "title is a weak and inconsistent accessible name compared with a visible label.",
          remediation: "Provide a visible label associated with the input via for/id or wrapping label.",
          verification: "Static",
        })
      );
      continue;
    }
    findings.push(
      issue({
        id: "input-missing-label",
        severity: "HIGH",
        wcag: "3.3.2",
        file: relative,
        index: match.index,
        content: source,
        message: "Form input does not have an associated label or accessible name.",
        why: "Users need a persistent label to understand what to enter. Placeholder is not a label.",
        remediation: "Add a <label for> matching the input id, wrap the input in a label, or provide an accessible name plus a visible label.",
        verification: "Static",
      })
    );
  }

  for (const match of source.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi)) {
    const attrs = match[1];
    const id = attrValue(attrs, "id");
    if (hasAttr(attrs, "aria-label") && attrValue(attrs, "aria-label")?.trim()) {
      continue;
    }
    if (id && labels.ids.has(id.trim())) {
      continue;
    }
    if (isInside(match.index, labels.wrapping)) {
      continue;
    }
    findings.push(
      issue({
        id: "textarea-missing-label",
        severity: "HIGH",
        wcag: "3.3.2",
        file: relative,
        index: match.index,
        content: source,
        message: "Textarea does not have an associated label or accessible name.",
        why: "Unlabeled text areas cannot be understood from the control alone.",
        remediation: "Associate a visible label with the textarea.",
        verification: "Static",
      })
    );
  }

  for (const match of source.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attrs = match[1];
    const inner = match[2];
    if (!hasAccessibleName(attrs, inner)) {
      findings.push(
        issue({
          id: "button-missing-name",
          severity: "HIGH",
          wcag: "4.1.2",
          file: relative,
          index: match.index,
          content: source,
          message: "Button has no accessible name. Icon-only buttons need a text alternative.",
          why: "A control without an accessible name is announced as an unnamed button.",
          remediation:
            "Add visible text, aria-label, or aria-labelledby. Prefer visible text. Do not rely on SVG contents unless they provide a title that is exposed as a name.",
          verification: "Static",
        })
      );
    }
  }

  for (const match of source.matchAll(/<div\b([^>]*\brole\s*=\s*['"]button['"][^>]*)>([\s\S]*?)<\/div>/gi)) {
    findings.push(
      issue({
        id: "div-role-button",
        severity: "MEDIUM",
        wcag: "4.1.2",
        file: relative,
        index: match.index,
        content: source,
        message: "A div is used with role=\"button\" instead of a native button.",
        why: "Native <button> provides keyboard support, focus, and a button role without extra ARIA.",
        remediation: "Replace with <button type=\"button\"> unless there is a documented reason a native button cannot be used.",
        verification: "Static",
      })
    );
  }

  for (const match of source.matchAll(/\btabIndex\s*=\s*\{?\s*([1-9]\d*)/g)) {
    findings.push(
      issue({
        id: "positive-tabindex",
        severity: "MEDIUM",
        wcag: "2.4.3",
        file: relative,
        index: match.index,
        content: source,
        message: "Positive tabindex changes the natural focus order.",
        why: "Positive tabindex values create a confusing keyboard order.",
        remediation: "Use tabindex={0} or remove tabindex and keep DOM order aligned with reading order.",
        verification: "Static",
      })
    );
  }

  for (const match of source.matchAll(/<iframe\b([^>]*)>/gi)) {
    const attrs = match[1];
    const title = attrValue(attrs, "title");
    const ariaLabel = attrValue(attrs, "aria-label");
    if (!(title && title.trim()) && !(ariaLabel && ariaLabel.trim())) {
      findings.push(
        issue({
          id: "iframe-missing-title",
          severity: "HIGH",
          wcag: "4.1.2",
          file: relative,
          index: match.index,
          content: source,
          message: "iframe has no accessible name (title or aria-label).",
          why: "Embedded frames need a name so users can understand the frame in a list of frames.",
          remediation: "Add a descriptive title attribute on the iframe.",
          verification: "Static",
        })
      );
    }
  }

  return findings;
}

async function walk(dirPath, files) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") {
      if (SKIP_DIR_NAMES.has(entry.name) || entry.name.startsWith(".")) {
        continue;
      }
    }
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      await walk(full, files);
    } else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
}

export async function auditPaths(targets, { cwd = process.cwd() } = {}) {
  const files = [];
  for (const target of targets) {
    const resolved = path.resolve(cwd, target);
    let stat;
    try {
      stat = await fs.stat(resolved);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      await walk(resolved, files);
    } else if (stat.isFile()) {
      files.push(resolved);
    }
  }

  const unique = [...new Set(files)];
  const findings = [];
  const scannedFiles = [];

  for (const file of unique) {
    const content = await fs.readFile(file, "utf8");
    scannedFiles.push(path.relative(cwd, file) || file);
    const issues = analyzeSource(content, path.relative(cwd, file) || file);
    findings.push(...issues);
  }

  const severityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  findings.sort((a, b) => {
    const bySeverity = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (bySeverity !== 0) {
      return bySeverity;
    }
    return `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`);
  });

  return {
    engine: "lexable-local-static",
    note: "Plugin-local static analysis. This is not the Lexable cloud scanner and does not establish WCAG conformance.",
    scannedFileCount: scannedFiles.length,
    scannedFiles,
    issues: findings,
    counts: {
      total: findings.length,
      HIGH: findings.filter((item) => item.severity === "HIGH").length,
      MEDIUM: findings.filter((item) => item.severity === "MEDIUM").length,
      LOW: findings.filter((item) => item.severity === "LOW").length,
    },
  };
}
