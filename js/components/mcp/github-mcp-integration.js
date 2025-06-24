/**
 * GitHub MCP Integration Component
 * 
 * Integrates the GitHub MCP Server with the existing MCP infrastructure,
 * providing seamless OAuth and PAT authentication flows.
 */

window.GitHubMCPIntegration = (function() {
    'use strict';

    let githubMcpServer = null;
    let initialized = false;

    /**
     * Initialize the GitHub MCP integration
     */
    async function init() {
        if (initialized) return true;

        console.log('[GitHub MCP Integration] Initializing...');

        // Create GitHub MCP server instance
        githubMcpServer = new window.GitHubMCPServer();
        
        // Initialize the server
        const serverReady = await githubMcpServer.initialize();
        if (!serverReady) {
            console.warn('[GitHub MCP Integration] GitHub MCP server failed to initialize');
            return false;
        }

        // Try auto-connect if credentials exist
        try {
            const autoConnected = await githubMcpServer.autoConnect();
            if (autoConnected) {
                console.log('[GitHub MCP Integration] Auto-connected to GitHub MCP server');
            }
        } catch (error) {
            console.log('[GitHub MCP Integration] Auto-connect failed:', error.message);
        }

        initialized = true;
        console.log('[GitHub MCP Integration] Initialized successfully');
        return true;
    }

    /**
     * Show GitHub MCP connection dialog with authentication options
     * @returns {Promise<boolean>} True if connected successfully
     */
    async function showConnectionDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'github-mcp-connection-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fab fa-github"></i> Connect to GitHub MCP Server</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove(); resolve(false);">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="github-mcp-info">
                            <p>Connect to GitHub's official Model Context Protocol server to access:</p>
                            <ul>
                                <li><i class="fas fa-code-branch"></i> Repository management</li>
                                <li><i class="fas fa-bug"></i> Issues and pull requests</li>
                                <li><i class="fas fa-file-code"></i> File content and search</li>
                                <li><i class="fas fa-users"></i> Organization and team data</li>
                                <li><i class="fas fa-chart-line"></i> Repository insights</li>
                            </ul>
                            
                            <div class="info-box">
                                <i class="fas fa-info-circle"></i>
                                <strong>Note:</strong> This connects to GitHub's official MCP server at 
                                <code>api.githubcopilot.com/mcp/</code> which may require a GitHub Copilot subscription.
                            </div>
                            
                            <div class="warning-box">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Important:</strong> GitHub's MCP server may be restricted to official GitHub 
                                Copilot integrations and might not work with third-party applications due to CORS policies.
                                If connection fails, the server may only be available through VS Code or other official clients.
                            </div>
                        </div>
                        
                        <div class="auth-method-selection">
                            <h4>Choose Authentication Method:</h4>
                            
                            <div class="auth-methods">
                                <div class="auth-method-card" data-method="oauth">
                                    <div class="auth-icon">
                                        <i class="fas fa-key"></i>
                                    </div>
                                    <div class="auth-info">
                                        <h5>OAuth (Recommended)</h5>
                                        <p>Secure authentication through GitHub's OAuth flow. Automatically manages token refresh.</p>
                                        <ul class="auth-features">
                                            <li>✓ Automatic token refresh</li>
                                            <li>✓ Scope-limited access</li>
                                            <li>✓ Easy revocation</li>
                                        </ul>
                                    </div>
                                    <button class="btn primary-btn auth-select-btn" onclick="GitHubMCPIntegration.startOAuthFlow(); this.closest('.modal').remove();">
                                        Use OAuth
                                    </button>
                                </div>
                                
                                <div class="auth-method-card" data-method="pat">
                                    <div class="auth-icon">
                                        <i class="fas fa-user-secret"></i>
                                    </div>
                                    <div class="auth-info">
                                        <h5>Personal Access Token</h5>
                                        <p>Use a GitHub Personal Access Token for authentication. Good for automation and CI/CD.</p>
                                        <ul class="auth-features">
                                            <li>✓ Long-term access</li>
                                            <li>✓ Fine-grained permissions</li>
                                            <li>✓ No browser popups</li>
                                        </ul>
                                    </div>
                                    <button class="btn secondary-btn auth-select-btn" onclick="GitHubMCPIntegration.startPATFlow(); this.closest('.modal').remove();">
                                        Use PAT
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn secondary-btn" onclick="this.closest('.modal').remove();">
                            Cancel
                        </button>
                        <a href="https://docs.github.com/en/copilot/building-copilot-extensions/creating-a-copilot-extension/configuring-your-github-app-for-your-copilot-extension" 
                           target="_blank" class="btn info-btn">
                            <i class="fas fa-book"></i> View Documentation
                        </a>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Store resolve function for use in auth method handlers
            window._githubMcpResolve = resolve;
        });
    }

    /**
     * Start OAuth authentication flow
     * @returns {Promise<boolean>} True if connected successfully
     */
    async function startOAuthFlow() {
        try {
            if (!githubMcpServer) {
                throw new Error('GitHub MCP server not initialized');
            }

            console.log('[GitHub MCP Integration] Starting OAuth flow...');
            
            // Check if OAuth Client ID is configured
            const clientId = await githubMcpServer.getOAuthClientId();
            if (!clientId) {
                // Show OAuth setup dialog
                const setupResult = await githubMcpServer.showOAuthSetupDialog();
                if (window._githubMcpResolve) {
                    window._githubMcpResolve(setupResult);
                    delete window._githubMcpResolve;
                }
                return setupResult;
            }

            // Start OAuth connection
            const result = await githubMcpServer.connectWithOAuth();
            
            if (result) {
                showNotification('✅ Connected to GitHub MCP server via OAuth', 'success');
                
                // Update UI components
                updateConnectionStatus();
            }

            if (window._githubMcpResolve) {
                window._githubMcpResolve(result);
                delete window._githubMcpResolve;
            }
            
            return result;
            
        } catch (error) {
            console.error('[GitHub MCP Integration] OAuth flow failed:', error);
            
            // Show more user-friendly error messages
            let errorMessage = error.message;
            if (error.message.includes('CORS') || error.message.includes('Network error')) {
                errorMessage = `GitHub MCP Connection Failed\n\n${error.message}\n\nNote: GitHub's MCP server may be restricted to official Copilot integrations and may not work with third-party applications.`;
            }
            
            showNotification(`❌ OAuth connection failed: ${errorMessage}`, 'error');
            
            if (window._githubMcpResolve) {
                window._githubMcpResolve(false);
                delete window._githubMcpResolve;
            }
            
            return false;
        }
    }

    /**
     * Start Personal Access Token authentication flow
     * @returns {Promise<boolean>} True if connected successfully
     */
    async function startPATFlow() {
        try {
            if (!githubMcpServer) {
                throw new Error('GitHub MCP server not initialized');
            }

            console.log('[GitHub MCP Integration] Starting PAT flow...');
            
            // Show PAT setup dialog
            const result = await githubMcpServer.showPATSetupDialog();
            
            if (result) {
                showNotification('✅ Connected to GitHub MCP server via Personal Access Token', 'success');
                
                // Update UI components
                updateConnectionStatus();
            }

            if (window._githubMcpResolve) {
                window._githubMcpResolve(result);
                delete window._githubMcpResolve;
            }
            
            return result;
            
        } catch (error) {
            console.error('[GitHub MCP Integration] PAT flow failed:', error);
            
            // Show more user-friendly error messages
            let errorMessage = error.message;
            if (error.message.includes('CORS') || error.message.includes('Network error')) {
                errorMessage = `GitHub MCP Connection Failed\n\n${error.message}\n\nNote: GitHub's MCP server may be restricted to official Copilot integrations and may not work with third-party applications.`;
            }
            
            showNotification(`❌ PAT connection failed: ${errorMessage}`, 'error');
            
            if (window._githubMcpResolve) {
                window._githubMcpResolve(false);
                delete window._githubMcpResolve;
            }
            
            return false;
        }
    }

    /**
     * Disconnect from GitHub MCP server
     * @returns {Promise<boolean>} True if disconnected successfully
     */
    async function disconnect() {
        try {
            if (!githubMcpServer) {
                console.warn('[GitHub MCP Integration] GitHub MCP server not initialized');
                return true;
            }

            await githubMcpServer.disconnect();
            
            showNotification('Disconnected from GitHub MCP server', 'info');
            
            // Update UI components
            updateConnectionStatus();
            
            return true;
            
        } catch (error) {
            console.error('[GitHub MCP Integration] Disconnect failed:', error);
            showNotification(`❌ Disconnect failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Get GitHub MCP connection status
     * @returns {Object} Connection status
     */
    function getConnectionStatus() {
        if (!githubMcpServer) {
            return {
                connected: false,
                error: 'Server not initialized'
            };
        }

        return githubMcpServer.getStatus();
    }

    /**
     * Check if GitHub MCP is connected
     * @returns {boolean} True if connected
     */
    function isConnected() {
        const status = getConnectionStatus();
        return status.connected || false;
    }

    /**
     * Get available tools from GitHub MCP server
     * @returns {Array} Array of available tools
     */
    function getAvailableTools() {
        const status = getConnectionStatus();
        return status.tools || [];
    }

    /**
     * Update connection status in UI components
     */
    function updateConnectionStatus() {
        // Update Quick Connectors if present
        if (window.MCPQuickConnectors && window.MCPQuickConnectors.updateAllConnectorStatuses) {
            window.MCPQuickConnectors.updateAllConnectorStatuses();
        }

        // Update MCP Server Manager if present
        if (window.MCPServerManager && window.MCPServerManager.updateServersList) {
            window.MCPServerManager.updateServersList();
        }

        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('githubMcpStatusChanged', {
            detail: getConnectionStatus()
        }));
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    function showNotification(message, type = 'info') {
        if (window.MCPUtils && window.MCPUtils.showNotification) {
            window.MCPUtils.showNotification(message);
        } else {
            console.log(`[GitHub MCP Integration] ${type}: ${message}`);
        }
    }

    /**
     * Quick connect method for integration with existing systems
     * @returns {Promise<boolean>} True if connected successfully
     */
    async function quickConnect() {
        try {
            if (!initialized) {
                await init();
            }

            if (isConnected()) {
                console.log('[GitHub MCP Integration] Already connected');
                return true;
            }

            // Try auto-connect first
            if (githubMcpServer) {
                const autoConnected = await githubMcpServer.autoConnect();
                if (autoConnected) {
                    updateConnectionStatus();
                    return true;
                }
            }

            console.log('[GitHub MCP Integration] No saved credentials, manual connection required');
            return false;
            
        } catch (error) {
            console.error('[GitHub MCP Integration] Quick connect failed:', error);
            return false;
        }
    }

    /**
     * Create GitHub connector UI for Quick Connectors
     * @returns {Object} Connector configuration
     */
    function createQuickConnectorConfig() {
        return {
            name: 'GitHub MCP',
            icon: 'fab fa-github',
            description: 'Access GitHub via official Copilot MCP server',
            transport: 'github-mcp',
            connect: showConnectionDialog,
            disconnect: disconnect,
            isConnected: isConnected,
            getToolCount: () => getAvailableTools().length,
            getStatus: getConnectionStatus
        };
    }

    // Public API
    return {
        init,
        showConnectionDialog,
        startOAuthFlow,
        startPATFlow,
        disconnect,
        getConnectionStatus,
        isConnected,
        getAvailableTools,
        quickConnect,
        createQuickConnectorConfig,
        updateConnectionStatus
    };
})();