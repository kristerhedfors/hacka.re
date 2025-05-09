import pytest
from playwright.sync_api import expect
from test_utils import dismiss_welcome_modal

# Skip all MCP tests as the functionality is currently disabled
pytestmark = pytest.mark.skip(reason="MCP functionality is currently under development and temporarily disabled")

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
    expect(page.locator("#mcp-server-url")).to_be_visible()
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
    page.locator("#mcp-server-url").fill("http://localhost:8000")
    page.locator("#mcp-server-command").fill("node server.js")
    page.locator("#mcp-server-env").fill("API_KEY=test\nDEBUG=true")
    
    # Submit the form
    page.locator("#mcp-add-server-form button[type='submit']").click()
    
    # Check that the server was added
    server_item = page.locator(".mcp-server-item")
    expect(server_item).to_be_visible()
    expect(server_item.locator(".mcp-server-name")).to_have_text("Test Server")
    expect(server_item.locator(".mcp-server-details")).to_contain_text("URL: http://localhost:8000")
    expect(server_item.locator(".mcp-server-details")).to_contain_text("Command (reference only): node server.js")
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
    page.locator("#mcp-server-url").fill("http://localhost:8000")
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
    page.locator("#mcp-server-url").fill("http://localhost:8000")
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

def test_filesystem_mcp_server_integration(browser, serve_hacka_re):
    """
    Test integration with a filesystem MCP server.
    
    This test starts a filesystem MCP server using supergateway on port 8001,
    then tests the integration with the hacka.re web client.
    
    Note: This test is marked as skip by default because it requires:
    1. A valid API key and model configuration
    2. External npm packages to be installed
    
    To run this test manually:
    1. Make sure you have a valid API key configured
    2. Run: cd _tests/playwright && python -m pytest test_mcp.py::test_filesystem_mcp_server_integration -v --no-skip
    """
    import subprocess
    import os
    import signal
    import time
    import tempfile
    
    # Create a test directory with a test file if it doesn't exist
    test_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../test-mcp-dir"))
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)
    test_file_path = os.path.join(test_dir, "test.txt")
    if not os.path.exists(test_file_path):
        with open(test_file_path, "w") as f:
            f.write("This is a test file")
    
    # Start the MCP server on port 8001 (different from the HTTP server on port 8000)
    mcp_port = 8001
    mcp_url = f"http://localhost:{mcp_port}"
    mcp_process = None
    log_file_path = None
    
    try:
        # Create a temporary file to capture the server output
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as log_file:
            log_file_path = log_file.name
            
            # Start the MCP server as a subprocess
            mcp_process = subprocess.Popen(
                [
                    "npx", "-y", "supergateway",
                    "--stdio", f"npx -y @modelcontextprotocol/server-filesystem {test_dir}",
                    "--port", str(mcp_port),
                    "--baseUrl", mcp_url,
                    "--ssePath", "/sse",
                    "--messagePath", "/message"
                ],
                stdout=log_file,
                stderr=log_file,
                preexec_fn=os.setsid,
                cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            )
        
        # Give the server a moment to start
        time.sleep(3)
        
        # Check if the server started successfully
        server_started = False
        for _ in range(5):  # Try checking a few times
            with open(log_file_path, 'r') as f:
                log_content = f.read()
                if "Listening on port" in log_content:
                    server_started = True
                    break
            time.sleep(1)
        
        if not server_started:
            with open(log_file_path, 'r') as f:
                log_content = f.read()
            pytest.skip(f"MCP server failed to start. Log: {log_content}")
        
        # Create a new page for this test
        page = browser.new_page()
        
        try:
            # Now proceed with the test
            page.goto(serve_hacka_re)
            
            # Wait for the page to load
            page.wait_for_load_state("networkidle")
            
            # Dismiss welcome modal
            dismiss_welcome_modal(page)
            
            # Wait for the MCP button to be visible
            page.locator("#mcp-btn").wait_for(state="visible", timeout=5000)
            
            # Open MCP modal
            page.locator("#mcp-btn").click()
            
            # Wait for the modal to be visible
            page.locator("#mcp-modal").wait_for(state="visible", timeout=5000)
            
            # Fill out the form for filesystem server
            page.locator("#mcp-server-name").fill("filesystem")
            page.locator("#mcp-server-url").fill(mcp_url)
            page.locator("#mcp-server-command").fill(f"npx -y @modelcontextprotocol/server-filesystem {test_dir}")
            
            # Submit the form
            page.locator("#mcp-add-server-form button[type='submit']").click()
            
            # Wait for the server to be added
            page.locator(".mcp-server-item").wait_for(state="visible", timeout=5000)
            
            # Close the MCP modal
            page.locator("#close-mcp-modal").click()
            
            # Wait for the modal to be hidden
            page.locator("#mcp-modal").wait_for(state="hidden", timeout=5000)
            
            # Open MCP modal again
            page.locator("#mcp-btn").click()
            
            # Wait for the modal to be visible again
            page.locator("#mcp-modal").wait_for(state="visible", timeout=5000)
            
            # Get the server item
            server_item = page.locator(".mcp-server-item")
            
            # Click the start button to connect to the server
            start_btn = server_item.locator(".mcp-server-actions button").nth(0)
            start_btn.click()
            
            # Wait for the server to connect
            page.wait_for_timeout(2000)  # Wait for the connection
            
            # Check that the server status changes to connected
            status = server_item.locator(".mcp-server-status")
            expect(status).to_contain_text("Connected")
            
            # Close the MCP modal
            page.locator("#close-mcp-modal").click()
            
            # Wait for the modal to be hidden
            page.locator("#mcp-modal").wait_for(state="hidden", timeout=5000)
            
            # Send a message that uses the filesystem tool
            page.locator("#message-input").fill("Can you list the files in the directory using the filesystem server?")
            page.locator("#send-btn").click()
            
            # Wait for the response (this may take longer with a real API call)
            page.wait_for_timeout(10000)  # Wait for the AI to respond
            
            # Check that we got a response
            messages = page.locator(".message.ai")
            
            # Wait for at least one AI message
            page.wait_for_timeout(1000)  # Give it a moment to appear
            count = messages.count()
            if count == 0:
                # Wait a bit longer and try again
                page.wait_for_timeout(9000)
                count = messages.count()
            
            assert count > 0, "No AI messages found after waiting"
            
            # Get the last message
            last_message = messages.nth(count - 1)
            
            # Wait for the message content to be visible
            last_message.locator(".message-content").wait_for(state="visible", timeout=5000)
            
            # The exact response will depend on the AI model and the contents of the directory
            # but we can check for common terms related to filesystem operations
            response_text = last_message.locator(".message-content").inner_text()
            
            # Check that the response contains filesystem-related terms
            # This is a basic check that could be improved based on expected response
            filesystem_terms = ["file", "directory", "folder", "list", "path", "test.txt"]
            has_filesystem_term = any(term in response_text.lower() for term in filesystem_terms)
            
            assert has_filesystem_term, f"Response doesn't contain any filesystem-related terms. Response: {response_text}"
            
            # Print success message
            print("Test completed successfully!")
            print(f"Response text: {response_text}")
            
        finally:
            # Close the page
            page.close()
            
    finally:
        # Clean up: kill the MCP server process
        if mcp_process:
            try:
                os.killpg(os.getpgid(mcp_process.pid), signal.SIGTERM)
                print("MCP server process terminated")
            except (ProcessLookupError, NameError, AttributeError):
                # Process is already gone or wasn't started, which is fine
                print("MCP server process already terminated or not started")
        
        # Clean up the log file
        if log_file_path and os.path.exists(log_file_path):
            try:
                os.unlink(log_file_path)
            except:
                pass
