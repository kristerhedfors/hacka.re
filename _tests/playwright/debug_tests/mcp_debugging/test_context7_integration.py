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

def test_context7_integration(page: Page, serve_hacka_re, api_key):
    """Test Context7 MCP integration with quick connector"""
    
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
    
    # Save settings explicitly
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
    
    # Setup MCP with both servers
    print("=== Setting up MCP connection ===")
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    page.fill("#mcp-proxy-url", "http://localhost:3001")
    page.click("#test-proxy-btn")
    page.wait_for_timeout(3000)
    
    # Check that both servers are detected
    proxy_status = page.evaluate("""() => {
        const statusElement = document.querySelector('[data-testid="proxy-status"]') || 
                             document.querySelector('.proxy-status') ||
                             document.querySelector('#proxy-status');
        return statusElement ? statusElement.textContent : null;
    }""")
    
    print(f"Proxy status: {proxy_status}")
    
    # Look for server list or available servers
    server_info = page.evaluate("""() => {
        // Look for server elements
        const serverElements = document.querySelectorAll('[data-server-name], .mcp-server-item, .server-item');
        const servers = Array.from(serverElements).map(el => ({
            text: el.textContent,
            dataset: el.dataset,
            classes: Array.from(el.classList)
        }));
        
        // Also check for any text mentioning servers
        const mcpModal = document.getElementById('mcp-servers-modal');
        const modalText = mcpModal ? mcpModal.textContent : '';
        
        return {
            serverElements: servers,
            modalText: modalText.substring(0, 500),
            hasFilesystem: modalText.includes('filesystem'),
            hasContext7: modalText.includes('context7') || modalText.includes('Context7')
        };
    }""")
    
    print(f"Servers detected: {len(server_info['serverElements'])}")
    print(f"Has filesystem: {server_info['hasFilesystem']}")
    print(f"Has Context7: {server_info['hasContext7']}")
    
    if server_info['serverElements']:
        print("Server elements found:")
        for server in server_info['serverElements']:
            print(f"  - {server['text'][:100]}")
    
    # Try to connect Context7 server specifically  
    print("\n=== Setting up Context7 server ===")
    
    # Look for Context7 in quick connectors or server list
    context7_found = page.evaluate("""() => {
        // Look for Context7 quick connector
        const quickConnectors = document.querySelectorAll('.quick-connector, [data-connector], .connector-card');
        for (const connector of quickConnectors) {
            if (connector.textContent.toLowerCase().includes('context7')) {
                console.log('Found Context7 quick connector:', connector.textContent);
                return {found: true, type: 'quick_connector', element: connector.outerHTML.substring(0, 200)};
            }
        }
        
        // Look for Context7 in server list
        const serverItems = document.querySelectorAll('[data-server-name="context7"], .server-item');
        for (const item of serverItems) {
            if (item.textContent.toLowerCase().includes('context7')) {
                console.log('Found Context7 server item:', item.textContent);
                return {found: true, type: 'server_item', element: item.outerHTML.substring(0, 200)};
            }
        }
        
        return {found: false};
    }""")
    
    print(f"Context7 connector found: {context7_found}")
    
    if context7_found['found']:
        # Try to click the Context7 connector/server
        try:
            if context7_found['type'] == 'quick_connector':
                page.click('[data-connector*="context7"], .quick-connector:has-text("Context7")')
            else:
                page.click('[data-server-name="context7"]')
            print("✅ Clicked Context7 connector")
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"⚠️ Could not click Context7 connector: {e}")
    
    # Alternatively, manually add Context7 server
    print("\n=== Manually adding Context7 server ===")
    try:
        # Fill in Context7 server details
        page.fill("#mcp-server-name", "context7")
        page.select_option("#mcp-transport-type", "stdio") 
        page.fill("#mcp-server-command", "npx -y @upstash/context7-mcp@latest")
        page.click("#mcp-server-form button[type='submit']")
        page.wait_for_timeout(3000)
        print("✅ Added Context7 server manually")
    except Exception as e:
        print(f"⚠️ Manual Context7 setup failed: {e}")
    
    # Close MCP modal
    try:
        page.click("#close-mcp-servers-modal")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=3000)
    except:
        page.evaluate("""() => {
            const modal = document.getElementById('mcp-servers-modal');
            if (modal) modal.classList.remove('active');
        }""")
    
    # Check final function status
    print("\n=== Checking available functions ===")
    function_status = page.evaluate("""() => {
        const functionDefs = window.functionCallingManager ? 
            window.functionCallingManager.getFunctionDefinitions() : [];
        
        const jsFunctions = window.FunctionToolsService ? 
            Object.keys(window.FunctionToolsService.getJsFunctions()) : [];
        
        return {
            totalDefinitions: functionDefs.length,
            jsFunctionCount: jsFunctions.length,
            jsFunctionNames: jsFunctions,
            hasSearchDocs: jsFunctions.some(name => name.includes('search') || name.includes('docs')),
            hasContext7Functions: jsFunctions.some(name => name.toLowerCase().includes('context'))
        };
    }""")
    
    print(f"Function definitions: {function_status['totalDefinitions']}")
    print(f"JS functions: {function_status['jsFunctionCount']}")
    print(f"Function names: {function_status['jsFunctionNames']}")
    print(f"Has search/docs functions: {function_status['hasSearchDocs']}")
    print(f"Has Context7 functions: {function_status['hasContext7Functions']}")
    
    # Test Context7 functionality
    print("\n=== Testing Context7 functionality ===")
    if function_status['jsFunctionCount'] > 5:  # Should have both filesystem + context7 functions
        
        # Setup console monitoring for Context7 calls
        console_logs = []
        def handle_console(msg):
            text = msg.text
            console_logs.append(f'[{msg.type}] {text}')
            if any(keyword in text.lower() for keyword in ['context7', 'search', 'docs', 'documentation']):
                print(f'CONSOLE: {text}')
        
        page.on('console', handle_console)
        
        # Test Context7 with a documentation search
        message_input = page.locator("#message-input")
        message_input.fill("Search for React useState hook documentation and examples")
        page.click("#send-btn")
        
        print("Waiting for Context7 response...")
        page.wait_for_timeout(15000)
        
        # Check for function calls
        function_icons = page.locator('.function-call-icon')
        function_count = function_icons.count()
        print(f"Function call icons: {function_count}")
        
        # Get conversation
        messages = page.evaluate("""() => {
            const messages = document.querySelectorAll('.chat-message');
            return Array.from(messages).slice(-2).map(msg => ({
                text: msg.textContent,
                isUser: msg.classList.contains('user'),
                isAssistant: msg.classList.contains('assistant')
            }));
        }""")
        
        assistant_message = ""
        for msg in messages:
            if msg['isAssistant']:
                assistant_message = msg['text']
                break
        
        # Check for Context7/documentation content
        has_docs_content = any(keyword in assistant_message.lower() for keyword in [
            'usestate', 'react', 'hook', 'documentation', 'example', 'import'
        ])
        
        has_function_call = function_count > 0
        
        print(f"Has documentation content: {has_docs_content}")
        print(f"Response length: {len(assistant_message)}")
        print(f"Response preview: {assistant_message[:200]}...")
        
        # Check Context7 logs
        context7_logs = [log for log in console_logs if any(keyword in log.lower() for keyword in [
            'context7', 'search', 'docs', 'documentation'
        ])]
        
        print(f"\nContext7 related logs:")
        for log in context7_logs[-5:]:
            print(f"  {log}")
        
        screenshot_with_markdown(page, "context7_integration_test", {
            "Test": "Context7 MCP Integration",
            "Total Functions": function_status['totalDefinitions'],
            "Function Icons": function_count,
            "Has Docs Content": has_docs_content,
            "Has Function Call": has_function_call
        })
        
        if has_function_call and has_docs_content:
            print("\n🎉 COMPLETE SUCCESS: Context7 integration working perfectly!")
            return "success"
        elif has_function_call:
            print("\n✅ PARTIAL SUCCESS: Functions called but need to verify Context7 content")
            return "partial"
        elif function_status['jsFunctionCount'] > 10:
            print("\n⚠️ FUNCTIONS LOADED: Context7 functions available but not called")
            return "loaded_not_called"
        else:
            print("\n❌ NO FUNCTION CALLS: Functions not being invoked")
            return "no_calls"
    
    else:
        print("\n❌ SETUP FAILED: Not enough functions loaded")
        return "setup_failed"

if __name__ == "__main__":
    print("Run with: python -m pytest debug_tests/mcp_debugging/test_context7_integration.py -v -s")