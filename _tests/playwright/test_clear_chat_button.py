import pytest
import time
from playwright.sync_api import expect, Page

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_clear_chat_button(page: Page, serve_hacka_re, api_key):
    """Test that the clear chat button (trash icon) works correctly"""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key via the settings modal instead of JavaScript
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Select a model (first available)
    model_select = page.locator("#model-select")
    
    # Get available options
    options = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => opt.value);
    }""")
    
    if options and len(options) > 0:
        model_select.select_option(options[0])
    
    # Save the settings
    save_button = page.locator("#save-settings-btn")
    save_button.click(force=True)
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Take a screenshot after configuring API
    screenshot_with_markdown(page, "after_api_config", {
        "Test": "Clear Chat Button",
        "Status": "After API configuration"
    })
    
    # Add a message to the chat history directly (without API call)
    page.evaluate("""() => {
        // Add a test message directly to the chat history
        if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addUserMessage) {
            window.aiHackare.chatManager.addUserMessage('Test message');
        }
    }""")
    
    # Wait for the message to appear
    page.wait_for_selector(".message.user", timeout=5000)
    
    # Verify the message is visible
    expect(page.locator(".message.user .message-content")).to_contain_text("Test message")
    
    # Take a screenshot before clearing
    screenshot_with_markdown(page, "before_clear_chat", {
        "Test": "Clear Chat Button",
        "Status": "Before clearing chat"
    })
    
    # Click the clear chat button - this will trigger the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    page.click("#clear-chat-btn")
    
    # Wait a moment for the dialog to be processed
    time.sleep(0.5)
    
    # Verify the chat was cleared (user message should be gone)
    expect(page.locator(".message.user")).not_to_be_visible()
    
    # Verify a system message about clearing chat was added
    system_message = page.locator(".message.system .message-content")
    expect(system_message).to_contain_text("Chat history cleared")
    
    # Take a screenshot after clearing
    screenshot_with_markdown(page, "after_clear_chat", {
        "Test": "Clear Chat Button",
        "Status": "After clearing chat"
    })

def test_clear_chat_button_cancel(page: Page, serve_hacka_re, api_key):
    """Test that canceling the clear chat confirmation keeps the chat history"""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Configure API key directly without using the helper function
    # Click the settings button
    settings_button = page.locator("#settings-btn")
    settings_button.click(timeout=1000)
    
    # Wait for the settings modal to become visible
    page.wait_for_selector("#settings-modal.active", state="visible", timeout=2000)
    
    # Enter the API key
    api_key_input = page.locator("#api-key-update")
    api_key_input.fill(api_key)
    
    # Select OpenAI as the API provider
    base_url_select = page.locator("#base-url-select")
    base_url_select.select_option("openai")
    
    # Select a model (first available)
    model_select = page.locator("#model-select")
    
    # Get available options
    options = page.evaluate("""() => {
        const select = document.getElementById('model-select');
        if (!select) return [];
        return Array.from(select.options)
            .filter(opt => !opt.disabled)
            .map(opt => opt.value);
    }""")
    
    if options and len(options) > 0:
        model_select.select_option(options[0])
    
    # Save the settings
    save_button = page.locator("#save-settings-btn")
    save_button.click(force=True)
    
    # Wait for the settings modal to be closed
    page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Add a message to the chat history directly (without API call)
    page.evaluate("""() => {
        // Add a test message directly to the chat history
        if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addUserMessage) {
            window.aiHackare.chatManager.addUserMessage('Test message');
        }
    }""")
    
    # Wait for the message to appear
    page.wait_for_selector(".message.user", timeout=5000)
    
    # Verify the message is visible
    expect(page.locator(".message.user .message-content")).to_contain_text("Test message")
    
    # Click the clear chat button but cancel the confirmation dialog
    page.on("dialog", lambda dialog: dialog.dismiss())
    page.click("#clear-chat-btn")
    
    # Wait a moment for the dialog to be processed
    time.sleep(0.5)
    
    # Verify the chat was not cleared (user message should still be visible)
    expect(page.locator(".message.user .message-content")).to_contain_text("Test message")
