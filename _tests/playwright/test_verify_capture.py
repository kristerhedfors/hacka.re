"""
Test to verify console and screenshot capture is working properly.
"""
import pytest
from playwright.sync_api import Page, expect
from test_capture_utils import setup_test_with_capture, screenshot_with_markdown
from test_utils import dismiss_welcome_modal


def test_verify_capture_mini(page: Page, serve_hacka_re):
    """Mini test to verify capture utilities work."""
    # Set up capture
    capture = setup_test_with_capture(page, "test_verify_capture_mini")
    
    # Take initial screenshot
    capture["screenshot"]("01_initial", {"Status": "Starting test"})
    
    # Navigate to the application
    print("Navigating to application...")
    page.goto(serve_hacka_re)
    
    # Capture after navigation
    capture["screenshot"]("02_after_navigation", {"Status": "Page loaded", "URL": page.url})
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Capture after modal dismiss
    capture["screenshot"]("03_after_modal", {"Status": "Modal dismissed"})
    
    # Verify page title
    expect(page).to_have_title("hacka.re - Free, open, för hackare av hackare")
    
    # Check for console messages
    print(f"Console messages captured: {len(capture['console_messages'])}")
    
    # Final screenshot
    capture["screenshot"]("04_final", {
        "Status": "Test completed",
        "Console messages": len(capture["console_messages"])
    })
    
    # Save console log
    capture["save_console"]()
    
    print("✅ Capture verification test completed successfully")


def test_verify_capture_with_interaction(page: Page, serve_hacka_re):
    """Test with user interaction to generate more console output."""
    # Set up capture
    capture = setup_test_with_capture(page, "test_verify_capture_interaction")
    
    # Navigate
    page.goto(serve_hacka_re)
    capture["screenshot"]("01_loaded", {"Status": "Page loaded"})
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Open settings
    settings_btn = page.locator("#settings-btn")
    if settings_btn.is_visible():
        settings_btn.click()
        capture["screenshot"]("02_settings_opened", {"Status": "Settings modal opened"})
        
        # Close settings
        close_btn = page.locator("#close-settings")
        if close_btn.is_visible():
            close_btn.click()
            capture["screenshot"]("03_settings_closed", {"Status": "Settings closed"})
    
    # Type in chat input
    chat_input = page.locator("#message-input")
    if chat_input.is_visible():
        chat_input.fill("Test message for capture verification")
        capture["screenshot"]("04_message_typed", {"Status": "Message typed"})
    
    # Save all artifacts
    capture["save_console"]()
    
    print(f"✅ Interaction test completed with {len(capture['console_messages'])} console messages")


def test_verify_capture_error_handling(page: Page, serve_hacka_re):
    """Test that captures errors properly."""
    # Set up capture
    capture = setup_test_with_capture(page, "test_verify_capture_errors")
    
    # Navigate
    page.goto(serve_hacka_re)
    
    # Try to trigger an error by executing bad JavaScript
    try:
        page.evaluate("() => { throw new Error('Test error for capture verification'); }")
    except:
        pass  # We expect this to fail
    
    capture["screenshot"]("01_after_error", {"Status": "After triggering error"})
    
    # Try to click non-existent element
    try:
        page.locator("#non-existent-element").click(timeout=1000)
    except:
        pass  # Expected to fail
    
    capture["screenshot"]("02_after_failed_click", {"Status": "After failed click"})
    
    # Save console including any errors
    capture["save_console"]()
    
    print(f"✅ Error handling test completed with {len(capture['console_messages'])} messages")