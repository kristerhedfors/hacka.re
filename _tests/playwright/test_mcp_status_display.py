"""Test MCP Status Display in Share Modal"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_mcp_status_display(page: Page, serve_hacka_re):
    """Test that MCP connections status is displayed correctly in the share modal"""
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal
    dismiss_settings_modal(page)
    
    # Store a GitHub token using CoreStorageService (simulating real connection)
    test_token = 'ghp_1234567890abcdef1234567890abcdef12345678'
    page.evaluate(f"""
        console.log('Setting GitHub token via CoreStorageService...');
        window.CoreStorageService.setValue('mcp_github_token', '{test_token}');
        console.log('GitHub token set');
    """)
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    page.wait_for_selector('#share-modal', state='visible')
    
    # Wait for status updates to complete
    page.wait_for_timeout(1000)
    
    # Check if MCP checkbox is visible
    mcp_checkbox = page.locator('#share-mcp-connections')
    expect(mcp_checkbox).to_be_visible()
    
    # Check if the status indicator shows up
    status_indicator = page.locator('label[for="share-mcp-connections"] .share-item-status')
    
    # Take a screenshot for debugging
    screenshot_with_markdown(
        page,
        "mcp_status_display",
        {
            "description": "Share modal with MCP connections checkbox",
            "mcp_checkbox_visible": str(mcp_checkbox.is_visible()),
            "status_indicator_count": str(status_indicator.count()),
            "github_token": "Set via CoreStorageService"
        }
    )
    
    # The status indicator should show GitHub available
    status_count = status_indicator.count()
    print(f"✅ Found {status_count} status indicator(s)")
    
    if status_count > 0:
        # Use .first to handle multiple elements (there might be duplicates)
        status_text = status_indicator.first.inner_text()
        print(f"✅ Status text found: '{status_text}'")
        assert "GitHub" in status_text, f"Status should mention GitHub, got: {status_text}"
        assert "available" in status_text, f"Status should say 'available', got: {status_text}"
        
        # Log if there are duplicates - this indicates a bug we should fix
        if status_count > 1:
            print(f"⚠️ WARNING: Found {status_count} status indicators (duplicates detected)")
    else:
        # This is the main issue we were fixing - no status is showing
        print("❌ No status indicator found - this was the bug!")
        assert False, "MCP status indicator should be displayed when GitHub token is present"
    
    # Test checking the checkbox changes the status text
    mcp_checkbox.check()
    page.wait_for_timeout(500)  # Wait for status update
    
    status_text_checked = status_indicator.first.inner_text()
    print(f"✅ Status text when checked: '{status_text_checked}'")
    assert "will be shared" in status_text_checked, f"Status should say 'will be shared', got: {status_text_checked}"
    
    print("✅ MCP status display test completed successfully!")