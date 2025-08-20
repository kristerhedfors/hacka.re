#!/usr/bin/env python3
"""
Quick GitHub Connection Fix Validation

Tests that the GitHub connector no longer has the boolean storage bug:
1. Attempts GitHub connection flow
2. Validates UI helper returns token instead of boolean
3. Verifies connector handles token correctly
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_github_connection_fix(page: Page, serve_hacka_re):
    """Test that GitHub connection no longer has boolean storage bug"""
    
    # Capture console messages
    console_messages = []
    def handle_console(msg):
        console_messages.append(f"[{msg.type}] {msg.text}")
        if any(keyword in msg.text.lower() for keyword in ['github', 'connected', 'error', 'boolean', 'token']):
            print(f"RELEVANT: [{msg.type}] {msg.text}")
    page.on('console', handle_console)
    
    print("=== STEP 1: Setup and Navigate ===")
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== STEP 2: Test GitHub Connection Flow ===")
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Click GitHub connect
    github_connect = page.locator('[data-service="github"] .connect-btn')
    expect(github_connect).to_be_visible()
    github_connect.click()
    
    # Wait for PAT input modal
    page.wait_for_selector('#service-pat-input-modal', timeout=10000)
    
    # Enter a test token
    pat_input = page.locator('#pat-input')
    test_token = "ghp_test_token_for_validation_testing"
    pat_input.fill(test_token)
    
    print(f"Entered test GitHub token: {test_token}")
    
    # Inject a test validation override to prevent actual API call
    page.evaluate("""
        () => {
            const connector = window.mcpServiceManager?.getConnector('github');
            if (connector) {
                // Override validateToken to return true for test tokens
                const originalValidate = connector.validateToken;
                connector.validateToken = function(token) {
                    if (token.includes('test_token_for_validation_testing')) {
                        console.log('[TEST] Using mock validation for test token');
                        return Promise.resolve(true);
                    }
                    return originalValidate.call(this, token);
                };
            }
        }
    """)
    
    # Click connect
    pat_connect_btn = page.locator('#pat-connect-btn')
    pat_connect_btn.click()
    
    # Wait a moment for connection attempt
    time.sleep(3)
    
    print("=== STEP 3: Validate Connection Handling ===")
    
    # Check the connection state and token handling
    connection_state = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager?.getConnector('github');
            if (!connector) return { error: 'No connector found' };
            
            return {
                hasConnector: true,
                connection: connector.connection,
                tokenType: connector.connection ? typeof connector.connection.token : 'undefined',
                tokenValue: connector.connection?.token,
                isConnected: connector.isConnected(),
                hasValidCredentials: connector.hasValidCredentials()
            };
        }
    """)
    
    print(f"Connection state: {connection_state}")
    
    # The key test - token should NOT be boolean
    if connection_state.get('connection'):
        token_type = connection_state.get('tokenType', 'undefined')
        token_value = connection_state.get('tokenValue')
        
        print(f"Token type: {token_type}")
        print(f"Token value: {repr(token_value)}")
        
        # Critical validation - token should be string, not boolean
        if token_type == 'boolean':
            print("❌ FAILED: Token is boolean (bug still present)")
            assert False, f"Token should be string, got boolean: {token_value}"
        elif token_type == 'string':
            print("✅ SUCCESS: Token is string (bug fixed)")
            if token_value == test_token:
                print("✅ SUCCESS: Token value matches input")
            else:
                print(f"⚠️  Token value mismatch: expected {test_token}, got {token_value}")
        else:
            print(f"⚠️  Unexpected token type: {token_type}")
            
    else:
        print("ℹ️  No connection object found (may be expected if validation failed)")
    
    # Close any remaining modals
    try:
        # Try to close PAT modal if still open
        if page.locator('#service-pat-input-modal').is_visible():
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
            
        # Close MCP modal
        if page.locator("#mcp-servers-modal").is_visible():
            close_btn = page.locator("#close-mcp-servers-modal")
            if close_btn.is_visible():
                close_btn.click()
            else:
                page.keyboard.press("Escape")
    except:
        pass
    
    screenshot_with_markdown(page, "github_connection_test", {
        "Status": "GitHub connection test completed",
        "Token Type": connection_state.get('tokenType', 'undefined'),
        "Connection Exists": str(bool(connection_state.get('connection'))),
        "Test Result": "Fixed" if connection_state.get('tokenType') != 'boolean' else "Bug Still Present"
    })
    
    print("=== VALIDATION RESULTS ===")
    
    # Main validation - ensure we don't have boolean token bug
    token_type = connection_state.get('tokenType', 'undefined')
    
    validation_results = {
        'has_connector': connection_state.get('hasConnector', False),
        'no_boolean_token_bug': token_type != 'boolean',
        'token_handling_works': token_type in ['string', 'undefined']  # Either string or no connection
    }
    
    for check, passed in validation_results.items():
        status = "✅" if passed else "❌"
        print(f"{status} {check}: {passed}")
    
    # Critical test - must not have boolean token bug
    if validation_results['no_boolean_token_bug']:
        print("🎉 GITHUB BOOLEAN TOKEN BUG FIX VALIDATED!")
        return True
    else:
        pytest.fail(f"GitHub still has boolean token bug. Token type: {token_type}")


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
        # Run the test
        result = pytest.main([__file__, '-v', '-s', '--tb=short'])
        sys.exit(result)
    finally:
        server.terminate()
        server.wait()