"""
Example test demonstrating comprehensive debugging capabilities.
This test shows how to properly capture console logs, screenshots, and debug information.
"""

import pytest
from playwright.sync_api import Page, expect
from test_debug_utils import TestDebugger, enhanced_screenshot
from test_utils import dismiss_welcome_modal

def test_example_with_full_debugging(page: Page, serve_hacka_re):
    """
    Example test that demonstrates all debugging features.
    This test intentionally captures extensive debug information.
    """
    
    # Initialize debugger for this test
    debugger = TestDebugger("test_example_with_full_debugging")
    
    # Navigate to page
    page.goto(serve_hacka_re)
    
    # Set up console capture IMMEDIATELY after navigation
    debugger.setup_console_capture(page)
    
    # Capture initial state
    debugger.capture_state("initial_load", {
        "URL": page.url,
        "Test Stage": "Page loaded",
        "Expected": "Welcome modal should be visible"
    })
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Capture state after dismissing modal
    debugger.capture_state("welcome_dismissed", {
        "Test Stage": "Welcome modal dismissed",
        "Expected": "Main chat interface visible"
    })
    
    # Open settings modal
    settings_btn = page.locator("#settings-btn")
    expect(settings_btn).to_be_visible()
    settings_btn.click()
    
    # Capture state with settings open
    debugger.capture_state("settings_open", {
        "Test Stage": "Settings modal opened",
        "Modal ID": "settings-modal",
        "Expected": "Settings form visible"
    })
    
    # Check for API key field
    api_key_input = page.locator("#api-key")
    expect(api_key_input).to_be_visible()
    
    # Close settings
    close_btn = page.locator("#close-settings")
    close_btn.click()
    
    # Final state capture
    debugger.capture_state("test_complete", {
        "Test Stage": "Test completed",
        "Result": "Success",
        "Final URL": page.url
    })
    
    # Print test summary
    debugger.print_summary()


def test_example_with_quick_screenshot(page: Page, serve_hacka_re):
    """
    Example using the quick screenshot function.
    """
    page.goto(serve_hacka_re)
    
    # Quick screenshot with metadata
    enhanced_screenshot(page, "quick_example", {
        "Test": "Quick screenshot example",
        "Purpose": "Demonstrate standalone screenshot function"
    })
    
    dismiss_welcome_modal(page)
    
    # Another screenshot after action
    enhanced_screenshot(page, "after_modal_dismiss", {
        "Action": "Dismissed welcome modal",
        "Expected": "Chat interface visible"
    })


def test_example_with_error_capture(page: Page, serve_hacka_re):
    """
    Example that intentionally triggers console errors for demonstration.
    """
    debugger = TestDebugger("test_example_with_error_capture")
    
    page.goto(serve_hacka_re)
    debugger.setup_console_capture(page)
    
    # Inject a console error for demonstration
    page.evaluate("""
        console.error('Example error: API key not configured');
        console.warn('Example warning: Feature deprecated');
        console.log('Example log: Normal operation');
    """)
    
    # Capture state with console messages
    debugger.capture_state("console_messages_demo", {
        "Purpose": "Demonstrate console capture",
        "Injected": "Error, warning, and log messages"
    })
    
    # The debugger will show error count in summary
    debugger.print_summary()


if __name__ == "__main__":
    # Run with: pytest test_example_with_debugging.py -v -s
    pytest.main([__file__, "-v", "-s"])