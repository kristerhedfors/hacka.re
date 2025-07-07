#!/usr/bin/env python3

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_basic_api_then_mcp(page: Page, serve_hacka_re, api_key):
    """Test basic API functionality first, then MCP functions"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Setup API
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    page.locator("#api-key-update").fill(api_key)
    page.locator("#base-url-select").select_option("openai")
    page.locator("#model-reload-btn").click()
    page.wait_for_timeout(1000)
    page.locator("#model-select").select_option("gpt-4o-mini")
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    print("=== Testing Basic API First ===")
    
    # Test basic API call without functions
    message_input = page.locator("#message-input")
    message_input.fill("Hello! Just say 'API working' if you can see this.")
    page.click("#send-btn")
    
    print("Waiting for basic API response...")
    page.wait_for_timeout(1000)
    
    # Check if we got a basic response
    basic_response = page.evaluate("""() => {
        const messages = document.querySelectorAll('.chat-message');
        const lastMessage = messages[messages.length - 1];
        return lastMessage ? lastMessage.textContent : '';
    }""")
    
    print(f"Basic API response: {basic_response[:100]}...")
    
    if not basic_response or len(basic_response) < 5:
        print("❌ BASIC API FAILED: No response from OpenAI")
        return "api_failed"
    
    print("✅ BASIC API WORKING")
    
    # Now enable Function Tools and setup MCP
    print("\n=== Enabling Function Tools ===")
    enable_result = page.evaluate("""() => {
        if (window.FunctionToolsService) {
            window.FunctionToolsService.setFunctionToolsEnabled(true);
            return window.FunctionToolsService.isFunctionToolsEnabled();
        }
        return false;
    }""")
    
    if not enable_result:
        print("❌ Could not enable Function Tools")
        return "function_tools_failed"
    
    print("✅ Function Tools enabled")
    
    # Setup MCP
    print("\n=== Setting up MCP ===")
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    page.fill("#mcp-proxy-url", "http://localhost:3001")
    page.click("#test-proxy-btn")
    page.wait_for_timeout(1000)
    page.fill("#mcp-server-name", "mcp-server")
    page.select_option("#mcp-transport-type", "stdio") 
    page.fill("#mcp-server-command", "npx @modelcontextprotocol/server-filesystem /Users/user")
    page.click("#mcp-server-form button[type='submit']")
    page.wait_for_timeout(1000)
    
    try:
        page.click("#close-mcp-servers-modal")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
    except:
        page.evaluate("""() => {
            const modal = document.getElementById('mcp-servers-modal');
            if (modal) modal.classList.remove('active');
        }""")
    
    # Verify function setup
    function_status = page.evaluate("""() => {
        return {
            enabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false,
            definitionCount: window.functionCallingManager ? window.functionCallingManager.getFunctionDefinitions().length : 0
        };
    }""")
    
    print(f"Function Tools enabled: {function_status['enabled']}")
    print(f"Function definitions: {function_status['definitionCount']}")
    
    if not function_status['enabled'] or function_status['definitionCount'] == 0:
        print("❌ Function Tools not properly set up")
        return "function_setup_failed"
    
    print("✅ Functions properly set up")
    
    # Test function call with console monitoring
    console_logs = []
    def handle_console(msg):
        text = msg.text
        console_logs.append(f'[{msg.type}] {text}')
        if any(keyword in text for keyword in ['Function called', 'list_directory', 'Args object']):
            print(f'CONSOLE: {text}')
    
    page.on('console', handle_console)
    
    print("\n=== Testing Function Call ===")
    message_input.fill("Use the list_directory function to list files in /Users/user")
    page.click("#send-btn")
    
    print("Waiting for function call response...")
    page.wait_for_timeout(1000)
    
    # Check results
    function_icons = page.locator('.function-call-icon')
    function_count = function_icons.count()
    
    final_response = page.evaluate("""() => {
        const messages = document.querySelectorAll('.chat-message');
        const lastMessage = messages[messages.length - 1];
        return lastMessage ? lastMessage.textContent : '';
    }""")
    
    print(f"Function icons: {function_count}")
    print(f"Final response length: {len(final_response)}")
    print(f"Response preview: {final_response[:200]}...")
    
    # Check for success indicators
    has_file_listing = any(indicator in final_response for indicator in ['Desktop', 'Documents', 'Downloads', '[FILE]', '[DIR]'])
    has_undefined_error = 'undefined' in final_response and 'Required' in final_response
    
    print(f"Has file listing: {has_file_listing}")
    print(f"Has undefined error: {has_undefined_error}")
    
    # Show function call logs
    func_logs = [log for log in console_logs if any(keyword in log for keyword in ['Function called', 'list_directory', 'Args object', 'params object'])]
    print(f"\nFunction call logs:")
    for log in func_logs[-5:]:
        print(f"  {log}")
    
    screenshot_with_markdown(page, "basic_api_then_mcp_test", {
        "Basic API": "Working",
        "Function Tools": function_status['enabled'],
        "Function Definitions": function_status['definitionCount'],
        "Function Icons": function_count,
        "Has File Listing": has_file_listing,
        "No Undefined Error": not has_undefined_error
    })
    
    if function_count > 0 and has_file_listing and not has_undefined_error:
        print("\n🎉 COMPLETE SUCCESS: All systems working!")
        return "success"
    elif function_count > 0 and not has_undefined_error:
        print("\n✅ PARTIAL SUCCESS: Function called without parameter errors")
        return "partial"
    elif function_count > 0:
        print("\n⚠️ FUNCTION CALLED: But still has issues")
        return "issues"
    else:
        print("\n❌ NO FUNCTION CALLS: Functions not being invoked")
        return "no_calls"

if __name__ == "__main__":
    print("Run with: python -m pytest test_basic_api_then_mcp.py -v -s")