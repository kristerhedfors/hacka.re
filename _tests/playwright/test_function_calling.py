import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, timed_test

@timed_test
def test_function_calling_ui(page: Page, serve_hacka_re):
    """Test the function calling UI elements and interactions."""
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
    
    # Check if the function editor form exists
    function_editor_form = page.locator("#function-editor-form")
    expect(function_editor_form).to_be_visible()
    
    # Fill in the function name
    function_name = page.locator("#function-name")
    function_name.fill("test_function")
    
    # Fill in the function code
    function_code = page.locator("#function-code")
    function_code.fill("""function test_function(param1, param2) {
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
    expect(validation_result).to_contain_text("Function validated successfully")
    
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

@timed_test
def test_function_validation_errors(page: Page, serve_hacka_re):
    """Test validation errors for function calling."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Open function modal
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Test case 1: Empty function name
    function_name = page.locator("#function-name")
    function_name.fill("")
    
    function_code = page.locator("#function-code")
    function_code.fill("""function test_function() {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Function name is required")
    
    # Test case 2: Invalid function name format
    function_name.fill("123-invalid-name")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_contain_text("Invalid function name")
    
    # Test case 3: Empty function code
    function_name.fill("valid_name")
    function_code.fill("")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_contain_text("Function code is required")
    
    # Test case 4: Invalid function format
    function_code.fill("""const myFunction = () => {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_contain_text("Invalid function format")
    
    # Test case 5: Function name mismatch
    function_name.fill("one_name")
    function_code.fill("""function different_name() {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    expect(validation_result).to_contain_text("Function name in code")
    expect(validation_result).to_contain_text("does not match")
    
    # Test case 6: Syntax error in function
    function_name.fill("test_function")
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

@timed_test
def test_function_calling_integration(page: Page, serve_hacka_re):
    """Test the integration of function calling with the chat interface."""
    # This test requires a valid API key and a model that supports function calling
    # It's more of an integration test and might be skipped in automated testing
    
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Enable tool calling in settings
    page.locator("#settings-btn").click()
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Check if the tool calling checkbox exists and enable it
    tool_calling_checkbox = page.locator("#enable-tool-calling")
    if tool_calling_checkbox.is_visible():
        tool_calling_checkbox.check()
    
    # Enable function tools checkbox
    function_tools_checkbox = page.locator("#enable-function-tools")
    if function_tools_checkbox.is_visible():
        function_tools_checkbox.check()
    
    # Save settings
    page.locator("#save-settings-btn").click()
    expect(settings_modal).not_to_be_visible()
    
    # Add a function
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Fill in the function name
    function_name = page.locator("#function-name")
    function_name.fill("get_weather")
    
    # Fill in the function code
    function_code = page.locator("#function-code")
    function_code.fill("""function get_weather(location, unit = "celsius") {
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
    expect(validation_result).to_contain_text("Function validated successfully")
    
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

@timed_test
def test_function_error_handling(page: Page, serve_hacka_re):
    """Test error handling for function execution."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Enable tool calling in settings
    page.locator("#settings-btn").click()
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Enable tool calling and function tools
    tool_calling_checkbox = page.locator("#enable-tool-calling")
    if tool_calling_checkbox.is_visible():
        tool_calling_checkbox.check()
    
    function_tools_checkbox = page.locator("#enable-function-tools")
    if function_tools_checkbox.is_visible():
        function_tools_checkbox.check()
    
    # Save settings
    page.locator("#save-settings-btn").click()
    expect(settings_modal).not_to_be_visible()
    
    # Add a function with error
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a function that will throw an error
    function_name = page.locator("#function-name")
    function_name.fill("error_function")
    
    function_code = page.locator("#function-code")
    function_code.fill("""function error_function(param) {
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
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Add a function that will time out
    function_name.fill("timeout_function")
    
    function_code.fill("""function timeout_function() {
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
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Add a function that returns non-serializable result
    function_name.fill("non_serializable")
    
    function_code.fill("""function non_serializable() {
  // This function returns a non-serializable result
  const obj = {};
  obj.circular = obj; // Create circular reference
  return obj;
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    expect(validation_result).to_contain_text("Function validated successfully")
    
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

@timed_test
def test_rc4_encryption_functions(page: Page, serve_hacka_re):
    """Test RC4 encryption/decryption functions."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Enable tool calling in settings
    page.locator("#settings-btn").click()
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Enable tool calling and function tools
    tool_calling_checkbox = page.locator("#enable-tool-calling")
    if tool_calling_checkbox.is_visible():
        tool_calling_checkbox.check()
    
    function_tools_checkbox = page.locator("#enable-function-tools")
    if function_tools_checkbox.is_visible():
        function_tools_checkbox.check()
    
    # Save settings
    page.locator("#save-settings-btn").click()
    expect(settings_modal).not_to_be_visible()
    
    # Add RC4 encryption function
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add the encrypt function
    function_name = page.locator("#function-name")
    function_name.fill("rc4_encrypt")
    
    function_code = page.locator("#function-code")
    function_code.fill("""function rc4_encrypt(plaintext, key) {
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
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    validation_result = page.locator("#function-validation-result")
    expect(validation_result).to_be_visible()
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Add the decrypt function
    function_name.fill("rc4_decrypt")
    
    function_code.fill("""function rc4_decrypt(ciphertext, key) {
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
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation result
    expect(validation_result).to_contain_text("Function validated successfully")
    
    # Submit the form
    page.locator("#function-editor-form button[type='submit']").click()
    
    # Add the test implementation function
    function_name.fill("rc4_test")
    
    function_code.fill("""function rc4_test() {
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
    expect(validation_result).to_contain_text("Function validated successfully")
    
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

@timed_test
def test_function_enable_disable(page: Page, serve_hacka_re):
    """Test enabling and disabling functions."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Open function modal
    page.locator("#function-btn").click()
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a test function
    function_name = page.locator("#function-name")
    function_name.fill("test_function")
    
    function_code = page.locator("#function-code")
    function_code.fill("""function test_function() {
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
