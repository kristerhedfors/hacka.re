#!/usr/bin/env python3
"""
Debug Shodan Function Calls After MCP Connection

Tests why Shodan function calls fail after successful MCP connection.
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_shodan_function_calls_after_connection(page: Page, serve_hacka_re):
    """Test Shodan function calls after MCP connection"""
    
    # Navigate and setup  
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Capture console messages
    console_messages = []
    def handle_console(msg):
        console_messages.append(f"[{msg.type}] {msg.text}")
        if any(keyword in msg.text for keyword in ['shodan', 'MCP', 'executeServiceTool', 'connected', 'hasValidCredentials']):
            print(f"RELEVANT: [{msg.type}] {msg.text}")
    page.on('console', handle_console)
    
    print("=== STEP 1: Connect Shodan via MCP UI ===")
    
    # Open MCP modal 
    page.click("#mcp-servers-btn")
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Find and click Shodan connect button
    shodan_connect = page.locator('[data-service="shodan"] .connect-btn')
    expect(shodan_connect).to_be_visible()
    shodan_connect.click()
    
    # Wait for API key modal
    page.wait_for_selector('#service-apikey-input-modal', timeout=5000)
    
    # Enter test API key
    test_api_key = "test_api_key_12345"
    api_key_input = page.locator('#apikey-input')
    api_key_input.fill(test_api_key)
    
    # Now the UI should work with test keys - click connect
    print("Testing UI connection with test key (should work now)...")
    modal_connect_btn = page.locator('#apikey-connect-btn')
    modal_connect_btn.click()
    
    # Wait for connection attempt and modal to close
    try:
        page.wait_for_selector('#service-apikey-input-modal', state='hidden', timeout=5000)
        print("✅ UI connection succeeded - modal closed")
    except:
        print("❌ UI connection may have failed - modal still open")
        # Try to close modal manually
        page.keyboard.press("Escape")
        time.sleep(1)
    
    print("=== STEP 2: Check connection state after UI flow ===")
    
    # Check connection state
    connection_state = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager.getConnector('shodan');
            return {
                hasConnector: !!connector,
                connection: connector ? connector.connection : null,
                hasValidCredentials: connector ? connector.hasValidCredentials() : false,
                isConnected: connector ? connector.isConnected() : false
            };
        }
    """)
    
    print(f"Connection state after UI: {connection_state}")
    
    print("=== STEP 3: Test function availability ===")
    
    # Check if Shodan functions are available
    functions_available = page.evaluate("""
        () => {
            const functions = {};
            const shodanFunctions = [
                'shodan_host_info',
                'shodan_search', 
                'shodan_dns_resolve',
                'shodan_account_profile'
            ];
            
            for (const funcName of shodanFunctions) {
                functions[funcName] = {
                    exists: typeof window[funcName] === 'function',
                    type: typeof window[funcName]
                };
            }
            
            return functions;
        }
    """)
    
    print(f"Function availability: {functions_available}")
    
    print("=== STEP 4: Test direct function call ===")
    
    # Try to call a Shodan function directly
    if functions_available.get('shodan_host_info', {}).get('exists'):
        print("Testing direct function call...")
        
        function_result = page.evaluate("""
            async () => {
                try {
                    console.log('[TEST] Calling shodan_host_info directly...');
                    const result = await window.shodan_host_info('8.8.8.8');
                    console.log('[TEST] Function result:', result);
                    return { success: true, result: result };
                } catch (error) {
                    console.log('[TEST] Function error:', error.message);
                    return { success: false, error: error.message };
                }
            }
        """)
        
        print(f"Direct function call result: {function_result}")
        
        if not function_result['success']:
            print(f"❌ Function call failed: {function_result['error']}")
    else:
        print("❌ shodan_host_info function not available")
    
    print("=== STEP 5: Test executeServiceTool flow ===")
    
    # Test the mcpServiceManager.executeServiceTool flow directly
    service_tool_result = page.evaluate("""
        async () => {
            try {
                console.log('[TEST] Testing executeServiceTool flow...');
                const result = await window.mcpServiceManager.executeServiceTool('shodan', 'host_info', { ip: '8.8.8.8' });
                console.log('[TEST] executeServiceTool result:', result);
                return { success: true, result: result };
            } catch (error) {
                console.log('[TEST] executeServiceTool error:', error.message);
                return { success: false, error: error.message };
            }
        }
    """)
    
    print(f"executeServiceTool result: {service_tool_result}")
    
    print("=== STEP 6: Debug connection validation ===")
    
    # Deep dive into why connection validation fails
    validation_debug = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager.getConnector('shodan');
            if (!connector) return { error: 'No connector' };
            
            const debug = {
                connection: connector.connection,
                hasConnection: !!connector.connection,
                hasValidCredentials: false,
                isConnected: false
            };
            
            if (connector.connection) {
                // Call hasValidCredentials and capture its logic
                debug.hasValidCredentials = connector.hasValidCredentials();
                debug.isConnected = connector.isConnected();
                
                // Check the actual validation logic
                if (connector.connection.apiKey) {
                    debug.apiKeyType = typeof connector.connection.apiKey;
                    debug.apiKeyValue = connector.connection.apiKey;
                    debug.apiKeyLength = connector.connection.apiKey.length;
                    debug.validationCheck = !!(connector.connection.apiKey && connector.connection.apiKey.length > 0);
                }
            }
            
            return debug;
        }
    """)
    
    print(f"Validation debug: {validation_debug}")
    
    screenshot_with_markdown(page, "shodan_function_calls_debug", {
        "Connection State": "After UI connection attempt",
        "Functions Available": str(len([f for f in functions_available.values() if f.get('exists')])),
        "Direct Call Success": str(function_result.get('success', False)) if 'function_result' in locals() else 'N/A',
        "Service Tool Success": str(service_tool_result.get('success', False)),
        "Is Connected": str(validation_debug.get('isConnected', False))
    })
    
    # Close any open modals
    try:
        page.keyboard.press("Escape")
        time.sleep(0.5)
    except:
        pass
    
    # Print relevant console messages
    print("\n=== RELEVANT CONSOLE MESSAGES ===")
    for msg in console_messages:
        if any(keyword in msg for keyword in ['shodan', 'MCP', 'executeServiceTool', 'connected', 'hasValidCredentials', 'TEST']):
            print(msg)
    
    return True


if __name__ == "__main__":
    import subprocess
    import sys
    
    # Start server
    server = subprocess.Popen(['python', '-m', 'http.server', '8000'], 
                            cwd='/Users/user/dev/hacka.re',
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    time.sleep(2)
    
    try:
        pytest.main([__file__, '-v', '-s'])
    finally:
        server.terminate()
        server.wait()