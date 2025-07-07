import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def test_function_bundle_preservation_when_editing(page: Page, serve_hacka_re):
    """
    Test that editing one function in a bundle preserves all other functions in the same bundle.
    
    This test verifies that:
    1. Multiple functions can be added together as a bundle
    2. Editing one function loads all functions from the bundle into the editor
    3. After editing, all functions in the bundle are still available
    """
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Click the settings button to configure API key
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Enter API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill("test-api-key")
    
    # Enable tool calling if available
    try:
        tool_calling_checkbox = page.locator("#tool-calling-enabled")
        if tool_calling_checkbox.is_visible():
            tool_calling_checkbox.check()
            print("Tool calling enabled")
    except:
        print("Tool calling checkbox not found, continuing...")
    
    # Save settings
    save_button = page.locator("#settings-form button[type='submit']")
    save_button.click()
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Wait a moment for UI to update
    time.sleep(0.5)
    
    # Open Function Modal (should be visible by default)
    function_button = page.locator("#function-btn")
    function_button.click()
    page.wait_for_selector("#function-modal.active", state="visible")
    
    # Add a bundle of three functions
    function_code_textarea = page.locator("#function-code")
    bundle_code = """/**
 * First function in the bundle
 * @description Adds two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function add(a, b) {
    return a + b;
}

/**
 * Second function in the bundle
 * @description Multiplies two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Product of a and b
 */
function multiply(a, b) {
    return a * b;
}

/**
 * Third function in the bundle
 * @description Subtracts second number from first
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Difference of a and b
 */
function subtract(a, b) {
    return a - b;
}"""
    
    function_code_textarea.fill(bundle_code)
    
    # Add the function bundle
    add_function_button = page.locator("#function-editor-form button[type='submit']")
    add_function_button.click()
    
    # Wait for validation message  
    page.wait_for_selector("#function-validation-result", state="visible", timeout=2000)
    
    # Verify all three functions are listed
    function_list = page.locator("#function-list")
    expect(function_list).to_contain_text("add")
    expect(function_list).to_contain_text("multiply") 
    expect(function_list).to_contain_text("subtract")
    
    # Get the initial function count
    function_items = page.locator(".function-item")
    initial_count = function_items.count()
    print(f"Initial function count: {initial_count}")
    
    # Click on the first function (add) to edit it
    add_function_item = page.locator(".function-item").filter(has_text="add").first
    add_function_item.click()
    
    # Wait for the function to load into the editor
    time.sleep(0.5)
    
    # Verify all three functions are loaded into the editor
    editor_content = function_code_textarea.input_value()
    print(f"Editor content length: {len(editor_content)}")
    assert "function add(" in editor_content, "add function should be in editor"
    assert "function multiply(" in editor_content, "multiply function should be in editor"
    assert "function subtract(" in editor_content, "subtract function should be in editor"
    
    # Modify the add function (just add a comment)
    modified_code = editor_content.replace(
        "function add(a, b) {\n    return a + b;\n}",
        "function add(a, b) {\n    // Modified function\n    return a + b;\n}"
    )
    
    function_code_textarea.fill(modified_code)
    
    # Save the modified function bundle
    add_function_button.click()
    
    # Wait for validation message
    page.wait_for_selector("#function-validation-result", state="visible", timeout=2000)
    
    # Verify all three functions are still present
    final_count = function_items.count()
    print(f"Final function count: {final_count}")
    
    expect(function_list).to_contain_text("add")
    expect(function_list).to_contain_text("multiply")
    expect(function_list).to_contain_text("subtract")
    
    # Verify the count hasn't changed (no functions were lost)
    assert final_count == initial_count, f"Function count changed from {initial_count} to {final_count}"
    
    # Click on the modified add function to verify the edit was saved
    add_function_item = page.locator(".function-item").filter(has_text="add").first
    add_function_item.click()
    
    # Wait for the function to load
    time.sleep(0.5)
    
    # Verify the modification is present and all functions are still there
    final_editor_content = function_code_textarea.input_value()
    assert "// Modified function" in final_editor_content, "Modification should be preserved"
    assert "function add(" in final_editor_content, "add function should still be present"
    assert "function multiply(" in final_editor_content, "multiply function should still be present"
    assert "function subtract(" in final_editor_content, "subtract function should still be present"
    
    print("✅ Test passed: Function bundle preservation when editing works correctly!")
    
    # Close the modal
    close_button = page.locator("#close-function-modal")
    close_button.click()
    page.wait_for_selector("#function-modal", state="hidden")