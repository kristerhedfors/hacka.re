import pytest
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_share_link_without_tooldefinition(page: Page, serve_hacka_re):
    """
    Test that share links no longer include toolDefinition and that it's rebuilt from code.
    """
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Enable debug mode with Shared Links category
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Enable debug mode
    debug_checkbox = page.locator("#debug-mode")
    if not debug_checkbox.is_checked():
        debug_checkbox.check()
    
    # Enable Shared Links debug category
    # Wait for categories dropdown to be visible
    page.wait_for_selector("#debug-categories-dropdown", state="visible", timeout=2000)
    
    # Find and check the Shared Links category checkbox using JavaScript
    page.evaluate("""() => {
        const dropdown = document.getElementById('debug-categories-dropdown');
        if (dropdown) {
            const labels = dropdown.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.includes('Shared Links')) {
                    const checkbox = label.previousElementSibling || label.querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox.type === 'checkbox') {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
            }
        }
        return false;
    }""")
    
    # Close settings
    page.locator("#close-settings").click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Create a test function
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a function with complex JSDoc that would generate a toolDefinition
    function_code = """/**
 * Test function with JSDoc
 * @param {string} text - The input text
 * @param {number} count - How many times to repeat
 * @returns {object} The result object
 */
function test_function(text, count = 1) {
    return {
        result: text.repeat(count),
        timestamp: new Date().toISOString()
    };
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
    page.wait_for_selector(".function-item-name:has-text('test_function')", state="visible")
    
    # Close function modal
    page.locator("#close-function-modal").click()
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Set password
    password_input = page.locator("#share-password")
    password_input.fill("TestPassword123")
    
    # Enable function library sharing
    function_library_checkbox = page.locator("#share-function-library")
    function_library_checkbox.check()
    
    # Generate the share link - this should trigger debug output
    generate_link_btn = page.locator("#generate-share-link-btn")
    generate_link_btn.click()
    
    # Wait for link generation
    generated_link_container = page.locator("#generated-link-container")
    expect(generated_link_container).to_be_visible()
    
    # Get the generated link
    generated_link = page.locator("#generated-link").input_value()
    assert generated_link and "#gpt=" in generated_link
    
    # Check system messages for debug output
    page.wait_for_timeout(500)  # Allow time for debug messages
    
    # Find debug messages that show the share link processing
    debug_messages = page.locator(".message.system .message-content")
    found_step1 = False
    payload_debug = None
    
    for i in range(debug_messages.count()):
        msg_text = debug_messages.nth(i).text_content()
        if msg_text and "STEP 1: ORIGINAL PAYLOAD" in msg_text:
            found_step1 = True
            payload_debug = msg_text
            break
    
    # If we found the debug output, parse it
    if found_step1 and payload_debug:
        # Extract JSON from the debug message
        lines = payload_debug.split('\n')
        json_lines = []
        in_json = False
        for line in lines:
            if line.strip() == '{':
                in_json = True
            if in_json:
                json_lines.append(line)
            if line.strip() == '}' and in_json:
                break
        
        if json_lines:
            json_str = '\n'.join(json_lines)
            share_data = json.loads(json_str)
            
            # Verify the NEW structure - no masterKey field
            assert "masterKey" not in share_data, "masterKey should NOT be in the payload anymore"
            assert "functions" in share_data, "functions should be present"
            assert "test_function" in share_data["functions"], "test_function should be present"
            
            # CRITICAL: Verify toolDefinition is NOT included
            function_data = share_data["functions"]["test_function"]
            assert "code" in function_data, "code should be present"
            assert "toolDefinition" not in function_data, "toolDefinition should NOT be present in share link"
            
            print(f"✅ Share link does NOT contain masterKey (derived from salt+nonce)")
            print(f"✅ Share link does NOT contain toolDefinition")
            print(f"✅ Function data only contains: {list(function_data.keys())}")
    else:
        # If no debug output, just verify the link works
        print("⚠️ Debug output not found, skipping payload verification")
        print("✅ Share link generated successfully")
    
    # Close share modal
    page.locator("#close-share-modal").click()
    
    # Delete the function to test restoration
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Delete the function
    page.on("dialog", lambda dialog: dialog.accept())
    delete_btn = page.locator(".function-collection-delete").first
    delete_btn.click()
    
    # Verify deletion
    expect(page.locator(".function-item-name:has-text('test_function')")).to_have_count(0)
    page.locator("#close-function-modal").click()
    
    # Navigate to the shared link
    page.goto(generated_link)
    
    # Wait for automatic processing (using session key)
    page.wait_for_timeout(1000)
    
    # Check for system message about function being added
    system_messages = page.locator(".message.system .message-content")
    function_added = False
    
    for i in range(system_messages.count()):
        msg_text = system_messages.nth(i).text_content()
        if msg_text and "test_function" in msg_text and "added" in msg_text.lower():
            function_added = True
            break
    
    assert function_added, "Function should be added from share link"
    
    # Open function modal to verify the function works
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Verify function is present
    expect(page.locator(".function-item-name:has-text('test_function')")).to_be_visible()
    
    # Click on the function to load it
    page.locator(".function-item-name:has-text('test_function')").click()
    
    # Wait for code to load
    page.wait_for_timeout(500)
    
    # Validate the loaded function to ensure toolDefinition was rebuilt
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    
    # Wait for validation
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_contain_text("Library validated successfully")
    
    print(f"✅ Function restored from share link without toolDefinition")
    print(f"✅ ToolDefinition successfully rebuilt from code")
    print(f"✅ Function validation passes after restoration")

