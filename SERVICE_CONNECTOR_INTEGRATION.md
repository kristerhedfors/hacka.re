# Service Connector Integration Guide

## Overview

This document describes the comprehensive integration of GitHub, Gmail, and Shodan services within hacka.re using custom-built MCP servers and the Model Context Protocol (MCP). The implementation provides seamless authentication and tool access while maintaining hacka.re's privacy-focused, serverless architecture.

## Implementation Summary

### 🎯 **Key Achievements**

✅ **GitHub Integration**: Personal Access Token (PAT) flow with comprehensive API access  
✅ **Gmail Integration**: OAuth 2.0 device flow with full email management  
✅ **Shodan Integration**: API key authentication with internet-connected device search and cybersecurity intelligence  
✅ **Unified UI**: Integrated into existing MCP Quick Connectors  
✅ **Security**: Encrypted token storage and secure authentication flows  
✅ **Error Handling**: Comprehensive CORS handling and fallback mechanisms  

## Architecture

### Core Components

#### 1. **MCP Service Connectors** (`js/services/mcp-service-connectors.js`)
- **Purpose**: Specialized connector for popular services requiring custom authentication
- **Features**:
  - Service-specific authentication flows (PAT, OAuth device, shared OAuth)
  - Direct API integration with proper error handling
  - Automatic tool registration with hacka.re's function calling system
  - Encrypted token storage and management
  - CORS handling and proxy solutions

#### 2. **Enhanced Quick Connectors** (`js/components/mcp/mcp-quick-connectors.js`)
- **Purpose**: Updated UI component integrating service connectors
- **Features**:
  - Unified interface for GitHub, Gmail, and Shodan services
  - Service-specific setup instructions
  - Real-time connection status monitoring
  - Seamless integration with existing MCP infrastructure

#### 3. **Service Configurations**
Each service has a dedicated configuration with:
- Authentication type (PAT, OAuth device, API key)
- API endpoints and required scopes
- Setup instructions and documentation links
- Tool definitions and parameter schemas

## Service Integrations

### 🐙 GitHub Integration

**Authentication Method**: Personal Access Token (PAT)
- **Why PAT**: GitHub's OAuth device flow has CORS restrictions in browsers
- **Setup**: User creates PAT with `repo` and `read:user` scopes
- **Security**: Token encrypted and stored locally

**Available Tools**:
- `github_list_repos`: List user repositories
- `github_get_repo`: Get repository details
- `github_list_issues`: List repository issues
- `github_create_issue`: Create new issues
- `github_get_file_content`: Read file contents from repository

**Example Usage**:
```javascript
// List repositories
const repos = await MCPServiceConnectors.executeServiceTool('github', 'list_repos', {
    type: 'all',
    sort: 'updated',
    per_page: 10
});

// Create an issue
const issue = await MCPServiceConnectors.executeServiceTool('github', 'create_issue', {
    owner: 'username',
    repo: 'repository',
    title: 'Bug report',
    body: 'Description of the issue'
});
```

### 📧 Gmail Integration

**Authentication Method**: OAuth 2.0 Device Flow
- **Why Device Flow**: Works without server-side callback, perfect for client-side apps
- **Setup**: User provides OAuth Client ID and Secret, completes device authorization
- **Scopes**: `gmail.readonly`, `gmail.send`

**Available Tools**:
- `gmail_list_messages`: List Gmail messages with optional query
- `gmail_get_message`: Get specific email content
- `gmail_send_message`: Send emails
- `gmail_search_messages`: Advanced search with filters

**Example Usage**:
```javascript
// List unread messages
const messages = await MCPServiceConnectors.executeServiceTool('gmail', 'list_messages', {
    query: 'is:unread',
    maxResults: 10
});

// Send an email
const result = await MCPServiceConnectors.executeServiceTool('gmail', 'send_message', {
    to: 'recipient@example.com',
    subject: 'Hello from hacka.re',
    body: 'This email was sent using the Gmail MCP connector!'
});
```

### 🔍 Shodan Integration

**Authentication Method**: API Key Authentication
- **Why API Key**: Simple, secure authentication for cybersecurity intelligence APIs
- **Setup**: User provides Shodan API key from account dashboard
- **Security**: API key encrypted and stored locally with custom-built MCP server

**Available Tools**:
- `shodan_search_hosts`: Search for internet-connected devices
- `shodan_host_info`: Get detailed information about a specific host
- `shodan_search_facets`: Get summary statistics for search results
- `shodan_host_ports`: List open ports for a specific host
- `shodan_domain_info`: Get information about a domain

**Example Usage**:
```javascript
// Search for Apache servers
const hosts = await MCPServiceConnectors.executeServiceTool('shodan', 'search_hosts', {
    query: 'apache',
    limit: 10
});

// Get detailed information about a specific host
await MCPServiceConnectors.executeServiceTool('shodan', 'host_info', {
    ip: '8.8.8.8'
});
```

## Authentication Flows

### GitHub PAT Flow
1. User clicks "Connect GitHub" 
2. Instructions modal shows PAT creation steps
3. User enters PAT in secure input field
4. Token validated against GitHub API
5. Token encrypted and stored locally
6. GitHub tools automatically registered

### Gmail OAuth Device Flow
1. User provides OAuth Client ID and Secret
2. Device code requested from Google
3. User visits verification URL and enters code
4. Automatic polling for authorization completion
5. Access and refresh tokens obtained
6. Tokens encrypted and stored locally
7. Gmail tools automatically registered

### Shodan API Key Flow
1. User clicks "Connect Shodan"
2. Instructions modal shows API key creation steps
3. User enters API key in secure input field
4. Key validated against Shodan API
5. Key encrypted and stored locally
6. Shodan tools automatically registered

## Security Features

### 🔐 **Token Management**
- **Encryption**: All tokens encrypted using TweetNaCl before storage
- **Storage**: Local storage with namespace isolation
- **Validation**: Token format and API validation before storage
- **Refresh**: Automatic token refresh for OAuth flows

### 🛡️ **Authentication Security**
- **PKCE**: OAuth flows use PKCE for enhanced security
- **Device Flow**: No redirect URIs needed, prevents open redirect attacks
- **Scope Validation**: Minimum required scopes, user-controlled permissions
- **Token Expiry**: Automatic handling of token expiration

### 🔒 **Data Privacy**
- **No Backend**: All authentication and API calls happen client-side
- **Encrypted Storage**: Sensitive data encrypted before local storage
- **No Logging**: No sensitive information logged or transmitted
- **User Control**: Users can disconnect and clear tokens at any time

## Error Handling and CORS

### CORS Solutions
1. **GitHub**: Uses PAT instead of OAuth to avoid CORS issues
2. **Google Services**: Device flow endpoints allow cross-origin requests
3. **Fallback Options**: Manual token entry when automatic flows fail
4. **Proxy Support**: Documentation for users who want to run local proxies

### Error Handling
- **Network Errors**: Graceful handling with user-friendly messages
- **Authentication Errors**: Clear instructions for re-authentication
- **API Errors**: Specific error messages with troubleshooting steps
- **Token Expiry**: Automatic refresh with fallback to re-authentication

## Testing

### Test File
A comprehensive test page is available at `test_integrations.html` which allows:
- Testing each service connection independently
- Verifying tool execution with sample data
- Monitoring connection status and error handling
- Debugging authentication flows

### Test Coverage
- ✅ GitHub PAT authentication and API calls
- ✅ Gmail OAuth device flow and email operations
- ✅ Shodan API key authentication and search operations
- ✅ Error handling and fallback mechanisms
- ✅ Token storage and retrieval
- ✅ UI integration and status updates

## Integration with hacka.re

### Function Calling Integration
All service tools are automatically registered with hacka.re's function calling system:

```javascript
// Tools become available as functions like:
async function github_list_repos(type, sort, per_page) {
    // Automatically calls GitHub API via service connector
}

async function gmail_send_message(to, subject, body) {
    // Automatically sends email via Gmail API
}

async function shodan_search_hosts(query, limit) {
    // Automatically searches Shodan for internet-connected devices
}
```

### UI Integration
- **MCP Modal**: Services appear in the existing MCP servers modal
- **Quick Connectors**: One-click setup for each service
- **Status Indicators**: Real-time connection status and tool counts
- **Error Messages**: Integrated with hacka.re's notification system

### Storage Integration
- **Namespace Aware**: Tokens stored with proper namespace isolation
- **Encryption**: Uses hacka.re's existing encryption service
- **Persistence**: Tokens persist across sessions
- **Cleanup**: Proper cleanup when services are disconnected

## Usage Examples

### Example 1: GitHub Repository Analysis
```javascript
// Get repository information
const repo = await github_get_repo('owner', 'repo-name');

// List recent issues
const issues = await github_list_issues('owner', 'repo-name', 'open');

// Read a specific file
const fileContent = await github_get_file_content('owner', 'repo-name', 'README.md');
```

### Example 2: Email Management
```javascript
// Check for unread emails
const unread = await gmail_list_messages('is:unread');

// Search for specific emails
const meetings = await gmail_search_messages({
    subject: 'meeting',
    after: '2024/01/01'
});

// Send a summary email
await gmail_send_message(
    'team@company.com',
    'Daily Summary',
    'Here are today\'s key updates...'
);
```

### Example 3: Cybersecurity Intelligence and Device Search
```javascript
// Search for exposed databases
const databases = await shodan_search_hosts('product:"MongoDB"');

// Get detailed information about a specific host
const hostInfo = await shodan_host_info('8.8.8.8');

// Search with facets for summary statistics
const facets = await shodan_search_facets({
    query: 'apache',
    facets: 'country,port'
});
```

## Troubleshooting

### Common Issues

#### GitHub Connection Fails
- **Issue**: PAT authentication fails
- **Solution**: Verify PAT has correct scopes (`repo`, `read:user`)
- **Check**: PAT format starts with `ghp_`

#### Gmail Device Flow Timeout
- **Issue**: Device authorization times out
- **Solution**: Complete authorization within 15 minutes
- **Alternative**: Generate new device code and try again

#### Shodan API Rate Limit
- **Issue**: API key has reached rate limit
- **Solution**: Wait for rate limit reset or upgrade API plan
- **Alternative**: Use query filters to reduce result count

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('mcp_debug', 'true');
```

This will provide detailed logs of:
- Authentication flows
- API requests and responses
- Token management operations
- Error conditions

## Future Enhancements

### Planned Features
1. **Additional Services**: Slack, Discord, Notion integration
2. **Batch Operations**: Bulk email sending, document updates
3. **Webhooks**: Real-time notifications for service events
4. **Advanced Search**: Cross-service search capabilities
5. **Template System**: Predefined templates for common operations

### Potential Improvements
1. **Token Rotation**: Automatic PAT rotation for GitHub
2. **Offline Mode**: Cached data for offline operation
3. **Service Discovery**: Automatic detection of available services
4. **Performance Optimization**: Request batching and caching
5. **Enhanced Security**: Additional encryption layers

## Standards Compliance

### OAuth 2.1 Compliance
- ✅ **PKCE Required**: All OAuth flows use PKCE
- ✅ **Device Flow**: Secure device flow implementation
- ✅ **Token Security**: Encrypted storage and automatic refresh
- ✅ **Scope Validation**: Minimum required scopes only

### API Best Practices
- ✅ **Rate Limiting**: Respect API rate limits
- ✅ **Error Handling**: Proper HTTP error code handling
- ✅ **Retry Logic**: Exponential backoff for retries
- ✅ **API Versioning**: Use stable API versions

### Privacy Compliance
- ✅ **Data Minimization**: Only request necessary permissions
- ✅ **User Consent**: Clear consent for each service
- ✅ **Data Retention**: No unnecessary data storage
- ✅ **User Control**: Easy disconnect and data deletion

## Conclusion

The Service Connector Integration provides hacka.re with powerful, secure, and user-friendly access to GitHub, Gmail, and Shodan through custom-built MCP servers. The implementation maintains hacka.re's core principles of privacy, security, and client-side operation while providing seamless integration with popular external services.

The modular architecture allows for easy extension to additional services, and the comprehensive error handling ensures a smooth user experience even when dealing with complex authentication flows and API integrations.

This integration significantly enhances hacka.re's capabilities, allowing AI assistants to interact with real-world services while maintaining the highest standards of security and user privacy.