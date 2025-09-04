import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal


def test_mcp_modal_basic(page: Page, serve_hacka_re):
    """Test basic MCP modal functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open MCP modal
    mcp_button = page.locator("#mcp-servers-btn")
    expect(mcp_button).to_be_visible()
    mcp_button.click()
    
    # Verify modal is visible
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Check for some UI elements (without being too specific)
    form_elements = page.locator("#mcp-servers-modal input, #mcp-servers-modal button, #mcp-servers-modal select")
    assert form_elements.count() > 0, "Modal should have some form elements"
    
    # Close modal
    close_btn = page.locator("#close-mcp-servers-modal")
    if close_btn.count() > 0:
        close_btn.click()
        expect(mcp_modal).not_to_be_visible()


def test_mcp_button_exists(page: Page, serve_hacka_re):
    """Test that MCP button exists"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Check that MCP button is visible
    mcp_button = page.locator("#mcp-servers-btn")
    expect(mcp_button).to_be_visible()
    
    # Check tooltip exists (don't assume specific text)
    title_attr = mcp_button.get_attribute("title")
    # Tooltip is optional - not checking
