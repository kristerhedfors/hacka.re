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

def test_debug_mcp_function_detection(page: Page, serve_hacka_re, api_key):
    """Debug why MCP function detection is failing"""
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Enable Function Tools
    print("=== Enabling Function Tools ===")
    page.evaluate("""() => {
        if (window.FunctionToolsService) {
            window.FunctionToolsService.setFunctionToolsEnabled(true);
        }
    }""")
    
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
    
    # Debug MCP function detection
    print("\n=== Debugging MCP Function Detection ===")
    
    detection_debug = page.evaluate("""() => {
        console.log('=== MCP FUNCTION DETECTION DEBUG ===');
        
        let debugInfo = {
            jsFunctions: {},
            defaultFunctions: {},
            detectionResults: {}
        };
        
        // Get JS functions from storage
        if (window.FunctionToolsStorage) {
            try {
                const jsFunctions = window.FunctionToolsStorage.getJsFunctions();
                debugInfo.jsFunctions = jsFunctions;
                console.log('JS Functions from storage:', Object.keys(jsFunctions));
                
                // Check list_directory specifically
                if (jsFunctions['list_directory']) {
                    const listDirFunc = jsFunctions['list_directory'];
                    console.log('list_directory function data:', {
                        name: listDirFunc.name,
                        collectionId: listDirFunc.collectionId,
                        hasCode: !!listDirFunc.code,
                        codeLength: listDirFunc.code ? listDirFunc.code.length : 0,
                        allProperties: Object.keys(listDirFunc)
                    });
                    
                    debugInfo.detectionResults.listDirectory = {
                        collectionId: listDirFunc.collectionId,
                        isMcp: listDirFunc.collectionId === 'mcp_tools_collection',
                        properties: Object.keys(listDirFunc)
                    };
                }
            } catch (error) {
                console.error('Error getting JS functions:', error);
                debugInfo.jsFunctions = {error: error.message};
            }
        }
        
        // Check default functions
        if (window.DefaultFunctionsService) {
            try {
                const defaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                debugInfo.defaultFunctions = Object.keys(defaultFunctions);
                console.log('Default functions:', Object.keys(defaultFunctions));
                
                if (defaultFunctions['list_directory']) {
                    const defaultListDir = defaultFunctions['list_directory'];
                    console.log('list_directory in default functions:', {
                        collectionId: defaultListDir.collectionId,
                        hasCode: !!defaultListDir.code
                    });
                }
            } catch (error) {
                console.error('Error getting default functions:', error);
                debugInfo.defaultFunctions = {error: error.message};
            }
        }
        
        // Test the detection logic directly
        if (window.FunctionToolsStorage) {
            try {
                const jsFunctions = window.FunctionToolsStorage.getJsFunctions();
                let functionData = jsFunctions['list_directory'] || null;
                
                // Check default functions if not found
                if (!functionData && window.DefaultFunctionsService) {
                    const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                    functionData = enabledDefaultFunctions['list_directory'] || null;
                }
                
                console.log('Function data for detection:', functionData);
                
                if (functionData) {
                    const isMcpFunction = functionData && functionData.collectionId === 'mcp_tools_collection';
                    console.log('MCP detection result:', {
                        hasFunctionData: !!functionData,
                        collectionId: functionData.collectionId,
                        isMcpFunction: isMcpFunction,
                        detectionCondition: 'functionData && functionData.collectionId === "mcp_tools_collection"'
                    });
                    
                    debugInfo.detectionResults.finalTest = {
                        isMcpFunction: isMcpFunction,
                        collectionId: functionData.collectionId
                    };
                }
            } catch (error) {
                console.error('Error in detection test:', error);
                debugInfo.detectionResults.finalTest = {error: error.message};
            }
        }
        
        return debugInfo;
    }""")
    
    print(f"JS Functions count: {len(detection_debug.get('jsFunctions', {}))}")
    if isinstance(detection_debug.get('jsFunctions'), dict) and 'error' not in detection_debug['jsFunctions']:
        print(f"JS Function names: {list(detection_debug['jsFunctions'].keys())}")
    
    print(f"Default Functions count: {len(detection_debug.get('defaultFunctions', []))}")
    
    detection_results = detection_debug.get('detectionResults', {})
    print(f"\n=== DETECTION RESULTS ===")
    
    if 'listDirectory' in detection_results:
        list_dir = detection_results['listDirectory']
        print(f"list_directory collectionId: {list_dir.get('collectionId')}")
        print(f"list_directory is MCP: {list_dir.get('isMcp')}")
        print(f"list_directory properties: {list_dir.get('properties')}")
    
    if 'finalTest' in detection_results:
        final_test = detection_results['finalTest']
        print(f"Final MCP detection: {final_test.get('isMcpFunction')}")
        print(f"Final collectionId: {final_test.get('collectionId')}")
    
    # Test what the function executor would see (both old and new logic)
    print(f"\n=== FUNCTION EXECUTOR TEST ===")
    executor_test = page.evaluate("""() => {
        if (!window.FunctionToolsStorage) return {error: 'FunctionToolsStorage not available'};
        
        const jsFunctions = window.FunctionToolsStorage.getJsFunctions();
        let functionCode = jsFunctions['list_directory'] ? jsFunctions['list_directory'].code : null;
        let functionData = jsFunctions['list_directory'] || null;
        
        // If not found in user-defined functions, check default functions
        if (!functionCode && window.DefaultFunctionsService) {
            const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
            functionCode = enabledDefaultFunctions['list_directory'] ? enabledDefaultFunctions['list_directory'].code : null;
            functionData = enabledDefaultFunctions['list_directory'] || null;
        }
        
        // OLD detection logic (looking for collectionId in function data)
        const oldIsMcpFunction = functionData && functionData.collectionId === 'mcp_tools_collection';
        
        // NEW detection logic (looking up collection ID separately)
        let newIsMcpFunction = false;
        let actualCollectionId = null;
        if (functionData && window.FunctionToolsStorage.getFunctionCollections) {
            try {
                const functionCollections = window.FunctionToolsStorage.getFunctionCollections();
                actualCollectionId = functionCollections['list_directory'];
                newIsMcpFunction = actualCollectionId === 'mcp_tools_collection';
                console.log('Function collections:', functionCollections);
                console.log('list_directory collection ID:', actualCollectionId);
            } catch (error) {
                console.error('Error checking function collections:', error);
            }
        }
        
        return {
            hasFunctionCode: !!functionCode,
            hasFunctionData: !!functionData,
            oldCollectionId: functionData ? functionData.collectionId : null,
            newCollectionId: actualCollectionId,
            oldIsMcpFunction: oldIsMcpFunction,
            newIsMcpFunction: newIsMcpFunction,
            functionDataKeys: functionData ? Object.keys(functionData) : []
        };
    }""")
    
    print(f"Function executor would see:")
    print(f"  Has function code: {executor_test.get('hasFunctionCode')}")
    print(f"  Has function data: {executor_test.get('hasFunctionData')}")
    print(f"  OLD Collection ID (from function data): {executor_test.get('oldCollectionId')}")
    print(f"  NEW Collection ID (from collections): {executor_test.get('newCollectionId')}")
    print(f"  OLD Is MCP function: {executor_test.get('oldIsMcpFunction')}")
    print(f"  NEW Is MCP function: {executor_test.get('newIsMcpFunction')}")
    print(f"  Function data keys: {executor_test.get('functionDataKeys')}")
    
    if executor_test.get('newIsMcpFunction'):
        print("\n✅ NEW MCP function detection WORKING")
        return "detection_working"
    elif executor_test.get('oldIsMcpFunction'):
        print("\n⚠️ OLD MCP function detection working but NEW failing")
        return "old_working_new_failing"
    else:
        print("\n❌ BOTH MCP function detection methods FAILING")
        expected_collection = 'mcp_tools_collection'
        old_collection = executor_test.get('oldCollectionId')
        new_collection = executor_test.get('newCollectionId')
        print(f"Expected collectionId: '{expected_collection}'")
        print(f"OLD collectionId: '{old_collection}'")
        print(f"NEW collectionId: '{new_collection}'")
        return "detection_failing"

if __name__ == "__main__":
    print("Run with: python -m pytest debug_tests/mcp_debugging/debug_mcp_function_detection.py -v -s")