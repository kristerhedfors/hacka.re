import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)
from function_calling_api.helpers.function_helpers import (
    cleanup_functions
)

def test_function_library_multi(page: Page, serve_hacka_re, api_key):
    """Test the multi-function library with @tool tag."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Enable tool calling and function tools
    enable_tool_calling_and_function_tools(page)
    
    # Open function modal
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check if the function name field is hidden
    function_name_collection = page.locator(".function-editor form .form-group").first
    expect(function_name_collection).to_have_css("display", "none")
    
    # Check if the function code editor has the multi-function placeholder
    function_code = page.locator("#function-code")
    placeholder = function_code.get_attribute("placeholder")
    assert "Helper function that formats data (not exposed to LLM)" in placeholder, f"Expected placeholder to contain helper function text, got: {placeholder}"
    assert "@tool" in placeholder, f"Expected placeholder to contain @tool, got: {placeholder}"
    
    # Fill in the function code with multiple functions
    function_code.fill("""/**
 * Helper function that formats data (not exposed to LLM)
 * @param {Object} data - The data to format
 * @returns {string} Formatted data
 */
function formatData(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Gets the current time in Berlin
 * @description Fetches the current time for Berlin timezone
 * @returns {Object} Current time information
 * @tool This function will be exposed to the LLM
 */
async function getCurrentTimeInBerlin() {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/Europe/Berlin');
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return {
      time: data.datetime,
      formatted: formatData(data)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} The result of the multiplication
 * @callable This function will be exposed to the LLM
 */
function multiply_numbers(a, b) {
  // Validate inputs are numbers
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  // Perform the multiplication
  const result = a * b;
  
  // Format the result using the auxiliary function
  const formattedResult = formatData(result);
  
  return {
    result: result,
    formattedResult: formattedResult,
    success: true
  };
}""")
    
    # Validate the functions
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    expect(validation_result).to_contain_text("Found 3 functions, 2 marked as callable")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the functions were added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    
    # Verify the helper function is not in the list
    expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()
    
    # Check if the callable functions are enabled by default
    function_checkboxes = function_list.locator("input[type='checkbox']")
    expect(function_checkboxes.first).to_be_checked()
    expect(function_checkboxes.nth(1)).to_be_checked()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Reopen the function modal to verify persistence
    page.locator("#function-btn").click()
    expect(function_modal).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    
    # Test the Reset button functionality
    # First, clear the editor
    function_code.fill("")
    
    # Click the Reset button
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains both functions
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" in code_content, f"Expected getCurrentTimeInBerlin in code, got: {code_content}"
    assert "multiply_numbers" in code_content, f"Expected multiply_numbers in code, got: {code_content}"
    
    # Clean up - delete the functions
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        page.wait_for_timeout(100)
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
