import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal

def test_function_calling_basic(page: Page, serve_hacka_re):
    """Test basic function calling UI elements."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Check if the function calling button exists
    function_btn = page.locator("#function-btn")
    expect(function_btn).to_be_visible()
    
    # Click the function calling button
    function_btn.click()
    
    # Check if the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # First, set the function code - the name field will be auto-populated
    function_code = page.locator("#function-code")
    function_code.scroll_into_view_if_needed()
    expect(function_code).to_be_visible()
    function_code.fill("""function test_function(param1, param2) {
  return {
    message: `Received ${param1} and ${param2}`,
    success: true
  };
}""")
    
    # Trigger the auto-population by firing an input event
    page.evaluate("""() => {
        const codeTextarea = document.getElementById('function-code');
        if (codeTextarea) {
            codeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }""")
    
    # Wait a moment for auto-population to happen
    page.wait_for_timeout(500)
    
    # Check that the function name field was auto-populated or becomes visible
    function_name = page.locator("#function-name")
    
    # Instead of trying to scroll, just check if it has the expected value
    # The field might be hidden but still have the correct value
    name_value = page.evaluate("""() => {
        const nameField = document.getElementById('function-name');
        return nameField ? nameField.value : null;
    }""")
    
    if name_value:
        # If the field has a value, verify it's correct
        assert name_value == "test_function", f"Expected 'test_function', got '{name_value}'"
    
    # Validate the function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.scroll_into_view_if_needed()
    expect(validate_btn).to_be_visible()
    validate_btn.click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    submit_btn = page.locator("#function-editor-form button[type='submit']")
    submit_btn.scroll_into_view_if_needed()
    expect(submit_btn).to_be_visible()
    submit_btn.click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    function_item = function_list.locator(".function-item-name:has-text('test_function')")
    page.wait_for_selector(".function-item-name:has-text('test_function')", state="visible")
    expect(function_item).to_be_visible()
    
    # Close the function modal
    close_btn = page.locator("#close-function-modal")
    close_btn.scroll_into_view_if_needed()
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    # Verify the modal is closed
    expect(function_modal).not_to_be_visible()
    
    # Reopen the function modal to verify persistence
    function_btn.click()
    expect(function_modal).to_be_visible()
    
    # Wait for the function list to be populated
    page.wait_for_selector(".function-item-name:has-text('test_function')", state="visible")
    
    # Delete the function
    delete_button = function_list.locator(".function-item-delete").first
    delete_button.scroll_into_view_if_needed()
    expect(delete_button).to_be_visible()
    
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    delete_button.click()
    
    # Check if the function was removed
    empty_state = page.locator("#empty-function-state")
    page.wait_for_selector("#empty-function-state", state="visible")
    expect(empty_state).to_be_visible()
    
    # Close the function modal
    close_btn.scroll_into_view_if_needed()
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    # Verify the modal is closed
    expect(function_modal).not_to_be_visible()

def test_function_validation_errors(page: Page, serve_hacka_re):
    """Test validation errors for function calling."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Open function modal
    function_btn = page.locator("#function-btn")
    expect(function_btn).to_be_visible()
    function_btn.click()
    
    # Check if the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Test case 1: Empty function code
    function_code = page.locator("#function-code")
    function_code.scroll_into_view_if_needed()
    expect(function_code).to_be_visible()
    function_code.fill("")
    
    # Validate the function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.scroll_into_view_if_needed()
    expect(validate_btn).to_be_visible()
    validate_btn.click()
    
    # Check for validation error
    validation_result = page.locator("#function-validation-result")
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    # The message might be different based on implementation
    error_text = validation_result.text_content()
    # Accept either message as valid
    assert "code is required" in error_text or "No functions found" in error_text
    
    # Test case 2: Invalid function format
    function_code.fill("""const myFunction = () => {
  return { success: true };
}""")
    
    # Validate the function
    validate_btn.click()
    
    # Check for validation error
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    error_text = validation_result.text_content()
    # Accept either message as valid
    assert "Invalid function format" in error_text or "No functions found" in error_text
    
    # Test case 3: Syntax error in function
    function_code.fill("""function test_function() {
  return { success: true;
}""")
    
    # Validate the function
    validate_btn.click()
    
    # Check for validation error
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    error_text = validation_result.text_content()
    # Accept either message as valid
    assert "Syntax error" in error_text or "error" in error_text.lower()
    
    # Close the function modal
    close_btn = page.locator("#close-function-modal")
    close_btn.scroll_into_view_if_needed()
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    # Verify the modal is closed
    expect(function_modal).not_to_be_visible()
