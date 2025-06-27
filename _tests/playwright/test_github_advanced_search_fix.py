"""Test GitHub Advanced Search Fix"""

import pytest
from playwright.sync_api import Page, expect
import json
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test 
def test_github_advanced_search_function_registration(page: Page, serve_hacka_re):
    """Test that github_advanced_search function is properly registered"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Open Function Calling modal
    page.click("#function-calling-btn")
    page.wait_for_selector('.modal-content:has-text("Function Calling")', state='visible')
    
    # Create a simple test function to check if GitHub provider is working
    test_function = '''
// Test github_advanced_search registration
function test_github_advanced_search() {
    console.log('Testing GitHub Advanced Search registration...');
    
    // Check if GitHub provider is available
    if (!window.GitHubProvider) {
        return 'ERROR: GitHubProvider not available';
    }
    
    // Create provider instance
    const provider = new window.GitHubProvider();
    
    // Check if advanced search tool is registered
    const hasAdvancedSearch = provider.tools.has('github_advanced_search');
    if (!hasAdvancedSearch) {
        return 'ERROR: github_advanced_search not registered in tools';
    }
    
    // Check if tool has handler
    const tool = provider.tools.get('github_advanced_search');
    if (!tool.handler) {
        return 'ERROR: github_advanced_search tool has no handler';
    }
    
    // Check if MCP Service Connectors can handle it
    if (!window.MCPServiceConnectors) {
        return 'ERROR: MCPServiceConnectors not available';
    }
    
    return 'SUCCESS: github_advanced_search is properly registered and has handler';
}
'''
    
    # Add the test function
    page.evaluate(f"eval(`{test_function}`)")
    
    # Execute the test
    result = page.evaluate("test_github_advanced_search()")
    
    print(f"Registration test result: {result}")
    
    # Verify the result
    assert "SUCCESS" in result, f"GitHub advanced search registration failed: {result}"
    
    # Take a screenshot for debugging
    screenshot_with_markdown(page, "github_advanced_search_registration", "GitHub Advanced Search Registration Test Passed")
    
    # Close modal
    page.keyboard.press("Escape")
    
    print("✅ GitHub advanced search function registration verified!")


@pytest.mark.feature_test
def test_github_advanced_search_mock_execution(page: Page, serve_hacka_re):
    """Test github_advanced_search function execution with mock data"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Define a test that simulates the actual function call
    test_execution = '''
async function test_github_advanced_search_execution() {
    console.log('Testing GitHub Advanced Search execution...');
    
    try {
        // Mock fetch to avoid real API calls
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            console.log('Mock fetch called for:', url);
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    query: "rampage",
                    search_types: ["repositories", "issues"],
                    total_results: 5,
                    results_by_type: {
                        repositories: { total_count: 3, items: [] },
                        issues: { total_count: 2, items: [] }
                    },
                    unified_results: []
                })
            });
        };
        
        // Create MCP Service Connectors instance
        const connectors = new window.MCPServiceConnectors();
        
        // Create mock connection
        const mockConnection = {
            serviceKey: 'github',
            token: 'mock-test-token-12345',
            isConnected: true
        };
        
        // Test the actual function call path
        const result = await connectors.executeGitHubTool('advanced_search', { q: 'rampage' }, mockConnection);
        
        // Restore original fetch
        window.fetch = originalFetch;
        
        if (result && result.query === 'rampage') {
            return 'SUCCESS: github_advanced_search executed successfully with mock data';
        } else {
            return 'ERROR: Unexpected result format: ' + JSON.stringify(result);
        }
        
    } catch (error) {
        // Restore fetch in case of error
        if (window.fetch !== originalFetch) {
            window.fetch = originalFetch;
        }
        return 'ERROR: ' + error.message;
    }
}
'''
    
    # Add and execute the test
    page.evaluate(f"window.testExecution = {test_execution}")
    result = page.evaluate("window.testExecution()")
    
    print(f"Execution test result: {result}")
    
    # Verify the result
    assert "SUCCESS" in result, f"GitHub advanced search execution failed: {result}"
    
    # Take a screenshot for debugging
    screenshot_with_markdown(page, "github_advanced_search_execution", "GitHub Advanced Search Execution Test Passed")
    
    print("✅ GitHub advanced search function execution verified!")


@pytest.mark.feature_test
def test_github_advanced_search_error_handling(page: Page, serve_hacka_re):
    """Test that github_advanced_search no longer throws 'Unknown GitHub tool' error"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Test error handling
    error_test = '''
async function test_error_handling() {
    try {
        // Create MCP Service Connectors instance
        const connectors = new window.MCPServiceConnectors();
        
        // Create mock connection
        const mockConnection = {
            serviceKey: 'github',
            token: 'invalid-token',
            isConnected: true
        };
        
        // Test that it doesn't throw "Unknown GitHub tool" anymore
        await connectors.executeGitHubTool('advanced_search', { q: 'test' }, mockConnection);
        
        return 'SUCCESS: No "Unknown GitHub tool" error thrown';
        
    } catch (error) {
        if (error.message.includes('Unknown GitHub tool: advanced_search')) {
            return 'FAILED: Still throwing "Unknown GitHub tool" error';
        } else {
            // Other errors are expected (like API errors)
            return 'SUCCESS: "Unknown GitHub tool" error fixed (got different error: ' + error.message + ')';
        }
    }
}
'''
    
    # Add and execute the test
    page.evaluate(f"window.errorTest = {error_test}")
    result = page.evaluate("window.errorTest()")
    
    print(f"Error handling test result: {result}")
    
    # Verify the result - should not get the specific "Unknown GitHub tool" error
    assert "Unknown GitHub tool" not in result, f"Still getting Unknown GitHub tool error: {result}"
    assert "SUCCESS" in result or "FAILED" not in result, f"Error handling test failed: {result}"
    
    # Take a screenshot for debugging
    screenshot_with_markdown(page, "github_advanced_search_error_handling", "GitHub Advanced Search Error Handling Test")
    
    print("✅ GitHub advanced search error handling verified!")