/**
 * MCP OAuth Service - Refactored Main Coordinator
 * 
 * Coordinates OAuth flows using specialized modules for providers, tokens, and PKCE
 */

(function(global) {
    'use strict';

    /**
     * OAuth service for managing OAuth flows and tokens
     */
    class OAuthService {
        constructor() {
            this.storageService = window.CoreStorageService;
            this.tokenManager = null;
            this.pendingFlows = new Map();
            this.serverConfigs = new Map();
            this.PENDING_FLOWS_KEY = 'mcp-oauth-pending-flows';
            
            // Initialize token manager
            if (window.OAuthTokenManager) {
                this.tokenManager = new window.OAuthTokenManager.TokenManager();
            }
            
            // Initialize metadata discovery and client registration services
            this.metadataService = null;
            this.registrationService = null;
            
            if (this.storageService) {
                this.initializeServices();
                this.loadPendingFlows();
            } else {
                setTimeout(() => {
                    this.storageService = window.CoreStorageService;
                    if (this.storageService) {
                        this.initializeServices();
                        this.loadPendingFlows();
                    }
                }, 100);
            }
        }

        /**
         * Initialize metadata discovery and client registration services
         */
        initializeServices() {
            if (window.MCPMetadataDiscovery) {
                this.metadataService = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
            }
            if (window.MCPClientRegistration) {
                this.registrationService = new window.MCPClientRegistration.ClientRegistrationService();
            }
        }

        /**
         * Start OAuth authorization flow
         */
        async startAuthorizationFlow(config, state = null) {
            try {
                console.log('[OAuth Service] Starting authorization flow for:', config.name);
                
                // Validate configuration
                if (window.OAuthPKCEHelper) {
                    window.OAuthPKCEHelper.PKCEHelper.validateOAuthConfig(config);
                }
                
                // Generate PKCE parameters
                let pkceParams = {};
                if (window.OAuthPKCEHelper) {
                    pkceParams = await window.OAuthPKCEHelper.PKCEHelper.createPKCEParameters();
                    state = state || pkceParams.state;
                }
                
                // Store pending flow
                this.pendingFlows.set(state, {
                    config: config,
                    pkceParams: pkceParams,
                    startedAt: Date.now()
                });
                
                await this.savePendingFlows();
                
                // Create authorization URL
                const authUrl = this.createAuthorizationUrl(config, { ...pkceParams, state });
                
                console.log('[OAuth Service] Authorization URL created');
                return authUrl;
            } catch (error) {
                console.error('[OAuth Service] Error starting authorization flow:', error);
                throw error;
            }
        }

        /**
         * Create authorization URL
         */
        createAuthorizationUrl(config, params) {
            if (window.OAuthPKCEHelper) {
                return window.OAuthPKCEHelper.PKCEHelper.createAuthorizationUrl(config.authorizationUrl, {
                    clientId: config.clientId,
                    redirectUri: config.redirectUri,
                    scope: config.scope,
                    responseType: config.responseType || 'code',
                    codeChallenge: params.codeChallenge,
                    codeChallengeMethod: params.codeChallengeMethod,
                    state: params.state,
                    additionalParams: config.additionalParams
                });
            }
            
            // Fallback without PKCE
            const url = new URL(config.authorizationUrl);
            url.searchParams.set('client_id', config.clientId);
            url.searchParams.set('redirect_uri', config.redirectUri);
            url.searchParams.set('scope', config.scope);
            url.searchParams.set('response_type', config.responseType || 'code');
            url.searchParams.set('state', params.state);
            
            return url.toString();
        }

        /**
         * Handle authorization callback
         */
        async handleAuthorizationCallback(code, state) {
            try {
                console.log('[OAuth Service] Handling authorization callback');
                
                const pendingFlow = this.pendingFlows.get(state);
                if (!pendingFlow) {
                    throw new Error('No pending flow found for state parameter');
                }
                
                // Exchange code for tokens
                const tokens = await this.exchangeCodeForTokens(code, pendingFlow);
                
                if (tokens && this.tokenManager) {
                    // Store tokens
                    const connectionId = `oauth_${state}_${Date.now()}`;
                    await this.tokenManager.storeToken(connectionId, tokens);
                    
                    // Clean up pending flow
                    this.pendingFlows.delete(state);
                    await this.savePendingFlows();
                    
                    console.log('[OAuth Service] Authorization callback processed successfully');
                    return {
                        connectionId,
                        tokens,
                        config: pendingFlow.config
                    };
                }
                
                throw new Error('Failed to process authorization callback');
            } catch (error) {
                console.error('[OAuth Service] Error handling authorization callback:', error);
                throw error;
            }
        }

        /**
         * Exchange authorization code for tokens
         */
        async exchangeCodeForTokens(code, pendingFlow) {
            try {
                const { config, pkceParams } = pendingFlow;
                
                let requestParams;
                if (window.OAuthPKCEHelper) {
                    requestParams = window.OAuthPKCEHelper.PKCEHelper.createTokenRequestParams({
                        grantType: 'authorization_code',
                        code: code,
                        redirectUri: config.redirectUri,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                        codeVerifier: pkceParams.codeVerifier
                    });
                } else {
                    // Fallback without PKCE helper
                    requestParams = new URLSearchParams({
                        grant_type: 'authorization_code',
                        code: code,
                        redirect_uri: config.redirectUri,
                        client_id: config.clientId
                    });
                    
                    if (config.clientSecret) {
                        requestParams.set('client_secret', config.clientSecret);
                    }
                }
                
                const response = await fetch(config.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: requestParams
                });
                
                if (!response.ok) {
                    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(`Token exchange error: ${data.error_description || data.error}`);
                }
                
                return {
                    ...data,
                    issued_at: Date.now()
                };
            } catch (error) {
                console.error('[OAuth Service] Error exchanging code for tokens:', error);
                throw error;
            }
        }

        /**
         * Start device flow (for GitHub, etc.)
         */
        async startDeviceFlow(config) {
            try {
                console.log('[OAuth Service] Starting device flow for:', config.name);
                
                const provider = config.provider || 'github';
                const providerConfig = window.OAuthProvidersConfig?.getProviderConfig(provider);
                
                if (!providerConfig || !providerConfig.deviceCodeUrl) {
                    throw new Error(`Device flow not supported for provider: ${provider}`);
                }
                
                const response = await fetch(providerConfig.deviceCodeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        client_id: config.clientId,
                        scope: config.scope || providerConfig.scope
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Device flow request failed: ${response.status}`);
                }
                
                const deviceData = await response.json();
                
                if (deviceData.error) {
                    throw new Error(`Device flow error: ${deviceData.error_description || deviceData.error}`);
                }
                
                // Store device flow state
                const state = `device_${Date.now()}`;
                this.pendingFlows.set(state, {
                    config: config,
                    deviceData: deviceData,
                    provider: provider,
                    startedAt: Date.now()
                });
                
                await this.savePendingFlows();
                
                console.log('[OAuth Service] Device flow started successfully');
                return deviceData;
            } catch (error) {
                console.error('[OAuth Service] Error starting device flow:', error);
                throw error;
            }
        }

        /**
         * Poll device flow for completion
         */
        async pollDeviceFlow(config, deviceData) {
            try {
                const provider = config.provider || 'github';
                const providerConfig = window.OAuthProvidersConfig?.getProviderConfig(provider);
                
                if (!providerConfig) {
                    throw new Error(`Unknown provider: ${provider}`);
                }
                
                const response = await fetch(providerConfig.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        client_id: config.clientId,
                        client_secret: config.clientSecret,
                        device_code: deviceData.device_code,
                        grant_type: providerConfig.grantType
                    })
                });
                
                const data = await response.json();
                
                if (data.access_token) {
                    // Success - store tokens
                    if (this.tokenManager) {
                        const connectionId = `device_${provider}_${Date.now()}`;
                        await this.tokenManager.storeToken(connectionId, {
                            ...data,
                            issued_at: Date.now()
                        });
                        
                        console.log('[OAuth Service] Device flow completed successfully');
                        return {
                            connectionId,
                            tokens: data,
                            config: config
                        };
                    }
                }
                
                if (data.error === 'authorization_pending') {
                    return null; // Continue polling
                }
                
                if (data.error === 'access_denied') {
                    throw new Error('User denied access');
                }
                
                if (data.error) {
                    throw new Error(`Device flow error: ${data.error_description || data.error}`);
                }
                
                return null;
            } catch (error) {
                console.error('[OAuth Service] Device flow polling error:', error);
                throw error;
            }
        }

        /**
         * Check device flow status manually
         */
        async checkDeviceStatus(config, deviceCode) {
            try {
                const provider = config.provider || 'github';
                const providerConfig = window.OAuthProvidersConfig?.getProviderConfig(provider);
                
                const response = await fetch(providerConfig.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        client_id: config.clientId,
                        client_secret: config.clientSecret,
                        device_code: deviceCode,
                        grant_type: providerConfig.grantType
                    })
                });
                
                const data = await response.json();
                
                if (data.access_token && this.tokenManager) {
                    const connectionId = `manual_device_${provider}_${Date.now()}`;
                    await this.tokenManager.storeToken(connectionId, {
                        ...data,
                        issued_at: Date.now()
                    });
                    
                    return { connectionId, tokens: data, config };
                }
                
                return null;
            } catch (error) {
                console.error('[OAuth Service] Manual device status check error:', error);
                throw error;
            }
        }

        /**
         * Get token for connection
         */
        async getToken(connectionId) {
            if (!this.tokenManager) return null;
            return this.tokenManager.getToken(connectionId);
        }

        /**
         * Get valid token (refresh if needed)
         */
        async getValidToken(connectionId, config) {
            if (!this.tokenManager) return null;
            return this.tokenManager.getValidToken(connectionId, config);
        }

        /**
         * Refresh token
         */
        async refreshToken(connectionId, config) {
            if (!this.tokenManager) return null;
            return this.tokenManager.refreshToken(connectionId, config);
        }

        /**
         * Remove token
         */
        async removeToken(connectionId) {
            if (!this.tokenManager) return false;
            return this.tokenManager.removeToken(connectionId);
        }

        /**
         * Load pending flows from storage
         */
        async loadPendingFlows() {
            try {
                if (!this.storageService) return;
                
                const stored = await this.storageService.getValue(this.PENDING_FLOWS_KEY);
                if (stored) {
                    for (const [state, flowData] of Object.entries(stored)) {
                        this.pendingFlows.set(state, flowData);
                    }
                    console.log(`[OAuth Service] Loaded ${this.pendingFlows.size} pending flows`);
                }
            } catch (error) {
                console.error('[OAuth Service] Error loading pending flows:', error);
            }
        }

        /**
         * Save pending flows to storage
         */
        async savePendingFlows() {
            try {
                if (!this.storageService) return;
                
                const toStore = Object.fromEntries(this.pendingFlows);
                await this.storageService.setValue(this.PENDING_FLOWS_KEY, toStore);
            } catch (error) {
                console.error('[OAuth Service] Error saving pending flows:', error);
            }
        }

        /**
         * Cleanup expired flows and tokens
         */
        async cleanup() {
            try {
                // Cleanup expired pending flows (older than 1 hour)
                const now = Date.now();
                let expiredCount = 0;
                
                for (const [state, flow] of this.pendingFlows.entries()) {
                    if (now - flow.startedAt > 3600000) {
                        this.pendingFlows.delete(state);
                        expiredCount++;
                    }
                }
                
                if (expiredCount > 0) {
                    await this.savePendingFlows();
                    console.log(`[OAuth Service] Cleaned up ${expiredCount} expired flows`);
                }
                
                // Cleanup expired tokens
                if (this.tokenManager) {
                    const tokenCleanupCount = await this.tokenManager.cleanupExpiredTokens();
                    if (tokenCleanupCount > 0) {
                        console.log(`[OAuth Service] Cleaned up ${tokenCleanupCount} expired tokens`);
                    }
                }
                
                return expiredCount;
            } catch (error) {
                console.error('[OAuth Service] Error during cleanup:', error);
                return 0;
            }
        }

        /**
         * Get service status
         */
        getStatus() {
            return {
                pendingFlows: this.pendingFlows.size,
                tokenManager: !!this.tokenManager,
                storageService: !!this.storageService,
                validTokens: this.tokenManager?.getConnectionsWithValidTokens()?.length || 0,
                expiredTokens: this.tokenManager?.getConnectionsWithExpiredTokens()?.length || 0
            };
        }
    }

    // Create service instance and export
    const oauthService = new OAuthService();
    
    // Export to global scope
    global.MCPOAuthService = {
        OAuthService: OAuthService,
        instance: oauthService
    };

})(window);