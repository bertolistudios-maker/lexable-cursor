---
name: lexable-review
description: Conservative pre-commit accessibility review of the current changes or project.
---

# /lexable-review

Final accessibility review before commit or pull request.

## Steps

1. Follow the wcag-reviewer skill.
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
