"""Debug function execution modal selectors"""
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
    function_code.fill("""/**
 * Simple encrypt function for testing
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {object} Encrypted result
 */
function encrypt(text, key) {
  return {
    encrypted: btoa(text + key),
    method: 'simple',
    key_used: key
  };
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
    
    # Wait and check for modal
    print("\n=== Checking for function execution modal ===")
    page.wait_for_timeout(3000)
    
    # Try different selectors
    modal1 = page.locator("#function-execution-modal")
    print(f"Modal #function-execution-modal exists: {modal1.count()}")
    print(f"Modal #function-execution-modal visible: {modal1.is_visible() if modal1.count() > 0 else 'N/A'}")
    
    modal2 = page.locator(".function-execution-modal")
    print(f"Modal .function-execution-modal exists: {modal2.count()}")
    print(f"Modal .function-execution-modal visible: {modal2.is_visible() if modal2.count() > 0 else 'N/A'}")
    
    # Check for modal with active class
    modal3 = page.locator(".modal.active")
    print(f"Modal .modal.active exists: {modal3.count()}")
    if modal3.count() > 0:
        for i in range(modal3.count()):
            modal_elem = modal3.nth(i)
            modal_id = modal_elem.get_attribute("id")
            print(f"  Active modal {i}: {modal_id}")
    
    # Look for any visible modals
    all_modals = page.locator(".modal")
    print(f"\nAll modals: {all_modals.count()}")
    for i in range(all_modals.count()):
        modal_elem = all_modals.nth(i)
        modal_id = modal_elem.get_attribute("id")
        is_visible = modal_elem.is_visible()
        has_active = "active" in (modal_elem.get_attribute("class") or "")
        print(f"  Modal {i}: id={modal_id}, visible={is_visible}, active={has_active}")
    
    # Look for execute button
    exec_btn1 = page.locator("#exec-execute-btn")
    print(f"\nExecute button #exec-execute-btn exists: {exec_btn1.count()}")
    print(f"Execute button visible: {exec_btn1.is_visible() if exec_btn1.count() > 0 else 'N/A'}")
    
    # Try different button selectors
    exec_btn2 = page.locator("button:has-text('Execute')")
    print(f"Button with text 'Execute' exists: {exec_btn2.count()}")
    if exec_btn2.count() > 0:
        for i in range(exec_btn2.count()):
            btn = exec_btn2.nth(i)
            btn_id = btn.get_attribute("id")
            btn_visible = btn.is_visible()
            print(f"  Execute button {i}: id={btn_id}, visible={btn_visible}")
    
    # Check what's actually visible on screen
    print("\n=== Checking visible elements ===")
    
    # Get the actual modal that appeared
    visible_modal = None
    for i in range(all_modals.count()):
        modal_elem = all_modals.nth(i)
        if modal_elem.is_visible():
            visible_modal = modal_elem
            modal_id = modal_elem.get_attribute("id")
            print(f"Found visible modal: {modal_id}")
            
            # Check its content
            modal_html = modal_elem.inner_html()[:500]
            print(f"Modal HTML preview: {modal_html}")
            
            # Look for buttons inside this modal
            buttons = modal_elem.locator("button")
            print(f"Buttons in modal: {buttons.count()}")
            for j in range(buttons.count()):
                btn = buttons.nth(j)
                btn_text = btn.text_content()
                btn_id = btn.get_attribute("id")
                print(f"  Button {j}: id={btn_id}, text={btn_text}")
            
            break
    
    # If we found a visible modal with an execute button, click it
    if visible_modal:
        exec_buttons = visible_modal.locator("button:has-text('Execute')")
        if exec_buttons.count() > 0:
            print(f"\nClicking Execute button...")
            exec_buttons.first.click()
            page.wait_for_timeout(2000)
            print("Clicked Execute button")
    
    print("\n=== Browser will close in 10 seconds ===")
    page.wait_for_timeout(10000)
    
    browser.close()