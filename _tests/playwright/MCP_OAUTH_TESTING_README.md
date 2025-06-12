# MCP OAuth 2.1 Testing Documentation

## Overview

This document describes the comprehensive test suite for MCP OAuth 2.1 specification compliance implementation in hacka.re. The tests verify all aspects of the OAuth 2.1 implementation including metadata discovery, client registration, enhanced services, and transport layers.

## 🧪 Test Categories

### 1. **Metadata Discovery Tests** (`test_mcp_oauth_metadata_discovery.py`)

Tests OAuth 2.0 Authorization Server Metadata discovery according to RFC 8414:

- ✅ **Service Initialization**: Metadata discovery service loads correctly
- ✅ **Successful Discovery**: Metadata retrieved from `.well-known/oauth-authorization-server`
- ✅ **Fallback Mechanism**: Default endpoints used when discovery fails
- ✅ **OAuth 2.1 Compliance**: Validation of server compliance with OAuth 2.1
- ✅ **Base URL Extraction**: Correct authorization base URL calculation
- ✅ **Caching**: Metadata caching with proper expiration
- ✅ **Protocol Headers**: MCP-Protocol-Version header included in requests

**Key Test Methods:**
```python
test_metadata_discovery_service_initialization()
test_metadata_discovery_with_mock_server()
test_metadata_discovery_fallback()
test_oauth21_compliance_validation()
test_authorization_base_url_extraction()
test_metadata_caching()
test_mcp_protocol_version_header()
```

### 2. **Client Registration Tests** (`test_mcp_oauth_client_registration.py`)

Tests OAuth 2.0 Dynamic Client Registration Protocol according to RFC 7591:

- ✅ **Service Initialization**: Client registration service loads correctly
- ✅ **Request Building**: Proper OAuth registration request construction
- ✅ **Redirect URI Generation**: Multiple redirect URI scenarios
- ✅ **Response Processing**: Registration response validation and processing
- ✅ **Complete Flow**: End-to-end registration with mock server
- ✅ **Error Handling**: Proper error handling for failed registrations
- ✅ **Credential Validation**: Credential expiration and validity checks
- ✅ **Management Operations**: Update and deletion of registrations

**Key Test Methods:**
```python
test_client_registration_service_initialization()
test_client_registration_request_building()
test_redirect_uri_generation()
test_registration_response_processing()
test_mock_client_registration_flow()
test_registration_error_handling()
test_credentials_validation()
test_registration_management_operations()
```

### 3. **Enhanced OAuth Service Tests** (`test_mcp_oauth_enhanced_service.py`)

Tests enhanced OAuth service with integrated metadata discovery and client registration:

- ✅ **Service Enhancement**: Enhanced OAuth service with new capabilities
- ✅ **Auto-Discovery Flow**: Authorization flow with automatic metadata discovery
- ✅ **Auto-Registration**: Authorization flow with automatic client registration
- ✅ **Server Information**: Comprehensive server information aggregation
- ✅ **Compliance Integration**: OAuth 2.1 compliance validation integration
- ✅ **Server Listing**: Server listing with status information
- ✅ **Enhanced PKCE**: TweetNaCl-enhanced PKCE generation
- ✅ **Registration Management**: Complete server registration deletion
- ✅ **Error Handling**: Error handling in enhanced flows

**Key Test Methods:**
```python
test_enhanced_oauth_service_initialization()
test_authorization_flow_with_metadata_discovery()
test_authorization_flow_with_client_registration()
test_server_info_aggregation()
test_oauth21_compliance_validation_integration()
test_server_listing_functionality()
test_enhanced_pkce_generation()
test_server_registration_deletion()
test_error_handling_in_enhanced_flows()
```

### 4. **stdio OAuth Middleware Tests** (`test_mcp_stdio_oauth_middleware.py`)

Tests OAuth middleware for mcp-stdio-proxy according to MCP specification:

- ✅ **Middleware Initialization**: OAuth middleware loads in stdio proxy
- ✅ **OAuth Disabled Mode**: Proxy behavior when OAuth is disabled
- ✅ **Credentials Management**: OAuth credentials management endpoint
- ✅ **Status Reporting**: OAuth status endpoint functionality
- ✅ **Trusted Origins**: Trusted origin authentication bypass
- ✅ **Unauthorized Blocking**: Blocking of unauthorized requests
- ✅ **Bearer Token Auth**: Bearer token authentication
- ✅ **Invalid Token Rejection**: Rejection of invalid bearer tokens
- ✅ **Token Refresh**: OAuth token refresh endpoint
- ✅ **Environment Injection**: OAuth environment variable injection
- ✅ **CORS Headers**: CORS headers with OAuth middleware

**Key Test Methods:**
```python
test_oauth_middleware_initialization()
test_oauth_disabled_mode()
test_oauth_credentials_endpoint()
test_oauth_status_endpoint()
test_trusted_origin_authentication()
test_unauthorized_access_blocking()
test_bearer_token_authentication()
test_invalid_bearer_token_rejection()
test_oauth_refresh_endpoint()
test_environment_variable_injection()
test_cors_headers_with_oauth()
```

### 5. **Enhanced OAuth Transport Tests** (`test_mcp_oauth_enhanced_transport.py`)

Tests enhanced OAuth transport with improved error handling and retry logic:

- ✅ **Transport Initialization**: OAuth transport with service integration
- ✅ **Status Reporting**: Comprehensive OAuth status reporting
- ✅ **Error Categories**: Categorized error handling for HTTP status codes
- ✅ **Token Refresh Retry**: Automatic token refresh and retry logic
- ✅ **Exponential Backoff**: Exponential backoff in retry logic
- ✅ **Connection Testing**: OAuth connection testing functionality
- ✅ **Compliance Validation**: OAuth 2.1 compliance validation during connection
- ✅ **Rate Limiting**: Proper handling of rate limiting responses
- ✅ **Error Recovery**: Error recovery and proper cleanup

**Key Test Methods:**
```python
test_oauth_transport_initialization()
test_oauth_transport_status_reporting()
test_enhanced_error_handling_categories()
test_automatic_token_refresh_retry_logic()
test_exponential_backoff_retry_logic()
test_oauth_connection_testing()
test_oauth21_compliance_validation_in_transport()
test_rate_limiting_handling()
test_error_recovery_and_cleanup()
```

### 6. **OAuth Integration Tests** (`test_mcp_oauth_integration.py`)

Tests complete OAuth 2.1 integration across all components:

- ✅ **Complete Flow**: Discovery → Registration → Authorization flow
- ✅ **UI Integration**: OAuth UI integration with automatic discovery
- ✅ **Transport Integration**: OAuth transport integration with services
- ✅ **End-to-End Scenario**: Complete MCP OAuth scenario with all components
- ✅ **Error Recovery**: Error recovery and fallback mechanisms
- ✅ **Specification Compliance**: OAuth 2.1 specification compliance verification

**Key Test Methods:**
```python
test_complete_oauth_discovery_registration_flow()
test_oauth_ui_integration_with_discovery()
test_transport_oauth_integration()
test_end_to_end_oauth_mcp_scenario()
test_oauth_error_recovery_integration()
test_oauth_specification_compliance_verification()
```

## 🚀 Running OAuth Tests

### Quick Start
```bash
cd _tests/playwright
./run_oauth_tests.sh
```

### Individual Test Categories
```bash
# Metadata discovery tests
pytest -m oauth test_mcp_oauth_metadata_discovery.py -v

# Client registration tests  
pytest -m oauth test_mcp_oauth_client_registration.py -v

# Enhanced service tests
pytest -m oauth test_mcp_oauth_enhanced_service.py -v

# stdio middleware tests
pytest -m oauth test_mcp_stdio_oauth_middleware.py -v

# Enhanced transport tests
pytest -m oauth test_mcp_oauth_enhanced_transport.py -v

# Integration tests
pytest -m oauth test_mcp_oauth_integration.py -v
```

### All OAuth Tests
```bash
pytest -m oauth -v
```

### With Screenshots and Debug
```bash
pytest -m oauth -v --screenshot=on --tracing=on
```

## 📊 Test Coverage

The OAuth test suite provides comprehensive coverage of:

### **RFC Compliance**
- ✅ **RFC 8414**: OAuth 2.0 Authorization Server Metadata
- ✅ **RFC 7591**: OAuth 2.0 Dynamic Client Registration Protocol
- ✅ **OAuth 2.1**: Latest OAuth specification compliance

### **Security Features**
- ✅ **PKCE Required**: S256 code challenge method enforced
- ✅ **State Parameter**: CSRF protection implemented
- ✅ **Secure Storage**: Token encryption using TweetNaCl
- ✅ **Token Expiration**: Proper token lifecycle management
- ✅ **Redirect Validation**: Redirect URI validation

### **Transport Support**
- ✅ **HTTP Transport**: OAuth over HTTP with SSE
- ✅ **stdio Transport**: OAuth over stdio via proxy
- ✅ **Environment Variables**: MCP-compliant credential injection

### **Error Handling**
- ✅ **Retry Logic**: Exponential backoff and intelligent retries
- ✅ **Token Refresh**: Automatic token refresh on 401 responses
- ✅ **Rate Limiting**: Proper 429 response handling
- ✅ **Server Errors**: Categorized error handling (4xx, 5xx)

### **User Experience**
- ✅ **Auto-Discovery**: Automatic endpoint discovery
- ✅ **Auto-Registration**: Automatic client registration
- ✅ **Status Reporting**: Comprehensive OAuth status
- ✅ **Compliance Validation**: Real-time compliance checking

## 🔧 Test Configuration

### Environment Variables
```bash
# Test configuration
PYTHONPATH="${PYTHONPATH}:$(pwd)"
PYTEST_ARGS="--tb=short --maxfail=5 -v"

# OAuth test markers
OAUTH_TESTS=oauth
INTEGRATION_TESTS=integration
TRANSPORT_TESTS=transport
STDIO_TESTS=stdio
```

### Test Markers
- `@pytest.mark.oauth` - OAuth-specific tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.transport` - Transport layer tests
- `@pytest.mark.stdio` - stdio proxy tests

### Mock Configurations
Tests use comprehensive mocking for:
- OAuth server responses (metadata, registration, token)
- Network requests and error conditions
- Service integrations and dependencies
- Browser fetch API interactions

## 📈 Success Criteria

### All Tests Must Pass
- ✅ **Metadata Discovery**: RFC 8414 compliance
- ✅ **Client Registration**: RFC 7591 compliance  
- ✅ **Enhanced Services**: Integration and automation
- ✅ **stdio Middleware**: Proxy OAuth support
- ✅ **Enhanced Transport**: Retry logic and error handling
- ✅ **Integration**: End-to-end OAuth flows

### Performance Requirements
- ✅ **Test Execution**: All tests complete within 2 minutes
- ✅ **Service Loading**: Services initialize within 3 seconds
- ✅ **Network Mocking**: Fast mock responses (< 100ms)

### Quality Metrics
- ✅ **Code Coverage**: 95%+ coverage of OAuth components
- ✅ **Error Coverage**: All error paths tested
- ✅ **Integration Coverage**: All component interactions tested

## 🐛 Debugging Failed Tests

### Common Issues
1. **Service Not Available**: Check script loading order in `index.html`
2. **Mock Failures**: Verify fetch mocking and restoration
3. **Timing Issues**: Increase wait timeouts for slow operations
4. **Browser Context**: Ensure clean browser state between tests

### Debug Commands
```bash
# Run with verbose output and screenshots
pytest -m oauth -v -s --screenshot=on

# Run single test with debug
pytest test_mcp_oauth_integration.py::TestMCPOAuthIntegration::test_complete_oauth_discovery_registration_flow -v -s

# Check specific component
pytest -k "metadata_discovery" -v -s
```

### Log Analysis
- Check browser console logs in screenshots
- Review network request mocks and responses
- Verify service initialization order
- Check error propagation between components

## 📝 Test Maintenance

### Adding New Tests
1. Follow existing test patterns and structure
2. Use consistent mocking strategies
3. Include comprehensive error testing
4. Add proper test markers and documentation

### Updating Tests
1. Update tests when OAuth spec changes
2. Maintain RFC compliance verification
3. Keep mock responses realistic
4. Update documentation accordingly

The OAuth test suite ensures that hacka.re's MCP implementation is fully compliant with OAuth 2.1 specifications and provides robust, secure authentication for MCP server connections.