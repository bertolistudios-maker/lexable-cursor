---
name: lexable-fix
description: Apply the smallest accessibility remediations for issues found in the current project, then re-review the edited files.
---

# /lexable-fix

Fix accessibility issues in the current project.

## Steps

1. Follow the accessibility-fixer skill.
2. Identify files from the latest audit or run a fresh local audit plus source review.
3. Before writing, list what will change and why.
4. Edit only those files. Prefer native HTML. Do not add workaround ARIA.
5. Re-read the edited files and report remaining detected issues, potential issues, and items that still need runtime or manual verification.

If no issues are identified, say so and stop. Do not refactor unrelated code.
