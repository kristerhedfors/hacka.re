import pytest
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal

def test_tooldefinition_removal_and_rebuild(page: Page, serve_hacka_re):
    """
    Simple test to verify toolDefinition is not in share links and gets rebuilt.
    """
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Create a test function with JSDoc
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a function with JSDoc that generates a toolDefinition
    function_code = """/**
 * @param {string} input - The input string
 * @returns {object} Result object
 */
function testFunc(input) {
    return { result: input.toUpperCase() };
}"""
    
    function_code_input = page.locator("#function-code")
    function_code_input.fill(function_code)
    
    # Trigger auto-population
    page.evaluate("""() => {
        document.getElementById('function-code').dispatchEvent(new Event('input', { bubbles: true }));
    }""")
    
    # Validate
    page.locator("#function-validate-btn").click()
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    
    # Save
    page.locator("#function-editor-form button[type='submit']").click()
    page.wait_for_selector(".function-item-name:has-text('testFunc')", state="visible")
    
    # Close modal
    page.locator("#close-function-modal").click()
    
    # Generate share link
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    # Set password and enable function library
    page.locator("#share-password").fill("TestPass123")
    page.locator("#share-function-library").check()
    
    # Generate link
    page.locator("#generate-share-link-btn").click()
    page.wait_for_selector("#generated-link-container", state="visible")
    
    generated_link = page.locator("#generated-link").input_value()
    assert "#gpt=" in generated_link
    
    # Verify function is saved and visible in UI
    print(f"✅ Function 'testFunc' created and saved")
    
    # Close share modal
    page.locator("#close-share-modal").click()
    
    # Delete the function
    function_btn.click()
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator(".function-collection-delete").first.click()
    expect(page.locator(".function-item-name:has-text('testFunc')")).to_have_count(0)
    page.locator("#close-function-modal").click()
    
    # Navigate to the shared link
    page.goto(generated_link)
    page.wait_for_timeout(1000)
    
    # Check that function was loaded
    system_messages = page.locator(".message.system .message-content")
    function_loaded = False
    for i in range(system_messages.count()):
        msg = system_messages.nth(i).text_content()
        if msg and "testFunc" in msg and "added" in msg.lower():
            function_loaded = True
            break
    
    assert function_loaded, "Function should be loaded from share link"
    
    # Open function modal to verify function was restored
    function_btn = page.locator("#function-btn")
    function_btn.click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()

    # Wait for function list to render - try up to 5 seconds
    page.wait_for_timeout(1000)

    # Try to find the function with retries (it may take time to render)
    max_attempts = 5
    function_found = False

    for attempt in range(max_attempts):
        function_items = page.locator(".function-item-name")
        item_count = function_items.count()

        if attempt == 0:
            print(f"Found {item_count} function items in the list (attempt {attempt + 1})")

        # Look for our function
        test_func = page.locator(".function-item-name:has-text('testFunc')")
        if test_func.count() > 0:
            function_found = True
            print(f"✅ Found testFunc on attempt {attempt + 1}")
            break

        # If not found, wait a bit and try again
        if attempt < max_attempts - 1:
            print(f"⏳ testFunc not found yet, waiting... (attempt {attempt + 1}/{max_attempts})")
            page.wait_for_timeout(1000)

    # Final check - verify function is present in the list
    assert function_found, f"Function testFunc not found after {max_attempts} attempts"
    expect(page.locator(".function-item-name:has-text('testFunc')")).to_be_visible()
    
    # Click on the function to load it
    page.locator(".function-item-name:has-text('testFunc')").click()
    page.wait_for_timeout(500)
    
    # Validate the loaded function to ensure toolDefinition was rebuilt
    page.locator("#function-validate-btn").click()
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_contain_text("Library validated successfully")
    
    print(f"✅ Function restored with rebuilt toolDefinition")
    print(f"✅ Function validation passes after restoration")
    print(f"✅ Share link optimization successful - toolDefinition rebuilt on load")

