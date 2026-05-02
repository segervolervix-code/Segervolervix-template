import requests
import threading
import time
import sys

CHAT_URL = "https://segervolervix.space/api/chat"
API_KEY = "YOUR_API_KEY"


def send_message(message):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "user_message": message
    }

    response = requests.post(CHAT_URL, json=payload, headers=headers)
    response.raise_for_status()

    data = response.json()
    return data.get("ai_message", "No response from AI.")


def loading_animation(stop_event):
    while not stop_event.is_set():
        for dots in ["Generating.", "Generating..", "Generating..."]:
            sys.stdout.write("\r" + dots)
            sys.stdout.flush()
            time.sleep(0.4)
            if stop_event.is_set():
                break
    sys.stdout.write("\r" + " " * 30 + "\r")


def type_text(text, delay=0.02):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()  # new line after finishing


print("AI chat started (Ctrl+C to stop)\n")

try:
    while True:
        user_input = input("You: ")

        stop_event = threading.Event()
        loader = threading.Thread(target=loading_animation, args=(stop_event,))
        loader.start()

        try:
            ai_reply = send_message(user_input)
        finally:
            stop_event.set()
            loader.join()

        print("AI: ", end="")
        type_text(ai_reply)

        print()

except KeyboardInterrupt:
    print("\nStopped.")
