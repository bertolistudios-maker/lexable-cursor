---
name: lexable-fix
description: Apply the smallest accessibility remediations for issues found in the current project, then re-review the edited files.
---

# /lexable-fix

Fix accessibility issues in the current project.

## Steps

1. Check `lexable_can` for `accessibility.fix`. If it is false, run status, show that this command needs a Lexable plan with remediation (Pro or Agency on the dashboard), and stop. Do not edit files.
2. Follow the accessibility-fixer skill.
3. Identify files from the latest audit or run a fresh local audit plus source review.
4. Before writing, list what will change and why.
5. Edit only those files. Prefer native HTML. Do not add workaround ARIA.
6. Re-read the edited files and report remaining detected issues, potential issues, and items that still need runtime or manual verification.

If no issues are identified, say so and stop. Do not refactor unrelated code.
