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

def test_mcp_with_function_tools_enabled(page: Page, serve_hacka_re, api_key):
    """Test MCP after programmatically enabling Function Tools"""
    
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
    page.wait_for_timeout(2000)
    page.locator("#model-select").select_option("gpt-4o-mini")
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Enable Function Tools programmatically
    print("=== Enabling Function Tools Programmatically ===")
    enable_result = page.evaluate("""() => {
        if (window.FunctionToolsService) {
            console.log('Enabling Function Tools...');
            window.FunctionToolsService.setFunctionToolsEnabled(true);
            const enabled = window.FunctionToolsService.isFunctionToolsEnabled();
            console.log('Function Tools enabled:', enabled);
            return enabled;
        }
        return false;
    }""")
    
    print(f"Function Tools enabled: {enable_result}")
    
    if not enable_result:
        print("❌ Failed to enable Function Tools")
        return "failed"
    
    # Setup console monitoring
    console_logs = []
    def handle_console(msg):
        text = msg.text
        console_logs.append(f'[{msg.type}] {text}')
        if any(keyword in text for keyword in ['Function called', 'list_directory', 'MCP tool', 'Args object']):
            print(f'CONSOLE: {text}')
    
    page.on('console', handle_console)
    
    print("=== Setting up MCP connection ===")
    
    # Setup MCP 
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    page.fill("#mcp-proxy-url", "http://localhost:3001")
    page.click("#test-proxy-btn")
    page.wait_for_timeout(2000)
    page.fill("#mcp-server-name", "mcp-server")
    page.select_option("#mcp-transport-type", "stdio") 
    page.fill("#mcp-server-command", "npx @modelcontextprotocol/server-filesystem /Users/user")
    page.click("#mcp-server-form button[type='submit']")
    page.wait_for_timeout(3000)
    
    try:
        page.click("#close-mcp-servers-modal")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
    except:
        page.evaluate("""() => {
            const modal = document.getElementById('mcp-servers-modal');
            if (modal) modal.classList.remove('active');
        }""")
    
    # Double-check function tools status after MCP setup
    final_status = page.evaluate("""() => {
        return {
            enabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false,
            definitionCount: window.functionCallingManager ? window.functionCallingManager.getFunctionDefinitions().length : 0,
            mcpFunctionCount: window.FunctionToolsService ? Object.keys(window.FunctionToolsService.getJsFunctions()).length : 0
        };
    }""")
    
    print(f"\\n=== FINAL STATUS CHECK ===")
    print(f"Function Tools enabled: {final_status['enabled']}")
    print(f"Function definitions: {final_status['definitionCount']}")
    print(f"MCP functions: {final_status['mcpFunctionCount']}")
    
    print("\\n=== Testing Function Call ===")
    
    # Test with a direct request
    message_input = page.locator("#message-input")
    message_input.fill("Use the list_directory function to list files in /Users/user")
    page.click("#send-btn")
    
    print("Waiting for response...")
    page.wait_for_timeout(15000)
    
    # Check results
    function_icons = page.locator('.function-call-icon')
    function_count = function_icons.count()
    print(f"Function call icons: {function_count}")
    
    # Get the conversation
    messages = page.evaluate("""() => {
        const messages = document.querySelectorAll('.chat-message');
        return Array.from(messages).slice(-2).map(msg => ({
            text: msg.textContent,
            isUser: msg.classList.contains('user'),
            isAssistant: msg.classList.contains('assistant')
        }));
    }""")
    
    print(f"\\n=== CONVERSATION ===")
    for msg in messages:
        role = "USER" if msg['isUser'] else "ASSISTANT" if msg['isAssistant'] else "SYSTEM"
        print(f"{role}: {msg['text'][:200]}...")
    
    # Analyze results
    assistant_message = next((msg['text'] for msg in messages if msg['isAssistant']), "")
    
    success_indicators = ['Documents', 'Desktop', 'Downloads', '[FILE]', '[DIR]', 'Applications']
    has_file_listing = any(indicator in assistant_message for indicator in success_indicators)
    has_undefined_error = 'undefined' in assistant_message and 'Required' in assistant_message
    has_general_error = 'error' in assistant_message.lower()
    
    print(f"\\n=== RESULTS ===")
    print(f"Function icons: {function_count}")
    print(f"Has file listing: {has_file_listing}")
    print(f"Has undefined error: {has_undefined_error}")
    print(f"Has general error: {has_general_error}")
    print(f"Response length: {len(assistant_message)}")
    
    # Show relevant logs
    relevant_logs = [log for log in console_logs if any(keyword in log for keyword in [
        'Function called', 'list_directory', 'MCP tool', 'Args object', 'params object'
    ])]
    
    print(f"\\n=== FUNCTION CALL LOGS ===")
    for log in relevant_logs[-5:]:
        print(log)
    
    screenshot_with_markdown(page, "mcp_function_tools_enabled_test", {
        "Test": "MCP with Function Tools Enabled",
        "Function Icons": function_count,
        "Has File Listing": has_file_listing,
        "No Undefined Error": not has_undefined_error
    })
    
    if function_count > 0 and has_file_listing and not has_undefined_error:
        print("\\n🎉 COMPLETE SUCCESS: MCP functions working with Function Tools enabled!")
        return "success"
    elif function_count > 0 and not has_undefined_error:
        print("\\n✅ PARTIAL SUCCESS: Function called without undefined errors")
        return "partial" 
    elif function_count > 0:
        print("\\n⚠️ FUNCTION CALLED: But still has parameter issues")
        return "parameter_issues"
    else:
        print("\\n❌ NO FUNCTION CALLS: Still not working")
        return "no_calls"

if __name__ == "__main__":
    print("Run with: python -m pytest test_mcp_with_function_tools_enabled.py -v -s")