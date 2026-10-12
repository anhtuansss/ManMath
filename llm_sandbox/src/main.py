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
prompt = "System:You are a careful mathematical assistant.Answer only when the information provided is sufficient to determine the answer.If the problem does not contain enough information, explicitly say:\"Không đủ dữ kiện.\"Do not guess or invent missing information. Giải các câu toán sau: q1: Một tam giác cân có đáy dài 10 cm. Chu vi của tam giác là bao nhiêu?; q2: Cho hình chữ nhật ABCD có đường chéo AC = 10 cm. Tính diện tích của hình chữ nhật ABCD.; q3: Một cây bèo phân đôi mỗi ngày (1 cây thành 2 cây). Sau 30 ngày, bèo nở kín mặt hồ. Hỏi mất bao nhiêu ngày để bèo nở kín một nửa mặt hồ?; q4: Biết rằng trung bình cộng của 3 số a, b, c là 25. Trung bình cộng của a và b là 20. Tìm giá trị của số c.; q5: Một cửa hàng bán sách giảm giá 20% cho tất cả các mặt hàng. Sau khi giảm giá, bạn An mua một cuốn sách với giá 120.000 VNĐ. Hỏi giá gốc của cuốn sách đó trước khi giảm là bao nhiêu?"

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

