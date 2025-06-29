#!/usr/bin/env python3

import pytest
import json
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, dismiss_settings_modal

@pytest.fixture(scope="function") 
def api_key():
    """Provide API key from environment"""
    import os
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv("OPENAI_API_KEY")

def test_inspect_function_storage(page: Page, serve_hacka_re, api_key):
    """Inspect how MCP functions are stored and whether they have toolDefinition"""
    
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
    
    print("=== Inspecting Function Storage ===")
    
    # Detailed storage inspection
    storage_analysis = page.evaluate("""() => {
        console.log('=== FUNCTION STORAGE INSPECTION ===');
        
        let analysis = {
            functionsService: false,
            registry: false,
            storage: false,
            jsFunctions: {},
            enabledFunctions: [],
            toolDefinitions: {},
            mcpFunctionsInStorage: []
        };
        
        // Check Function Tools Service
        if (window.FunctionToolsService) {
            analysis.functionsService = true;
            
            try {
                const jsFunctions = window.FunctionToolsService.getJsFunctions();
                analysis.jsFunctions = {};
                
                // Analyze each function
                for (const [name, func] of Object.entries(jsFunctions)) {
                    if (name.includes('list_directory') || name.includes('read_file')) {
                        analysis.jsFunctions[name] = {
                            hasFunction: !!func,
                            hasToolDefinition: !!func.toolDefinition,
                            collectionId: func.collectionId || 'none',
                            toolDefinition: func.toolDefinition || null,
                            functionProperties: Object.keys(func)
                        };
                        
                        if (func.collectionId && func.collectionId.includes('mcp')) {
                            analysis.mcpFunctionsInStorage.push(name);
                        }
                        
                        console.log(`Function "${name}":`, {
                            hasToolDefinition: !!func.toolDefinition,
                            collectionId: func.collectionId,
                            properties: Object.keys(func)
                        });
                    }
                }
            } catch (error) {
                console.error('Error inspecting functions:', error);
                analysis.error = error.message;
            }
        }
        
        // Check Registry
        if (window.FunctionToolsRegistry) {
            analysis.registry = true;
            
            try {
                const enabledFunctions = window.FunctionToolsRegistry.getEnabledFunctions ? 
                    window.FunctionToolsRegistry.getEnabledFunctions() : [];
                analysis.enabledFunctions = enabledFunctions;
                
                const toolDefinitions = window.FunctionToolsRegistry.getEnabledToolDefinitions ? 
                    window.FunctionToolsRegistry.getEnabledToolDefinitions() : [];
                analysis.toolDefinitions = toolDefinitions.map(def => ({
                    name: def.function?.name,
                    hasParameters: !!def.function?.parameters,
                    parameterCount: Object.keys(def.function?.parameters?.properties || {}).length,
                    parameters: def.function?.parameters
                }));
                
                console.log('Enabled functions:', enabledFunctions);
                console.log('Tool definitions count:', toolDefinitions.length);
                
            } catch (error) {
                console.error('Error getting registry data:', error);
            }
        }
        
        // Check Storage directly
        if (window.FunctionToolsStorage) {
            analysis.storage = true;
            
            try {
                const allFunctions = window.FunctionToolsStorage.getJsFunctions();
                const enabled = window.FunctionToolsStorage.getEnabledFunctions();
                
                console.log('Storage - All functions:', Object.keys(allFunctions));
                console.log('Storage - Enabled functions:', enabled);
                
                // Check if list_directory exists and what it contains
                if (allFunctions['list_directory']) {
                    const listDirFunc = allFunctions['list_directory'];
                    console.log('Storage - list_directory function:', {
                        keys: Object.keys(listDirFunc),
                        hasToolDefinition: !!listDirFunc.toolDefinition,
                        toolDefinition: listDirFunc.toolDefinition
                    });
                }
                
            } catch (error) {
                console.error('Error accessing storage:', error);
            }
        }
        
        return analysis;
    }""")
    
    print("\\n=== STORAGE ANALYSIS RESULTS ===")
    print(f"Functions Service available: {storage_analysis.get('functionsService')}")
    print(f"Registry available: {storage_analysis.get('registry')}")
    print(f"Storage available: {storage_analysis.get('storage')}")
    print(f"MCP functions in storage: {len(storage_analysis.get('mcpFunctionsInStorage', []))}")
    print(f"Enabled functions: {len(storage_analysis.get('enabledFunctions', []))}")
    print(f"Tool definitions: {len(storage_analysis.get('toolDefinitions', []))}")
    
    # Detailed analysis of functions
    js_functions = storage_analysis.get('jsFunctions', {})
    print(f"\\n=== FUNCTION DETAILS ===")
    for name, details in js_functions.items():
        print(f"Function: {name}")
        print(f"  Has tool definition: {details.get('hasToolDefinition')}")
        print(f"  Collection ID: {details.get('collectionId')}")
        print(f"  Properties: {details.get('functionProperties', [])}")
        
        tool_def = details.get('toolDefinition')
        if tool_def:
            params = tool_def.get('function', {}).get('parameters', {})
            param_props = params.get('properties', {})
            print(f"  Tool definition parameters: {list(param_props.keys())}")
        else:
            print(f"  ❌ NO TOOL DEFINITION")
    
    # Tool definitions analysis
    tool_defs = storage_analysis.get('toolDefinitions', [])
    print(f"\\n=== TOOL DEFINITIONS ===")
    for i, tool_def in enumerate(tool_defs):
        name = tool_def.get('name')
        param_count = tool_def.get('parameterCount', 0)
        print(f"{i+1}. {name} - {param_count} parameters")
        
        if name == 'list_directory':
            params = tool_def.get('parameters', {})
            print(f"   list_directory parameters: {json.dumps(params, indent=4)}")
    
    print(f"\\n=== DIAGNOSIS ===")
    
    list_dir_in_js = 'list_directory' in js_functions
    list_dir_has_tool_def = list_dir_in_js and js_functions.get('list_directory', {}).get('hasToolDefinition', False)
    list_dir_in_tool_defs = any(td.get('name') == 'list_directory' for td in tool_defs)
    
    print(f"list_directory in JS functions: {list_dir_in_js}")
    print(f"list_directory has tool definition: {list_dir_has_tool_def}")  
    print(f"list_directory in tool definitions: {list_dir_in_tool_defs}")
    
    if list_dir_in_js and not list_dir_has_tool_def:
        print("❌ ROOT CAUSE: MCP functions are being stored without toolDefinition property")
        print("💡 SOLUTION: Fix the MCP function registration to include proper toolDefinition")
    elif list_dir_has_tool_def and not list_dir_in_tool_defs:
        print("❌ ROOT CAUSE: Tool definition exists but not being returned by getEnabledToolDefinitions")
        print("💡 SOLUTION: Debug the filtering logic in getEnabledToolDefinitions")
    elif list_dir_in_tool_defs:
        print("✅ Function and tool definition exist - issue must be elsewhere")
    else:
        print("❌ ROOT CAUSE: Function not properly registered at all")
    
    return storage_analysis

if __name__ == "__main__":
    print("Run with: python -m pytest debug_function_storage_inspection.py -v -s")