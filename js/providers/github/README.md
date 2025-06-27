# GitHub Provider for MCP

A comprehensive GitHub integration provider for the Model Context Protocol (MCP) system, enabling AI models to interact with GitHub repositories, issues, pull requests, and more.

## Overview

The GitHub Provider offers full-featured GitHub API integration with 16+ tools covering repositories, issues, pull requests, file content access, and advanced search capabilities. It uses Personal Access Token (PAT) authentication for secure, credential-controlled access to GitHub resources.

## Quick Start

### 1. Authentication Setup

1. **Generate a GitHub Personal Access Token:**
   - Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/personal-access-tokens/tokens)
   - Click "Generate new token (classic)"
   - Give it a descriptive name like "hacka.re MCP Integration"
   - Select required scopes:
     - **`repo`** - Full control of private repositories
     - **`read:user`** - Read user profile data
     - **`read:org`** - Read organization data (optional)
   - Copy the generated token immediately

2. **Configure in Application:**
   ```javascript
   // Using the UI setup dialog
   await window.GitHubTokenManager.quickSetup();
   
   // Or programmatically
   import { GitHubAuth } from './js/providers/github/github-auth.js';
   const auth = new GitHubAuth();
   await auth.saveToken('ghp_your_token_here');
   ```

### 2. Basic Usage

```javascript
import { GitHubProvider } from './js/providers/github/index.js';

// Create provider instance
const github = new GitHubProvider();

// Authenticate (uses saved token)
await github.authenticate();

// List user repositories
const repos = await github.executeTool('github_list_repos', {
    type: 'owner',
    sort: 'updated',
    per_page: 10
});

// Get file content
const fileContent = await github.executeTool('github_get_file_content', {
    owner: 'username',
    repo: 'repository',
    path: 'README.md'
});

// Search code across repositories
const codeResults = await github.executeTool('github_search_code', {
    q: 'function authentication',
    language: 'javascript',
    per_page: 20
});
```

## Available Tools

### Repository Management
- **`github_list_repos`** - List user repositories with filtering and sorting
- **`github_get_repo`** - Get detailed information about a specific repository
- **`github_list_branches`** - List branches in a repository
- **`github_list_commits`** - List commits with filtering by author, date, and path

### Issue Management
- **`github_list_issues`** - List repository issues with state and label filtering
- **`github_create_issue`** - Create new issues with labels and assignees
- **`github_search_issues`** - Advanced issue search with multiple criteria

### Pull Requests
- **`github_list_pull_requests`** - List pull requests with state and branch filtering
- **`github_get_pull_request`** - Get detailed pull request information

### File Content Access
- **`github_get_file_content`** - Retrieve file contents from any repository branch/commit

### Advanced Search Tools
- **`github_search_code`** - Search code across repositories with language and path filtering
- **`github_search_commits`** - Search commits by author, date, and content
- **`github_search_repositories`** - Discover repositories by language, stars, topics, and more
- **`github_search_users`** - Find users and organizations
- **`github_search_topics`** - Explore trending topics and tags
- **`github_advanced_search`** - Multi-type search across all GitHub entities

## Tool Examples

### Repository Operations

```javascript
// List your recent repositories
const myRepos = await github.executeTool('github_list_repos', {
    type: 'owner',
    sort: 'updated',
    per_page: 20
});

// Get repository details
const repoInfo = await github.executeTool('github_get_repo', {
    owner: 'facebook',
    repo: 'react'
});

// List repository branches
const branches = await github.executeTool('github_list_branches', {
    owner: 'microsoft',
    repo: 'vscode',
    per_page: 50
});
```

### Issue Management

```javascript
// List open issues in a repository
const issues = await github.executeTool('github_list_issues', {
    owner: 'nodejs',
    repo: 'node',
    state: 'open',
    labels: 'bug,performance',
    per_page: 30
});

// Create a new issue
const newIssue = await github.executeTool('github_create_issue', {
    owner: 'myusername',
    repo: 'myproject',
    title: 'Bug: Authentication fails on mobile',
    body: 'Detailed description of the issue...',
    labels: ['bug', 'mobile'],
    assignees: ['developer1']
});

// Search for issues across repositories
const searchResults = await github.executeTool('github_search_issues', {
    q: 'memory leak',
    type: 'issue',
    state: 'open',
    language: 'javascript',
    sort: 'updated',
    per_page: 25
});
```

### Advanced Search Operations

```javascript
// Search for JavaScript functions
const codeSearch = await github.executeTool('github_search_code', {
    q: 'async function authenticate',
    language: 'javascript',
    filename: 'auth.js',
    per_page: 20
});

// Find popular React repositories
const reactRepos = await github.executeTool('github_search_repositories', {
    q: 'react',
    language: 'javascript',
    stars: '>1000',
    sort: 'stars',
    order: 'desc',
    per_page: 15
});

// Multi-type comprehensive search
const multiSearch = await github.executeTool('github_advanced_search', {
    q: 'machine learning tensorflow',
    types: ['repositories', 'code', 'issues'],
    language: 'python',
    limit_per_type: 10,
    include_metadata: true
});
```

### File Content Access

```javascript
// Get specific file content
const packageJson = await github.executeTool('github_get_file_content', {
    owner: 'vercel',
    repo: 'next.js',
    path: 'package.json',
    ref: 'main'  // branch, tag, or commit SHA
});

// Access decoded content
if (packageJson.decodedContent) {
    const packageData = JSON.parse(packageJson.decodedContent);
    console.log('Dependencies:', packageData.dependencies);
}
```

## Configuration Options

### Provider Configuration
```javascript
const github = new GitHubProvider({
    endpoints: {
        api: 'https://api.github.com',  // Custom API endpoint if needed
        userInfo: 'https://api.github.com/user'
    },
    requiredScopes: ['repo', 'read:user', 'read:org'],
    metadata: {
        displayName: 'Custom GitHub Provider',
        description: 'Custom GitHub integration'
    }
});
```

### Authentication Configuration
```javascript
import { GitHubAuth } from './js/providers/github/github-auth.js';

const auth = new GitHubAuth({
    timeout: 15000,  // Request timeout in milliseconds
    requiredScopes: ['repo', 'read:user']
});
```

## Integration with MCP System

### Automatic Registration
```javascript
import { registerGitHubProvider } from './js/providers/github/index.js';

// Register with MCP system
const provider = await registerGitHubProvider(mcpSystem, {
    // Custom configuration options
});
```

### Manual Integration
```javascript
import { GitHubProvider } from './js/providers/github/index.js';

const github = new GitHubProvider();
await github.authenticate();

// Register tools with function calling system
const tools = await github.getToolDefinitions();
tools.forEach(tool => {
    window.FunctionToolsRegistry.registerTool(tool.name, tool);
});
```

## Security and Privacy

### Token Storage
- All tokens are encrypted using TweetNaCl before storage in localStorage
- Tokens are never transmitted unencrypted or logged
- Storage keys are namespaced to prevent conflicts

### Scope Management
- Provider validates that tokens have required scopes
- Tools check scope requirements before execution
- Graceful degradation when insufficient permissions

### Secure Sharing
```javascript
import { GitHubUI } from './js/providers/github/github-ui.js';

const ui = new GitHubUI();

// Create encrypted shareable link
const shareLink = await ui.createShareableLink('encryption-password', {
    includeFunctionLibrary: true
});

// Recipients need the password to decrypt and use the connection
```

## Error Handling

The provider includes comprehensive error handling:

```javascript
try {
    const result = await github.executeTool('github_get_repo', {
        owner: 'nonexistent',
        repo: 'repository'
    });
} catch (error) {
    if (error.message.includes('404')) {
        console.log('Repository not found');
    } else if (error.message.includes('403')) {
        console.log('Access denied - check token permissions');
    } else if (error.message.includes('timed out')) {
        console.log('Request timed out - GitHub API may be slow');
    }
}
```

## Rate Limiting

The provider respects GitHub's API rate limits:
- 5,000 requests per hour for authenticated requests
- Automatic timeout handling (45-second request timeout)
- Error messages include rate limit information when applicable

## Troubleshooting

### Common Issues

**Token Validation Fails:**
- Verify token starts with `ghp_` and is 40+ characters
- Check token hasn't expired in GitHub settings
- Ensure required scopes (`repo`, `read:user`) are selected

**Permission Denied Errors:**
- Verify token has access to the target repository
- For private repositories, ensure `repo` scope is granted
- For organization repositories, check organization access settings

**Request Timeouts:**
- GitHub API may be experiencing high load
- Large repositories or complex searches may take longer
- Consider reducing `per_page` parameters for large result sets

**Connection Issues:**
- Check internet connectivity
- Verify GitHub API status at [status.github.com](https://status.github.com)
- Ensure no corporate firewall is blocking GitHub API access

### Debug Mode
```javascript
const github = new GitHubProvider({
    debug: true  // Enable detailed logging
});
```

## Development and Extension

### Adding Custom Tools

1. **Extend GitHubTools class:**
```javascript
import { GitHubTools } from './js/providers/github/github-tools.js';

class CustomGitHubTools extends GitHubTools {
    getToolDefinitions() {
        const tools = super.getToolDefinitions();
        
        // Add custom tool
        tools.set('github_custom_tool', {
            name: 'github_custom_tool',
            description: 'Custom GitHub operation',
            parameters: { /* parameter schema */ },
            handler: this.customTool.bind(this)
        });
        
        return tools;
    }
    
    async customTool(params, credentials) {
        // Custom implementation
    }
}
```

2. **Create Provider with Custom Tools:**
```javascript
import { GitHubProvider } from './js/providers/github/github-provider.js';

class CustomGitHubProvider extends GitHubProvider {
    constructor(config) {
        super(config);
        this.githubTools = new CustomGitHubTools(this.endpoints);
        this.tools = this.githubTools.getToolDefinitions();
        this._bindToolHandlers();
    }
}
```

### Provider Blueprint

This GitHub provider serves as a blueprint for creating other MCP providers. Key patterns:

1. **Modular Architecture:** Separate auth, tools, UI, and core provider logic
2. **Standard Interface:** Implement `MCPProviderInterface` methods
3. **Tool Registry:** Use Map-based tool definitions with rich metadata
4. **Error Handling:** Comprehensive error handling with timeout management
5. **Security:** Encrypted credential storage and validation
6. **UI Integration:** Modal-based setup with real-time validation

## API Reference

### GitHubProvider Class

#### Methods
- `authenticate(authConfig)` - Authenticate with GitHub
- `validateCredentials(credentials)` - Validate stored credentials
- `getToolDefinitions()` - Get available tool definitions
- `executeTool(toolName, parameters, context)` - Execute a specific tool
- `getUserInfo()` - Get authenticated user information
- `hasValidCredentials()` - Check if valid credentials exist

### GitHubAuth Class

#### Methods
- `authenticate(authConfig)` - Handle authentication flow
- `validateToken(token)` - Validate GitHub PAT token
- `saveToken(token)` - Save token to encrypted storage
- `getSavedToken()` - Retrieve saved token
- `removeToken()` - Remove saved token
- `getUserInfo(token)` - Get user info for token

### GitHubUI Class

#### Methods
- `showTokenSetupDialog()` - Display token setup modal
- `quickSetup()` - Simplified setup flow
- `createStatusDisplay()` - Generate connection status UI
- `showSharingDialog()` - Display sharing interface
- `connectToGitHub()` - Connect using saved token

## License

This provider is part of the hacka.re project and follows the same license terms.

## Contributing

When contributing to this provider:

1. **Follow the modular architecture** - Keep auth, tools, UI, and core logic separated
2. **Add comprehensive tests** - Test both success and error cases
3. **Update documentation** - Add examples for new tools or features
4. **Respect API limits** - Implement proper rate limiting and error handling
5. **Maintain security** - Never log or expose credentials

For questions or support, please refer to the main project documentation or open an issue in the repository.