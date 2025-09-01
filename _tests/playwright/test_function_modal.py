import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal


def test_function_modal_basic(page: Page, serve_hacka_re):
    """Test basic function modal functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open function modal
    function_btn = page.locator("#function-btn")
    expect(function_btn).to_be_visible()
    function_btn.click()
    
    # Check if the function modal is visible
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Close the function modal
    close_btn = page.locator("#close-function-modal")
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    # Verify the modal is closed
    expect(function_modal).not_to_be_visible()


def test_function_modal_elements(page: Page, serve_hacka_re):
    """Test that function modal has expected elements"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    function_modal = page.locator("#function-modal")
    expect(function_modal).to_be_visible()
    
    # Check for key elements (without complex interactions)
    function_code = page.locator("#function-code")
    if function_code.count() > 0:
        expect(function_code).to_be_visible()
    
    # Check for buttons
    close_btn = page.locator("#close-function-modal")
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    expect(function_modal).not_to_be_visible()
