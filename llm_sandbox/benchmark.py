import json
import os
import time

from google import genai
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key: 
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)

json_path = r'C:\Users\LOQ\Desktop\manmath\llm_sandbox\benchmark_data.json'
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

def validate_dataset(data):
    print("=== Benchmark Dataset Validation ===\n")

    samples = data.get('sample', [])

    total_samples = len(samples)
    total_pass = total_samples == 10
    print(f"Total samples: {total_samples} {'✓' if total_pass else f'✗ (Expected 10)'}\n")

    required_fields = {"id", "category", "image", "ground_truth"}
    valid_categories = {"FORMULA", "TEXT", "CHOICE"}

    category_counts = {"FORMULA": 0, "TEXT": 0, "CHOICE": 0}
    all_fields_ok = True
    all_categories_ok = True

    for item in samples:
        if not required_fields.issubset(item.keys()):
            all_fields_ok = False
        
        category = item.get('category')
        if category in valid_categories:
            category_counts[category] += 1
        else:
            all_categories_ok = False

    formula_count = category_counts['FORMULA']
    text_count = category_counts['TEXT']
    choice_count = category_counts['CHOICE']

    formula_pass = formula_count == 4
    text_pass = text_count == 3
    choice_pass = choice_count == 3

    print(f"FORMULA: {formula_count} {'✓' if formula_pass else f'✗ (Expected 4)'}")
    print(f"TEXT: {text_count} {'✓' if text_pass else f'✗ (Expected 3)'}")
    print(f"CHOICE: {choice_count} {'✓' if choice_pass else f'✗ (Expected 3)'}\n")
    
    if all_fields_ok:
        print("All samples have required fields ✓")
    else:
        print("All samples have required fields ✗")
        
    if not all_categories_ok:
        print("Invalid categories found in dataset ✗")

    # Đánh giá tổng quan (PASS/FAIL)
    is_pass = (total_pass and formula_pass and text_pass and 
               choice_pass and all_fields_ok and all_categories_ok)
               
    print(f"Dataset validation: {'PASS' if is_pass else 'FAIL'}")

def run_model(sample, client):

    current_dir = os.path.dirname(os.path.abspath(__file__))
    image_folder = os.path.join(current_dir, "ManMath_OCR")

    image_name = sample["image"]
    item_id = sample["id"]

    image_path = os.path.join(image_folder, image_name)

    print(f"[{item_id}] Đang xử lý ảnh: {image_name}...")

    if not os.path.exists(image_path):
        print(f"❌ Lỗi: Không tìm thấy ảnh {image_path}")
        return None

    try:
        # 1. Load image
        load_start = time.perf_counter()

        with Image.open(image_path) as image:
            img = image.copy()

        load_end = time.perf_counter()

        # 2. Create chat
        chat_start = time.perf_counter()

        chat = client.chats.create(
            model="gemini-3.5-flash"
        )

        chat_end = time.perf_counter()

        # 3. Send request
        prompt = (
            "Extract the content from this image. "
            "Do not solve or modify the content. "
            "Return only the extracted content."
        )

        api_start = time.perf_counter()

        response = chat.send_message([img, prompt])

        api_end = time.perf_counter()

        # 4. Parse response
        parse_start = time.perf_counter()

        prediction = response.text.strip()

        parse_end = time.perf_counter()

        # 5. Calculate latency
        load_ms = round((load_end - load_start) * 1000, 2)
        chat_ms = round((chat_end - chat_start) * 1000, 2)
        api_ms = round((api_end - api_start) * 1000, 2)
        parse_ms = round((parse_end - parse_start) * 1000, 2)

        total_ms = round(
            load_ms + chat_ms + api_ms + parse_ms,
            2
        )

        result = {
            "id": item_id,
            "category": sample["category"],
            "prediction": prediction,
            "latency_ms": total_ms,
            "timing": {
                "load_ms": load_ms,
                "chat_create_ms": chat_ms,
                "api_ms": api_ms,
                "parse_ms": parse_ms
            }
        }

        print(f"  Load:   {load_ms} ms")
        print(f"  Chat:   {chat_ms} ms")
        print(f"  API:    {api_ms} ms")
        print(f"  Parse:  {parse_ms} ms")
        print(f"  Total:  {total_ms} ms")

        return result

    except Exception as e:
        print(f"❌ Lỗi khi xử lý {item_id}: {e}")
        return None

all_results = []

print("\n🚀 BẮT ĐẦU CHẠY BENCHMARK CHO TOÀN BỘ SAMPLE...\n")

for sample in data['sample']:
    result = run_model(sample, client)
    if result:
        all_results.append(result)

print("\n🎉 ĐÃ XỬ LÝ XONG TOÀN BỘ! KẾT QUẢ TỔNG HỢP:\n")
print(json.dumps(all_results, indent=4, ensure_ascii=False))
