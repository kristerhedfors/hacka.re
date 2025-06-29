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

def test_context7_documentation_search(page: Page, serve_hacka_re, api_key):
    """Test Context7 documentation search functionality"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Setup API and Function Tools
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active", state="visible")
    page.locator("#api-key-update").fill(api_key)
    page.locator("#base-url-select").select_option("openai")
    page.locator("#model-reload-btn").click()
    page.wait_for_timeout(3000)
    page.locator("#model-select").select_option("gpt-4o-mini")
    
    # Save settings
    save_btn = page.locator("#save-settings-btn")
    if save_btn.is_visible():
        save_btn.click()
        page.wait_for_timeout(2000)
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#settings-modal", state="hidden")
    
    # Enable Function Tools
    print("=== Enabling Function Tools ===")
    page.evaluate("""() => {
        if (window.FunctionToolsService) {
            window.FunctionToolsService.setFunctionToolsEnabled(true);
        }
    }""")
    
    # Setup MCP connection for Context7 only (to isolate the test)
    print("=== Setting up Context7 MCP connection ===")
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    page.fill("#mcp-proxy-url", "http://localhost:3001")
    page.click("#test-proxy-btn")
    page.wait_for_timeout(3000)
    
    # Add Context7 server specifically
    page.fill("#mcp-server-name", "context7-docs")
    page.select_option("#mcp-transport-type", "stdio") 
    page.fill("#mcp-server-command", "npx -y @upstash/context7-mcp@latest")
    page.click("#mcp-server-form button[type='submit']")
    page.wait_for_timeout(5000)  # Give Context7 more time to initialize
    
    # Close MCP modal
    try:
        page.click("#close-mcp-servers-modal")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
    except:
        page.evaluate("""() => {
            const modal = document.getElementById('mcp-servers-modal');
            if (modal) modal.classList.remove('active');
        }""")
    
    # Check Context7 functions
    print("\n=== Checking Context7 functions ===")
    function_status = page.evaluate("""() => {
        const jsFunctions = window.FunctionToolsService ? 
            Object.keys(window.FunctionToolsService.getJsFunctions()) : [];
        
        const functionDefs = window.functionCallingManager ? 
            window.functionCallingManager.getFunctionDefinitions() : [];
        
        return {
            jsFunctionNames: jsFunctions,
            jsFunctionCount: jsFunctions.length,
            functionDefinitions: functionDefs.map(def => ({
                name: def.function?.name,
                description: def.function?.description
            })),
            definitionCount: functionDefs.length,
            hasResolveLibrary: jsFunctions.includes('resolve_library_id'),
            hasGetDocs: jsFunctions.includes('get_library_docs')
        };
    }""")
    
    print(f"Context7 functions found: {function_status['jsFunctionNames']}")
    print(f"Function count: {function_status['jsFunctionCount']}")
    print(f"Has resolve-library-id: {function_status['hasResolveLibrary']}")
    print(f"Has get-library-docs: {function_status['hasGetDocs']}")
    
    if function_status['definitionCount'] > 0:
        print("Function definitions:")
        for def_info in function_status['functionDefinitions']:
            print(f"  - {def_info['name']}: {def_info['description'][:100]}...")
    
    if not (function_status['hasResolveLibrary'] and function_status['hasGetDocs']):
        print("❌ Context7 functions not loaded properly")
        return "functions_not_loaded"
    
    # Test Context7 documentation search
    print("\n=== Testing Context7 Documentation Search ===")
    
    # Enhanced console monitoring for Context7
    console_logs = []
    def handle_console(msg):
        text = msg.text
        console_logs.append(f'[{msg.type}] {text}')
        if any(keyword in text.lower() for keyword in [
            'context7', 'resolve_library', 'get_library_docs', 'react', 'usestate', 'documentation'
        ]):
            print(f'CONSOLE: {text}')
    
    page.on('console', handle_console)
    
    # Test with a specific React documentation request
    message_input = page.locator("#message-input")
    message_input.fill("Use Context7 to search for React useState hook documentation with examples")
    page.click("#send-btn")
    
    print("Waiting for Context7 documentation search...")
    page.wait_for_timeout(20000)  # Give more time for documentation search
    
    # Check for function calls
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
    
    print(f"\n=== CONVERSATION ===")
    assistant_message = ""
    for msg in messages:
        role = "USER" if msg['isUser'] else "ASSISTANT" if msg['isAssistant'] else "SYSTEM"
        print(f"{role}: {msg['text'][:200]}...")
        if msg['isAssistant']:
            assistant_message = msg['text']
    
    # Check for Context7/React documentation content
    success_indicators = [
        'usestate', 'react', 'hook', 'setstate', 'import', 'const [',
        'documentation', 'example', 'state management'
    ]
    
    has_docs_content = any(indicator in assistant_message.lower() for indicator in success_indicators)
    has_function_call = function_count > 0
    has_context7_call = any('resolve_library' in log or 'get_library_docs' in log for log in console_logs)
    
    print(f"\n=== RESULTS ===")
    print(f"Function icons: {function_count}")
    print(f"Has documentation content: {has_docs_content}")
    print(f"Has function call: {has_function_call}")
    print(f"Has Context7 call: {has_context7_call}")
    print(f"Response length: {len(assistant_message)}")
    
    # Show Context7 specific logs
    context7_logs = [log for log in console_logs if any(keyword in log.lower() for keyword in [
        'resolve_library', 'get_library_docs', 'context7', 'react', 'usestate'
    ])]
    
    print(f"\n=== CONTEXT7 LOGS ===")
    for log in context7_logs[-10:]:
        print(log)
    
    screenshot_with_markdown(page, "context7_documentation_search", {
        "Test": "Context7 Documentation Search",
        "Functions Loaded": function_status['jsFunctionCount'],
        "Function Icons": function_count,
        "Has Documentation": has_docs_content,
        "Context7 Called": has_context7_call
    })
    
    if has_function_call and has_docs_content and has_context7_call:
        print("\n🎉 COMPLETE SUCCESS: Context7 documentation search working perfectly!")
        return "success"
    elif has_function_call and has_context7_call:
        print("\n✅ PARTIAL SUCCESS: Context7 called but need to verify documentation quality")
        return "partial"
    elif has_function_call:
        print("\n⚠️ FUNCTION CALLED: But may not be Context7")
        return "function_called"
    else:
        print("\n❌ NO FUNCTION CALLS: Context7 not being invoked")
        return "no_calls"

if __name__ == "__main__":
    print("Run with: python -m pytest debug_tests/mcp_debugging/test_context7_documentation_search.py -v -s")