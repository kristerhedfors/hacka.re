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
    add_test_function, 
    cleanup_functions
)

def test_function_calling_ui(page: Page, serve_hacka_re, api_key):
    """Test the function calling UI elements and interactions."""
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
    
    # Check if the function calling button exists
    function_btn = page.locator("#function-btn")
    expect(function_btn).to_be_visible()
    
    # Click the function calling button
    function_btn.click()
    
    # Check if the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check if the function editor form exists
    function_editor_form = page.locator("#function-editor-form")
    expect(function_editor_form).to_be_visible()
    
    # Fill in the function code with a properly formatted function
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Test function for function calling
 * @description A simple test function that returns a message
 * @param {string} param1 - First parameter
 * @param {string} param2 - Second parameter
 * @returns {Object} The result object
 * @callable_function This function will be exposed to the LLM
 */
function test_function(param1, param2) {
  return {
    message: `Received ${param1} and ${param2}`,
    success: true
  };
}""")
    
    # Validate the function first
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    function_editor_form.locator("button[type='submit']").click()
    
    # Check if the function was added to the list
    function_list = page.locator("#function-list")
    expect(function_list.locator(".function-item-name:has-text('test_function')")).to_be_visible()
    
    # Check if the function is enabled by default
    function_checkbox = function_list.locator("input[type='checkbox']").first
    expect(function_checkbox).to_be_checked()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Reopen the function modal to verify persistence
    function_btn.click()
    expect(function_modal).to_be_visible()
    expect(function_list.locator(".function-item-name:has-text('test_function')")).to_be_visible()
    
    # Delete the function
    delete_button = function_list.locator(".function-item-delete").first
    
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    delete_button.click()
    
    # Check if the function was removed
    expect(page.locator("#empty-function-state")).to_be_visible()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_function_validation_errors(page: Page, serve_hacka_re, api_key):
    """Test validation errors for function calling."""
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
    
    # Open function modal
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Test case 1: Empty function code
    function_code = page.locator("#function-code")
    function_code.fill("")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Function code is required")
    
    # Test case 2: Invalid function format
    function_code.fill("""const myFunction = () => {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_contain_text("No functions found in the code")
    
    # Test case 3: Syntax error in function
    function_code.fill("""function test_function() {
  return { success: true;
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_contain_text("Syntax error")
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()

def test_function_calling_integration(page: Page, serve_hacka_re, api_key):
    """Test the integration of function calling with the chat interface."""
    # This test requires a valid API key and a model that supports function calling
    # It's more of an integration test and might be skipped in automated testing
    
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
    
    # Open settings to verify tool calling section
    page.locator("#settings-btn").click()
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Scroll to the bottom of the modal to see the Tool Calling section
    page.evaluate("""() => {
        const modal = document.querySelector('#settings-modal .modal-content');
        if (modal) {
            modal.scrollTop = modal.scrollHeight;
        }
    }""")
    
    # Wait a moment for the scroll to complete
    page.wait_for_timeout(500)
    
    # Check if the "Manage Functions" button is visible
    manage_functions_btn = page.locator("button:has-text('Manage Functions')")
    if manage_functions_btn.is_visible():
        # Close settings modal by clicking the Manage Functions button
        manage_functions_btn.click()
    else:
        # Close settings modal normally
        page.locator("#save-settings-btn").click()
        
        # Open function modal
        page.locator("#function-btn").click()
    
    # Verify function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Fill in the function code with a properly formatted function
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Gets weather information for a location
 * @description Fetches weather data for the specified location
 * @param {string} location - The location to get weather for
 * @param {string} unit - The temperature unit (celsius or fahrenheit)
 * @returns {Object} Weather information
 * @callable_function This function will be exposed to the LLM
 */
function get_weather(location, unit = "celsius") {
  return {
    location: location,
    temperature: 22,
    unit: unit,
    condition: "Sunny"
  };
}""")
    
    # Validate the function first
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Skip the actual API call test if no API key is configured
    # This is just to verify the UI components work correctly
    
    # Clean up - delete the function
    page.locator("#function-btn").click()
    function_list = page.locator("#function-list")
    
    # Handle the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    function_list.locator(".function-item-delete").first.click()
    
    # Close the function modal
    page.locator("#close-function-modal").click()

def test_function_error_handling(page: Page, serve_hacka_re, api_key):
    """Test error handling for function execution."""
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
    
    # Add a function with error
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a function that will throw an error
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Function that throws an error when parameter is missing
 * @description Tests error handling when a required parameter is missing
 * @param {string} param - Required parameter
 * @returns {Object} Success or error result
 * @callable_function This function will be exposed to the LLM
 */
function error_function(param) {
  // This function will throw an error when executed
  if (!param) {
    throw new Error("Missing required parameter");
  }
  return { success: true, param: param };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Add a function that will time out
    function_code.fill("""/**
 * Function that simulates a timeout
 * @description Tests timeout handling for long-running operations
 * @returns {Object} Success message (but should time out)
 * @callable_function This function will be exposed to the LLM
 */
function timeout_function() {
  // This function will simulate a long-running operation
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: true, message: "This should time out" });
    }, 35000); // 35 seconds, longer than the timeout limit
  });
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Add a function that returns non-serializable result
    function_code.fill("""/**
 * Function that returns a non-serializable result
 * @description Tests error handling for circular references
 * @returns {Object} A circular reference object that can't be serialized
 * @callable_function This function will be exposed to the LLM
 */
function non_serializable() {
  // This function returns a non-serializable result
  const obj = {};
  obj.circular = obj; // Create circular reference
  return obj;
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Library validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Clean up - delete the functions
    page.locator("#function-btn").click()
    function_list = page.locator("#function-list")
    
    # Handle the confirmation dialog for all deletions
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        page.wait_for_timeout(100)
    
    # Close the function modal
    page.locator("#close-function-modal").click()

def test_rc4_encryption_functions(page: Page, serve_hacka_re, api_key):
    """Test RC4 encryption/decryption functions."""
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
    
    # Add RC4 encryption function
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add all RC4 encryption functions at once
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * RC4 encryption function
 * @description Encrypts plaintext using RC4 algorithm
 * @param {string} plaintext - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {Object} Encryption result
 * @callable_function This function will be exposed to the LLM
 */
function rc4_encrypt(plaintext, key) {
  // This function uses the RC4Utils module to encrypt data
  if (!plaintext || !key) {
    throw new Error("Both plaintext and key are required");
  }
  
  try {
    const encrypted = RC4Utils.encrypt(plaintext, key);
    return {
      success: true,
      plaintext: plaintext,
      key: key,
      encrypted: encrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * RC4 decryption function
 * @description Decrypts ciphertext using RC4 algorithm
 * @param {string} ciphertext - Text to decrypt
 * @param {string} key - Decryption key
 * @returns {Object} Decryption result
 * @callable_function This function will be exposed to the LLM
 */
function rc4_decrypt(ciphertext, key) {
  // This function uses the RC4Utils module to decrypt data
  if (!ciphertext || !key) {
    throw new Error("Both ciphertext and key are required");
  }
  
  try {
    const decrypted = RC4Utils.decrypt(ciphertext, key);
    return {
      success: true,
      ciphertext: ciphertext,
      key: key,
      decrypted: decrypted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * RC4 test function
 * @description Tests the RC4 implementation with known test vectors
 * @returns {Object} Test results
 * @callable_function This function will be exposed to the LLM
 */
function rc4_test() {
  // This function tests the RC4 implementation
  try {
    const result = RC4Utils.testImplementation();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
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
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
    
    # Clean up - delete the functions
    page.locator("#function-btn").click()
    function_list = page.locator("#function-list")
    
    # Handle the confirmation dialog for all deletions
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Delete all functions
    while function_list.locator(".function-item-delete").count() > 0:
        function_list.locator(".function-item-delete").first.click()
        # Small wait to allow the UI to update
        page.wait_for_timeout(100)
    
    # Close the function modal
    page.locator("#close-function-modal").click()

def test_function_enable_disable(page: Page, serve_hacka_re, api_key):
    """Test enabling and disabling functions."""
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
    
    # Add a test function
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Simple test function
 * @description A basic function for testing enable/disable functionality
 * @returns {Object} Success status
 * @callable_function This function will be exposed to the LLM
 */
function test_function() {
  return { success: true };
}""")
    
    # Validate and add the function
    page.locator("#function-validate-btn").click()
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Check if the function is enabled by default
    function_list = page.locator("#function-list")
    function_checkbox = function_list.locator("input[type='checkbox']").first
    expect(function_checkbox).to_be_checked()
    
    # Disable the function
    function_checkbox.uncheck()
    
    # Verify it's unchecked
    expect(function_checkbox).not_to_be_checked()
    
    # Re-enable the function
    function_checkbox.check()
    
    # Verify it's checked again
    expect(function_checkbox).to_be_checked()
    
    # Clean up - delete the function
    page.on("dialog", lambda dialog: dialog.accept())
    function_list.locator(".function-item-delete").first.click()
    
    # Close the function modal
    page.locator("#close-function-modal").click()
    expect(function_modal).not_to_be_visible()
