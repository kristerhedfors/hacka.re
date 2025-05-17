import pytest
from playwright.sync_api import expect, Page

from function_calling_api.helpers.setup_helpers import configure_api_key_and_model
from test_utils import dismiss_welcome_modal, dismiss_settings_modal

def test_clear_chat_button(page: Page, serve_hacka_re, api_key):
    """Test that the clear chat button (trash icon) works correctly"""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Add a message to the chat
    page.fill("#message-input", "Test message")
    page.click("#send-btn")
    
    # Wait for the message to appear
    page.wait_for_selector(".message.user")
    
    # Verify the message is visible
    expect(page.locator(".message.user .message-content")).to_contain_text("Test message")
    
    # Click the clear chat button - this will trigger the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    page.click("#clear-chat-btn")
    
    # Verify the chat was cleared (user message should be gone)
    expect(page.locator(".message.user")).not_to_be_visible()
    
    # Verify a system message about clearing chat was added
    system_message = page.locator(".message.system .message-content")
    expect(system_message).to_contain_text("Chat history cleared")

def test_clear_chat_button_cancel(page: Page, serve_hacka_re, api_key):
    """Test that canceling the clear chat confirmation keeps the chat history"""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key and model
    configure_api_key_and_model(page, api_key)
    
    # Add a message to the chat
    page.fill("#message-input", "Test message")
    page.click("#send-btn")
    
    # Wait for the message to appear
    page.wait_for_selector(".message.user")
    
    # Verify the message is visible
    expect(page.locator(".message.user .message-content")).to_contain_text("Test message")
    
    # Click the clear chat button but cancel the confirmation dialog
    page.on("dialog", lambda dialog: dialog.dismiss())
    page.click("#clear-chat-btn")
    
    # Verify the chat was not cleared (user message should still be visible)
    expect(page.locator(".message.user .message-content")).to_contain_text("Test message")
