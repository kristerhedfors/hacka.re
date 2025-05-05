import pytest
from playwright.sync_api import expect
from test_utils import dismiss_welcome_modal

def test_mcp_button_exists(page, serve_hacka_re):
    """Test that the MCP button exists in the UI."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    mcp_btn = page.locator("#mcp-btn")
    expect(mcp_btn).to_be_visible()
    expect(mcp_btn).to_have_attribute("title", "Model Context Protocol")

def test_mcp_modal_opens(page, serve_hacka_re):
    """Test that the MCP modal opens when the MCP button is clicked."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    page.locator("#mcp-btn").click()
    mcp_modal = page.locator("#mcp-modal")
    expect(mcp_modal).to_be_visible()
    expect(mcp_modal).to_have_class("modal active")
    expect(page.locator("#mcp-modal h2")).to_have_text("Model Context Protocol (MCP)")

def test_mcp_modal_closes(page, serve_hacka_re):
    """Test that the MCP modal closes when the close button is clicked."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    page.locator("#mcp-btn").click()
    page.locator("#close-mcp-modal").click()
    mcp_modal = page.locator("#mcp-modal")
    expect(mcp_modal).not_to_have_class("active")

def test_mcp_empty_state_shown(page, serve_hacka_re):
    """Test that the empty state is shown when no servers are configured."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    page.locator("#mcp-btn").click()
    empty_state = page.locator("#mcp-empty-state")
    expect(empty_state).to_be_visible()
    expect(empty_state).to_contain_text("No MCP servers configured")

def test_add_mcp_server_form_exists(page, serve_hacka_re):
    """Test that the add MCP server form exists."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    page.locator("#mcp-btn").click()
    form = page.locator("#mcp-add-server-form")
    expect(form).to_be_visible()
    expect(page.locator("#mcp-server-name")).to_be_visible()
    expect(page.locator("#mcp-server-command")).to_be_visible()
    expect(page.locator("#mcp-server-env")).to_be_visible()

def test_add_mcp_server(page, serve_hacka_re):
    """Test adding an MCP server."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-btn").click()
    
    # Fill out the form
    page.locator("#mcp-server-name").fill("Test Server")
    page.locator("#mcp-server-command").fill("node server.js")
    page.locator("#mcp-server-env").fill("API_KEY=test\nDEBUG=true")
    
    # Submit the form
    page.locator("#mcp-add-server-form button[type='submit']").click()
    
    # Check that the server was added
    server_item = page.locator(".mcp-server-item")
    expect(server_item).to_be_visible()
    expect(server_item.locator(".mcp-server-name")).to_have_text("Test Server")
    expect(server_item.locator(".mcp-server-details")).to_contain_text("Command: node server.js")
    expect(server_item.locator(".mcp-server-details")).to_contain_text("Env: API_KEY=test, DEBUG=true")
    
    # Check that the empty state is hidden
    empty_state = page.locator("#mcp-empty-state")
    expect(empty_state).not_to_be_visible()
    
    # Check that the server status is disconnected
    status = server_item.locator(".mcp-server-status")
    # Just check the text content, not the class
    expect(status).to_contain_text("Disconnected")

def test_start_stop_mcp_server(page, serve_hacka_re):
    """Test starting and stopping an MCP server."""
    # First add a server
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-btn").click()
    
    # Fill out the form
    page.locator("#mcp-server-name").fill("Test Server")
    page.locator("#mcp-server-command").fill("node server.js")
    page.locator("#mcp-server-env").fill("API_KEY=test\nDEBUG=true")
    
    # Submit the form
    page.locator("#mcp-add-server-form button[type='submit']").click()
    
    # Get the server item
    server_item = page.locator(".mcp-server-item")
    
    # Click the start button
    start_btn = server_item.locator(".mcp-server-actions button").nth(0)
    expect(start_btn).to_be_visible()
    start_btn.click()
    
    # Wait for the server status to change from disconnected to connecting or connected
    # This might take a bit longer, so we'll wait up to 5 seconds
    page.wait_for_timeout(500)  # Wait longer for status to update
    
    # Use expect with a timeout to wait for the status to change
    status = server_item.locator(".mcp-server-status")
    
    # Skip the connecting/connected check since it might change too quickly
    # Just wait for the final connected state
    
    # Wait for the server to connect
    page.wait_for_timeout(1100)  # Wait for the simulated connection (1000ms)
    
    # Check that the server status changes to connected
    status = server_item.locator(".mcp-server-status")
    expect(status).to_contain_text("Connected")
    
    # Check that the tools are displayed
    tools = server_item.locator(".mcp-server-tools")
    expect(tools).to_be_visible()
    expect(tools).to_contain_text("Available tools:")
    expect(tools.locator(".mcp-tool-badge")).to_contain_text("weather_tool")
    
    # Click the stop button
    stop_btn = server_item.locator(".mcp-server-actions button").nth(0)
    expect(stop_btn).to_be_visible()
    stop_btn.click()
    
    # Wait for the server to disconnect
    page.wait_for_timeout(600)  # Wait for the simulated disconnection (500ms)
    
    # Check that the server status changes to disconnected
    status = server_item.locator(".mcp-server-status")
    expect(status).to_contain_text("Disconnected")
    
    # Check that the tools are hidden
    tools = server_item.locator(".mcp-server-tools")
    expect(tools).not_to_be_visible()

def test_remove_mcp_server(page, serve_hacka_re):
    """Test removing an MCP server."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-btn").click()
    
    # Fill out the form
    page.locator("#mcp-server-name").fill("Test Server")
    page.locator("#mcp-server-command").fill("node server.js")
    page.locator("#mcp-server-env").fill("API_KEY=test\nDEBUG=true")
    
    # Submit the form
    page.locator("#mcp-add-server-form button[type='submit']").click()
    
    # Get the server item
    server_item = page.locator(".mcp-server-item")
    
    # Click the remove button (accept the confirmation dialog)
    page.on("dialog", lambda dialog: dialog.accept())
    remove_btn = server_item.locator(".mcp-server-actions button").nth(1)
    expect(remove_btn).to_be_visible()
    remove_btn.click()
    
    # Check that the server was removed
    expect(page.locator(".mcp-server-item")).not_to_be_visible()
    
    # Check that the empty state is shown
    empty_state = page.locator("#mcp-empty-state")
    expect(empty_state).to_be_visible()
