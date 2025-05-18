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
    expect(page.locator('.modal.function-modal')).to_be_visible()
    
    # Clear any existing functions in the editor
    page.click('button:text("Clear")')
    
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
    page.fill('textarea.function-code-editor', function_group)
    page.click('button:text("Validate")')
    page.click('button:text("Add Function")')
    
    # Wait for the functions to be added to the list
    expect(page.locator('.function-item')).to_have_count(2)  # Only callable functions are shown
    
    # Get the first function item
    first_function = page.locator('.function-item').first
    
    # Get the group color from the first function
    group_color = first_function.get_attribute('data-group-color')
    
    # Verify that all functions have the same group color
    all_functions = page.locator('.function-item')
    count = all_functions.count()
    for i in range(count):
        function_item = all_functions.nth(i)
        expect(function_item).to_have_attribute('data-group-color', group_color)
        
        # Verify that the function has the correct border color
        # We can't directly check CSS variables, but we can check that the border-left style is set
        expect(function_item).to_have_js_property('style.borderLeftWidth', '4px')
    
    # Test deletion of a function in the group
    # First, get the count of functions
    initial_count = page.locator('.function-item').count()
    
    # Click the delete button on the first function
    page.locator('.function-item-delete').first.click()
    
    # Handle the confirmation dialog - we need to listen for it before triggering
    page.on('dialog', lambda dialog: dialog.accept())
    
    # Wait for the function list to update
    expect(page.locator('.function-item')).to_have_count(0)
    
    # Verify that all functions in the group were deleted
    expect(page.locator('.function-item')).to_have_count(0)
    
    # Close the modal
    page.click('button.close-modal')
