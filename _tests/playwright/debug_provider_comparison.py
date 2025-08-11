"""Debug script to investigate API provider issues with Berget.ai and Groq."""

import pytest
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
from playwright.sync_api import Page, expect
import time
import json


def debug_provider_setup(page: Page, api_key: str, provider_name: str):
    """Debug the provider setup process step by step."""
    print(f"\n=== Debugging {provider_name} Provider Setup ===")
    
    # Clear storage and reload
    page.evaluate("() => localStorage.clear()")
    page.reload()
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Capture initial state
    screenshot_with_markdown(page, f"debug_{provider_name.lower()}_initial", {
        "Provider": provider_name,
        "Step": "Initial state after clearing storage",
        "Local Storage": str(page.evaluate("() => Object.keys(localStorage)"))
    })
    
    # Open settings
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    screenshot_with_markdown(page, f"debug_{provider_name.lower()}_settings_open", {
        "Provider": provider_name,
        "Step": "Settings modal opened",
        "Modal Visible": str(page.locator("#settings-modal").is_visible())
    })
    
    # Set API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Wait and check detection
    page.wait_for_timeout(2000)
    
    # Check if provider was auto-detected
    detection_element = page.locator("#api-key-update-detection")
    detection_visible = detection_element.is_visible()
    detection_text = ""
    if detection_visible:
        detection_text = page.locator("#api-key-update-detection-text").text_content()
    
    screenshot_with_markdown(page, f"debug_{provider_name.lower()}_api_key_set", {
        "Provider": provider_name,
        "Step": "API key entered",
        "API Key": f"{api_key[:20]}...",
        "Detection Visible": str(detection_visible),
        "Detection Text": detection_text,
        "Provider Auto-Detected": "YES" if provider_name.lower() in detection_text.lower() else "NO"
    })
    
    # Check current provider selection
    provider_dropdown = page.locator("#api-provider")
    current_provider = provider_dropdown.input_value() if provider_dropdown.is_visible() else "Not found"
    
    # Close settings
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    screenshot_with_markdown(page, f"debug_{provider_name.lower()}_settings_closed", {
        "Provider": provider_name,
        "Step": "Settings closed",
        "Current Provider": current_provider,
        "Local Storage": str(page.evaluate("() => Object.keys(localStorage)"))
    })
    
    return detection_text, current_provider


def debug_send_message(page: Page, message: str, provider_name: str):
    """Debug the message sending process."""
    print(f"\n=== Debugging Message Send for {provider_name} ===")
    
    # Check if input field is available
    chat_input = page.locator("#message-input")
    input_visible = chat_input.is_visible()
    
    screenshot_with_markdown(page, f"debug_{provider_name.lower()}_before_send", {
        "Provider": provider_name,
        "Step": "Before sending message",
        "Input Visible": str(input_visible),
        "Message": message
    })
    
    if not input_visible:
        print(f"ERROR: Chat input not visible for {provider_name}")
        return None
    
    # Fill message
    chat_input.fill(message)
    
    # Check send button
    send_button = page.locator("#send-btn")
    send_visible = send_button.is_visible()
    
    if not send_visible:
        print(f"ERROR: Send button not visible for {provider_name}")
        return None
    
    # Setup console logging to catch errors
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'timestamp': time.strftime("%H:%M:%S")
        })
        print(f"Console {msg.type}: {msg.text}")
    
    page.on("console", log_console_message)
    
    # Send message
    send_button.click()
    
    # Wait a bit and check for any immediate errors
    page.wait_for_timeout(5000)
    
    # Check if any messages appeared
    user_messages = page.locator(".message.user")
    assistant_messages = page.locator(".message.assistant")
    
    user_count = user_messages.count()
    assistant_count = assistant_messages.count()
    
    screenshot_with_markdown(page, f"debug_{provider_name.lower()}_after_send", {
        "Provider": provider_name,
        "Step": "After sending message (5s wait)",
        "User Messages": str(user_count),
        "Assistant Messages": str(assistant_count),
        "Console Messages": str(len(console_messages)),
        "Recent Console": str(console_messages[-3:] if console_messages else "None")
    })
    
    # Wait longer for response
    try:
        page.wait_for_selector(".message.assistant", timeout=25000)
        response_element = page.locator(".message.assistant:last-child .message-content")
        response_text = response_element.text_content()
        
        screenshot_with_markdown(page, f"debug_{provider_name.lower()}_response_received", {
            "Provider": provider_name,
            "Step": "Response received",
            "Response Length": f"{len(response_text)} chars",
            "Response Preview": response_text[:200] + "..." if len(response_text) > 200 else response_text,
            "Analysis Prefix": "YES" if response_text.lower().startswith("analysis") else "NO"
        })
        
        return response_text
        
    except Exception as e:
        screenshot_with_markdown(page, f"debug_{provider_name.lower()}_timeout", {
            "Provider": provider_name,
            "Step": "Timeout waiting for response",
            "Error": str(e),
            "Console Messages": str(len(console_messages)),
            "All Console": str(console_messages)
        })
        return None


def test_debug_berget_provider(page: Page, serve_hacka_re):
    """Debug Berget.ai provider setup and usage."""
    page.goto(serve_hacka_re)
    
    berget_api_key = "sk_ber_3p6tTmkcEdBgEfIbAdU2BDxmyKbXB30RKoVfv_1f097c4eed0dac42"
    test_message = "What is the capital of France?"
    
    detection_text, current_provider = debug_provider_setup(page, berget_api_key, "Berget.ai")
    
    if detection_text:
        print(f"Berget.ai detection result: {detection_text}")
        
    response = debug_send_message(page, test_message, "Berget.ai")
    
    if response:
        print(f"Berget.ai response: {response}")
        print(f"Starts with 'analysis': {response.lower().startswith('analysis')}")
    else:
        print("No response received from Berget.ai")


def test_debug_groq_provider(page: Page, serve_hacka_re):
    """Debug Groq Cloud provider setup and usage."""
    page.goto(serve_hacka_re)
    
    groq_api_key = "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"
    test_message = "What is the capital of France?"
    
    detection_text, current_provider = debug_provider_setup(page, groq_api_key, "Groq")
    
    if detection_text:
        print(f"Groq detection result: {detection_text}")
        
    response = debug_send_message(page, test_message, "Groq")
    
    if response:
        print(f"Groq response: {response}")
        print(f"Starts with 'analysis': {response.lower().startswith('analysis')}")
    else:
        print("No response received from Groq")