# Importing V2 content

Use the V2 JSON envelope with `schemaVersion: 2`, taxonomy, stable question IDs, and a publish profile.

```powershell
npm run import:exam-content -- ./src/data/import/thpt-math-2026-001.json --write
npm run publish:exam-content -- thpt-math-2026-001
```

Import updates a draft version only. Publishing validates readiness and never modifies an existing published version.
