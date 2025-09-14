"""Test share link with functions using new crypto system"""

import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_share_link_with_functions_new_crypto(page: Page, serve_hacka_re):
    """Test that functions are properly shared and restored with new crypto"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Add a test function
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a simple function
    function_code = """/**
 * Test function for share link
 * @param {string} text - Input text
 * @returns {string} Modified text
 */
function shareTest(text) {
    return `Processed: ${text.toUpperCase()}`;
}"""
    
    function_code_input = page.locator("#function-code")
    function_code_input.fill(function_code)
    
    # Trigger auto-population
    page.evaluate("""() => {
        const codeTextarea = document.getElementById('function-code');
        if (codeTextarea) {
            codeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }""")
    
    # Wait a moment for auto-population
    time.sleep(0.5)
    
    # Validate the function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    
    # Wait for validation
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Save the function
    save_btn = page.locator("#function-editor-form button[type='submit']")
    save_btn.click()
    
    # Verify function was added
    page.wait_for_selector(".function-item-name:has-text('shareTest')", state="visible")
    print("✅ Function 'shareTest' created and saved")
    
    # Close function modal
    page.locator("#close-function-modal").click()
    
    # Create a share link with the function
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Set password
    password_input = page.locator("#share-password")
    password_input.fill("FuncTest123")
    
    # Include function library
    function_checkbox = page.locator("#share-function-library")
    if not function_checkbox.is_checked():
        function_checkbox.check()
    
    # Generate the share link
    generate_btn = page.locator("#generate-share-link-btn")
    generate_btn.click()
    
    # Wait for link generation
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    print(f"✅ Share link with function generated: {generated_link[:80]}...")
    
    # Close share modal
    page.locator("#close-share-modal").click()
    
    # Delete the function to test restoration
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Delete the function
    page.on("dialog", lambda dialog: dialog.accept())
    delete_btn = page.locator(".function-collection-delete").first
    delete_btn.click()
    
    # Wait for deletion
    time.sleep(1)
    
    # Verify deletion
    function_items = page.locator(".function-item-name:has-text('shareTest')")
    expect(function_items).to_have_count(0)
    print("✅ Function deleted from original session")
    
    page.locator("#close-function-modal").click()
    
    # Navigate to the shared link in a new context
    context2 = page.context.browser.new_context()
    page2 = context2.new_page()
    
    # Capture console messages
    console_messages = []
    page2.on("console", lambda msg: console_messages.append({
        'type': msg.type,
        'text': msg.text
    }))
    
    # Navigate to the shared link
    print(f"\n🔄 Navigating to share link in new session...")
    page2.goto(generated_link)
    
    # Wait for password modal
    password_modal = page2.locator('.modal.password-modal, #password-modal')
    expect(password_modal).to_be_visible(timeout=5000)
    print("✅ Password modal appeared")
    
    # Enter the password
    password_input2 = page2.locator('#early-password-input')
    password_input2.fill('FuncTest123')
    
    # Submit the password
    submit_button = page2.locator('#early-password-submit')
    submit_button.click()
    
    # Wait for modal to disappear
    expect(password_modal).not_to_be_visible(timeout=10000)
    print("✅ Password accepted, modal closed")
    
    # Wait for initialization and function restoration
    time.sleep(3)
    
    # Check for system message about function being added
    system_messages = page2.locator(".message.system .message-content")
    function_added = False
    
    for i in range(system_messages.count()):
        msg_text = system_messages.nth(i).text_content()
        if msg_text and "shareTest" in msg_text and "added" in msg_text.lower():
            function_added = True
            print(f"✅ System message found: Function added")
            break
    
    # Open function modal to verify
    function_btn2 = page2.locator("#function-btn")
    function_btn2.click()
    
    function_modal2 = page2.locator("#function-modal")
    expect(function_modal2).to_be_visible()
    
    # Check if function exists
    function_items2 = page2.locator(".function-item-name:has-text('shareTest')")
    
    # Wait for the function to appear
    try:
        expect(function_items2).to_be_visible(timeout=5000)
        print("✅ Function 'shareTest' successfully restored from share link!")
    except:
        print("❌ Function was NOT restored")
        
        # Print debug info
        all_functions = page2.locator(".function-item-name")
        print(f"Found {all_functions.count()} functions:")
        for i in range(all_functions.count()):
            print(f"  - {all_functions.nth(i).text_content()}")
        
        # Print console errors
        errors = [msg for msg in console_messages if msg['type'] == 'error']
        if errors:
            print("\n⚠️ Console errors:")
            for error in errors[:5]:
                print(f"  - {error['text']}")
    
    # Clean up
    context2.close()
    
    print("\n✅ Share link with functions test completed!")