"""Test that welcome message persists and state is properly synced in Share modal"""

from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal
import time

def test_share_welcome_message_persistence(page: Page, serve_hacka_re):
    """Test that welcome message persists when reopening Share modal and checkbox state syncs properly"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # 1. Open Share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    # Wait for modal to be visible
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Get references to welcome message elements
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    welcome_textarea = page.locator("#share-welcome-message")
    
    # 2. Verify initial state - checkbox unchecked, textarea disabled
    expect(welcome_checkbox).not_to_be_checked()
    expect(welcome_textarea).to_be_disabled()
    
    # Check opacity style
    opacity = page.evaluate("""
        () => window.getComputedStyle(document.getElementById('share-welcome-message')).opacity
    """)
    assert opacity == "0.5", f"Expected opacity 0.5 for disabled state, got {opacity}"
    
    # 3. Check the checkbox and enter a custom welcome message
    welcome_checkbox.check()
    expect(welcome_checkbox).to_be_checked()
    
    # Wait for state to update
    page.wait_for_timeout(100)
    
    # Verify textarea is now enabled
    expect(welcome_textarea).to_be_enabled()
    
    # Check opacity style
    opacity = page.evaluate("""
        () => window.getComputedStyle(document.getElementById('share-welcome-message')).opacity
    """)
    assert opacity == "1", f"Expected opacity 1 for enabled state, got {opacity}"
    
    # Enter a custom message
    custom_message = "Test custom welcome message!"
    welcome_textarea.fill(custom_message)
    expect(welcome_textarea).to_have_value(custom_message)
    
    # 4. Close the modal
    close_button = page.locator("#close-share-modal")
    close_button.click()
    expect(share_modal).not_to_be_visible()
    
    # 5. Reopen the modal
    share_button.click()
    expect(share_modal).to_be_visible()
    
    # 6. Verify the welcome message and checkbox state persisted
    expect(welcome_checkbox).to_be_checked()
    expect(welcome_textarea).to_have_value(custom_message)
    expect(welcome_textarea).to_be_enabled()
    
    # Check opacity style
    opacity = page.evaluate("""
        () => window.getComputedStyle(document.getElementById('share-welcome-message')).opacity
    """)
    assert opacity == "1", f"Expected opacity 1 for enabled state after reopening, got {opacity}"
    
    print("✅ Welcome message persistence test passed!")

def test_share_welcome_message_checkbox_sync(page: Page, serve_hacka_re):
    """Test that checkbox state properly syncs with textarea enabled/disabled state"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open Share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    welcome_textarea = page.locator("#share-welcome-message")
    
    # Check the checkbox
    welcome_checkbox.check()
    page.wait_for_timeout(100)
    
    # Verify textarea is enabled
    expect(welcome_textarea).to_be_enabled()
    assert page.evaluate("() => document.getElementById('share-welcome-message').style.opacity") == "1"
    
    # Uncheck the checkbox
    welcome_checkbox.uncheck()
    page.wait_for_timeout(100)
    
    # Verify textarea is disabled
    expect(welcome_textarea).to_be_disabled()
    assert page.evaluate("() => document.getElementById('share-welcome-message').style.opacity") == "0.5"
    
    # Check again
    welcome_checkbox.check()
    page.wait_for_timeout(100)
    
    # Verify textarea is enabled again
    expect(welcome_textarea).to_be_enabled()
    assert page.evaluate("() => document.getElementById('share-welcome-message').style.opacity") == "1"
    
    print("✅ Checkbox sync test passed!")

def test_share_welcome_from_shared_link_scenario(page: Page, serve_hacka_re):
    """Test that welcome message from a shared link persists when reopening Share modal"""
    # Simulate arriving from a shared link with a welcome message
    # This would normally be handled by SharedLinkDataProcessor but we can simulate it
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Inject a shared welcome message into the ShareManager
    page.evaluate("""
        () => {
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSharedWelcomeMessage('Welcome from shared link!');
            }
        }
    """)
    
    # Open Share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    welcome_checkbox = page.locator("#share-welcome-message-checkbox")
    welcome_textarea = page.locator("#share-welcome-message")
    
    # Verify the shared welcome message is shown and checkbox is checked
    expect(welcome_checkbox).to_be_checked()
    expect(welcome_textarea).to_have_value("Welcome from shared link!")
    expect(welcome_textarea).to_be_enabled()
    
    # Check opacity
    opacity = page.evaluate("""
        () => window.getComputedStyle(document.getElementById('share-welcome-message')).opacity
    """)
    assert opacity == "1", f"Expected opacity 1 for enabled state with shared link message, got {opacity}"
    
    # Close and reopen
    close_button = page.locator("#close-share-modal")
    close_button.click()
    expect(share_modal).not_to_be_visible()
    
    share_button.click()
    expect(share_modal).to_be_visible()
    
    # Verify message still there
    expect(welcome_checkbox).to_be_checked()
    expect(welcome_textarea).to_have_value("Welcome from shared link!")
    expect(welcome_textarea).to_be_enabled()
    
    print("✅ Shared link welcome message test passed!")