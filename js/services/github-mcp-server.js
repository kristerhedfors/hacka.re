/**
 * GitHub MCP Server Integration
 * 
 * Integrates with GitHub's official Model Context Protocol server at
 * https://api.githubcopilot.com/mcp/ according to GitHub's documentation.
 * 
 * Supports both OAuth and Personal Access Token authentication methods.
 */

(function(global) {
    'use strict';

    class GitHubMCPServer {
        constructor() {
            this.serverUrl = 'https://api.githubcopilot.com/mcp/';
            this.serverName = 'github-copilot-mcp';
            this.connected = false;
            this.authMethod = null; // 'oauth' or 'pat'
            this.mcpClient = null;
            this.tools = [];
        }

        /**
         * Initialize the GitHub MCP server connector
         */
        async initialize() {
            console.log('[GitHub MCP Server] Initializing...');
            
            // Get reference to MCP client
            this.mcpClient = window.MCPClientService;
            if (!this.mcpClient) {
                console.warn('[GitHub MCP Server] MCP Client Service not available');
                return false;
            }

            console.log('[GitHub MCP Server] Initialized successfully');
            return true;
        }

        /**
         * Connect to GitHub MCP server with OAuth authentication
         * @returns {Promise<boolean>} True if connected successfully
         */
        async connectWithOAuth() {
            console.log('[GitHub MCP Server] Attempting OAuth connection...');
            
            try {
                // Start OAuth flow with GitHub Copilot scopes
                const authConfig = {
                    authorizationUrl: 'https://github.com/login/oauth/authorize',
                    tokenUrl: 'https://github.com/login/oauth/access_token',
                    clientId: await this.getOAuthClientId(),
                    scope: this.getRequiredScopes(),
                    redirectUri: this.getRedirectUri(),
                    provider: 'github-copilot'
                };

                if (!authConfig.clientId) {
                    throw new Error('No OAuth Client ID configured. Please set up OAuth credentials first.');
                }

                // Use existing OAuth service
                const oauthService = window.mcpOAuthService || new window.MCPOAuthService.OAuthService();
                
                // Check for existing valid token
                try {
                    const existingToken = await oauthService.getAccessToken(this.serverName, false);
                    if (existingToken) {
                        console.log('[GitHub MCP Server] Using existing OAuth token');
                        return await this.connectWithToken(existingToken, 'oauth');
                    }
                } catch (error) {
                    console.log('[GitHub MCP Server] No existing token, starting new OAuth flow');
                }

                // Start OAuth authorization flow
                const authResult = await oauthService.startAuthorizationFlow(this.serverName, authConfig);
                
                // Open authorization window
                const authWindow = window.open(authResult.authorizationUrl, 'github_oauth', 'width=600,height=700');
                
                // Wait for authorization
                await this.waitForOAuthCompletion(authWindow, authResult.state);
                
                // Get the access token
                const accessToken = await oauthService.getAccessToken(this.serverName, true);
                
                return await this.connectWithToken(accessToken, 'oauth');
                
            } catch (error) {
                console.error('[GitHub MCP Server] OAuth connection failed:', error);
                throw new Error(`GitHub OAuth failed: ${error.message}`);
            }
        }

        /**
         * Connect to GitHub MCP server with Personal Access Token
         * @param {string} token - GitHub Personal Access Token
         * @returns {Promise<boolean>} True if connected successfully
         */
        async connectWithPAT(token) {
            console.log('[GitHub MCP Server] Attempting PAT connection...');
            
            try {
                // Validate the token first
                const isValid = await this.validateToken(token);
                if (!isValid) {
                    throw new Error('Invalid GitHub Personal Access Token');
                }

                return await this.connectWithToken(token, 'pat');
                
            } catch (error) {
                console.error('[GitHub MCP Server] PAT connection failed:', error);
                throw new Error(`GitHub PAT connection failed: ${error.message}`);
            }
        }

        /**
         * Connect to GitHub MCP server with a token
         * @param {string} token - Access token (OAuth or PAT)
         * @param {string} authMethod - Authentication method ('oauth' or 'pat')
         * @returns {Promise<boolean>} True if connected successfully
         */
        async connectWithToken(token, authMethod) {
            try {
                console.log(`[GitHub MCP Server] Connecting with ${authMethod.toUpperCase()} token...`);

                // Create MCP server configuration
                const mcpConfig = {
                    name: this.serverName,
                    description: 'GitHub Copilot MCP Server - Access GitHub repositories, issues, and more',
                    transport: {
                        type: 'http',
                        url: this.serverUrl,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }
                };

                // Test connection first with a simple request
                await this.testConnection(token);

                // Connect to MCP server
                await this.mcpClient.connect(this.serverName, mcpConfig, {
                    onNotification: (notification) => {
                        console.log(`[GitHub MCP Server] Notification:`, notification);
                    },
                    onToolsChanged: (tools) => {
                        console.log(`[GitHub MCP Server] Tools updated:`, tools);
                        this.tools = tools || [];
                    }
                });

                // Store connection state
                this.connected = true;
                this.authMethod = authMethod;

                // Save token for reconnection
                await this.saveToken(token, authMethod);

                console.log(`[GitHub MCP Server] Successfully connected via ${authMethod.toUpperCase()}`);
                return true;

            } catch (error) {
                console.error('[GitHub MCP Server] Connection failed:', error);
                this.connected = false;
                this.authMethod = null;
                throw error;
            }
        }

        /**
         * Test connection to GitHub MCP server
         * @param {string} token - Access token
         */
        async testConnection(token) {
            try {
                const response = await fetch(this.serverUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'tools/list',
                        id: 1
                    })
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Authentication failed - invalid token or insufficient permissions');
                    } else if (response.status === 403) {
                        throw new Error('Access forbidden - GitHub Copilot subscription may be required');
                    } else if (response.status === 404) {
                        throw new Error('GitHub MCP server not found - service may not be available');
                    } else {
                        throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
                    }
                }

                const result = await response.json();
                if (result.error) {
                    throw new Error(`MCP server error: ${result.error.message || JSON.stringify(result.error)}`);
                }

                console.log('[GitHub MCP Server] Connection test successful');
                
            } catch (error) {
                // Handle CORS and network errors
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    throw new Error('Network error: Cannot reach GitHub MCP server. This may be due to:\n' +
                                  '• CORS restrictions when running from file:// URLs\n' +
                                  '• GitHub MCP server may require running from https:// domain\n' +
                                  '• Service may be restricted to official GitHub integrations\n' +
                                  '• Try running from a web server (http://localhost:8000)');
                }
                
                if (error.message.includes('CORS policy')) {
                    throw new Error('CORS error: GitHub MCP server blocks requests from this origin.\n' +
                                  'The GitHub MCP server may only work with:\n' +
                                  '• Official GitHub Copilot integrations\n' +
                                  '• Specific authorized domains\n' +
                                  '• Applications running from github.com or official Copilot extensions');
                }
                
                // Re-throw the original error if it's not a network/CORS issue
                throw error;
            }
        }

        /**
         * Validate GitHub token
         * @param {string} token - GitHub token to validate
         * @returns {Promise<boolean>} True if valid
         */
        async validateToken(token) {
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                return response.ok;
            } catch (error) {
                console.error('[GitHub MCP Server] Token validation failed:', error);
                return false;
            }
        }

        /**
         * Disconnect from GitHub MCP server
         */
        async disconnect() {
            try {
                if (this.connected && this.mcpClient) {
                    await this.mcpClient.disconnect(this.serverName);
                }

                this.connected = false;
                this.authMethod = null;
                this.tools = [];

                // Clear saved token
                await this.clearSavedToken();

                console.log('[GitHub MCP Server] Disconnected successfully');
            } catch (error) {
                console.error('[GitHub MCP Server] Disconnect failed:', error);
                throw error;
            }
        }

        /**
         * Get connection status
         * @returns {Object} Connection status information
         */
        getStatus() {
            return {
                connected: this.connected,
                authMethod: this.authMethod,
                serverUrl: this.serverUrl,
                serverName: this.serverName,
                toolCount: this.tools.length,
                tools: this.tools
            };
        }

        /**
         * Show OAuth setup dialog for GitHub Copilot
         * @returns {Promise<boolean>} True if setup completed
         */
        async showOAuthSetupDialog() {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'github-mcp-oauth-setup-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fab fa-github"></i> GitHub Copilot MCP Setup</h3>
                            <button class="modal-close" onclick="this.closest('.modal').remove(); resolve(false);">&times;</button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="github-mcp-instructions">
                                <h4>OAuth Setup Instructions:</h4>
                                <ol>
                                    <li>Go to <a href="https://github.com/settings/developers" target="_blank">GitHub Developer Settings</a></li>
                                    <li>Create a new OAuth App or use an existing one</li>
                                    <li>Set Authorization callback URL to: <code>${this.getRedirectUri()}</code></li>
                                    <li>Copy your Client ID and paste it below</li>
                                    <li>Grant the following scopes when prompted:
                                        <ul>
                                            <li><strong>repo</strong> - Repository access</li>
                                            <li><strong>read:user</strong> - User information</li>
                                            <li><strong>read:org</strong> - Organization access</li>
                                        </ul>
                                    </li>
                                </ol>
                                
                                <div class="warning-box">
                                    <i class="fas fa-info-circle"></i>
                                    <strong>Note:</strong> This connects to GitHub's official MCP server which may require 
                                    a GitHub Copilot subscription.
                                </div>
                            </div>
                            
                            <div class="oauth-input-section">
                                <div class="form-group">
                                    <label for="github-oauth-client-id">
                                        <i class="fab fa-github"></i> OAuth Client ID
                                    </label>
                                    <input type="text" 
                                           id="github-oauth-client-id" 
                                           placeholder="Iv1.xxxxxxxxxxxxxxxx" 
                                           class="oauth-input" 
                                           autocomplete="off" />
                                    <small class="form-help">Client ID from your GitHub OAuth App</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn secondary-btn" onclick="this.closest('.modal').remove();">
                                Cancel
                            </button>
                            <button class="btn primary-btn" id="start-github-oauth">
                                <i class="fas fa-key"></i> Start OAuth Flow
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                const clientIdInput = document.getElementById('github-oauth-client-id');
                const startButton = document.getElementById('start-github-oauth');
                
                // Focus on input
                setTimeout(() => clientIdInput.focus(), 100);
                
                // Handle OAuth start
                startButton.addEventListener('click', async () => {
                    const clientId = clientIdInput.value.trim();
                    
                    if (!clientId) {
                        alert('Please enter your OAuth Client ID');
                        return;
                    }
                    
                    try {
                        // Save OAuth client ID
                        await this.saveOAuthClientId(clientId);
                        
                        modal.remove();
                        
                        // Start OAuth flow
                        const result = await this.connectWithOAuth();
                        resolve(result);
                        
                    } catch (error) {
                        console.error('[GitHub MCP Server] OAuth setup failed:', error);
                        alert(`OAuth setup failed: ${error.message}`);
                        resolve(false);
                    }
                });
            });
        }

        /**
         * Show PAT setup dialog
         * @returns {Promise<boolean>} True if setup completed
         */
        async showPATSetupDialog() {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'github-mcp-pat-setup-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fab fa-github"></i> GitHub MCP Personal Access Token</h3>
                            <button class="modal-close" onclick="this.closest('.modal').remove(); resolve(false);">&times;</button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="github-mcp-instructions">
                                <h4>Personal Access Token Setup:</h4>
                                <ol>
                                    <li>Go to <a href="https://github.com/settings/personal-access-tokens/tokens" target="_blank">GitHub Settings → Personal Access Tokens</a></li>
                                    <li>Click "Generate new token (classic)"</li>
                                    <li>Give your token a descriptive name like "hacka.re GitHub MCP"</li>
                                    <li>Select these scopes:
                                        <ul>
                                            <li><strong>repo</strong> - Full control of private repositories</li>
                                            <li><strong>read:user</strong> - Read user profile data</li>
                                            <li><strong>read:org</strong> - Read organization data</li>
                                        </ul>
                                    </li>
                                    <li>Click "Generate token" and copy it immediately</li>
                                    <li>Paste the token below (it won't be shown again on GitHub)</li>
                                </ol>
                                
                                <div class="warning-box">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <strong>Important:</strong> Your token will be encrypted and stored locally. 
                                    This connects to GitHub's official MCP server which may require specific permissions.
                                </div>
                            </div>
                            
                            <div class="token-input-section">
                                <div class="form-group">
                                    <label for="github-mcp-token-input">
                                        <i class="fab fa-github"></i> GitHub Personal Access Token
                                    </label>
                                    <div class="input-with-validation">
                                        <input type="password" 
                                               id="github-mcp-token-input" 
                                               placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                                               class="token-input" 
                                               autocomplete="off" />
                                        <div class="validation-status" id="token-validation-status"></div>
                                    </div>
                                    <small class="form-help">Classic tokens start with "ghp_" and are 40+ characters long</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn secondary-btn" onclick="this.closest('.modal').remove();">
                                Cancel
                            </button>
                            <button class="btn primary-btn" id="validate-and-connect-token" disabled>
                                <i class="fas fa-key"></i> Validate & Connect
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                const tokenInput = document.getElementById('github-mcp-token-input');
                const connectBtn = document.getElementById('validate-and-connect-token');
                const validationStatus = document.getElementById('token-validation-status');
                let validationTimeout;
                
                // Real-time validation as user types
                tokenInput.addEventListener('input', () => {
                    const token = tokenInput.value.trim();
                    
                    // Clear previous timeout
                    clearTimeout(validationTimeout);
                    
                    if (token.length === 0) {
                        validationStatus.innerHTML = '';
                        connectBtn.disabled = true;
                        return;
                    }
                    
                    // Basic format validation
                    if (!token.startsWith('ghp_')) {
                        validationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Token should start with "ghp_"';
                        connectBtn.disabled = true;
                        return;
                    }
                    
                    if (token.length < 40) {
                        validationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Token seems too short';
                        connectBtn.disabled = true;
                        return;
                    }
                    
                    // Show checking status
                    validationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking format...';
                    
                    // Debounce validation
                    validationTimeout = setTimeout(async () => {
                        validationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating with GitHub...';
                        
                        const isValid = await this.validateToken(token);
                        if (isValid) {
                            validationStatus.innerHTML = '<i class="fas fa-check text-success"></i> Token is valid!';
                            connectBtn.disabled = false;
                        } else {
                            validationStatus.innerHTML = '<i class="fas fa-times text-error"></i> Token is invalid or expired';
                            connectBtn.disabled = true;
                        }
                    }, 1000);
                });
                
                // Focus on input
                setTimeout(() => tokenInput.focus(), 100);
                
                // Handle connect
                connectBtn.addEventListener('click', async () => {
                    const token = tokenInput.value.trim();
                    
                    if (!token) {
                        alert('Please enter a token');
                        return;
                    }
                    
                    try {
                        connectBtn.disabled = true;
                        connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                        
                        const result = await this.connectWithPAT(token);
                        
                        modal.remove();
                        
                        if (result) {
                            alert('GitHub MCP server connected successfully!');
                            resolve(true);
                        } else {
                            alert('Connection failed. Please check your token and try again.');
                            resolve(false);
                        }
                        
                    } catch (error) {
                        console.error('[GitHub MCP Server] PAT connection failed:', error);
                        alert(`Connection failed: ${error.message}`);
                        connectBtn.disabled = false;
                        connectBtn.innerHTML = '<i class="fas fa-key"></i> Validate & Connect';
                        resolve(false);
                    }
                });
            });
        }

        /**
         * Get required OAuth scopes for GitHub MCP
         * @returns {string} Space-separated scopes
         */
        getRequiredScopes() {
            return 'repo read:user read:org';
        }

        /**
         * Get OAuth redirect URI
         * @returns {string} Redirect URI
         */
        getRedirectUri() {
            const origin = window.location.origin;
            if (origin.startsWith('file://')) {
                return 'http://localhost:8000';
            }
            return origin;
        }

        /**
         * Wait for OAuth completion
         * @param {Window} authWindow - Authorization window
         * @param {string} state - OAuth state parameter
         */
        waitForOAuthCompletion(authWindow, state) {
            return new Promise((resolve, reject) => {
                let checkCount = 0;
                const maxChecks = 120; // 60 seconds maximum wait time
                
                const checkInterval = setInterval(() => {
                    checkCount++;
                    
                    try {
                        if (authWindow.closed) {
                            clearInterval(checkInterval);
                            reject(new Error('Authorization window was closed'));
                            return;
                        }
                        
                        // Try to check URL (will fail with cross-origin until redirect)
                        const currentUrl = authWindow.location.href;
                        
                        if (currentUrl.includes('/oauth/callback') || currentUrl.includes('code=')) {
                            authWindow.close();
                            clearInterval(checkInterval);
                            resolve();
                        }
                        
                        // Timeout check
                        if (checkCount >= maxChecks) {
                            clearInterval(checkInterval);
                            authWindow.close();
                            reject(new Error('OAuth timeout'));
                        }
                        
                    } catch (e) {
                        // Cross-origin error is expected, continue checking
                    }
                }, 500);
            });
        }

        /**
         * Save OAuth Client ID
         * @param {string} clientId - OAuth Client ID
         */
        async saveOAuthClientId(clientId) {
            try {
                await window.CoreStorageService.setValue('github_mcp_oauth_client_id', clientId);
                console.log('[GitHub MCP Server] OAuth Client ID saved');
            } catch (error) {
                console.error('[GitHub MCP Server] Failed to save OAuth Client ID:', error);
                throw new Error('Failed to save OAuth configuration');
            }
        }

        /**
         * Get saved OAuth Client ID
         * @returns {Promise<string|null>} Client ID or null
         */
        async getOAuthClientId() {
            try {
                return await window.CoreStorageService.getValue('github_mcp_oauth_client_id');
            } catch (error) {
                console.error('[GitHub MCP Server] Failed to get OAuth Client ID:', error);
                return null;
            }
        }

        /**
         * Save authentication token
         * @param {string} token - Access token
         * @param {string} authMethod - Authentication method
         */
        async saveToken(token, authMethod) {
            try {
                await window.CoreStorageService.setValue('github_mcp_token', token);
                await window.CoreStorageService.setValue('github_mcp_auth_method', authMethod);
                console.log('[GitHub MCP Server] Token saved');
            } catch (error) {
                console.error('[GitHub MCP Server] Failed to save token:', error);
                throw new Error('Failed to save authentication token');
            }
        }

        /**
         * Get saved authentication token
         * @returns {Promise<Object|null>} Token info or null
         */
        async getSavedToken() {
            try {
                const token = await window.CoreStorageService.getValue('github_mcp_token');
                const authMethod = await window.CoreStorageService.getValue('github_mcp_auth_method');
                
                if (token && authMethod) {
                    return { token, authMethod };
                }
                return null;
            } catch (error) {
                console.error('[GitHub MCP Server] Failed to get saved token:', error);
                return null;
            }
        }

        /**
         * Clear saved authentication token
         */
        async clearSavedToken() {
            try {
                await window.CoreStorageService.removeValue('github_mcp_token');
                await window.CoreStorageService.removeValue('github_mcp_auth_method');
                console.log('[GitHub MCP Server] Saved token cleared');
            } catch (error) {
                console.error('[GitHub MCP Server] Failed to clear saved token:', error);
            }
        }

        /**
         * Auto-connect using saved credentials
         * @returns {Promise<boolean>} True if connected successfully
         */
        async autoConnect() {
            try {
                const savedToken = await this.getSavedToken();
                if (!savedToken) {
                    console.log('[GitHub MCP Server] No saved credentials found');
                    return false;
                }

                console.log(`[GitHub MCP Server] Attempting auto-connect with ${savedToken.authMethod.toUpperCase()}`);
                
                // Validate token is still good
                if (savedToken.authMethod === 'pat') {
                    const isValid = await this.validateToken(savedToken.token);
                    if (!isValid) {
                        console.log('[GitHub MCP Server] Saved PAT token is no longer valid');
                        await this.clearSavedToken();
                        return false;
                    }
                }

                return await this.connectWithToken(savedToken.token, savedToken.authMethod);
                
            } catch (error) {
                console.error('[GitHub MCP Server] Auto-connect failed:', error);
                return false;
            }
        }
    }

    // Export to global scope
    global.GitHubMCPServer = GitHubMCPServer;

})(window);