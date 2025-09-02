"""
Simple debug script to test function calling
"""
import time
from playwright.sync_api import sync_playwright, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
sys.path.append(os.path.dirname(__file__))
from conftest import ACTIVE_TEST_CONFIG
OPENAI_API_KEY = ACTIVE_TEST_CONFIG["api_key"]

def test_function_calling():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        
        # Dismiss modals
        dismiss_welcome_modal(page)
        dismiss_settings_modal(page)
        
        # Configure API
        print("Configuring API...")
        settings_btn = page.locator("#settings-btn")
        settings_btn.click()
        page.wait_for_selector("#settings-modal.active", timeout=2000)
        
        api_input = page.locator("#api-key-update")
        api_input.fill(OPENAI_API_KEY)
        
        provider_select = page.locator("#base-url-select")
        provider_select.select_option(ACTIVE_TEST_CONFIG["provider_value"])
        
        # Wait for reload button to be enabled
        page.wait_for_function(
            """() => {
                const btn = document.getElementById('model-reload-btn');
                return btn && !btn.disabled;
            }""",
            timeout=3000
        )
        
        reload_btn = page.locator("#model-reload-btn")
        reload_btn.click()
        
        # Wait for models
        time.sleep(2)
        
        # Select configured test model
        model_select = page.locator("#model-select")
        model_select.select_option(ACTIVE_TEST_CONFIG["model"])
        
        # Save
        save_btn = page.locator("#close-settings")
        save_btn.click(force=True)
        page.wait_for_selector("#settings-modal", state="hidden")
        
        # Add function
        print("Adding function...")
        func_btn = page.locator("#function-btn")
        func_btn.click()
        
        function_modal = page.locator("#function-modal")
        expect(function_modal).to_be_visible()
        
        code_area = page.locator("#function-code")
        code_area.fill("""
/**
 * @callable
 * Returns current time
 */
function getCurrentTime() {
    console.log("getCurrentTime called!");
    return { time: new Date().toISOString() };
}
""")
        
        # Validate
        page.locator("#function-validate-btn").click()
        
        validation_result = page.locator("#function-validation-result")
        expect(validation_result).to_be_visible()
        
        # Submit
        page.locator("#function-editor-form button[type='submit']").click()
        
        # Check function was added
        function_list = page.locator("#function-list")
        expect(function_list.locator(".function-item-name:has-text('getCurrentTime')").first).to_be_visible()
        
        # Close modal
        close_btn = page.locator("#close-function-modal")
        close_btn.click()
        expect(function_modal).not_to_be_visible()
        
        # Send message
        print("Sending message...")
        message_input = page.locator("#message-input")
        message_input.fill("What time is it? Please call the getCurrentTime function")
        
        send_btn = page.locator("#send-btn")
        send_btn.click()
        
        # Wait and observe
        print("Waiting for response...")
        time.sleep(10)
        
        # Check for various indicators
        print("\nChecking for function call indicators:")
        
        # Check for tool call containers
        tool_calls = page.locator(".tool-call-container").count()
        print(f"Tool call containers: {tool_calls}")
        
        # Check for function call indicators
        func_indicators = page.locator(".function-call-indicator").count()
        print(f"Function call indicators: {func_indicators}")
        
        # Check for code blocks
        code_blocks = page.locator(".code-block").count()
        print(f"Code blocks: {code_blocks}")
        
        # Check assistant messages - using the correct selector
        messages = page.locator(".message.assistant .message-content").all()
        print(f"Assistant messages: {len(messages)}")
        
        if messages:
            for i, msg in enumerate(messages):
                text = msg.text_content()
                print(f"\nMessage {i+1} preview: {text[:200] if text else 'Empty'}...")
                if "getCurrentTime" in text or "function" in text.lower():
                    print("  -> Contains function reference!")
        
        # Check for any elements with getCurrentTime text
        time_elements = page.locator("*:has-text('getCurrentTime')").count()
        print(f"\nElements containing 'getCurrentTime': {time_elements}")
        
        # Take screenshot for debugging
        page.screenshot(path="_tests/playwright/screenshots/debug_function_call.png")
        print("\nScreenshot saved to _tests/playwright/screenshots/debug_function_call.png")
        
        browser.close()

if __name__ == "__main__":
    test_function_calling()