/**
 * MCP OAuth Flow Manager - Refactored Main Coordinator
 * 
 * Coordinates OAuth flows by delegating to specialized handlers.
 * Callback handling and device flow UI have been extracted to separate modules.
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
            
            // Wait for OAuth service to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Check for OAuth callback using callback handler
        if (window.OAuthCallbackHandler) {
            await window.OAuthCallbackHandler.checkForOAuthCallback();
        }
    }

    /**
     * Start OAuth authorization flow
     */
    async startOAuthFlow(config) {
        try {
            console.log('[MCP OAuth Flow] Starting OAuth flow for:', config.name);
            
            if (!this.oauthService) {
                throw new Error('OAuth service not initialized');
            }
            
            // Generate state parameter
            const state = this.generateState();
            
            // Store flow configuration
            this.activeFlows.set(state, {
                config: config,
                startedAt: Date.now()
            });
            
            // Use OAuth service to start flow
            const authUrl = await this.oauthService.startAuthorizationFlow?.(config, state);
            
            if (authUrl) {
                // Open authorization URL
                window.open(authUrl, '_blank');
                console.log('[MCP OAuth Flow] Authorization URL opened');
                return true;
            }
            
            throw new Error('Failed to generate authorization URL');
        } catch (error) {
            console.error('[MCP OAuth Flow] Error starting OAuth flow:', error);
            throw error;
        }
    }

    /**
     * Start device flow for GitHub and similar providers
     */
    async startDeviceFlow(config) {
        try {
            console.log('[MCP OAuth Flow] Starting device flow for:', config.name);
            
            if (!this.oauthService) {
                throw new Error('OAuth service not initialized');
            }
            
            // Start device flow using OAuth service
            const deviceData = await this.oauthService.startDeviceFlow?.(config);
            
            if (deviceData && window.OAuthDeviceFlowUI) {
                // Show device flow UI
                window.OAuthDeviceFlowUI.showDeviceFlowDialog(deviceData, {
                    serviceName: config.name
                });
                
                // Start polling for completion
                this.pollDeviceFlow(config, deviceData);
                
                return true;
            }
            
            throw new Error('Failed to start device flow');
        } catch (error) {
            console.error('[MCP OAuth Flow] Error starting device flow:', error);
            
            // Fallback to manual device flow if CORS issues
            if (error.message.includes('CORS') || error.message.includes('network')) {
                console.log('[MCP OAuth Flow] Falling back to manual device flow');
                return this.startManualDeviceFlow(config);
            }
            
            throw error;
        }
    }

    /**
     * Start manual device flow (for CORS issues)
     */
    async startManualDeviceFlow(config) {
        console.log('[MCP OAuth Flow] Starting manual device flow for:', config.name);
        
        if (window.OAuthDeviceFlowUI) {
            window.OAuthDeviceFlowUI.showManualDeviceFlow({
                clientId: config.clientId
            });
            
            // Set up callback for manual status checking
            window.manualDeviceFlowCallback = async (deviceCode, verificationUrl) => {
                try {
                    const result = await this.checkManualDeviceStatus(config, deviceCode);
                    if (result) {
                        window.OAuthDeviceFlowUI.closeManualDeviceFlowModal();
                        if (window.OAuthCallbackHandler) {
                            window.OAuthCallbackHandler.showCallbackSuccess();
                        }
                    }
                } catch (error) {
                    console.error('[MCP OAuth Flow] Manual device flow error:', error);
                    alert(`Authentication failed: ${error.message}`);
                }
            };
            
            return true;
        }
        
        throw new Error('Device flow UI not available');
    }

    /**
     * Poll for device flow completion
     */
    async pollDeviceFlow(config, deviceData) {
        const pollInterval = (deviceData.interval || 5) * 1000;
        const expiresAt = Date.now() + (deviceData.expires_in * 1000);
        
        // Set up status callback
        window.deviceFlowStatusCallback = () => {
            console.log('[MCP OAuth Flow] Manual status refresh requested');
        };
        
        const pollFunction = async () => {
            if (Date.now() >= expiresAt) {
                if (window.OAuthDeviceFlowUI) {
                    window.OAuthDeviceFlowUI.updateDeviceFlowStatus('expired', 'Authentication expired');
                }
                return;
            }
            
            try {
                const result = await this.oauthService.pollDeviceFlow?.(config, deviceData);
                
                if (result) {
                    // Success
                    if (window.OAuthDeviceFlowUI) {
                        window.OAuthDeviceFlowUI.updateDeviceFlowStatus('success', 'Authentication successful!');
                        
                        setTimeout(() => {
                            window.OAuthDeviceFlowUI.closeDeviceFlowModal();
                        }, 2000);
                    }
                    
                    console.log('[MCP OAuth Flow] Device flow completed successfully');
                    return;
                }
                
                // Continue polling
                setTimeout(pollFunction, pollInterval);
            } catch (error) {
                console.error('[MCP OAuth Flow] Device flow polling error:', error);
                
                if (window.OAuthDeviceFlowUI) {
                    window.OAuthDeviceFlowUI.updateDeviceFlowStatus('error', `Error: ${error.message}`);
                }
            }
        };
        
        // Start polling
        setTimeout(pollFunction, pollInterval);
    }

    /**
     * Check manual device flow status
     */
    async checkManualDeviceStatus(config, deviceCode) {
        try {
            const result = await this.oauthService.checkDeviceStatus?.(config, deviceCode);
            
            if (result) {
                console.log('[MCP OAuth Flow] Manual device authentication successful');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[MCP OAuth Flow] Manual device status check failed:', error);
            throw error;
        }
    }

    /**
     * Handle OAuth callback
     */
    async handleOAuthCallback(code, state, error) {
        try {
            if (error) {
                console.error('[MCP OAuth Flow] OAuth callback error:', error);
                return false;
            }
            
            const flowConfig = this.activeFlows.get(state);
            if (!flowConfig) {
                console.error('[MCP OAuth Flow] No active flow found for state:', state);
                return false;
            }
            
            // Use OAuth service to exchange code for tokens
            const result = await this.oauthService.exchangeCodeForTokens?.(code, state, flowConfig.config);
            
            if (result) {
                // Clean up active flow
                this.activeFlows.delete(state);
                
                console.log('[MCP OAuth Flow] OAuth callback processed successfully');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[MCP OAuth Flow] OAuth callback processing error:', error);
            return false;
        }
    }

    /**
     * Generate state parameter for OAuth flow
     */
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * Show GitHub device flow message (compatibility method)
     */
    showGitHubDeviceFlowMessage(pendingFlow) {
        console.log('[MCP OAuth Flow] Showing GitHub device flow message');
        
        if (window.OAuthDeviceFlowUI) {
            window.OAuthDeviceFlowUI.showDeviceFlowDialog({
                user_code: 'Please use GitHub device flow',
                verification_url: 'https://github.com/login/device',
                expires_in: 900
            }, {
                serviceName: 'GitHub'
            });
        }
    }

    /**
     * Get active flows
     */
    getActiveFlows() {
        return Array.from(this.activeFlows.entries()).map(([state, flow]) => ({
            state,
            ...flow
        }));
    }

    /**
     * Cancel OAuth flow
     */
    cancelOAuthFlow(state) {
        if (this.activeFlows.has(state)) {
            this.activeFlows.delete(state);
            console.log('[MCP OAuth Flow] OAuth flow cancelled:', state);
        }
    }

    /**
     * Cleanup expired flows
     */
    cleanupExpiredFlows() {
        const now = Date.now();
        const expiredFlows = [];
        
        for (const [state, flow] of this.activeFlows.entries()) {
            // Flows expire after 1 hour
            if (now - flow.startedAt > 3600000) {
                expiredFlows.push(state);
            }
        }
        
        expiredFlows.forEach(state => {
            this.activeFlows.delete(state);
            console.log('[MCP OAuth Flow] Cleaned up expired flow:', state);
        });
        
        return expiredFlows.length;
    }
}

// Create global instance
window.mcpOAuthFlow = new MCPOAuthFlow();

// Export class for compatibility
window.MCPOAuthFlow = MCPOAuthFlow;