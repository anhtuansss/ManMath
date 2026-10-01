import json
import os
import re

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_FILE = os.path.join(CURRENT_DIR, "benchmark_results.json")
OUTPUT_FILE = os.path.join(CURRENT_DIR, "evaluation_results.json")


def load_results():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def normalize_text(text):
    if not isinstance(text, str):
        return text

    # 1. Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # 2. Normalize whitespace inside LaTeX
    def normalize_latex(match):
        formula = match.group(1)

        formula = re.sub(
            r"\s*([=+\-*/])\s*",
            r"\1",
            formula
        )

        return f"${formula}$"

    text = re.sub(
        r"\$(.*?)\$",
        normalize_latex,
        text
    )

    # 3. Remove punctuation immediately after math expression
    text = re.sub(r"\$\.", "$", text)

    return text

def validate_structure(prediction):
    """
    Check whether prediction follows the expected single_choice structure.
    """

    if not isinstance(prediction, dict):
        return False

    if "content" not in prediction:
        return False

    if "choices" not in prediction:
        return False

    if not isinstance(prediction["content"], str):
        return False

    if not isinstance(prediction["choices"], list):
        return False

    for choice in prediction["choices"]:
        if not isinstance(choice, dict):
            return False

        if "id" not in choice or "content" not in choice:
            return False

        if not isinstance(choice["id"], str):
            return False

        if not isinstance(choice["content"], str):
            return False

    return True

def compare_content(ground_truth, prediction):
    """
    Compare question content after normalization.
    """

    gt_content = normalize_text(ground_truth.get("content", ""))
    pred_content = normalize_text(prediction.get("content", ""))

    return gt_content == pred_content


def compare_choices(ground_truth, prediction):
    """
    Compare choices by choice ID, not array order.

    Returns:
        {
            "passed": bool,
            "errors": [...]
        }
    """

    gt_choices = {
        choice["id"]: choice["content"]
        for choice in ground_truth.get("choices", [])
    }

    pred_choices = {
        choice["id"]: choice["content"]
        for choice in prediction.get("choices", [])
    }

    errors = []

    # Missing / extra choice IDs
    gt_ids = set(gt_choices.keys())
    pred_ids = set(pred_choices.keys())

    missing_ids = gt_ids - pred_ids
    extra_ids = pred_ids - gt_ids

    for choice_id in sorted(missing_ids):
        errors.append({
            "type": "CHOICE",
            "choice_id": choice_id,
            "problem": "missing"
        })

    for choice_id in sorted(extra_ids):
        errors.append({
            "type": "CHOICE",
            "choice_id": choice_id,
            "problem": "extra"
        })

    # Compare content
    for choice_id in sorted(gt_ids & pred_ids):
        gt_content = normalize_text(gt_choices[choice_id])
        pred_content = normalize_text(pred_choices[choice_id])

        if gt_content != pred_content:
            errors.append({
                "type": "CHOICE",
                "choice_id": choice_id,
                "problem": "content_mismatch"
            })

    return {
        "passed": len(errors) == 0,
        "errors": errors
    }

def evaluate_sample(sample):
    ground_truth = sample["ground_truth"]
    prediction = sample.get("prediction")

    errors = []

    # Prediction missing
    if prediction is None:
        return {
            "id": sample["id"],
            "structure": False,
            "content": False,
            "choices": False,
            "errors": [
                {
                    "type": "STRUCTURE",
                    "problem": "prediction_missing"
                }
            ]
        }

    # 1. Structure
    structure_ok = validate_structure(prediction)

    if not structure_ok:
        errors.append({
            "type": "STRUCTURE",
            "problem": "invalid_structure"
        })

        return {
            "id": sample["id"],
            "structure": False,
            "content": False,
            "choices": False,
            "errors": errors
        }

    # 2. Content
    content_ok = compare_content(
        ground_truth,
        prediction
    )

    if not content_ok:
        errors.append({
            "type": "CONTENT",
            "problem": "content_mismatch"
        })

    # 3. Choices
    choice_result = compare_choices(
        ground_truth,
        prediction
    )

    if not choice_result["passed"]:
        errors.extend(choice_result["errors"])

    return {
        "id": sample["id"],
        "structure": structure_ok,
        "content": content_ok,
        "choices": choice_result["passed"],
        "errors": errors
    }

def aggregate_results(evaluations):
    total = len(evaluations)

    structure_pass = sum(
        result["structure"]
        for result in evaluations
    )

    content_pass = sum(
        result["content"]
        for result in evaluations
    )

    choices_pass = sum(
        result["choices"]
        for result in evaluations
    )

    error_counts = {
        "STRUCTURE": 0,
        "CONTENT": 0,
        "CHOICE": 0
    }

    for result in evaluations:
        for error in result["errors"]:
            error_type = error["type"]

            if error_type in error_counts:
                error_counts[error_type] += 1

    return {
        "total_samples": total,
        "structure_accuracy": structure_pass / total if total else 0,
        "content_accuracy": content_pass / total if total else 0,
        "choice_accuracy": choices_pass / total if total else 0,
        "error_counts": error_counts,
        "total_errors": sum(error_counts.values())
    }

def save_evaluation(summary, evaluations):
    output = {
        "summary": summary,
        "samples": evaluations
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2
        )

def main():
    results = load_results()

    evaluations = []

    for sample in results:
        result = evaluate_sample(sample)
        evaluations.append(result)

    summary = aggregate_results(evaluations)

    save_evaluation(summary, evaluations)

    print("\n=== Evaluation Summary ===")
    print(f"Total samples: {summary['total_samples']}")
    print(f"Structure accuracy: {summary['structure_accuracy']:.2%}")
    print(f"Content accuracy:   {summary['content_accuracy']:.2%}")
    print(f"Choice accuracy:    {summary['choice_accuracy']:.2%}")
    print(f"Total errors:       {summary['total_errors']}")

    print("\nErrors by type:")
    for error_type, count in summary["error_counts"].items():
        print(f"  {error_type}: {count}")


if __name__ == "__main__":
    main()