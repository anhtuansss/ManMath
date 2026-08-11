# Tự thêm một đề Toán hoàn chỉnh vào ManMath

1. Create a V2 JSON file based on `backend/src/data/import/sample-exam-content-v2.json`. Use a new stable exam ID, title, description, `durationMinutes: 90`, subject, difficulty, source/year and a draft-like status label. Set `publishProfile` to `official_full_exam`.
2. Define every topic (`name`, stable `slug`) and every subtopic with its owning `topicSlug`. Keep slugs stable; analytics and discovery use them.
3. Add exactly 22 question containers, ordered continuously `1` through `22`: 12 `single_choice` in section 1, 4 `true_false_group` in section 2, and 6 `short_answer` in section 3. Give each question a stable string `id` unique in the exam.
4. For each single-choice question supply exactly four choices with stable choice IDs and `answerKey.correctChoiceId` referencing one of them. Do not duplicate the visible answer text as a separate key.
5. For each true/false group supply exactly four stable statement IDs and exactly four boolean entries in `answerKey.values`, one for each statement.
6. For a short answer, use an answer of at most four allowed characters (digits, `-`, `,`). Choose `exact`, `numeric`, or `numeric_with_tolerance`; do not add tolerance unless the question genuinely needs it.
7. Put KaTeX directly in `content` (and choice/statement content) using the existing `MathText` conventions. Put image files under frontend public assets and reference stable public paths through `assets: [{ "src": "/images/...", "alt": "..." }]`; also give images meaningful alt text.
8. Keep explanation/solution material out of V2 public content. The current owner-only review reveals answer keys from the immutable snapshot, but solution/explanation reveal policy is intentionally not implemented.
9. Validate without writes: `npm run import:exam-content -- ./path/to/exam.json`. Fix every validator/readiness error.
10. Write the draft: `npm run import:exam-content -- ./path/to/exam.json --write`. Re-run dry-run if you changed the file.
11. Publish only after the official readiness check succeeds: `npm run publish:exam-content -- your-exam-id`. Published content is immutable; corrections require a new draft/version.
12. Confirm discovery/dashboard shows it as V2, take it at `/exam-v2/your-exam-id`, submit both signed in and anonymous, reload the signed-in result, inspect owner review, and check analytics after a signed-in attempt. Never use legacy `/api/exams/:id` for a V2 exam; it correctly returns `409`.
