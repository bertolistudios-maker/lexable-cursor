---
name: wcag-reviewer
description: Conservative WCAG-oriented code review that refuses to mark unverified behavior as a pass. Use when the user asks for a WCAG review, a pre-commit accessibility review, or runs /lexable-review.
---

# WCAG reviewer

## When to use

- `/lexable-review`
- Pre-commit or pull-request accessibility review

## Rules

Be conservative. A guess is not a pass.

- If keyboard behavior, screen reader output, computed contrast, focus visibility, or dynamic state cannot be verified from source, write `RUNTIME VERIFICATION REQUIRED` or `NEEDS MANUAL REVIEW`.
- If the file was not opened or the control is CSS/background-image/canvas-only, write `not tested`.
- Cite WCAG 2.2 criteria only from supported mappings in the plugin rules. Do not invent criteria.
- Native semantics over ARIA.
- Do not declare WCAG conformance.

## Output

```text
LEXABLE REVIEW

Detected:
✓ ...

Potential issues:
⚠ ...

Manual verification:
□ Keyboard-only navigation
□ Screen reader behavior
□ Dynamic interaction
□ Runtime contrast
```

Put unsupported claims in potential issues or the manual list. Never convert them into Detected checkmarks.
