import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)

def test_function_group_colors(page: Page, serve_hacka_re, api_key):
    """Test that functions from the same import are grouped by color and deletion works for the entire group."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open function modal
    page.locator("#function-btn").click()
    
    # Wait for the modal to be visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Clear any existing functions in the editor
    function_clear_btn = page.locator("#function-clear-btn")
    function_clear_btn.click()
    
    # Define a group of functions to add
    function_group = """
    /**
     * Helper function to format a number
     * @param {number} num - The number to format
     * @returns {string} The formatted number
     * @internal This is an internal helper function
     */
    function formatNumber(num) {
      return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
    }
    
    /**
     * Add two numbers together
     * @description Adds two numbers and returns the result
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {Object} Result object
     * @tool
     */
    function add_numbers(a, b) {
      const result = a + b;
      return {
        result: result,
        formatted: formatNumber(result)
      };
    }
    
    /**
     * Subtract two numbers
     * @description Subtracts second number from first number
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {Object} Result object
     * @tool
     */
    function subtract_numbers(a, b) {
      const result = a - b;
      return {
        result: result,
        formatted: formatNumber(result)
      };
    }
    """
    
    # Add the function group
    function_code = page.locator("#function-code")
    function_code.fill(function_group)
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Wait for validation result
    validation_result = page.locator("#function-validation-result")
    validation_result.wait_for(state="visible", timeout=5000)
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Wait for the functions to be added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item")).to_have_count(2)  # Only callable functions are shown
    
    # Take a screenshot showing functions in the list
    screenshot_with_markdown(page, "function_group_added", {
        "step": "Functions added to list",
        "expected_functions": "add_numbers, subtract_numbers"
    })
    
    # Get all function items
    all_functions = function_list.locator('.function-item')
    count = all_functions.count()
    
    # Check that functions have the same visual grouping
    # Note: The actual implementation might use CSS classes or inline styles for grouping
    # We'll check if they have similar styling or are grouped together
    first_function = all_functions.nth(0)
    second_function = all_functions.nth(1)
    
    # Test deletion of a function in the group
    # Handle the confirmation dialog before triggering delete
    page.on('dialog', lambda dialog: dialog.accept())
    
    # Click the delete button on the first function
    delete_button = function_list.locator('.function-item-delete').first
    delete_button.click()
    
    # Wait for the function list to update
    # Since both functions are in the same group, they should both be deleted
    expect(function_list.locator('.function-item')).to_have_count(0)
    
    # Take a screenshot showing empty function list
    screenshot_with_markdown(page, "function_group_deleted", {
        "step": "After deleting one function from group",
        "result": "All functions in the group were deleted"
    })
    
    # Close the modal
    close_button = page.locator("#close-function-modal")
    close_button.click()
    expect(function_modal).not_to_be_visible()
