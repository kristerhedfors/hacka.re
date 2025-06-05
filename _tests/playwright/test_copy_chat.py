import pytest
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, check_system_messages, screenshot_with_markdown

def test_copy_chat_button_exists(page: Page, serve_hacka_re):
    """Test that the copy chat button exists and is visible."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present (to prevent interference with button clicks)
    dismiss_settings_modal(page)
    
    # Check that the copy chat button is visible
    copy_chat_btn = page.locator("#copy-chat-btn")
    expect(copy_chat_btn).to_be_visible()
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "copy_chat_button", {
        "Status": "Checking copy chat button visibility",
        "Button": "Copy Chat Button"
    })

def test_copy_chat_functionality(page: Page, serve_hacka_re):
    """Test that the copy chat button copies the chat content to clipboard."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Also dismiss settings modal if present (to prevent interference with button clicks)
    dismiss_settings_modal(page)
    
    # The welcome message is already in the chat by default
    # We can test the copy functionality with just this message
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "copy_chat_before_copy", {
        "Status": "Before clicking copy button",
        "Content": "Welcome message in chat"
    })
    
    # Click the copy chat button
    copy_chat_btn = page.locator("#copy-chat-btn")
    copy_chat_btn.click()
    
    # Wait for the system message indicating the chat was copied
    system_messages = check_system_messages(page)
    
    # Take a screenshot with debug info
    screenshot_with_markdown(page, "copy_chat_after_copy", {
        "Status": "After clicking copy button",
        "Expected": "System message indicating chat was copied"
    })
    
    # Check that the system message indicates the chat was copied
    latest_system_message = page.locator(".message.system .message-content").last
    expect(latest_system_message).to_contain_text("Chat content copied to clipboard")
