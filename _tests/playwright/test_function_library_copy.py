import pytest
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_function_library_copy_button_exists(page: Page, serve_hacka_re):
    """Test that the copy function library button exists in the function calling modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    # Open the function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Check that the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check that the copy function library button is visible
    copy_function_library_btn = page.locator("#copy-function-library-btn")
    expect(copy_function_library_btn).to_be_visible()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "function_library_copy_button", {
        "Status": "Checking copy function library button in function modal",
        "Button": "Copy Function Library button next to 'Available Functions' heading"
    })
    
    # Close the function modal
    close_function_modal = page.locator("#close-function-modal")
    close_function_modal.click()

def test_function_library_copy_functionality(page: Page, serve_hacka_re):
    """Test that the copy function library button works correctly."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    # Open the function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Check that the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Add a function to ensure there's something in the library
    # First validate the default function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    
    # Wait for the validation result to appear
    validation_result = page.locator("#function-validation-result.success")
    expect(validation_result).to_be_visible()
    
    # Save the function
    save_btn = page.locator("#function-editor-form button[type='submit']")
    save_btn.click()
    
    # Wait for the system message indicating the function was added
    system_message = page.locator(".message.system .message-content").last
    expect(system_message).to_contain_text("functions added and enabled")
    
    # Take a screenshot with debug info before copying
    screenshot_with_markdown(page, "function_library_copy_before", {
        "Status": "Before clicking copy function library button",
        "Function": "Function added to library"
    })
    
    # Click the copy function library button
    copy_function_library_btn = page.locator("#copy-function-library-btn")
    copy_function_library_btn.click()
    
    # Wait for the system message indicating the function library was copied
    system_message = page.locator(".message.system .message-content").last
    expect(system_message).to_contain_text("Function library copied to clipboard as JSON")
    
    # Take a screenshot with debug info after copying function library
    screenshot_with_markdown(page, "function_library_copy_after", {
        "Status": "After clicking copy function library button",
        "System Message": "Function library copied to clipboard as JSON"
    })
    
    # Close the function modal
    close_function_modal = page.locator("#close-function-modal")
    close_function_modal.click()
