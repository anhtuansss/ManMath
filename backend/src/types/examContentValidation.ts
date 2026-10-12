import type {
    CanonicalShortAnswer,
    CanonicalTolerance,
    ChoiceId, 
    NormalizedShortAnswerResponse, 
    QuestionId, 
    SingleChoiceQuestionInput, 
    StatementId, 
    QuestionInput, 
    SharedQuestionFields, 
    QuestionAssetInput, 
    ChoiceInput, 
    SingleChoiceAnswerKey, 
    TrueFalseStatementInput,
    TrueFalseAnswerKey,
    TrueFalseGroupQuestionInput,
    ShortAnswerAnswerKey,
    ShortAnswerQuestionInput,
    PublicQuestion,
    SubmittedResponse,
} from './examContent';

export type ValidationResult<T> =
    | {
        readonly ok: true;
        readonly value: T;
    }
    | {
        readonly ok: false;
        readonly message: string;
    };

export function parseQuestionId(
    value: unknown
): ValidationResult<QuestionId> {
    if (typeof value === 'string' && value.trim().length > 0) {
        return { 
            ok: true, 
            value: value as QuestionId 
        };
    }
    else if (typeof value === 'string') {
        return { 
            ok: false,
            message: 'Question ID cannot be an empty string'
        };
    }
    else {
        return { 
            ok: false, 
            message: 'Invalid question ID' 
        };
    }
}

export function parseChoiceId(
    value: unknown,
): ValidationResult<ChoiceId> {
    if (typeof value === 'string' && value.trim().length > 0) {
        return {
            ok: true,
            value: value as ChoiceId
        };
    }
    else {
        return {
            ok: false,
            message: 'Choice ID cannot be an empty string or non-string value'
        };
    }
}

export function parseStatementId(
    value: unknown,
): ValidationResult<StatementId> { 
    if (typeof value === 'string' && value.trim().length > 0) {
        return {
            ok: true,
            value: value as StatementId
        };
    }
    else {
        return {
            ok: false,
            message: 'Statement ID cannot be an empty string or non-string value'
        };
    }   
}

export function isRecord (
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === 'object' 
        && value !== null 
        && !Array.isArray(value);
}

export function validateQuestionInput(
  value: unknown,
): ValidationResult<QuestionInput> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'Question input must be an object',
        };
    }
    if (value.type === 'single_choice') {
        return validateSingleChoiceQuestion(value);
    }
    if (value.type === 'true_false_group') {
        return validateTrueFalseGroupQuestion(value);
    }
    if (value.type === 'short_answer') {
        return validateShortAnswerQuestion(value);
    }
    return {
        ok: false,
        message: 'Unsupported question type',
    }
}

export function validateSharedQuestionFields(
    value: Record<string, unknown>,
): ValidationResult<SharedQuestionFields> {
    const idResult = parseQuestionId(value.id);

    if (!idResult.ok) {
        return idResult;
    }

    if (value.section !== 1 && value.section !== 2 && value.section !== 3) {
        return {
            ok: false,
            message: 'Section must be 1, 2, or 3',
        };
    }

    if (
        typeof value.order !== 'number' ||
        !Number.isInteger(value.order) ||
        value.order < 0
    ) {
        return {
            ok: false,
            message: 'Order must be a non-negative integer',
        };
    }
    
    if (
        typeof value.content !== 'string' || 
        value.content.trim().length === 0
    ) {
        return {
            ok: false,
            message: 'Content must be a non-empty string',
        };
    }

    if (
        typeof value.topicSlug !== 'string' ||
        value.topicSlug.trim().length === 0
    ) {
        return {
            ok: false,
            message: 'Topic slug must be a non-empty string',
        };
    }

    let subtopicSlug: string | undefined;

    if ('subtopicSlug' in value) {
        if (
            typeof value.subtopicSlug !== 'string' ||
            value.subtopicSlug.trim().length === 0
        ) {
            return {
                ok: false,
                message: 'Subtopic slug must be a non-empty string if provided',
            };
        }

        subtopicSlug = value.subtopicSlug;
    }

    let assets: readonly QuestionAssetInput[] | undefined;

    if ('assets' in value) {
        const assetsResult = validateQuestionAssets(value.assets);

        if (!assetsResult.ok) {
            return assetsResult;
        }

        assets = assetsResult.value;
    }

    return {
        ok: true,
        value: {    
            id: idResult.value,
            section: value.section,
            order: value.order,
            content: value.content,
            topicSlug: value.topicSlug,
            ...(subtopicSlug !== undefined? { subtopicSlug } : {}),
            ...(assets !== undefined ? { assets } : {}),
        },
    };
}

export function validateQuestionAssetInput(
    value: unknown,
): ValidationResult<QuestionAssetInput> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'Value must be an object',
        };
    }
    if (typeof value.src !== 'string' || value.src.trim().length === 0) {
        return {
            ok: false,
            message: 'Asset src must be a non-empty string',
        };
    }
    if (typeof value.alt !== 'string') {
        return {
            ok: false,
            message: 'Asset alt must be a string',
        };
    }

    return {
        ok: true,
        value: {
            src: value.src,
            alt: value.alt,
        },
    };
}

export function validateQuestionAssets(
    value: unknown,
): ValidationResult<readonly QuestionAssetInput[]> {
    if (!Array.isArray(value)) {
        return {
            ok: false,
            message: 'Assets must be an array',
        };
    }
    const assets: QuestionAssetInput[] = [];
    for (const item of value) {
        const result = validateQuestionAssetInput(item);
        if (!result.ok) {
            return result;
        }
        assets.push(result.value);
    }
    return {
        ok: true,
        value: assets,
    };
}
    
export function validateChoiceInput(
    value: unknown,
): ValidationResult<ChoiceInput> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'Choice input must be an object',
        };
    }
    const idResult = parseChoiceId(value.id);
    if (!idResult.ok) {
        return idResult;
    }

    if (
        typeof value.content !== 'string' ||
        value.content.trim().length === 0
    ) {
        return {
            ok: false,
            message: 'Choice content must be a non-empty string',
        };
    }

    let assets: readonly QuestionAssetInput[] | undefined;

    if ('assets' in value) {
        const assetsResult = validateQuestionAssets(value.assets);
        if (!assetsResult.ok) {
            return assetsResult;
        }
        assets = assetsResult.value;
    }

    return {
        ok: true,
        value: {
            id: idResult.value,
            content: value.content,
            ...(assets !== undefined ? { assets } : {}),
        },
    };
}

export function validateSingleChoiceChoices(
  value: unknown,
): ValidationResult<
  readonly [
    ChoiceInput,
    ChoiceInput,
    ChoiceInput,
    ChoiceInput,
  ]
> {
    if (!Array.isArray(value) || value.length !== 4) {
        return {
            ok: false,
            message: 'Choices must be an array of exactly 4 items',
        };
    }
    const [choice1, choice2, choice3, choice4] = value;
    const result1 = validateChoiceInput(choice1);
    if (!result1.ok) {
        return result1;
    }
    const result2 = validateChoiceInput(choice2);
    if (!result2.ok) {
        return result2;
    }
    const result3 = validateChoiceInput(choice3);
    if (!result3.ok) {
        return result3;
    }
    const result4 = validateChoiceInput(choice4);
    if (!result4.ok) {
        return result4;
    }
    const choiceIds = [
            result1.value.id,
            result2.value.id,
            result3.value.id,
            result4.value.id,
        ];

        if (new Set(choiceIds).size !== 4) {
        return {
            ok: false,
            message: 'Choice IDs must be unique',
        };
    }
    return {
        ok: true,
        value: [
            result1.value,
            result2.value,
            result3.value,
            result4.value,
        ],
    };
}

export function validateSingleChoiceQuestion(
    value: unknown,
): ValidationResult<SingleChoiceQuestionInput> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'Single choice question input must be an object',
        };
    }
    if (value.type !== 'single_choice') {
        return {
            ok: false,
            message: 'Question type must be "single_choice"',
        };
    }

    if ('statements' in value) {
        return {
            ok: false,
            message: 'Single choice questions cannot contain statements',
        };
    }
    const sharedFieldsResult = validateSharedQuestionFields(value);
    if (!sharedFieldsResult.ok) {
        return sharedFieldsResult;
    }

    const choicesResult = validateSingleChoiceChoices(value.choices);
    if (!choicesResult.ok) {
        return choicesResult;
    }

    const answerKeyResult = validateSingleChoiceAnswerKey(
        value.answerKey,
        choicesResult.value,
    );

    if (!answerKeyResult.ok) {
        return answerKeyResult;
    }
    return {
        ok: true,
        value: {
            ...sharedFieldsResult.value,
            type: 'single_choice',
            choices: choicesResult.value,
            answerKey: answerKeyResult.value,
        },
    };
}

export function validateSingleChoiceAnswerKey (
    value: unknown,
    choices: readonly [
        ChoiceInput,
        ChoiceInput,
        ChoiceInput,
        ChoiceInput,
    ],
): ValidationResult<SingleChoiceAnswerKey> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'Answer key must be an object',
        };
    }
    const correctChoiceIdResult = parseChoiceId(value.correctChoiceId);
    if (!correctChoiceIdResult.ok) {
        return correctChoiceIdResult;
    }

    const correctChoiceId = correctChoiceIdResult.value;

    const belongsToChoices = choices.some(
        (choice) => choice.id === correctChoiceId,
    );

    if (!belongsToChoices) {
        return {
            ok: false,
            message: 'Correct choice ID must belong to one of the choices',
        };
    }   

    return {
        ok: true,
        value: {    
            correctChoiceId,
        },
    };
}

export function validateTrueFalseStatementInput(
  value: unknown,
): ValidationResult<TrueFalseStatementInput> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'True/False statement input must be an object',
        };
    }

    const idResult = parseStatementId(value.id);

    if (!idResult.ok) {
        return idResult;
    }

    if (typeof value.content !== 'string' || value.content.trim().length === 0) {
        return {
            ok: false,
            message: 'Statement content must be a non-empty string',
        };
    }

    return {
        ok: true,
        value: {
            id: idResult.value,
            content: value.content,
        },
    };
}

export function validateTrueFalseStatements (
    value: unknown,
): ValidationResult<
    readonly [
        TrueFalseStatementInput,
        TrueFalseStatementInput,
        TrueFalseStatementInput,
        TrueFalseStatementInput,
    ]
> {
    if (!Array.isArray(value) || value.length !== 4) {
        return {
            ok: false,
            message: 'True/False statements must be an array of exactly 4 items',
        };
    }
    const statement1 = validateTrueFalseStatementInput(value[0]);
    if (!statement1.ok) {
        return statement1;
    }
    const statement2 = validateTrueFalseStatementInput(value[1]);
    if (!statement2.ok) {
        return statement2;
    }
    const statement3 = validateTrueFalseStatementInput(value[2]);
    if (!statement3.ok) {
        return statement3;
    }
    const statement4 = validateTrueFalseStatementInput(value[3]);
    if (!statement4.ok) {
        return statement4;
    }
    const statementIds = [
        statement1.value.id,
        statement2.value.id,
        statement3.value.id,
        statement4.value.id,
    ];

    if (new Set(statementIds).size !== 4) {
        return {
            ok: false,
            message: 'Statement IDs must be unique',
        };
    }
    return {
        ok: true,
        value: [statement1.value, statement2.value, statement3.value, statement4.value],
    };
}

export function validateTrueFalseAnswerKey(
  value: unknown,
  statements: readonly [
    TrueFalseStatementInput,
    TrueFalseStatementInput,
    TrueFalseStatementInput,
    TrueFalseStatementInput,
  ],
): ValidationResult<TrueFalseAnswerKey> {
    if (!isRecord(value)) {
        return { 
            ok: false,
            message: 'True/False answer key must be an object',
        };
    }

    const statementIds = statements.map (
        (statement) => statement.id,
    );

    const actualKeys = Object.keys(value);

    if (actualKeys.length !== 4) {
        return {
            ok: false,
            message: 'Answer key must contain exactly 4 statement IDs',
        };
    }

    const values = {} as Record<StatementId, boolean>;

    for (const statementId of statementIds) {
        if (!Object.prototype.hasOwnProperty.call(value, statementId)) {
            return {
                ok: false,
                message: `Missing answer for statement: ${statementId}`,
            };
        }

        const rawValue = value[statementId];

        if (typeof rawValue !== 'boolean') {
            return {
                ok: false,
                message: `Answer for statement ${statementId} must be boolean`,
            };
        }

        values[statementId] = rawValue;
    }

    return {
        ok: true,
        value: { values },
    };
}   

export function validateTrueFalseGroupQuestion(
  value: unknown,
): ValidationResult<TrueFalseGroupQuestionInput> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'True/False question must be an object',
        };
    }

    if (value.type !== 'true_false_group') {
        return {
            ok: false,
            message: 'True/False question type must be "true_false_group"',
        };
    }

    if ('choices' in value) {
        return {
            ok: false,
            message: 'True/False questions cannot contain choices',
        };
    }

    const sharedFieldsResult = validateSharedQuestionFields(value);
    if (!sharedFieldsResult.ok) {
        return sharedFieldsResult;
    }

    const statementResult = validateTrueFalseStatements(value.statements);
    if (!statementResult.ok) {
        return statementResult;
    }

    if (!isRecord(value.answerKey)) {
        return {
            ok: false,
            message: 'Answer key must be an object',
        };
    }
    const answerKeyResult = validateTrueFalseAnswerKey(
        value.answerKey.values,
        statementResult.value,
    );

    if (!answerKeyResult.ok) {
        return answerKeyResult;
    }

    return {
        ok: true,
        value: {
            ...sharedFieldsResult.value,
            type: 'true_false_group',
            statements: statementResult.value,
            answerKey: answerKeyResult.value,
        },
    };
}

export function normalizeShortAnswerText(
    value: unknown,
    maxLength?: number,
): ValidationResult<string> {
    if (typeof value !== 'string') {
        return { ok: false, message: 'Short answer must be a string' };
    }

    if (maxLength !== undefined && value.length > maxLength) {
        return { ok: false, message: `Maximum length is ${maxLength}` };
    }

    if (/\s/.test(value)) {
        return { ok: false, message: 'Whitespace is not allowed' };
    }

    const match = /^(-?)(\d+)(,\d+)?$/.exec(value);

    if (!match) {
        return { ok: false, message: 'Invalid numeric format' };
    }

    const [, sign, integerPart, decimalPart = ''] = match;
    const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, '');

    return {
        ok: true,
        value: sign + normalizedIntegerPart + decimalPart,
    };
}

export function normalizeShortAnswerResponse(
    value: unknown,
): ValidationResult<NormalizedShortAnswerResponse> {
    const result = normalizeShortAnswerText(value, 4);

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value: result.value as NormalizedShortAnswerResponse,
    };
}

function parseCanonicalShortAnswer(
  value: unknown,
): ValidationResult<CanonicalShortAnswer> {
    const result = normalizeShortAnswerText(value, 4);

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value: result.value as CanonicalShortAnswer,
    };
}

function parseCanonicalTolerance(
    value: unknown,
): ValidationResult<CanonicalTolerance> {
    const result = normalizeShortAnswerText(value);

    if (!result.ok) {
        return result;
    }

    if (result.value.startsWith('-')) {
        return {
        ok: false,
        message: 'Tolerance cannot be negative',
        };
    }

    return {
        ok: true,
        value: result.value as CanonicalTolerance,
    };
}

export function validateShortAnswerAnswerKey(
  value: unknown,
): ValidationResult<ShortAnswerAnswerKey> {
    if (!isRecord(value)) {
        return { ok: false, message: 'Answer key must be an object' };
    }

    const answerResult = parseCanonicalShortAnswer(value.answer);

    if (!answerResult.ok) {
        return answerResult;
    }

    if (value.mode === 'exact' || value.mode === 'numeric') {
        if ('tolerance' in value) {
            return {
                ok: false,
                message: 'Tolerance is only allowed for numeric_with_tolerance',
            };
        }

        return {
        ok: true,
        value: {
            mode: value.mode,
            answer: answerResult.value,
        },
        };
    }

    if (value.mode === 'numeric_with_tolerance') {
        const toleranceResult = parseCanonicalTolerance(value.tolerance);

        if (!toleranceResult.ok) {
            return toleranceResult;
        }

        return {
            ok: true,
            value: {
                mode: value.mode,
                answer: answerResult.value,
                tolerance: toleranceResult.value,
            },
        };
    }

    return {
        ok: false,
        message: 'Invalid short answer mode',
    };
}

export function validateShortAnswerQuestion(
    value: unknown,
): ValidationResult<ShortAnswerQuestionInput> {
    if (!isRecord(value)) {
        return {
            ok: false,
            message: 'Short answer question must be an object',
        };
    }

    if (value.type !== 'short_answer') {
        return {
            ok: false,
            message: 'Question type must be "short_answer"',
        };
    }

    if ('choices' in value || 'statements' in value) {
        return {
            ok: false,
            message: 'Short answer questions cannot contain choices or statements',
        };
    }

    const sharedResult = validateSharedQuestionFields(value);

    if (!sharedResult.ok) {
        return sharedResult;
    }

    const answerKeyResult = validateShortAnswerAnswerKey(
        value.answerKey,
    );

    if (!answerKeyResult.ok) {
        return answerKeyResult;
    }

    return {
        ok: true,
        value: {
            ...sharedResult.value,
            type: 'short_answer',
            answerKey: answerKeyResult.value,
        },
    };
}

export function validateSubmittedResponse(
  value: unknown,
  question: PublicQuestion,
): ValidationResult<SubmittedResponse> {
    if (!isRecord(value)) {
        return {
            ok:false,
            message: 'Submitted response must be an object',
        };
    }

    const questionIdResult = parseQuestionId(value.questionId);

    if (!questionIdResult.ok) {
        return questionIdResult;
    }

    if (questionIdResult.value !== question.id) {
        return {
            ok: false,
            message: 'Submitted response does not belong to this question',
        };
    } 

    switch (question.type) {
        case 'single_choice': {
            if (value.type !== 'single_choice') {
                return {
                    ok: false,
                    message: 'Response type must be "single_choice"',
                };
            }
            const choiceIdResult = parseChoiceId(value.choiceId);

            if (!choiceIdResult.ok) {
                return choiceIdResult;
            }
            
            const belongsToQuestion = question.choices.some(
                (choice) => choice.id === choiceIdResult.value,
            );

            if (!belongsToQuestion) {
                return {
                ok: false,
                message: 'Choice ID does not belong to this question',
                };
            }
            
            return {
                ok: true,
                value: {
                    type: 'single_choice',
                    choiceId: choiceIdResult.value,
                },
            };
        }

        case 'true_false_group': {
            if (value.type !== 'true_false_group') {
                return {
                    ok: false,
                    message: 'Response type must be "true_false_group"',
                };
            }

            if (!isRecord(value.values)) {
                return {
                    ok: false,
                    message: 'True/false response values must be an object',
                };
            }

            if (Object.keys(value.values).length !== 4) {
                return {
                    ok: false,
                    message: 'True/false response must contain exactly 4 statements',
                };
            }

            const values = {} as Record<StatementId, boolean>;

            for (const statement of question.statements) {
                if (!Object.prototype.hasOwnProperty.call(value.values, statement.id)) {
                    return {
                        ok: false,
                        message: `Missing response for statement: ${statement.id}`,
                    };
                }

                const rawValue = value.values[statement.id];

                if (typeof rawValue !== 'boolean') {
                    return {
                        ok: false,
                        message: `Response for statement ${statement.id} must be boolean`,
                    };  
                }

                values[statement.id] = rawValue;
            }

            return {
                ok: true,
                value: {
                    type: 'true_false_group',
                    values,
                },
            };
        }

        case 'short_answer': {
            if (value.type !== 'short_answer') {
                return {
                    ok: false,
                    message: 'Response type must be "short_answer"',
                };
            }

            const responseResult = normalizeShortAnswerResponse(value.value);

            if (!responseResult.ok) {
                return responseResult;
            }

            return {
                ok: true,
                value: {
                    type: 'short_answer',
                    response: responseResult.value,
                },
            };
        }

        default:
            return {
                ok: false,
                message: 'Unsupported public question type',
            };
    }
}
