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

def test_all_functions_callable_by_default(page: Page, serve_hacka_re, api_key):
    """Test that all functions are callable by default when no tags are present."""
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
    
    # Add multiple functions without any tags
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
 * Gets the current time in Berlin
 * @description Fetches the current time for Berlin timezone
 * @returns {Object} Current time information
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
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if all functions were added to the list (all should be callable by default)
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('formatData')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    
    # Take a screenshot showing all functions are callable
    screenshot_with_markdown(page, "function_parsing_all_callable", {
        "step": "All functions are callable by default when no tags are present",
        "functions_visible": "formatData, getCurrentTimeInBerlin, multiply_numbers"
    })
    
    # Clean up - delete all functions
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        # page.wait_for_timeout(100)  # TODO: Replace with proper wait condition
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_only_tagged_functions_callable(page: Page, serve_hacka_re, api_key):
    """Test that only tagged functions are callable when at least one tag is present."""
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
    
    # Add multiple functions with one tagged with @callable
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
 * Gets the current time in Berlin
 * @description Fetches the current time for Berlin timezone
 * @returns {Object} Current time information
 * @callable This function will be exposed to the LLM
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
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if only the tagged function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).not_to_be_visible()
    
    # Take a screenshot showing only tagged functions are callable
    screenshot_with_markdown(page, "function_parsing_only_tagged_callable", {
        "step": "Only tagged functions are callable when at least one tag is present",
        "function_visible": "getCurrentTimeInBerlin",
        "functions_not_visible": "formatData, multiply_numbers"
    })
    
    # Clean up - delete all functions
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        # page.wait_for_timeout(100)  # TODO: Replace with proper wait condition
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_tool_tag_works(page: Page, serve_hacka_re, api_key):
    """Test that the @tool tag works the same as @callable."""
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
    
    # Add multiple functions with one tagged with @tool
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
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if only the tagged function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).not_to_be_visible()
    
    # Take a screenshot showing @tool tag works
    screenshot_with_markdown(page, "function_parsing_tool_tag", {
        "step": "@tool tag works the same as @callable",
        "function_visible": "getCurrentTimeInBerlin",
        "functions_not_visible": "formatData, multiply_numbers"
    })
    
    # Clean up - delete all functions
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        # page.wait_for_timeout(100)  # TODO: Replace with proper wait condition
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_single_line_comment_tags(page: Page, serve_hacka_re, api_key):
    """Test that single-line comment tags work."""
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
    
    # Add multiple functions with single-line comment tags
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
 * Gets the current time in Berlin
 * @description Fetches the current time for Berlin timezone
 * @returns {Object} Current time information
 */
// @callable
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
 */
// @tool
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
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if only the tagged functions were added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()
    
    # Take a screenshot showing single-line comment tags work
    screenshot_with_markdown(page, "function_parsing_single_line_tags", {
        "step": "Single-line comment tags work",
        "functions_visible": "getCurrentTimeInBerlin, multiply_numbers",
        "functions_not_visible": "formatData"
    })
    
    # Clean up - delete all functions
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        # page.wait_for_timeout(100)  # TODO: Replace with proper wait condition
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_mixed_tag_types(page: Page, serve_hacka_re, api_key):
    """Test that mixed tag types work together."""
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
    
    # Add multiple functions with mixed tag types
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
 * Gets the current time in Berlin
 * @description Fetches the current time for Berlin timezone
 * @returns {Object} Current time information
 * @callable This function will be exposed to the LLM
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
 */
// @tool
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
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if only the tagged functions were added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('getCurrentTimeInBerlin')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('multiply_numbers')")).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('formatData')")).not_to_be_visible()
    
    # Take a screenshot showing mixed tag types work
    screenshot_with_markdown(page, "function_parsing_mixed_tags", {
        "step": "Mixed tag types work together",
        "functions_visible": "getCurrentTimeInBerlin (@callable in JSDoc), multiply_numbers (// @tool)",
        "functions_not_visible": "formatData"
    })
    
    # Clean up - delete all functions
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        # page.wait_for_timeout(100)  # TODO: Replace with proper wait condition
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
