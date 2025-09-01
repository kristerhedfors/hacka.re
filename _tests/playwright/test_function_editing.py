import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_function_editing(page: Page, serve_hacka_re):
    """Test editing existing functions by clicking them in the list."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    # Check if the function calling button exists
    function_btn = page.locator("#function-btn")
    expect(function_btn).to_be_visible()
    
    # Click the function calling button
    function_btn.click()
    
    # Check if the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # First, create a test function
    function_code = page.locator("#function-code")
    function_code.scroll_into_view_if_needed()
    expect(function_code).to_be_visible()
    
    # Create a simple test function
    test_function_code = """/**
 * Test function for editing
 * @description A simple test function that can be edited
 * @param {string} message - The message to echo
 * @returns {Object} Object containing the echoed message
 */
function test_edit_function(message) {
  return {
    echo: message,
    timestamp: new Date().toISOString()
  };
}"""
    
    function_code.fill(test_function_code)
    
    # Check that the function name field was auto-populated
    function_name = page.locator("#function-name")
    # Note: function name field might be hidden but still have a value
    expect(function_name).to_have_value("test_edit_function")
    
    # Validate the function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.scroll_into_view_if_needed()
    expect(validate_btn).to_be_visible()
    validate_btn.click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    expect(validation_result).to_contain_text("validated successfully")
    
    # Submit the form to add the function
    submit_btn = page.locator("#function-editor-form button[type='submit']")
    submit_btn.scroll_into_view_if_needed()
    expect(submit_btn).to_be_visible()
    submit_btn.click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    function_item = function_list.locator(".function-item-name:has-text('test_edit_function')")
    page.wait_for_selector(".function-item-name:has-text('test_edit_function')", state="visible")
    expect(function_item).to_be_visible()
    
    # Take a screenshot of the function list with the new function
    screenshot_with_markdown(page, "function_list_before_edit.png", {
        "Status": "Function list with newly created function",
        "Function Name": "test_edit_function"
    })
    
    # Now click on the function item to edit it
    function_item_container = function_list.locator(".function-item").filter(has_text="test_edit_function").locator("div").nth(1)
    function_item_container.scroll_into_view_if_needed()
    expect(function_item_container).to_be_visible()
    function_item_container.click()
    
    # Add a small wait to ensure the function code is loaded
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check that the function code and name are loaded into the editor
    expect(function_name).to_have_value("test_edit_function")
    
    # Get the actual value of the function code
    function_code_value = function_code.input_value()
    print(f"Function code value: {function_code_value}")
    
    # Check that the function code contains the expected text
    assert "function test_edit_function" in function_code_value, "Function code does not contain the expected function name"
    
    # Take a screenshot of the editor with the loaded function
    screenshot_with_markdown(page, "function_editor_loaded.png", {
        "Status": "Function loaded into editor for editing",
        "Function Name": "test_edit_function"
    })
    
    # Modify the function code
    modified_function_code = """/**
 * Test function for editing - MODIFIED
 * @description A simple test function that has been edited
 * @param {string} message - The message to echo
 * @param {boolean} uppercase - Whether to convert the message to uppercase
 * @returns {Object} Object containing the processed message
 */
function test_edit_function(message, uppercase) {
  if (uppercase) {
    message = message.toUpperCase();
  }
  
  return {
    echo: message,
    modified: true,
    timestamp: new Date().toISOString()
  };
}"""
    
    function_code.fill(modified_function_code)
    
    # Validate the modified function
    validate_btn.click()
    
    # Check for validation result
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    expect(validation_result).to_contain_text("validated successfully")
    
    # Submit the form to update the function
    submit_btn.click()
    
    # Wait a moment for the form submission to complete
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check for success message - note that it might be hidden but still have content
    validation_text = validation_result.text_content()
    print(f"Validation result text: {validation_text}")
    assert "added successfully" in validation_text, "Success message not found after update"
    
    # Take a screenshot of the success message
    screenshot_with_markdown(page, "function_update_success.png", {
        "Status": "Function updated successfully",
        "Function Name": "test_edit_function"
    })
    
    # Check that the function is still in the list
    expect(function_item).to_be_visible()
    
    # Click on the function again to verify the changes were saved
    function_item_container.click()
    
    # Add a small wait to ensure the function code is loaded
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Get the actual value of the modified function code
    function_code_value = function_code.input_value()
    print(f"Modified function code value: {function_code_value}")
    
    # Check that the modified function code contains the expected text
    assert "MODIFIED" in function_code_value, "Function code does not contain 'MODIFIED'"
    assert "uppercase" in function_code_value, "Function code does not contain 'uppercase'"
    
    # Take a screenshot of the editor with the updated function
    screenshot_with_markdown(page, "function_editor_updated.png", {
        "Status": "Updated function loaded into editor",
        "Function Name": "test_edit_function"
    })
    
    # Verify that the function remains in the editor after saving
    # This is the new behavior - the function should stay in the editor for further editing
    function_code_value = function_code.input_value()
    print(f"Function code after saving: {function_code_value}")
    
    # Check that the function code still contains the expected text
    assert "MODIFIED" in function_code_value, "Function code does not remain in editor after saving"
    assert "uppercase" in function_code_value, "Function code does not remain in editor after saving"
    
    # Take a screenshot showing the function remains in the editor
    screenshot_with_markdown(page, "function_remains_in_editor.png", {
        "Status": "Function remains in editor after saving",
        "Function Name": "test_edit_function"
    })
    
    # Delete the test function
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
    close_btn = page.locator("#close-function-modal")
    close_btn.scroll_into_view_if_needed()
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    # Verify the modal is closed
    expect(function_modal).not_to_be_visible()
