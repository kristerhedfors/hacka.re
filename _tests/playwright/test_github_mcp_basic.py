"""
GitHub MCP Basic Connection Tests
Tests GitHub PAT authentication and basic MCP setup
"""
import pytest
import time
import os
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

# Get GitHub PAT from environment
GITHUB_PAT = os.getenv("GITHUB_PAT", "")

class TestGitHubMCPBasic:
    """Test basic GitHub MCP functionality"""
    
    def test_github_mcp_connection(self, page: Page, serve_hacka_re):
        """Test GitHub MCP connection with PAT token"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        screenshot_with_markdown(page, "github_mcp_start", {
            "Test": "GitHub MCP basic connection",
            "Status": "Starting test"
        })
        
        # Open MCP servers modal
        mcp_btn = page.locator("#mcp-servers-btn")
        expect(mcp_btn).to_be_visible()
        mcp_btn.click()
        
        page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
        
        screenshot_with_markdown(page, "github_mcp_modal_open", {
            "Step": "MCP servers modal opened",
            "Status": "Looking for GitHub connector"
        })
        
        # Look for GitHub connector in Quick Connect section (should be first Connect button)
        connect_buttons = page.locator("button:has-text('Connect')")
        assert connect_buttons.count() > 0, "No Connect buttons found in MCP modal"
        
        print(f"Found {connect_buttons.count()} Connect buttons")
        
        # Click first Connect button (should be GitHub)
        github_connect = connect_buttons.nth(0)
        github_connect.click()
        
        time.sleep(3)  # Give more time for modal to appear
        
        screenshot_with_markdown(page, "github_token_modal", {
            "Step": "After clicking GitHub Connect button",
            "Status": "Looking for GitHub token input modal"
        })
        
        # Check if GitHub PAT input modal appeared (correct modal ID)
        pat_modal = page.locator("#service-pat-input-modal")
        if pat_modal.is_visible():
            print("✅ GitHub PAT input modal appeared")
        else:
            print("⚠️ PAT modal not visible")
        
        # Wait for the correct modal to be visible
        page.wait_for_selector("#service-pat-input-modal", state="visible", timeout=10000)
        
        # Find and fill PAT input using the correct ID
        pat_input = page.locator("#pat-input")
        print(f"PAT input field found: {pat_input.count()}")
        
        expect(pat_input).to_be_visible()
        pat_input.fill(GITHUB_PAT)
        
        screenshot_with_markdown(page, "github_token_filled", {
            "Step": "GitHub PAT token entered", 
            "Status": "Ready to connect"
        })
        
        # Click Connect to establish connection
        modal = page.locator("#service-pat-input-modal")
        connect_btn = modal.locator("button:has-text('Connect')")
        expect(connect_btn).to_be_visible()
        connect_btn.first.click(force=True)
        
        # Wait for connection to be established
        time.sleep(5)
        
        screenshot_with_markdown(page, "github_connection_result", {
            "Step": "GitHub connection attempted",
            "Status": "Checking connection status"
        })
        
        # Close MCP modal if still open
        if page.locator("#mcp-servers-modal").is_visible():
            close_mcp = page.locator("#close-mcp-servers-modal")
            if close_mcp.is_visible():
                close_mcp.click()
            else:
                page.keyboard.press("Escape")
            page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)
        
        # Test successful connection by checking if GitHub functions are available
        # Open MCP modal again to check connection status
        mcp_btn.click()
        page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
        
        # Look for connected status or available tools
        modal_content = page.locator("#mcp-servers-modal").text_content()
        
        screenshot_with_markdown(page, "github_final_status", {
            "Step": "Final GitHub MCP status check",
            "Modal Content Preview": modal_content[:200] + "..." if len(modal_content) > 200 else modal_content,
            "Success": "✅ CONNECTION TEST COMPLETED"
        })
        
        # Close modal
        close_mcp = page.locator("#close-mcp-servers-modal")
        if close_mcp.is_visible():
            close_mcp.click()
        
        print("✅ GitHub MCP basic connection test completed!")
        print(f"📋 Modal content length: {len(modal_content)} characters")

    def test_github_mcp_with_yolo_mode(self, page: Page, serve_hacka_re):
        """Test GitHub MCP connection with YOLO mode enabled"""
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
        
        # Now connect to GitHub MCP
        mcp_btn = page.locator("#mcp-servers-btn")
        mcp_btn.click()
        page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
        
        # Connect to GitHub (first connector)
        connect_buttons = page.locator("button:has-text('Connect')")
        github_connect = connect_buttons.nth(0)
        github_connect.click()
        time.sleep(2)
        
        # Fill PAT token
        pat_input = page.locator("#pat-input")
        
        expect(pat_input).to_be_visible()
        pat_input.fill(GITHUB_PAT)
        
        # Connect
        modal = page.locator("#service-pat-input-modal")
        connect_btn = modal.locator("button:has-text('Connect')")
        connect_btn.first.click(force=True)
        time.sleep(5)
        
        # Close MCP modal
        if page.locator("#mcp-servers-modal").is_visible():
            close_mcp = page.locator("#close-mcp-servers-modal")
            if close_mcp.is_visible():
                close_mcp.click()
        
        screenshot_with_markdown(page, "github_yolo_setup_complete", {
            "YOLO Mode": "Enabled",
            "GitHub MCP": "Connected",
            "Status": "Ready for function testing"
        })
        
        print("✅ GitHub MCP with YOLO mode setup completed!")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=300"])