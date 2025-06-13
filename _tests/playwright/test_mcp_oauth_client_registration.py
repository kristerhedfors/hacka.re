"""Tests for MCP OAuth Dynamic Client Registration functionality"""
import pytest
from playwright.sync_api import Page, expect
import json
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


@pytest.mark.oauth
class TestMCPOAuthClientRegistration:
    """Test OAuth dynamic client registration according to RFC 7591"""
    
    def test_client_registration_service_initialization(self, page: Page, serve_hacka_re):
        """Test that client registration service initializes correctly"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Wait for page to load and services to initialize
        page.wait_for_timeout(2000)
        
        # Check that client registration service is available
        service_available = page.evaluate("""
            () => {
                return typeof window.MCPClientRegistration !== 'undefined' && 
                       typeof window.MCPClientRegistration.ClientRegistrationService !== 'undefined';
            }
        """)
        
        assert service_available, "Client registration service should be available"
        
        # Test service can be instantiated
        service_instance = page.evaluate("""
            () => {
                try {
                    const service = new window.MCPClientRegistration.ClientRegistrationService();
                    return {
                        success: true,
                        hasStorageService: typeof service.storageService !== 'undefined',
                        hasCryptoUtils: typeof service.cryptoUtils !== 'undefined',
                        hasRegisterMethod: typeof service.registerClient === 'function'
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert service_instance['success'], f"Service instantiation failed: {service_instance.get('error')}"
        assert service_instance['hasRegisterMethod'], "Service should have registerClient method"
        
        screenshot_with_markdown(page, "OAuth client registration service initialized")

    def test_client_registration_request_building(self, page: Page, serve_hacka_re):
        """Test building of OAuth client registration requests"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        request_test = page.evaluate("""
            () => {
                const service = new window.MCPClientRegistration.ClientRegistrationService();
                
                // Test request building
                const serverName = 'test-server';
                const options = {
                    clientName: 'Test MCP Client',
                    clientUri: 'https://hacka.re',
                    scope: 'read write',
                    customRedirectUri: 'https://example.com/callback'
                };
                
                try {
                    const request = service._buildRegistrationRequest(serverName, options);
                    
                    return {
                        success: true,
                        request: request
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert request_test['success'], f"Request building failed: {request_test.get('error')}"
        
        request = request_test['request']
        assert request['client_name'] == 'Test MCP Client'
        assert request['application_type'] == 'web'
        assert request['grant_types'] == ['authorization_code']
        assert request['response_types'] == ['code']
        assert request['token_endpoint_auth_method'] == 'none'
        assert request['code_challenge_method'] == 'S256'
        assert 'https://example.com/callback' in request['redirect_uris']
        assert request['mcp_client'] == True
        assert request['mcp_server_name'] == 'test-server'
        
        screenshot_with_markdown(page, "Client registration request building test passed")

    def test_redirect_uri_generation(self, page: Page, serve_hacka_re):
        """Test redirect URI generation for different scenarios"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        uri_test = page.evaluate("""
            () => {
                const service = new window.MCPClientRegistration.ClientRegistrationService();
                
                try {
                    // Test with custom redirect URI
                    const withCustom = service._generateRedirectUris('https://custom.example.com/oauth');
                    
                    // Test without custom redirect URI
                    const withoutCustom = service._generateRedirectUris(null);
                    
                    return {
                        success: true,
                        withCustom: withCustom,
                        withoutCustom: withoutCustom
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert uri_test['success'], f"URI generation failed: {uri_test.get('error')}"
        
        with_custom = uri_test['withCustom']
        assert 'https://custom.example.com/oauth' in with_custom
        assert any(uri.endswith('/oauth/callback') for uri in with_custom)
        
        without_custom = uri_test['withoutCustom']
        assert any(uri.endswith('/oauth/callback') for uri in without_custom)
        assert len(without_custom) > 0
        
        screenshot_with_markdown(page, "Redirect URI generation test passed")

    def test_registration_response_processing(self, page: Page, serve_hacka_re):
        """Test processing of OAuth registration responses"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        response_test = page.evaluate("""
            () => {
                const service = new window.MCPClientRegistration.ClientRegistrationService();
                
                const serverName = 'test-server';
                const mockRequest = {
                    client_name: 'Test Client',
                    redirect_uris: ['http://localhost:8000/oauth/callback'],
                    grant_types: ['authorization_code'],
                    scope: 'read write'
                };
                
                const mockResponse = {
                    client_id: 'test_client_123',
                    client_secret: 'secret_456',
                    client_id_issued_at: Math.floor(Date.now() / 1000),
                    client_secret_expires_at: 0,
                    redirect_uris: ['http://localhost:8000/oauth/callback'],
                    grant_types: ['authorization_code'],
                    scope: 'read write',
                    token_endpoint_auth_method: 'none',
                    registration_access_token: 'reg_token_789',
                    registration_client_uri: 'https://api.example.com/register/test_client_123'
                };
                
                try {
                    const processed = service._processRegistrationResponse(mockResponse, serverName, mockRequest);
                    
                    return {
                        success: true,
                        processed: processed
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert response_test['success'], f"Response processing failed: {response_test.get('error')}"
        
        processed = response_test['processed']
        assert processed['client_id'] == 'test_client_123'
        assert processed['client_secret'] == 'secret_456'
        assert processed['server_name'] == 'test-server'
        assert processed['registration_access_token'] == 'reg_token_789'
        assert 'registered_at' in processed
        assert '_original_request' in processed
        assert '_original_response' in processed
        
        screenshot_with_markdown(page, "Registration response processing test passed")

    def test_mock_client_registration_flow(self, page: Page, serve_hacka_re):
        """Test complete client registration flow with mock server"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        registration_test = page.evaluate("""
            async () => {
                const service = new window.MCPClientRegistration.ClientRegistrationService();
                
                // Mock successful registration response
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/register') && options.method === 'POST') {
                        const requestBody = JSON.parse(options.body);
                        return {
                            ok: true,
                            json: async () => ({
                                client_id: 'mcp_client_' + Date.now(),
                                client_secret: 'secret_' + Math.random().toString(36).substr(2, 9),
                                client_id_issued_at: Math.floor(Date.now() / 1000),
                                client_secret_expires_at: 0,
                                redirect_uris: requestBody.redirect_uris,
                                grant_types: requestBody.grant_types,
                                response_types: requestBody.response_types,
                                scope: requestBody.scope,
                                token_endpoint_auth_method: requestBody.token_endpoint_auth_method,
                                client_name: requestBody.client_name,
                                registration_access_token: 'reg_token_' + Math.random().toString(36).substr(2, 9),
                                registration_client_uri: url + '/' + ('mcp_client_' + Date.now())
                            })
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    const result = await service.registerClient(
                        'test-server',
                        'https://api.example.com/register',
                        {
                            clientName: 'Test MCP Client',
                            scope: 'read write mcp'
                        }
                    );
                    
                    window.fetch = originalFetch; // Restore
                    return { success: true, result: result };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert registration_test['success'], f"Registration flow failed: {registration_test.get('error')}"
        
        result = registration_test['result']
        assert result['client_id'].startswith('mcp_client_')
        assert result['client_secret'].startswith('secret_')
        assert result['server_name'] == 'test-server'
        assert result['token_endpoint_auth_method'] == 'none'
        assert 'registration_access_token' in result
        
        screenshot_with_markdown(page, "Mock client registration flow successful")

    def test_registration_error_handling(self, page: Page, serve_hacka_re):
        """Test error handling in client registration"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        error_test = page.evaluate("""
            async () => {
                const service = new window.MCPClientRegistration.ClientRegistrationService();
                
                // Mock registration failure
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/register') && options.method === 'POST') {
                        return {
                            ok: false,
                            status: 400,
                            statusText: 'Bad Request',
                            json: async () => ({
                                error: 'invalid_request',
                                error_description: 'Missing required parameter: client_name'
                            })
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    await service.registerClient(
                        'test-server',
                        'https://api.example.com/register',
                        {}
                    );
                    
                    window.fetch = originalFetch; // Restore
                    return { success: false, message: 'Should have thrown error' };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { 
                        success: true, 
                        errorName: error.name,
                        errorMessage: error.message,
                        errorCode: error.code
                    };
                }
            }
        """)
        
        assert error_test['success'], "Error handling test should succeed"
        assert error_test['errorName'] == 'MCPClientRegistrationError'
        assert 'Registration failed' in error_test['errorMessage']
        assert error_test['errorCode'] == 'invalid_request'
        
        screenshot_with_markdown(page, "Registration error handling test passed")

    def test_credentials_validation(self, page: Page, serve_hacka_re):
        """Test credential validation logic"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        validation_test = page.evaluate("""
            () => {
                const service = new window.MCPClientRegistration.ClientRegistrationService();
                
                const currentTime = Date.now();
                
                // Test valid credentials
                const validCredentials = {
                    client_secret_expires_at: 0, // Never expires
                    registered_at: currentTime
                };
                
                // Test expired credentials
                const expiredCredentials = {
                    client_secret_expires_at: Math.floor((currentTime - 1000) / 1000), // Expired 1 second ago
                    registered_at: currentTime
                };
                
                // Test very old credentials
                const oldCredentials = {
                    client_secret_expires_at: 0,
                    registered_at: currentTime - (366 * 24 * 60 * 60 * 1000) // Over 1 year old
                };
                
                try {
                    return {
                        success: true,
                        valid: service._areCredentialsValid(validCredentials),
                        expired: service._areCredentialsValid(expiredCredentials),
                        old: service._areCredentialsValid(oldCredentials)
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert validation_test['success'], f"Validation test failed: {validation_test.get('error')}"
        assert validation_test['valid'] == True, "Valid credentials should be marked as valid"
        assert validation_test['expired'] == False, "Expired credentials should be marked as invalid"
        assert validation_test['old'] == False, "Very old credentials should be marked as invalid"
        
        screenshot_with_markdown(page, "Credentials validation test passed")

    def test_registration_management_operations(self, page: Page, serve_hacka_re):
        """Test registration update and deletion operations"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        management_test = page.evaluate("""
            async () => {
                const service = new window.MCPClientRegistration.ClientRegistrationService();
                
                // Mock fetch for update and delete operations
                const originalFetch = window.fetch;
                let operationLog = [];
                
                window.fetch = async (url, options) => {
                    operationLog.push({
                        url: url,
                        method: options.method,
                        hasAuth: 'Authorization' in (options.headers || {})
                    });
                    
                    if (options.method === 'PUT') {
                        return {
                            ok: true,
                            json: async () => ({
                                client_id: 'updated_client_123',
                                client_name: 'Updated Client Name',
                                redirect_uris: ['http://localhost:8000/oauth/callback']
                            })
                        };
                    } else if (options.method === 'DELETE') {
                        return {
                            ok: true,
                            json: async () => ({})
                        };
                    }
                    return originalFetch(url, options);
                };
                
                // Mock stored credentials
                service._getStoredCredentials = async (serverName) => {
                    if (serverName === 'test-server') {
                        return {
                            client_id: 'test_client_123',
                            registration_access_token: 'reg_token_123',
                            registration_client_uri: 'https://api.example.com/register/test_client_123',
                            redirect_uris: ['http://localhost:8000/oauth/callback']
                        };
                    }
                    return null;
                };
                
                service._storeCredentials = async (serverName, credentials) => {
                    // Mock storage
                    return;
                };
                
                service._removeStoredCredentials = async (serverName) => {
                    // Mock removal
                    return;
                };
                
                try {
                    // Test update
                    await service.updateClientRegistration('test-server', {
                        client_name: 'Updated Client Name'
                    });
                    
                    // Test delete
                    await service.deleteClientRegistration('test-server');
                    
                    window.fetch = originalFetch; // Restore
                    return { success: true, operations: operationLog };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert management_test['success'], f"Management test failed: {management_test.get('error')}"
        
        operations = management_test['operations']
        assert len(operations) == 2, "Should have update and delete operations"
        
        update_op = operations[0]
        assert update_op['method'] == 'PUT', "First operation should be PUT for update"
        assert update_op['hasAuth'] == True, "Update should include Authorization header"
        
        delete_op = operations[1]
        assert delete_op['method'] == 'DELETE', "Second operation should be DELETE"
        assert delete_op['hasAuth'] == True, "Delete should include Authorization header"
        
        screenshot_with_markdown(page, "Registration management operations test passed")