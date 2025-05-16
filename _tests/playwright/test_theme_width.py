import pytest
from playwright.sync_api import expect
import time

def test_theme_width_consistency(page):
    """Test that all themes have consistent width behavior."""
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
    
    # Set a large viewport to test width behavior
    page.set_viewport_size({"width": 1920, "height": 1080})
    
    # Test each theme for consistent width behavior
    themes = ['light', 'dark', 'sunset', 'ocean', 'forest', 'midnight']
    
    for theme in themes:
        # Apply the theme
        page.evaluate(f"() => window.ThemeService && typeof window.ThemeService.applyTheme === 'function' && window.ThemeService.applyTheme('{theme}')")
        
        # Wait for theme change to take effect
        page.wait_for_timeout(500)
        
        # Get the app container width
        app_container_width = page.evaluate("() => document.querySelector('.app-container').offsetWidth")
        
        # Get the viewport width
        viewport_width = page.evaluate("() => window.innerWidth")
        
        # Verify that the app container takes the full width of the viewport
        # We allow a small margin of error (10px) for potential scrollbars or other UI elements
        assert abs(app_container_width - viewport_width) <= 10, f"Theme '{theme}' app container width ({app_container_width}px) should be close to viewport width ({viewport_width}px)"
        
        # Take a screenshot for visual verification
        page.screenshot(path=f"screenshots/theme_width_{theme}.png")
        
        print(f"Theme '{theme}' app container width: {app_container_width}px, viewport width: {viewport_width}px")
