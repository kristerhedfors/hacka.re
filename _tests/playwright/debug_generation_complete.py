"""Debug when generation is complete"""
import time
from playwright.sync_api import sync_playwright
from test_utils import dismiss_welcome_modal
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('_tests/playwright/.env')
api_key = os.getenv('OPENAI_API_KEY')

if not api_key:
    print("No API key found in .env")
    exit(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    
    # Navigate to the page
    page.goto("http://localhost:8000")
    dismiss_welcome_modal(page)
    
    # Configure API key through UI
    print("\n=== Setting up API key ===")
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible")
    
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    provider_select = page.locator("#base-url-select")
    provider_select.select_option(value="openai")
    
    page.wait_for_timeout(1000)
    model_select = page.locator("#model-select")
    model_select.select_option(value="gpt-5-nano")
    
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Add a simple test function
    print("\n=== Adding test function ===")
    function_btn = page.locator("#function-btn")
    function_btn.click()
    page.wait_for_selector("#function-modal", state="visible")
    
    function_code = page.locator("#function-code")
    function_code.fill("""function encrypt(text, key) {
  return { encrypted: btoa(text + key), method: 'simple' };
}""")
    
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    page.wait_for_timeout(1000)
    
    submit_btn = page.locator("#function-editor-form button[type='submit']")
    submit_btn.click()
    page.wait_for_timeout(1000)
    
    close_function = page.locator("#close-function-modal")
    close_function.click()
    page.wait_for_selector("#function-modal", state="hidden")
    
    # Send message
    print("\n=== Sending message ===")
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'test' with key 'secret'")
    chat_input.press("Enter")
    
    # Wait for modal
    page.wait_for_selector("#function-execution-modal", state="visible", timeout=5000)
    print("Function execution modal appeared")
    
    # Click Execute
    modal = page.locator("#function-execution-modal")
    execute_btn = modal.locator("#exec-execute-btn")
    execute_btn.click()
    print("Clicked Execute button")
    
    # Wait for modal to close
    page.wait_for_selector("#function-execution-modal", state="hidden", timeout=5000)
    print("Modal closed")
    
    # Check send button state during generation
    print("\n=== Monitoring generation state ===")
    send_button = page.locator("#send-message-btn")
    message_input = page.locator("#message-input")
    
    # Check button states every 500ms for 10 seconds
    for i in range(20):
        is_disabled = send_button.is_disabled()
        is_enabled = send_button.is_enabled()
        is_visible = send_button.is_visible()
        button_text = send_button.text_content()
        button_class = send_button.get_attribute("class")
        input_disabled = message_input.is_disabled()
        
        # Check for stop button
        stop_button = page.locator("#stop-generation-btn")
        stop_visible = stop_button.is_visible() if stop_button.count() > 0 else False
        
        # Check message count and content
        messages = page.locator(".message.assistant")
        msg_count = messages.count()
        last_msg_text = ""
        if msg_count > 0:
            last_msg = messages.last
            last_msg_text = last_msg.text_content()
            last_msg_text = last_msg_text.strip()[:50] if last_msg_text else ""
        
        print(f"[{i*0.5:.1f}s] Send: enabled={is_enabled}, visible={is_visible}, text='{button_text}', input_disabled={input_disabled}")
        print(f"       Stop: visible={stop_visible}, Messages: {msg_count}, Last msg: '{last_msg_text}'")
        
        # If we see content in the message, generation might be done
        if msg_count > 0 and last_msg_text and len(last_msg_text) > 10:
            print(f"       -> Content detected, checking if still generating...")
        
        page.wait_for_timeout(500)
    
    # Final check
    print("\n=== Final state ===")
    final_messages = page.locator(".message.assistant")
    print(f"Final assistant message count: {final_messages.count()}")
    if final_messages.count() > 0:
        last_msg = final_messages.last
        final_text = last_msg.text_content()
        print(f"Last message preview: {final_text[:200] if final_text else 'None'}")
    
    print("\n=== Browser will close in 5 seconds ===")
    page.wait_for_timeout(5000)
    
    browser.close()