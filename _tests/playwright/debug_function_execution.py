"""Debug function execution modal test"""
import time
from playwright.sync_api import sync_playwright
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('_tests/playwright/.env')
api_key = os.getenv('OPENAI_API_KEY')

if not api_key:
    print("No API key found in .env")
    exit(1)

def setup_console_logging(page):
    """Setup console message logging"""
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] Console {msg.type}: {msg.text}")
    page.on("console", log_console_message)
    
    def log_page_error(error):
        print(f"Page error: {error}")
    page.on("pageerror", log_page_error)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    
    # Setup console logging
    setup_console_logging(page)
    
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
    
    # Select model
    page.wait_for_timeout(1000)
    model_select = page.locator("#model-select")
    model_select.select_option(value="gpt-5-nano")
    
    # Close settings
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Enable RC4 functions
    print("\n=== Enabling RC4 functions ===")
    function_btn = page.locator("#function-btn")
    function_btn.click()
    page.wait_for_selector("#function-modal", state="visible")
    
    # Check if RC4 functions are available
    rc4_checkbox = page.locator("input[type='checkbox'][data-function-group='rc4-encryption']")
    print(f"RC4 checkbox found: {rc4_checkbox.count() > 0}")
    
    if rc4_checkbox.count() > 0:
        is_checked = rc4_checkbox.is_checked()
        print(f"RC4 checkbox is checked: {is_checked}")
        if not is_checked:
            rc4_checkbox.check()
            print("Checked RC4 functions")
    else:
        print("WARNING: RC4 checkbox not found!")
        # Check what's in the function list
        function_list = page.locator("#function-list")
        if function_list.count() > 0:
            content = function_list.text_content()
            print(f"Function list content: {content[:200]}")
    
    close_function = page.locator("#close-function-modal")
    close_function.click()
    page.wait_for_selector("#function-modal", state="hidden")
    
    # Send a message that will trigger function call
    print("\n=== Sending message to trigger function call ===")
    chat_input = page.locator("#message-input")
    chat_input.fill("encrypt 'test' with key 'secret'")
    
    # Take screenshot before sending
    screenshot_with_markdown(page, "debug_before_send", {
        "Status": "About to send message",
        "Message": "encrypt 'test' with key 'secret'"
    })
    
    chat_input.press("Enter")
    
    # Wait a bit to see what happens
    print("\n=== Waiting for response ===")
    page.wait_for_timeout(3000)
    
    # Check if execution modal appears
    modal = page.locator("#function-execution-modal")
    if modal.is_visible():
        print("Function execution modal is visible!")
        
        # Take screenshot of modal
        screenshot_with_markdown(page, "debug_execution_modal", {
            "Status": "Function execution modal appeared",
            "Modal": "Visible"
        })
        
        # Click execute
        execute_btn = modal.locator("#exec-execute-btn")
        if execute_btn.is_visible():
            print("Clicking Execute button")
            execute_btn.click()
            page.wait_for_timeout(2000)
    else:
        print("Function execution modal did not appear")
        
        # Check for any error messages
        system_messages = page.locator(".system-message")
        if system_messages.count() > 0:
            for i in range(system_messages.count()):
                msg = system_messages.nth(i).text_content()
                print(f"System message {i}: {msg}")
        
        # Check for assistant messages
        assistant_messages = page.locator(".assistant-message")
        if assistant_messages.count() > 0:
            for i in range(assistant_messages.count()):
                msg = assistant_messages.nth(i).text_content()
                print(f"Assistant message {i}: {msg[:200]}")
    
    # Check for function result
    function_results = page.locator(".function-result-icon")
    print(f"\nFunction result icons found: {function_results.count()}")
    
    # Take final screenshot
    screenshot_with_markdown(page, "debug_final_state", {
        "Status": "Final state",
        "Function Results": function_results.count()
    })
    
    # Keep browser open for inspection
    print("\n=== Browser will close in 10 seconds ===")
    page.wait_for_timeout(10000)
    
    browser.close()