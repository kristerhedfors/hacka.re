# Service Connector Integration Guide

## Overview

This document describes the comprehensive integration of GitHub, Gmail, and Google Docs services within hacka.re using the Model Context Protocol (MCP). The implementation provides seamless authentication and tool access while maintaining hacka.re's privacy-focused, serverless architecture.

## Implementation Summary

### 🎯 **Key Achievements**

✅ **GitHub Integration**: Personal Access Token (PAT) flow with comprehensive API access  
✅ **Gmail Integration**: OAuth 2.0 device flow with full email management  
✅ **Google Docs Integration**: Shared OAuth with document creation/editing  
✅ **Unified UI**: Integrated into existing MCP Quick Connectors  
✅ **Security**: Encrypted token storage and secure authentication flows  
✅ **Error Handling**: Comprehensive CORS handling and fallback mechanisms  

## Architecture

### Core Components

#### 1. **MCP Service Connectors** (`js/services/mcp-service-connectors-refactored.js`)
- **Purpose**: Specialized connector for popular services requiring custom authentication
- **Features**:
  - Service-specific authentication flows (PAT, OAuth device, shared OAuth)
  - Direct API integration with proper error handling
  - Automatic tool registration with hacka.re's function calling system
  - Encrypted token storage and management
  - CORS handling and proxy solutions

#### 2. **Enhanced Quick Connectors** (`js/components/mcp/mcp-quick-connectors-refactored.js`)
- **Purpose**: Updated UI component integrating service connectors
- **Features**:
  - Unified interface for all three services
  - Service-specific setup instructions
  - Real-time connection status monitoring
  - Seamless integration with existing MCP infrastructure

#### 3. **Service Configurations**
Each service has a dedicated configuration with:
- Authentication type (PAT, OAuth device, shared OAuth)
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

### 📄 Google Docs Integration

**Authentication Method**: Shared OAuth (reuses Gmail authentication)
- **Why Shared**: Same Google account, additional scopes for Docs and Drive
- **Dependencies**: Requires Gmail to be connected first
- **Scopes**: `documents`, `drive.readonly`

**Available Tools**:
- `gdocs_list_documents`: List Google Docs from Drive
- `gdocs_read_document`: Read document content
- `gdocs_create_document`: Create new documents
- `gdocs_update_document`: Batch update operations
- `gdocs_append_text`: Append text to documents

**Example Usage**:
```javascript
// Create a new document
const doc = await MCPServiceConnectors.executeServiceTool('gdocs', 'create_document', {
    title: 'Meeting Notes',
    content: 'Notes from today\'s meeting...'
});

// Append text to existing document
await MCPServiceConnectors.executeServiceTool('gdocs', 'append_text', {
    documentId: 'document-id-here',
    text: '\n\nAdditional notes added by AI assistant.'
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

### Google Docs Shared OAuth
1. Check if Gmail is already connected
2. If not, redirect to Gmail setup first
3. Verify additional scopes are available
4. Reuse Gmail's OAuth tokens
5. Google Docs tools automatically registered

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
- ✅ Google Docs shared authentication and document operations
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

async function gdocs_create_document(title, content) {
    // Automatically creates Google Doc
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

### Example 3: Document Creation and Management
```javascript
// List recent documents
const docs = await gdocs_list_documents({
    maxResults: 20,
    orderBy: 'modifiedTime'
});

// Create a new document
const newDoc = await gdocs_create_document(
    'Project Plan',
    'This document outlines the project plan...'
);

// Add content to the document
await gdocs_append_text(newDoc.documentId, '\n\n## Next Steps\n- Review timeline\n- Assign tasks');
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

#### Google Docs Permission Denied
- **Issue**: Insufficient permissions for Docs API
- **Solution**: Ensure Gmail connection includes Docs scopes
- **Alternative**: Reconnect Gmail with additional permissions

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

The Service Connector Integration provides hacka.re with powerful, secure, and user-friendly access to GitHub, Gmail, and Google Docs. The implementation maintains hacka.re's core principles of privacy, security, and client-side operation while providing seamless integration with popular external services.

The modular architecture allows for easy extension to additional services, and the comprehensive error handling ensures a smooth user experience even when dealing with complex authentication flows and API integrations.

This integration significantly enhances hacka.re's capabilities, allowing AI assistants to interact with real-world services while maintaining the highest standards of security and user privacy.