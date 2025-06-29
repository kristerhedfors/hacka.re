#!/usr/bin/env python3

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_debug_function_tools_status(page: Page, serve_hacka_re, api_key):
    """Debug why function tools aren't being called by checking their status"""
    
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
    
    print("=== Checking Function Tools Status ===")
    
    # Check function tools status
    status_check = page.evaluate("""() => {
        console.log('=== FUNCTION TOOLS STATUS CHECK ===');
        
        let status = {
            functionToolsService: false,
            functionToolsEnabled: false,
            enabledFunctionCount: 0,
            totalFunctionCount: 0,
            functionDefinitionCount: 0,
            mcpFunctionCount: 0,
            settingsToggleExists: false,
            settingsToggleEnabled: false
        };
        
        // Check Function Tools Service
        if (window.FunctionToolsService) {
            status.functionToolsService = true;
            
            try {
                status.functionToolsEnabled = window.FunctionToolsService.isFunctionToolsEnabled();
                
                const allFunctions = window.FunctionToolsService.getJsFunctions();
                status.totalFunctionCount = Object.keys(allFunctions).length;
                
                const enabledFunctions = window.FunctionToolsService.getEnabledJsFunctions ? 
                    window.FunctionToolsService.getEnabledJsFunctions() : [];
                status.enabledFunctionCount = enabledFunctions.length;
                
                // Count MCP functions
                const mcpFunctions = Object.values(allFunctions).filter(f => 
                    f.collectionId === 'mcp_tools_collection' || 
                    (f.code && f.code.includes('MCPClient'))
                );
                status.mcpFunctionCount = mcpFunctions.length;
                
                console.log('Function Tools enabled:', status.functionToolsEnabled);
                console.log('Total functions:', status.totalFunctionCount);
                console.log('Enabled functions:', status.enabledFunctionCount);
                console.log('MCP functions:', status.mcpFunctionCount);
                
            } catch (error) {
                console.error('Error checking function tools:', error);
            }
        }
        
        // Check function calling manager
        if (window.functionCallingManager) {
            try {
                const definitions = window.functionCallingManager.getFunctionDefinitions();
                status.functionDefinitionCount = definitions.length;
                console.log('Function definitions for LLM:', definitions.length);
            } catch (error) {
                console.error('Error getting function definitions:', error);
            }
        }
        
        // Check for function tools toggle in settings
        const functionToggle = document.querySelector('#function-tools-toggle');
        if (functionToggle) {
            status.settingsToggleExists = true;
            status.settingsToggleEnabled = functionToggle.checked;
            console.log('Function tools toggle found, enabled:', status.settingsToggleEnabled);
        } else {
            console.log('Function tools toggle not found in DOM');
        }
        
        return status;
    }""")
    
    print(f"\\n=== FUNCTION TOOLS STATUS ===")
    print(f"FunctionToolsService available: {status_check['functionToolsService']}")
    print(f"Function Tools enabled: {status_check['functionToolsEnabled']}")
    print(f"Total functions: {status_check['totalFunctionCount']}")
    print(f"Enabled functions: {status_check['enabledFunctionCount']}")
    print(f"MCP functions: {status_check['mcpFunctionCount']}")
    print(f"Function definitions for LLM: {status_check['functionDefinitionCount']}")
    print(f"Settings toggle exists: {status_check['settingsToggleExists']}")
    print(f"Settings toggle enabled: {status_check['settingsToggleEnabled']}")
    
    # If function tools aren't enabled, try to enable them
    if not status_check['functionToolsEnabled']:
        print("\\n=== ENABLING FUNCTION TOOLS ===")
        
        # Open settings to enable function tools
        page.click("#settings-btn")
        page.wait_for_selector("#settings-modal.active", state="visible")
        
        # Look for function tools toggle
        try:
            toggle = page.locator("#function-tools-toggle")
            if toggle.is_visible():
                print("Found function tools toggle, enabling...")
                toggle.check()
                page.wait_for_timeout(1000)
                
                # Save settings
                page.click("#save-settings-btn")
                page.wait_for_timeout(2000)
                
                print("Function tools enabled via settings")
            else:
                print("Function tools toggle not visible")
        except Exception as e:
            print(f"Could not find/enable function tools toggle: {e}")
        
        page.keyboard.press("Escape")
        page.wait_for_selector("#settings-modal", state="hidden")
        
        # Recheck status after enabling
        updated_status = page.evaluate("""() => {
            return {
                enabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false,
                definitionCount: window.functionCallingManager ? window.functionCallingManager.getFunctionDefinitions().length : 0
            };
        }""")
        
        print(f"\\nAfter enabling attempt:")
        print(f"Function Tools enabled: {updated_status['enabled']}")
        print(f"Function definitions: {updated_status['definitionCount']}")
        
        if updated_status['enabled'] and updated_status['definitionCount'] > 0:
            print("\\n✅ SUCCESS: Function tools are now enabled and available!")
            return "enabled"
        else:
            print("\\n❌ FAILED: Could not enable function tools")
            return "failed_to_enable"
    
    elif status_check['functionDefinitionCount'] == 0:
        print("\\n❌ ISSUE: Function tools enabled but no definitions available to LLM")
        return "no_definitions"
    
    else:
        print("\\n✅ Function tools appear to be properly enabled")
        return "already_enabled"

if __name__ == "__main__":
    print("Run with: python -m pytest debug_function_tools_status.py -v -s")