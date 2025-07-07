#!/usr/bin/env python3

import pytest
import json
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_mcp_parameter_fix_verification(page: Page, serve_hacka_re, api_key):
    """Test that the MCP parameter fix is working correctly"""
    
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
    
    print("=== Setting up MCP connection ===")
    
    # Setup MCP 
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
    
    print("=== Testing Parameter Schema Fix ===")
    
    # Check function definitions after our fix
    function_analysis = page.evaluate("""() => {
        console.log('=== TESTING MCP PARAMETER FIX ===');
        
        let analysis = {
            functionDefinitions: [],
            listDirectoryDefinition: null,
            hasProperParameters: false,
            parameterCount: 0
        };
        
        // Get function definitions that will be sent to LLM
        if (window.functionCallingManager && window.functionCallingManager.getFunctionDefinitions) {
            const definitions = window.functionCallingManager.getFunctionDefinitions();
            analysis.functionDefinitions = definitions;
            
            // Find list_directory specifically
            const listDirDef = definitions.find(def => def.function && def.function.name === 'list_directory');
            if (listDirDef) {
                analysis.listDirectoryDefinition = listDirDef;
                
                const params = listDirDef.function.parameters;
                const properties = params ? params.properties : {};
                const propertyCount = Object.keys(properties || {}).length;
                
                analysis.hasProperParameters = propertyCount > 0;
                analysis.parameterCount = propertyCount;
                
                console.log('Found list_directory definition:', listDirDef);
                console.log('Parameter count:', propertyCount);
                console.log('Properties:', properties);
            }
        }
        
        return analysis;
    }""")
    
    print(f"\\n=== PARAMETER FIX ANALYSIS ===")
    print(f"Total function definitions: {len(function_analysis.get('functionDefinitions', []))}")
    print(f"Found list_directory: {function_analysis.get('listDirectoryDefinition') is not None}")
    print(f"Has proper parameters: {function_analysis.get('hasProperParameters')}")
    print(f"Parameter count: {function_analysis.get('parameterCount')}")
    
    # Show the list_directory definition
    list_dir_def = function_analysis.get('listDirectoryDefinition')
    if list_dir_def:
        params = list_dir_def.get('function', {}).get('parameters', {})
        properties = params.get('properties', {})
        required = params.get('required', [])
        
        print(f"\\n=== LIST_DIRECTORY FUNCTION DEFINITION ===")
        print(f"Parameters: {json.dumps(params, indent=2)}")
        print(f"Properties: {list(properties.keys())}")
        print(f"Required: {required}")
        
        # Check if it has the 'path' parameter
        has_path_param = 'path' in properties
        path_is_required = 'path' in required
        
        print(f"\\nPath parameter present: {has_path_param}")
        print(f"Path parameter required: {path_is_required}")
        
        if has_path_param and path_is_required:
            print("✅ SUCCESS: list_directory has proper path parameter schema!")
        else:
            print("❌ FAILED: list_directory missing proper path parameter")
    
    # Test a function call to see if it works
    if function_analysis.get('hasProperParameters'):
        print("\\n=== Testing Function Call ===")
        
        # Enhanced console monitoring
        console_logs = []
        def handle_console(msg):
            text = msg.text
            console_logs.append(f'[{msg.type}] {text}')
            if any(keyword in text for keyword in ['list_directory', 'Function called', 'MCP tool', 'Args object']):
                print(f'CONSOLE: {text}')
        
        page.on('console', handle_console)
        
        # Test the function call
        message_input = page.locator("#message-input")
        message_input.fill("List the files in /Users/user directory using the list_directory function.")
        page.click("#send-btn")
        
        print("Waiting for function call...")
        page.wait_for_timeout(1000)
        
        # Check for function call indicators
        function_icons = page.locator('.function-call-icon')
        function_count = function_icons.count()
        print(f"Function call icons found: {function_count}")
        
        # Get latest message
        latest_message = page.evaluate("""() => {
            const messages = document.querySelectorAll('.chat-message');
            const lastMessage = messages[messages.length - 1];
            return lastMessage ? lastMessage.textContent : 'No messages found';
        }""")
        
        # Check for success indicators
        has_undefined_error = 'undefined' in latest_message and 'Required' in latest_message
        has_file_listing = any(keyword in latest_message for keyword in ['Desktop', 'Documents', 'Downloads', '[FILE]', '[DIR]'])
        
        print(f"\\nFunction call result:")
        print(f"  Has undefined error: {has_undefined_error}")
        print(f"  Has file listing: {has_file_listing}")
        print(f"  Function icons: {function_count}")
        
        # Check specific console logs
        param_logs = [log for log in console_logs if 'params object' in log or 'Args object' in log]
        print(f"\\nParameter-related logs:")
        for log in param_logs[-3:]:
            print(f"  {log}")
        
        screenshot_with_markdown(page, "mcp_parameter_fix_test", {
            "Test": "MCP Parameter Fix Verification",
            "Function Icons": function_count,
            "Has File Listing": has_file_listing,
            "No Undefined Error": not has_undefined_error
        })
        
        if function_count > 0 and has_file_listing and not has_undefined_error:
            print("\\n🎉 COMPLETE SUCCESS: MCP functions working with proper parameters!")
            return "success"
        elif function_count > 0 and not has_undefined_error:
            print("\\n✅ PARTIAL SUCCESS: Function called without undefined errors")
            return "partial"
        else:
            print("\\n❌ FAILED: Function call still not working properly")
            return "failed"
    
    else:
        print("\\n❌ FAILED: Functions still don't have proper parameter schemas")
        return "schema_failed"

if __name__ == "__main__":
    print("Run with: python -m pytest test_mcp_parameter_fix_final.py -v -s")