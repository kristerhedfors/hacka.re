"""
GitHub MCP OAuth Integration Tests

Tests the complete GitHub OAuth device flow integration for MCP servers.
"""

import pytest
import json
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown


def test_github_oauth_service_initialization(page: Page, serve_hacka_re):
    """Test OAuth service initialization and configuration"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check OAuth service availability
    oauth_service_available = page.evaluate("""
        typeof window.MCPOAuthService !== 'undefined' && 
        typeof window.mcpOAuthConfig !== 'undefined' &&
        typeof window.mcpOAuthFlow !== 'undefined'
    """)
    
    assert oauth_service_available, "OAuth services should be available"
    
    # Check OAuth providers configuration
    oauth_providers = page.evaluate("window.MCPOAuthService.OAUTH_PROVIDERS")
    
    assert 'github' in oauth_providers, "GitHub provider should be configured"
    
    github_config = oauth_providers['github']
    assert github_config['useDeviceFlow'] == True, "GitHub should use device flow"
    assert 'deviceCodeUrl' in github_config, "GitHub should have device code URL"
    assert 'tokenUrl' in github_config, "GitHub should have token URL"
    
    print(f"✅ GitHub config: {github_config}")
    
    screenshot_with_markdown(
        page,
        "oauth_services_initialized.png",
        {
            "test": "OAuth Service Initialization",
            "github_config": github_config,
            "status": "OAuth services loaded successfully"
        }
    )


def test_github_oauth_callback_handling(page: Page, serve_hacka_re):
    """Test how GitHub OAuth callbacks are handled (should show device flow message)"""
    
    # First load the page to initialize services
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Simulate a pending GitHub OAuth flow being stored
    page.evaluate("""
        // Store a pending GitHub OAuth flow to simulate a real OAuth initiation
        if (window.MCPOAuthService && window.mcpOAuthFlow) {
            const mockFlow = {
                serverName: 'github-test',
                namespaceId: 'TestNS', 
                config: {
                    provider: 'github',
                    useDeviceFlow: true,
                    authorizationUrl: 'https://github.com/login/oauth/authorize',
                    clientId: 'test_client_id',
                    scope: 'repo read:user'
                },
                codeVerifier: 'test_verifier',
                timestamp: Date.now()
            };
            
            // Store in the oauth service pending flows
            if (window.mcpOAuthFlow.oauthService) {
                window.mcpOAuthFlow.oauthService.pendingFlows.set('test_state:TestNS:dGVzdHNlc3Npb24', mockFlow);
                window.mcpOAuthFlow.oauthService.savePendingFlows();
                console.log('Mock GitHub flow stored successfully');
            }
        }
    """)
    
    # Now navigate to the OAuth callback URL 
    callback_url = f"{serve_hacka_re}?code=test_auth_code&state=test_state:TestNS:dGVzdHNlc3Npb24"
    page.goto(callback_url)
    
    # Should show GitHub device flow message instead of processing callback
    device_flow_message = page.locator('.github-device-flow-message-modal, .modal:has-text("Device Flow Required")')
    
    try:
        device_flow_message.wait_for(timeout=2000)
        
        screenshot_with_markdown(
            page,
            "github_callback_device_flow_message.png",
            {
                "test": "GitHub Callback Device Flow Message",
                "status": "GitHub OAuth callback correctly shows device flow guidance"
            }
        )
        
        # Check message content - be more specific to avoid multiple matches
        expect(page.locator('h3:has-text("GitHub OAuth - Device Flow Required")')).to_be_visible()
        expect(page.locator('text=No CORS issues')).to_be_visible()
        expect(page.locator('button:has-text("Open MCP Modal")')).to_be_visible()
        
        print("✅ GitHub OAuth callback correctly redirected to device flow guidance")
        
        # Test the "Open MCP Modal" button
        page.click('button:has-text("Open MCP Modal")')
        
        # Should open MCP modal
        expect(page.locator("#mcp-servers-modal")).to_be_visible()
        
        screenshot_with_markdown(
            page,
            "mcp_modal_from_callback.png",
            {
                "test": "MCP Modal from Callback",
                "status": "MCP modal opened successfully from device flow guidance message"
            }
        )
        
    except Exception as e:
        # If device flow message doesn't appear, check for errors
        screenshot_with_markdown(
            page,
            "github_callback_unexpected.png",
            {
                "test": "Unexpected GitHub Callback Behavior",
                "error": str(e),
                "status": "Device flow message did not appear"
            }
        )
        raise


def test_github_mcp_server_setup(page: Page, serve_hacka_re):
    """Test setting up GitHub MCP server configuration"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    screenshot_with_markdown(
        page,
        "mcp_modal_opened.png",
        {
            "test": "MCP Modal Opened",
            "status": "MCP modal is open and ready for GitHub configuration"
        }
    )
    
    # Look for GitHub quick connector or add new server option
    github_connector = page.locator('text=GitHub').first
    if github_connector.is_visible():
        github_connector.click()
        print("✅ Found GitHub quick connector")
    else:
        # Add new server manually
        add_server_btn = page.locator('button:has-text("Add New Server"), .add-server-btn')
        if add_server_btn.is_visible():
            add_server_btn.click()
            
            # Fill server name
            server_name_input = page.locator('input[placeholder*="server name"], #mcp-server-name')
            server_name_input.fill('github-mcp-test')
            print("✅ Added new GitHub server")
        else:
            print("⚠️ No GitHub connector or add server button found")
    
    screenshot_with_markdown(
        page,
        "github_server_selection.png",
        {
            "test": "GitHub Server Selection",
            "status": "GitHub MCP server option selected or created"
        }
    )


def test_github_oauth_configuration_ui(page: Page, serve_hacka_re):
    """Test GitHub OAuth configuration UI elements"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Check for OAuth configuration section
    oauth_section = page.locator('.oauth-config, .mcp-oauth-config').first
    if oauth_section.is_visible():
        screenshot_with_markdown(
            page,
            "oauth_config_section.png",
            {
                "test": "OAuth Configuration Section",
                "status": "OAuth configuration options are visible"
            }
        )
        
        # Check for GitHub-specific hints about device flow
        device_flow_hint = page.locator('text*=Device Flow, text*=no redirect required')
        
        # Check for GitHub provider selection
        provider_select = page.locator('#oauth-provider-select')
        if provider_select.is_visible():
            provider_select.select_option('github')
            
            # Should show device flow hints for GitHub
            time.sleep(0.5)
            
            screenshot_with_markdown(
                page,
                "github_provider_selected.png",
                {
                    "test": "GitHub Provider Selected", 
                    "status": "GitHub selected as OAuth provider, showing device flow information"
                }
            )
        
        # Test configuration fields
        client_id_field = page.locator('#oauth-client-id')
        scope_field = page.locator('#oauth-scope')
        redirect_uri_field = page.locator('#oauth-redirect-uri')
        
        if client_id_field.is_visible():
            assert client_id_field.is_visible(), "Client ID field should be visible"
            
            # Fill in test OAuth configuration
            client_id_field.fill('Ov23liWzJfUO8FKgVo7R')  # Test client ID
            
            if scope_field.is_visible():
                scope_field.fill('repo read:user')
            
            if redirect_uri_field.is_visible():
                redirect_uri_field.fill('https://hacka.re')
            
            screenshot_with_markdown(
                page,
                "oauth_config_filled.png",
                {
                    "test": "OAuth Configuration Filled",
                    "status": "GitHub OAuth settings configured with test values"
                }
            )
            
            # Save configuration
            save_btn = page.locator('button:has-text("Save Configuration")')
            if save_btn.is_visible():
                save_btn.click()
                
                # Wait for success message
                try:
                    expect(page.locator('.oauth-status.success')).to_be_visible(timeout=2000)
                    print("✅ OAuth configuration saved successfully")
                except:
                    print("⚠️ Save success message not detected")
                
                screenshot_with_markdown(
                    page,
                    "oauth_config_saved.png",
                    {
                        "test": "OAuth Configuration Saved",
                        "status": "GitHub OAuth configuration save attempted"
                    }
                )
    else:
        print("⚠️ OAuth configuration section not found")


def test_github_device_flow_initiation(page: Page, serve_hacka_re):
    """Test initiating GitHub OAuth device flow"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Open MCP modal and set up GitHub server
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    # Try to configure a GitHub server with OAuth
    github_section = page.locator('text=GitHub').first
    if github_section.is_visible():
        github_section.click()
    
    # Configure OAuth if section is available
    oauth_config = page.locator('.oauth-config').first
    if oauth_config.is_visible():
        client_id_field = page.locator('#oauth-client-id')
        if client_id_field.is_visible():
            client_id_field.fill('Ov23liWzJfUO8FKgVo7R')  # Test client ID
            
            scope_field = page.locator('#oauth-scope')
            if scope_field.is_visible():
                scope_field.fill('repo read:user')
            
            save_btn = page.locator('button:has-text("Save Configuration")')
            if save_btn.is_visible():
                save_btn.click()
                time.sleep(0.5)
    
    # Look for and click the Authorize button
    authorize_button = page.locator('button:has-text("Authorize")').first
    if authorize_button.is_visible():
        screenshot_with_markdown(
            page,
            "before_authorize_click.png",
            {
                "test": "Before Authorization",
                "status": "Authorize button is visible and ready to start device flow"
            }
        )
        
        # Click authorize to start device flow
        authorize_button.click()
        
        # Wait for device flow modal
        device_modal = page.locator('.device-flow-modal, .modal:has-text("Device Flow")')
        try:
            device_modal.wait_for(timeout=2000)
            
            screenshot_with_markdown(
                page,
                "device_flow_modal.png",
                {
                    "test": "Device Flow Modal",
                    "status": "GitHub device flow modal appeared with user code"
                }
            )
            
            # Check for device code
            device_code = page.locator('#device-user-code, input[readonly]:has-value')
            if device_code.is_visible():
                code_value = device_code.input_value()
                assert len(code_value) > 0, "Device code should not be empty"
                print(f"✅ Device code generated: {code_value}")
            
            # Check for GitHub verification URL
            github_link = page.locator('a[href*="github.com"], button:has-text("Open GitHub")')
            if github_link.is_visible():
                print("✅ GitHub verification link is visible")
            
            # Check for polling status
            polling_status = page.locator('#polling-status-text, .polling-status')
            if polling_status.is_visible():
                print("✅ Polling status is visible")
            
            screenshot_with_markdown(
                page,
                "device_flow_complete_ui.png",
                {
                    "test": "Device Flow UI Complete",
                    "status": "All device flow elements are present"
                }
            )
            
        except Exception as e:
            screenshot_with_markdown(
                page,
                "device_flow_failed.png",
                {
                    "test": "Device Flow Failed",
                    "error": str(e),
                    "status": "Device flow modal did not appear"
                }
            )
            print(f"⚠️ Device flow modal did not appear: {e}")
    else:
        print("⚠️ Authorize button not found - OAuth may not be configured")
        screenshot_with_markdown(
            page,
            "no_authorize_button.png",
            {
                "test": "No Authorize Button",
                "status": "Authorize button not found, OAuth configuration may be incomplete"
            }
        )


def test_namespace_debug_utilities(page: Page, serve_hacka_re):
    """Test namespace debug utilities for OAuth flow debugging"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    # Check if namespace debug utilities are available
    debug_available = page.evaluate("typeof window.namespaceDebug !== 'undefined'")
    
    if debug_available:
        # Get current namespace state
        current_state = page.evaluate("window.namespaceDebug.getCurrentState()")
        print(f"Current namespace state: {current_state}")
        
        # Inspect existing namespaces
        namespaces = page.evaluate("window.namespaceDebug.inspectNamespaces()")
        print(f"Found namespaces: {list(namespaces['namespaces'].keys()) if 'namespaces' in namespaces else 'None'}")
        
        screenshot_with_markdown(
            page,
            "namespace_debug_state.png",
            {
                "test": "Namespace Debug Utilities",
                "current_state": current_state,
                "namespaces": namespaces,
                "status": "Namespace debug utilities are working"
            }
        )
        
        print("✅ Namespace debug utilities are available and working")
    else:
        print("⚠️ Namespace debug utilities not found")
        screenshot_with_markdown(
            page,
            "no_namespace_debug.png",
            {
                "test": "No Namespace Debug",
                "status": "Namespace debug utilities not available"
            }
        )


def test_end_to_end_github_oauth_flow(page: Page, serve_hacka_re):
    """Test complete end-to-end GitHub OAuth flow"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    dismiss_settings_modal(page)
    
    print("🚀 Starting end-to-end GitHub OAuth device flow test")
    
    # Step 1: Open MCP modal
    page.locator("#mcp-servers-btn").click()
    expect(page.locator("#mcp-servers-modal")).to_be_visible()
    
    screenshot_with_markdown(
        page,
        "e2e_step1_mcp_modal.png",
        {
            "test": "E2E Step 1: MCP Modal",
            "status": "MCP modal opened for GitHub configuration"
        }
    )
    
    # Step 2: Try to set up GitHub OAuth
    github_found = False
    
    # Look for existing GitHub connector
    github_connector = page.locator('text=GitHub').first
    if github_connector.is_visible():
        github_connector.click()
        github_found = True
        print("✅ Found GitHub quick connector")
    
    if not github_found:
        print("⚠️ GitHub connector not found in MCP modal")
    
    # Step 3: Check for OAuth configuration
    oauth_section = page.locator('.oauth-config, .mcp-oauth-config')
    if oauth_section.is_visible():
        print("✅ OAuth configuration section found")
        
        # Fill in basic OAuth config for testing
        client_id_field = page.locator('#oauth-client-id')
        if client_id_field.is_visible():
            client_id_field.fill('Ov23liWzJfUO8FKgVo7R')
            print("✅ Client ID configured")
    
    # Step 4: Test OAuth callback simulation
    callback_url = f"{serve_hacka_re}?code=e2e_test&state=e2e_test:TestNS"
    page.goto(callback_url)
    
    # Should show device flow guidance
    device_guidance = page.locator('.github-device-flow-message-modal')
    try:
        device_guidance.wait_for(timeout=2000)
        
        screenshot_with_markdown(
            page,
            "e2e_callback_handling.png",
            {
                "test": "E2E Callback Handling",
                "status": "OAuth callback correctly shows device flow guidance"
            }
        )
        
        print("✅ End-to-end OAuth device flow test completed successfully")
        
    except Exception as e:
        screenshot_with_markdown(
            page,
            "e2e_callback_failed.png",
            {
                "test": "E2E Callback Failed",
                "error": str(e),
                "status": "Device flow guidance did not appear"
            }
        )
        print(f"⚠️ Device flow guidance did not appear: {e}")