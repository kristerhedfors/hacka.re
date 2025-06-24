# GitHub MCP Server Integration

This document describes the integration with GitHub's official Model Context Protocol (MCP) server.

## Overview

hacka.re now connects to GitHub's official MCP server at `https://api.githubcopilot.com/mcp/` instead of using a custom REST API wrapper. This provides access to GitHub's official MCP tools and may require a GitHub Copilot subscription for full functionality.

## Architecture

### Components

- **GitHubMCPServer** (`js/services/github-mcp-server.js`): Core GitHub MCP server connector
- **GitHubMCPIntegration** (`js/components/mcp/github-mcp-integration.js`): Integration component with UI flows
- **Quick Connectors Integration**: GitHub MCP appears as "GitHub MCP" in the Quick Connectors panel

### Authentication Methods

#### 1. OAuth (Recommended)
- **Flow**: Standard OAuth 2.0 with GitHub
- **Scopes**: `repo`, `read:user`, `read:org`
- **Benefits**: Automatic token refresh, scope-limited access, easy revocation
- **Requirements**: OAuth App setup in GitHub Developer Settings

#### 2. Personal Access Token (PAT)
- **Format**: Classic GitHub tokens (starting with `ghp_`)
- **Scopes**: `repo`, `read:user`, `read:org`
- **Benefits**: Long-term access, fine-grained permissions, no browser popups
- **Validation**: Real-time format checking and GitHub API validation

## Setup Instructions

### OAuth Setup

1. **Create OAuth App**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create new OAuth App or use existing one
   - Set Authorization callback URL to your domain (e.g., `https://yourdomain.com` or `http://localhost:8000`)

2. **Configure in hacka.re**:
   - Open MCP Servers panel
   - Click "Connect" on GitHub MCP connector
   - Choose "Use OAuth"
   - Enter your OAuth Client ID
   - Complete authorization flow

### PAT Setup

1. **Create Personal Access Token**:
   - Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/personal-access-tokens/tokens)
   - Click "Generate new token (classic)"
   - Name: "hacka.re GitHub MCP"
   - Select scopes: `repo`, `read:user`, `read:org`
   - Copy token immediately

2. **Configure in hacka.re**:
   - Open MCP Servers panel
   - Click "Connect" on GitHub MCP connector
   - Choose "Use PAT"
   - Paste your token
   - Token is validated and encrypted locally

## Usage

### Available Tools

The GitHub MCP server provides tools for:
- Repository management
- Issues and pull requests
- File content and search
- Organization and team data
- Repository insights

*Note: Actual tools depend on GitHub's MCP server implementation and your subscription level.*

### Connection Status

Check connection status:
```javascript
// Check if connected
const isConnected = window.GitHubMCPIntegration.isConnected();

// Get full status
const status = window.GitHubMCPIntegration.getConnectionStatus();

// Get available tools
const tools = window.GitHubMCPIntegration.getAvailableTools();
```

### Reconnection

The integration automatically attempts to reconnect using saved credentials when the page loads.

## Requirements

### ⚠️ **Current Limitation: CORS Restrictions**

**As of December 2024, GitHub's official MCP server (`api.githubcopilot.com/mcp/`) appears to be restricted to official GitHub Copilot integrations only.**

**Observed Issues:**
- CORS errors even from legitimate HTTPS domains
- Server returns duplicate `Access-Control-Allow-Origin` headers (`*, *`)
- Connection fails with `net::ERR_FAILED` despite 200 OK response

**This means the GitHub MCP integration may only work with:**
- VS Code with GitHub Copilot extension
- GitHub's official desktop applications
- Other sanctioned GitHub Copilot clients

### GitHub Copilot Subscription

If the CORS restrictions were resolved, the GitHub MCP server would likely require a GitHub Copilot subscription for full functionality. Without Copilot:
- Connection may fail with 403 Forbidden
- Limited or no tools may be available
- Error messages will indicate subscription requirements

### Browser Compatibility

- Modern browsers with ES6+ support
- Local storage for encrypted credential storage
- CORS support for API requests

## Security

### Data Storage
- OAuth tokens and PATs are encrypted using TweetNaCl before storage
- All data stored in browser's localStorage
- No credentials sent to external servers (except GitHub's official APIs)

### Token Permissions
- OAuth tokens have scope-limited access
- PATs can be configured with minimal required permissions
- Tokens can be revoked at any time in GitHub settings

### Network Security
- All communication over HTTPS
- Direct connection to GitHub's official MCP server
- No proxy or intermediate servers

## Testing

### Automated Tests

Run GitHub MCP integration tests:
```bash
cd _tests/playwright
./run_github_mcp_tests.sh
```

**Note**: Tests require user interaction for OAuth/PAT flows and cannot run fully automated.

### Manual Testing

1. **Component Loading**: Verify GitHubMCPServer and GitHubMCPIntegration are available
2. **UI Integration**: Check GitHub MCP appears in Quick Connectors
3. **Authentication Flows**: Test both OAuth and PAT setup dialogs
4. **Connection**: Verify connection to official MCP server
5. **Status Methods**: Check connection status and tool retrieval

### Test Coverage

- ✅ Component initialization and availability
- ✅ Quick Connectors UI integration
- ✅ Authentication dialog flows (OAuth and PAT)
- ✅ Token validation and format checking
- ✅ Status and tool count methods
- ✅ Server URL configuration
- ⚠️ Actual connection requires valid credentials
- ⚠️ Tool functionality depends on GitHub Copilot subscription

## Alternative GitHub Integrations

Since GitHub's official MCP server appears to be restricted to official clients, consider these alternatives for GitHub integration in hacka.re:

### 1. Custom GitHub Tools via Function Calling
Create custom JavaScript functions that use GitHub's REST API directly:

```javascript
/**
 * @callable
 * List GitHub repositories for authenticated user
 */
async function listGitHubRepos(token) {
    const response = await fetch('https://api.github.com/user/repos', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    return await response.json();
}
```

### 2. GitHub CLI Integration
If you have GitHub CLI installed locally, you could create tools that shell out to `gh` commands.

### 3. Third-Party MCP Servers
Look for community-built MCP servers that provide GitHub integration:
- Self-hosted MCP servers that use GitHub's REST API
- Community MCP server implementations

### 4. Wait for Policy Changes
GitHub may update their CORS policies in the future to allow third-party MCP clients.

## Troubleshooting

### Common Issues

#### Connection Fails with 403 Forbidden
- **Cause**: GitHub Copilot subscription required
- **Solution**: Ensure active GitHub Copilot subscription

#### OAuth Redirect URI Mismatch
- **Cause**: OAuth App redirect URI doesn't match current domain
- **Solution**: Update OAuth App settings in GitHub Developer Settings

#### Token Validation Fails
- **Cause**: Invalid token format or expired token
- **Solution**: Generate new PAT with correct scopes

#### Integration Not Available
- **Cause**: Components not loaded or initialization failed
- **Solution**: Refresh page, check browser console for errors

### Debug Information

Enable debug logging:
```javascript
// Check component availability
console.log('GitHubMCPServer:', typeof window.GitHubMCPServer);
console.log('GitHubMCPIntegration:', typeof window.GitHubMCPIntegration);

// Get detailed status
const status = window.GitHubMCPIntegration.getConnectionStatus();
console.log('GitHub MCP Status:', status);
```

## Migration from Custom Implementation

This integration replaces the previous custom GitHub REST API implementation:

### Changes
- ✅ Connects to official GitHub MCP server (`api.githubcopilot.com/mcp/`)
- ✅ Proper MCP protocol instead of REST API wrapper
- ✅ OAuth and PAT authentication options
- ✅ Real-time token validation
- ✅ Integration with existing MCP infrastructure

### Deprecated Components
- ❌ Custom GitHub service in `mcp-service-connectors.js`
- ❌ GitHub-specific OAuth device flow workarounds
- ❌ Custom GitHub token manager
- ❌ REST API tool definitions

### Backward Compatibility
- Existing OAuth flow components remain but are marked deprecated
- Old GitHub configurations are not automatically migrated
- Users need to reconfigure GitHub connection with new integration

## References

- [GitHub MCP Server Documentation](https://docs.github.com/en/copilot/building-copilot-extensions/creating-a-copilot-extension/configuring-your-github-app-for-your-copilot-extension)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps)
- [Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)