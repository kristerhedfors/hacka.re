#!/usr/bin/env python3

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_mcp_parameter_passing_debug(page: Page, serve_hacka_re, api_key):
    """Debug specific parameter passing issue between LLM and MCP functions"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Enhanced console monitoring focused on parameter handling
    console_logs = []
    parameter_logs = []
    function_logs = []
    mcp_logs = []
    
    def handle_console(msg):
        text = msg.text
        log_entry = f'[{msg.type}] {text}'
        console_logs.append(log_entry)
        
        # Capture parameter-related logs
        if any(keyword in text for keyword in [
            'Function called with individual params',
            'Args object for MCP',
            'Invalid arguments',
            'Required',
            'parameter',
            'args:',
            'params:',
            'Arguments passed',
            'undefined'
        ]):
            parameter_logs.append(log_entry)
            
        # Function call logs
        if any(keyword in text for keyword in [
            'list_directory',
            'Function called',
            'tool result',
            'MCP tool result'
        ]):
            function_logs.append(log_entry)
            
        # MCP-specific logs
        if any(keyword in text for keyword in ['MCP', 'mcp']):
            mcp_logs.append(log_entry)
            
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
    
    print("=== Setting up MCP connection ===")
    
    # Setup MCP connection using the working approach from previous test
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    
    # Configure proxy
    page.fill("#mcp-proxy-url", "http://localhost:3001")
    page.click("#test-proxy-btn")
    page.wait_for_timeout(2000)
    
    # Connect to existing server
    page.fill("#mcp-server-name", "mcp-server")
    page.select_option("#mcp-transport-type", "stdio") 
    page.fill("#mcp-server-command", "npx @modelcontextprotocol/server-filesystem /Users/user")
    page.click("#mcp-server-form button[type='submit']")
    page.wait_for_timeout(3000)
    
    # Close modal
    try:
        page.click("#close-mcp-servers-modal")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
    except:
        page.evaluate("""() => {
            const modal = document.getElementById('mcp-servers-modal');
            if (modal) modal.classList.remove('active');
        }""")
    
    print("=== Testing parameter passing ===")
    
    # First, check the function definition that will be sent to the LLM
    function_definitions = page.evaluate("""() => {
        if (window.FunctionToolsService) {
            const functions = window.FunctionToolsService.getJsFunctions();
            const listDirFunc = functions['list_directory'];
            if (listDirFunc) {
                return {
                    hasFunction: true,
                    functionCode: listDirFunc.toString(),
                    name: listDirFunc.name,
                    length: listDirFunc.length
                };
            }
        }
        return { hasFunction: false };
    }""")
    print(f"Function definition check: {function_definitions}")
    
    # Test the function call with a very explicit message
    message_input = page.locator("#message-input")
    test_message = "Use the list_directory function to list files in /Users/user directory. Make sure to pass the path parameter correctly."
    message_input.fill(test_message)
    page.click("#send-btn")
    
    print("Waiting for function call and monitoring parameter passing...")
    page.wait_for_timeout(10000)
    
    # Check for function call indicators
    function_icons = page.locator('.function-call-icon')
    function_count = function_icons.count()
    print(f"Found {function_count} function call icons")
    
    # Get the latest response to analyze
    latest_message = page.evaluate("""() => {
        const messages = document.querySelectorAll('.chat-message');
        const lastMessage = messages[messages.length - 1];
        return lastMessage ? lastMessage.textContent : 'No messages found';
    }""")
    
    # Check for the specific error we're debugging
    has_undefined_error = 'undefined' in latest_message and 'Required' in latest_message
    has_invalid_args = 'Invalid arguments' in latest_message
    
    print(f"\\nLatest message contains undefined error: {has_undefined_error}")
    print(f"Latest message contains invalid args: {has_invalid_args}")
    
    screenshot_with_markdown(page, "mcp_parameter_debug", {
        "Test": "Parameter Passing Debug",
        "Function Icons": function_count,
        "Parameter Logs": len(parameter_logs),
        "Has Undefined Error": has_undefined_error
    })
    
    print("\\n=== PARAMETER ANALYSIS ===")
    print(f"Parameter-specific logs: {len(parameter_logs)}")
    for log in parameter_logs[-10:]:  # Last 10 parameter logs
        print(f"  {log}")
    
    print(f"\\nFunction call logs: {len(function_logs)}")
    for log in function_logs[-5:]:  # Last 5 function logs
        print(f"  {log}")
    
    # Try to get more detailed information about the parameter passing
    parameter_debug = page.evaluate("""() => {
        // Try to inspect the MCP tool arguments processing
        if (window.MCPToolsManager) {
            console.log('=== PARAMETER DEBUG INSPECTION ===');
            
            // Check if we can access the tool registry
            if (window.MCPToolRegistry) {
                const tools = window.MCPToolRegistry.getAllTools();
                console.log('MCP Tools available:', Object.keys(tools));
                
                // Look for list_directory specifically
                const serverTools = tools['mcp-server'] || [];
                const listDirTool = serverTools.find(tool => tool.name === 'list_directory');
                if (listDirTool) {
                    console.log('list_directory tool schema:', listDirTool);
                    return { 
                        hasListDirectory: true, 
                        schema: listDirTool.inputSchema || 'no schema',
                        toolDef: listDirTool
                    };
                }
            }
        }
        return { hasListDirectory: false };
    }""")
    print(f"\\nParameter debug inspection: {parameter_debug}")
    
    print("\\n=== DIAGNOSIS ===")
    if has_undefined_error:
        print("❌ CONFIRMED: Parameter passing issue - function receives undefined instead of actual values")
        print("🔍 ISSUE: The path parameter is not being passed correctly from LLM to MCP function")
        print("🎯 FOCUS: Need to debug the argument transformation between function call and MCP tool execution")
    elif function_count > 0:
        print("⚠️ PARTIAL: Function called but may have other parameter issues")
    else:
        print("❌ NO FUNCTION CALLS: Function not being triggered by LLM")
    
    return {
        'function_count': function_count,
        'has_undefined_error': has_undefined_error,
        'parameter_logs': len(parameter_logs),
        'function_logs': len(function_logs)
    }

if __name__ == "__main__":
    print("Run with: python -m pytest debug_mcp_parameter_passing.py -v -s")