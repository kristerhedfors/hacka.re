import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_function_collection_preservation(page: Page, serve_hacka_re):
    """Test that editing a function preserves the original collection name and metadata."""
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
    
    # First, create a test function collection
    function_code = page.locator("#function-code")
    function_code.scroll_into_view_if_needed()
    expect(function_code).to_be_visible()
    
    # Create a test function collection with multiple functions
    test_function_code = """/**
 * Test multiplication function
 * @description A function that multiplies two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {Object} Object containing the result
 */
function multiply_test(a, b) {
  return {
    result: a * b,
    operation: 'multiply'
  };
}

/**
 * Test addition function
 * @description A function that adds two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {Object} Object containing the result
 */
function add_test(a, b) {
  return {
    result: a + b,
    operation: 'add'
  };
}"""
    
    function_code.fill(test_function_code)
    
    # Check that the function name field was auto-populated
    function_name = page.locator("#function-name")
    expect(function_name).to_have_value("multiply_test")
    
    # Validate the function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.scroll_into_view_if_needed()
    expect(validate_btn).to_be_visible()
    validate_btn.click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible")
    expect(validation_result).to_contain_text("validated successfully")
    
    # Submit the form to add the function collection
    submit_btn = page.locator("#function-editor-form button[type='submit']")
    submit_btn.scroll_into_view_if_needed()
    expect(submit_btn).to_be_visible()
    
    # Since we're in test environment, we expect the collection to be named based on the first function
    submit_btn.click()
    
    # Wait for the functions to be added
    # page.wait_for_timeout(1000)  # TODO: Replace with proper wait condition
    
    # Check if both functions were added to the list
    function_list = page.locator("#function-list")
    multiply_item = function_list.locator(".function-item-name:has-text('multiply_test')")
    add_item = function_list.locator(".function-item-name:has-text('add_test')")
    
    page.wait_for_selector(".function-item-name:has-text('multiply_test')", state="visible")
    expect(multiply_item).to_be_visible()
    expect(add_item).to_be_visible()
    
    # Take a screenshot of the function list with both functions
    screenshot_with_markdown(page, "function_collection_before_edit.png", {
        "Status": "Function collection with both functions",
        "Function Names": "multiply_test, add_test"
    })
    
    # Get the collection name from the first function's collection header
    # Look for the collection header
    collection_header = page.locator(".function-collection-header h4").first
    expect(collection_header).to_be_visible()
    original_collection_name = collection_header.text_content()
    print(f"Original collection name: {original_collection_name}")
    
    # Now click on the multiply function to edit it
    multiply_item_container = function_list.locator(".function-item").filter(has_text="multiply_test").locator("div").nth(1)
    multiply_item_container.scroll_into_view_if_needed()
    expect(multiply_item_container).to_be_visible()
    multiply_item_container.click()
    
    # Add a small wait to ensure the function code is loaded
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Check that the function code and name are loaded into the editor
    expect(function_name).to_have_value("multiply_test")
    
    # Get the actual value of the function code
    function_code_value = function_code.input_value()
    print(f"Function code value: {function_code_value}")
    
    # Check that the function code contains both functions (collection is loaded)
    assert "function multiply_test" in function_code_value, "Function code does not contain multiply_test"
    assert "function add_test" in function_code_value, "Function code does not contain add_test"
    
    # Take a screenshot of the editor with the loaded collection
    screenshot_with_markdown(page, "function_collection_loaded.png", {
        "Status": "Function collection loaded into editor for editing",
        "Function Names": "multiply_test, add_test"
    })
    
    # Modify the multiply function code
    modified_function_code = """/**
 * Test multiplication function - MODIFIED
 * @description A function that multiplies two numbers with enhanced features
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {Object} Object containing the result
 */
function multiply_test(a, b) {
  return {
    result: a * b,
    operation: 'multiply',
    modified: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Test addition function
 * @description A function that adds two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {Object} Object containing the result
 */
function add_test(a, b) {
  return {
    result: a + b,
    operation: 'add'
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
    # page.wait_for_timeout(1000)  # TODO: Replace with proper wait condition
    
    # Check for success message
    validation_text = validation_result.text_content()
    print(f"Validation result text: {validation_text}")
    assert "added successfully" in validation_text, "Success message not found after update"
    
    # Take a screenshot of the success message
    screenshot_with_markdown(page, "function_collection_update_success.png", {
        "Status": "Function collection updated successfully",
        "Function Names": "multiply_test, add_test"
    })
    
    # Check that both functions are still in the list
    expect(multiply_item).to_be_visible()
    expect(add_item).to_be_visible()
    
    # CRITICAL TEST: Check that the collection name is preserved (not "Untitled Collection")
    updated_collection_header = page.locator(".function-collection-header h4").first
    expect(updated_collection_header).to_be_visible()
    updated_collection_name = updated_collection_header.text_content()
    print(f"Updated collection name: {updated_collection_name}")
    
    # The collection name should be preserved (not "Untitled Collection")
    assert original_collection_name == updated_collection_name, f"Collection name changed from '{original_collection_name}' to '{updated_collection_name}'"
    assert "Untitled Collection" not in updated_collection_name, "Collection name should not be 'Untitled Collection'"
    
    # Take a screenshot showing the preserved collection name
    screenshot_with_markdown(page, "function_collection_preserved.png", {
        "Status": "Function collection name preserved after editing",
        "Collection Name": updated_collection_name,
        "Function Names": "multiply_test, add_test"
    })
    
    # Click on the multiply function again to verify the changes were saved
    multiply_item_container.click()
    
    # Add a small wait to ensure the function code is loaded
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Get the actual value of the modified function code
    function_code_value = function_code.input_value()
    print(f"Modified function code value: {function_code_value}")
    
    # Check that the modified function code contains the expected text
    assert "MODIFIED" in function_code_value, "Function code does not contain 'MODIFIED'"
    assert "timestamp" in function_code_value, "Function code does not contain 'timestamp'"
    
    # Check that both functions are still present in the editor
    assert "function multiply_test" in function_code_value, "Modified function code does not contain multiply_test"
    assert "function add_test" in function_code_value, "Modified function code does not contain add_test"
    
    # Take a screenshot of the editor with the updated function
    screenshot_with_markdown(page, "function_collection_updated.png", {
        "Status": "Updated function collection loaded into editor",
        "Function Names": "multiply_test, add_test"
    })
    
    # Clean up - delete the test functions collection
    delete_button = page.locator(".function-collection-delete").first
    delete_button.scroll_into_view_if_needed()
    expect(delete_button).to_be_visible()
    
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    delete_button.click()
    
    # Check if the functions were removed
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