"""
Test shared link conversation continuity functionality.
This test validates that shared links properly display conversation history.
"""

import time
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_shared_link_conversation_continuity(page: Page, serve_hacka_re):
    """Test that shared links properly display conversation history"""
    
    # The specific shared link from the user with password 'asd'
    shared_link_url = f"{serve_hacka_re}#gpt=EEGWCBjnHy5OER+ulp2SVa0MxHnFBugLuYrrsmyN7l/42BVoZ2z5Am9Jwh/5ewqJkGJjljOaxDie8TCvM38gvgoOf5GxWAj0gfLrjzY9jCH27GLZrxVLzmtuokCmqIZ9EQVdpSDcUHcLQ5PoxihTWLlGAV9po/lq8wA+H5FqdeCRKdKnIXRX1RV3m0GhXupKHTNnGnCrw58+oaCm0MlUT6iWVK1GSMJbSzfnjrzRhqF7nk4OTwSwOL+upPwR3C+K0F0kh7wt0DELIA7Oz/Mylz5IC/W+ef+3n/NJqwFFiLUVn7EvWMvBTOJbABORe+RIoaDgGqWtqwTbM/OG3ckxENEHQmn3HKxV+7hCe31IrnXUAKRQ85uEWPwCAJib+wt1y6V/fsZRx8Mqg4WRhCP6DeU37B6SsMADv6s2JR5PjL2h1S0VEcuok4dG/AXwAyAuA/lBEucbrwFdy9iVvAnTCQ1ta2bQn2Q2TVcTAOyjoVaHRr5vWkQf+lTMfwW22FGvsL1oDQSSOXrJUZuDejtGEHToTULcwN7UgKVUY2t6krOjkfjT+tuPtLBJ0EfI//zce6pIaIM+xen5DQ=="
    
    # Setup console logging to capture debug information
    console_messages = []
    def log_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        })
        print(f"[{timestamp}] Console {msg.type.upper()}: {msg.text}")
    
    page.on("console", log_console_message)
    
    # Navigate to the shared link
    print(f"Navigating to shared link: {shared_link_url}")
    page.goto(shared_link_url)
    
    screenshot_with_markdown(page, "after_navigation", {
        "Status": "Navigated to shared link",
        "URL": shared_link_url,
        "Expected": "Password modal should appear"
    })
    
    # Wait for password modal to appear
    password_modal = page.locator('.modal.password-modal, #password-modal')
    expect(password_modal).to_be_visible(timeout=5000)
    
    screenshot_with_markdown(page, "password_modal_visible", {
        "Status": "Password modal appeared",
        "Modal": "Visible and ready for input"
    })
    
    # Enter the password 'asd'
    password_input = page.locator('#early-password-input, #decrypt-password')
    password_input.fill('asd')
    
    # Submit the password
    submit_button = page.locator('#early-password-submit')
    submit_button.click()
    
    screenshot_with_markdown(page, "password_submitted", {
        "Status": "Password submitted",
        "Password": "asd",
        "Expected": "Modal should close and conversation should load"
    })
    
    # Wait for modal to disappear
    expect(password_modal).not_to_be_visible(timeout=5000)
    
    # Wait for conversation to load
    time.sleep(3)  # Give time for all initialization to complete
    
    screenshot_with_markdown(page, "after_password_entry", {
        "Status": "After password entry and initialization",
        "Expected": "Should show conversation with user message 'sdfsd' and assistant response"
    })
    
    # Check for conversation messages in the chat
    chat_messages = page.locator('.message')
    message_count = chat_messages.count()
    
    print(f"Found {message_count} messages in chat")
    
    # Capture all message content for debugging
    messages_content = []
    for i in range(message_count):
        message = chat_messages.nth(i)
        message_role = message.get_attribute('class') or 'unknown'
        message_text = message.text_content() or 'empty'
        messages_content.append({
            'index': i,
            'role': message_role,
            'content': message_text[:100] + '...' if len(message_text) > 100 else message_text
        })
        print(f"Message {i}: {message_role} - {message_text[:100]}...")
    
    screenshot_with_markdown(page, "final_state", {
        "Status": "Final state after conversation load",
        "Messages Found": str(message_count),
        "Messages": str(messages_content),
        "Console Messages": str(len(console_messages))
    })
    
    # Check if we have the expected conversation
    has_user_message = any('sdfsd' in msg['content'] for msg in messages_content)
    has_assistant_message = any('looks like you\'ve typed' in msg['content'].lower() for msg in messages_content)
    
    print(f"Has user message 'sdfsd': {has_user_message}")
    print(f"Has assistant response: {has_assistant_message}")
    
    # Save console logs for analysis
    import json
    try:
        with open('screenshots/console_logs_shared_link.json', 'w') as f:
            json.dump(console_messages, f, indent=2)
    except Exception as e:
        print(f"Could not save console logs: {e}")
    
    # Assertions
    assert message_count > 0, f"Expected messages to be displayed, but found {message_count}"
    assert has_user_message or has_assistant_message, "Expected to find conversation messages with 'sdfsd' or assistant response"
    
    # Check that we don't just have system messages
    system_only_messages = all('system' in msg['role'].lower() for msg in messages_content)
    assert not system_only_messages, "Found only system messages, expected conversation messages"


if __name__ == "__main__":
    print("Run this test with: python -m pytest test_shared_link_conversation_continuity.py -v -s")