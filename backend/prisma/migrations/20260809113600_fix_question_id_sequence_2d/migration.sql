-- Keep the auto-increment sequence ahead of legacy Question IDs.
SELECT setval(
  'question_id_seq',
  COALESCE((SELECT MAX("id") FROM "Question"), 1),
  EXISTS (SELECT 1 FROM "Question")
);
