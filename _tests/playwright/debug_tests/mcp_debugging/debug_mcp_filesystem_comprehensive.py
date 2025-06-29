#!/usr/bin/env python3

import pytest
import asyncio
import subprocess
import time
import requests
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_mcp_filesystem_comprehensive_debug(page: Page, serve_hacka_re, api_key):
    """Comprehensive debugging of MCP filesystem server - capture all angles"""
    
    # Check MCP server is running
    try:
        response = requests.get("http://localhost:3001/health", timeout=5)
        print(f"✅ MCP server health check: {response.status_code}")
    except Exception as e:
        print(f"❌ MCP server not responding: {e}")
        print("Please ensure MCP server is running with:")
        print("node mcp-stdio-proxy/mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem /Users/user --debug")
        return False
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Setup comprehensive console monitoring
    console_logs = []
    mcp_logs = []
    error_logs = []
    function_logs = []
    
    def handle_console(msg):
        text = msg.text
        log_entry = f'[{msg.type}] {text}'
        console_logs.append(log_entry)
        
        # Categorize logs
        if any(keyword in text for keyword in ['MCP', 'mcp', 'server', 'proxy']):
            mcp_logs.append(log_entry)
        if any(keyword in text for keyword in ['Function called', 'Args object', 'tool result', 'list_directory']):
            function_logs.append(log_entry)
        if msg.type in ['error', 'warning'] or 'error' in text.lower():
            error_logs.append(log_entry)
            
        print(f'CONSOLE: {log_entry}')
    
    page.on('console', handle_console)
    
    # Setup API key quickly
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    page.locator("#api-key-update").fill(api_key)
    page.locator("#base-url-select").select_option("openai")
    page.locator("#model-reload-btn").click()
    page.wait_for_timeout(2000)
    
    # Select model
    try:
        page.locator("#model-select").select_option("gpt-4o-mini")
    except:
        options = page.evaluate("""() => {
            const select = document.getElementById('model-select');
            return Array.from(select.options).filter(opt => !opt.disabled).map(opt => opt.value);
        }""")
        if options:
            page.locator("#model-select").select_option(options[0])
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    print("=== STEP 1: Setting up MCP connection ===")
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    
    # Configure MCP proxy
    page.fill("#mcp-proxy-url", "http://localhost:3001")
    page.click("#test-proxy-btn")
    page.wait_for_timeout(2000)
    
    # Check proxy status
    proxy_status = page.text_content("#proxy-status")
    print(f"Proxy status: {proxy_status}")
    
    screenshot_with_markdown(page, "mcp_filesystem_step1_proxy", {
        "Step": "1 - Proxy Setup",
        "Proxy Status": proxy_status,
        "Console Logs": len(console_logs)
    })
    
    # Since the mcp-http-wrapper doesn't support /mcp/start, let's try to connect directly
    # by manually triggering the MCP client connection
    print("Attempting direct connection to existing MCP server...")
    
    # Try to connect directly using JavaScript instead of the form
    connection_result = page.evaluate("""async () => {
        try {
            console.log('=== MANUAL MCP CONNECTION TEST ===');
            
            // Check if MCP modules are available
            if (!window.MCPClient) {
                return { error: 'MCPClient not available' };
            }
            
            // Create client and connect
            const client = new window.MCPClient();
            
            const config = {
                name: 'mcp-server',
                transport: {
                    type: 'stdio',
                    proxyUrl: 'http://localhost:3001'
                }
            };
            
            console.log('Attempting to connect with config:', config);
            
            // Connect to the existing server
            await client.connect(config);
            
            console.log('Successfully connected to MCP server');
            
            // Try to list tools
            const tools = await client.listTools();
            console.log('Available tools:', tools);
            
            return { 
                success: true, 
                toolCount: tools ? tools.length : 0,
                tools: tools ? tools.map(t => t.name) : []
            };
        } catch (error) {
            console.error('Direct connection failed:', error);
            return { error: error.message };
        }
    }""")
    
    print(f"Direct connection result: {connection_result}")
    
    # If direct connection fails, try the form approach as fallback
    if isinstance(connection_result, dict) and 'error' in connection_result:
        print("Direct connection failed, trying form submission...")
        page.fill("#mcp-server-name", "mcp-server")
        page.select_option("#mcp-transport-type", "stdio") 
        page.fill("#mcp-server-command", "npx @modelcontextprotocol/server-filesystem /Users/user")
        page.click("#mcp-server-form button[type='submit']")
        page.wait_for_timeout(5000)
    
    screenshot_with_markdown(page, "mcp_filesystem_step2_connect", {
        "Step": "2 - Server Connection",
        "MCP Logs": len(mcp_logs),
        "Error Logs": len(error_logs)
    })
    
    # Close MCP modal - try multiple approaches
    try:
        page.click("#close-mcp-servers-modal")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
    except:
        try:
            page.keyboard.press("Escape")
            page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
        except:
            print("Modal didn't close automatically, continuing anyway...")
            # Force close the modal
            page.evaluate("""() => {
                const modal = document.getElementById('mcp-servers-modal');
                if (modal) modal.classList.remove('active');
            }""")
    
    print("=== STEP 2: Checking function registration ===")
    
    # Check what functions are now available
    function_state = page.evaluate("""() => {
        if (window.FunctionToolsService) {
            const functions = window.FunctionToolsService.getJsFunctions();
            const names = Object.keys(functions);
            const mcpFunctions = names.filter(name => 
                name.includes('list_directory') || 
                name.includes('read_file') ||
                name.includes('write_file') ||
                name.includes('create_directory')
            );
            return {
                totalFunctions: names.length,
                allFunctionNames: names,
                mcpFunctions: mcpFunctions,
                mcpCount: mcpFunctions.length
            };
        }
        return { error: 'FunctionToolsService not available' };
    }""")
    print(f"Function registration state: {function_state}")
    
    # Check MCP tool registry
    registry_state = page.evaluate("""() => {
        if (window.MCPToolRegistry) {
            const tools = window.MCPToolRegistry.getAllTools();
            return {
                totalTools: Object.keys(tools).length,
                toolNames: Object.keys(tools),
                servers: window.MCPToolRegistry.getConnectedServers ? window.MCPToolRegistry.getConnectedServers() : 'method not available'
            };
        }
        return { error: 'MCPToolRegistry not available' };
    }""")
    print(f"MCP Tool Registry state: {registry_state}")
    
    print("=== STEP 3: Testing function call ===")
    
    # Test a simple function call
    message_input = page.locator("#message-input")
    message_input.fill("list files in /Users/user using the filesystem tools")
    page.click("#send-btn")
    
    print("Waiting for function call to complete...")
    page.wait_for_timeout(10000)
    
    # Check for function call indicators
    function_icons = page.locator('.function-call-icon')
    function_count = function_icons.count()
    print(f"Found {function_count} function call icons")
    
    # Get the latest chat message to check for output
    latest_message = page.evaluate("""() => {
        const messages = document.querySelectorAll('.chat-message');
        const lastMessage = messages[messages.length - 1];
        return lastMessage ? lastMessage.textContent : 'No messages found';
    }""")
    print(f"Latest chat message: {latest_message[:200]}...")
    
    # Copy chat content to clipboard for inspection
    try:
        page.click("button[data-tooltip='Copy conversation to clipboard']")
        print("✅ Chat content copied to clipboard for inspection")
    except:
        print("⚠️ Could not copy chat to clipboard")
    
    screenshot_with_markdown(page, "mcp_filesystem_step3_function_call", {
        "Step": "3 - Function Call Test",
        "Function Icons": function_count,
        "Function Logs": len(function_logs),
        "Total Console Logs": len(console_logs)
    })
    
    print("=== STEP 4: Checking MCP server logs ===")
    
    # Check MCP server health and status
    try:
        server_list = requests.get("http://localhost:3001/mcp/list", timeout=5)
        print(f"MCP server list: {server_list.json()}")
    except Exception as e:
        print(f"Failed to get server list: {e}")
    
    print("=== ANALYSIS RESULTS ===")
    
    print(f"\n📊 LOG SUMMARY:")
    print(f"  Total console logs: {len(console_logs)}")
    print(f"  MCP-related logs: {len(mcp_logs)}")
    print(f"  Function call logs: {len(function_logs)}")
    print(f"  Error logs: {len(error_logs)}")
    print(f"  Function call icons: {function_count}")
    
    print(f"\n🔧 FUNCTION STATE:")
    if isinstance(function_state, dict) and 'mcpCount' in function_state:
        print(f"  MCP functions registered: {function_state['mcpCount']}")
        print(f"  MCP function names: {function_state.get('mcpFunctions', [])}")
    
    print(f"\n🏭 REGISTRY STATE:")
    if isinstance(registry_state, dict) and 'totalTools' in registry_state:
        print(f"  Total tools in registry: {registry_state['totalTools']}")
        print(f"  Tool names: {registry_state.get('toolNames', [])}")
    
    print(f"\n🚨 ERROR ANALYSIS:")
    for error in error_logs[-5:]:  # Show last 5 errors
        print(f"  {error}")
    
    print(f"\n🔧 MCP ANALYSIS:")
    for mcp_log in mcp_logs[-10:]:  # Show last 10 MCP logs
        print(f"  {mcp_log}")
    
    print(f"\n⚙️ FUNCTION ANALYSIS:")
    for func_log in function_logs[-10:]:  # Show last 10 function logs
        print(f"  {func_log}")
    
    # Determine success/failure
    has_functions = isinstance(function_state, dict) and function_state.get('mcpCount', 0) > 0
    has_tools = isinstance(registry_state, dict) and registry_state.get('totalTools', 0) > 0
    has_function_calls = function_count > 0
    has_errors = len(error_logs) > 0
    
    print(f"\n🎯 DIAGNOSIS:")
    print(f"  ✅ Functions registered: {has_functions}")
    print(f"  ✅ Tools in registry: {has_tools}")
    print(f"  ✅ Function calls executed: {has_function_calls}")
    print(f"  ❌ Errors present: {has_errors}")
    
    if has_functions and has_tools and has_function_calls and not has_errors:
        print("\n🎉 SUCCESS: MCP filesystem server working correctly!")
        return True
    elif has_functions and has_tools and not has_function_calls:
        print("\n⚠️ PARTIAL: Functions load but calls fail")
        return False
    elif not has_functions or not has_tools:
        print("\n❌ FAILED: Functions/tools not loading properly")
        return False
    else:
        print("\n❓ UNCLEAR: Mixed results, check logs above")
        return False

if __name__ == "__main__":
    # Can be run directly for manual testing
    print("This test requires:")
    print("1. MCP filesystem server running on localhost:3001")
    print("2. OpenAI API key in .env file")
    print("3. Browser automation via Playwright")
    print("\nRun with: python -m pytest debug_mcp_filesystem_comprehensive.py -v -s")