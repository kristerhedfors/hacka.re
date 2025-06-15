/**
 * MCP OAuth Flow Manager Component for hacka.re
 * 
 * Manages the OAuth authorization flow UI, including redirect handling,
 * code exchange, and token status display.
 * 
 * Features:
 * - OAuth redirect flow handling
 * - Authorization code input UI
 * - Token status display
 * - Re-authorization controls
 * - Error handling and recovery
 */

class MCPOAuthFlow {
    constructor() {
        this.oauthService = null;
        this.oauthConfig = window.mcpOAuthConfig;
        this.activeFlows = new Map();
        this.initializeService();
    }

    async initializeService() {
        // Initialize OAuth service
        if (window.MCPOAuthService) {
            this.oauthService = new window.MCPOAuthService.OAuthService();
            
            // Wait a moment for the OAuth service to fully initialize
            // This ensures pending flows are loaded before callback detection
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Check for OAuth callback in URL
        await this.checkForOAuthCallback();
    }

    /**
     * Check if current page is an OAuth callback
     */
    async checkForOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (code && state) {
            console.log('[MCP OAuth Flow] Detected OAuth callback with code and state');
            
            // Parse state parameter: baseState:namespaceId or baseState:namespaceId:encodedSessionKey
            const stateParts = state.split(':');
            const baseState = stateParts[0];
            const namespaceId = stateParts[1];
            const encodedSessionKey = stateParts[2]; // Optional
            
            if (namespaceId) {
                console.log(`[MCP OAuth Flow] OAuth callback for namespace: ${namespaceId}`);
            }
            
            // Check if this is a GitHub callback - we should ignore it since GitHub uses Device Flow
            if (this.oauthService) {
                // Try to get the pending flow to check if it's GitHub
                let pendingFlow = this.oauthService.pendingFlows.get(state);
                
                // If not found in memory, try to load from storage
                if (!pendingFlow) {
                    await this.oauthService.loadPendingFlows();
                    pendingFlow = this.oauthService.pendingFlows.get(state);
                }
                
                console.log('[MCP OAuth Flow] Checking pending flow for device flow detection:', {
                    foundFlow: !!pendingFlow,
                    provider: pendingFlow?.config?.provider,
                    useDeviceFlow: pendingFlow?.config?.useDeviceFlow,
                    config: pendingFlow?.config
                });
                
                if (pendingFlow && pendingFlow.config && 
                    (pendingFlow.config.provider === 'github' || pendingFlow.config.useDeviceFlow)) {
                    console.log('[MCP OAuth Flow] Detected device flow provider OAuth callback - redirecting to proper device flow');
                    // Clean up the URL parameters without processing
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Show the device flow message to guide the user
                    console.log('[MCP OAuth Flow] About to show GitHub device flow message modal');
                    this.showGitHubDeviceFlowMessage(pendingFlow);
                    return;
                }
            }
            
            // Restore session from state parameter if available
            if (encodedSessionKey) {
                console.log('[MCP OAuth Flow] Session key found in state parameter');
                this.restoreSessionFromState(encodedSessionKey, namespaceId);
            } else if (namespaceId && !window.ShareManager?.getSessionKey?.()) {
                // Fallback: prompt user for session password if no session key
                console.log('[MCP OAuth Flow] No session key in state, prompting user');
                this.promptForSessionPassword(namespaceId);
            }
            
            // Handle OAuth callback for non-GitHub providers
            this.handleOAuthCallback(code, state, error);
        }
    }

    /**
     * Restore session context from URL parameter
     * @param {string} encodedSession - Base64 encoded session key
     * @param {string} namespaceId - Namespace ID from state parameter
     */
    restoreSessionFromUrl(encodedSession, namespaceId) {
        try {
            // Decode the session key
            const sessionKey = atob(decodeURIComponent(encodedSession));
            
            console.log(`[MCP OAuth Flow] Restoring session for namespace: ${namespaceId}`);
            
            // Set the session key in ShareManager if available
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSessionKey(sessionKey);
                console.log('[MCP OAuth Flow] Session key restored successfully');
            } else if (window.ShareManager && window.ShareManager.setSessionKey) {
                // Fallback for different initialization patterns
                window.ShareManager.setSessionKey(sessionKey);
                console.log('[MCP OAuth Flow] Session key restored via fallback method');
            } else {
                console.error('[MCP OAuth Flow] ShareManager not available for session restoration');
                return false;
            }
            
            // Clean up the URL by removing the oauth_session parameter
            const url = new URL(window.location);
            url.searchParams.delete('oauth_session');
            window.history.replaceState({}, document.title, url.toString());
            
            return true;
        } catch (error) {
            console.error('[MCP OAuth Flow] Failed to restore session from URL:', error);
            return false;
        }
    }

    /**
     * Restore session context from state parameter
     * @param {string} encodedSessionKey - Base64 encoded session key (URL-safe)
     * @param {string} namespaceId - Namespace ID from state parameter
     */
    restoreSessionFromState(encodedSessionKey, namespaceId) {
        try {
            // Decode the session key (add back padding if needed)
            let paddedEncodedSession = encodedSessionKey;
            while (paddedEncodedSession.length % 4) {
                paddedEncodedSession += '=';
            }
            const sessionKey = atob(paddedEncodedSession);
            
            console.log(`[MCP OAuth Flow] Restoring session for namespace: ${namespaceId}`);
            
            // Set the session key in ShareManager if available
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSessionKey(sessionKey);
                console.log('[MCP OAuth Flow] Session key restored from state parameter');
            } else if (window.ShareManager && window.ShareManager.setSessionKey) {
                // Fallback for different initialization patterns
                window.ShareManager.setSessionKey(sessionKey);
                console.log('[MCP OAuth Flow] Session key restored from state parameter (fallback)');
            } else {
                console.error('[MCP OAuth Flow] ShareManager not available for session restoration');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[MCP OAuth Flow] Failed to restore session from state parameter:', error);
            return false;
        }
    }

    /**
     * Prompt user for session password to restore OAuth session
     * @param {string} namespaceId - Namespace ID from URL parameter
     */
    promptForSessionPassword(namespaceId) {
        const password = prompt(
            `OAuth callback detected for namespace ${namespaceId}.\n\n` +
            'Please enter your session password to complete the OAuth flow:'
        );
        
        if (password) {
            // Set the session key
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSessionKey(password);
                console.log('[MCP OAuth Flow] Session password set via user prompt');
            } else if (window.ShareManager && window.ShareManager.setSessionKey) {
                window.ShareManager.setSessionKey(password);
                console.log('[MCP OAuth Flow] Session password set via user prompt (fallback)');
            }
            
            // Clean up the oauth_namespace parameter
            const url = new URL(window.location);
            url.searchParams.delete('oauth_namespace');
            window.history.replaceState({}, document.title, url.toString());
        } else {
            console.warn('[MCP OAuth Flow] User cancelled session password prompt');
        }
    }

    /**
     * Handle OAuth callback from provider
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @param {string} error - Error if any
     */
    async handleOAuthCallback(code, state, error) {
        // Double-check if this is a GitHub flow that should use device flow
        if (this.oauthService) {
            const pendingFlow = this.oauthService.pendingFlows.get(state);
            if (pendingFlow && pendingFlow.config && pendingFlow.config.provider === 'github') {
                console.log('[MCP OAuth Flow] Detected GitHub callback in handleOAuthCallback - this should not happen with device flow');
                this.showGitHubDeviceFlowMessage();
                // Clean up URL and exit
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
        }
        
        // Show callback UI
        this.showCallbackUI(code, state, error);
        
        if (error) {
            const urlParams = new URLSearchParams(window.location.search);
            this.showCallbackError(error, urlParams.get('error_description'));
            return;
        }
        
        try {
            if (this.oauthService) {
                const result = await this.oauthService.completeAuthorizationFlow(code, state);
                this.showCallbackSuccess(result.serverName);
                
                // Clear URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('[MCP OAuth Flow] Authorization failed:', error);
            this.showCallbackError(error.code || 'token_exchange_failed', error.message);
        }
    }

    /**
     * Show OAuth callback UI
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @param {string} error - Error if any
     */
    showCallbackUI(code, state, error) {
        // Create modal for callback handling
        const modal = document.createElement('div');
        modal.className = 'modal oauth-callback-modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>OAuth Authorization</h3>
                <div class="oauth-callback-content">
                    ${error ? 
                        `<div class="error-message">
                            <h4>Authorization Failed</h4>
                            <p>Error: ${error}</p>
                            <p class="error-description"></p>
                        </div>` :
                        `<div class="processing-message">
                            <h4>Processing Authorization...</h4>
                            <p>Exchanging authorization code for access token...</p>
                            <div class="loading-spinner"></div>
                        </div>`
                    }
                </div>
                <div class="modal-actions">
                    <button class="secondary-button" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Show callback success message
     * @param {string} serverName - Server name
     */
    showCallbackSuccess(serverName) {
        const modal = document.querySelector('.oauth-callback-modal');
        if (!modal) return;
        
        const content = modal.querySelector('.oauth-callback-content');
        content.innerHTML = `
            <div class="success-message">
                <h4>✓ Authorization Successful!</h4>
                <p>Successfully authorized MCP server: <strong>${serverName}</strong></p>
                <p>You can now close this window and use the MCP server with OAuth authentication.</p>
            </div>
        `;
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            modal.remove();
        }, 3000);
    }

    /**
     * Show callback error message
     * @param {string} error - Error code
     * @param {string} description - Error description
     */
    showCallbackError(error, description) {
        const modal = document.querySelector('.oauth-callback-modal');
        if (!modal) return;
        
        const content = modal.querySelector('.oauth-callback-content');
        content.innerHTML = `
            <div class="error-message">
                <h4>❌ Authorization Failed</h4>
                <p>Error: ${error}</p>
                ${description ? `<p>Description: ${description}</p>` : ''}
                ${error === 'invalid_state' ? 
                    '<p><strong>Tip:</strong> This may happen if your session changed during OAuth. Try starting the OAuth flow again.</p>' :
                    '<p>Please check your OAuth configuration and try again.</p>'
                }
            </div>
        `;
    }

    /**
     * Create OAuth status UI for a server
     * @param {HTMLElement} container - Container element
     * @param {string} serverName - Server name
     */
    createStatusUI(container, serverName) {
        const tokenInfo = this.oauthService ? 
            this.oauthService.getTokenInfo(serverName) : null;
        
        const statusHTML = `
            <div class="mcp-oauth-status" data-server="${serverName}">
                <h4>OAuth Status</h4>
                
                ${tokenInfo ? this.renderTokenStatus(tokenInfo, serverName) : 
                  this.renderNoTokenStatus(serverName)}
                
                <div class="oauth-flow-actions">
                    ${tokenInfo ? 
                        `<button class="secondary-button" onclick="window.mcpOAuthFlow.revokeToken('${serverName}')">
                            Revoke Token
                        </button>` :
                        `<button class="primary-button" onclick="window.mcpOAuthFlow.startAuthorization('${serverName}')">
                            Authorize
                        </button>`
                    }
                </div>
            </div>
        `;
        
        container.innerHTML = statusHTML;
    }

    /**
     * Render token status UI
     * @param {Object} tokenInfo - Token information
     * @param {string} serverName - Server name
     * @returns {string} HTML string
     */
    renderTokenStatus(tokenInfo, serverName) {
        const statusClass = tokenInfo.isExpired ? 'expired' : 'valid';
        const statusText = tokenInfo.isExpired ? 'Expired' : 'Valid';
        
        return `
            <div class="token-status ${statusClass}">
                <div class="status-item">
                    <label>Status:</label>
                    <span class="status-value">${statusText}</span>
                </div>
                
                <div class="status-item">
                    <label>Type:</label>
                    <span>${tokenInfo.tokenType}</span>
                </div>
                
                <div class="status-item">
                    <label>Scope:</label>
                    <span>${tokenInfo.scope || 'Not specified'}</span>
                </div>
                
                ${tokenInfo.remainingLifetime >= 0 ? 
                    `<div class="status-item">
                        <label>Expires in:</label>
                        <span>${this.formatDuration(tokenInfo.remainingLifetime)}</span>
                    </div>` : ''
                }
                
                ${tokenInfo.hasRefreshToken ? 
                    `<div class="status-item">
                        <label>Refresh Token:</label>
                        <span>✓ Available</span>
                    </div>` : ''
                }
                
                ${tokenInfo.isExpired && tokenInfo.hasRefreshToken ? 
                    `<button class="secondary-button" onclick="window.mcpOAuthFlow.refreshToken('${serverName}')">
                        Refresh Token
                    </button>` : ''
                }
            </div>
        `;
    }

    /**
     * Render no token status UI
     * @param {string} serverName - Server name
     * @returns {string} HTML string
     */
    renderNoTokenStatus(serverName) {
        const hasConfig = this.oauthConfig && 
            this.oauthConfig.hasConfiguration(serverName);
        
        return `
            <div class="token-status no-token">
                <p>No OAuth token found for this server.</p>
                ${hasConfig ? 
                    '<p>OAuth is configured. Click "Authorize" to obtain a token.</p>' :
                    '<p>Please configure OAuth settings first.</p>'
                }
            </div>
        `;
    }

    /**
     * Start OAuth Device Flow (recommended for GitHub)
     * @param {string} serverName - Server name
     */
    async startDeviceFlow(serverName) {
        try {
            // Get configuration
            const config = this.oauthConfig.getConfiguration(serverName);
            if (!config) {
                alert('Please configure OAuth settings first.');
                return;
            }
            
            // Check if this provider supports device flow
            if (config.useDeviceFlow || config.provider === 'github') {
                // Use device flow for GitHub and other providers that support it
                const flowResult = await this.oauthService.startDeviceFlow(serverName, config);
                this.showDeviceFlowInstructions(flowResult);
                this.startDeviceFlowPolling(flowResult.deviceCode);
            } else {
                // Fall back to authorization code flow for other providers
                await this.startAuthorizationCodeFlow(serverName, config);
            }
        } catch (error) {
            alert(`Failed to start OAuth flow: ${error.message}`);
        }
    }

    /**
     * Start OAuth authorization code flow (fallback for non-GitHub providers)
     * @param {string} serverName - Server name
     * @param {Object} config - OAuth configuration
     */
    async startAuthorizationCodeFlow(serverName, config) {
        try {
            // Update OAuth service configuration
            if (this.oauthService) {
                this.oauthService.serverConfigs = this.oauthService.serverConfigs || new Map();
                this.oauthService.serverConfigs.set(serverName, config);
                
                // Start flow
                const flowResult = await this.oauthService.startAuthorizationFlow(serverName, config);
                
                // Open authorization window
                this.openAuthorizationWindow(flowResult.authorizationUrl, serverName, flowResult.state);
            }
        } catch (error) {
            alert(`Failed to start authorization: ${error.message}`);
        }
    }

    /**
     * Legacy method name for compatibility
     * @param {string} serverName - Server name
     */
    async startAuthorization(serverName) {
        return this.startDeviceFlow(serverName);
    }

    /**
     * Open authorization window
     * @param {string} authUrl - Authorization URL
     * @param {string} serverName - Server name
     * @param {string} state - State parameter
     */
    openAuthorizationWindow(authUrl, serverName, state) {
        // Store active flow
        this.activeFlows.set(state, { serverName, startedAt: Date.now() });
        
        // Open in new window
        const authWindow = window.open(authUrl, 'oauth_authorize', 
            'width=600,height=700,menubar=no,toolbar=no');
        
        // Show instructions
        this.showAuthorizationInstructions(serverName, state, authWindow);
    }

    /**
     * Show authorization instructions
     * @param {string} serverName - Server name
     * @param {string} state - State parameter
     * @param {Window} authWindow - Authorization window
     */
    showAuthorizationInstructions(serverName, state, authWindow) {
        const modal = document.createElement('div');
        modal.className = 'modal oauth-instructions-modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Complete Authorization</h3>
                <div class="oauth-instructions">
                    <p>A new window has opened for you to authorize the MCP server.</p>
                    <ol>
                        <li>Log in to your OAuth provider if needed</li>
                        <li>Review and approve the requested permissions</li>
                        <li>You will be redirected back after authorization</li>
                    </ol>
                    
                    <div class="manual-code-entry">
                        <h4>Or enter authorization code manually:</h4>
                        <input type="text" id="manual-auth-code" class="mcp-input" 
                               placeholder="Paste authorization code here">
                        <button class="primary-button" 
                                onclick="window.mcpOAuthFlow.submitManualCode('${state}')">
                            Submit Code
                        </button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="secondary-button" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Monitor auth window
        const checkInterval = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkInterval);
                modal.remove();
                // Clean up flow
                this.activeFlows.delete(state);
            }
        }, 1000);
    }

    /**
     * Submit manual authorization code
     * @param {string} state - State parameter
     */
    async submitManualCode(state) {
        const codeInput = document.getElementById('manual-auth-code');
        const code = codeInput.value.trim();
        
        if (!code) {
            alert('Please enter an authorization code');
            return;
        }
        
        try {
            const modal = document.querySelector('.oauth-instructions-modal');
            if (modal) modal.remove();
            
            // Complete flow with manual code
            await this.handleOAuthCallback(code, state, null);
        } catch (error) {
            alert(`Failed to exchange code: ${error.message}`);
        }
    }

    /**
     * Refresh OAuth token
     * @param {string} serverName - Server name
     */
    async refreshToken(serverName) {
        try {
            if (this.oauthService) {
                await this.oauthService.refreshAccessToken(serverName);
                
                // Update UI
                const container = document.querySelector(`[data-server="${serverName}"]`);
                if (container) {
                    this.createStatusUI(container.parentElement, serverName);
                }
                
                alert('Token refreshed successfully!');
            }
        } catch (error) {
            alert(`Failed to refresh token: ${error.message}`);
        }
    }

    /**
     * Revoke OAuth token
     * @param {string} serverName - Server name
     */
    async revokeToken(serverName) {
        if (!confirm('Are you sure you want to revoke the OAuth token? You will need to re-authorize to use this server.')) {
            return;
        }
        
        try {
            if (this.oauthService) {
                await this.oauthService.revokeToken(serverName);
                
                // Update UI
                const container = document.querySelector(`[data-server="${serverName}"]`);
                if (container) {
                    this.createStatusUI(container.parentElement, serverName);
                }
                
                alert('Token revoked successfully.');
            }
        } catch (error) {
            alert(`Failed to revoke token: ${error.message}`);
        }
    }

    /**
     * Show Device Flow instructions modal
     * @param {Object} flowInfo - Device flow information
     */
    showDeviceFlowInstructions(flowInfo) {
        if (flowInfo.isManualFlow) {
            this.showManualDeviceFlowInstructions(flowInfo);
        } else {
            this.showAutomaticDeviceFlowInstructions(flowInfo);
        }
    }
    
    /**
     * Show manual device flow instructions (when CORS prevents automatic flow)
     * @param {Object} flowInfo - Manual flow information
     */
    showManualDeviceFlowInstructions(flowInfo) {
        const modal = document.createElement('div');
        modal.className = 'modal device-flow-modal manual-device-flow';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔧 Manual GitHub Device Flow</h3>
                <div class="device-flow-instructions">
                    <div class="cors-notice">
                        <h4>⚠️ Manual Setup Required</h4>
                        <p>Due to browser security restrictions (CORS), we can't automatically request a device code from GitHub. 
                           Please follow these steps to get your device code manually:</p>
                    </div>
                    
                    <div class="manual-steps-section">
                        <h4>Step 1: Get Device Code</h4>
                        <p>Run this command in your terminal or use a tool like Postman:</p>
                        <div class="code-block">
                            <code id="curl-command">curl -X POST https://github.com/login/device/code -H "Accept: application/json" -H "Content-Type: application/x-www-form-urlencoded" -d "client_id=${flowInfo.clientId}&scope=${flowInfo.scope}"</code>
                            <button class="copy-button" onclick="window.mcpOAuthFlow.copyCurlCommand(this)">Copy</button>
                        </div>
                        <p><strong>Multi-line version for readability:</strong></p>
                        <div class="code-block">
                            <pre id="curl-command-multiline">curl -X POST https://github.com/login/device/code \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=${flowInfo.clientId}&scope=${flowInfo.scope}"</pre>
                        </div>
                        <p><strong>Alternative:</strong> If you have GitHub CLI installed, run: <code>gh auth device-login</code></p>
                    </div>
                    
                    <div class="manual-input-section">
                        <h4>Step 2: Enter the Response</h4>
                        <p>Paste the JSON response from the curl command:</p>
                        <textarea id="device-response-input" placeholder='{
  "device_code": "3584d83530557fdd1f46af8289938c8ef79f9dc5",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://github.com/login/device",
  "expires_in": 900,
  "interval": 5
}' rows="8" class="device-response-textarea"></textarea>
                        <button class="primary-button" onclick="window.mcpOAuthFlow.processManualDeviceResponse('${flowInfo.manualFlowId}')">
                            Process Device Code
                        </button>
                    </div>
                    
                    <div class="help-section">
                        <h4>🔗 Useful Links</h4>
                        <ul>
                            <li><a href="https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow" target="_blank">GitHub Device Flow Documentation</a></li>
                            <li><a href="https://reqbin.com/" target="_blank">Online REST API Tester (alternative to curl)</a></li>
                        </ul>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="secondary-button" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * Show automatic device flow instructions (normal flow)
     * @param {Object} flowInfo - Device flow information
     */
    showAutomaticDeviceFlowInstructions(flowInfo) {
        const modal = document.createElement('div');
        modal.className = 'modal device-flow-modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>✅ GitHub Device Flow Authorization</h3>
                <div class="device-flow-instructions">
                    <div class="device-code-section">
                        <h4>Step 1: Copy this code</h4>
                        <div class="device-code-display">
                            <input type="text" id="device-user-code" class="device-code-input" 
                                   value="${flowInfo.userCode}" readonly>
                            <button class="copy-button" onclick="window.mcpOAuthFlow.copyDeviceCode(this)">Copy</button>
                        </div>
                    </div>
                    
                    <div class="device-verification-section">
                        <h4>Step 2: Visit GitHub and enter the code</h4>
                        <div class="verification-actions">
                            ${flowInfo.verificationUriComplete ? 
                                `<a href="${flowInfo.verificationUriComplete}" target="_blank" class="primary-button">
                                    Open GitHub (code pre-filled)
                                </a>` :
                                `<a href="${flowInfo.verificationUri}" target="_blank" class="primary-button">
                                    Open GitHub
                                </a>`
                            }
                            <p class="verification-url">Or go to: <code>${flowInfo.verificationUri}</code></p>
                        </div>
                    </div>
                    
                    <div class="polling-status">
                        <h4>Step 3: Authorization Status</h4>
                        <div class="status-display">
                            <div class="loading-spinner"></div>
                            <span id="polling-status-text">Waiting for authorization...</span>
                        </div>
                        <div class="polling-details">
                            <p><strong>Server:</strong> ${flowInfo.serverName}</p>
                            <p><strong>Expires in:</strong> <span id="device-flow-countdown">${Math.floor(flowInfo.expiresIn / 60)} minutes</span></p>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="secondary-button" onclick="this.closest('.modal').remove(); window.mcpOAuthFlow.cancelDeviceFlow('${flowInfo.deviceCode}')">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Start countdown timer
        this.startDeviceFlowCountdown(flowInfo.expiresIn);
    }

    /**
     * Start device flow polling
     * @param {string} deviceCode - Device code to poll for
     */
    startDeviceFlowPolling(deviceCode) {
        console.log(`[MCP OAuth Flow] Starting polling for device code: ${deviceCode}`);
        console.log(`[MCP OAuth Flow] Available flows:`, Array.from(this.oauthService.pendingFlows.keys()));
        
        const flowInfo = this.oauthService.pendingFlows.get(deviceCode);
        if (!flowInfo) {
            console.error(`[MCP OAuth Flow] No flow info found for device code: ${deviceCode}`);
            console.error('[MCP OAuth Flow] Available flows:', this.oauthService.pendingFlows);
            return;
        }
        
        const pollInterval = flowInfo.interval * 1000; // Convert to milliseconds
        console.log(`[MCP OAuth Flow] Starting polling every ${flowInfo.interval} seconds`);
        
        const pollTimer = setInterval(async () => {
            try {
                const result = await this.oauthService.pollDeviceFlow(deviceCode);
                
                if (result.pending) {
                    // Update polling interval if GitHub requests slower polling
                    if (result.interval && result.interval !== flowInfo.interval) {
                        clearInterval(pollTimer);
                        flowInfo.interval = result.interval;
                        console.log(`[MCP OAuth Flow] Updating polling interval to ${result.interval} seconds`);
                        this.startDeviceFlowPolling(deviceCode);
                    }
                    return; // Continue polling
                }
                
                // Success!
                clearInterval(pollTimer);
                this.showDeviceFlowSuccess(result.serverName);
                
            } catch (error) {
                clearInterval(pollTimer);
                console.error('[MCP OAuth Flow] Device flow polling failed:', error);
                console.log('[MCP OAuth Flow] Error code:', error.code);
                console.log('[MCP OAuth Flow] Error data:', error.data);
                
                // Check if this is a GitHub CORS error that requires manual token entry
                if (error.code === 'github_cors_polling_failed' && error.data?.requiresManualToken) {
                    console.log('[MCP OAuth Flow] Showing manual token entry for GitHub CORS issue');
                    this.showManualTokenEntry(error.data);
                } else {
                    console.log('[MCP OAuth Flow] Showing device flow error instead of manual token entry');
                    this.showDeviceFlowError(error.message, error.code);
                }
            }
        }, pollInterval);
        
        // Store the timer so we can cancel it if needed
        this.deviceFlowTimer = pollTimer;
    }

    /**
     * Copy curl command to clipboard
     * @param {HTMLElement} button - Copy button element
     */
    copyCurlCommand(button) {
        const curlElement = document.getElementById('curl-command');
        if (!curlElement) return;
        
        const curlText = curlElement.textContent;
        
        // Use modern clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(curlText).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }).catch(() => {
                this.fallbackCopy(curlText, button);
            });
        } else {
            this.fallbackCopy(curlText, button);
        }
    }
    
    /**
     * Copy device code to clipboard
     * @param {HTMLElement} button - Copy button element
     */
    copyDeviceCode(button) {
        const deviceCodeInput = document.getElementById('device-user-code');
        if (!deviceCodeInput) return;
        
        const deviceCode = deviceCodeInput.value;
        
        // Use modern clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(deviceCode).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }).catch(() => {
                this.fallbackCopy(deviceCode, button);
            });
        } else {
            this.fallbackCopy(deviceCode, button);
        }
    }
    
    /**
     * Fallback copy method using selection and execCommand
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Copy button element
     */
    fallbackCopy(text, button) {
        // Create a temporary textarea element
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        tempTextarea.style.position = 'fixed';
        tempTextarea.style.opacity = '0';
        document.body.appendChild(tempTextarea);
        
        try {
            tempTextarea.select();
            tempTextarea.setSelectionRange(0, 99999); // For mobile devices
            const successful = document.execCommand('copy');
            
            if (successful) {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            } else {
                button.textContent = 'Failed';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            button.textContent = 'Failed';
            setTimeout(() => button.textContent = 'Copy', 2000);
        } finally {
            document.body.removeChild(tempTextarea);
        }
    }
    
    /**
     * Process manual device response from user
     * @param {string} manualFlowId - Manual flow ID
     */
    async processManualDeviceResponse(manualFlowId) {
        console.log(`[MCP OAuth Flow] Processing manual device response for flow: ${manualFlowId}`);
        
        const responseText = document.getElementById('device-response-input').value.trim();
        console.log(`[MCP OAuth Flow] Response text length: ${responseText.length}`);
        
        if (!responseText) {
            alert('Please enter the JSON response from the curl command');
            return;
        }
        
        try {
            const deviceData = JSON.parse(responseText);
            console.log('[MCP OAuth Flow] Parsed device data:', deviceData);
            
            // Validate required fields
            if (!deviceData.device_code || !deviceData.user_code || !deviceData.verification_uri) {
                throw new Error('Missing required fields in device response');
            }
            
            console.log('[MCP OAuth Flow] Submitting manual device data...');
            // Submit manual device data
            const flowInfo = await this.oauthService.submitManualDeviceData(manualFlowId, deviceData);
            console.log('[MCP OAuth Flow] Flow info created:', flowInfo);
            
            // Close current modal
            const modal = document.querySelector('.manual-device-flow');
            if (modal) {
                console.log('[MCP OAuth Flow] Removing manual flow modal');
                modal.remove();
            }
            
            // Show automatic device flow UI
            console.log('[MCP OAuth Flow] Showing automatic device flow UI');
            this.showAutomaticDeviceFlowInstructions(flowInfo);
            
            // Start polling
            console.log(`[MCP OAuth Flow] Starting polling for device code: ${flowInfo.deviceCode}`);
            this.startDeviceFlowPolling(flowInfo.deviceCode);
            
        } catch (error) {
            console.error('[MCP OAuth Flow] Error processing manual device response:', error);
            alert(`Error processing device response: ${error.message}\n\nPlease check that you pasted valid JSON.`);
        }
    }
    
    /**
     * Cancel device flow
     * @param {string} deviceCode - Device code to cancel
     */
    cancelDeviceFlow(deviceCode) {
        if (this.deviceFlowTimer) {
            clearInterval(this.deviceFlowTimer);
            this.deviceFlowTimer = null;
        }
        
        // Clean up pending flow
        if (this.oauthService && this.oauthService.pendingFlows) {
            this.oauthService.pendingFlows.delete(deviceCode);
            this.oauthService.savePendingFlows();
        }
        
        console.log('[MCP OAuth Flow] Device flow cancelled');
    }

    /**
     * Show GitHub device flow message
     * @param {Object} pendingFlow - Optional pending flow info
     */
    showGitHubDeviceFlowMessage(pendingFlow = null) {
        console.log('[MCP OAuth Flow] showGitHubDeviceFlowMessage called with pendingFlow:', pendingFlow);
        const modal = document.createElement('div');
        modal.className = 'modal github-device-flow-message-modal';
        modal.style.display = 'block';
        console.log('[MCP OAuth Flow] Created modal element:', modal);
        
        const serverName = pendingFlow?.serverName || 'GitHub MCP Server';
        const hasExistingFlow = !!pendingFlow;
        
        // Check for namespace issues
        const currentNamespace = window.NamespaceService ? window.NamespaceService.getNamespaceId() : 'unknown';
        const stateNamespace = pendingFlow?.namespaceId || 'unknown';
        const namespaceMismatch = currentNamespace !== stateNamespace;
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>GitHub OAuth - Device Flow Required</h3>
                <div class="github-device-flow-message">
                    <div class="info-message">
                        <h4>ℹ️ Important Notice</h4>
                        <p>You've been redirected back from GitHub, but GitHub OAuth on hacka.re uses <strong>Device Flow</strong> instead of redirect-based authorization.</p>
                        
                        ${namespaceMismatch ? `
                            <h5>⚠️ Session Mismatch Detected</h5>
                            <p>The OAuth flow was started in a different session/namespace. Your MCP server configuration might not be visible in the current session.</p>
                            <p><strong>Current namespace:</strong> ${currentNamespace}<br>
                               <strong>OAuth namespace:</strong> ${stateNamespace}</p>
                            <p>You may need to enter your session password to access the correct configuration.</p>
                        ` : hasExistingFlow ? `
                            <h5>Found Existing OAuth Configuration</h5>
                            <p>We detected an OAuth configuration for <strong>${serverName}</strong>. You need to use the device flow instead of this redirect.</p>
                        ` : `
                            <h5>What happened?</h5>
                            <p>It looks like you may have started an authorization code flow instead of device flow, or you manually navigated to GitHub's OAuth page.</p>
                        `}
                        
                        <h5>How to properly authorize with GitHub:</h5>
                        <ol>
                            <li>Click the <strong>"MCP"</strong> button in the top toolbar</li>
                            <li>Find your GitHub MCP server configuration (${serverName})</li>
                            <li>Click the <strong>"Authorize"</strong> button next to it</li>
                            <li>You'll see a device code to copy and enter on GitHub</li>
                            <li>No page redirects needed!</li>
                        </ol>
                        
                        <p><strong>Benefits of Device Flow:</strong></p>
                        <ul>
                            <li>✅ No CORS issues</li>
                            <li>✅ Works entirely client-side</li>
                            <li>✅ More secure for browser apps</li>
                            <li>✅ No session restoration needed</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="secondary-button" onclick="this.closest('.modal').remove()">
                        I Understand
                    </button>
                    <button class="primary-button" onclick="
                        this.closest('.modal').remove();
                        document.querySelector('#mcp-servers-btn')?.click();
                    ">
                        Open MCP Modal
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('[MCP OAuth Flow] GitHub device flow modal appended to document body');
        
        // Force the modal to stay visible and focused
        setTimeout(() => {
            modal.style.display = 'block';
            modal.style.zIndex = '10000';
            console.log('[MCP OAuth Flow] Ensured modal visibility with z-index 10000');
        }, 100);
    }

    /**
     * Show device flow success
     * @param {string} serverName - Server name
     */
    showDeviceFlowSuccess(serverName) {
        const modal = document.querySelector('.device-flow-modal');
        if (!modal) return;
        
        const content = modal.querySelector('.device-flow-instructions');
        content.innerHTML = `
            <div class="success-message">
                <h4>✓ Authorization Successful!</h4>
                <p>Successfully authorized MCP server: <strong>${serverName}</strong></p>
                <p>You can now close this window and use the MCP server with OAuth authentication.</p>
            </div>
        `;
        
        // Trigger MCP connection completion if quick connectors available
        if (window.MCPQuickConnectors && serverName) {
            console.log('[MCP OAuth Flow] Triggering MCP connection completion after authentication success');
            console.log('[MCP OAuth Flow] Server name received:', serverName);
            // Extract service key from server name (e.g., 'mcp-github' -> 'github')
            const serviceKey = serverName.replace('mcp-', '');
            console.log('[MCP OAuth Flow] Extracted service key:', serviceKey);
            if (serviceKey) {
                window.MCPQuickConnectors.completeConnectionAfterAuth(serviceKey);
            } else {
                console.warn('[MCP OAuth Flow] Could not extract service key from server name:', serverName);
            }
        } else if (window.MCPQuickConnectors && !serverName) {
            console.warn('[MCP OAuth Flow] showDeviceFlowSuccess called without serverName');
        }
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            modal.remove();
        }, 3000);
    }

    /**
     * Show manual token entry for GitHub CORS issues
     * @param {Object} errorData - Error data with token instructions
     */
    showManualTokenEntry(errorData) {
        const modal = document.querySelector('.device-flow-modal');
        if (!modal) return;
        
        const content = modal.querySelector('.device-flow-instructions');
        content.innerHTML = `
            <div class="manual-token-entry">
                <h4>🔧 Manual Token Entry Required</h4>
                <div class="cors-notice">
                    <p><strong>GitHub token polling is blocked by CORS.</strong> Since you've already authorized the device, 
                       you can get your access token manually and enter it below.</p>
                </div>
                
                <div class="token-instructions-section">
                    <h5>Step 1: Get Your Access Token</h5>
                    <p>Run this command in your terminal:</p>
                    <div class="code-block">
                        <code id="token-curl-command">${errorData.tokenInstructions}</code>
                        <button class="copy-button" onclick="window.mcpOAuthFlow.copyTokenCommand(this)">Copy</button>
                    </div>
                    <p><small><strong>Note:</strong> This command will only work if you've completed the GitHub authorization step above.</small></p>
                </div>
                
                <div class="token-input-section">
                    <h5>Step 2: Enter the Access Token</h5>
                    <p>Paste the <code>access_token</code> value from the JSON response:</p>
                    <div class="token-input-group">
                        <input type="password" id="manual-access-token" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" class="token-input" />
                        <button class="primary-button" onclick="window.mcpOAuthFlow.submitManualToken('${errorData.serverName}', '${errorData.deviceCode}')">
                            Save Token
                        </button>
                    </div>
                    <p><small>Your token will be encrypted and stored securely.</small></p>
                </div>
                
                <div class="help-section">
                    <h5>📚 Alternative Methods</h5>
                    <ul>
                        <li><strong>GitHub CLI:</strong> <code>gh auth token</code> (if you have gh CLI)</li>
                        <li><strong>Personal Access Token:</strong> Create one at <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a></li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    /**
     * Copy token curl command to clipboard
     * @param {HTMLElement} button - Copy button element
     */
    copyTokenCommand(button) {
        const commandElement = document.getElementById('token-curl-command');
        if (!commandElement) return;
        
        const commandText = commandElement.textContent;
        
        // Use modern clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(commandText).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }).catch(() => {
                this.fallbackCopy(commandText, button);
            });
        } else {
            this.fallbackCopy(commandText, button);
        }
    }
    
    /**
     * Submit manual access token
     * @param {string} serverName - Server name
     * @param {string} deviceCode - Device code
     */
    async submitManualToken(serverName, deviceCode) {
        const tokenInput = document.getElementById('manual-access-token');
        const accessToken = tokenInput.value.trim();
        
        if (!accessToken) {
            alert('Please enter an access token');
            return;
        }
        
        // Validate token format (GitHub tokens start with ghp_, gho_, ghu_, or ghs_)
        if (!accessToken.match(/^gh[p|o|u|s]_[A-Za-z0-9_]{36,}$/)) {
            if (!confirm('This doesn\'t look like a GitHub access token. Continue anyway?')) {
                return;
            }
        }
        
        try {
            // Create token object
            const tokenData = {
                access_token: accessToken,
                token_type: 'bearer',
                scope: 'repo read:user',
                issued_at: Date.now()
            };
            
            // Store the token using the OAuth service
            await this.oauthService.storeManualToken(serverName, tokenData);
            
            // Clean up the device flow
            this.oauthService.pendingFlows.delete(deviceCode);
            await this.oauthService.savePendingFlows();
            
            // Show success
            this.showDeviceFlowSuccess(serverName);
            
        } catch (error) {
            console.error('[MCP OAuth Flow] Failed to store manual token:', error);
            alert(`Failed to save token: ${error.message}`);
        }
    }
    
    /**
     * Show device flow error
     * @param {string} message - Error message
     * @param {string} code - Error code
     */
    showDeviceFlowError(message, code) {
        const modal = document.querySelector('.device-flow-modal');
        if (!modal) return;
        
        const content = modal.querySelector('.device-flow-instructions');
        content.innerHTML = `
            <div class="error-message">
                <h4>❌ Authorization Failed</h4>
                <p>Error: ${code || 'device_flow_failed'}</p>
                <p>Description: ${message}</p>
                ${code === 'device_code_expired' ? 
                    '<p><strong>Tip:</strong> The device code has expired. Please start the OAuth flow again.</p>' :
                    '<p>Please check your OAuth configuration and try again.</p>'
                }
            </div>
        `;
    }

    /**
     * Start device flow countdown timer
     * @param {number} expiresIn - Seconds until expiration
     */
    startDeviceFlowCountdown(expiresIn) {
        const countdownElement = document.getElementById('device-flow-countdown');
        if (!countdownElement) return;
        
        let remainingSeconds = expiresIn;
        
        const countdownTimer = setInterval(() => {
            remainingSeconds--;
            
            if (remainingSeconds <= 0) {
                clearInterval(countdownTimer);
                countdownElement.textContent = 'Expired';
                return;
            }
            
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    /**
     * Format duration in seconds to human-readable format
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        if (seconds < 0) return 'Expired';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Create global instance
window.mcpOAuthFlow = new MCPOAuthFlow();