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

def test_inspect_function_definitions(page: Page, serve_hacka_re, api_key):
    """Inspect what function definitions are actually being sent to the LLM"""
    
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
    
    print("=== Inspecting Function Definitions ===")
    
    # Get the actual function definitions that will be sent to the LLM
    definitions_analysis = page.evaluate("""() => {
        console.log('=== FUNCTION DEFINITIONS INSPECTION ===');
        
        let analysis = {
            functionCallingManager: false,
            mcpToolDefinitions: [],
            userDefinedToolDefinitions: [],
            combinedDefinitions: [],
            functionToolsService: false,
            jsFunctions: {},
            mcpFunctions: []
        };
        
        // Check Function Calling Manager
        if (window.functionCallingManager) {
            analysis.functionCallingManager = true;
            
            try {
                // Get the actual function definitions that would be sent to LLM
                const definitions = window.functionCallingManager.getFunctionDefinitions();
                analysis.combinedDefinitions = definitions;
                console.log('Combined function definitions for LLM:', definitions);
                
                // Try to get MCP-specific definitions
                if (window.functionCallingManager.getMCPToolDefinitions) {
                    analysis.mcpToolDefinitions = window.functionCallingManager.getMCPToolDefinitions();
                }
                
                // Try to get user-defined definitions
                if (window.FunctionToolsService && window.FunctionToolsService.getEnabledToolDefinitions) {
                    analysis.userDefinedToolDefinitions = window.FunctionToolsService.getEnabledToolDefinitions();
                }
            } catch (error) {
                console.error('Error getting function definitions:', error);
                analysis.error = error.message;
            }
        }
        
        // Check Function Tools Service
        if (window.FunctionToolsService) {
            analysis.functionToolsService = true;
            
            try {
                const jsFunctions = window.FunctionToolsService.getJsFunctions();
                analysis.jsFunctions = {};
                
                for (const [name, func] of Object.entries(jsFunctions)) {
                    if (name.includes('list_directory') || name.includes('read_file')) {
                        analysis.jsFunctions[name] = {
                            toString: func.toString(),
                            length: func.length,
                            name: func.name
                        };
                    }
                }
                
                // Get MCP functions specifically
                const mcpFunctionNames = Object.keys(jsFunctions).filter(name => 
                    name.includes('directory') || name.includes('file')
                );
                analysis.mcpFunctions = mcpFunctionNames;
                
            } catch (error) {
                console.error('Error getting JS functions:', error);
            }
        }
        
        // Check MCP Tool Registry
        if (window.MCPToolRegistry) {
            try {
                const tools = window.MCPToolRegistry.getAllTools();
                analysis.mcpRegistryTools = Object.keys(tools);
                
                // Get specific tool info for list_directory
                const serverTools = tools['mcp-server'] || [];
                const listDirTool = serverTools.find(tool => tool.name === 'list_directory');
                if (listDirTool) {
                    analysis.listDirectoryTool = {
                        name: listDirTool.name,
                        description: listDirTool.description,
                        inputSchema: listDirTool.inputSchema
                    };
                }
            } catch (error) {
                console.error('Error getting MCP registry tools:', error);
            }
        }
        
        return analysis;
    }""")
    
    print("\\n=== ANALYSIS RESULTS ===")
    print(f"Function Calling Manager available: {definitions_analysis.get('functionCallingManager')}")
    print(f"Function Tools Service available: {definitions_analysis.get('functionToolsService')}")
    print(f"MCP functions found: {len(definitions_analysis.get('mcpFunctions', []))}")
    print(f"Combined definitions count: {len(definitions_analysis.get('combinedDefinitions', []))}")
    
    # Print the actual combined definitions that go to the LLM
    combined_defs = definitions_analysis.get('combinedDefinitions', [])
    print(f"\\n=== FUNCTION DEFINITIONS SENT TO LLM ({len(combined_defs)} total) ===")
    
    list_dir_def = None
    for i, definition in enumerate(combined_defs):
        func_info = definition.get('function', {})
        func_name = func_info.get('name', 'unknown')
        print(f"{i+1}. {func_name}")
        
        if 'list_directory' in func_name:
            list_dir_def = definition
            print(f"   📁 Found list_directory definition!")
    
    # Detailed analysis of list_directory if found
    if list_dir_def:
        print(f"\\n=== LIST_DIRECTORY FUNCTION DEFINITION ===")
        print(json.dumps(list_dir_def, indent=2))
    else:
        print(f"\\n❌ NO LIST_DIRECTORY DEFINITION FOUND IN LLM FUNCTIONS")
        print("Available function names:")
        for definition in combined_defs:
            func_info = definition.get('function', {})
            print(f"  - {func_info.get('name', 'unknown')}")
    
    # Check if we have JS function but not LLM definition
    js_functions = definitions_analysis.get('jsFunctions', {})
    if 'list_directory' in js_functions:
        print(f"\\n=== JS FUNCTION (list_directory) ===")
        js_func = js_functions['list_directory']
        print(f"Function string: {js_func.get('toString', 'N/A')[:200]}...")
        print(f"Function length: {js_func.get('length')}")
        print(f"Function name: {js_func.get('name')}")
    
    # Check MCP registry tool
    list_dir_tool = definitions_analysis.get('listDirectoryTool')
    if list_dir_tool:
        print(f"\\n=== MCP REGISTRY TOOL (list_directory) ===")
        print(json.dumps(list_dir_tool, indent=2))
    
    screenshot_with_markdown(page, "function_definitions_inspection", {
        "Test": "Function Definitions Inspection",
        "LLM Definitions": len(combined_defs),
        "MCP Functions": len(definitions_analysis.get('mcpFunctions', [])),
        "Has list_directory": list_dir_def is not None
    })
    
    print(f"\\n=== DIAGNOSIS ===")
    if list_dir_def:
        print("✅ list_directory function definition found in LLM functions")
        print("🔍 Issue must be elsewhere (parameter handling, execution, etc.)")
    else:
        print("❌ list_directory function definition NOT found in LLM functions")
        print("🎯 ROOT CAUSE: MCP functions not being converted to LLM function definitions")
        print("💡 SOLUTION: Fix the conversion from MCP tools to LLM function definitions")
    
    return definitions_analysis

if __name__ == "__main__":
    print("Run with: python -m pytest debug_function_definition_inspection.py -v -s")