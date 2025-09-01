"""Test welcome message performance with large text paste"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_welcome_message_large_text_performance(page: Page, serve_hacka_re):
    """Test that large text paste doesn't cause performance issues"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    # Open share modal 
    page.click('#share-btn')
    page.wait_for_selector('#share-modal', state='visible', timeout=5000)
    page.wait_for_timeout(200)
    
    # Get elements
    welcome_message_textarea = page.locator('#share-welcome-message')
    welcome_message_checkbox = page.locator('#share-welcome-message-checkbox')
    
    # Check the checkbox first
    welcome_message_checkbox.check()
    page.wait_for_timeout(100)
    
    # Create a large text (simulating a wall of text)
    large_text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 200  # ~11,400 characters
    
    print(f"Testing with large text: {len(large_text)} characters")
    
    # Measure time to paste large text
    start_time = time.time()
    
    # Paste the large text
    welcome_message_textarea.fill(large_text)
    
    # Wait a reasonable amount of time for debounced update
    page.wait_for_timeout(600)  # Slightly more than our 500ms debounce
    
    end_time = time.time()
    paste_duration = end_time - start_time
    
    print(f"Large text paste completed in: {paste_duration:.2f} seconds")
    
    # Get the final link length
    final_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    print(f"Final link length: {final_link_length} bytes")
    
    # Take screenshot
    screenshot_with_markdown(page, "large_text_performance", {
        "Status": "Large text paste performance test completed",
        "Text Length": f"{len(large_text)} characters",
        "Duration": f"{paste_duration:.2f} seconds",
        "Link Length": str(final_link_length)
    })
    
    # Verify the functionality works with large text
    assert final_link_length and final_link_length > 1000, \
        f"Link length should reflect the large text: {final_link_length}"
    
    # Performance should be reasonable (under 2 seconds for large paste + debounce)
    assert paste_duration < 2.0, \
        f"Large text paste took too long: {paste_duration:.2f} seconds"
    
    print("✅ Large text paste performance test passed!")


def test_welcome_message_minimal_console_output(page: Page, serve_hacka_re):
    """Test that console logging is minimal during welcome message updates"""
    
    # Collect console messages
    console_messages = []
    
    def handle_console_message(msg):
        # Only capture messages related to welcome message functionality
        text = msg.text.lower()
        if any(keyword in text for keyword in ['welcome', 'link length', 'updateLinkLengthBar']):
            console_messages.append(f"{msg.type}: {msg.text}")
    
    page.on("console", handle_console_message)
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    # Open share modal 
    page.click('#share-btn')
    page.wait_for_selector('#share-modal', state='visible', timeout=5000)
    page.wait_for_timeout(200)
    
    # Get elements
    welcome_message_textarea = page.locator('#share-welcome-message')
    welcome_message_checkbox = page.locator('#share-welcome-message-checkbox')
    
    # Clear console messages collected during initialization
    console_messages.clear()
    
    # Check the checkbox (should produce minimal console output)
    welcome_message_checkbox.check()
    page.wait_for_timeout(100)
    
    # Add some text (should produce minimal console output)
    welcome_message_textarea.fill("Test message for console logging verification")
    page.wait_for_timeout(600)  # Wait for debounce
    
    # Add more text to trigger another update
    welcome_message_textarea.fill("Test message for console logging verification - updated")
    page.wait_for_timeout(600)  # Wait for debounce
    
    # Uncheck checkbox
    welcome_message_checkbox.uncheck()
    page.wait_for_timeout(100)
    
    print(f"Console messages captured: {len(console_messages)}")
    for msg in console_messages:
        print(f"  {msg}")
    
    # Take screenshot
    screenshot_with_markdown(page, "minimal_console_logging", {
        "Status": "Console logging test completed",
        "Console Messages": str(len(console_messages)),
        "Expected": "Minimal logging (< 5 messages)"
    })
    
    # Should have minimal console output (less than 5 messages for all operations)
    assert len(console_messages) < 5, \
        f"Too many console messages ({len(console_messages)}). Expected < 5 for performance."
    
    print("✅ Minimal console logging test passed!")


def test_welcome_message_typing_performance(page: Page, serve_hacka_re):
    """Test performance during continuous typing simulation"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    # Open share modal 
    page.click('#share-btn')
    page.wait_for_selector('#share-modal', state='visible', timeout=5000)
    page.wait_for_timeout(200)
    
    # Get elements
    welcome_message_textarea = page.locator('#share-welcome-message')
    welcome_message_checkbox = page.locator('#share-welcome-message-checkbox')
    
    # Check the checkbox
    welcome_message_checkbox.check()
    page.wait_for_timeout(100)
    
    # Simulate rapid typing by adding text incrementally
    base_text = "This is a typing performance test. "
    
    start_time = time.time()
    
    # Simulate typing 20 additions (like fast typing)
    for i in range(20):
        current_text = base_text * (i + 1)
        welcome_message_textarea.fill(current_text)
        page.wait_for_timeout(50)  # Simulate fast typing (50ms between keystrokes)
    
    # Wait for final debounced update
    page.wait_for_timeout(600)
    
    end_time = time.time()
    typing_duration = end_time - start_time
    
    print(f"Typing simulation completed in: {typing_duration:.2f} seconds")
    
    # Get final link length
    final_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    print(f"Final link length after typing: {final_link_length} bytes")
    
    # Take screenshot
    screenshot_with_markdown(page, "typing_performance", {
        "Status": "Typing performance test completed",
        "Duration": f"{typing_duration:.2f} seconds",
        "Final Text Length": f"{len(base_text * 20)} characters",
        "Link Length": str(final_link_length)
    })
    
    # Verify reasonable performance (should complete quickly due to debouncing)
    assert typing_duration < 3.0, \
        f"Typing simulation took too long: {typing_duration:.2f} seconds"
    
    # Verify functionality still works
    assert final_link_length and final_link_length > 500, \
        f"Link length should reflect the typed text: {final_link_length}"
    
    print("✅ Typing performance test passed!")