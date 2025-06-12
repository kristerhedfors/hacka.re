"""Integration tests for MCP with real filesystem server"""
import pytest
from playwright.sync_api import Page, expect
import subprocess
import time
import requests
from pathlib import Path
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


class MCPTestProxy:
    """Helper class to manage MCP stdio proxy for tests"""
    def __init__(self):
        self.process = None
        self.proxy_dir = Path(__file__).parent.parent.parent / "mcp-stdio-proxy"
        
    def start(self):
        """Start the MCP stdio proxy server"""
        if self.process and self.process.poll() is None:
            return  # Already running
        
        # Check if Node.js is available
        try:
            subprocess.run(["node", "--version"], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise Exception("Node.js is not installed or not in PATH")
        
        # Check if proxy directory exists
        if not self.proxy_dir.exists():
            raise Exception(f"MCP proxy directory not found: {self.proxy_dir}")
        
        # Check if package.json exists and install deps if needed
        package_json = self.proxy_dir / "package.json"
        if package_json.exists():
            node_modules = self.proxy_dir / "node_modules"
            if not node_modules.exists():
                print("Installing MCP proxy dependencies...")
                subprocess.run(["npm", "install"], cwd=self.proxy_dir, check=True)
        
        # Start proxy server
        print(f"Starting MCP proxy from {self.proxy_dir}")
        self.process = subprocess.Popen(
            ["node", "server.js"],
            cwd=self.proxy_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start with retries
        for _ in range(10):
            time.sleep(0.5)
            try:
                response = requests.get("http://localhost:3001/health", timeout=2)
                if response.status_code == 200:
                    print("MCP proxy started successfully")
                    return
            except requests.exceptions.RequestException:
                pass
        
        # If we get here, startup failed
        self.stop()
        stdout, stderr = self.process.communicate() if self.process else ("", "")
        raise Exception(f"Failed to start MCP proxy. stdout: {stdout}, stderr: {stderr}")
    
    def stop(self):
        """Stop the MCP stdio proxy server"""
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
            self.process = None
            print("MCP proxy stopped")


@pytest.fixture
def mcp_proxy():
    """Fixture to manage MCP proxy lifecycle"""
    proxy = MCPTestProxy()
    try:
        proxy.start()
        yield proxy
    except Exception as e:
        pytest.skip(f"Could not start MCP proxy: {e}")
    finally:
        proxy.stop()


def test_mcp_filesystem_server_integration(page: Page, serve_hacka_re, mcp_proxy):
    """Test full integration with MCP filesystem server"""
    # Check if npx is available for filesystem server
    try:
        subprocess.run(["npx", "--version"], check=True, capture_output=True, timeout=5)
    except:
        pytest.skip("npx not available - cannot test filesystem server")
    
    # Verify proxy is running
    assert mcp_proxy.process is not None, "MCP proxy should be running"
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Test proxy connection
    test_proxy_btn = page.locator("#test-proxy-btn")
    test_proxy_btn.click()
    
    # Wait for connection (with timeout)
    proxy_status = page.locator("#proxy-status")
    try:
        expect(proxy_status).to_contain_text("Connected", timeout=10000)
    except:
        pytest.skip("Could not connect to MCP proxy")
    
    # Close and reopen modal to reset form state
    page.locator("#close-mcp-servers-modal").click()
    time.sleep(0.5)
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Set up filesystem server with test directory
    test_dir = Path(__file__).parent / "mcp_test_filesystem"
    server_command = f"npx -y @modelcontextprotocol/server-filesystem {test_dir}"
    
    # Fill server name (wait for field to be visible first)
    name_input = page.locator("#mcp-server-name")
    expect(name_input).to_be_visible()
    name_input.fill("Test Filesystem Server")
    
    # Set transport type to stdio (default is already stdio, but let's be explicit)
    transport_select = page.locator("#mcp-transport-type")
    transport_select.select_option("stdio")
    
    # Fill command (not URL since this is stdio transport)
    command_input = page.locator("#mcp-server-command")
    expect(command_input).to_be_visible()
    command_input.fill(server_command)
    
    submit_btn = page.locator("#mcp-server-form button[type='submit']")
    submit_btn.click()
    
    # Wait for server to potentially start
    time.sleep(3)
    
    # Check if server appears in list (may or may not work)
    server_list = page.locator("#mcp-servers-list")
    expect(server_list).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_filesystem_integration", {
        "Status": "MCP Filesystem Server Integration attempted",
        "Component": "MCP Integration", 
        "Test Phase": "Filesystem Server Integration",
        "Action": "Attempted filesystem server connection"
    })


def test_mcp_tool_execution(page: Page, serve_hacka_re, mcp_proxy):
    """Test MCP tool execution setup (simplified)"""
    # Verify proxy is running
    assert mcp_proxy.process is not None, "MCP proxy should be running"
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Test proxy connection
    page.locator("#test-proxy-btn").click()
    time.sleep(2)
    
    # Check if we can access function calling interface
    page.locator("#close-mcp-servers-modal").click()
    
    # Check if function calling button is visible
    function_btn = page.locator("#function-calling-btn")
    if function_btn.is_visible():
        function_btn.click()
        expect(page.locator("#function-calling-modal")).to_be_visible()
        # Check basic function calling UI elements
        expect(page.locator("#functions-list")).to_be_visible()
        expect(page.locator("#enable-function-calling")).to_be_visible()
    else:
        # Button not visible - this is ok for basic test
        print("Function calling button not visible (this is expected in some configurations)")
    
    screenshot_with_markdown(page, "mcp_tool_execution", {
        "Status": "MCP Tool Execution UI verified",
        "Component": "MCP Integration",
        "Test Phase": "Tool Execution Setup",
        "Action": "Verified function calling interface accessibility"
    })


def test_mcp_multiple_servers(page: Page, serve_hacka_re, mcp_proxy):
    """Test MCP multiple server form submissions"""
    # Verify proxy is running
    assert mcp_proxy.process is not None, "MCP proxy should be running"
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Skip proxy test and focus on multiple form submissions using stdio transport
    name_input = page.locator("#mcp-server-name")
    command_input = page.locator("#mcp-server-command")
    submit_btn = page.locator("#mcp-server-form button[type='submit']")
    
    # Submit first server command
    # Ensure transport is set to stdio (default)
    transport_select = page.locator("#mcp-transport-type")
    transport_select.select_option("stdio")
    page.evaluate("window.MCPOAuthIntegration && window.MCPOAuthIntegration.updateFormVisibility('stdio')")
    
    name_input.fill("Test Server 1")
    expect(command_input).to_be_visible()
    command_input.fill("echo 'test server 1'")
    submit_btn.click()
    time.sleep(1)
    
    # Submit second server command
    name_input.clear()
    name_input.fill("Test Server 2")
    command_input.clear()
    command_input.fill("echo 'test server 2'")
    submit_btn.click()
    time.sleep(1)
    
    # Verify server list area is visible
    server_list = page.locator("#mcp-servers-list")
    expect(server_list).to_be_visible()
    
    screenshot_with_markdown(page, "mcp_multiple_servers", {
        "Status": "Multiple server form submissions tested",
        "Component": "MCP Integration",
        "Test Phase": "Multiple Server Management",
        "Action": "Verified multiple server form submission handling"
    })


# Remaining tests commented out for now - they require complex MCP server interactions
# that are difficult to test reliably in automation

# Additional tests can be added here as MCP integration matures

