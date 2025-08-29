"""Test YOLO mode functionality and function execution confirmation"""

from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_yolo_mode_setting(page: Page, serve_hacka_re):
    """Test that YOLO mode setting appears in Settings modal"""
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
    
    # Now open settings modal
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    # Wait for settings modal to be visible
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Check for YOLO mode checkbox
    yolo_checkbox = page.locator("#yolo-mode")
    expect(yolo_checkbox).to_be_visible()
    
    # Check for YOLO mode label (shortened to just "YOLO mode")
    yolo_label = page.locator("label[for='yolo-mode']")
    expect(yolo_label).to_contain_text("YOLO mode")
    
    # Check initial state (should be unchecked)
    expect(yolo_checkbox).not_to_be_checked()
    
    # Check status text (now prefixed with "Current setting:")
    yolo_status = page.locator("#yolo-mode-status")
    expect(yolo_status).to_contain_text("Current setting: Prompt user for every function call")
    
    screenshot_with_markdown(page, "yolo_mode_setting", {
        "Status": "YOLO mode setting visible",
        "Component": "Settings Modal",
        "YOLO Mode": "Disabled (default)"
    })


def test_yolo_mode_warning_dialog(page: Page, serve_hacka_re):
    """Test that enabling YOLO mode shows warning dialog"""
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
    
    # Set up dialog handler to capture warning message
    dialog_text = []
    def handle_dialog(dialog):
        dialog_text.append(dialog.message)
        dialog.dismiss()  # Dismiss the dialog (cancel)
    
    page.on("dialog", handle_dialog)
    
    # Try to enable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode")
    yolo_checkbox.click()
    
    # Wait a moment for dialog to be handled
    page.wait_for_timeout(500)
    
    # Verify warning was shown
    assert len(dialog_text) > 0, "Warning dialog should have been shown"
    assert "WARNING: YOLO Mode" in dialog_text[0]
    assert "WITHOUT asking for your confirmation" in dialog_text[0]
    
    # Checkbox should remain unchecked since we dismissed the dialog
    expect(yolo_checkbox).not_to_be_checked()
    
    screenshot_with_markdown(page, "yolo_mode_warning", {
        "Status": "Warning dialog dismissed",
        "Component": "Settings Modal",
        "YOLO Mode": "Still disabled after canceling"
    })


def test_yolo_mode_confirm_enable(page: Page, serve_hacka_re):
    """Test confirming YOLO mode enable"""
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
    
    # Set up dialog handler to accept warning
    def handle_dialog(dialog):
        dialog.accept()  # Accept the dialog (confirm)
    
    page.on("dialog", handle_dialog)
    
    # Enable YOLO mode
    yolo_checkbox = page.locator("#yolo-mode")
    yolo_checkbox.click()
    
    # Wait a moment for dialog to be handled
    page.wait_for_timeout(500)
    
    # Checkbox should now be checked
    expect(yolo_checkbox).to_be_checked()
    
    # Status text should update (now prefixed with "Current setting:")
    yolo_status = page.locator("#yolo-mode-status")
    expect(yolo_status).to_contain_text("Current setting: User is NOT prompted")
    
    screenshot_with_markdown(page, "yolo_mode_enabled", {
        "Status": "YOLO mode enabled",
        "Component": "Settings Modal",
        "YOLO Mode": "Enabled with warning"
    })
    
    # Disable it again for cleanup
    yolo_checkbox.click()
    expect(yolo_checkbox).not_to_be_checked()


def test_yolo_mode_not_shared(page: Page, serve_hacka_re):
    """Test that YOLO mode is not included in shareable links"""
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
    
    # Enable YOLO mode first
    settings_button = page.locator("#settings-btn")
    settings_button.click()
    
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).to_be_visible()
    
    # Accept warning dialog
    def handle_dialog(dialog):
        dialog.accept()
    page.on("dialog", handle_dialog)
    
    yolo_checkbox = page.locator("#yolo-mode")
    yolo_checkbox.click()
    page.wait_for_timeout(500)
    expect(yolo_checkbox).to_be_checked()
    
    # Close settings
    close_settings = page.locator("#close-settings")
    close_settings.click()
    
    # Open share modal
    share_button = page.locator("#share-btn")
    share_button.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # YOLO mode should NOT appear in share options
    # (unlike other settings, it's a security setting that shouldn't be shared)
    yolo_share_option = page.locator("#share-modal").locator("text=YOLO")
    expect(yolo_share_option).not_to_be_visible()
    
    screenshot_with_markdown(page, "yolo_mode_not_shareable", {
        "Status": "Share modal open",
        "Component": "Share Modal",
        "YOLO Mode": "Not visible in share options (security feature)"
    })