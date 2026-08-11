# V2 content import

See [IMPORT_JSON.md](IMPORT_JSON.md) for the transport schema. The lifecycle is:

```text
JSON file → runtime validator → draft ExamVersion → readiness validation → publish → public V2 read
```

`import:exam-content` without `--write` is dry-run. With `--write`, it updates only draft content. `publish:exam-content` validates again and freezes the version. Use `practice` for incomplete fixtures and `official_full_exam` only for the exact THPT format.

Run `npm run audit:exam-content-engines` to classify old exam containers without rewriting ambiguous content. Run `npm run audit:legacy-history` to report exact V2, legacy-best-effort and unavailable historical attempts. Neither audit fabricates stable IDs, answer keys, or historical score facts.
