import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal

def test_function_info_tooltip(page: Page, serve_hacka_re):
    """Test that the function info tooltip appears when clicking on the info icon and converts to a modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Open the function modal
    function_btn = page.locator("#function-btn")
    expect(function_btn).to_be_visible()
    function_btn.click()
    
    # Wait for function modal to appear
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check that the function info icon is visible and click it
    function_info_icon = page.locator("#function-info-icon")
    expect(function_info_icon).to_be_visible()
    function_info_icon.click()
    
    # Check that the function info modal is now visible
    function_info_modal = page.locator("#function-info-modal")
    expect(function_info_modal).to_be_visible()
    
    # Check that the modal has the correct title and content
    modal_title = function_info_modal.locator("h2")
    expect(modal_title).to_be_visible()
    expect(modal_title).to_have_text("About Function Calling")
    
    modal_content = function_info_modal.locator(".tooltip-content")
    expect(modal_content).to_be_visible()
    
    # Test close button functionality
    close_button = function_info_modal.locator("#close-function-info-modal")
    expect(close_button).to_be_visible()
    close_button.click()
    expect(function_info_modal).not_to_be_visible()
    
    # Test one additional close method: Escape key
    function_info_icon.click()
    expect(function_info_modal).to_be_visible()
    page.keyboard.press("Escape")
    expect(function_info_modal).not_to_be_visible()