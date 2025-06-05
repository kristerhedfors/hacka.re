import pytest
import time
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

def test_owasp_prompt_not_loaded_after_clear_chat(page: Page, serve_hacka_re):
    """Test that the OWASP prompt is not loaded after clearing chat."""
    # Navigate to the page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Check initial context window usage
    initial_usage_text = page.locator(".usage-text").text_content()
    print(f"Initial context window usage: {initial_usage_text}")
    
    # Take a screenshot of initial state
    screenshot_with_markdown(page, "owasp_bug_initial_state", {
        "Test": "OWASP Prompt Bug",
        "State": "Initial",
        "Context Usage": initial_usage_text
    })
    
    # Add a test message to the chat
    message_input = page.locator("#message-input")
    message_input.fill("Test message before clearing chat")
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content", state="visible", timeout=2000)
    
    # Take a screenshot after adding message
    screenshot_with_markdown(page, "owasp_bug_after_message", {
        "Test": "OWASP Prompt Bug",
        "State": "After adding message",
        "Message": "Test message before clearing chat"
    })
    
    # Clear chat history
    clear_chat_btn = page.locator("#clear-chat-btn")
    
    # Set up a dialog handler to accept the confirmation dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Click the clear chat button
    clear_chat_btn.click()
    
    # Wait for the system message indicating chat was cleared
    page.wait_for_selector(".message.system .message-content:has-text('Chat history cleared')", 
                          state="visible", 
                          timeout=2000)
    
    # Check context window usage after clearing chat
    time.sleep(1)  # Give time for UI to update
    after_clear_usage_text = page.locator(".usage-text").text_content()
    print(f"Context window usage after clearing chat: {after_clear_usage_text}")
    
    # Take a screenshot after clearing chat
    screenshot_with_markdown(page, "owasp_bug_after_clear", {
        "Test": "OWASP Prompt Bug",
        "State": "After clearing chat",
        "Context Usage": after_clear_usage_text
    })
    
    # Convert percentage strings to numbers for comparison
    try:
        after_clear_percentage = int(after_clear_usage_text.strip('%'))
        
        # After clearing chat, the context usage should be low
        # If the OWASP prompt is loaded, it would be much higher (around 70-80%)
        assert after_clear_percentage < 20, f"Context usage is {after_clear_percentage}%, suggesting OWASP prompt was loaded"
        
        print(f"Context usage after clearing chat: {after_clear_percentage}%")
    except ValueError:
        # If we can't parse the percentage, just check that the OWASP text isn't in the system prompt
        print("Could not parse usage percentage, checking system prompt directly")
    
    # Directly check if OWASP is in the system prompt
    has_owasp_in_prompt = page.evaluate("""() => {
        const systemPrompt = localStorage.getItem('system_prompt') || '';
        return systemPrompt.includes('OWASP');
    }""")
    
    assert not has_owasp_in_prompt, "OWASP prompt was found in the system prompt after clearing chat"
    
    # Add another message to verify context usage remains stable
    message_input = page.locator("#message-input")
    message_input.fill("Test message after clearing chat")
    
    # Send the message
    send_button = page.locator("#send-btn")
    send_button.click()
    
    # Wait for the user message to appear in the chat
    page.wait_for_selector(".message.user .message-content:has-text('Test message after clearing chat')", 
                          state="visible", 
                          timeout=2000)
    
    # Check context window usage after adding a new message
    time.sleep(1)  # Give time for UI to update
    after_new_message_usage_text = page.locator(".usage-text").text_content()
    print(f"Context window usage after adding new message: {after_new_message_usage_text}")
    
    # Take a screenshot after adding new message
    screenshot_with_markdown(page, "owasp_bug_after_new_message", {
        "Test": "OWASP Prompt Bug",
        "State": "After adding new message",
        "Context Usage": after_new_message_usage_text
    })
    
    # Convert percentage strings to numbers for comparison
    try:
        after_new_message_percentage = int(after_new_message_usage_text.strip('%'))
        
        # The usage after adding a new message should still be low
        # A small increase is expected due to the new message, but not a large jump
        # that would indicate the OWASP prompt was loaded
        assert after_new_message_percentage < 20, f"Context usage jumped to {after_new_message_percentage}%, suggesting OWASP prompt was loaded"
        
        # The difference should be reasonable for just adding a message
        assert after_new_message_percentage - after_clear_percentage < 10, f"Context usage increased by {after_new_message_percentage - after_clear_percentage}%, which is more than expected"
        
        print(f"Context usage increase: {after_new_message_percentage - after_clear_percentage}%")
    except ValueError:
        # If we can't parse the percentages, just check that the OWASP text isn't in the system prompt
        print("Could not parse usage percentages, checking system prompt directly")
    
    # Check again if OWASP is in the system prompt
    has_owasp_in_prompt = page.evaluate("""() => {
        const systemPrompt = localStorage.getItem('system_prompt') || '';
        return systemPrompt.includes('OWASP');
    }""")
    
