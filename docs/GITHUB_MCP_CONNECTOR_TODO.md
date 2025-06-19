# GitHub MCP Connector - Implementation TODO

## Problem Summary
GitHub OAuth Device Flow cannot work in a browser due to CORS restrictions on GitHub's API endpoints. This is a fundamental limitation that cannot be overcome without a proxy server.

## Recommended Solution: Personal Access Token Flow

### 1. Update UI Flow (Priority: HIGH)

Replace the current OAuth flow with a PAT input flow:

```javascript
// In mcp-quick-connectors-refactored.js, modify the GitHub connector setup
github: {
    name: 'GitHub',
    icon: 'fab fa-github',
    description: 'Access GitHub repositories, issues, and pull requests',
    transport: 'bearer-token',  // Change from 'oauth'
    serverUrl: 'https://api.github.com',
    setupInstructions: {
        title: 'GitHub Personal Access Token Setup',
        steps: [
            'Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)',
            'Click "Generate new token"',
            'Give your token a descriptive name like "hacka.re MCP"',
            'Select scopes: "repo" for full repository access, "read:user" for user info',
            'Click "Generate token" and copy the token immediately',
            'Paste the token below (it won\'t be shown again on GitHub)',
            'Note: Store this token securely - hacka.re encrypts it locally'
        ],
        docUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
    }
}
```

### 2. Implement Token Input Dialog (Priority: HIGH)

Create a new method in `mcp-quick-connectors-refactored.js`:

```javascript
function showTokenInputDialog(serviceKey) {
    const config = QUICK_CONNECTORS[serviceKey];
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'quick-connector-token-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${config.name} Personal Access Token</h3>
            
            <div class="token-setup-instructions">
                <h4>⚠️ Important: GitHub Requires Personal Access Token</h4>
                <p>Due to browser security restrictions (CORS), GitHub's OAuth Device Flow 
                   cannot be used in client-side applications. Please use a Personal Access Token instead.</p>
                
                <h5>Setup Instructions:</h5>
                <ol>
                    ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
                
                <p class="form-help">
                    <a href="${config.setupInstructions.docUrl}" target="_blank">
                        View GitHub's official documentation <i class="fas fa-external-link-alt"></i>
                    </a>
                </p>
            </div>
            
            <div class="token-input-form">
                <div class="form-group">
                    <label for="github-pat-input">Personal Access Token</label>
                    <input type="password" 
                           id="github-pat-input" 
                           placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                           class="mcp-input" />
                    <small class="form-help">Your token will be encrypted and stored locally</small>
                </div>
                
                <div class="form-actions">
                    <button class="btn primary-btn" onclick="MCPQuickConnectors.saveToken('${serviceKey}')">
                        Save & Connect
                    </button>
                    <button class="btn secondary-btn" onclick="MCPQuickConnectors.closeTokenDialog()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('github-pat-input').focus();
}
```

### 3. Update Connection Logic (Priority: HIGH)

Modify the `connectService` method to handle token-based authentication:

```javascript
async connectService(serviceKey) {
    const config = QUICK_CONNECTORS[serviceKey];
    
    if (config.transport === 'bearer-token') {
        // Check if we have a saved token
        const savedToken = await this.getSavedToken(serviceKey);
        
        if (!savedToken) {
            showTokenInputDialog(serviceKey);
            return;
        }
        
        // Connect using bearer token
        const mcpConfig = {
            name: `mcp-${serviceKey}`,
            description: config.description,
            transport: {
                type: 'http',
                url: config.serverUrl,
                headers: {
                    'Authorization': `Bearer ${savedToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        };
        
        // Continue with MCP connection...
    }
}
```

### 4. Add Token Storage (Priority: HIGH)

Implement secure token storage using the existing encryption service:

```javascript
async saveToken(serviceKey) {
    const tokenInput = document.getElementById('github-pat-input');
    const token = tokenInput.value.trim();
    
    if (!token) {
        alert('Please enter a Personal Access Token');
        return;
    }
    
    // Validate token format (GitHub PATs start with ghp_)
    if (serviceKey === 'github' && !token.startsWith('ghp_')) {
        if (!confirm('This doesn\'t look like a GitHub Personal Access Token. Continue anyway?')) {
            return;
        }
    }
    
    // Save encrypted token
    const storageKey = `mcp_${serviceKey}_token`;
    await window.StorageService.setValue(storageKey, token);
    
    // Close dialog and connect
    this.closeTokenDialog();
    await this.connectService(serviceKey);
}
```

### 5. Update Error Messages (Priority: MEDIUM)

Add clear error handling for CORS issues:

```javascript
// In mcp-oauth-service-refactored.js, catch CORS errors specifically
catch (error) {
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        console.error('[MCP OAuth] CORS error detected - GitHub OAuth not supported in browser');
        throw new MCPOAuthError(
            'GitHub OAuth Device Flow is not supported in browsers due to CORS restrictions. Please use a Personal Access Token instead.',
            'cors_not_supported'
        );
    }
    // ... existing error handling
}
```

### 6. Update Documentation (Priority: LOW)

- Update README.md to explain GitHub token requirement
- Add note in CLAUDE.md about GitHub MCP limitations
- Update any MCP setup guides

### 7. Clean Up OAuth Code (Priority: LOW)

Once PAT flow is working:
- Remove device flow attempt for GitHub
- Keep the redirect interception (it's still useful)
- Add comments explaining why OAuth doesn't work

## Testing

Create new test: `test_github_pat_flow.py`
- Test token input dialog appears
- Test token validation
- Test successful connection with token
- Test token is encrypted in storage
- Test reconnection with saved token

## Future Considerations

1. **Fine-grained PATs**: GitHub now supports fine-grained personal access tokens with better permission control
2. **Token Rotation**: Add UI for refreshing/updating tokens
3. **Token Validation**: Add a "Test Connection" button to verify the token works
4. **Proxy Service**: Document how users could set up their own proxy if needed

## Timeline

1. **Week 1**: Implement token input dialog and storage
2. **Week 2**: Update connection logic and error handling
3. **Week 3**: Testing and documentation
4. **Week 4**: Clean up and user feedback incorporation

---

*Note: This is a pragmatic solution that maintains hacka.re's serverless architecture while providing GitHub integration.*