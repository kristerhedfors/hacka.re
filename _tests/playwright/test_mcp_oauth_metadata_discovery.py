"""Tests for MCP OAuth Metadata Discovery functionality"""
import pytest
from playwright.sync_api import Page, expect
import json
import time
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


@pytest.mark.oauth
class TestMCPOAuthMetadataDiscovery:
    """Test OAuth metadata discovery according to RFC 8414"""
    
    def test_metadata_discovery_service_initialization(self, page: Page, serve_hacka_re):
        """Test that metadata discovery service initializes correctly"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Wait for page to load and services to initialize
        page.wait_for_timeout(2000)
        
        # Check that metadata discovery service is available
        metadata_service_available = page.evaluate("""
            () => {
                return typeof window.MCPMetadataDiscovery !== 'undefined' && 
                       typeof window.MCPMetadataDiscovery.MetadataDiscoveryService !== 'undefined';
            }
        """)
        
        assert metadata_service_available, "Metadata discovery service should be available"
        
        # Test service can be instantiated
        service_instance = page.evaluate("""
            () => {
                try {
                    const service = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                    return {
                        success: true,
                        hasCache: typeof service.cache !== 'undefined',
                        hasMethods: typeof service.discoverMetadata === 'function'
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert service_instance['success'], f"Service instantiation failed: {service_instance.get('error')}"
        assert service_instance['hasCache'], "Service should have cache"
        assert service_instance['hasMethods'], "Service should have discoverMetadata method"
        
        screenshot_with_markdown(page, "OAuth metadata discovery service initialized")

    def test_metadata_discovery_with_mock_server(self, page: Page, serve_hacka_re):
        """Test metadata discovery with a mock OAuth server"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        # Mock successful metadata discovery
        discovery_result = page.evaluate("""
            async () => {
                const service = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                
                // Mock a successful metadata response
                const mockMetadata = {
                    issuer: 'https://api.example.com',
                    authorization_endpoint: 'https://api.example.com/authorize',
                    token_endpoint: 'https://api.example.com/token',
                    registration_endpoint: 'https://api.example.com/register',
                    grant_types_supported: ['authorization_code'],
                    response_types_supported: ['code'],
                    code_challenge_methods_supported: ['S256'],
                    scopes_supported: ['read', 'write'],
                    token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
                    pkce_required: true,
                    _discovered: true
                };
                
                // Override fetch for testing
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        return {
                            ok: true,
                            json: async () => mockMetadata
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    const result = await service.discoverMetadata('https://api.example.com/mcp');
                    window.fetch = originalFetch; // Restore
                    return { success: true, metadata: result };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert discovery_result['success'], f"Metadata discovery failed: {discovery_result.get('error')}"
        
        metadata = discovery_result['metadata']
        assert metadata['authorization_endpoint'] == 'https://api.example.com/authorize'
        assert metadata['token_endpoint'] == 'https://api.example.com/token'
        assert 'S256' in metadata['code_challenge_methods_supported']
        assert metadata['_discovered'] == True
        
        screenshot_with_markdown(page, "Metadata discovery with mock server successful")

    def test_metadata_discovery_fallback(self, page: Page, serve_hacka_re):
        """Test fallback to default endpoints when discovery fails"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        fallback_result = page.evaluate("""
            async () => {
                const service = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                
                // Override fetch to simulate 404
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        return { ok: false, status: 404 };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    const result = await service.discoverMetadata('https://api.example.com/mcp');
                    window.fetch = originalFetch; // Restore
                    return { success: true, metadata: result };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert fallback_result['success'], f"Fallback discovery failed: {fallback_result.get('error')}"
        
        metadata = fallback_result['metadata']
        assert metadata['authorization_endpoint'] == 'https://api.example.com/authorize'
        assert metadata['token_endpoint'] == 'https://api.example.com/token'
        assert metadata['_fallback'] == True
        assert metadata['_discovered'] == False
        
        screenshot_with_markdown(page, "Metadata discovery fallback working correctly")

    def test_oauth21_compliance_validation(self, serve_hacka_re, page: Page):
        """Test OAuth 2.1 compliance validation"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        compliance_tests = page.evaluate("""
            () => {
                const service = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                
                // Test compliant server
                const compliantMetadata = {
                    grant_types_supported: ['authorization_code'],
                    response_types_supported: ['code'],
                    code_challenge_methods_supported: ['S256'],
                    pkce_required: true
                };
                const compliantResult = service.validateOAuth21Compatibility(compliantMetadata);
                
                // Test non-compliant server (missing S256)
                const nonCompliantMetadata = {
                    grant_types_supported: ['authorization_code', 'implicit'],
                    response_types_supported: ['code', 'token'],
                    code_challenge_methods_supported: ['plain'],
                    pkce_required: false
                };
                const nonCompliantResult = service.validateOAuth21Compatibility(nonCompliantMetadata);
                
                return {
                    compliant: compliantResult,
                    nonCompliant: nonCompliantResult
                };
            }
        """)
        
        # Check compliant server
        compliant = compliance_tests['compliant']
        assert compliant['compatible'] == True, "Compliant server should be marked as compatible"
        assert compliant['score'] >= 85, f"Compliant server should have high score, got {compliant['score']}"
        assert len(compliant['issues']) == 0, "Compliant server should have no issues"
        
        # Check non-compliant server
        non_compliant = compliance_tests['nonCompliant']
        assert non_compliant['compatible'] == False, "Non-compliant server should be marked as incompatible"
        assert non_compliant['score'] == 0, f"Non-compliant server should have zero score, got {non_compliant['score']}"
        assert len(non_compliant['issues']) > 0, "Non-compliant server should have issues"
        
        screenshot_with_markdown(page, "OAuth 2.1 compliance validation working")

    def test_authorization_base_url_extraction(self, serve_hacka_re, page: Page):
        """Test correct extraction of authorization base URL from MCP server URL"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        url_tests = page.evaluate("""
            () => {
                const service = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                
                const testCases = [
                    {
                        input: 'https://api.example.com/v1/mcp',
                        expected: 'https://api.example.com'
                    },
                    {
                        input: 'http://localhost:3000/mcp/endpoint',
                        expected: 'http://localhost:3000'
                    },
                    {
                        input: 'https://mcp.service.com:8443/api/v2/mcp',
                        expected: 'https://mcp.service.com:8443'
                    }
                ];
                
                const results = [];
                for (const testCase of testCases) {
                    try {
                        const baseUrl = service._getAuthorizationBaseUrl(testCase.input);
                        results.push({
                            input: testCase.input,
                            expected: testCase.expected,
                            actual: baseUrl,
                            passed: baseUrl === testCase.expected
                        });
                    } catch (error) {
                        results.push({
                            input: testCase.input,
                            expected: testCase.expected,
                            error: error.message,
                            passed: false
                        });
                    }
                }
                
                return results;
            }
        """)
        
        for result in url_tests:
            assert result['passed'], f"URL test failed for {result['input']}: expected {result['expected']}, got {result.get('actual', result.get('error'))}"
        
        screenshot_with_markdown(page, "Authorization base URL extraction tests passed")

    def test_metadata_caching(self, serve_hacka_re, page: Page):
        """Test metadata caching functionality"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        caching_test = page.evaluate("""
            async () => {
                const service = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                let fetchCount = 0;
                
                // Mock metadata response with fetch counting
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        fetchCount++;
                        return {
                            ok: true,
                            json: async () => ({
                                authorization_endpoint: 'https://api.example.com/authorize',
                                token_endpoint: 'https://api.example.com/token',
                                _discovered: true
                            })
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    // First discovery - should fetch
                    await service.discoverMetadata('https://api.example.com/mcp');
                    const firstFetchCount = fetchCount;
                    
                    // Second discovery - should use cache
                    await service.discoverMetadata('https://api.example.com/mcp');
                    const secondFetchCount = fetchCount;
                    
                    // Clear cache and try again - should fetch
                    service.clearCache();
                    await service.discoverMetadata('https://api.example.com/mcp');
                    const thirdFetchCount = fetchCount;
                    
                    window.fetch = originalFetch; // Restore
                    
                    return {
                        success: true,
                        firstFetch: firstFetchCount,
                        secondFetch: secondFetchCount,
                        thirdFetch: thirdFetchCount
                    };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert caching_test['success'], f"Caching test failed: {caching_test.get('error')}"
        assert caching_test['firstFetch'] == 1, "First discovery should trigger fetch"
        assert caching_test['secondFetch'] == 1, "Second discovery should use cache"
        assert caching_test['thirdFetch'] == 2, "Third discovery after cache clear should trigger fetch"
        
        screenshot_with_markdown(page, "Metadata caching functionality verified")

    def test_mcp_protocol_version_header(self, serve_hacka_re, page: Page):
        """Test that MCP-Protocol-Version header is sent correctly"""
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        header_test = page.evaluate("""
            async () => {
                const service = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
                let capturedHeaders = null;
                
                // Mock fetch to capture headers
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.includes('/.well-known/oauth-authorization-server')) {
                        capturedHeaders = options.headers;
                        return {
                            ok: true,
                            json: async () => ({
                                authorization_endpoint: 'https://api.example.com/authorize',
                                token_endpoint: 'https://api.example.com/token'
                            })
                        };
                    }
                    return originalFetch(url, options);
                };
                
                try {
                    await service.discoverMetadata('https://api.example.com/mcp', '2024-11-05');
                    window.fetch = originalFetch; // Restore
                    
                    return {
                        success: true,
                        headers: capturedHeaders
                    };
                } catch (error) {
                    window.fetch = originalFetch; // Restore
                    return { success: false, error: error.message };
                }
            }
        """)
        
        assert header_test['success'], f"Header test failed: {header_test.get('error')}"
        headers = header_test['headers']
        assert 'MCP-Protocol-Version' in headers, "MCP-Protocol-Version header should be present"
        assert headers['MCP-Protocol-Version'] == '2024-11-05', "Correct protocol version should be sent"
        
        screenshot_with_markdown(page, "MCP-Protocol-Version header test passed")