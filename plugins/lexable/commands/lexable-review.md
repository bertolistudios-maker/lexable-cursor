---
name: lexable-review
description: Conservative pre-commit accessibility review of the current changes or project.
---

# /lexable-review

Final accessibility review before commit or pull request.

## Steps

1. Check entitlements. Basic review is available after `/lexable-login` with a Lexable account. Advanced review requires `accessibility.review.advanced` (Pro or Agency on the Lexable dashboard). If the user asked for an advanced review and `can(accessibility.review.advanced)` is false, say so and send them to dashboard billing. Do not invent a pass.
2. Follow the wcag-reviewer skill.
2. Review the current diff if one exists; otherwise review the files the user named or the local static findings plus surrounding source.
3. Output:

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

4. Do not mark runtime behavior as detected-pass. Use needs manual review or runtime verification required when you did not run a browser or AT.
