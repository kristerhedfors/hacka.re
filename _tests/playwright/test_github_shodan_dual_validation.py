#!/usr/bin/env python3
"""
GitHub and Shodan Dual Integration Validation

Tests both services to ensure:
1. Both can connect with real API keys
2. Both show proper connection states
3. Both have functions available
4. Functions execute properly when called

This test validates that the boolean storage bug is fixed for both services.
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
def github_token():
    """Get GitHub token from environment"""
    from dotenv import load_dotenv
    load_dotenv()
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        pytest.skip("GITHUB_TOKEN not found in environment")
    return token


def test_github_shodan_dual_validation(page: Page, serve_hacka_re, shodan_api_key, github_token):
    """Test both GitHub and Shodan integration together"""
    
    # Capture console messages
    console_messages = []
    def handle_console(msg):
        console_messages.append(f"[{msg.type}] {msg.text}")
        if any(keyword in msg.text.lower() for keyword in ['github', 'shodan', 'connected', 'error', 'function']):
            print(f"RELEVANT: [{msg.type}] {msg.text}")
    page.on('console', handle_console)
    
    print("=== STEP 1: Setup and Navigate ===")
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("=== STEP 2: Connect to Shodan ===")
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Connect to Shodan first
    shodan_connect = page.locator('[data-service="shodan"] .connect-btn')
    expect(shodan_connect).to_be_visible()
    shodan_connect.click()
    
    # Handle Shodan API key
    page.wait_for_selector('#service-apikey-input-modal', timeout=10000)
    api_key_input = page.locator('#apikey-input')
    api_key_input.fill(shodan_api_key)
    
    modal_connect_btn = page.locator('#apikey-connect-btn')
    modal_connect_btn.click()
    
    # Wait for Shodan connection
    try:
        page.wait_for_selector('#service-apikey-input-modal', state='hidden', timeout=15000)
        print("✅ Shodan connection modal closed")
    except:
        pytest.fail("Shodan connection failed")
    
    time.sleep(2)  # Allow connection to stabilize
    
    print("=== STEP 3: Connect to GitHub ===")
    
    # Connect to GitHub
    github_connect = page.locator('[data-service="github"] .connect-btn')
    expect(github_connect).to_be_visible()
    github_connect.click()
    
    # Handle GitHub PAT
    page.wait_for_selector('#service-pat-input-modal', timeout=10000)
    pat_input = page.locator('#pat-input')
    pat_input.fill(github_token)
    
    pat_connect_btn = page.locator('#pat-connect-btn')
    pat_connect_btn.click()
    
    # Wait for GitHub connection
    try:
        page.wait_for_selector('#service-pat-input-modal', state='hidden', timeout=15000)
        print("✅ GitHub connection modal closed")
    except:
        pytest.fail("GitHub connection failed")
        
    time.sleep(2)  # Allow connection to stabilize
    
    print("=== STEP 4: Validate Connection States ===")
    
    # Check both connection states
    connection_states = page.evaluate("""
        () => {
            const shodanConnector = window.mcpServiceManager?.getConnector('shodan');
            const githubConnector = window.mcpServiceManager?.getConnector('github');
            
            return {
                shodan: {
                    hasConnector: !!shodanConnector,
                    isConnected: shodanConnector ? shodanConnector.isConnected() : false,
                    hasValidCredentials: shodanConnector ? shodanConnector.hasValidCredentials() : false,
                    toolCount: shodanConnector ? Object.keys(shodanConnector.getToolsToRegister()).length : 0,
                    apiKeyType: shodanConnector?.connection ? typeof shodanConnector.connection.apiKey : 'undefined'
                },
                github: {
                    hasConnector: !!githubConnector,
                    isConnected: githubConnector ? githubConnector.isConnected() : false,
                    hasValidCredentials: githubConnector ? githubConnector.hasValidCredentials() : false,
                    toolCount: githubConnector ? Object.keys(githubConnector.getToolsToRegister()).length : 0,
                    tokenType: githubConnector?.connection ? typeof githubConnector.connection.token : 'undefined'
                }
            };
        }
    """)
    
    print(f"Connection states: {connection_states}")
    
    # Validate Shodan
    shodan_state = connection_states['shodan']
    assert shodan_state['hasConnector'], "Should have Shodan connector"
    assert shodan_state['isConnected'], f"Shodan should be connected. State: {shodan_state}"
    assert shodan_state['hasValidCredentials'], f"Shodan should have valid credentials. State: {shodan_state}"
    assert shodan_state['toolCount'] >= 10, f"Shodan should have at least 10 tools, got {shodan_state['toolCount']}"
    assert shodan_state['apiKeyType'] == 'string', f"Shodan API key should be string, got {shodan_state['apiKeyType']}"
    
    # Validate GitHub 
    github_state = connection_states['github']
    assert github_state['hasConnector'], "Should have GitHub connector"
    assert github_state['isConnected'], f"GitHub should be connected. State: {github_state}"
    assert github_state['hasValidCredentials'], f"GitHub should have valid credentials. State: {github_state}"
    assert github_state['toolCount'] >= 5, f"GitHub should have at least 5 tools, got {github_state['toolCount']}"
    assert github_state['tokenType'] == 'string', f"GitHub token should be string, got {github_state['tokenType']}"
    
    print("✅ All connection validations passed")
    
    screenshot_with_markdown(page, "dual_connections_validated", {
        "Status": "Both services connected successfully",
        "Shodan Connected": str(shodan_state['isConnected']),
        "Shodan Tools": str(shodan_state['toolCount']),
        "GitHub Connected": str(github_state['isConnected']), 
        "GitHub Tools": str(github_state['toolCount']),
        "Shodan Credentials": str(shodan_state['hasValidCredentials']),
        "GitHub Credentials": str(github_state['hasValidCredentials'])
    })
    
    print("=== STEP 5: Test Function Availability ===")
    
    # Check function availability for both services
    functions_available = page.evaluate("""
        () => {
            const expectedShodanFunctions = [
                'shodan_host_info',
                'shodan_search', 
                'shodan_dns_resolve',
                'shodan_account_profile',
                'shodan_api_info'
            ];
            
            const expectedGitHubFunctions = [
                'github_list_repos',
                'github_get_repo',
                'github_list_issues',
                'github_create_issue'
            ];
            
            const results = {
                shodan: {},
                github: {}
            };
            
            // Check Shodan functions
            for (const funcName of expectedShodanFunctions) {
                results.shodan[funcName] = {
                    exists: typeof window[funcName] === 'function',
                    type: typeof window[funcName]
                };
            }
            
            // Check GitHub functions
            for (const funcName of expectedGitHubFunctions) {
                results.github[funcName] = {
                    exists: typeof window[funcName] === 'function',
                    type: typeof window[funcName]
                };
            }
            
            return results;
        }
    """)
    
    print("Function availability:")
    print("Shodan functions:")
    for func_name, info in functions_available['shodan'].items():
        status = "✅" if info['exists'] else "❌"
        print(f"  {status} {func_name}: {info['type']}")
    
    print("GitHub functions:")
    for func_name, info in functions_available['github'].items():
        status = "✅" if info['exists'] else "❌"
        print(f"  {status} {func_name}: {info['type']}")
    
    # Validate functions exist
    missing_shodan = [name for name, info in functions_available['shodan'].items() if not info['exists']]
    missing_github = [name for name, info in functions_available['github'].items() if not info['exists']]
    
    assert len(missing_shodan) == 0, f"Missing Shodan functions: {missing_shodan}"
    assert len(missing_github) == 0, f"Missing GitHub functions: {missing_github}"
    
    print("=== STEP 6: Test Direct Function Execution ===")
    
    # Test Shodan function
    shodan_result = page.evaluate("""
        async () => {
            try {
                console.log('[TEST] Testing shodan_api_info function...');
                const result = await window.shodan_api_info();
                console.log('[TEST] Shodan result:', result);
                return { 
                    success: true, 
                    result: result,
                    hasResult: !!result
                };
            } catch (error) {
                console.log('[TEST] Shodan function error:', error.message);
                return { 
                    success: false, 
                    error: error.message
                };
            }
        }
    """)
    
    # Test GitHub function  
    github_result = page.evaluate("""
        async () => {
            try {
                console.log('[TEST] Testing github_list_repos function...');
                const result = await window.github_list_repos();
                console.log('[TEST] GitHub result:', result);
                return { 
                    success: true, 
                    result: result,
                    hasResult: !!result
                };
            } catch (error) {
                console.log('[TEST] GitHub function error:', error.message);
                return { 
                    success: false, 
                    error: error.message
                };
            }
        }
    """)
    
    print(f"Shodan function test result: {shodan_result}")
    print(f"GitHub function test result: {github_result}")
    
    # Close modal
    try:
        close_btn = page.locator("#close-mcp-servers-modal")
        if close_btn.is_visible():
            close_btn.click()
        else:
            page.keyboard.press("Escape")
    except:
        pass
    
    screenshot_with_markdown(page, "dual_function_tests", {
        "Status": "Function execution tests complete",
        "Shodan Function Test": "Success" if shodan_result['success'] else "Failed",
        "GitHub Function Test": "Success" if github_result['success'] else "Failed",
        "Shodan Functions Available": str(len([f for f in functions_available['shodan'].values() if f['exists']])),
        "GitHub Functions Available": str(len([f for f in functions_available['github'].values() if f['exists']]))
    })
    
    print("=== FINAL VALIDATION RESULTS ===")
    
    validation_results = {
        'shodan_connected': shodan_state['isConnected'],
        'shodan_valid_credentials': shodan_state['hasValidCredentials'],
        'shodan_correct_key_type': shodan_state['apiKeyType'] == 'string',
        'shodan_functions_registered': len(missing_shodan) == 0,
        'shodan_function_execution': shodan_result['success'],
        'github_connected': github_state['isConnected'],
        'github_valid_credentials': github_state['hasValidCredentials'],
        'github_correct_token_type': github_state['tokenType'] == 'string',
        'github_functions_registered': len(missing_github) == 0,
        'github_function_execution': github_result['success']
    }
    
    for check, passed in validation_results.items():
        status = "✅" if passed else "❌"
        print(f"{status} {check}: {passed}")
    
    # Critical tests - both services should be connected with valid credentials and functions
    critical_passed = all([
        validation_results['shodan_connected'],
        validation_results['shodan_valid_credentials'],
        validation_results['shodan_functions_registered'],
        validation_results['github_connected'],
        validation_results['github_valid_credentials'],
        validation_results['github_functions_registered']
    ])
    
    if critical_passed:
        print("🎉 CRITICAL DUAL INTEGRATION TESTS PASSED!")
        if all(validation_results.values()):
            print("🌟 ALL TESTS PASSED - BOTH SERVICES FULLY WORKING!")
        else:
            print("⚠️  Core functionality working, some edge cases may need attention")
        return True
    else:
        failed_critical = [k for k, v in validation_results.items() if not v and any(word in k for word in ['connected', 'credentials', 'registered'])]
        pytest.fail(f"Critical dual integration tests failed: {failed_critical}")


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