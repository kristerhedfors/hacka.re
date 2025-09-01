import pytest
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_function_copy_buttons_exist(page: Page, serve_hacka_re):
    """Test that the copy buttons exist in the function calling modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present (to prevent interference with button clicks)
    # Open the function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Check that the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check that the copy function code button is visible
    copy_function_code_btn = page.locator("#copy-function-code-btn")
    expect(copy_function_code_btn).to_be_visible()
    
    # Check that the copy tool definition button is visible
    copy_tool_definition_btn = page.locator("#copy-tool-definitions-btn")
    expect(copy_tool_definition_btn).to_be_visible()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "function_copy_buttons", {
        "Status": "Checking copy buttons in function modal",
        "Buttons": "Copy Function Code and Copy Tool Definition buttons"
    })
    
    # Close the function modal
    close_function_modal = page.locator("#close-function-modal")
    close_function_modal.click()

def test_function_copy_functionality(page: Page, serve_hacka_re):
    """Test that the copy buttons in the function calling modal work correctly."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present (to prevent interference with button clicks)
    # Open the function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Check that the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a test function to the editor
    function_code = page.locator("#function-code")
    function_code.fill("""/**
 * Test function for copy functionality
 * @param {string} text - Text to process
 * @returns {string} Processed text
 * @tool
 */
function testFunction(text) {
    return `Processed: ${text}`;
}""")
    
    # Validate the function to generate the tool definition
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    
    # Wait for the validation result to appear
    validation_result = page.locator("#function-validation-result.success")
    expect(validation_result).to_be_visible()
    
    # Take a screenshot with debug info before copying
    screenshot_with_markdown(page, "function_copy_before", {
        "Status": "Before clicking copy buttons",
        "Validation": "Function validated successfully"
    })
    
    # Click the copy function code button
    copy_function_code_btn = page.locator("#copy-function-code-btn")
    copy_function_code_btn.click()
    
    # Wait for the system message indicating the function code was copied
    system_message = page.locator(".message.system .message-content").last
    expect(system_message).to_contain_text("Function code copied to clipboard")
    
    # Take a screenshot with debug info after copying function code
    screenshot_with_markdown(page, "function_copy_code", {
        "Status": "After clicking copy function code button",
        "System Message": "Function code copied to clipboard"
    })
    
    # Click the copy tool definition button
    copy_tool_definition_btn = page.locator("#copy-tool-definitions-btn")
    copy_tool_definition_btn.click()
    
    # Wait for the system message - it should say no enabled functions
    system_message = page.locator(".message.system .message-content").last
    expect(system_message).to_contain_text("No enabled functions to copy")
    
    # Take a screenshot with debug info after copying tool definition
    screenshot_with_markdown(page, "function_copy_tool_definition", {
        "Status": "After clicking copy tool definition button",
        "System Message": "No enabled functions message"
    })
    
    # Close the function modal
    close_function_modal = page.locator("#close-function-modal")
    close_function_modal.click()
