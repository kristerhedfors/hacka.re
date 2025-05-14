import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal

def test_function_calling_basic(page: Page, serve_hacka_re):
    """Test basic function calling UI elements."""
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
    
    # Add a small wait to ensure the modal is fully loaded
    page.wait_for_timeout(500)
    
    # Close the function modal
    close_btn = page.locator("#close-function-modal")
    if close_btn.is_visible():
        close_btn.click()
    else:
        # Try clicking the X button if the close button isn't visible
        page.locator("#function-modal .close-btn").click()
    
    # Verify the modal is closed
    expect(function_modal).not_to_be_visible()
