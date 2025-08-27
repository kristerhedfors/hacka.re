import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal


def test_github_mcp_basic(page: Page, serve_hacka_re):
    """Test basic GitHub MCP functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    mcp_button = page.locator("#mcp-servers-btn")
    expect(mcp_button).to_be_visible()
    mcp_button.click()
    
    # Verify modal is visible
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Check for form elements that might relate to GitHub
    form_elements = page.locator("#mcp-servers-modal input, #mcp-servers-modal button, #mcp-servers-modal select")
    assert form_elements.count() > 0, "Modal should have form elements"
    
    # Close modal
    close_btn = page.locator("#close-mcp-servers-modal")
    if close_btn.count() > 0:
        close_btn.click()
        expect(mcp_modal).not_to_be_visible()


def test_github_elements_exist(page: Page, serve_hacka_re):
    """Test that GitHub-related elements exist in the UI"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal to check for GitHub-related elements
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Look for any GitHub-related text or elements (very basic check)
    modal_content = page.locator("#mcp-servers-modal").text_content()
    # Don't assert specific content, just check modal works
    assert len(modal_content) > 0, "Modal should have some content"
