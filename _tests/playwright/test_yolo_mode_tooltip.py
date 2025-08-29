"""Test YOLO mode tooltip functionality"""

from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_yolo_mode_tooltip(page: Page, serve_hacka_re):
    """Test that YOLO mode info icon shows tooltip on hover"""
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Close any existing settings modal first
    settings_modal = page.locator("#settings-modal")
    if settings_modal.is_visible():
        close_button = page.locator("#close-settings")
        if close_button.is_visible():
            close_button.click()
            page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for settings modal to be visible
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Find the info icon next to YOLO mode
    yolo_info_icon = page.locator("label[for='yolo-mode']").locator(".info-icon")
    expect(yolo_info_icon).to_be_visible()
    
    # Initially tooltip should not be visible
    tooltip = yolo_info_icon.locator(".tooltip")
    expect(tooltip).to_have_css("display", "none")
    
    # Hover over info icon
    yolo_info_icon.hover()
    
    # Wait a moment for tooltip to appear
    page.wait_for_timeout(100)
    
    # Tooltip should now be visible
    expect(tooltip).to_have_css("display", "block")
    
    # Check tooltip content
    tooltip_content = tooltip.locator(".tooltip-content")
    expect(tooltip_content).to_contain_text("YOLO Mode")
    expect(tooltip_content).to_contain_text("Bypass function execution confirmations")
    expect(tooltip_content).to_contain_text("When disabled, you will be prompted")
    expect(tooltip_content).to_contain_text("When enabled, functions execute automatically")
    expect(tooltip_content).to_contain_text("This setting is never shared through links")
    
    screenshot_with_markdown(page, "yolo_mode_tooltip", {
        "Status": "Tooltip visible on hover",
        "Component": "Settings Modal",
        "Tooltip": "Info tooltip showing YOLO mode details"
    })
    
    # Move mouse away
    page.locator("#settings-modal h2").hover()
    page.wait_for_timeout(100)
    
    # Tooltip should be hidden again
    expect(tooltip).to_have_css("display", "none")


def test_yolo_mode_warning_icon_toggle(page: Page, serve_hacka_re):
    """Test that warning icon only shows when YOLO mode is enabled"""
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Close any existing settings modal first
    settings_modal = page.locator("#settings-modal")
    if settings_modal.is_visible():
        close_button = page.locator("#close-settings")
        if close_button.is_visible():
            close_button.click()
            page.wait_for_selector("#settings-modal", state="hidden", timeout=2000)
    
    # Open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for settings modal
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Check warning icon is initially hidden
    warning_icon = page.locator("#yolo-warning-icon")
    expect(warning_icon).to_have_css("display", "none")
    
    # Set up dialog handler to accept warning
    def handle_dialog(dialog):
        dialog.accept()
    page.on("dialog", handle_dialog)
    
    # Enable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode")
    yolo_checkbox.click()
    page.wait_for_timeout(500)
    
    # Warning icon should now be visible
    expect(warning_icon).to_have_css("display", "inline")
    
    screenshot_with_markdown(page, "yolo_mode_warning_visible", {
        "Status": "YOLO mode enabled",
        "Component": "Settings Modal",
        "Warning Icon": "Visible when enabled"
    })
    
    # Disable YOLO mode
    yolo_checkbox.click()
    page.wait_for_timeout(100)
    
    # Warning icon should be hidden again
    expect(warning_icon).to_have_css("display", "none")
    
    screenshot_with_markdown(page, "yolo_mode_warning_hidden", {
        "Status": "YOLO mode disabled",
        "Component": "Settings Modal", 
        "Warning Icon": "Hidden when disabled"
    })