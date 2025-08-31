"""Test that Enter key works in API key modal to save and close it"""

from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
import os

def test_api_key_modal_enter_key(page: Page, serve_hacka_re):
    """Test that pressing Enter in API key modal saves and closes it"""
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if it's open
    dismiss_settings_modal(page)
    
    # Click send to trigger API key modal (when no API key is set)
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for API key modal to appear
    api_key_modal = page.locator("#api-key-modal")
    expect(api_key_modal).to_have_class("modal active", timeout=5000)
    
    # Get test API key
    api_key = os.getenv("OPENAI_API_KEY", "test-api-key-1234")
    
    # Type API key in the input field
    api_key_input = page.locator("#api-key")
    api_key_input.fill(api_key)
    
    # Press Enter to submit the form
    api_key_input.press("Enter")
    
    # Wait for modal to close
    page.wait_for_timeout(500)
    
    # Verify modal is closed
    expect(api_key_modal).not_to_have_class("modal active")
    
    # Verify we're back to the chat interface
    message_input = page.locator("#message-input")
    expect(message_input).to_be_visible()
    
    # Take screenshot showing modal is closed
    screenshot_with_markdown(page, "api_key_enter_test", {
        "Status": "API key saved via Enter key",
        "Modal State": "Closed",
        "Test Result": "Success"
    })
    
    print("✅ Enter key successfully saves API key and closes modal")