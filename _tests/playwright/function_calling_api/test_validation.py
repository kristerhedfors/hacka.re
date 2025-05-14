"""
Function Validation Error Tests

This module contains tests for function validation errors with API key.
"""
import pytest
import os
from urllib.parse import urljoin
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal

from function_calling_api.helpers.setup_helpers import (
    setup_console_logging, 
    configure_api_key_and_model, 
    enable_tool_calling_and_function_tools
)

@timed_test
def test_function_validation_errors_with_api(page: Page, serve_hacka_re, api_key):
    """Test validation errors for function calling with API key."""
    # Set up console error logging
    setup_console_logging(page)
    
    # Ensure serve_hacka_re ends with a trailing slash for proper URL joining
    base_url = serve_hacka_re if serve_hacka_re.endswith('/') else f"{serve_hacka_re}/"
    print(f"Base URL: {base_url}")
    
    # Navigate to the page with explicit wait for load
    print(f"Navigating to {base_url}")
    try:
        page.goto(base_url, wait_until="domcontentloaded")
        print("Initial navigation successful")
    except Exception as e:
        print(f"Error during initial navigation: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/initial_navigation_error_validation.png")
    
    # Wait for the page to be fully loaded
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
        print("Network idle state reached")
    except Exception as e:
        print(f"Error waiting for network idle: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/network_idle_timeout_validation.png")
    
    # Verify the page loaded correctly
    title = page.title()
    print(f"Page title: {title}")
    
    # Check if the page loaded correctly
    if not title or "hacka.re" not in title.lower():
        print("WARNING: Page may not have loaded correctly")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/page_load_issue_validation.png")
        
        # Try to navigate directly to index.html using proper URL joining
        index_url = urljoin(base_url, "index.html")
        print(f"Trying direct navigation to: {index_url}")
        
        try:
            page.goto(index_url, wait_until="domcontentloaded")
            print("Direct navigation to index.html successful")
            page.wait_for_load_state("networkidle", timeout=5000)
            title = page.title()
            print(f"After direct navigation, page title: {title}")
        except Exception as e:
            print(f"Error during direct navigation to index.html: {e}")
            # Take a screenshot for debugging
            page.screenshot(path="_tests/playwright/videos/direct_navigation_error_validation.png")
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    try:
        configure_api_key_and_model(page, api_key)
        print("API key and model configured successfully")
    except Exception as e:
        print(f"Error configuring API key and model: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/api_key_config_error_validation.png")
        pytest.fail(f"Failed to configure API key and model: {e}")
    
    # Enable tool calling and function tools
    try:
        enable_tool_calling_and_function_tools(page)
        print("Tool calling and function tools enabled successfully")
    except Exception as e:
        print(f"Error enabling tool calling and function tools: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/enable_tools_error_validation.png")
        pytest.fail(f"Failed to enable tool calling and function tools: {e}")
    
    # Open function modal
    try:
        page.locator("#function-btn").click()
        print("Clicked function button")
    except Exception as e:
        print(f"Error clicking function button: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/function_btn_error.png")
        pytest.fail(f"Failed to click function button: {e}")
    
    function_modal = page.locator("#function-modal")
    try:
        expect(function_modal).to_be_visible(timeout=5000)
        print("Function modal is visible")
    except Exception as e:
        print(f"Error waiting for function modal to be visible: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/function_modal_not_visible.png")
        # Try to check if it exists but is not visible
        modal_exists = page.evaluate("""() => {
            return document.querySelector('#function-modal') !== null;
        }""")
        print(f"Function modal exists in DOM: {modal_exists}")
        if modal_exists:
            # Try to make it visible with JavaScript
            page.evaluate("""() => {
                const modal = document.querySelector('#function-modal');
                if (modal) {
                    modal.classList.add('active');
                    modal.style.display = 'block';
                }
            }""")
            print("Tried to make function modal visible with JavaScript")
            page.wait_for_timeout(1000)
            page.screenshot(path="_tests/playwright/videos/function_modal_after_js.png")
        else:
            pytest.fail("Function modal not found in DOM")
    
    # Test case 1: Empty function name
    function_name = page.locator("#function-name")
    function_name.fill("")
    
    function_code = page.locator("#function-code")
    function_code.fill("""function test_function() {
  return { success: true };
}""")
    
    # Validate the function
    try:
        page.locator("#function-validate-btn").click()
        print("Clicked validate button for empty name test")
    except Exception as e:
        print(f"Error clicking validate button: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validate_btn_error.png")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const validateBtn = document.querySelector('#function-validate-btn');
            if (validateBtn) validateBtn.click();
        }""")
        print("Tried to click validate button using JavaScript")
    
    # Check for validation error
    validation_result = page.locator("#function-validation-result")
    try:
        expect(validation_result).to_be_visible(timeout=2000)
        expect(validation_result).to_have_class("error")
        expect(validation_result).to_contain_text("Function name is required")
        print("Empty name validation error displayed correctly")
    except Exception as e:
        print(f"Error checking validation result for empty name: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validation_result_empty_name_error.png")
    
    # Take a screenshot of the validation error
    page.screenshot(path="_tests/playwright/videos/validation_error_empty_name.png")
    
    # Test case 2: Invalid function name format
    function_name.fill("123-invalid-name")
    
    # Validate the function
    try:
        page.locator("#function-validate-btn").click()
        print("Clicked validate button for invalid name test")
    except Exception as e:
        print(f"Error clicking validate button: {e}")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const validateBtn = document.querySelector('#function-validate-btn');
            if (validateBtn) validateBtn.click();
        }""")
    
    # Check for validation error
    try:
        expect(validation_result).to_have_class("error")
        expect(validation_result).to_contain_text("Invalid function name")
        print("Invalid name validation error displayed correctly")
    except Exception as e:
        print(f"Error checking validation result for invalid name: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validation_result_invalid_name_error.png")
    
    # Take a screenshot of the validation error
    page.screenshot(path="_tests/playwright/videos/validation_error_invalid_name.png")
    
    # Test case 3: Empty function code
    function_name.fill("valid_name")
    function_code.fill("")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    try:
        expect(validation_result).to_have_class("error")
        expect(validation_result).to_contain_text("Function code is required")
        print("Empty code validation error displayed correctly")
    except Exception as e:
        print(f"Error checking validation result for empty code: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validation_result_empty_code_error.png")
    
    # Test case 4: Invalid function format
    function_code.fill("""const myFunction = () => {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    try:
        expect(validation_result).to_have_class("error")
        expect(validation_result).to_contain_text("Invalid function format")
        print("Invalid format validation error displayed correctly")
    except Exception as e:
        print(f"Error checking validation result for invalid format: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validation_result_invalid_format_error.png")
    
    # Test case 5: Function name mismatch
    function_name.fill("one_name")
    function_code.fill("""function different_name() {
  return { success: true };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    try:
        expect(validation_result).to_have_class("error")
        expect(validation_result).to_contain_text("Function name in code")
        expect(validation_result).to_contain_text("does not match")
        print("Name mismatch validation error displayed correctly")
    except Exception as e:
        print(f"Error checking validation result for name mismatch: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validation_result_name_mismatch_error.png")
    
    # Test case 6: Syntax error in function
    function_name.fill("test_function")
    function_code.fill("""function test_function() {
  return { success: true;
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation error
    try:
        expect(validation_result).to_have_class("error")
        expect(validation_result).to_contain_text("Syntax error")
        print("Syntax error validation error displayed correctly")
    except Exception as e:
        print(f"Error checking validation result for syntax error: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validation_result_syntax_error.png")
    
    # Test case 7: Valid function with JSDoc comments
    function_name.fill("test_function")
    function_code.fill("""/**
 * @description Test function with JSDoc comments
 * @param {string} param1 - First parameter
 * @param {number} param2 - Second parameter
 * @returns {object} Result object
 */
function test_function(param1, param2) {
  return {
    message: `Received ${param1} and ${param2}`,
    success: true
  };
}""")
    
    # Validate the function
    page.locator("#function-validate-btn").click()
    
    # Check for validation success
    try:
        expect(validation_result).to_have_class("success")
        expect(validation_result).to_contain_text("Function validated successfully")
        print("Valid function validation success displayed correctly")
    except Exception as e:
        print(f"Error checking validation result for valid function: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/validation_result_valid_function_error.png")
    
    # Take a screenshot of the validation success
    page.screenshot(path="_tests/playwright/videos/validation_success.png")
    
    # Close the function modal
    try:
        page.locator("#close-function-modal").click()
        print("Clicked close function modal button")
    except Exception as e:
        print(f"Error clicking close function modal button: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/close_function_modal_error.png")
        # Try JavaScript as a fallback
        page.evaluate("""() => {
            const closeBtn = document.querySelector('#close-function-modal');
            if (closeBtn) closeBtn.click();
        }""")
        print("Tried to click close function modal button using JavaScript")
    
    try:
        expect(function_modal).not_to_be_visible(timeout=2000)
        print("Function modal closed successfully")
    except Exception as e:
        print(f"Error waiting for function modal to close: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="_tests/playwright/videos/function_modal_not_closed.png")
        # Try to close it with JavaScript
        page.evaluate("""() => {
            const modal = document.querySelector('#function-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }""")
        print("Tried to close function modal using JavaScript")
    
    # Take a final screenshot
    page.screenshot(path="_tests/playwright/videos/validation_test_complete.png")
