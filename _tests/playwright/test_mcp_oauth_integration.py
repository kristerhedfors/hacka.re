"""Integration tests for complete MCP OAuth 2.1 flow"""
import pytest
from playwright.sync_api import Page, expect
import json
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


@pytest.mark.oauth
@pytest.mark.integration
class TestMCPOAuthIntegration:
    """Test complete OAuth 2.1 integration flow from discovery to transport"""
    
    def test_complete_oauth_discovery_registration_flow(self, page: Page, serve_hacka_re):
        """Test complete flow from metadata discovery to client registration to authorization"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Wait for all services to load
        page.wait_for_timeout(1000)
        
        complete_flow_test = page.evaluate("""
            async () => {
                // Ensure all services are available
                if (!window.MCPMetadataDiscovery || !window.MCPClientRegistration || !window.MCPOAuthService) {
                    return { success: false, error: 'Required services not available' };
                }
                
                const oauthService = new window.MCPOAuthService.OAuthService();
                
                // Mock complete OAuth server responses
                const originalFetch = window.fetch;
                let discoveryCallCount = 0;
                let registrationCallCount = 0;
                
                window.fetch = async (url, options) => {
                    // Metadata discovery
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        discoveryCallCount++;
                        return {
                            ok: true,
                            json: async () => ({
                                issuer: 'https://oauth.example.com',
                                authorization_endpoint: 'https://oauth.example.com/authorize',
                                token_endpoint: 'https://oauth.example.com/token',
                                registration_endpoint: 'https://oauth.example.com/register',
                                grant_types_supported: ['authorization_code'],
                                response_types_supported: ['code'],
                                code_challenge_methods_supported: ['S256'],
                                scopes_supported: ['read', 'write', 'mcp'],
                                token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
                                pkce_required: true,
                                _discovered: true
                            })
                        };
                    }
                    
                    // Client registration
                    if (url.includes('/register') && options.method === 'POST') {
                        registrationCallCount++;
                        const requestBody = JSON.parse(options.body);
                        return {
                            ok: true,
                            json: async () => ({
                                client_id: 'auto_registered_' + Date.now(),
                                client_secret: null, // Public client
                                client_id_issued_at: Math.floor(Date.now() / 1000),
                                client_secret_expires_at: 0,
                                redirect_uris: requestBody.redirect_uris,
                                grant_types: requestBody.grant_types,
                                response_types: requestBody.response_types,
                                scope: requestBody.scope,
                                token_endpoint_auth_method: 'none',
                                client_name: requestBody.client_name,
                                registration_access_token: 'reg_token_' + Math.random().toString(36).substr(2, 9),
                                registration_client_uri: url + '/' + ('client_' + Date.now())
                            })
                        };
                    }
                    
                    return originalFetch(url, options);
                };
                
                try {
                    // Start complete OAuth flow
                    const config = {
                        mcpServerUrl: 'https://mcp.example.com/api/v1',
                        mcpProtocolVersion: '2024-11-05',
                        scope: 'read write mcp:tools',
                        clientName: 'hacka.re Integration Test Client',
                        clientUri: 'https://hacka.re'
                    };
                    
                    const flowResult = await oauthService.startAuthorizationFlow('integration-test-server', config);
                    
                    // Verify the complete flow
                    const serverInfo = await oauthService.getServerInfo('integration-test-server');
                    const compliance = await oauthService.validateOAuth21Compliance('integration-test-server');
                    
                    window.fetch = originalFetch; // Restore
                    
                    return {
                        success: true,
                        discoveryCallCount: discoveryCallCount,
                        registrationCallCount: registrationCallCount,
                        flowResult: flowResult,
                        serverInfo: serverInfo,
                        compliance: compliance
                    };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message, stack: error.stack };
                }
            }
        """)
        
        assert complete_flow_test['success'], f"Complete flow test failed: {complete_flow_test.get('error')}"
        
        # Verify discovery occurred
        assert complete_flow_test['discoveryCallCount'] >= 1, "Should have performed metadata discovery"
        
        # Verify registration occurred
        assert complete_flow_test['registrationCallCount'] >= 1, "Should have performed client registration"
        
        # Verify flow result
        flow_result = complete_flow_test['flowResult']
        assert 'authorizationUrl' in flow_result
        assert 'metadata' in flow_result
        assert 'clientCredentials' in flow_result
        assert flow_result['metadata']['_discovered'] == True
        
        # Verify server info aggregation
        server_info = complete_flow_test['serverInfo']
        assert server_info['hasMetadata'] == True
        assert server_info['hasClientRegistration'] == True
        assert server_info['serverName'] == 'integration-test-server'
        
        # Verify compliance validation
        compliance = complete_flow_test['compliance']
        assert compliance['compatible'] == True
        assert compliance['score'] >= 85
        
        screenshot_with_markdown(page, "Complete OAuth discovery-registration flow successful")

    def test_oauth_ui_integration_with_discovery(self, page: Page, serve_hacka_re):
        """Test OAuth UI integration with automatic discovery"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Wait for services to load
        page.wait_for_timeout(1000)
        
        ui_integration_test = page.evaluate("""
            async () => {
                if (!window.mcpOAuthConfig) {
                    return { success: false, error: 'OAuth config not available' };
                }
                
                // Mock discovery for UI testing
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        return {
                            ok: true,
                            json: async () => ({
                                authorization_endpoint: 'https://ui-test.example.com/oauth/authorize',
                                token_endpoint: 'https://ui-test.example.com/oauth/token',
                                registration_endpoint: 'https://ui-test.example.com/oauth/register',
                                code_challenge_methods_supported: ['S256'],
                                _discovered: true
                            })
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    // Test auto-configuration from metadata
                    const autoConfig = await window.mcpOAuthConfig.autoConfigureFromMetadata(
                        'ui-test-server',
                        'https://ui-test.example.com/mcp/v1'
                    );
                    
                    // Test metadata discovery UI display
                    await window.mcpOAuthConfig.discoverMetadata('https://ui-test.example.com/mcp/v1');
                    
                    // Test compliance validation
                    await window.mcpOAuthConfig.validateCompliance('https://ui-test.example.com/mcp/v1');
                    
                    window.fetch = originalFetch; // Restore
                    
                    return {
                        success: true,
                        autoConfig: autoConfig,
                        hasConfiguration: window.mcpOAuthConfig.hasConfiguration('ui-test-server')
                    };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert ui_integration_test['success'], f"UI integration test failed: {ui_integration_test.get('error')}"
        
        auto_config = ui_integration_test['autoConfig']
        assert auto_config['provider'] == 'custom'
        assert auto_config['authorizationUrl'] == 'https://ui-test.example.com/oauth/authorize'
        assert auto_config['_autoConfigured'] == True
        assert auto_config['_suggestRegistration'] == True
        
        assert ui_integration_test['hasConfiguration'] == True
        
        screenshot_with_markdown(page, "OAuth UI integration with discovery successful")

    def test_transport_oauth_integration(self, page: Page, serve_hacka_re):
        """Test OAuth transport integration with services"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        transport_integration_test = page.evaluate("""
            async () => {
                if (!window.MCPTransportService) {
                    return { success: false, error: 'Transport service not available' };
                }
                
                // Create OAuth transport
                const config = {
                    type: 'oauth',
                    url: 'https://transport-test.example.com/mcp',
                    headers: {}
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'transport-test-server');
                
                // Mock OAuth service integration
                transport.oauthService = {
                    validateOAuth21Compliance: async (serverName) => ({
                        compatible: true,
                        issues: [],
                        warnings: [],
                        score: 100
                    }),
                    getAccessToken: async (serverName) => 'mock_access_token_123',
                    getAuthorizationHeader: async (serverName) => ({
                        'Authorization': 'Bearer mock_access_token_123'
                    }),
                    refreshAccessToken: async (serverName) => true,
                    getTokenInfo: (serverName) => ({
                        hasToken: true,
                        isExpired: false,
                        remainingLifetime: 3600,
                        scope: 'read write mcp:tools'
                    }),
                    getServerConfig: (serverName) => ({
                        mcpServerUrl: 'https://transport-test.example.com/mcp',
                        authorized: true
                    })
                };
                
                try {
                    // Test OAuth status
                    const status = transport.getOAuthStatus();
                    
                    // Test connection test
                    const connectionTest = await transport.testOAuthConnection();
                    
                    // Test compliance validation during connection
                    transport.connected = false; // Reset
                    await transport.connect();
                    
                    return {
                        success: true,
                        status: status,
                        connectionTest: connectionTest,
                        connected: transport.connected
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert transport_integration_test['success'], f"Transport integration test failed: {transport_integration_test.get('error')}"
        
        status = transport_integration_test['status']
        assert status['available'] == True
        assert status['authenticated'] == True
        
        connection_test = transport_integration_test['connectionTest']
        assert connection_test['success'] == True
        
        assert transport_integration_test['connected'] == True
        
        screenshot_with_markdown(page, "OAuth transport integration successful")

    def test_end_to_end_oauth_mcp_scenario(self, page: Page, serve_hacka_re):
        """Test end-to-end OAuth MCP scenario with all components"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Ensure all modals are closed before testing
        page.evaluate("""
            () => {
                // Close any open modals
                const modals = document.querySelectorAll('.modal.active');
                modals.forEach(modal => {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                });
            }
        """)
        
        # Wait a moment for modals to close
        page.wait_for_timeout(500)
        
        # Open MCP modal to test real UI integration
        mcp_button = page.locator("#mcp-servers-btn")
        expect(mcp_button).to_be_visible(timeout=2000)
        mcp_button.click()
        
        # Wait for modal to open
        modal = page.locator("#mcp-servers-modal")
        expect(modal).to_be_visible(timeout=2000)
        
        screenshot_with_markdown(page, "MCP modal opened for OAuth testing")
        
        # Test OAuth transport selection in UI
        transport_select = page.locator("#mcp-transport")
        if transport_select.is_visible():
            transport_select.select_option("oauth")
            screenshot_with_markdown(page, "OAuth transport selected in UI")
        
        # Test programmatic OAuth flow
        e2e_test = page.evaluate("""
            async () => {
                try {
                    // Simulate complete MCP OAuth setup
                    const mcpManager = window.mcpManager || {};
                    
                    // Mock OAuth-enabled MCP server
                    const mockServer = {
                        name: 'e2e-oauth-server',
                        url: 'https://e2e-test.example.com/mcp',
                        transport: 'oauth',
                        oauthConfig: {
                            mcpServerUrl: 'https://e2e-test.example.com/mcp',
                            scope: 'mcp:tools mcp:resources',
                            clientName: 'hacka.re E2E Test'
                        }
                    };
                    
                    // Mock complete OAuth server response
                    const originalFetch = window.fetch;
                    window.fetch = async (url, options) => {
                        if (url.includes('/.well-known/oauth-authorization-server')) {
                            return {
                                ok: true,
                                json: async () => ({
                                    authorization_endpoint: 'https://e2e-test.example.com/oauth/authorize',
                                    token_endpoint: 'https://e2e-test.example.com/oauth/token',
                                    registration_endpoint: 'https://e2e-test.example.com/oauth/register',
                                    code_challenge_methods_supported: ['S256'],
                                    grant_types_supported: ['authorization_code'],
                                    pkce_required: true,
                                    _discovered: true
                                })
                            };
                        }
                        
                        if (url.includes('/register') && options.method === 'POST') {
                            return {
                                ok: true,
                                json: async () => ({
                                    client_id: 'e2e_client_' + Date.now(),
                                    redirect_uris: ['http://localhost:8000/oauth/callback'],
                                    token_endpoint_auth_method: 'none'
                                })
                            };
                        }
                        
                        return originalFetch(url, options);
                    };
                    
                    // Test discovery + registration + flow initiation
                    if (window.MCPOAuthService) {
                        const oauthService = new window.MCPOAuthService.OAuthService();
                        
                        const flowResult = await oauthService.startAuthorizationFlow(
                            mockServer.name,
                            mockServer.oauthConfig
                        );
                        
                        const serverList = await oauthService.listServers();
                        
                        window.fetch = originalFetch; // Restore
                        
                        return {
                            success: true,
                            flowResult: flowResult,
                            serverCount: serverList.length,
                            hasAuthUrl: 'authorizationUrl' in flowResult,
                            hasMetadata: 'metadata' in flowResult,
                            hasCredentials: 'clientCredentials' in flowResult
                        };
                    } else {
                        return { success: false, error: 'OAuth service not available' };
                    }
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert e2e_test['success'], f"E2E test failed: {e2e_test.get('error')}"
        assert e2e_test['hasAuthUrl'] == True, "Should have authorization URL"
        assert e2e_test['hasMetadata'] == True, "Should have discovered metadata"
        assert e2e_test['hasCredentials'] == True, "Should have registered client credentials"
        assert e2e_test['serverCount'] >= 1, "Should have at least one configured server"
        
        screenshot_with_markdown(page, "End-to-end OAuth MCP scenario successful")
        
        # Close modal
        close_button = page.locator("#close-mcp-modal")
        if close_button.is_visible():
            close_button.click()

    def test_oauth_error_recovery_integration(self, page: Page, serve_hacka_re):
        """Test error recovery and fallback mechanisms across components"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        error_recovery_test = page.evaluate("""
            async () => {
                if (!window.MCPOAuthService) {
                    return { success: false, error: 'OAuth service not available' };
                }
                
                const oauthService = new window.MCPOAuthService.OAuthService();
                
                // Mock failing then succeeding responses
                const originalFetch = window.fetch;
                let fetchCallCount = 0;
                
                window.fetch = async (url, options) => {
                    fetchCallCount++;
                    
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        if (fetchCallCount <= 2) {
                            // First calls fail
                            return { ok: false, status: 404 };
                        } else {
                            // Later calls succeed
                            return {
                                ok: true,
                                json: async () => ({
                                    authorization_endpoint: 'https://recovery-test.example.com/oauth/authorize',
                                    token_endpoint: 'https://recovery-test.example.com/oauth/token',
                                    _discovered: true
                                })
                            };
                        }
                    }
                    
                    return originalFetch(url, options);
                };
                
                try {
                    // First attempt - should use fallback
                    const fallbackResult = await oauthService.startAuthorizationFlow('recovery-test-1', {
                        mcpServerUrl: 'https://recovery-test.example.com/mcp',
                        clientId: 'test_client',
                        redirectUri: 'http://localhost:8000/callback'
                    });
                    
                    // Second attempt - should succeed with discovery
                    const discoveryResult = await oauthService.startAuthorizationFlow('recovery-test-2', {
                        mcpServerUrl: 'https://recovery-test.example.com/mcp',
                        clientId: 'test_client',
                        redirectUri: 'http://localhost:8000/callback'
                    });
                    
                    window.fetch = originalFetch; // Restore
                    
                    return {
                        success: true,
                        fallbackUsed: !fallbackResult.metadata || fallbackResult.metadata._fallback,
                        discoverySucceeded: discoveryResult.metadata && discoveryResult.metadata._discovered,
                        fetchCallCount: fetchCallCount
                    };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert error_recovery_test['success'], f"Error recovery test failed: {error_recovery_test.get('error')}"
        assert error_recovery_test['fetchCallCount'] >= 3, "Should have made multiple fetch attempts"
        
        screenshot_with_markdown(page, "OAuth error recovery integration successful")

    def test_oauth_specification_compliance_verification(self, page: Page, serve_hacka_re):
        """Test verification of OAuth 2.1 specification compliance across all components"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        compliance_verification = page.evaluate("""
            async () => {
                const results = {
                    metadataDiscovery: false,
                    clientRegistration: false,
                    oauthService: false,
                    transport: false,
                    pkceSupport: false,
                    oauth21Features: false
                };
                
                try {
                    // Test metadata discovery compliance
                    if (window.MCPMetadataDiscovery) {
                        const metadataService = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                        const compliance = metadataService.validateOAuth21Compatibility({
                            grant_types_supported: ['authorization_code'],
                            code_challenge_methods_supported: ['S256'],
                            pkce_required: true,
                            response_types_supported: ['code']
                        });
                        results.metadataDiscovery = compliance.compatible;
                    }
                    
                    // Test client registration compliance
                    if (window.MCPClientRegistration) {
                        const registrationService = new window.MCPClientRegistration.ClientRegistrationService();
                        const request = registrationService._buildRegistrationRequest('test', {});
                        results.clientRegistration = (
                            request.grant_types.includes('authorization_code') &&
                            request.response_types.includes('code') &&
                            request.code_challenge_method === 'S256' &&
                            request.token_endpoint_auth_method === 'none'
                        );
                    }
                    
                    // Test OAuth service compliance
                    if (window.MCPOAuthService) {
                        const oauthService = new window.MCPOAuthService.OAuthService();
                        results.oauthService = typeof oauthService.validateOAuth21Compliance === 'function';
                    }
                    
                    // Test transport compliance
                    if (window.MCPTransportService) {
                        const transport = window.MCPTransportService.TransportFactory.createTransport({
                            type: 'oauth',
                            url: 'https://test.example.com/mcp'
                        }, 'test-server');
                        results.transport = typeof transport.getOAuthStatus === 'function';
                    }
                    
                    // Test PKCE support
                    if (window.MCPOAuthService && window.MCPOAuthService.PKCEHelper) {
                        const verifier = window.MCPOAuthService.PKCEHelper.generateCodeVerifier();
                        const challenge = await window.MCPOAuthService.PKCEHelper.generateCodeChallenge(verifier);
                        results.pkceSupport = verifier.length >= 43 && challenge.length > 0;
                    }
                    
                    // Test OAuth 2.1 specific features
                    results.oauth21Features = (
                        results.metadataDiscovery &&
                        results.clientRegistration &&
                        results.pkceSupport
                    );
                    
                    return { success: true, results: results };
                } catch (error) {
                    return { success: false, error: error.message, results: results };
                }
            }
        """)
        
        assert compliance_verification['success'], f"Compliance verification failed: {compliance_verification.get('error')}"
        
        results = compliance_verification['results']
        assert results['metadataDiscovery'] == True, "Metadata discovery should be OAuth 2.1 compliant"
        assert results['clientRegistration'] == True, "Client registration should be OAuth 2.1 compliant"
        assert results['oauthService'] == True, "OAuth service should have compliance methods"
        assert results['transport'] == True, "Transport should have OAuth status methods"
        assert results['pkceSupport'] == True, "PKCE support should be implemented"
        assert results['oauth21Features'] == True, "All OAuth 2.1 features should be present"
        
        screenshot_with_markdown(page, "OAuth 2.1 specification compliance verification successful")