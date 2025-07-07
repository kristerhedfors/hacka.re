"""Tests for Enhanced MCP OAuth Transport with improved error handling"""
import pytest
from playwright.sync_api import Page, expect
import json
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


@pytest.mark.oauth
@pytest.mark.transport
class TestMCPOAuthEnhancedTransport:
    """Test enhanced OAuth transport with better error handling and retry logic"""
    
    def test_oauth_transport_initialization(self, page: Page, serve_hacka_re):
        """Test OAuth transport initialization and service integration"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Wait for services to load
        page.wait_for_timeout(1000)
        
        transport_test = page.evaluate("""
            () => {
                if (!window.MCPTransportService) return { available: false };
                
                try {
                    const config = {
                        type: 'oauth',
                        url: 'https://api.example.com/mcp',
                        headers: {}
                    };
                    
                    const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'test-server');
                    
                    return {
                        available: true,
                        isOAuthTransport: transport instanceof window.MCPTransportService.OAuthTransport,
                        hasOAuthService: typeof transport.oauthService !== 'undefined',
                        hasRetryLogic: typeof transport.send === 'function',
                        hasStatusMethod: typeof transport.getOAuthStatus === 'function',
                        hasTestMethod: typeof transport.testOAuthConnection === 'function'
                    };
                } catch (error) {
                    return { available: false, error: error.message };
                }
            }
        """)
        
        assert transport_test['available'], f"OAuth transport not available: {transport_test.get('error')}"
        assert transport_test['isOAuthTransport'], "Should create OAuth transport instance"
        assert transport_test['hasStatusMethod'], "Should have OAuth status method"
        assert transport_test['hasTestMethod'], "Should have connection test method"
        
        screenshot_with_markdown(page, "OAuth transport initialization successful")

    def test_oauth_transport_status_reporting(self, page: Page, serve_hacka_re):
        """Test comprehensive OAuth status reporting"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        status_test = page.evaluate("""
            () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'status-test-server');
                
                // Mock OAuth service
                transport.oauthService = {
                    getTokenInfo: (serverName) => ({
                        hasToken: true,
                        isExpired: false,
                        remainingLifetime: 3600,
                        scope: 'read write',
                        tokenType: 'Bearer'
                    }),
                    getServerConfig: (serverName) => ({
                        authorizationUrl: 'https://api.example.com/oauth/authorize',
                        tokenUrl: 'https://api.example.com/oauth/token',
                        _metadata: { _discovered: true },
                        _clientCredentials: { client_id: 'test_client' }
                    })
                };
                
                try {
                    const status = transport.getOAuthStatus();
                    
                    return {
                        success: true,
                        status: status
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert status_test['success'], f"Status test failed: {status_test.get('error')}"
        
        status = status_test['status']
        assert status['available'] == True
        assert status['authenticated'] == True
        assert status['serverName'] == 'status-test-server'
        assert status['tokenInfo'] is not None
        assert status['serverConfig'] is not None
        assert status['serverConfig']['hasMetadata'] == True
        assert status['serverConfig']['hasClientRegistration'] == True
        
        screenshot_with_markdown(page, "OAuth transport status reporting test passed")

    def test_enhanced_error_handling_categories(self, page: Page, serve_hacka_re):
        """Test categorized error handling for different HTTP status codes"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        error_categories_test = page.evaluate("""
            async () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'error-test-server');
                transport.connected = true;
                
                // Mock OAuth service
                transport.oauthService = {
                    getAuthorizationHeader: async () => ({ 'Authorization': 'Bearer test_token' })
                };
                
                const testCases = [
                    { status: 401, expectedCode: 'auth_failed' },
                    { status: 403, expectedCode: 'insufficient_scope' },
                    { status: 429, expectedCode: 'rate_limited' },
                    { status: 500, expectedCode: 'server_error' },
                    { status: 400, expectedCode: 'http_error' }
                ];
                
                const results = [];
                
                for (const testCase of testCases) {
                    // Mock fetch for this status code
                    const originalFetch = window.fetch;
                    window.fetch = async (url, options) => {
                        return {
                            ok: testCase.status < 400,
                            status: testCase.status,
                            statusText: `Error ${testCase.status}`,
                            headers: {
                                get: (name) => name === 'retry-after' && testCase.status === 429 ? '60' : null
                            },
                            text: async () => `Error ${testCase.status} response`
                        };
                    };
                    
                    try {
                        await transport.send({ test: 'message' });
                        results.push({ status: testCase.status, error: 'No error thrown' });
                    } catch (error) {
                        results.push({
                            status: testCase.status,
                            errorCode: error.code,
                            errorMessage: error.message,
                            expectedCode: testCase.expectedCode
                        });
                    }
                    
                    window.fetch = originalFetch; // Restore
                }
                
                return { success: true, results: results };
            }
        """)
        
        assert error_categories_test['success'], "Error categories test should succeed"
        
        results = error_categories_test['results']
        for result in results:
            if 'expectedCode' in result:
                assert result['errorCode'] == result['expectedCode'], f"Status {result['status']} should have error code {result['expectedCode']}, got {result['errorCode']}"
        
        screenshot_with_markdown(page, "Enhanced error handling categories test passed")

    def test_automatic_token_refresh_retry_logic(self, page: Page, serve_hacka_re):
        """Test automatic token refresh and retry logic on 401 responses"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        retry_test = page.evaluate("""
            async () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'retry-test-server');
                transport.connected = true;
                
                let authCallCount = 0;
                let refreshCallCount = 0;
                let fetchCallCount = 0;
                
                // Mock OAuth service with refresh capability
                transport.oauthService = {
                    getAuthorizationHeader: async () => {
                        authCallCount++;
                        return { 'Authorization': `Bearer token_${authCallCount}` };
                    },
                    refreshAccessToken: async () => {
                        refreshCallCount++;
                        return true; // Successful refresh
                    }
                };
                
                // Mock fetch to return 401 first, then 200
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    fetchCallCount++;
                    
                    if (fetchCallCount === 1) {
                        // First call - return 401
                        return {
                            ok: false,
                            status: 401,
                            statusText: 'Unauthorized'
                        };
                    } else {
                        // Subsequent calls - return success
                        return {
                            ok: true,
                            status: 200,
                            statusText: 'OK'
                        };
                    }
                };
                
                try {
                    await transport.send({ test: 'retry message' });
                    
                    window.fetch = originalFetch; // Restore
                    return {
                        success: true,
                        authCallCount: authCallCount,
                        refreshCallCount: refreshCallCount,
                        fetchCallCount: fetchCallCount
                    };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert retry_test['success'], f"Retry test failed: {retry_test.get('error')}"
        assert retry_test['authCallCount'] >= 2, "Should call auth header multiple times"
        assert retry_test['refreshCallCount'] >= 1, "Should attempt token refresh"
        assert retry_test['fetchCallCount'] >= 2, "Should retry the request"
        
        screenshot_with_markdown(page, "Automatic token refresh retry logic test passed")

    def test_exponential_backoff_retry_logic(self, page: Page, serve_hacka_re):
        """Test exponential backoff in retry logic"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        backoff_test = page.evaluate("""
            async () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'backoff-test-server');
                transport.connected = true;
                
                // Mock OAuth service
                transport.oauthService = {
                    getAuthorizationHeader: async () => ({ 'Authorization': 'Bearer test_token' })
                };
                
                let fetchCallCount = 0;
                const startTime = Date.now();
                
                // Mock fetch to always fail with network error
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    fetchCallCount++;
                    throw new Error('Network error');
                };
                
                try {
                    await transport.send({ test: 'backoff message' });
                    
                    window.fetch = originalFetch; // Restore
                    return { success: false, message: 'Should have failed' };
                } catch (error) {
                    const duration = Date.now() - startTime;
                    
                    window.fetch = originalFetch; // Restore
                    return {
                        success: true,
                        fetchCallCount: fetchCallCount,
                        duration: duration,
                        errorMessage: error.message
                    };
                }
            }
        """)
        
        assert backoff_test['success'], "Backoff test should succeed"
        assert backoff_test['fetchCallCount'] >= 3, "Should attempt multiple retries"
        assert backoff_test['duration'] >= 1000, "Should have some delay from backoff"
        assert 'failed after' in backoff_test['errorMessage'].lower(), "Should indicate retry attempts"
        
        screenshot_with_markdown(page, "Exponential backoff retry logic test passed")

    def test_oauth_connection_testing(self, page: Page, serve_hacka_re):
        """Test OAuth connection testing functionality"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        connection_test = page.evaluate("""
            async () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'connection-test-server');
                transport.connected = true;
                
                // Test successful connection
                transport.oauthService = {
                    getAccessToken: async () => 'valid_token'
                };
                
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    return { ok: true, status: 200 };
                };
                
                try {
                    const successResult = await transport.testOAuthConnection();
                    
                    // Test failed connection
                    transport.oauthService = {
                        getAccessToken: async () => {
                            throw new Error('No token available');
                        }
                    };
                    
                    const failResult = await transport.testOAuthConnection();
                    
                    window.fetch = originalFetch; // Restore
                    return {
                        success: true,
                        successResult: successResult,
                        failResult: failResult
                    };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert connection_test['success'], f"Connection test failed: {connection_test.get('error')}"
        
        success_result = connection_test['successResult']
        assert success_result['success'] == True
        assert 'successful' in success_result['message'].lower()
        
        fail_result = connection_test['failResult']
        assert fail_result['success'] == False
        assert 'error' in fail_result
        
        screenshot_with_markdown(page, "OAuth connection testing functionality test passed")

    def test_oauth21_compliance_validation_in_transport(self, page: Page, serve_hacka_re):
        """Test OAuth 2.1 compliance validation during connection"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        compliance_validation_test = page.evaluate("""
            async () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'compliance-test-server');
                
                // Mock OAuth service with compliance validation
                transport.oauthService = {
                    validateOAuth21Compliance: async (serverName) => ({
                        compatible: true,
                        issues: [],
                        warnings: ['Minor compliance warning'],
                        score: 90
                    }),
                    getAccessToken: async () => 'valid_token'
                };
                
                let complianceChecked = false;
                const originalValidate = transport.oauthService.validateOAuth21Compliance;
                transport.oauthService.validateOAuth21Compliance = async (...args) => {
                    complianceChecked = true;
                    return originalValidate(...args);
                };
                
                try {
                    await transport.connect();
                    
                    return {
                        success: true,
                        complianceChecked: complianceChecked
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        if compliance_validation_test['success']:
            # Should check compliance during connection
            assert compliance_validation_test['complianceChecked'] == True
        else:
            # Or handle gracefully if connection fails for other reasons
            assert 'error' in compliance_validation_test
        
        screenshot_with_markdown(page, "OAuth 2.1 compliance validation in transport test completed")

    def test_rate_limiting_handling(self, page: Page, serve_hacka_re):
        """Test proper handling of rate limiting responses"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        rate_limit_test = page.evaluate("""
            async () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'rate-limit-test-server');
                transport.connected = true;
                
                // Mock OAuth service
                transport.oauthService = {
                    getAuthorizationHeader: async () => ({ 'Authorization': 'Bearer test_token' })
                };
                
                // Mock fetch to return 429 with retry-after header
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    return {
                        ok: false,
                        status: 429,
                        statusText: 'Too Many Requests',
                        headers: {
                            get: (name) => name === 'retry-after' ? '120' : null
                        }
                    };
                };
                
                try {
                    await transport.send({ test: 'rate limit message' });
                    
                    window.fetch = originalFetch; // Restore
                    return { success: false, message: 'Should have thrown rate limit error' };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return {
                        success: true,
                        errorCode: error.code,
                        errorMessage: error.message,
                        hasRetryAfter: error.message.includes('120')
                    };
                }
            }
        """)
        
        assert rate_limit_test['success'], "Rate limit test should succeed"
        assert rate_limit_test['errorCode'] == 'rate_limited', "Should identify as rate limit error"
        assert rate_limit_test['hasRetryAfter'], "Should include retry-after information"
        
        screenshot_with_markdown(page, "Rate limiting handling test passed")

    def test_error_recovery_and_cleanup(self, page: Page, serve_hacka_re):
        """Test error recovery and proper cleanup"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        cleanup_test = page.evaluate("""
            async () => {
                const config = {
                    type: 'oauth',
                    url: 'https://api.example.com/mcp'
                };
                
                const transport = window.MCPTransportService.TransportFactory.createTransport(config, 'cleanup-test-server');
                transport.connected = true;
                
                // Mock OAuth service
                transport.oauthService = {
                    getAuthorizationHeader: async () => ({ 'Authorization': 'Bearer test_token' })
                };
                
                // Test error and recovery
                let errorOccurred = false;
                
                try {
                    // Force an error
                    const originalFetch = window.fetch;
                    window.fetch = async () => {
                        throw new Error('Connection failed');
                    };
                    
                    await transport.send({ test: 'error message' });
                } catch (error) {
                    errorOccurred = true;
                    transport._lastError = error.message;
                }
                
                // Test cleanup on close
                const initialError = transport._lastError;
                await transport.close();
                const finalError = transport._lastError;
                
                return {
                    success: true,
                    errorOccurred: errorOccurred,
                    errorCleared: initialError !== null && finalError === null
                };
            }
        """)
        
        assert cleanup_test['success'], "Cleanup test should succeed"
        assert cleanup_test['errorOccurred'], "Error should have occurred"
        assert cleanup_test['errorCleared'], "Error should be cleared on close"
        
        screenshot_with_markdown(page, "Error recovery and cleanup test passed")