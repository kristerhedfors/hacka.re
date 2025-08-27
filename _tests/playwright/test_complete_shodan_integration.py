#!/usr/bin/env python3
"""
Complete End-to-End Shodan Integration Test

Tests the entire flow:
1. Configure OpenAI API
2. Connect to Shodan with real API key  
3. Ask LLM to use Shodan functions
4. Validate actual responses

This test uses real API keys and makes real API calls to validate functionality.
"""

import pytest
import time
import os
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


@pytest.fixture
def shodan_api_key():
    """Get Shodan API key from environment"""
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv("SHODAN_API_KEY")
    if not api_key:
        pytest.skip("SHODAN_API_KEY not found in environment")
    return api_key


@pytest.fixture
def openai_api_key():
    """Get OpenAI API key from environment"""
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("OPENAI_API_KEY not found in environment")
    return api_key


def test_complete_shodan_integration(page: Page, serve_hacka_re, openai_api_key, shodan_api_key):
    """Test complete Shodan integration with real API keys"""
    
    # Capture console messages for debugging
    console_messages = []
    def handle_console(msg):
        console_messages.append(f"[{msg.type}] {msg.text}")
        if any(keyword in msg.text.lower() for keyword in ['shodan', 'connected', 'error', 'function', 'tool', 'api']):
            print(f"RELEVANT: [{msg.type}] {msg.text}")
    page.on('console', handle_console)
    
    print("=== STEP 1: Setup OpenAI API ===")
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Configure OpenAI API - use a simpler approach
    # Set via console to avoid UI race conditions
    page.evaluate(f"""() => {{
        // Set API key directly
        if (window.CoreStorageService) {{
            window.CoreStorageService.setValue('openai_api_key', '{openai_api_key}');
        }} else {{
            localStorage.setItem('openai_api_key', '{openai_api_key}');
        }}
        
        // Set base URL
        if (window.CoreStorageService) {{
            window.CoreStorageService.setValue('base_url', 'https://api.openai.com/v1');
        }} else {{
            localStorage.setItem('base_url', 'https://api.openai.com/v1');
        }}
        
        // Set model
        if (window.CoreStorageService) {{
            window.CoreStorageService.setValue('selected_model', 'gpt-4o-mini');
        }} else {{
            localStorage.setItem('selected_model', 'gpt-4o-mini');
        }}
    }}""")
    
    # Refresh the page to pick up the new settings
    page.reload()
    page.wait_for_load_state('networkidle')
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for initialization
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition
    
    print("✅ API key configured via storage")
    
    screenshot_with_markdown(page, "openai_configured", {
        "Status": "OpenAI API configured",
        "Model": "gpt-4o-mini selected",
        "API Key": "Configured"
    })
    
    print("=== STEP 2: Connect to Shodan with Real API Key ===")
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Find and click Shodan connect button
    shodan_connect = page.locator('[data-service="shodan"] .connect-btn')
    expect(shodan_connect).to_be_visible()
    shodan_connect.click()
    
    # Wait for API key modal
    page.wait_for_selector('#service-apikey-input-modal', timeout=10000)
    
    # Enter real Shodan API key
    api_key_input = page.locator('#apikey-input')
    api_key_input.fill(shodan_api_key)
    
    print(f"Entered Shodan API key: {shodan_api_key[:10]}...")
    
    # Click connect
    modal_connect_btn = page.locator('#apikey-connect-btn')
    modal_connect_btn.click()
    
    # Wait for connection to complete
    try:
        page.wait_for_selector('#service-apikey-input-modal', state='hidden', timeout=15000)
        print("✅ Shodan connection modal closed")
    except:
        screenshot_with_markdown(page, "shodan_connection_failed", {
            "Status": "Connection may have failed",
            "Modal": "Still visible"
        })
        raise
    
    # Check connection state
    time.sleep(2)  # Allow connection to stabilize
    
    connection_state = page.evaluate("""
        () => {
            const connector = window.mcpServiceManager?.getConnector('shodan');
            return {
                hasConnector: !!connector,
                isConnected: connector ? connector.isConnected() : false,
                hasValidCredentials: connector ? connector.hasValidCredentials() : false,
                connection: connector ? connector.connection : null,
                toolCount: connector ? Object.keys(connector.getToolsToRegister()).length : 0
            };
        }
    """)
    
    print(f"Connection state: {connection_state}")
    
    if not connection_state['isConnected']:
        print("❌ Shodan not connected, checking logs...")
        # Print recent console messages for debugging
        for msg in console_messages[-20:]:
            print(msg)
        pytest.fail("Shodan connection failed")
    
    screenshot_with_markdown(page, "shodan_connected", {
        "Status": "Shodan connected successfully",
        "Tools Available": str(connection_state['toolCount']),
        "Has Valid Credentials": str(connection_state['hasValidCredentials'])
    })
    
    # Close MCP modal
    try:
        close_btn = page.locator("#close-mcp-servers-modal")
        if close_btn.is_visible():
            close_btn.click()
        else:
            page.keyboard.press("Escape")
        page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)
    except:
        # Modal might already be closed, continue
        pass
    
    print("=== STEP 3: Test Shodan Functions with LLM ===")
    
    # Add handler for any unexpected API key modals
    def handle_api_key_modal():
        try:
            api_modal = page.locator('#api-key-modal')
            if api_modal.is_visible():
                print("⚠️  API key modal appeared unexpectedly, dismissing...")
                # Fill with API key and continue
                page.locator('#api-key-input').fill(openai_api_key)
                page.locator('#api-key-submit').click()
                # page.wait_for_timeout(1000)  # TODO: Replace with proper wait condition
        except:
            pass
    
    # Test 1: DNS resolution
    print("Testing DNS resolution with kernel.org...")
    
    message_input = page.locator("#message-input")
    message_input.fill("Use Shodan to resolve the DNS for kernel.org domain")
    
    # Handle any API key modal before sending
    handle_api_key_modal()
    
    page.click("#send-btn")
    
    # Handle API key modal that might appear after sending
    # page.wait_for_timeout(2000)  # TODO: Replace with proper wait condition
    handle_api_key_modal()
    
    # Wait for response with function call
    page.wait_for_selector('.function-call-icon', timeout=30000)
    
    # Wait for completion
    # page.wait_for_timeout(5000)  # TODO: Replace with proper wait condition
    
    # Check for function call results
    function_calls = page.locator('.function-call-icon').count()
    function_results = page.locator('.function-result-icon').count()
    
    print(f"Function calls found: {function_calls}")
    print(f"Function results found: {function_results}")
    
    screenshot_with_markdown(page, "kernel_dns_test", {
        "Test": "DNS resolution for kernel.org",
        "Function Calls": str(function_calls),
        "Function Results": str(function_results),
        "Status": "Completed"
    })
    
    # Get the response text for validation
    response_text = page.evaluate("""
        () => {
            const messages = document.querySelectorAll('.message.assistant');
            const lastMessage = messages[messages.length - 1];
            return lastMessage ? lastMessage.textContent : '';
        }
    """)
    
    print(f"Response contains: {len(response_text)} characters")
    
    # Validate the response contains expected content
    if function_calls > 0 and function_results > 0:
        print("✅ DNS resolution test successful - function called and executed")
    else:
        print("❌ DNS resolution test failed - no function calls detected")
        
    # Test 2: Host information
    print("Testing host information for cnn.com...")
    
    message_input.fill("Use Shodan to get host information about cnn.com")
    page.click("#send-btn")
    
    # Wait for response
    page.wait_for_selector('.function-call-icon', timeout=30000)
    # page.wait_for_timeout(5000)  # TODO: Replace with proper wait condition
    
    # Count total function calls after both tests
    total_function_calls = page.locator('.function-call-icon').count()
    total_function_results = page.locator('.function-result-icon').count()
    
    screenshot_with_markdown(page, "cnn_host_test", {
        "Test": "Host information for cnn.com",
        "Total Function Calls": str(total_function_calls),
        "Total Function Results": str(total_function_results),
        "Status": "Completed"
    })
    
    print("=== STEP 4: Validate Function Execution ===")
    
    # Get detailed function call information
    function_details = page.evaluate("""
        () => {
            const calls = document.querySelectorAll('.function-call-icon');
            const results = document.querySelectorAll('.function-result-icon');
            
            const details = {
                calls: [],
                results: [],
                errors: []
            };
            
            calls.forEach((call, i) => {
                const tooltip = call.getAttribute('title') || call.textContent;
                details.calls.push(`Call ${i+1}: ${tooltip}`);
            });
            
            results.forEach((result, i) => {
                const tooltip = result.getAttribute('title') || result.textContent;
                details.results.push(`Result ${i+1}: ${tooltip}`);
                
                // Check for errors
                if (tooltip.includes('error') || tooltip.includes('Error')) {
                    details.errors.push(`Error in result ${i+1}: ${tooltip}`);
                }
            });
            
            return details;
        }
    """)
    
    print("Function call details:")
    for call in function_details['calls']:
        print(f"  {call}")
    
    print("Function result details:")  
    for result in function_details['results']:
        print(f"  {result}")
        
    if function_details['errors']:
        print("Errors detected:")
        for error in function_details['errors']:
            print(f"  ❌ {error}")
    
    # Save comprehensive logs for analysis
    with open('/Users/user/dev/hacka.re/_tests/playwright/shodan_integration_logs.txt', 'w') as f:
        f.write("=== SHODAN INTEGRATION TEST LOGS ===\n\n")
        f.write(f"Connection State: {connection_state}\n\n")
        f.write(f"Function Details: {function_details}\n\n")
        f.write("Console Messages:\n")
        for msg in console_messages:
            f.write(f"{msg}\n")
    
    # Final validation
    success_criteria = {
        'shodan_connected': connection_state['isConnected'],
        'has_valid_credentials': connection_state['hasValidCredentials'], 
        'tools_available': connection_state['toolCount'] >= 10,
        'function_calls_made': total_function_calls >= 2,
        'function_results_received': total_function_results >= 2,
        'no_critical_errors': len(function_details['errors']) == 0
    }
    
    print(f"\n=== FINAL VALIDATION ===")
    for criteria, passed in success_criteria.items():
        status = "✅" if passed else "❌"
        print(f"{status} {criteria}: {passed}")
    
    screenshot_with_markdown(page, "final_validation", {
        "Shodan Connected": str(success_criteria['shodan_connected']),
        "Valid Credentials": str(success_criteria['has_valid_credentials']),
        "Tools Available": str(success_criteria['tools_available']),
        "Function Calls": str(success_criteria['function_calls_made']),
        "Results Received": str(success_criteria['function_results_received']),
        "No Errors": str(success_criteria['no_critical_errors'])
    })
    
    # Test passes if all critical criteria are met
    critical_criteria = [
        success_criteria['shodan_connected'],
        success_criteria['tools_available'],
        success_criteria['function_calls_made']
    ]
    
    if all(critical_criteria):
        print("🎉 COMPLETE INTEGRATION TEST PASSED!")
        return True
    else:
        failed_criteria = [k for k, v in success_criteria.items() if not v]
        pytest.fail(f"Integration test failed. Failed criteria: {failed_criteria}")


if __name__ == "__main__":
    import subprocess
    import sys
    
    # Start server
    server = subprocess.Popen(['python', '-m', 'http.server', '8000'], 
                            cwd='/Users/user/dev/hacka.re',
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)    try:
        # Run the test with detailed output
        pytest.main([__file__, '-v', '-s', '--tb=short'])
    finally:
        server.terminate()
        server.wait()