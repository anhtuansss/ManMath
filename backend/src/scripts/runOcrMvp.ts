import fs from "fs";
import path from "path";
import {
    mapOcrDraftToQuestionInput,
    type OcrSingleChoiceDraft,
    type SingleChoiceMappingContext,
} from "../ocr/adapter";
import { validateQuestionInput } from "../types/examContentValidation";
import type { ChoiceId, QuestionId } from "../types/examContent";

// 1. Định nghĩa CTDL đọc từ benchmark_results.json
export interface BenchmarkChoice {
    id: string;
    content: string;
}

export interface BenchmarkDraft {
    content: string;
    choices: BenchmarkChoice[];
}

export interface BenchmarkSample {
    id: string;
    ground_truth?: BenchmarkDraft;
    prediction: BenchmarkDraft | null;
    structure_ok?: boolean;
}

export type SampleStatus =
    | "OCR_OUTPUT_INVALID"
    | "ADAPTER_ERROR"
    | "VALIDATION_FAIL"
    | "VALIDATION_PASS";

export interface SampleResult {
    id: string;
    status: SampleStatus;
    message?: string;
}

function isValidDraft(value: unknown): value is BenchmarkDraft {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const draft = value as Record<string, unknown>;

    if (typeof draft.content !== "string") {
        return false;
    }

    if (!Array.isArray(draft.choices)) {
        return false;
    }

    return draft.choices.every((choice: unknown) => {
        if (typeof choice !== "object" || choice === null) {
            return false;
        }

        const item = choice as Record<string, unknown>;

        return (
            typeof item.id === "string" &&
            typeof item.content === "string"
        );
    });
}

// 2. Xác định đường dẫn file
const BENCHMARK_FILE_PATH = path.resolve(
    __dirname,
    "../../../llm_sandbox/src/benchmark_results.json"
);

function loadBenchmarkData(): BenchmarkSample[] {
    if (!fs.existsSync(BENCHMARK_FILE_PATH)) {
        throw new Error(
            `Không tìm thấy file kết quả benchmark tại: ${BENCHMARK_FILE_PATH}`
        );
    }
    const raw = fs.readFileSync(BENCHMARK_FILE_PATH, "utf-8");
    return JSON.parse(raw) as BenchmarkSample[];
}

async function main(): Promise<void> {
    console.log("🚀 Bắt đầu kiểm tra MVP Pipeline...");
    const samples = loadBenchmarkData();
    console.log(`📦 Đã nạp ${samples.length} mẫu từ benchmark_results.json\n`);

    const results: SampleResult[] = [];

    for (const [index, sample] of samples.entries()) {
        console.log(`--- [Sample ${sample.id}] ---`);

        if (!isValidDraft(sample.prediction)) {
            console.log(`❌ OCR_OUTPUT_INVALID: Prediction null hoặc thiếu/sai kiểu trường bắt buộc`);
            results.push({
                id: sample.id,
                status: "OCR_OUTPUT_INVALID",
                message: "Prediction null hoặc thiếu/sai kiểu trường bắt buộc",
            });
            continue;
        }

        const draft: OcrSingleChoiceDraft = {
            content: sample.prediction.content,
            choices: sample.prediction.choices.map((choice) => ({
                id: choice.id,
                content: choice.content,
            })),
        };

        // Chỉ dùng context mock cho kiểm thử adapter/validator.
        // Không coi đây là dữ liệu đủ điều kiện import thực tế.
        const context: SingleChoiceMappingContext = {
            id: `question-${sample.id}` as QuestionId,
            section: 1,
            order: index + 1,
            topicSlug: "khao-sat-ham-so",
            answerKey: {
                correctChoiceId: "a" as ChoiceId,
            },
        };

        let questionInput;

        try {
            questionInput = mapOcrDraftToQuestionInput(draft, context);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(`❌ ADAPTER_ERROR: ${message}`);
            results.push({
                id: sample.id,
                status: "ADAPTER_ERROR",
                message,
            });
            continue;
        }

        const validationResult = validateQuestionInput(questionInput);

        if (!validationResult.ok) {
            console.log(`❌ VALIDATION_FAIL: ${validationResult.message}`);
            results.push({
                id: sample.id,
                status: "VALIDATION_FAIL",
                message: validationResult.message,
            });
            continue;
        }

        console.log(`✅ VALIDATION_PASS`);
        results.push({
            id: sample.id,
            status: "VALIDATION_PASS",
        });
    }

    console.log("\n=== MVP Pipeline Summary ===");

    for (const result of results) {
        console.log(
            `${result.id}: ${result.status}` +
                (result.message ? ` — ${result.message}` : "")
        );
    }

    const count = (status: SampleStatus) =>
        results.filter((result) => result.status === status).length;

    console.log(`\nTotal: ${results.length}`);
    console.log(`OCR output invalid: ${count("OCR_OUTPUT_INVALID")}`);
    console.log(`Adapter error:      ${count("ADAPTER_ERROR")}`);
    console.log(`Validation fail:    ${count("VALIDATION_FAIL")}`);
    console.log(`Validation pass:    ${count("VALIDATION_PASS")}`);
}

main().catch((error: unknown) => {
    console.error("Lỗi thực thi script:", error);
    process.exitCode = 1;
})
