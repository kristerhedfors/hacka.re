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
        }
        
        // Check for OAuth callback in URL
        this.checkForOAuthCallback();
    }

    /**
     * Check if current page is an OAuth callback
     */
    checkForOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (code && state) {
            // Handle OAuth callback
            this.handleOAuthCallback(code, state, error);
        }
    }

    /**
     * Handle OAuth callback from provider
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @param {string} error - Error if any
     */
    async handleOAuthCallback(code, state, error) {
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
     * Start OAuth authorization flow
     * @param {string} serverName - Server name
     */
    async startAuthorization(serverName) {
        try {
            // Get configuration
            const config = this.oauthConfig.getConfiguration(serverName);
            if (!config) {
                alert('Please configure OAuth settings first.');
                return;
            }
            
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