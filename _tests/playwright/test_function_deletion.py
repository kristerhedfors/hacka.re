import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, timed_test, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)
from function_calling_api.helpers.function_helpers import (
    cleanup_functions
)

def test_function_deletion_removes_helper_functions(page: Page, serve_hacka_re, api_key):
    """Test that deleting a function also removes its helper functions."""
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
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add multiple functions with helper functions
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Helper function that formats data (not exposed to LLM)
 * @param {Object} data - The data to format
 * @returns {string} Formatted data
 */
function formatData(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Another helper function
 * @param {string} str - The string to process
 * @returns {string} Processed string
 */
function processString(str) {
  return str.toUpperCase();
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
      formatted: formatData(data),
      processed: processString(data.datetime)
    };
  } catch (error) {
    return { error: error.message };
  }
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the callable function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    
    # Verify the helper functions are not in the list (they're not callable)
    expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('processString')")).not_to_be_visible()
    
    # Take a screenshot showing the function list
    screenshot_with_markdown(page, "function_deletion_before", {
        "step": "Before deletion - only callable function is visible in the list",
        "function_visible": "getCurrentTimeInBerlin",
        "functions_not_visible": "formatData, processString (helper functions)"
    })
    
    # Clear the editor
    function_code.fill("")
    
    # Click the Reset button to load all functions
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains all functions
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" in code_content, "getCurrentTimeInBerlin function not found in editor"
    assert "formatData" in code_content, "formatData function not found in editor"
    assert "processString" in code_content, "processString function not found in editor"
    
    # Take a screenshot showing all functions in the editor
    screenshot_with_markdown(page, "function_deletion_reset", {
        "step": "After Reset - all functions are loaded in the editor",
        "functions_in_editor": "getCurrentTimeInBerlin, formatData, processString"
    })
    
    # Now delete the callable function
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete the function
    function_list.locator(".function-item-delete").first.click()
    
    # Wait for the function to be deleted
    page.wait_for_timeout(100)
    
    # Verify the function list is empty
    expect(function_list.locator(".function-item-name")).not_to_be_visible()
    
    # Clear the editor again
    function_code.fill("")
    
    # Click the Reset button again
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains the default function code
    # and NOT the previously deleted functions
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" not in code_content, "getCurrentTimeInBerlin function should not be in editor"
    assert "formatData" not in code_content, "formatData function should not be in editor"
    assert "processString" not in code_content, "processString function should not be in editor"
    
    # Take a screenshot showing the editor after deletion
    screenshot_with_markdown(page, "function_deletion_after", {
        "step": "After deletion - all functions (including helpers) are removed",
        "functions_not_in_editor": "getCurrentTimeInBerlin, formatData, processString"
    })
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_multiple_function_groups(page: Page, serve_hacka_re, api_key):
    """Test that multiple function groups are handled correctly."""
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
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add first function group
    function_code = page.locator("#function-code")
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
}""")
    
    # Validate and submit the first function group
    page.locator("#function-validate-btn").click()
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the first callable function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    
    # Add second function group
    function_code.fill("""/**
 * Helper function for string operations
 * @param {string} str - The string to process
 * @returns {string} Processed string
 */
function processString(str) {
  return str.toUpperCase();
}

/**
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} The result of the multiplication
 * @tool This function will be exposed to the LLM
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
  
  // Format the result
  const formattedResult = processString(`Result: ${result}`);
  
  return {
    result: result,
    formattedResult: formattedResult,
    success: true
  };
}""")
    
    # Validate and submit the second function group
    page.locator("#function-validate-btn").click()
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if both callable functions are in the list
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    
    # Take a screenshot showing both functions in the list
    screenshot_with_markdown(page, "function_groups_both", {
        "step": "Both function groups added",
        "functions_visible": "getCurrentTimeInBerlin, multiply_numbers",
        "functions_not_visible": "formatData, processString (helper functions)"
    })
    
    # Clear the editor
    function_code.fill("")
    
    # Click the Reset button to load all functions
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains all functions from both groups
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" in code_content, "getCurrentTimeInBerlin function not found in editor"
    assert "formatData" in code_content, "formatData function not found in editor"
    assert "multiply_numbers" in code_content, "multiply_numbers function not found in editor"
    assert "processString" in code_content, "processString function not found in editor"
    
    # Delete the first function
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete getCurrentTimeInBerlin
    function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')").first.click()
    page.locator(".function-item-delete").first.click()
    
    # Wait for the function to be deleted
    page.wait_for_timeout(100)
    
    # Verify only multiply_numbers remains in the list
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).not_to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    
    # Clear the editor again
    function_code.fill("")
    
    # Click the Reset button again
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains only the second function group
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" not in code_content, "getCurrentTimeInBerlin function should not be in editor"
    assert "formatData" not in code_content, "formatData function should not be in editor"
    assert "multiply_numbers" in code_content, "multiply_numbers function not found in editor"
    assert "processString" in code_content, "processString function not found in editor"
    
    # Take a screenshot showing only the second function group remains
    screenshot_with_markdown(page, "function_groups_after_deletion", {
        "step": "After deleting first function group",
        "functions_in_editor": "multiply_numbers, processString",
        "functions_not_in_editor": "getCurrentTimeInBerlin, formatData"
    })
    
    # Clean up - delete all functions
    # Delete the remaining function
    function_list.locator(".function-item-delete").first.click()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
