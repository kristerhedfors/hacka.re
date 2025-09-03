"""Test that Share modal welcome message has correct initial state on clean load"""

from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal
import time

def test_share_welcome_clean_initial_state(page: Page, serve_hacka_re):
    """Test that on a fresh load (no localStorage), the welcome message has correct initial state"""
    # Clear localStorage to ensure clean state
    page.goto(serve_hacka_re)
    page.evaluate("() => localStorage.clear()")
    
    # Reload the page
    page.reload()
    dismiss_welcome_modal(page)
    
    # Open Share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    welcome_textarea = page.locator("#share-welcome-message")
    
    # Verify initial state: checkbox unchecked, textarea disabled
    expect(welcome_checkbox).not_to_be_checked()
    expect(welcome_textarea).to_be_disabled()
    
    # Check opacity style
    opacity = page.evaluate("""
        () => window.getComputedStyle(document.getElementById('share-welcome-message')).opacity
    """)
    assert opacity == "0.5", f"Expected opacity 0.5 for disabled state on clean load, got {opacity}"
    
    # Verify textarea is empty initially
    expect(welcome_textarea).to_have_value("")
    
    print("✅ Clean initial state test passed!")

def test_share_welcome_with_saved_unchecked_state(page: Page, serve_hacka_re):
    """Test that saved unchecked state is properly restored"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set localStorage to have checkbox unchecked but with a message
    page.evaluate("""
        () => {
            localStorage.setItem('shareModalWelcomeCheckbox', 'false');
            localStorage.setItem('shareModalWelcomeMessage', 'Previous message');
        }
    """)
    
    # Open Share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    welcome_textarea = page.locator("#share-welcome-message")
    
    # Checkbox should be unchecked
    expect(welcome_checkbox).not_to_be_checked()
    
    # Textarea should be disabled (grayed out)
    expect(welcome_textarea).to_be_disabled()
    opacity = page.evaluate("""
        () => window.getComputedStyle(document.getElementById('share-welcome-message')).opacity
    """)
    assert opacity == "0.5", f"Expected opacity 0.5 for disabled state, got {opacity}"
    
    # Message should still be there (preserved but disabled)
    expect(welcome_textarea).to_have_value("Previous message")
    
    print("✅ Saved unchecked state test passed!")

def test_share_welcome_with_saved_checked_state(page: Page, serve_hacka_re):
    """Test that saved checked state is properly restored"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set localStorage to have checkbox checked with a message
    page.evaluate("""
        () => {
            localStorage.setItem('shareModalWelcomeCheckbox', 'true');
            localStorage.setItem('shareModalWelcomeMessage', 'My custom welcome!');
        }
    """)
    
    # Open Share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    welcome_textarea = page.locator("#share-welcome-message")
    
    # Checkbox should be checked
    expect(welcome_checkbox).to_be_checked()
    
    # Textarea should be enabled
    expect(welcome_textarea).to_be_enabled()
    opacity = page.evaluate("""
        () => window.getComputedStyle(document.getElementById('share-welcome-message')).opacity
    """)
    assert opacity == "1", f"Expected opacity 1 for enabled state, got {opacity}"
    
    # Message should be there
    expect(welcome_textarea).to_have_value("My custom welcome!")
    
    print("✅ Saved checked state test passed!")