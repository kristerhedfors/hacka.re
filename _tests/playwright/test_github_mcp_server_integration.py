"""Test GitHub MCP Server Integration"""

import pytest
from playwright.sync_api import Page, expect
import json
from test_utils import screenshot_with_markdown, dismiss_welcome_modal, dismiss_settings_modal


@pytest.mark.feature_test
def test_github_mcp_integration_available(page: Page, serve_hacka_re):
    """Test that GitHub MCP integration is properly loaded and available"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Check that GitHub MCP integration is loaded
    result = page.evaluate("""
        (() => {
            return {
                githubMcpIntegration: typeof window.GitHubMCPIntegration !== 'undefined',
                githubMcpServer: typeof window.GitHubMCPServer !== 'undefined',
                hasInitMethod: window.GitHubMCPIntegration && typeof window.GitHubMCPIntegration.init === 'function',
                hasShowDialogMethod: window.GitHubMCPIntegration && typeof window.GitHubMCPIntegration.showConnectionDialog === 'function'
            };
        })()
    """)
    
    assert result['githubMcpIntegration'], "GitHubMCPIntegration should be available"
    assert result['githubMcpServer'], "GitHubMCPServer should be available"
    assert result['hasInitMethod'], "GitHubMCPIntegration should have init method"
    assert result['hasShowDialogMethod'], "GitHubMCPIntegration should have showConnectionDialog method"
    
    print("✅ GitHub MCP integration components verified!")


@pytest.mark.feature_test
def test_github_mcp_connector_in_quick_connectors(page: Page, serve_hacka_re):
    """Test that GitHub MCP connector appears in Quick Connectors"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Check GitHub MCP connector is present
    github_section = page.locator('.quick-connector-card[data-service="github-mcp"]')
    expect(github_section).to_be_visible()
    
    # Verify connector content
    expect(github_section).to_contain_text("GitHub MCP")
    expect(github_section).to_contain_text("Access GitHub via official Copilot MCP server")
    
    # Verify GitHub icon is present
    github_icon = github_section.locator('i.fab.fa-github')
    expect(github_icon).to_be_visible()
    
    # Verify connect button is present
    connect_button = github_section.locator('button:has-text("Connect")')
    expect(connect_button).to_be_visible()
    
    # Take screenshot for documentation
    screenshot_with_markdown(
        page, 
        'github_mcp_connector_quick_connectors',
        "GitHub MCP connector appears in Quick Connectors with proper branding and connect button"
    )
    
    # Close modal
    page.keyboard.press("Escape")
    
    print("✅ GitHub MCP connector in Quick Connectors verified!")


@pytest.mark.feature_test
def test_github_mcp_connection_dialog_oauth_option(page: Page, serve_hacka_re):
    """Test that GitHub MCP connection dialog shows OAuth option"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Click GitHub MCP connector
    github_section = page.locator('.quick-connector-card[data-service="github-mcp"]')
    github_section.locator('button:has-text("Connect")').click()
    
    # Wait for GitHub MCP connection dialog
    page.wait_for_selector('#github-mcp-connection-modal', state='visible')
    
    # Verify dialog content
    modal = page.locator('#github-mcp-connection-modal')
    expect(modal).to_contain_text("Connect to GitHub MCP Server")
    expect(modal).to_contain_text("GitHub's official Model Context Protocol server")
    expect(modal).to_contain_text("api.githubcopilot.com/mcp/")
    
    # Verify OAuth option is available
    oauth_card = modal.locator('.auth-method-card[data-method="oauth"]')
    expect(oauth_card).to_be_visible()
    expect(oauth_card).to_contain_text("OAuth (Recommended)")
    expect(oauth_card).to_contain_text("Automatic token refresh")
    
    # Verify OAuth button
    oauth_button = oauth_card.locator('button:has-text("Use OAuth")')
    expect(oauth_button).to_be_visible()
    
    # Take screenshot for documentation
    screenshot_with_markdown(
        page, 
        'github_mcp_connection_dialog_oauth',
        "GitHub MCP connection dialog shows OAuth authentication option with proper description"
    )
    
    # Close modal
    page.keyboard.press("Escape")
    
    print("✅ GitHub MCP OAuth option verified!")


@pytest.mark.feature_test
def test_github_mcp_connection_dialog_pat_option(page: Page, serve_hacka_re):
    """Test that GitHub MCP connection dialog shows PAT option"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Click GitHub MCP connector
    github_section = page.locator('.quick-connector-card[data-service="github-mcp"]')
    github_section.locator('button:has-text("Connect")').click()
    
    # Wait for GitHub MCP connection dialog
    page.wait_for_selector('#github-mcp-connection-modal', state='visible')
    
    # Verify PAT option is available
    pat_card = page.locator('.auth-method-card[data-method="pat"]')
    expect(pat_card).to_be_visible()
    expect(pat_card).to_contain_text("Personal Access Token")
    expect(pat_card).to_contain_text("Long-term access")
    expect(pat_card).to_contain_text("Fine-grained permissions")
    
    # Verify PAT button
    pat_button = pat_card.locator('button:has-text("Use PAT")')
    expect(pat_button).to_be_visible()
    
    # Take screenshot for documentation
    screenshot_with_markdown(
        page, 
        'github_mcp_connection_dialog_pat',
        "GitHub MCP connection dialog shows Personal Access Token authentication option"
    )
    
    # Close modal
    page.keyboard.press("Escape")
    
    print("✅ GitHub MCP PAT option verified!")


@pytest.mark.feature_test
def test_github_mcp_pat_setup_dialog(page: Page, serve_hacka_re):
    """Test that GitHub MCP PAT setup dialog works correctly"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Click GitHub MCP connector
    github_section = page.locator('.quick-connector-card[data-service="github-mcp"]')
    github_section.locator('button:has-text("Connect")').click()
    
    # Wait for connection dialog and click PAT option
    page.wait_for_selector('#github-mcp-connection-modal', state='visible')
    pat_button = page.locator('.auth-method-card[data-method="pat"] button:has-text("Use PAT")')
    pat_button.click()
    
    # Wait for PAT setup dialog
    page.wait_for_selector('#github-mcp-pat-setup-modal', state='visible')
    
    # Verify PAT setup dialog content
    pat_modal = page.locator('#github-mcp-pat-setup-modal')
    expect(pat_modal).to_contain_text("GitHub MCP Personal Access Token")
    expect(pat_modal).to_contain_text("Personal Access Token Setup:")
    expect(pat_modal).to_contain_text("Generate new token (classic)")
    expect(pat_modal).to_contain_text("repo")
    expect(pat_modal).to_contain_text("read:user")
    expect(pat_modal).to_contain_text("read:org")
    
    # Verify token input field
    token_input = pat_modal.locator('#github-mcp-token-input')
    expect(token_input).to_be_visible()
    expect(token_input).to_have_attribute('type', 'password')
    expect(token_input).to_have_attribute('placeholder', 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    
    # Verify validation and connect button (should be disabled initially)
    connect_button = pat_modal.locator('#validate-and-connect-token')
    expect(connect_button).to_be_visible()
    expect(connect_button).to_be_disabled()
    
    # Test token format validation
    token_input.fill("invalid_token")
    page.wait_for_timeout(500)
    
    # Should show format warning
    validation_status = pat_modal.locator('#token-validation-status')
    expect(validation_status).to_contain_text('Token should start with "ghp_"')
    
    # Test with properly formatted token
    token_input.fill("ghp_1234567890123456789012345678901234567890")
    page.wait_for_timeout(1500)  # Wait for debounced validation
    
    # Should show validation in progress or invalid (since it's not a real token)
    # But button should be enabled for format-valid tokens
    # Note: We expect validation to fail since this isn't a real token
    
    # Take screenshot for documentation
    screenshot_with_markdown(
        page, 
        'github_mcp_pat_setup_dialog',
        "GitHub MCP PAT setup dialog shows token input with validation and instructions"
    )
    
    # Close modal
    page.keyboard.press("Escape")
    
    print("✅ GitHub MCP PAT setup dialog verified!")


@pytest.mark.feature_test
def test_github_mcp_oauth_setup_dialog(page: Page, serve_hacka_re):
    """Test that GitHub MCP OAuth setup dialog works correctly"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Set up console message capture
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector('.modal-content:has-text("MCP Servers")', state='visible')
    
    # Click GitHub MCP connector
    github_section = page.locator('.quick-connector-card[data-service="github-mcp"]')
    github_section.locator('button:has-text("Connect")').click()
    
    # Wait for connection dialog and click OAuth option
    page.wait_for_selector('#github-mcp-connection-modal', state='visible')
    oauth_button = page.locator('.auth-method-card[data-method="oauth"] button:has-text("Use OAuth")')
    oauth_button.click()
    
    # Should show OAuth setup dialog since no client ID is configured
    page.wait_for_selector('#github-mcp-oauth-setup-modal', state='visible')
    
    # Verify OAuth setup dialog content
    oauth_modal = page.locator('#github-mcp-oauth-setup-modal')
    expect(oauth_modal).to_contain_text("GitHub Copilot MCP Setup")
    expect(oauth_modal).to_contain_text("OAuth Setup Instructions:")
    expect(oauth_modal).to_contain_text("GitHub Developer Settings")
    expect(oauth_modal).to_contain_text("Authorization callback URL")
    
    # Verify client ID input field
    client_id_input = oauth_modal.locator('#github-oauth-client-id')
    expect(client_id_input).to_be_visible()
    expect(client_id_input).to_have_attribute('placeholder', 'Iv1.xxxxxxxxxxxxxxxx')
    
    # Verify start OAuth button
    start_button = oauth_modal.locator('#start-github-oauth')
    expect(start_button).to_be_visible()
    expect(start_button).to_contain_text("Start OAuth Flow")
    
    # Test client ID input
    client_id_input.fill("Iv1.1234567890abcdef")
    expect(client_id_input).to_have_value("Iv1.1234567890abcdef")
    
    # Take screenshot for documentation
    screenshot_with_markdown(
        page, 
        'github_mcp_oauth_setup_dialog',
        "GitHub MCP OAuth setup dialog shows client ID input and instructions for GitHub Developer Settings"
    )
    
    # Close modal
    page.keyboard.press("Escape")
    
    print("✅ GitHub MCP OAuth setup dialog verified!")


@pytest.mark.feature_test
def test_github_mcp_status_methods(page: Page, serve_hacka_re):
    """Test that GitHub MCP integration status methods work correctly"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Dismiss modals
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Test status methods
    result = page.evaluate("""
        (async () => {
            // Initialize GitHub MCP integration
            await window.GitHubMCPIntegration.init();
            
            // Test status methods
            const status = window.GitHubMCPIntegration.getConnectionStatus();
            const isConnected = window.GitHubMCPIntegration.isConnected();
            const tools = window.GitHubMCPIntegration.getAvailableTools();
            
            return {
                hasStatus: !!status,
                statusHasConnectedField: status && typeof status.connected === 'boolean',
                isConnectedIsBoolean: typeof isConnected === 'boolean',
                toolsIsArray: Array.isArray(tools),
                initiallyConnected: isConnected,
                toolCount: tools.length
            };
        })()
    """)
    
    assert result['hasStatus'], "Should return status object"
    assert result['statusHasConnectedField'], "Status should have connected field"
    assert result['isConnectedIsBoolean'], "isConnected should return boolean"
    assert result['toolsIsArray'], "getAvailableTools should return array"
    
    # Initially should not be connected
    assert not result['initiallyConnected'], "Should not be connected initially"
    assert result['toolCount'] == 0, "Should have no tools initially"
    
    print("✅ GitHub MCP status methods verified!")


@pytest.mark.feature_test
def test_github_mcp_server_url_configuration(page: Page, serve_hacka_re):
    """Test that GitHub MCP server uses the correct URL"""
    
    # Navigate to the app
    page.goto("http://localhost:8000")
    
    # Wait for components to load
    page.wait_for_timeout(2000)
    
    # Test server URL configuration
    result = page.evaluate("""
        (() => {
            const server = new window.GitHubMCPServer();
            return {
                serverUrl: server.serverUrl,
                serverName: server.serverName,
                isCorrectUrl: server.serverUrl === 'https://api.githubcopilot.com/mcp/'
            };
        })()
    """)
    
    assert result['isCorrectUrl'], f"Server URL should be 'https://api.githubcopilot.com/mcp/', got '{result['serverUrl']}'"
    assert result['serverName'] == 'github-copilot-mcp', f"Server name should be 'github-copilot-mcp', got '{result['serverName']}'"
    
    print("✅ GitHub MCP server URL configuration verified!")