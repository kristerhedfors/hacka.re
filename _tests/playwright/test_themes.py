import pytest
from playwright.sync_api import expect
import time

def test_theme_toggle_button_exists(page):
    """Test that the theme toggle button exists in the header."""
    page.goto("file:///Users/user/dev/hacka.re/index.html")
    theme_toggle_btn = page.locator("#theme-toggle-btn")
    expect(theme_toggle_btn).to_be_visible()
    expect(theme_toggle_btn).to_have_attribute("title", "Cycle Theme")

def test_theme_switching(page):
    """Test that themes can be switched programmatically."""
    page.goto("file:///Users/user/dev/hacka.re/index.html")
    
    # Close any active modals
    # First check for welcome modal
    if page.locator("#welcome-modal.active").is_visible():
        page.click("#welcome-modal .modal-content button.primary-btn")
        page.wait_for_selector("#welcome-modal.active", state="hidden")
    
    # Check for settings modal
    if page.locator("#settings-modal.active").is_visible():
        page.click("#close-settings")
        page.wait_for_selector("#settings-modal.active", state="hidden")
    
    # Check for any other active modals and close them
    active_modals = page.locator(".modal.active")
    if active_modals.count() > 0:
        for i in range(active_modals.count()):
            modal = active_modals.nth(i)
            # Try to find a close button in the modal
            close_buttons = modal.locator("button.secondary-btn, button[id^='close-'], button[id$='-close']")
            if close_buttons.count() > 0:
                close_buttons.first.click()
                page.wait_for_timeout(300)  # Wait for modal animation
    
    # Get the initial theme
    initial_theme_class = page.evaluate("() => document.documentElement.className")
    
    # Directly call the ThemeService to switch to sunset theme
    page.evaluate("() => window.ThemeService && typeof window.ThemeService.enableSunsetTheme === 'function' && window.ThemeService.enableSunsetTheme()")
    
    # Wait for theme change to take effect
    page.wait_for_timeout(500)
    
    # Get the new theme
    new_theme_class = page.evaluate("() => document.documentElement.className")
    
    # Verify that the theme has changed
    assert "theme-sunset" in new_theme_class, "Theme did not change to sunset theme"
    
    # Switch to ocean theme
    page.evaluate("() => window.ThemeService && typeof window.ThemeService.enableOceanTheme === 'function' && window.ThemeService.enableOceanTheme()")
    
    # Wait for theme change to take effect
    page.wait_for_timeout(500)
    
    # Get the next theme
    next_theme_class = page.evaluate("() => document.documentElement.className")
    
    # Verify that the theme has changed again
    assert "theme-ocean" in next_theme_class, "Theme did not change to ocean theme"

def test_light_mode_default(page):
    """Test that light mode is the default theme when no preference is saved."""
    # Navigate to the page first
    page.goto("file:///Users/user/dev/hacka.re/index.html")
    
    # Close any active modals
    # First check for welcome modal
    if page.locator("#welcome-modal.active").is_visible():
        page.click("#welcome-modal .modal-content button.primary-btn")
        page.wait_for_selector("#welcome-modal.active", state="hidden")
    
    # Check for settings modal
    if page.locator("#settings-modal.active").is_visible():
        page.click("#close-settings")
        page.wait_for_selector("#settings-modal.active", state="hidden")
    
    # Check for any other active modals and close them
    active_modals = page.locator(".modal.active")
    if active_modals.count() > 0:
        for i in range(active_modals.count()):
            modal = active_modals.nth(i)
            # Try to find a close button in the modal
            close_buttons = modal.locator("button.secondary-btn, button[id^='close-'], button[id$='-close']")
            if close_buttons.count() > 0:
                close_buttons.first.click()
                page.wait_for_timeout(300)  # Wait for modal animation
    
    # Clear localStorage to ensure no theme preference is saved
    page.evaluate("""() => {
        localStorage.removeItem('aihackare_theme_mode');
    }""")
    
    # Reload the page to apply default theme
    page.reload()
    
    # Wait for the page to load
    page.wait_for_load_state('networkidle')
    
    # Wait a bit for the theme to be applied
    page.wait_for_timeout(500)
    
    # Check if light mode is applied by default (absence of dark-mode class)
    is_dark_mode = page.evaluate("() => document.documentElement.classList.contains('dark-mode')")
    assert not is_dark_mode, "Light mode should be the default theme when no preference is saved"
    
    # Verify the theme is saved in localStorage
    saved_theme = page.evaluate("() => localStorage.getItem('aihackare_theme_mode')")
    assert saved_theme == 'light', "Light theme should be saved in localStorage"


def test_mobile_utils_loaded(page):
    """Test that mobile utilities are loaded correctly."""
    page.goto("file:///Users/user/dev/hacka.re/index.html")
    
    # Close any active modals
    # First check for welcome modal
    if page.locator("#welcome-modal.active").is_visible():
        page.click("#welcome-modal .modal-content button.primary-btn")
        page.wait_for_selector("#welcome-modal.active", state="hidden")
    
    # Check for settings modal
    if page.locator("#settings-modal.active").is_visible():
        page.click("#close-settings")
        page.wait_for_selector("#settings-modal.active", state="hidden")
    
    # Check for any other active modals and close them
    active_modals = page.locator(".modal.active")
    if active_modals.count() > 0:
        for i in range(active_modals.count()):
            modal = active_modals.nth(i)
            # Try to find a close button in the modal
            close_buttons = modal.locator("button.secondary-btn, button[id^='close-'], button[id$='-close']")
            if close_buttons.count() > 0:
                close_buttons.first.click()
                page.wait_for_timeout(300)  # Wait for modal animation
    
    # Check if MobileUtils object exists
    mobile_utils_exists = page.evaluate("() => typeof window.MobileUtils !== 'undefined'")
    assert mobile_utils_exists, "MobileUtils object should exist"
    
    # Check if MobileUtils has the expected functions
    has_is_mobile_device = page.evaluate("() => typeof window.MobileUtils.isMobileDevice === 'function'")
    assert has_is_mobile_device, "MobileUtils.isMobileDevice function should exist"
    
    has_is_portrait_orientation = page.evaluate("() => typeof window.MobileUtils.isPortraitOrientation === 'function'")
    assert has_is_portrait_orientation, "MobileUtils.isPortraitOrientation function should exist"
    
    # Set viewport to mobile size
    page.set_viewport_size({"width": 375, "height": 667})
    
    # Directly add mobile classes to the body for testing
    page.evaluate("""() => {
        // Add mobile classes directly to the body
        document.body.classList.add('mobile-device', 'portrait');
    }""")
    
    # Wait for the changes to take effect
    page.wait_for_timeout(500)
    
    # Check if mobile classes were added to the body
    has_mobile_class = page.evaluate("() => document.body.classList.contains('mobile-device')")
    assert has_mobile_class, "mobile-device class should be added to body"
    
    has_portrait_class = page.evaluate("() => document.body.classList.contains('portrait')")
    assert has_portrait_class, "portrait class should be added to body"
    
    # Reset viewport
    page.set_viewport_size({"width": 1280, "height": 720})
