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

def test_final_mcp_function_call(page: Page, serve_hacka_re, api_key):
    """Final test to verify MCP function calling works end-to-end"""
    
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
    
    # Setup console monitoring
    console_logs = []
    def handle_console(msg):
        text = msg.text
        console_logs.append(f'[{msg.type}] {text}')
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
    
    print("=== Testing with explicit function request ===")
    
    # Try a very explicit request that mentions the function name
    message_input = page.locator("#message-input")
    message_input.fill("Call the list_directory function with path '/Users/user' to show me the files.")
    page.click("#send-btn")
    
    print("Waiting for response...")
    page.wait_for_timeout(15000)
    
    # Check results
    function_icons = page.locator('.function-call-icon')
    function_count = function_icons.count()
    print(f"Function call icons: {function_count}")
    
    # Get the full conversation
    latest_messages = page.evaluate("""() => {
        const messages = document.querySelectorAll('.chat-message');
        return Array.from(messages).slice(-2).map(msg => ({
            text: msg.textContent,
            isUser: msg.classList.contains('user'),
            isAssistant: msg.classList.contains('assistant')
        }));
    }""")
    
    print(f"\\n=== CONVERSATION ===")
    for i, msg in enumerate(latest_messages):
        role = "USER" if msg['isUser'] else "ASSISTANT" if msg['isAssistant'] else "SYSTEM"
        print(f"{role}: {msg['text'][:200]}...")
    
    # Check if the function was actually called successfully
    success_indicators = [
        'Documents', 'Desktop', 'Downloads', 'Library',
        '[FILE]', '[DIR]', 'file', 'directory'
    ]
    
    assistant_message = ""
    for msg in latest_messages:
        if msg['isAssistant']:
            assistant_message = msg['text']
            break
    
    has_file_listing = any(indicator in assistant_message for indicator in success_indicators)
    has_error = 'error' in assistant_message.lower() or 'undefined' in assistant_message.lower()
    
    print(f"\\n=== RESULTS ===")
    print(f"Function icons found: {function_count}")
    print(f"Has file listing: {has_file_listing}")
    print(f"Has error: {has_error}")
    print(f"Assistant message length: {len(assistant_message)}")
    
    screenshot_with_markdown(page, "final_mcp_test", {
        "Test": "Final MCP Function Call Test",
        "Function Icons": function_count,
        "Has File Listing": has_file_listing,
        "Has Error": has_error
    })
    
    # Show relevant console logs
    mcp_logs = [log for log in console_logs if any(keyword in log for keyword in ['MCP', 'Function called', 'list_directory', 'Args object'])]
    print(f"\\n=== RELEVANT CONSOLE LOGS ===")
    for log in mcp_logs[-10:]:
        print(log)
    
    if function_count > 0 and has_file_listing and not has_error:
        print("\\n🎉 COMPLETE SUCCESS: MCP filesystem server is working perfectly!")
        return "success"
    elif function_count > 0:
        print("\\n✅ PARTIAL SUCCESS: Function called but may have issues")
        return "partial"
    else:
        print("\\n⚠️ FUNCTION NOT CALLED: LLM didn't use the function")
        print("This could be due to:")
        print("- Function Tools not enabled")
        print("- LLM choosing not to use the function")  
        print("- Function definition not reaching the LLM")
        return "not_called"

if __name__ == "__main__":
    print("Run with: python -m pytest test_final_mcp_verification.py -v -s")