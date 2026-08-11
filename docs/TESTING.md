# Testing and verification

Run from `backend` with a development PostgreSQL database:

```bash
.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
npm exec prisma validate
npm exec prisma migrate status
npm run verify:security-containment
npm run verify:exam-version-pinning
npm run verify:history-immutability
npm run verify:anonymous-attempt-receipt
npm run verify:legacy-history-containment
npm run verify:v2-analytics
```

Those scripts verify V2 public answer-key containment, legacy/V2 separation, published-version pinning, immutable history, anonymous receipt authorization and partial-score analytics. They create development-only test rows/attempts and never rewrite existing historical data.

Frontend checks:

```bash
cd frontend
npm run type-check
npm run build
npm run test:e2e
```

The Playwright suite covers V2 public secret containment plus anonymous three-type taking, versioned autosave/reload, submit and safe receipt reload. It needs Playwright Chromium (`npx playwright install chromium`). In this environment the browser artifact download timed out, so browser execution remains pending even though the API-only Playwright test passed.

Manual smoke: open a published practice V2 exam, answer one single-choice, all four true/false statements, and a short answer; reload before submit; submit; reload the result. Repeat signed in and verify owner receipt/review. Open a legacy exam and verify its unchanged legacy route; open a V2 exam through a legacy detail/attempt route and expect `409`.
