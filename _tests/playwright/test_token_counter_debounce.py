import time
import pytest
from playwright.sync_api import expect

from test_utils import timed_test, dismiss_welcome_modal, dismiss_settings_modal

@timed_test
def test_token_counter_debounce(page, serve_hacka_re):
    """Test that the token counter is debounced when typing and pasting text."""
    # Navigate to the main page
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    dismiss_settings_modal(page)
    
    # Wait for the page to load
    page.wait_for_selector('#message-input', state='visible')
    
    # Get the initial token count
    token_count_element = page.locator('.model-context')
    initial_token_text = token_count_element.text_content()
    
    # Type a short message character by character (should be debounced)
    message_input = page.locator('#message-input')
    message_input.click()
    
    # Type slowly to simulate user typing
    test_message = "This is a test message"
    for char in test_message:
        message_input.type(char)
        time.sleep(0.05)  # Small delay between keystrokes
    
    # Wait for debounce to complete
    time.sleep(0.5)
    
    # Check that token count has updated after debounce
    updated_token_text = token_count_element.text_content()
    assert updated_token_text != initial_token_text, "Token count should update after debounce"
    
    # Clear the input
    message_input.fill("")
    time.sleep(0.5)
    
    # Get the token count after clearing
    cleared_token_text = token_count_element.text_content()
    
    # Paste a large text (should update immediately)
    large_text = "A" * 200  # 200 characters
    message_input.fill(large_text)
    
    # Check that token count updates immediately for large pastes
    time.sleep(0.1)  # Small wait to ensure the UI has updated
    large_paste_token_text = token_count_element.text_content()
    assert large_paste_token_text != cleared_token_text, "Token count should update immediately for large pastes"
    
    # Verify that the token count shows a reasonable value
    # Extract the number from the token text (format: "X tokens" or "X / Y tokens")
    token_count = int(large_paste_token_text.split()[0].replace(',', ''))
    
    # A 200 character text should be roughly 50 tokens (using the 4 chars per token approximation)
    # Allow for some variation in the estimate
    assert token_count >= 40, f"Token count ({token_count}) is too low for a 200 character text"
    assert token_count <= 60, f"Token count ({token_count}) is too high for a 200 character text"
