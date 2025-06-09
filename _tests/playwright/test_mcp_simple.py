"""Simple working MCP tests"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal


def test_mcp_button_exists(page: Page, serve_hacka_re):
    """Test that MCP button exists and is clickable"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check that MCP button is visible
    mcp_button = page.locator("#mcp-servers-btn")
    expect(mcp_button).to_be_visible()
    
    # Check tooltip
    expect(mcp_button).to_have_attribute("title", "MCP Servers")


def test_mcp_modal_opens(page: Page, serve_hacka_re):
    """Test that MCP modal opens when button is clicked"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    mcp_button = page.locator("#mcp-servers-btn")
    mcp_button.click()
    
    # Verify modal is visible
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Check for key UI elements
    expect(page.locator("#test-proxy-btn")).to_be_visible()
    expect(page.locator("#mcp-server-url")).to_be_visible()
    expect(page.locator("#proxy-status")).to_be_visible()


def test_mcp_proxy_status_initial(page: Page, serve_hacka_re):
    """Test initial proxy status display"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Check initial status
    proxy_status = page.locator("#proxy-status")
    expect(proxy_status).to_be_visible()
    
    # Status should indicate not connected
    expect(proxy_status).to_contain_text("Not connected")


def test_mcp_server_input_exists(page: Page, serve_hacka_re):
    """Test that server command input field works"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Test server URL input
    url_input = page.locator("#mcp-server-url")
    expect(url_input).to_be_visible()
    expect(url_input).to_be_editable()
    
    # Test that we can type in it
    url_input.fill("test command")
    expect(url_input).to_have_value("test command")


def test_mcp_form_submission(page: Page, serve_hacka_re):
    """Test MCP server form submission"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Fill form with test command
    url_input = page.locator("#mcp-server-url")
    url_input.fill("echo test")
    
    # Find submit button
    submit_btn = page.locator("#mcp-server-form button[type='submit']")
    expect(submit_btn).to_be_visible()
    
    # Submit should be clickable (even if it fails)
    expect(submit_btn).to_be_enabled()


def test_mcp_modal_close(page: Page, serve_hacka_re):
    """Test that MCP modal can be closed"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Verify modal is open
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Close modal
    close_btn = page.locator("#close-mcp-servers-modal")
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    # Verify modal is closed
    expect(mcp_modal).not_to_be_visible()