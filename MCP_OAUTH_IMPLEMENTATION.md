# MCP OAuth Implementation Documentation

## Overview

This document describes the OAuth 2.0 authorization code flow implementation for the Model Context Protocol (MCP) in hacka.re. The implementation provides secure authentication for MCP servers that require OAuth, supporting both standard providers (GitHub, Google) and custom OAuth endpoints.

## Architecture

### Core Components

#### 1. **MCP OAuth Service** (`js/services/mcp-oauth-service.js`)
The core OAuth service that handles:
- Authorization code flow with PKCE
- Token management and storage
- Automatic token refresh
- Provider configurations

Key classes:
- `OAuthService` - Main service class
- `OAuthToken` - Token lifecycle management
- `PKCEHelper` - PKCE code generation
- `MCPOAuthError` - OAuth-specific errors

#### 2. **OAuth Transport** (`js/services/mcp-transport-service.js`)
Extended transport layer that adds:
- `OAuthTransport` class extending `SseTransport`
- Automatic token injection in requests
- 401 response handling with token refresh
- OAuth status reporting

#### 3. **OAuth Configuration UI** (`js/components/mcp/mcp-oauth-config.js`)
User interface for OAuth setup:
- Provider selection (GitHub, Google, custom)
- Client ID and redirect URI configuration
- Scope management
- Authorization URL preview
- Secure credential storage

#### 4. **OAuth Flow Manager** (`js/components/mcp/mcp-oauth-flow.js`)
Manages the authorization flow:
- OAuth redirect handling
- Authorization code exchange
- Token status display
- Re-authorization controls

#### 5. **OAuth Integration** (`js/components/mcp/mcp-oauth-integration.js`)
Integrates OAuth into the MCP UI:
- Transport type selection
- Form field visibility management
- Server connection extensions

## Implementation Details

### Security Features

1. **PKCE (Proof Key for Code Exchange)**
   - Generates cryptographically secure code verifier
   - Creates SHA-256 code challenge
   - Prevents authorization code interception attacks

2. **Secure Token Storage**
   - Tokens encrypted using CoreStorageService
   - Namespace isolation per instance
   - No tokens in shared links

3. **Automatic Token Refresh**
   - Checks token expiry before requests
   - Refreshes tokens with 60-second buffer
   - Handles refresh token rotation

### OAuth Flow

1. **Configuration Phase**
   ```javascript
   // User configures OAuth provider
   {
     provider: 'github',
     clientId: 'your-client-id',
     redirectUri: 'http://localhost:8000/oauth/callback',
     scope: 'repo read:user'
   }
   ```

2. **Authorization Phase**
   - Generate PKCE codes
   - Build authorization URL with state
   - Open authorization window
   - Handle redirect callback

3. **Token Exchange**
   - Exchange authorization code for tokens
   - Store tokens securely
   - Update UI with token status

4. **Usage Phase**
   - Inject token in MCP requests
   - Handle token expiry
   - Refresh tokens as needed

## Usage Examples

### 1. Configure GitHub OAuth MCP Server

```javascript
// In MCP modal:
// 1. Server Name: github-mcp-server
// 2. Transport Type: OAuth (HTTP with OAuth 2.0)
// 3. Server URL: https://api.github.com/mcp
// 4. Click "Configure OAuth"
// 5. Select Provider: GitHub
// 6. Enter Client ID: your-github-oauth-app-client-id
// 7. Save Configuration
// 8. Click "Authorize" to start OAuth flow
```

### 2. Custom OAuth Provider

```javascript
// Configuration for custom provider:
{
  provider: 'custom',
  clientId: 'custom-client-id',
  clientSecret: '', // Only for confidential clients
  redirectUri: 'http://localhost:8000/oauth/callback',
  authorizationUrl: 'https://auth.example.com/oauth/authorize',
  tokenUrl: 'https://auth.example.com/oauth/token',
  scope: 'read write',
  additionalParams: {
    prompt: 'consent',
    access_type: 'offline'
  }
}
```

### 3. Programmatic Usage

```javascript
// Get OAuth service
const oauthService = new window.MCPOAuthService.OAuthService();

// Start authorization flow
const flowResult = await oauthService.startAuthorizationFlow('my-server', {
  clientId: 'client-id',
  redirectUri: 'http://localhost:8000/oauth/callback',
  authorizationUrl: 'https://provider.com/oauth/authorize',
  tokenUrl: 'https://provider.com/oauth/token',
  scope: 'required scopes'
});

// Open authorization URL
window.open(flowResult.authorizationUrl);

// Handle callback (automatic in UI)
const token = await oauthService.completeAuthorizationFlow(code, state);
```

## UI Integration

### Transport Type Selection

The MCP modal now includes a transport type selector:
- **Stdio (Local via Proxy)** - For local MCP servers
- **SSE (HTTP)** - For HTTP-based servers
- **OAuth (HTTP with OAuth 2.0)** - For OAuth-protected servers

### OAuth Configuration Section

When OAuth transport is selected:
1. OAuth configuration section appears
2. User selects provider or enters custom URLs
3. Configuration is validated and saved
4. Authorization flow can be initiated

### Token Status Display

After successful authorization:
- Token status (valid/expired)
- Token type and scope
- Remaining lifetime
- Refresh token availability
- Re-authorization controls

## Token Lifecycle

### Storage
- Tokens stored in `mcp-oauth-tokens` key
- Encrypted using TweetNaCl
- Namespaced by instance

### Refresh Logic
- Automatic refresh 60 seconds before expiry
- Preserves refresh token if not rotated
- Updates storage after refresh

### Revocation
- Manual revocation through UI
- Clears token from storage
- Requires re-authorization

## Error Handling

### Common Errors

1. **No Token Found**
   - Prompts user to authorize
   - Shows authorization button

2. **Token Expired**
   - Attempts automatic refresh
   - Falls back to re-authorization

3. **Invalid Configuration**
   - Validates required fields
   - Shows specific error messages

4. **Network Errors**
   - Retries with exponential backoff
   - Clear error messages to user

## Development Guidelines

### Adding New OAuth Providers

1. Add provider configuration to `OAUTH_PROVIDERS`:
   ```javascript
   gitlab: {
     authorizationUrl: 'https://gitlab.com/oauth/authorize',
     tokenUrl: 'https://gitlab.com/oauth/token',
     scope: 'api read_user',
     responseType: 'code',
     grantType: 'authorization_code'
   }
   ```

2. Update UI to include new provider in dropdown

3. Test authorization flow end-to-end

### Testing OAuth Implementation

1. Use the test page: `_tests/test_mcp_oauth.html`
2. Test PKCE generation
3. Test authorization URL building
4. Test transport creation

### Security Considerations

1. Never store client secrets in browser
2. Always use PKCE for public clients
3. Validate state parameter on callback
4. Use secure redirect URIs (HTTPS in production)
5. Limit token scope to minimum required

## Troubleshooting

### Authorization Window Issues
- Check popup blockers
- Ensure redirect URI matches configuration
- Verify OAuth app settings with provider

### Token Refresh Failures
- Check if refresh token exists
- Verify token endpoint is correct
- Check for refresh token rotation

### Connection Errors
- Verify OAuth configuration
- Check token validity
- Review browser console for errors

## Future Enhancements

1. **Device Code Flow** - For CLI/headless environments
2. **Client Credentials Flow** - For server-to-server auth
3. **Token Introspection** - Validate tokens with provider
4. **Multiple Token Support** - Different tokens per endpoint
5. **OAuth 2.1 Support** - Latest OAuth specifications

## Conclusion

The OAuth implementation in hacka.re provides a secure, user-friendly way to connect to OAuth-protected MCP servers while maintaining the project's core principles of privacy and client-side operation. The implementation follows OAuth 2.0 best practices and provides a foundation for future authentication enhancements.