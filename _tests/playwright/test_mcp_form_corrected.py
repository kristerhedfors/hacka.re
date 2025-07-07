"""Corrected MCP form tests without proxy dependency"""
import pytest
from playwright.sync_api import Page, expect
import time
from pathlib import Path
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_mcp_stdio_form_functionality(page: Page, serve_hacka_re):
    """Test MCP stdio form functionality (equivalent to previous server form test)"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Set up form for stdio transport
    name_input = page.locator("#mcp-server-name")
    transport_select = page.locator("#mcp-transport-type")
    command_input = page.locator("#mcp-server-command")
    
    # Set transport to stdio and trigger form visibility update
    transport_select.select_option("stdio")
    page.evaluate("window.MCPOAuthIntegration && window.MCPOAuthIntegration.updateFormVisibility('stdio')")
    
    # Fill form
    name_input.fill("Test Echo Server")
    expect(command_input).to_be_visible()
    
    # Fill in a test command
    test_command = "echo 'test mcp server'"
    command_input.fill(test_command)
    expect(command_input).to_have_value(test_command)
    
    # Test form submission
    submit_btn = page.locator("#mcp-server-form button[type='submit']")
    expect(submit_btn).to_be_visible()
    expect(submit_btn).to_be_enabled()
    
    # Submit the form (it may fail, but should not crash)
    submit_btn.click()
    time.sleep(0.5)
    
    # Verify that the server list area is visible
    expect(page.locator("#mcp-servers-list")).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_stdio_form_functionality", {
        "Status": "MCP stdio form functionality tested",
        "Component": "MCP Form",
        "Test Phase": "Form Submission",
        "Action": "Tested stdio command form submission"
    })


def test_mcp_filesystem_server_form(page: Page, serve_hacka_re):
    """Test MCP filesystem server form (equivalent to previous filesystem test)"""
    # Check if npx is available for filesystem server
    import subprocess
    try:
        subprocess.run(["npx", "--version"], check=True, capture_output=True, timeout=5)
    except:
        pytest.skip("npx not available - cannot test filesystem server")
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Set up filesystem server using stdio transport
    test_dir = Path(__file__).parent / "mcp_test_filesystem"
    server_command = f"npx -y @modelcontextprotocol/server-filesystem {test_dir}"
    
    # Set up form for stdio transport
    name_input = page.locator("#mcp-server-name")
    transport_select = page.locator("#mcp-transport-type")
    command_input = page.locator("#mcp-server-command")
    
    name_input.fill("Test Filesystem Server")
    transport_select.select_option("stdio")
    page.evaluate("window.MCPOAuthIntegration && window.MCPOAuthIntegration.updateFormVisibility('stdio')")
    
    expect(command_input).to_be_visible()
    command_input.fill(server_command)
    
    # Submit the form
    submit_btn = page.locator("#mcp-server-form button[type='submit']")
    submit_btn.click()
    time.sleep(0.5)
    
    # Verify server list area is visible
    server_list = page.locator("#mcp-servers-list")
    expect(server_list).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_filesystem_server_form", {
        "Status": "Filesystem server form tested",
        "Component": "MCP Form",
        "Test Phase": "Filesystem Server Form",
        "Action": "Tested filesystem server configuration form"
    })


def test_mcp_modal_ui_elements(page: Page, serve_hacka_re):
    """Test MCP modal UI elements (equivalent to previous UI test)"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    modal = page.locator("#mcp-servers-modal")
    expect(modal).to_be_visible()
    
    # Test all the UI elements exist
    expect(page.locator("#test-proxy-btn")).to_be_visible()
    expect(page.locator("#proxy-status")).to_be_visible()
    expect(page.locator("#mcp-servers-list")).to_be_visible()
    
    # Test form fields (after ensuring OAuth integration is set up)
    page.evaluate("window.MCPOAuthIntegration && window.MCPOAuthIntegration.updateFormVisibility('stdio')")
    expect(page.locator("#mcp-server-name")).to_be_visible()
    expect(page.locator("#mcp-transport-type")).to_be_visible()
    expect(page.locator("#mcp-server-command")).to_be_visible()  # stdio default
    
    # Test transport switching
    transport_select = page.locator("#mcp-transport-type")
    url_input = page.locator("#mcp-server-url")
    command_input = page.locator("#mcp-server-command")
    
    # Test SSE transport
    transport_select.select_option("sse")
    page.evaluate("window.MCPOAuthIntegration && window.MCPOAuthIntegration.updateFormVisibility('sse')")
    expect(url_input).to_be_visible()
    expect(command_input).not_to_be_visible()
    
    # Test OAuth transport
    transport_select.select_option("oauth")
    page.evaluate("window.MCPOAuthIntegration && window.MCPOAuthIntegration.updateFormVisibility('oauth')")
    expect(url_input).to_be_visible()
    expect(command_input).to_be_visible()  # Both visible for OAuth
    
    screenshot_with_markdown(page, "mcp_modal_ui_elements", {
        "Status": "MCP modal UI elements tested",
        "Component": "MCP Modal",
        "Test Phase": "UI Element Verification",
        "Action": "Verified modal UI elements and transport switching"
    })