"""Tests for Enhanced MCP OAuth Service with metadata discovery and client registration"""
import pytest
from playwright.sync_api import Page, expect
import json
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


@pytest.mark.oauth
class TestMCPOAuthEnhancedService:
    """Test enhanced OAuth service with automatic discovery and registration"""
    
    def test_enhanced_oauth_service_initialization(self, page: Page, serve_hacka_re):
        """Test that enhanced OAuth service initializes with new capabilities"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Wait for page to load and services to initialize
        page.wait_for_timeout(2000)
        
        # Check enhanced OAuth service capabilities
        service_capabilities = page.evaluate("""
            () => {
                if (!window.MCPOAuthService) return { available: false };
                
                try {
                    const service = new window.MCPOAuthService.OAuthService();
                    
                    return {
                        available: true,
                        hasMetadataService: typeof service.metadataService !== 'undefined',
                        hasRegistrationService: typeof service.registrationService !== 'undefined',
                        hasEnhancedMethods: typeof service.getServerInfo === 'function' &&
                                           typeof service.validateOAuth21Compliance === 'function' &&
                                           typeof service.listServers === 'function',
                        hasAutoFlow: typeof service.startAuthorizationFlow === 'function'
                    };
                } catch (error) {
                    return { available: false, error: error.message };
                }
            }
        """)
        
        assert service_capabilities['available'], f"Enhanced OAuth service not available: {service_capabilities.get('error')}"
        assert service_capabilities['hasEnhancedMethods'], "Service should have enhanced methods"
        
        screenshot_with_markdown(page, "Enhanced OAuth service initialized successfully")

    def test_authorization_flow_with_metadata_discovery(self, page: Page, serve_hacka_re):
        """Test authorization flow with automatic metadata discovery"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        auto_flow_test = page.evaluate("""
            async () => {
                const service = new window.MCPOAuthService.OAuthService();
                
                // Mock metadata discovery response
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        return {
                            ok: true,
                            json: async () => ({
                                authorization_endpoint: 'https://api.example.com/oauth/authorize',
                                token_endpoint: 'https://api.example.com/oauth/token',
                                registration_endpoint: 'https://api.example.com/oauth/register',
                                code_challenge_methods_supported: ['S256'],
                                grant_types_supported: ['authorization_code'],
                                _discovered: true
                            })
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    const config = {
                        mcpServerUrl: 'https://api.example.com/mcp',
                        clientId: 'test_client',
                        redirectUri: 'http://localhost:8000/callback',
                        scope: 'read write'
                    };
                    
                    const result = await service.startAuthorizationFlow('test-server', config);
                    
                    window.fetch = originalFetch; // Restore
                    return { success: true, result: result };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert auto_flow_test['success'], f"Auto flow test failed: {auto_flow_test.get('error')}"
        
        result = auto_flow_test['result']
        assert 'authorizationUrl' in result
        assert 'metadata' in result
        assert result['metadata']['_discovered'] == True
        assert 'oauth/authorize' in result['authorizationUrl']
        
        screenshot_with_markdown(page, "Authorization flow with metadata discovery successful")

    def test_authorization_flow_with_client_registration(self, page: Page, serve_hacka_re):
        """Test authorization flow with automatic client registration"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        registration_flow_test = page.evaluate("""
            async () => {
                const service = new window.MCPOAuthService.OAuthService();
                
                // Mock both metadata discovery and client registration
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        return {
                            ok: true,
                            json: async () => ({
                                authorization_endpoint: 'https://api.example.com/oauth/authorize',
                                token_endpoint: 'https://api.example.com/oauth/token',
                                registration_endpoint: 'https://api.example.com/oauth/register',
                                code_challenge_methods_supported: ['S256'],
                                grant_types_supported: ['authorization_code']
                            })
                        };
                    } else if (url.includes('/oauth/register') && options.method === 'POST') {
                        return {
                            ok: true,
                            json: async () => ({
                                client_id: 'auto_registered_client_123',
                                client_secret: 'auto_secret_456',
                                redirect_uris: ['http://localhost:8000/oauth/callback'],
                                registration_access_token: 'reg_token_789'
                            })
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    const config = {
                        mcpServerUrl: 'https://api.example.com/mcp',
                        scope: 'read write',
                        clientName: 'Auto-registered MCP Client'
                    };
                    
                    const result = await service.startAuthorizationFlow('auto-server', config);
                    
                    window.fetch = originalFetch; // Restore
                    return { success: true, result: result };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert registration_flow_test['success'], f"Registration flow test failed: {registration_flow_test.get('error')}"
        
        result = registration_flow_test['result']
        assert 'authorizationUrl' in result
        assert 'clientCredentials' in result
        assert result['clientCredentials']['client_id'] == 'auto_registered_client_123'
        assert 'auto_registered_client_123' in result['authorizationUrl']
        
        screenshot_with_markdown(page, "Authorization flow with client registration successful")

    def test_server_info_aggregation(self, page: Page, serve_hacka_re):
        """Test comprehensive server information aggregation"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        server_info_test = page.evaluate("""
            async () => {
                const service = new window.MCPOAuthService.OAuthService();
                
                // Mock server configuration and credentials
                const mockConfig = {
                    authorizationUrl: 'https://api.example.com/oauth/authorize',
                    tokenUrl: 'https://api.example.com/oauth/token',
                    _metadata: {
                        authorization_endpoint: 'https://api.example.com/oauth/authorize',
                        _discovered: true
                    },
                    _clientCredentials: {
                        client_id: 'test_client_123'
                    }
                };
                
                // Set up mock data
                service.serverConfigs.set('test-server', mockConfig);
                service.tokens.set('test-server', new window.MCPOAuthService.OAuthToken({
                    access_token: 'test_token',
                    expires_in: 3600,
                    issued_at: Date.now()
                }));
                
                try {
                    const serverInfo = await service.getServerInfo('test-server');
                    
                    return { success: true, serverInfo: serverInfo };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert server_info_test['success'], f"Server info test failed: {server_info_test.get('error')}"
        
        info = server_info_test['serverInfo']
        assert info['serverName'] == 'test-server'
        assert info['hasMetadata'] == True
        assert info['hasClientRegistration'] == True
        assert info['isAuthenticated'] == True
        assert info['config'] is not None
        assert info['tokenInfo'] is not None
        
        screenshot_with_markdown(page, "Server information aggregation test passed")

    def test_oauth21_compliance_validation_integration(self, page: Page, serve_hacka_re):
        """Test OAuth 2.1 compliance validation integration"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        compliance_test = page.evaluate("""
            async () => {
                const service = new window.MCPOAuthService.OAuthService();
                
                // Mock server with metadata
                const mockConfig = {
                    _metadata: {
                        grant_types_supported: ['authorization_code'],
                        code_challenge_methods_supported: ['S256'],
                        pkce_required: true
                    }
                };
                
                service.serverConfigs.set('compliant-server', mockConfig);
                
                try {
                    const compliance = await service.validateOAuth21Compliance('compliant-server');
                    
                    return { success: true, compliance: compliance };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert compliance_test['success'], f"Compliance test failed: {compliance_test.get('error')}"
        
        compliance = compliance_test['compliance']
        assert compliance['compatible'] == True, "Server should be OAuth 2.1 compliant"
        
        screenshot_with_markdown(page, "OAuth 2.1 compliance validation integration successful")

    def test_server_listing_functionality(self, page: Page, serve_hacka_re):
        """Test server listing with status information"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        listing_test = page.evaluate("""
            async () => {
                const service = new window.MCPOAuthService.OAuthService();
                
                // Mock multiple servers
                service.serverConfigs.set('server1', {
                    authorizationUrl: 'https://api1.example.com/oauth/authorize',
                    _metadata: { _discovered: true }
                });
                
                service.serverConfigs.set('server2', {
                    authorizationUrl: 'https://api2.example.com/oauth/authorize',
                    _clientCredentials: { client_id: 'client2' }
                });
                
                // Mock token for server1
                service.tokens.set('server1', new window.MCPOAuthService.OAuthToken({
                    access_token: 'token1',
                    expires_in: 3600,
                    issued_at: Date.now()
                }));
                
                try {
                    const servers = await service.listServers();
                    
                    return { success: true, servers: servers };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert listing_test['success'], f"Listing test failed: {listing_test.get('error')}"
        
        servers = listing_test['servers']
        assert len(servers) == 2, f"Should have 2 servers, got {len(servers)}"
        
        server1 = next((s for s in servers if s['serverName'] == 'server1'), None)
        assert server1 is not None, "Server1 should be in list"
        assert server1['hasMetadata'] == True
        assert server1['isAuthenticated'] == True
        
        server2 = next((s for s in servers if s['serverName'] == 'server2'), None)
        assert server2 is not None, "Server2 should be in list"
        assert server2['hasClientRegistration'] == True
        
        screenshot_with_markdown(page, "Server listing functionality test passed")

    def test_enhanced_pkce_generation(self, page: Page, serve_hacka_re):
        """Test enhanced PKCE generation using TweetNaCl"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        pkce_test = page.evaluate("""
            () => {
                // Test secure code verifier generation
                const standard = window.MCPOAuthService.PKCEHelper.generateCodeVerifier();
                const enhanced = window.MCPOAuthService.OAuthService.generateSecureCodeVerifier();
                
                return {
                    standard: {
                        length: standard.length,
                        type: typeof standard
                    },
                    enhanced: {
                        length: enhanced.length,
                        type: typeof enhanced
                    }
                };
            }
        """)
        
        assert pkce_test['standard']['type'] == 'string', "Standard PKCE should return string"
        assert pkce_test['enhanced']['type'] == 'string', "Enhanced PKCE should return string"
        assert pkce_test['enhanced']['length'] >= 43, "Enhanced PKCE should be sufficiently long"
        
        screenshot_with_markdown(page, "Enhanced PKCE generation test passed")

    def test_server_registration_deletion(self, page: Page, serve_hacka_re):
        """Test complete server registration deletion"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        deletion_test = page.evaluate("""
            async () => {
                const service = new window.MCPOAuthService.OAuthService();
                
                // Mock server with token and config
                service.serverConfigs.set('test-server', {
                    authorizationUrl: 'https://api.example.com/oauth/authorize'
                });
                
                service.tokens.set('test-server', new window.MCPOAuthService.OAuthToken({
                    access_token: 'test_token',
                    expires_in: 3600
                }));
                
                // Check initial state
                const initialServers = await service.listServers();
                const initialCount = initialServers.length;
                
                try {
                    // Delete server registration
                    await service.deleteServerRegistration('test-server');
                    
                    // Check final state
                    const finalServers = await service.listServers();
                    const finalCount = finalServers.length;
                    
                    return { 
                        success: true, 
                        initialCount: initialCount,
                        finalCount: finalCount,
                        hasConfig: service.serverConfigs.has('test-server'),
                        hasToken: service.tokens.has('test-server')
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert deletion_test['success'], f"Deletion test failed: {deletion_test.get('error')}"
        assert deletion_test['hasConfig'] == False, "Server config should be removed"
        assert deletion_test['hasToken'] == False, "Server token should be removed"
        assert deletion_test['finalCount'] < deletion_test['initialCount'], "Server count should decrease"
        
        screenshot_with_markdown(page, "Server registration deletion test passed")

    def test_error_handling_in_enhanced_flows(self, page: Page, serve_hacka_re):
        """Test error handling in enhanced authorization flows"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        error_handling_test = page.evaluate("""
            async () => {
                const service = new window.MCPOAuthService.OAuthService();
                
                // Mock metadata discovery failure
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        throw new Error('Network error');
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    const config = {
                        mcpServerUrl: 'https://failing.example.com/mcp',
                        clientId: 'test_client',
                        redirectUri: 'http://localhost:8000/callback',
                        scope: 'read'
                    };
                    
                    const result = await service.startAuthorizationFlow('failing-server', config);
                    
                    window.fetch = originalFetch; // Restore
                    return { success: true, result: result };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message, errorName: error.name };
                }
            }
        """)
        
        # Should succeed even with metadata discovery failure (fallback)
        if error_handling_test['success']:
            # Flow succeeded with fallback
            assert 'authorizationUrl' in error_handling_test['result']
        else:
            # Or properly handled error
            assert 'flow startup failed' in error_handling_test['error'].lower() or 'network error' in error_handling_test['error'].lower()
        
        screenshot_with_markdown(page, "Error handling in enhanced flows test completed")