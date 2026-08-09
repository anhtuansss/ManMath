import assert from 'node:assert/strict';

import {
  validateQuestionInput,
  validateSubmittedResponse,
} from '../types/examContentValidation';
import type { ValidationResult } from '../types/examContentValidation';
import { gradeQuestion } from '../services/examGrading';

function assertRejected(
    result: ValidationResult<unknown>,
    expectedMessage: RegExp,
): void {
    assert.equal(result.ok, false);

    if (result.ok) {
        throw new Error('Expected validation to fail');
    }

    assert.match(result.message, expectedMessage);
}

const rawQuestion = {
    id: 'tf-1',
    section: 2,
    order: 1,
    content: 'Kiểm tra true/false',
    topicSlug: 'algebra',
    type: 'true_false_group',
    statements: [
        {
            id: 's1',
            content: 'A'
        },
        {
            id: 's2',
            content: 'B'
        },
        {
            id: 's3',
            content: 'C'
        },
        {
            id: 's4',
            content: 'D'
        },
    ],
    answerKey: {
        values: {
          s1: true,
          s2: false,
          s3: true,
          s4: false,  
        },
    },
};

const invalidTrueFalseQuestion = {
    ...rawQuestion,
    statements: rawQuestion.statements.slice(0, 3),
};

const invalidTrueFalseResult = validateQuestionInput(
    invalidTrueFalseQuestion,
);

assert.equal(invalidTrueFalseResult.ok, false);

if (invalidTrueFalseResult.ok) {
    throw new Error(
        'Expected a true/false question with 3 statements to be rejected',
    );
}

assert.match(
    invalidTrueFalseResult.message,
    /exactly 4 items/,
);

const cases_tf = [
    {
        rawResponse: {
            questionId: 'tf-1',
            type: 'true_false_group',
            values: {
                s1: false,
                s2: true,
                s3: false,
                s4: true,
            },
        },
        expectedScore: 0,
        expectedIsCorrect: false,
    },
    {
        rawResponse: {
            questionId: 'tf-1',
            type: 'true_false_group',
            values: {
                s1: true,
                s2: true,
                s3: false,
                s4: true,
            },
        },
        expectedScore: 10,
        expectedIsCorrect: false,
    },    
    {
        rawResponse: {
            questionId: 'tf-1',
            type: 'true_false_group',
            values: {
                s1: true,
                s2: false,
                s3: false,
                s4: true,
            },
        },
        expectedScore: 25,
        expectedIsCorrect: false,
    },    
    {
        rawResponse: {
            questionId: 'tf-1',
            type: 'true_false_group',
            values: {
                s1: true,
                s2: false,
                s3: true,
                s4: true,
            },
        },
        expectedScore: 50,
        expectedIsCorrect: false,
    },    
    {
        rawResponse: {
            questionId: 'tf-1',
            type: 'true_false_group',
            values: {
                s1: true,
                s2: false,
                s3: true,
                s4: false,
            },
        },
        expectedScore: 100,
        expectedIsCorrect: true,
    },
]

const questionResult = validateQuestionInput(rawQuestion);

if (!questionResult.ok) {
    throw new Error(questionResult.message);
}

const question = questionResult.value;

for (const [index, testCase] of cases_tf.entries()) {
    const responseResult = validateSubmittedResponse(
        testCase.rawResponse,
        question,
    );

    if (!responseResult.ok) {
        throw new Error(responseResult.message);
    }

    const gradingResult = gradeQuestion(
        question,
        responseResult.value,
    );

    assert.equal(
        gradingResult.awardedScore,
        testCase.expectedScore,
        `Case ${index}: unexpected score`,
    );

    assert.equal(
        gradingResult.isCorrect,
        testCase.expectedIsCorrect,
        `Case ${index}: unexpected correctness`,
    );
}

console.log('True/false grading verification passed');

const rawSingleChoiceQuestion = {
    id: 'single-1',
    section: 1,
    order: 1,
    content: 'Chọn đáp án đúng',
    topicSlug: 'algebra',
    type: 'single_choice',
    choices: [
        {
            id: 'c1',
            content: 'A',
        },
        { 
            id: 'c2', 
            content: 'B' 
        },
        { 
            id: 'c3', 
            content: 'C' 
        },
        { 
            id: 'c4', 
            content: 'D' 
        },
    ],
    answerKey: {
        correctChoiceId: 'c2',
    },
};

const duplicateChoiceIdQuestion = {
    ...rawSingleChoiceQuestion,
    choices: [
        rawSingleChoiceQuestion.choices[0],
        rawSingleChoiceQuestion.choices[1],
        rawSingleChoiceQuestion.choices[2],
        {
            ...rawSingleChoiceQuestion.choices[3],
            id: 'c3',
        },
    ],
};

const duplicateChoiceIdResult = validateQuestionInput(
    duplicateChoiceIdQuestion,
);

assert.equal(duplicateChoiceIdResult.ok, false);

if (duplicateChoiceIdResult.ok) {
    throw new Error('Expected duplicate choice IDs to be rejected');
}

assert.match(
    duplicateChoiceIdResult.message,
    /Choice IDs must be unique/,
);

const cases_sc = [
    {
        rawResponse: {
            questionId: 'single-1',
            type: 'single_choice',
            choiceId: 'c1',
        },
        expectedScore: 0,
        expectedIsCorrect: false,
    },
        {
        rawResponse: {
            questionId: 'single-1',
            type: 'single_choice',
            choiceId: 'c2',
        },
        expectedScore: 25,
        expectedIsCorrect: true,
    },
        {
        rawResponse: {
            questionId: 'single-1',
            type: 'single_choice',
            choiceId: 'c3',
        },
        expectedScore: 0,
        expectedIsCorrect: false,
    },
        {
        rawResponse: {
            questionId: 'single-1',
            type: 'single_choice',
            choiceId: 'c4',
        },
        expectedScore: 0,
        expectedIsCorrect: false,
    },
];

const singleChoiceResult = validateQuestionInput(rawSingleChoiceQuestion);

if (!singleChoiceResult.ok) {
    throw new Error(singleChoiceResult.message);
}

const singleChoiceQuestion = singleChoiceResult.value;

for (const [index, testCase] of cases_sc.entries()) {
    const responseResult = validateSubmittedResponse(
        testCase.rawResponse,
        singleChoiceQuestion,
    );

    if (!responseResult.ok) {
        throw new Error(responseResult.message);
    }

    const gradingResult = gradeQuestion(
        singleChoiceQuestion,
        responseResult.value,
    );

    assert.equal(
        gradingResult.awardedScore,
        testCase.expectedScore,
        `Single choice case ${index}: unexpected score`,
    );
    assert.equal(
        gradingResult.isCorrect,
        testCase.expectedIsCorrect,
        `Single choice case ${index}: unexpected correctness`,
    );
}

const unansweredSingleChoiceGrade = gradeQuestion(
    singleChoiceQuestion,
    undefined,
);

assert.equal(unansweredSingleChoiceGrade.awardedScore, 0);
assert.equal(unansweredSingleChoiceGrade.isCorrect, false);
assert.equal(unansweredSingleChoiceGrade.response, undefined);

console.log('Single choice grading verification passed');

const rawExactQuestion = {
    id: 'short-exact-1',
    section: 3,
    order: 1,
    content: 'Nhập đáp án',
    topicSlug: 'algebra',
    type: 'short_answer',
    answerKey: {
        mode: 'exact',
        answer: '1,5',
    },
};

const exactQuestionResult = validateQuestionInput(rawExactQuestion);

if (!exactQuestionResult.ok) {
    throw new Error(exactQuestionResult.message);
}

const exactQuestion = exactQuestionResult.value;

const exactCorrectResponseResult = validateSubmittedResponse(
    {
        questionId: 'short-exact-1',
        type: 'short_answer',
        value: '1,5',
    },
    exactQuestion,
);

if (!exactCorrectResponseResult.ok) {
    throw new Error(exactCorrectResponseResult.message);
}

const exactCorrectGrade = gradeQuestion(
    exactQuestion,
    exactCorrectResponseResult.value,
);

assert.equal(exactCorrectGrade.awardedScore, 50);
assert.equal(exactCorrectGrade.isCorrect, true);

const exactIncorrectResponseResult = validateSubmittedResponse(
    {
        questionId: 'short-exact-1',
        type: 'short_answer',
        value: '1,50',
    },
    exactQuestion,
);

if (!exactIncorrectResponseResult.ok) {
    throw new Error(exactIncorrectResponseResult.message);
}

const exactIncorrectGrade = gradeQuestion(
    exactQuestion,
    exactIncorrectResponseResult.value,
);

assert.equal(exactIncorrectGrade.awardedScore, 0);
assert.equal(exactIncorrectGrade.isCorrect, false);

const rawNumericQuestion = {
    id: 'short-numeric-1',
    section: 3,
    order: 2,
    content: 'Numeric answer',
    topicSlug: 'algebra',
    type: 'short_answer',
    answerKey: {
        mode: 'numeric',
        answer: '1,5',
    },
};

const numericQuestionResult = validateQuestionInput(rawNumericQuestion);

if (!numericQuestionResult.ok) {
    throw new Error(numericQuestionResult.message);
}

const numericResponseResult = validateSubmittedResponse(
    {
        questionId: 'short-numeric-1',
        type: 'short_answer',
        value: '1,50',
    },
    numericQuestionResult.value,
);

if (!numericResponseResult.ok) {
    throw new Error(numericResponseResult.message);
}

const numericGrade = gradeQuestion(
    numericQuestionResult.value,
    numericResponseResult.value,
);

assert.equal(numericGrade.awardedScore, 50);
assert.equal(numericGrade.isCorrect, true);

const rawToleranceQuestion = {
    id: 'short-tolerance-1',
    section: 3,
    order: 3,
    content: 'Tolerance answer',
    topicSlug: 'algebra',
    type: 'short_answer',
    answerKey: {
        mode: 'numeric_with_tolerance',
        answer: '1,5',
        tolerance: '0,05',
    },
};

const toleranceQuestionResult = validateQuestionInput(rawToleranceQuestion);

if (!toleranceQuestionResult.ok) {
    throw new Error(toleranceQuestionResult.message);
}

const toleranceBoundaryResponseResult = validateSubmittedResponse(
    {
        questionId: 'short-tolerance-1',
        type: 'short_answer',
        value: '1,55',
    },
    toleranceQuestionResult.value,
);

if (!toleranceBoundaryResponseResult.ok) {
    throw new Error(toleranceBoundaryResponseResult.message);
}

const toleranceBoundaryGrade = gradeQuestion(
    toleranceQuestionResult.value,
    toleranceBoundaryResponseResult.value,
);

assert.equal(toleranceBoundaryGrade.awardedScore, 50);
assert.equal(toleranceBoundaryGrade.isCorrect, true);

const toleranceOutsideResponseResult = validateSubmittedResponse(
    {
        questionId: 'short-tolerance-1',
        type: 'short_answer',
        value: '1,56',
    },
    toleranceQuestionResult.value,
);

if (!toleranceOutsideResponseResult.ok) {
    throw new Error(toleranceOutsideResponseResult.message);
}

const toleranceOutsideGrade = gradeQuestion(
    toleranceQuestionResult.value,
    toleranceOutsideResponseResult.value,
);

assert.equal(toleranceOutsideGrade.awardedScore, 0);
assert.equal(toleranceOutsideGrade.isCorrect, false);

const tooManyStatementsQuestion = {
    ...rawQuestion,
    statements: [
        ...rawQuestion.statements,
        { id: 's5', content: 'E' },
    ],
};

assertRejected(
    validateQuestionInput(tooManyStatementsQuestion),
    /exactly 4 items/,
);

const duplicateStatementIdQuestion = {
    ...rawQuestion,
    statements: [
        rawQuestion.statements[0],
        rawQuestion.statements[1],
        rawQuestion.statements[2],
        { ...rawQuestion.statements[3], id: 's3' },
    ],
};

assertRejected(
    validateQuestionInput(duplicateStatementIdQuestion),
    /Statement IDs must be unique/,
);

const invalidCorrectChoiceQuestion = {
    ...rawSingleChoiceQuestion,
    answerKey: {
        correctChoiceId: 'missing-choice',
    },
};

assertRejected(
    validateQuestionInput(invalidCorrectChoiceQuestion),
    /Correct choice ID must belong/,
);

assertRejected(
    validateSubmittedResponse(
        {
            questionId: 'another-question',
            type: 'single_choice',
            choiceId: 'c1',
        },
        singleChoiceQuestion,
    ),
    /does not belong to this question/,
);

assertRejected(
    validateSubmittedResponse(
        {
            questionId: 'single-1',
            type: 'short_answer',
            value: '1',
        },
        singleChoiceQuestion,
    ),
    /Response type must be "single_choice"/,
);

assertRejected(
    validateSubmittedResponse(
        {
            questionId: 'tf-1',
            type: 'true_false_group',
            values: {
                s1: true,
                s2: false,
                s3: true,
            },
        },
        question,
    ),
    /exactly 4 statements/,
);

for (const [rawValue, expectedMessage] of [
    ['12345', /Maximum length is 4/],
    ['1.5', /Invalid numeric format/],
    ['1, 5', /Whitespace is not allowed/],
] as const) {
    assertRejected(
        validateSubmittedResponse(
            {
                questionId: 'short-exact-1',
                type: 'short_answer',
                value: rawValue,
            },
            exactQuestion,
        ),
        expectedMessage,
    );
}

const negativeToleranceQuestion = {
    ...rawToleranceQuestion,
    answerKey: {
        ...rawToleranceQuestion.answerKey,
        tolerance: '-0,05',
    },
};

assertRejected(
    validateQuestionInput(negativeToleranceQuestion),
    /Tolerance cannot be negative/,
);

console.log('Short answer grading verification passed');
console.log('Domain validation rejection verification passed');
