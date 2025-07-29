"""
Test namespace conversation persistence across tabs.
This test validates that conversations are saved and loaded correctly in namespaced storage.
"""

import time
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_namespace_conversation_persistence(page: Page, serve_hacka_re):
    """Test that conversations persist across tabs in the same namespace"""
    
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
    
    # STEP 1: Open first tab and get initial conversation
    print(f"STEP 1: Opening first tab with shared link: {shared_link_url}")
    page.goto(shared_link_url)
    
    # Wait for password modal and enter password
    password_modal = page.locator('.modal.password-modal, #password-modal')
    expect(password_modal).to_be_visible(timeout=5000)
    
    password_input = page.locator('#early-password-input, #decrypt-password')
    password_input.fill('asd')
    
    submit_button = page.locator('#early-password-submit')
    submit_button.click()
    
    # Wait for modal to disappear and conversation to load
    expect(password_modal).not_to_be_visible(timeout=5000)
    time.sleep(3)  # Give time for initialization
    
    screenshot_with_markdown(page, "first_tab_loaded", {
        "Status": "First tab loaded with initial conversation",
        "Expected": "Should show shared conversation"
    })
    
    # Check initial messages count
    initial_messages = page.locator('.message')
    initial_count = initial_messages.count()
    print(f"Initial messages count: {initial_count}")
    
    # STEP 2: Add a new message to create conversation history
    print("STEP 2: Adding new conversation message")
    
    # Find message input and send button
    message_input = page.locator('#message-input')
    send_button = page.locator('#send-button')
    
    # Type and send a test message
    test_message = "This is a test message from first tab"
    message_input.fill(test_message)
    
    screenshot_with_markdown(page, "before_sending_message", {
        "Status": "About to send test message",
        "Message": test_message
    })
    
    send_button.click()
    
    # Wait for response (we'll wait for message count to increase)
    def message_count_increased():
        current_count = page.locator('.message').count()
        return current_count > initial_count
    
    # Wait up to 10 seconds for new messages to appear
    page.wait_for_function(lambda: message_count_increased(), timeout=10000)
    
    # Wait a bit more for potential AI response
    time.sleep(3)
    
    screenshot_with_markdown(page, "after_sending_message", {
        "Status": "After sending message in first tab",
        "Initial Count": str(initial_count),
        "Current Count": str(page.locator('.message').count())
    })
    
    # Get current conversation state
    current_messages = page.locator('.message')
    current_count = current_messages.count()
    
    # Capture conversation content
    first_tab_messages = []
    for i in range(current_count):
        message = current_messages.nth(i)
        message_role = message.get_attribute('class') or 'unknown'
        message_text = message.text_content() or 'empty'
        first_tab_messages.append({
            'index': i,
            'role': message_role,
            'content': message_text[:100] + '...' if len(message_text) > 100 else message_text
        })
        print(f"First tab message {i}: {message_role} - {message_text[:100]}...")
    
    # STEP 3: Open second tab with same shared link
    print("STEP 3: Opening second tab with same shared link")
    
    # Create a new page (simulating a new tab)
    context = page.context
    second_page = context.new_page()
    
    # Setup console logging for second page
    second_console_messages = []
    def log_second_console_message(msg):
        timestamp = time.strftime("%H:%M:%S.%f")[:-3]
        second_console_messages.append({
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text
        })
        print(f"[{timestamp}] Second Tab Console {msg.type.upper()}: {msg.text}")
    
    second_page.on("console", log_second_console_message)
    
    # Navigate to same shared link
    second_page.goto(shared_link_url)
    
    # Check if password modal appears (it shouldn't if session key is shared)
    try:
        second_password_modal = second_page.locator('.modal.password-modal, #password-modal')
        expect(second_password_modal).to_be_visible(timeout=2000)
        print("Second tab: Password modal appeared, entering password")
        
        second_password_input = second_page.locator('#early-password-input, #decrypt-password')
        second_password_input.fill('asd')
        
        second_submit_button = second_page.locator('#early-password-submit')
        second_submit_button.click()
        
        expect(second_password_modal).not_to_be_visible(timeout=5000)
    except Exception:
        print("Second tab: No password modal (session key already available)")
    
    # Wait for second tab to load
    time.sleep(3)
    
    screenshot_with_markdown(second_page, "second_tab_loaded", {
        "Status": "Second tab loaded",
        "Expected": "Should show conversation from first tab including new message"
    })
    
    # Get conversation state in second tab
    second_tab_messages_locator = second_page.locator('.message')
    second_tab_count = second_tab_messages_locator.count()
    
    # Capture second tab conversation content
    second_tab_messages = []
    for i in range(second_tab_count):
        message = second_tab_messages_locator.nth(i)
        message_role = message.get_attribute('class') or 'unknown'
        message_text = message.text_content() or 'empty'
        second_tab_messages.append({
            'index': i,
            'role': message_role,
            'content': message_text[:100] + '...' if len(message_text) > 100 else message_text
        })
        print(f"Second tab message {i}: {message_role} - {message_text[:100]}...")
    
    screenshot_with_markdown(second_page, "comparison_state", {
        "Status": "Final comparison",
        "First Tab Messages": str(len(first_tab_messages)),
        "Second Tab Messages": str(len(second_tab_messages)),
        "Test Message Found in Second Tab": str(any(test_message in msg['content'] for msg in second_tab_messages))
    })
    
    # STEP 4: Assertions
    print("STEP 4: Checking persistence")
    
    # Check that the test message from first tab appears in second tab
    test_message_in_second_tab = any(test_message in msg['content'] for msg in second_tab_messages)
    
    # Save debug information
    import json
    try:
        with open('screenshots/namespace_persistence_debug.json', 'w') as f:
            json.dump({
                'first_tab_messages': first_tab_messages,
                'second_tab_messages': second_tab_messages,
                'first_tab_console': console_messages[-50:],  # Last 50 messages
                'second_tab_console': second_console_messages[-50:],
                'test_message': test_message,
                'test_message_found': test_message_in_second_tab
            }, f, indent=2)
    except Exception as e:
        print(f"Could not save debug info: {e}")
    
    # Clean up second page
    second_page.close()
    
    # Main assertion: conversation should persist between tabs
    assert test_message_in_second_tab, f"Test message '{test_message}' should appear in second tab but was not found"
    
    print(f"✅ Test passed: Conversation persisted between tabs")


if __name__ == "__main__":
    print("Run this test with: python -m pytest test_namespace_conversation_persistence.py -v -s")