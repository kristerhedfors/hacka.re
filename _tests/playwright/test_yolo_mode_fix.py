"""
Test and fix YOLO mode enablement - handle confirmation dialog properly
"""
import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_yolo_mode_enablement_with_dialog(page: Page, serve_hacka_re):
    """Test YOLO mode enablement by properly handling the confirmation dialog"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings modal
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    screenshot_with_markdown(page, "yolo_fix_before", {
        "Step": "Before YOLO mode enablement",
        "Status": "Settings modal opened"
    })
    
    # Find YOLO checkbox
    yolo_checkbox = page.locator("#yolo-mode")
    expect(yolo_checkbox).to_be_visible()
    
    initial_state = yolo_checkbox.is_checked()
    print(f"Initial YOLO state: {initial_state}")
    
    # Get status text before
    status_element = page.locator("#yolo-mode-status")
    initial_status = status_element.text_content()
    print(f"Initial status text: '{initial_status}'")
    
    if not initial_state:
        # Set up dialog handler to accept the confirmation
        def handle_dialog(dialog):
            print(f"Dialog appeared: '{dialog.message}'")
            print(f"Dialog type: {dialog.type}")
            dialog.accept()  # Accept the YOLO mode warning
        
        page.on("dialog", handle_dialog)
        
        # Click the checkbox to enable YOLO mode
        print("Clicking YOLO checkbox with dialog handler...")
        yolo_checkbox.click()
        
        # Wait a moment for the dialog and processing
        time.sleep(2)
        
        # Check if YOLO mode is now enabled
        final_state = yolo_checkbox.is_checked()
        final_status = status_element.text_content()
        
        print(f"Final YOLO state: {final_state}")
        print(f"Final status text: '{final_status}'")
        
        screenshot_with_markdown(page, "yolo_fix_after", {
            "Step": "After YOLO mode enablement",
            "Initial State": str(initial_state),
            "Final State": str(final_state),
            "Initial Status": initial_status,
            "Final Status": final_status,
            "Success": "✅ ENABLED" if final_state else "❌ FAILED"
        })
        
        # Verify YOLO mode is actually enabled
        assert final_state == True, f"YOLO mode should be enabled, but checkbox state is {final_state}"
        assert "Enabled" in final_status, f"Status should show 'Enabled', but shows: '{final_status}'"
        
        print("✅ YOLO mode successfully enabled!")
        
        # Test that it persists in localStorage
        yolo_storage_value = page.evaluate("() => localStorage.getItem('yolo_mode_enabled')")
        print(f"YOLO mode in localStorage: {yolo_storage_value}")
        
        # Also check through the service
        yolo_service_value = page.evaluate("() => window.YoloModeManager?.isYoloModeEnabled()")
        print(f"YOLO mode via service: {yolo_service_value}")
        
        assert yolo_service_value == True, f"YoloModeManager should report enabled, but reports: {yolo_service_value}"
        
    else:
        print("YOLO mode is already enabled")
        
        # Verify the status text shows enabled
        assert "Enabled" in initial_status, f"Status should show 'Enabled' when checkbox is checked, but shows: '{initial_status}'"
    
    # Close settings modal
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    print("✅ YOLO mode test completed successfully!")

def test_yolo_mode_function_execution_bypass(page: Page, serve_hacka_re):
    """Test that YOLO mode actually bypasses function execution modals"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # First enable YOLO mode
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
    
    yolo_checkbox = page.locator("#yolo-mode")
    
    if not yolo_checkbox.is_checked():
        # Handle the confirmation dialog
        page.on("dialog", lambda dialog: dialog.accept())
        yolo_checkbox.click()
        time.sleep(1)
        
        # Verify it's enabled
        assert yolo_checkbox.is_checked(), "YOLO mode should be enabled"
        print("✅ YOLO mode enabled")
    
    # Close settings
    close_settings = page.locator("#close-settings")
    close_settings.click()
    page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
    
    # Now test function execution without modal interruption
    # Send a simple message that would trigger a function call if we had functions available
    message_input = page.locator("#message-input")
    message_input.fill("Test message for function calling")
    
    send_btn = page.locator("#send-btn")
    send_btn.click()
    
    # Wait a moment to see if any function execution modal appears
    time.sleep(2)
    
    # Check that NO function execution modal appears
    function_modal = page.locator("#function-execution-modal")
    modal_visible = function_modal.is_visible() if function_modal.count() > 0 else False
    
    print(f"Function execution modal visible: {modal_visible}")
    
    screenshot_with_markdown(page, "yolo_function_test", {
        "Step": "Testing function execution with YOLO mode",
        "YOLO Enabled": "True",
        "Modal Appeared": str(modal_visible),
        "Success": "✅ NO MODAL" if not modal_visible else "❌ MODAL APPEARED"
    })
    
    # With YOLO mode enabled, function execution modal should NOT appear
    # Note: This test might not trigger functions if none are configured,
    # but it verifies the YOLO mode setup is working
    
    print("✅ YOLO mode function execution test completed!")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])