import type {
  ChoiceId,
  QuestionId,
  QuestionSection,
  SingleChoiceQuestionInput,
} from "../types/examContent";

export type OcrChoiceDraft = {
  id: string;
  content: string;
};

export type OcrSingleChoiceDraft = {
  content: string;
  choices: OcrChoiceDraft[];
};

export type SingleChoiceMappingContext = {
  id: QuestionId;
  section: QuestionSection;
  order: number;
  topicSlug: string;
  answerKey: {
    correctChoiceId: ChoiceId;
  };
};

function toChoiceId(id: string): ChoiceId {
  return id as ChoiceId;
}

export function mapOcrDraftToQuestionInput(
  draft: OcrSingleChoiceDraft,
  context: SingleChoiceMappingContext,
): SingleChoiceQuestionInput {
  if (draft.choices.length !== 4) {
    throw new Error(
      `single_choice must have exactly 4 choices, got ${draft.choices.length}`,
    );
  }

  const [a, b, c, d] = draft.choices;

  if (!a || !b || !c || !d) {
    throw new Error("single_choice choices are incomplete");
  }

  return {
    id: context.id,
    section: context.section,
    order: context.order,
    content: draft.content,
    topicSlug: context.topicSlug,
    type: "single_choice",

    choices: [
      {
        id: toChoiceId(a.id),
        content: a.content,
      },
      {
        id: toChoiceId(b.id),
        content: b.content,
      },
      {
        id: toChoiceId(c.id),
        content: c.content,
      },
      {
        id: toChoiceId(d.id),
        content: d.content,
      },
    ],

    answerKey: context.answerKey,
  };
}