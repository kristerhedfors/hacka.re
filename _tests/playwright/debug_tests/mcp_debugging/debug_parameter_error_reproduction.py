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

def test_reproduce_parameter_error(page: Page, serve_hacka_re, api_key):
    """Reproduce the exact parameter error reported by the user"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Setup API with explicit save
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    page.locator("#api-key-update").fill(api_key)
    page.locator("#base-url-select").select_option("openai")
    page.locator("#model-reload-btn").click()
    page.wait_for_timeout(3000)
    page.locator("#model-select").select_option("gpt-4o-mini")
    
    # Save settings explicitly
    save_btn = page.locator("#save-settings-btn")
    if save_btn.is_visible():
        save_btn.click()
        page.wait_for_timeout(2000)
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Enable Function Tools programmatically
    print("=== Enabling Function Tools ===")
    enable_result = page.evaluate("""() => {
        if (window.FunctionToolsService) {
            window.FunctionToolsService.setFunctionToolsEnabled(true);
            return window.FunctionToolsService.isFunctionToolsEnabled();
        }
        return false;
    }""")
    
    print(f"Function Tools enabled: {enable_result}")
    
    # Setup MCP
    print("=== Setting up MCP connection ===")
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
    
    # Enhanced console monitoring to catch all logs
    console_logs = []
    def handle_console(msg):
        text = msg.text
        console_logs.append(f'[{msg.type}] {text}')
        # Print anything related to function execution, MCP, or errors
        if any(keyword in text.lower() for keyword in [
            'function called', 'list_directory', 'mcp', 'args object', 'params', 
            'error', 'invalid', 'undefined', 'required', 'execution'
        ]):
            print(f'CONSOLE: [{msg.type}] {text}')
    
    page.on('console', handle_console)
    
    # Force a more explicit request
    print("\n=== Testing with very explicit function request ===")
    message_input = page.locator("#message-input")
    message_input.fill("Please call the list_directory function with the path parameter set to '/Users/user' to show me what files are in that directory.")
    page.click("#send-btn")
    
    print("Waiting 20 seconds for response and any errors...")
    page.wait_for_timeout(20000)
    
    # Check for function call attempts
    function_icons = page.locator('.function-call-icon')
    function_count = function_icons.count()
    print(f"Function call icons found: {function_count}")
    
    # Get all messages to look for the error
    all_messages = page.evaluate("""() => {
        const messages = document.querySelectorAll('.chat-message');
        return Array.from(messages).map(msg => ({
            text: msg.textContent,
            innerHTML: msg.innerHTML,
            isUser: msg.classList.contains('user'),
            isAssistant: msg.classList.contains('assistant'),
            classes: Array.from(msg.classList)
        }));
    }""")
    
    print(f"\n=== ALL MESSAGES ({len(all_messages)}) ===")
    for i, msg in enumerate(all_messages):
        role = "USER" if msg['isUser'] else "ASSISTANT" if msg['isAssistant'] else "UNKNOWN"
        print(f"Message {i+1} ({role}):")
        print(f"  Text: {msg['text'][:200]}...")
        if 'invalid' in msg['text'].lower() or 'undefined' in msg['text'].lower() or 'error' in msg['text'].lower():
            print(f"  *** CONTAINS ERROR: {msg['text']}")
        print(f"  Classes: {msg['classes']}")
        print()
    
    # Look for the specific error pattern
    error_found = False
    error_message = ""
    for msg in all_messages:
        if any(keyword in msg['text'].lower() for keyword in ['invalid arguments', 'undefined', 'required']):
            error_found = True
            error_message = msg['text']
            break
    
    print(f"\n=== ERROR ANALYSIS ===")
    print(f"Error found: {error_found}")
    if error_found:
        print(f"Error message: {error_message}")
    
    # Check for specific console logs about function execution
    execution_logs = [log for log in console_logs if any(keyword in log.lower() for keyword in [
        'function called', 'mcp tool', 'args object', 'params object', 'execution', 
        'list_directory', 'invalid', 'undefined', 'error'
    ])]
    
    print(f"\n=== FUNCTION EXECUTION LOGS ===")
    for log in execution_logs:
        print(log)
    
    # Check if we can manually trigger the function to see the error
    print(f"\n=== MANUAL FUNCTION TRIGGER TEST ===")
    manual_result = page.evaluate("""() => {
        console.log('=== MANUAL FUNCTION EXECUTION TEST ===');
        
        // Try to manually call the list_directory function
        if (window.FunctionToolsExecutor) {
            try {
                console.log('Attempting manual function execution...');
                const result = window.FunctionToolsExecutor.execute('list_directory', {path: '/Users/user'});
                console.log('Manual execution result:', result);
                return {success: true, result: result};
            } catch (error) {
                console.log('Manual execution error:', error);
                return {success: false, error: error.message};
            }
        } else {
            return {success: false, error: 'FunctionToolsExecutor not available'};
        }
    }""")
    
    print(f"Manual function execution: {manual_result}")
    
    screenshot_with_markdown(page, "parameter_error_reproduction", {
        "Test": "Reproduce Parameter Error",
        "Function Icons": function_count,
        "Error Found": error_found,
        "Messages Count": len(all_messages)
    })
    
    if error_found:
        print("\n🎯 SUCCESS: Reproduced the parameter error!")
        return "error_reproduced"
    elif function_count > 0:
        print("\n⚠️ FUNCTION CALLED: But no parameter error seen")
        return "called_no_error"
    else:
        print("\n❌ NO FUNCTION CALLS: Function not being invoked")
        return "no_calls"

if __name__ == "__main__":
    print("Run with: python -m pytest debug_tests/mcp_debugging/debug_parameter_error_reproduction.py -v -s")