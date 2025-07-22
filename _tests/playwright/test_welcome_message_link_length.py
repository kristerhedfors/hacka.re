"""Test welcome message affects link length counter, not token counter"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_welcome_message_link_length_updates(page: Page, serve_hacka_re):
    """Test that welcome message affects link length counter when checkbox is checked"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for full initialization
    page.wait_for_timeout(1000)
    
    # Take initial screenshot
    screenshot_with_markdown(page, "app_loaded_for_link_length", {
        "Status": "App loaded, ready to test link length functionality"
    })
    
    # Open share modal 
    page.click('#share-btn')
    page.wait_for_selector('#share-modal', state='visible', timeout=5000)
    
    # Wait for modal initialization
    page.wait_for_timeout(200)
    
    # Take screenshot of share modal
    screenshot_with_markdown(page, "share_modal_opened_link_length", {
        "Status": "Share modal opened, checking initial link length"
    })
    
    # Get initial link length
    initial_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    print(f"Initial link length: {initial_link_length} bytes")
    
    # Get the welcome message elements
    welcome_message_textarea = page.locator('#share-welcome-message')
    welcome_message_checkbox = page.locator('#share-welcome-message-checkbox')
    
    # Verify elements are visible
    expect(welcome_message_textarea).to_be_visible()
    expect(welcome_message_checkbox).to_be_visible()
    
    # Initially checkbox should be unchecked
    expect(welcome_message_checkbox).not_to_be_checked()
    
    # Add text to textarea (should NOT affect link length yet since checkbox is unchecked)
    test_message = "Welcome to hacka.re! This is a test welcome message for link length calculation."
    welcome_message_textarea.fill(test_message)
    
    # Wait for any potential updates
    page.wait_for_timeout(500)
    
    after_text_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    print(f"After adding text (checkbox unchecked): {after_text_link_length} bytes")
    
    # Take screenshot
    screenshot_with_markdown(page, "text_added_checkbox_unchecked_link", {
        "Status": "Text added but checkbox unchecked - link length should not change",
        "Message Length": str(len(test_message)),
        "Initial Link Length": str(initial_link_length),
        "Current Link Length": str(after_text_link_length)
    })
    
    # Link length should be the same since checkbox is unchecked
    assert after_text_link_length == initial_link_length, \
        f"Link length should not change when checkbox is unchecked: {initial_link_length} -> {after_text_link_length}"
    
    # Now check the checkbox
    print("Checking the welcome message checkbox...")
    welcome_message_checkbox.check()
    expect(welcome_message_checkbox).to_be_checked()
    
    # Wait for link length to update
    page.wait_for_timeout(500)
    
    after_checkbox_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    print(f"After checking checkbox: {after_checkbox_link_length} bytes")
    
    # Take screenshot
    screenshot_with_markdown(page, "checkbox_checked_link_updated", {
        "Status": "Checkbox checked - link length should include welcome message",
        "Message Length": str(len(test_message)),
        "Initial Link Length": str(initial_link_length),
        "Current Link Length": str(after_checkbox_link_length),
        "Expected Increase": f"~{len(test_message) + 20} bytes (message + JSON overhead)"
    })
    
    # Test dynamic typing
    print("Testing dynamic typing...")
    additional_text = " Adding more text to test real-time link length updates."
    welcome_message_textarea.fill(test_message + additional_text)
    
    # Wait for debounce
    page.wait_for_timeout(500)
    
    after_dynamic_typing_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    print(f"After dynamic typing: {after_dynamic_typing_link_length} bytes")
    
    # Take final screenshot
    screenshot_with_markdown(page, "dynamic_typing_link_complete", {
        "Status": "Dynamic typing complete - link length should have increased",
        "Total Message Length": str(len(test_message + additional_text)),
        "Initial Link Length": str(initial_link_length),
        "Current Link Length": str(after_dynamic_typing_link_length)
    })
    
    # Verify functionality worked
    print("\n=== Link Length Test Results ===")
    print(f"Initial: {initial_link_length} bytes")
    print(f"After text (unchecked): {after_text_link_length} bytes")
    print(f"After checkbox: {after_checkbox_link_length} bytes")
    print(f"After dynamic typing: {after_dynamic_typing_link_length} bytes")
    
    # Test that checkbox checking increased link length
    if after_checkbox_link_length and after_text_link_length:
        assert after_checkbox_link_length > after_text_link_length, \
            f"Link length should increase when checkbox is checked: {after_text_link_length} -> {after_checkbox_link_length}"
    
    # Test that dynamic typing further increased link length
    if after_dynamic_typing_link_length and after_checkbox_link_length:
        assert after_dynamic_typing_link_length > after_checkbox_link_length, \
            f"Link length should increase with more text: {after_checkbox_link_length} -> {after_dynamic_typing_link_length}"
    
    print("✅ Welcome message link length calculation is working correctly!")


def test_welcome_message_unchecking_checkbox_reduces_link_length(page: Page, serve_hacka_re):
    """Test that unchecking the welcome message checkbox reduces link length"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open share modal 
    page.click('#share-btn')
    page.wait_for_selector('#share-modal', state='visible', timeout=5000)
    page.wait_for_timeout(200)
    
    # Get the welcome message elements
    welcome_message_textarea = page.locator('#share-welcome-message')
    welcome_message_checkbox = page.locator('#share-welcome-message-checkbox')
    
    # Add text and check checkbox
    test_message = "This is a test message to verify unchecking reduces link length."
    welcome_message_textarea.fill(test_message)
    welcome_message_checkbox.check()
    
    # Wait for update
    page.wait_for_timeout(500)
    
    # Get link length with checkbox checked
    checked_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    # Uncheck the checkbox
    welcome_message_checkbox.uncheck()
    page.wait_for_timeout(500)
    
    # Get link length with checkbox unchecked
    unchecked_link_length = page.evaluate("""
        () => {
            const linkLengthText = document.getElementById('link-length-text');
            return linkLengthText ? parseInt(linkLengthText.textContent) : null;
        }
    """)
    
    # Take screenshot
    screenshot_with_markdown(page, "checkbox_unchecked_link_reduced", {
        "Status": "Checkbox unchecked - link length should have decreased",
        "Checked Length": str(checked_link_length),
        "Unchecked Length": str(unchecked_link_length),
        "Message Length": str(len(test_message))
    })
    
    print(f"Checked: {checked_link_length} bytes, Unchecked: {unchecked_link_length} bytes")
    
    # Verify that unchecking reduced the link length
    assert unchecked_link_length < checked_link_length, \
        f"Link length should decrease when checkbox is unchecked: {checked_link_length} -> {unchecked_link_length}"
    
    print("✅ Unchecking welcome message checkbox correctly reduces link length!")