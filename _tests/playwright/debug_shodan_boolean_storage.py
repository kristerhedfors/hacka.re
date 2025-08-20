#!/usr/bin/env python3
"""
Debug Shodan Boolean Storage Issue

This test specifically focuses on debugging why the API key is being stored as boolean `true`
instead of the actual API key string.
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_shodan_boolean_storage_debug(page: Page, serve_hacka_re):
    """Debug the Shodan API key boolean storage issue step by step"""
    
    # Navigate and setup  
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Capture all console messages for debugging
    console_messages = []
    def handle_console(msg):
        console_messages.append(f"[{msg.type}] {msg.text}")
        print(f"CONSOLE: [{msg.type}] {msg.text}")
    page.on('console', handle_console)
    
    print("=== STEP 1: Check initial state ===")
    
    # Check if mcpServiceManager exists
    manager_exists = page.evaluate("() => !!window.mcpServiceManager")
    print(f"mcpServiceManager exists: {manager_exists}")
    assert manager_exists, "mcpServiceManager should be available"
    
    # Get Shodan connector
    shodan_available = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager.getConnector('shodan');
            return {
                exists: !!connector,
                className: connector ? connector.constructor.name : null,
                connection: connector ? connector.connection : null
            };
        }
    """)
    
    print(f"Shodan connector: {shodan_available}")
    assert shodan_available['exists'], "Shodan connector should exist"
    
    print("=== STEP 2: Test createConnection with debug API key ===")
    
    # Test API key that should be stored as string
    test_api_key = "test_debug_api_key_12345"
    print(f"Using test API key: {test_api_key}")
    
    # Call createConnection and monitor what happens
    connection_result = page.evaluate(f"""
        async () => {{
            const connector = window.mcpServiceManager.getConnector('shodan');
            console.log('[DEBUG] Starting createConnection with:', '{test_api_key}');
            
            try {{
                await connector.createConnection('{test_api_key}');
                
                const result = {{
                    success: true,
                    connection: connector.connection,
                    connectionKeys: connector.connection ? Object.keys(connector.connection) : [],
                    apiKeyType: connector.connection ? typeof connector.connection.apiKey : 'undefined',
                    apiKeyValue: connector.connection ? connector.connection.apiKey : null,
                    hasValidCredentials: connector.hasValidCredentials(),
                    isConnected: connector.isConnected()
                }};
                
                console.log('[DEBUG] createConnection result:', result);
                return result;
            }} catch (error) {{
                console.log('[DEBUG] createConnection error:', error);
                return {{
                    success: false,
                    error: error.message
                }};
            }}
        }}
    """)
    
    print(f"Connection result: {connection_result}")
    
    screenshot_with_markdown(page, "shodan_connection_debug", {
        "Status": "Connection attempt completed",
        "API Key Type": str(connection_result.get('apiKeyType', 'Unknown')),
        "API Key Value": str(connection_result.get('apiKeyValue', 'None')),
        "Has Valid Credentials": str(connection_result.get('hasValidCredentials', False)),
        "Is Connected": str(connection_result.get('isConnected', False))
    })
    
    # The key issue: check if apiKey is stored as boolean
    if connection_result['success']:
        api_key_type = connection_result['apiKeyType']
        api_key_value = connection_result['apiKeyValue']
        
        print(f"API Key stored as: {api_key_type}")
        print(f"API Key value: {api_key_value}")
        
        # This is the bug - it should be string, not boolean
        if api_key_type == 'boolean':
            print("❌ BUG CONFIRMED: API key stored as boolean instead of string!")
            print(f"Expected: string '{test_api_key}'")
            print(f"Actual: {api_key_type} {api_key_value}")
        elif api_key_type == 'string' and api_key_value == test_api_key:
            print("✅ API key stored correctly as string")
        else:
            print(f"⚠️  Unexpected API key storage: {api_key_type} {api_key_value}")
    
    print("=== STEP 3: Check storage layer ===")
    
    # Check what's actually stored in the storage layer
    storage_check = page.evaluate("""
        async () => {
            const storageService = window.CoreStorageService;
            if (!storageService) return { error: 'CoreStorageService not available' };
            
            try {
                const connectionKey = 'mcp_shodan_connection';
                const storedConnection = await storageService.getValue(connectionKey);
                
                return {
                    storageKey: connectionKey,
                    stored: storedConnection,
                    storedType: typeof storedConnection,
                    storedApiKeyType: storedConnection && storedConnection.apiKey ? typeof storedConnection.apiKey : 'undefined',
                    storedApiKeyValue: storedConnection && storedConnection.apiKey ? storedConnection.apiKey : null
                };
            } catch (error) {
                return { error: error.message };
            }
        }
    """)
    
    print(f"Storage layer check: {storage_check}")
    
    print("=== STEP 4: Test credential validation ===")
    
    # Test the credential validation that's failing
    validation_check = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager.getConnector('shodan');
            if (!connector.connection) return { error: 'No connection' };
            
            const apiKey = connector.connection.apiKey;
            const validation = {
                apiKey: apiKey,
                apiKeyType: typeof apiKey,
                apiKeyLength: apiKey ? apiKey.length : 'undefined',
                hasLengthMethod: apiKey && typeof apiKey.length !== 'undefined',
                lengthGreaterThanZero: apiKey && apiKey.length > 0,
                hasValidCredentials: connector.hasValidCredentials(),
                isConnected: connector.isConnected()
            };
            
            console.log('[DEBUG] Validation details:', validation);
            return validation;
        }
    """)
    
    print(f"Validation check: {validation_check}")
    
    # Try to trace where the boolean conversion happens
    if validation_check.get('apiKeyType') == 'boolean':
        print("=== STEP 5: Boolean conversion analysis ===")
        print("The API key is being converted to boolean somewhere in the flow:")
        print("1. createConnection() receives string")
        print("2. storeConnection() should store string")  
        print("3. But connection.apiKey ends up as boolean")
        print("")
        print("This suggests the issue is in the storage/retrieval process")
        print("or in how the connection object is being constructed.")
    
    # Print all console messages for analysis
    print("\n=== CONSOLE MESSAGES ===")
    for msg in console_messages:
        print(msg)
    
    # The test should fail if API key is stored as boolean
    if connection_result.get('success') and connection_result.get('apiKeyType') == 'boolean':
        raise AssertionError(f"API key stored as boolean {connection_result['apiKeyValue']} instead of string '{test_api_key}'")
    
    return True


if __name__ == "__main__":
    # Run the test manually for debugging
    import subprocess
    import sys
    
    # Start server
    server = subprocess.Popen(['python', '-m', 'http.server', '8000'], 
                            cwd='/Users/user/dev/hacka.re',
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    time.sleep(2)
    
    try:
        # Run the test
        pytest.main([__file__, '-v', '-s'])
    finally:
        server.terminate()
        server.wait()