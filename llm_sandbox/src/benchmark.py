import json
import os
import time

from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv

# =========================
# Project paths
# =========================

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SRC_DIR)

DATASET_DIR = os.path.join(
    PROJECT_DIR,
    "datasets",
    "ocr_benchmark_v1"
)

IMAGE_DIR = os.path.join(
    DATASET_DIR,
    "images"
)

BENCHMARK_DATA_PATH = os.path.join(
    DATASET_DIR,
    "benchmark_data.json"
)

PROMPT_PATH = os.path.join(
    PROJECT_DIR,
    "prompts",
    "prompt-v0.md"
)

SCHEMA_PATH = os.path.join(
    PROJECT_DIR,
    "schemas",
    "schema-v0.json"
)

load_dotenv(
    os.path.join(PROJECT_DIR, ".env")
)
api_key = os.getenv("GEMINI_API_KEY_2")

if not api_key: 
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)
MODEL = "gemini-flash-latest"

# =========================
# Load benchmark dataset
# =========================

with open(
    BENCHMARK_DATA_PATH,
    "r",
    encoding="utf-8"
) as f:
    data = json.load(f)

# =========================
# Load prompt
# =========================

with open(
    PROMPT_PATH,
    "r",
    encoding="utf-8"
) as f:
    PROMPT_TEXT = f.read()

# =========================
# Load schema
# =========================

with open(
    SCHEMA_PATH,
    "r",
    encoding="utf-8"
) as f:
    SCHEMA_V0 = json.load(f)

def run_model(sample, client):
    image_name = sample["image"]
    item_id = sample["id"]

    image_path = os.path.join(
        IMAGE_DIR,
        image_name
    )

    print(f"\n[{item_id}] Đang xử lý: {image_name}")

    if not os.path.exists(image_path):
        print(f"❌ Không tìm thấy ảnh: {image_path}")
        return None

    try:
        load_start = time.perf_counter()

        with Image.open(image_path) as image:
            img = image.copy()

        load_end = time.perf_counter()

        chat_start = time.perf_counter()

        chat = client.chats.create(
            model=MODEL,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SCHEMA_V0
            )
        )

        chat_end = time.perf_counter()

        api_start = time.perf_counter()

        MAX_RETRIES = 3

        for attempt in range(MAX_RETRIES):
            try:
                response = chat.send_message([
                    img,
                    PROMPT_TEXT
                ])
                break

            except Exception as e:
                if "503" in str(e):
                    print(
                        f"  ⚠️ 503 - retry "
                        f"{attempt + 1}/{MAX_RETRIES}"
                    )
                    time.sleep(2 ** attempt)
                else:
                    raise

        else:
            print("  ❌ Failed after retries")
            return None

        api_end = time.perf_counter()

        parse_start = time.perf_counter()

        raw_output = response.text.strip()

        try:
            prediction = json.loads(raw_output)
            structure_ok = True

        except json.JSONDecodeError:
            prediction = None
            structure_ok = False

        parse_end = time.perf_counter()

        load_ms = round((load_end - load_start) * 1000, 2)
        chat_ms = round((chat_end - chat_start) * 1000, 2)
        api_ms = round((api_end - api_start) * 1000, 2)
        parse_ms = round((parse_end - parse_start) * 1000, 2)

        total_ms = round(load_ms + chat_ms + api_ms + parse_ms, 2)


        usage = response.usage_metadata
        input_tokens = getattr(usage, "prompt_token_count", None)
        output_tokens = getattr(usage, "candidates_token_count", None)

        total_tokens = getattr(usage, "total_token_count", None)

        result = {
            "id": item_id,
            "ground_truth": sample["ground_truth"],
            "prediction": prediction,
            "raw_output": raw_output,
            "structure_ok": structure_ok,
            "latency_ms": total_ms,
            "timing": {
                "load_ms": load_ms,
                "chat_create_ms": chat_ms,
                "api_ms": api_ms,
                "parse_ms": parse_ms
            },
            "token_usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }
        }

        print(f"  API:       {api_ms} ms")
        print(f"  Total:     {total_ms} ms")
        print(
            f"  Structure: "
            f"{'PASS ✓' if structure_ok else 'FAIL ✗'}"
        )
        print(
            f"  Tokens: "
            f"{total_tokens}"
        )
        return result


    except Exception as e:
        print(
            f"❌ Lỗi khi xử lý {item_id}: {e}"
        )
        return None

all_results = []

print("\n🚀 BẮT ĐẦU BENCHMARK\n")\

complete_id = {"sc_02", "sc_03", "sc_04"}

for sample in data["sample"]:
    if sample["id"] in complete_id: continue
    result = run_model(
        sample,
        client
    )
    if result:
        all_results.append(result)


print("\n🎉 HOÀN TẤT\n")

print(
    json.dumps(
        all_results,
        indent=4,
        ensure_ascii=False
    )
)