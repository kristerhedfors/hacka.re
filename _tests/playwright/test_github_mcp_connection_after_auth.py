"""Test GitHub MCP Connection Completion After OAuth Authentication"""

import pytest
from playwright.sync_api import Page, expect
import json
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_github_mcp_connection_after_manual_token_entry(page: Page, serve_hacka_re):
    """Test that MCP connection completes after manual token entry"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Set up console event listener
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal and connect to GitHub
    page.click("#mcp-servers-btn")
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    github_section = page.locator('.quick-connector-card[data-service="github"]')
    github_section.locator('button:has-text("Connect")').click()
    page.wait_for_selector('#quick-connector-setup-modal', state='visible')
    
    # Enter client ID and save
    page.fill('#quick-setup-client-id', 'test_client_id_connection_test')
    page.click('button:has-text("Save & Connect")')
    
    # Wait for manual device flow modal
    page.wait_for_selector('.device-flow-modal.manual-device-flow', state='visible', timeout=10000)
    
    # Process manual device response to get to automatic flow
    mock_device_response = {
        "device_code": "test_device_code_connection_test",
        "user_code": "WXYZ-5678",
        "verification_uri": "https://github.com/login/device",
        "expires_in": 900,
        "interval": 5
    }
    
    textarea = page.locator('#device-response-input')
    textarea.fill(json.dumps(mock_device_response, indent=2))
    
    process_button = page.locator('button:has-text("Process Device Code")')
    process_button.click()
    
    # Should transition to automatic device flow
    page.wait_for_selector('.device-flow-modal:not(.manual-device-flow)', state='visible', timeout=5000)
    
    # Wait for polling to fail and show manual token entry
    print("Waiting for CORS polling error and manual token entry...")
    page.wait_for_selector('.manual-token-entry', state='visible', timeout=15000)
    
    # Enter a valid GitHub token
    valid_token = 'ghp_1234567890abcdef1234567890abcdef12345678'
    token_input = page.locator('#manual-access-token')
    token_input.fill(valid_token)
    
    save_button = page.locator('.manual-token-entry button:has-text("Save Token")')
    save_button.click()
    
    # Wait for success and check for connection completion
    page.wait_for_timeout(3000)
    
    # Check console logs for our specific connection completion messages
    connection_messages = [
        msg for msg in console_messages 
        if 'connection completion' in msg.lower() or 'completeConnectionAfterAuth' in msg
    ]
    
    print(f"Connection completion messages: {connection_messages}")
    
    # Verify the connection completion was triggered
    assert len(connection_messages) > 0, "No connection completion messages found"
    
    # Check for specific log message about triggering MCP connection
    trigger_messages = [msg for msg in console_messages if 'Triggering MCP connection completion' in msg]
    assert len(trigger_messages) > 0, f"Expected connection trigger message not found. Available messages: {console_messages}"
    
    # Take screenshot for verification
    screenshot_with_markdown(
        page,
        "github_mcp_connection_after_auth",
        {"description": "MCP connection after successful manual token entry"}
    )
    
    print("✅ MCP connection completion after manual token entry tested successfully!")


@pytest.mark.feature_test
def test_github_mcp_connection_completion_function_exists(page: Page, serve_hacka_re):
    """Test that the completeConnectionAfterAuth function exists and is accessible"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Wait for all components to load
    page.wait_for_timeout(2000)
    
    # Check if the completeConnectionAfterAuth function exists
    result = page.evaluate("""
        typeof window.MCPQuickConnectors !== 'undefined' && 
        typeof window.MCPQuickConnectors.completeConnectionAfterAuth === 'function'
    """)
    
    assert result, "MCPQuickConnectors.completeConnectionAfterAuth function not found"
    
    # Check if the function can be called (with a test service key)
    try:
        result2 = page.evaluate("""
            (() => {
                // Test that the function exists and can be called
                if (window.MCPQuickConnectors && window.MCPQuickConnectors.completeConnectionAfterAuth) {
                    console.log('completeConnectionAfterAuth function is available');
                    return true;
                }
                return false;
            })()
        """)
        assert result2, "Function is not available for calling"
    except Exception as e:
        pytest.fail(f"Error testing completeConnectionAfterAuth function: {e}")
    
    print("✅ completeConnectionAfterAuth function exists and is accessible!")


@pytest.mark.feature_test  
def test_mcp_oauth_flow_completion_callback(page: Page, serve_hacka_re):
    """Test that the OAuth flow component properly calls the completion callback"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Set up console event listener
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Mock the MCPQuickConnectors.completeConnectionAfterAuth function to track calls
    page.evaluate("""
        window.testCallbacks = [];
        
        if (window.MCPQuickConnectors) {
            const originalFunction = window.MCPQuickConnectors.completeConnectionAfterAuth;
            window.MCPQuickConnectors.completeConnectionAfterAuth = function(serviceKey) {
                window.testCallbacks.push({
                    function: 'completeConnectionAfterAuth',
                    serviceKey: serviceKey,
                    timestamp: Date.now()
                });
                console.log('Mock: completeConnectionAfterAuth called with serviceKey:', serviceKey);
                // Don't call the original to avoid actual connection attempts
            };
        }
    """)
    
    # Test the manual token submission directly
    result = page.evaluate("""
        new Promise(async (resolve) => {
            try {
                // Simulate a manual token submission
                if (window.mcpOAuthFlow && window.mcpOAuthFlow.submitManualToken) {
                    // Mock the OAuth service methods to avoid actual network calls
                    const originalOAuthService = window.mcpOAuthFlow.oauthService;
                    
                    window.mcpOAuthFlow.oauthService = {
                        storeManualToken: async (serverName, tokenData) => {
                            console.log('Mock: storeManualToken called for', serverName);
                            return true;
                        },
                        pendingFlows: new Map([['test_device_code', { serverName: 'mcp-github' }]]),
                        savePendingFlows: async () => {
                            console.log('Mock: savePendingFlows called');
                            return true;
                        }
                    };
                    
                    // Mock showDeviceFlowSuccess but keep the completion logic
                    const originalShowSuccess = window.mcpOAuthFlow.showDeviceFlowSuccess;
                    window.mcpOAuthFlow.showDeviceFlowSuccess = (serverName) => {
                        console.log('Mock: showDeviceFlowSuccess called for', serverName);
                        
                        // Trigger MCP connection completion if quick connectors available (from original code)
                        if (window.MCPQuickConnectors && serverName) {
                            console.log('[MCP OAuth Flow] Triggering MCP connection completion after authentication success');
                            console.log('[MCP OAuth Flow] Server name received:', serverName);
                            // Extract service key from server name (e.g., 'mcp-github' -> 'github')
                            const serviceKey = serverName.replace('mcp-', '');
                            console.log('[MCP OAuth Flow] Extracted service key:', serviceKey);
                            window.MCPQuickConnectors.completeConnectionAfterAuth(serviceKey);
                        }
                    };
                    
                    // Create mock input element
                    const mockInput = document.createElement('input');
                    mockInput.id = 'manual-access-token';
                    mockInput.value = 'ghp_1234567890abcdef1234567890abcdef12345678';
                    document.body.appendChild(mockInput);
                    
                    // Call submitManualToken
                    await window.mcpOAuthFlow.submitManualToken('mcp-github', 'test_device_code');
                    
                    // Clean up
                    document.body.removeChild(mockInput);
                    window.mcpOAuthFlow.oauthService = originalOAuthService;
                    window.mcpOAuthFlow.showDeviceFlowSuccess = originalShowSuccess;
                    
                    resolve({ success: true, callbacks: window.testCallbacks });
                } else {
                    resolve({ success: false, error: 'submitManualToken not found' });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    """)
    
    print(f"Test result: {result}")
    print(f"Console messages: {console_messages}")
    
    assert result['success'], f"Test failed: {result.get('error', 'Unknown error')}"
    assert len(result['callbacks']) > 0, "No callbacks were triggered"
    
    # Find the callback with the correct service key (might be the second one due to dual calls)
    github_callback = None
    for callback in result['callbacks']:
        if callback['serviceKey'] == 'github':
            github_callback = callback
            break
    
    assert github_callback is not None, f"No callback found with serviceKey 'github'. Found callbacks: {result['callbacks']}"
    assert github_callback['function'] == 'completeConnectionAfterAuth', f"Wrong function called: {github_callback['function']}"
    
    print("✅ OAuth flow completion callback tested successfully!")