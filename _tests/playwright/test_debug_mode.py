import pytest
from playwright.sync_api import expect

def test_debug_mode_checkbox_exists(page, serve_hacka_re):
    """Test that the debug mode checkbox exists in the settings modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    from test_utils import dismiss_welcome_modal, dismiss_settings_modal
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Wait for settings modal to be visible
    expect(page.locator("#settings-modal")).to_be_visible()
    
    # Scroll to the system prompt section to ensure the debug checkbox is in view
    page.locator("#open-prompts-config").scroll_into_view_if_needed()
    
    # Wait for debug mode checkbox to be added dynamically
    debug_checkbox = page.locator("#debug-mode")
    debug_checkbox.wait_for(state="visible", timeout=2000)
    
    # Check if the label text is correct
    debug_label = page.locator("label[for='debug-mode']")
    expect(debug_label).to_be_visible()
    expect(debug_label).to_have_text("Debug mode")

def test_debug_mode_toggle(page, serve_hacka_re):
    """Test that the debug mode checkbox can be toggled."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    from test_utils import dismiss_welcome_modal, dismiss_settings_modal
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if already open
    dismiss_settings_modal(page)
    
    # Open settings modal
    page.click("#settings-btn")
    
    # Wait for settings modal to be visible
    expect(page.locator("#settings-modal")).to_be_visible()
    
    # Scroll to the system prompt section to ensure the debug checkbox is in view
    page.locator("#open-prompts-config").scroll_into_view_if_needed()
    
    # Wait for and get the debug mode checkbox
    debug_checkbox = page.locator("#debug-mode")
    debug_checkbox.wait_for(state="visible", timeout=2000)
    
    # Check initial state (should be unchecked by default)
    initial_checked = debug_checkbox.is_checked()
    
    # Toggle the checkbox
    debug_checkbox.click()
    
    # Verify the checkbox state has changed
    expect(debug_checkbox).to_be_checked() if not initial_checked else expect(debug_checkbox).not_to_be_checked()
    
    # Toggle back
    debug_checkbox.click()
    
    # Verify it's back to the initial state
    expect(debug_checkbox).to_be_checked() if initial_checked else expect(debug_checkbox).not_to_be_checked()

# test_debug_mode_persistence removed - debug mode persistence is no longer supported
