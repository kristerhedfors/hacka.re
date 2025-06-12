"""
Test MCP OAuth Storage Fix
Verifies that MCP OAuth components initialize without storage service errors.
"""

import re
import pytest
from playwright.sync_api import Page, expect
from conftest import dismiss_welcome_modal, screenshot_with_markdown


def test_mcp_oauth_storage_initialization(page: Page):
    """Test that MCP OAuth components initialize without storage service errors."""
    
    # Navigate to the page
    page.goto("http://localhost:8000")
    dismiss_welcome_modal(page)
    
    # Open MCP modal to trigger OAuth initialization
    mcp_button = page.locator("#mcp-servers-btn")
    expect(mcp_button).to_be_visible()
    mcp_button.click()
    
    # Wait for modal to appear
    modal = page.locator("#mcp-servers-modal")
    expect(modal).to_have_class(re.compile(r".*active.*"))
    
    # Wait a moment for JavaScript initialization
    page.wait_for_timeout(1000)
    
    # Check console for specific storage service errors we're fixing
    console_logs = []
    
    def handle_console(msg):
        console_logs.append(msg.text)
    
    page.on("console", handle_console)
    
    # Trigger some MCP interactions to ensure OAuth services are loaded
    transport_select = page.locator("#mcp-transport-type")
    if transport_select.is_visible():
        # Change transport type to trigger OAuth integration
        transport_select.select_option("oauth")
        page.wait_for_timeout(500)
        transport_select.select_option("stdio")
        page.wait_for_timeout(500)
    
    # Check that we don't have the specific storage service errors
    storage_errors = [log for log in console_logs if "this.storageService.getItem is not a function" in log]
    
    # Take screenshot for debugging
    screenshot_with_markdown(page, "mcp_oauth_storage_test")
    
    # Assert no storage service errors
    assert len(storage_errors) == 0, f"Found storage service errors: {storage_errors}"
    
    # Check that OAuth services are properly initialized (should see deferred initialization warnings if storage not ready)
    oauth_warnings = [log for log in console_logs if "Storage service not available, deferring initialization" in log]
    
    # It's okay to have deferred initialization warnings - that's the fix working
    print(f"OAuth deferred initialization warnings (expected): {len(oauth_warnings)}")
    
    # Close modal
    close_button = page.locator("#mcp-servers-modal .close")
    if close_button.is_visible():
        close_button.click()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])