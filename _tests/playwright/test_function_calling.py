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
