import pytest
from playwright.sync_api import Page, expect

from test_utils import timed_test, dismiss_welcome_modal, check_system_messages

@timed_test
def test_page_loads(page, serve_hacka_re):
    """Test that the hacka.re page loads correctly."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Check that the page title is correct
    expect(page).to_have_title("hacka.re - För hackare av hackare")
    
    # Check that the logo is visible
    logo = page.locator(".logo-text")
    expect(logo).to_be_visible()
    expect(logo).to_contain_text("hacka.re")
    
    # Check that the tagline is visible
    tagline = page.locator(".tagline")
    expect(tagline).to_be_visible()
    expect(tagline).to_contain_text("För hackare av hackare")

@timed_test
def test_chat_interface_elements(page, serve_hacka_re):
    """Test that the chat interface elements are present."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Check that the chat container is visible
    chat_container = page.locator("#chat-container")
    expect(chat_container).to_be_visible()
    
    # Check that the chat messages container is visible
    chat_messages = page.locator("#chat-messages")
    expect(chat_messages).to_be_visible()
    
    # Check for system messages, including the welcome message
    check_system_messages(page)
    
    # Check that the welcome message is visible
    welcome_message = page.locator(".message.system .message-content")
    expect(welcome_message).to_be_visible()
    expect(welcome_message).to_contain_text("Welcome to hacka.re")
    
    # Check that the chat input is visible
    chat_input = page.locator("#message-input")
    expect(chat_input).to_be_visible()
    expect(chat_input).to_have_attribute("placeholder", "Type your message here...")
    
    # Check that the send button is visible
    send_button = page.locator("#send-btn")
    expect(send_button).to_be_visible()
