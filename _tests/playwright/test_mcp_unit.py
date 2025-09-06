"""Fixed unit tests for MCP functionality - simplified and reliable"""
import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_mcp_manager_initialization(page: Page, serve_hacka_re):
    """Test that MCP manager initializes correctly"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Check that MCP button is visible
    mcp_button = page.locator("#mcp-servers-btn")
    expect(mcp_button).to_be_visible()
    
    # Open MCP modal
    mcp_button.click()
    
    # Verify modal elements
    mcp_modal = page.locator("#mcp-servers-modal")
    expect(mcp_modal).to_be_visible()
    
    # Expand Advanced section to reveal proxy controls
    advanced_header = page.locator(".mcp-advanced-header")
    expect(advanced_header).to_be_visible()
    advanced_header.click()
    
    # Wait for advanced section to expand
    page.wait_for_selector(".mcp-advanced-list", state="visible", timeout=5000)
    
    # Wait for dynamic proxy elements to be created
    page.wait_for_selector("#test-proxy-btn", state="visible", timeout=5000)
    
    # Check required UI elements
    expect(page.locator("#test-proxy-btn")).to_be_visible()
    expect(page.locator("#mcp-proxy-url")).to_be_visible()
    expect(page.locator("#proxy-status")).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_manager_init", {
        "Status": "MCP Manager initialized successfully",
        "Component": "MCP Manager",
        "Test Phase": "Initialization",
        "Action": "Verified modal and UI elements"
    })


def test_mcp_proxy_connection_states_mocked(page: Page, serve_hacka_re):
    """Test different proxy connection states with mocked responses"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Expand Advanced section
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    
    # Wait for advanced section to expand and proxy elements to be created
    page.wait_for_selector("#proxy-status", state="visible", timeout=5000)
    
    # Test disconnected state
    proxy_status = page.locator("#proxy-status")
    expect(proxy_status).to_contain_text("Not connected")
    
    # Mock successful connection
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    page.locator("#test-proxy-btn").click()
    time.sleep(0.5)  # Give it a moment to process
    expect(proxy_status).to_contain_text("Connected")
    
    screenshot_with_markdown(page, "mcp_proxy_states", {
        "Status": "MCP Proxy Connection States tested",
        "Component": "MCP Manager",
        "Test Phase": "Connection State Testing",
        "Action": "Verified mocked connection states"
    })


def test_mcp_server_form_validation(page: Page, serve_hacka_re):
    """Test MCP server form input validation"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Expand Advanced section to reveal form
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    
    # Wait for advanced section to expand
    page.wait_for_selector(".mcp-advanced-list", state="visible", timeout=5000)
    
    # Test form elements
    url_input = page.locator("#mcp-server-url")
    submit_btn = page.locator("#mcp-server-form button[type='submit']")
    
    # Test empty form
    expect(url_input).to_be_visible()
    expect(url_input).to_be_editable()
    expect(submit_btn).to_be_visible()
    
    # Test input functionality
    test_command = "npx -y @modelcontextprotocol/server-filesystem /tmp"
    url_input.fill(test_command)
    expect(url_input).to_have_value(test_command)
    
    # Clear input
    url_input.fill("")
    expect(url_input).to_have_value("")
    
    screenshot_with_markdown(page, "mcp_form_validation", {
        "Status": "MCP form validation tested",
        "Component": "MCP Manager",
        "Test Phase": "Form Validation",
        "Action": "Verified input field functionality"
    })


def test_mcp_modal_ui_interactions(page: Page, serve_hacka_re):
    """Test MCP modal UI interactions"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    modal = page.locator("#mcp-servers-modal")
    expect(modal).to_be_visible()
    
    # Check Quick Connectors placeholder is visible (outside Advanced section)
    expect(page.locator("#mcp-quick-connectors-placeholder")).to_be_visible()
    
    # Expand Advanced section
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    
    # Wait for advanced section to expand and proxy elements to be created
    page.wait_for_selector("#test-proxy-btn", state="visible", timeout=5000)
    
    # Test all key UI elements exist
    expect(page.locator("#test-proxy-btn")).to_be_visible()
    expect(page.locator("#proxy-status")).to_be_visible()
    expect(page.locator("#mcp-proxy-url")).to_be_visible()
    
    # Test modal close
    close_btn = page.locator("#close-mcp-servers-modal")
    expect(close_btn).to_be_visible()
    close_btn.click()
    
    # Modal should close
    expect(modal).not_to_be_visible()
    
    screenshot_with_markdown(page, "mcp_modal_ui", {
        "Status": "MCP modal UI interactions tested",
        "Component": "MCP Manager",
        "Test Phase": "UI Interaction",
        "Action": "Verified modal open/close and element visibility"
    })


def test_mcp_proxy_button_interaction(page: Page, serve_hacka_re):
    """Test MCP proxy test button functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Expand Advanced section
    advanced_header = page.locator(".mcp-advanced-header")
    advanced_header.click()
    
    # Wait for advanced section to expand and proxy elements to be created
    page.wait_for_selector("#test-proxy-btn", state="visible", timeout=5000)
    
    # Test proxy button
    test_proxy_btn = page.locator("#test-proxy-btn")
    expect(test_proxy_btn).to_be_visible()
    expect(test_proxy_btn).to_be_enabled()
    
    # Mock a failing connection to test error handling
    page.route("**/localhost:3001/health", lambda route: route.abort())
    
    # Click test button
    test_proxy_btn.click()
    time.sleep(0.5)  # Give it time to process
    
    # Should show some kind of status update
    proxy_status = page.locator("#proxy-status")
    expect(proxy_status).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_proxy_button", {
        "Status": "MCP proxy button interaction tested",
        "Component": "MCP Manager",
        "Test Phase": "Button Interaction",
        "Action": "Verified proxy test button functionality"
    })


def test_mcp_server_list_area(page: Page, serve_hacka_re):
    """Test MCP server list display area"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
    
    # Check Quick Connectors placeholder exists
    expect(page.locator("#mcp-quick-connectors-placeholder")).to_be_visible()
    
    # Check Advanced section exists
    advanced_section = page.locator(".mcp-advanced-section")
    expect(advanced_section).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_server_list", {
        "Status": "MCP server list area tested",
        "Component": "MCP Manager",
        "Test Phase": "Server List",
        "Action": "Verified server list display area"
    })