import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)
from function_calling_api.helpers.function_helpers import (
    cleanup_functions
)

def test_function_deletion_removes_entire_bundle(page: Page, serve_hacka_re, api_key):
    """Test that deleting a function removes the entire function bundle (all functions defined together).
    
    Functions are now imported as bundles - when multiple functions are defined together in the editor
    and saved, they form a bundle. Deleting any function from a bundle removes the entire bundle.
    """
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
    
    # Add a function bundle with multiple functions (helper and callable)
    # All functions defined together in one submission form a single bundle
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Helper function that formats data
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
}

/**
 * Another callable function in the same bundle
 * @description Multiplies two numbers together
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} The result of the multiplication
 * @tool This function will be exposed to the LLM
 */
function multiply_numbers(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  const result = a * b;
  return {
    result: result,
    formattedResult: formatData({result: result}),
    success: true
  };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Wait for validation result with timeout
    validation_result = page.locator("#function-validation-result")
    validation_result.wait_for(state="visible", timeout=2000)
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if both callable functions were added to the list (they're in the same bundle)
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    
    # Verify the helper functions are not in the list (they're not callable)
    expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('processString')")).not_to_be_visible()
    
    # Take a screenshot showing the function list
    screenshot_with_markdown(page, "function_bundle_before_deletion", {
        "step": "Before deletion - both callable functions from the bundle are visible",
        "functions_visible": "getCurrentTimeInBerlin, multiply_numbers",
        "functions_not_visible": "formatData, processString (helper functions)"
    })
    
    # Clear the editor
    function_code.fill("")
    
    # Click the Reset button to load all functions
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains all functions from the bundle
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" in code_content, "getCurrentTimeInBerlin function not found in editor"
    assert "multiply_numbers" in code_content, "multiply_numbers function not found in editor"
    assert "formatData" in code_content, "formatData function not found in editor"
    assert "processString" in code_content, "processString function not found in editor"
    
    # Take a screenshot showing all functions in the editor
    screenshot_with_markdown(page, "function_bundle_reset", {
        "step": "After Reset - all functions from the bundle are loaded in the editor",
        "functions_in_editor": "getCurrentTimeInBerlin, multiply_numbers, formatData, processString"
    })
    
    # Now delete one function from the bundle (this should delete the entire bundle)
    # Handle the confirmation dialog (which should warn about deleting related functions)
    page.on("dialog", lambda dialog: dialog.accept())
    
    # First, expand function collections if they're collapsed
    collection_headers = function_list.locator(".function-collection-header")
    if collection_headers.count() > 0:
        collection_headers.first.click()
        page.wait_for_timeout(500)  # Wait for expansion
    
    # Delete the first function (getCurrentTimeInBerlin)
    delete_button = function_list.locator(".function-item:has-text('getCurrentTimeInBerlin') .function-item-delete")
    delete_button.wait_for(state="visible", timeout=2000)
    delete_button.click()
    
    # Wait for the function to be deleted
    page.wait_for_timeout(100)
    
    # Verify both callable functions are removed from the list (entire bundle deleted)
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).not_to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).not_to_be_visible()
    
    # Clear the editor again
    function_code.fill("")
    
    # Click the Reset button again
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains the default function code
    # and NOT the custom bundle functions (but may contain default functions like multiply_numbers)
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" not in code_content, "getCurrentTimeInBerlin function should not be in editor"
    assert "formatData" not in code_content, "formatData function should not be in editor"
    assert "processString" not in code_content, "processString function should not be in editor"
    
    # multiply_numbers is part of the default function template, so it's expected to be present
    # We only check that the custom bundle functions are removed
    
    # Take a screenshot showing the editor after bundle deletion
    screenshot_with_markdown(page, "function_bundle_after_deletion", {
        "step": "After deleting one function - entire custom bundle is removed",
        "functions_not_in_editor": "getCurrentTimeInBerlin, formatData, processString",
        "functions_in_editor": "multiply_numbers (default function template)",
        "behavior": "Deleting any function removes the entire custom bundle, Reset loads default template"
    })
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_multiple_function_collections(page: Page, serve_hacka_re, api_key):
    """Test that multiple function collections (bundles) are handled correctly.
    
    When functions are defined in separate submissions to the editor, they form separate collections.
    Each collection can be deleted independently without affecting other collections.
    """
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
    
    # Add first function bundle (collection)
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
    
    # Validate and submit the first function collection
    page.locator("#function-validate-btn").click()
    validation_result = page.locator("#function-validation-result")
    validation_result.wait_for(state="visible", timeout=2000)
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the first callable function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    
    # Add second function bundle (collection) - separate submission creates new collection
    function_code.fill("""/**
 * Helper function for string operations
 * @param {string} str - The string to process
 * @returns {string} Processed string
 */
function processString(str) {
  return str.toUpperCase();
}

/**
 * Calculates the area of a rectangle
 * @description A custom function that calculates rectangle area
 * @param {number} width - The width of the rectangle
 * @param {number} height - The height of the rectangle
 * @returns {Object} The area calculation result
 * @tool This function will be exposed to the LLM
 */
function calculate_rectangle_area(width, height) {
  // Validate inputs are numbers
  if (typeof width !== 'number' || typeof height !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  // Perform the calculation
  const area = width * height;
  
  // Format the result
  const formattedResult = processString(`Area: ${area} square units`);
  
  return {
    area: area,
    formattedResult: formattedResult,
    success: true
  };
}""")
    
    # Validate and submit the second function collection
    page.locator("#function-validate-btn").click()
    validation_result = page.locator("#function-validation-result")
    validation_result.wait_for(state="visible", timeout=2000)
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if both callable functions are in the list
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('calculate_rectangle_area')")).to_be_visible()
    
    # Take a screenshot showing both functions in the list
    screenshot_with_markdown(page, "function_collections_both", {
        "step": "Both function collections added",
        "functions_visible": "getCurrentTimeInBerlin, calculate_rectangle_area",
        "functions_not_visible": "formatData, processString (helper functions)"
    })
    
    # Clear the editor
    function_code.fill("")
    
    # Click the Reset button to load all functions
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains all functions from both collections
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" in code_content, "getCurrentTimeInBerlin function not found in editor"
    assert "formatData" in code_content, "formatData function not found in editor"
    assert "calculate_rectangle_area" in code_content, "calculate_rectangle_area function not found in editor"
    assert "processString" in code_content, "processString function not found in editor"
    
    # Delete the first function collection
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # First, expand function collections if they're collapsed
    collection_headers = function_list.locator(".function-collection-header")
    if collection_headers.count() > 0:
        collection_headers.first.click()
        page.wait_for_timeout(500)  # Wait for expansion
    
    # Delete getCurrentTimeInBerlin (this deletes the entire first collection)
    delete_button = function_list.locator(".function-item:has-text('getCurrentTimeInBerlin') .function-item-delete")
    delete_button.wait_for(state="visible", timeout=2000)
    delete_button.click()
    
    # Wait for the function to be deleted
    page.wait_for_timeout(100)
    
    # Verify only calculate_rectangle_area remains in the list
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).not_to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('calculate_rectangle_area')")).to_be_visible()
    
    # Clear the editor again
    function_code.fill("")
    
    # Click the Reset button again to load remaining functions
    page.locator("#function-clear-btn").click()
    
    # Verify that the editor now contains only the second function collection
    code_content = function_code.input_value()
    assert "getCurrentTimeInBerlin" not in code_content, "getCurrentTimeInBerlin function should not be in editor"
    assert "formatData" not in code_content, "formatData function should not be in editor"
    assert "calculate_rectangle_area" in code_content, "calculate_rectangle_area function not found in editor"
    assert "processString" in code_content, "processString function not found in editor"
    
    # Take a screenshot showing only the second function collection remains
    screenshot_with_markdown(page, "function_collections_after_deletion", {
        "step": "After deleting first function collection",
        "functions_in_editor": "calculate_rectangle_area, processString",
        "functions_not_in_editor": "getCurrentTimeInBerlin, formatData"
    })
    
    # Clean up - delete all functions
    # Delete the remaining function
    function_list.locator(".function-item-delete").first.click()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
