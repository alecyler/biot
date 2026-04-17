This hotfix repairs the failed launch from pass 10.

Cause:
- The patch referenced lifecycle exports that did not exist in the uploaded base project.
- The inspector extras type was missing the lineagePopulation field used by main.ts.

Files to replace:
- src/core/lifecycle.ts
- src/ui/controls.ts

Validation:
- npx tsc --noEmit passed after applying these files to the uploaded project.
