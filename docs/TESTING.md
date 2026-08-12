# Testing and verification

Run non-mutating checks from `backend` with a development PostgreSQL database:

```bash
.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
npm exec prisma validate
npm exec prisma migrate status
npm run verify:history-immutability
npm run verify:anonymous-attempt-receipt
npm run verify:legacy-history-containment
npm run verify:v2-analytics
```

`verify:security-containment` and `verify:exam-version-pinning` mutate data by design. They must run only through the disposable verification database runner:

```powershell
$env:VERIFY_DATABASE_URL = 'postgresql://USER:PASSWORD@localhost:5432/manmath_verify?schema=public'
$env:VERIFY_DATABASE_CONFIRM = 'MANMATH_VERIFY_DB'
npm run verify:isolated

# Run either target in isolation.
npm run verify:isolated -- security-containment
npm run verify:isolated -- version-pinning
npm run verify:exam-draft-preview
```

The runner checks the URL differs from the primary `DATABASE_URL`, requires database name suffix `_verify`, confirmation value, and verification mode. It resets/migrates the disposable DB, prepares the canonical fixture through the real importer/publish pipeline, runs verification, then resets it again in `finally`. Do not run the two mutation scripts directly against development or production.

Frontend checks:

```bash
cd frontend
npm run type-check
npm run build
npm run test:e2e
```

The Playwright suite covers V2 public secret containment plus anonymous three-type taking, versioned autosave/reload, submit and safe receipt reload. It needs Playwright Chromium (`npx playwright install chromium`). In this environment the browser artifact download timed out, so browser execution remains pending even though the API-only Playwright test passed.

Manual smoke: open a published practice V2 exam, answer one single-choice, all four true/false statements, and a short answer; reload before submit; submit; reload the result. Repeat signed in and verify owner receipt/review. Open a legacy exam and verify its unchanged legacy route; open a V2 exam through a legacy detail/attempt route and expect `409`.
