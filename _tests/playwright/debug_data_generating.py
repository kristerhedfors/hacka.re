"""Debug data-generating attribute"""
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
    
    # Send a simple message
    print("\n=== Sending simple message ===")
    chat_input = page.locator("#message-input")
    chat_input.fill("Say hello")
    chat_input.press("Enter")
    
    # Monitor the send button for changes
    print("\n=== Monitoring send button ===")
    send_button = page.locator("#send-message-btn")
    
    for i in range(20):  # Check for 10 seconds
        btn_exists = page.evaluate("() => !!document.querySelector('#send-message-btn')")
        has_attr = page.evaluate("() => document.querySelector('#send-message-btn')?.hasAttribute('data-generating')")
        attr_value = page.evaluate("() => document.querySelector('#send-message-btn')?.getAttribute('data-generating')")
        title = page.evaluate("() => document.querySelector('#send-message-btn')?.getAttribute('title')")
        inner_html = page.evaluate("() => document.querySelector('#send-message-btn')?.innerHTML")
        
        print(f"[{i*0.5:.1f}s] exists: {btn_exists}, has data-gen: {has_attr}, value: {attr_value}, title: '{title}'")
        
        if inner_html and "stop" in inner_html.lower():
            print(f"       -> Button shows stop icon")
        
        page.wait_for_timeout(500)
    
    # Final check
    print("\n=== Final state ===")
    final_has_attr = page.evaluate("() => document.querySelector('#send-message-btn')?.hasAttribute('data-generating')")
    final_title = page.evaluate("() => document.querySelector('#send-message-btn')?.getAttribute('title')")
    print(f"Final: has data-generating: {final_has_attr}, title: '{final_title}'")
    
    # Check messages
    messages = page.locator(".message.assistant")
    print(f"Assistant messages: {messages.count()}")
    
    print("\n=== Browser will close in 5 seconds ===")
    page.wait_for_timeout(5000)
    
    browser.close()