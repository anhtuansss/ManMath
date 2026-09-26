import time
import os

from dotenv import load_dotenv
from google import genai

# 1. Load API key from .env file
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key: 
    raise ValueError("GEMINI_API_KEY not found in .env")

# 2. Create Gemini client
client = genai.Client(api_key=api_key)

# 3. Prompt
prompt = "Explain what OCR is in one sentence."

# 4. Call model + measure time taken
start = time.perf_counter()

chat = client.chats.create(
    model = "gemini-3.5-flash"
)

try:
    response = chat.send_message(prompt)
    end = time.perf_counter()
    latency = end - start
    usage = response.usage_metadata

    # 5. Print result
    print("=== LLM Sandbox ===")
    print(f"Model: gemini-3.5-flash")
    print(f"Prompt: {prompt}")
    print()
    print("Response:")
    print(response.text)
    print()
    print(f"Latency: {latency * 1000:.2f} ms")
    print()
    print("Token Usage:")
    print(f"Input tokens: {usage.prompt_token_count}")
    print(f"Output tokens: {usage.candidates_token_count}")
    print(f"Total tokens: {usage.total_token_count}")
except errors.ServerError as e:
    if e.code == 503:
        print("Server quá tải, chờ 5 giây thử lại...")
        time.sleep(5)

