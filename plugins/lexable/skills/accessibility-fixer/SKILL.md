---
name: accessibility-fixer
description: Fix detected accessibility issues in source with the smallest safe markup or component change, then re-review the edited files. Use when the user asks to fix a11y issues, apply accessibility remediation, or runs /lexable-fix.
---

# Accessibility fixer

## When to use

- `/lexable-fix`
- "Fix the accessibility issues"

## Workflow

1. Confirm `can(accessibility.fix)` is true. If not, stop and send the user to `/lexable-login` or the Lexable dashboard billing page. Do not edit files.
2. Identify issues from the current audit, the local helper, or a fresh pass over the files the user named. Do not wander into unrelated files.
2. Before editing, list each file and the change you will make.
3. Apply the smallest remediation that uses native HTML semantics. Do not add ARIA when a native element works.
4. Preserve behavior and visual design. Do not restyle the page to "look more accessible" unless contrast or focus visibility in source is the issue.
5. Do not introduce `role="button"` on divs, positive tabindex, or aria-label that overrides a visible label.
6. After edits, re-read the changed files and report remaining detected issues, potential issues, needs manual review, and runtime verification required.

## Typical remediations

- Icon-only button: add an accessible name (`aria-label` or visually adjacent text). Prefer visible text when the UI already has room for it.
- Unlabeled input: add `<label for>` / wrapping label. Keep placeholder only as example text.
- Image: add `alt` for informative images or `alt=""` for decorative ones. Ask only if purpose cannot be determined; if the filename or nearby text makes the purpose clear, write the alt.
- `div role="button"`: replace with `<button type="button">` and keep class names.

If a fix cannot be verified in source, leave a `RUNTIME VERIFICATION REQUIRED` note instead of claiming success.
