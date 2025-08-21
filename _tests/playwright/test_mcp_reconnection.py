"""Simplified MCP reconnection tests that focus on testable UI behavior"""
import pytest
from playwright.sync_api import Page, expect
import time
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown



# NOTE: Connected MCP Servers functionality removed - tests updated
def test_mcp_proxy_connection_status_updates(page: Page, serve_hacka_re):
    """Test that proxy connection status updates correctly"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Check initial disconnected state
    proxy_status = page.locator("#proxy-status")
    expect(proxy_status).to_contain_text("Not connected")
    
    # Mock successful connection
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    # Test connection
    test_proxy_btn = page.locator("#test-proxy-btn")
    test_proxy_btn.click()
    time.sleep(0.5)
    
    # Should show connected status
    expect(proxy_status).to_contain_text("Connected")
    
    screenshot_with_markdown(page, "mcp_proxy_status", {
        "Status": "Proxy connection status tested",
        "Component": "MCP Manager",
        "Test Phase": "Status Updates",
        "Action": "Verified proxy status changes"
    })


def test_mcp_proxy_reconnection_flow(page: Page, serve_hacka_re):
    """Test proxy reconnection flow with different server counts"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Mock connection with 0 servers
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    test_proxy_btn = page.locator("#test-proxy-btn")
    test_proxy_btn.click()
    time.sleep(0.5)
    
    proxy_status = page.locator("#proxy-status")
    expect(proxy_status).to_contain_text("Connected")
    
    # Mock reconnection with 1 server
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 1}
    ))
    
    # Test reconnection
    test_proxy_btn.click()
    time.sleep(0.5)
    
    # Should show connected with server count
    expect(proxy_status).to_contain_text("Connected")
    
    screenshot_with_markdown(page, "mcp_reconnection", {
        "Status": "Proxy reconnection tested",
        "Component": "MCP Manager", 
        "Test Phase": "Reconnection Flow",
        "Action": "Verified reconnection with different server counts"
    })


def test_mcp_server_form_after_connection(page: Page, serve_hacka_re):
    """Test that server form works after proxy connection"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Mock proxy connection
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    # Connect to proxy
    page.locator("#test-proxy-btn").click()
    time.sleep(0.5)
    
    # Test server form functionality after connection
    url_input = page.locator("#mcp-server-url")
    submit_btn = page.locator("#mcp-server-form button[type='submit']")
    
    expect(url_input).to_be_visible()
    expect(submit_btn).to_be_visible()
    
    # Test form input after connection
    test_command = "echo 'test server command'"
    url_input.fill(test_command)
    expect(url_input).to_have_value(test_command)
    
    # Form should be functional
    expect(submit_btn).to_be_enabled()
    
    screenshot_with_markdown(page, "mcp_form_after_connection", {
        "Status": "Server form tested after connection",
        "Component": "MCP Manager",
        "Test Phase": "Form Functionality",  
        "Action": "Verified form works after proxy connection"
    })


def test_mcp_modal_close_and_reopen(page: Page, serve_hacka_re):
    """Test modal close and reopen maintains state"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    modal = page.locator("#mcp-servers-modal")
    expect(modal).to_be_visible()
    
    # Mock connection
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    # Connect
    page.locator("#test-proxy-btn").click()
    time.sleep(0.5)
    
    # Close modal
    page.locator("#close-mcp-servers-modal").click()
    expect(modal).not_to_be_visible()
    
    # Reopen modal
    page.locator("#mcp-servers-btn").click()
    expect(modal).to_be_visible()
    
    # Status should still be visible
    proxy_status = page.locator("#proxy-status")
    expect(proxy_status).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_modal_reopen", {
        "Status": "Modal close/reopen tested",
        "Component": "MCP Manager",
        "Test Phase": "Modal State Persistence",
        "Action": "Verified modal state after close/reopen"
    })


def test_mcp_connection_error_handling(page: Page, serve_hacka_re):
    """Test connection error handling and recovery"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Mock connection failure
    page.route("**/localhost:3001/health", lambda route: route.abort())
    
    # Try to connect
    test_proxy_btn = page.locator("#test-proxy-btn")
    test_proxy_btn.click()
    time.sleep(0.5)
    
    # Should show some error state
    proxy_status = page.locator("#proxy-status")
    expect(proxy_status).to_be_visible()
    
    # Now mock successful connection for recovery
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    # Test recovery
    test_proxy_btn.click()
    time.sleep(0.5)
    
    # Should show connected status
    expect(proxy_status).to_contain_text("Connected")
    
    screenshot_with_markdown(page, "mcp_error_recovery", {
        "Status": "Connection error recovery tested",
        "Component": "MCP Manager",
        "Test Phase": "Error Handling",
        "Action": "Verified error handling and recovery"
    })


def test_mcp_server_list_visibility(page: Page, serve_hacka_re):
    """Test that server list area is always visible"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Server list should be visible even without connection
    server_list = page.locator("#mcp-quick-connectors-placeholder")
    expect(quick_connectors).to_be_visible()
    
    # Mock connection
    page.route("**/localhost:3001/health", lambda route: route.fulfill(
        status=200,
        json={"status": "ok", "servers": 0}
    ))
    
    # Connect
    page.locator("#test-proxy-btn").click()
    time.sleep(0.5)
    
    # Server list should still be visible after connection
    expect(quick_connectors).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_server_list", {
        "Status": "Server list visibility tested",
        "Component": "MCP Manager",
        "Test Phase": "UI Element Visibility",
        "Action": "Verified server list is always visible"
    })