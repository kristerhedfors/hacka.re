"""
Test GitHub Provider CORS Fix
Tests that the GitHub provider works correctly after the CORS fix
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal


@pytest.mark.feature_test
def test_github_provider_cors_fix(page: Page, serve_hacka_re):
    """Test that GitHub provider loads correctly without CORS errors"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Set up console event listener to catch CORS errors
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Wait for the page to fully load
    page.wait_for_load_state('networkidle')
    
    # Check that GitHubProvider is available globally
    provider_available = page.evaluate("""
        () => {
            return typeof window.GitHubProvider === 'function';
        }
    """)
    
    assert provider_available, "GitHubProvider should be available globally"
    
    # Check that GitHubTokenManager is available globally  
    token_manager_available = page.evaluate("""
        () => {
            return typeof window.GitHubTokenManager === 'object' && window.GitHubTokenManager !== null;
        }
    """)
    
    assert token_manager_available, "GitHubTokenManager should be available globally"
    
    # Check that we can instantiate the provider without errors
    can_instantiate = page.evaluate("""
        async () => {
            try {
                const provider = new window.GitHubProvider();
                return provider !== null;
            } catch (error) {
                console.error('Provider instantiation error:', error);
                return false;
            }
        }
    """)
    
    assert can_instantiate, "Should be able to instantiate GitHubProvider"
    
    # Check for CORS-related error messages
    cors_errors = [msg for msg in console_messages if 'CORS' in msg or 'Failed to resolve module specifier' in msg]
    
    # Print console messages for debugging
    print("Console messages:")
    for msg in console_messages:
        print(f"  {msg}")
    
    # We should not have CORS errors related to the new import path
    new_cors_errors = [msg for msg in cors_errors if '../providers/github/index.js' in msg]
    assert len(new_cors_errors) == 0, f"Should not have CORS errors with new import path: {new_cors_errors}"
    
    print("✅ GitHub Provider CORS fix verification complete")


@pytest.mark.feature_test 
def test_github_mcp_connection_no_cors(page: Page, serve_hacka_re):
    """Test that MCP connection to GitHub works without CORS errors"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Set up console event listener
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Look for GitHub quick connector
    github_section = page.locator('.quick-connector-card[data-service="github"]')
    expect(github_section).to_be_visible(timeout=5000)
    
    # Check that GitHub shows as available (not errored)
    github_status = github_section.locator('.connection-status').text_content()
    print(f"GitHub status: {github_status}")
    
    # Should not have connection errors related to CORS
    assert "Error" not in github_status, "GitHub should not show connection errors"
    
    # Check console messages for CORS errors
    cors_errors = [msg for msg in console_messages if 'CORS' in msg and 'GitHubProvider' in msg]
    
    print("Console messages:")
    for msg in console_messages:
        print(f"  {msg}")
    
    assert len(cors_errors) == 0, f"Should not have CORS errors during MCP connection: {cors_errors}"
    
    print("✅ GitHub MCP connection CORS verification complete")