import assert from "assert";
import {
  mapOcrDraftToQuestionInput,
  type OcrSingleChoiceDraft,
  type SingleChoiceMappingContext,
} from "../ocr/adapter";

async function main(): Promise<void> {
  const draft: OcrSingleChoiceDraft = {
    content:
      "Câu 8. Cho hàm số $y=f(x)$. Hàm số nghịch biến trên khoảng nào?",
    choices: [
      { id: "a", content: "$(0;1)$" },
      { id: "b", content: "$(1;2)$" },
      { id: "c", content: "$(2;3)$" },
      { id: "d", content: "$(3;4)$" },
    ],
  };

  const context: SingleChoiceMappingContext = {
    id: "question-8" as SingleChoiceMappingContext["id"],
    section: 1,
    order: 8,
    topicSlug: "ham-so",
    answerKey: {
      correctChoiceId: "b" as SingleChoiceMappingContext["answerKey"]["correctChoiceId"],
    },
  };

  // 1. Test mapping
  const result = mapOcrDraftToQuestionInput(draft, context);

  assert.equal(result.id, context.id);
  assert.equal(result.section, 1);
  assert.equal(result.order, 8);
  assert.equal(result.content, draft.content);
  assert.equal(result.topicSlug, "ham-so");
  assert.equal(result.type, "single_choice");

  // 2. Test choices
  assert.equal(result.choices.length, 4);
  assert.equal(result.choices[0]?.id, "a");
  assert.equal(result.choices[1]?.id, "b");
  assert.equal(result.choices[2]?.id, "c");
  assert.equal(result.choices[3]?.id, "d");

  assert.equal(result.choices[0]?.content, "$(0;1)$");
  assert.equal(result.choices[1]?.content, "$(1;2)$");

  // 3. Test answer mapping
  assert.equal(result.answerKey.correctChoiceId, "b");

  // 4. Adapter không được modify OCR content
  assert.equal(result.content, draft.content);

  // 5. Adapter không được chấp nhận single_choice thiếu/dư choices
  const invalidDraft = {
    ...draft,
    choices: draft.choices.slice(0, 3),
  };

  assert.throws(
    () => mapOcrDraftToQuestionInput(invalidDraft, context),
    /single_choice must have exactly 4 choices/,
  );

  console.log("OCR adapter verification passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});