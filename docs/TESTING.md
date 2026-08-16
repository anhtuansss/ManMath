# Testing

Use the isolated database for mutation verifiers:

```powershell
npm run verify:isolated -- attempt-persistence
npm run verify:isolated -- attempt-read
npm run verify:isolated -- history-immutability
npm run verify:isolated -- version-pinning
npm run verify:v2-analytics
npm run verify:v2-practice
```

The fixture is `backend/src/test-fixtures/v2-minimal-exam.json`.
