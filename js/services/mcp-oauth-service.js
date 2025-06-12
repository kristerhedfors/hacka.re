/**
 * MCP OAuth Service for hacka.re
 * 
 * Provides OAuth 2.0 authorization code flow support for MCP connections.
 * Implements secure token management, PKCE, and automatic refresh.
 * 
 * Features:
 * - Authorization code flow with PKCE
 * - Secure token storage using encryption
 * - Automatic token refresh
 * - Multiple provider support
 * - No external dependencies
 */

/**
 * OAuth configuration for common providers
 */
const OAUTH_PROVIDERS = {
    github: {
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'repo read:user',
        responseType: 'code',
        grantType: 'authorization_code'
    },
    google: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'openid profile email',
        responseType: 'code',
        grantType: 'authorization_code'
    },
    custom: {
        authorizationUrl: '',
        tokenUrl: '',
        scope: '',
        responseType: 'code',
        grantType: 'authorization_code'
    }
};

/**
 * OAuth error class for specific OAuth-related errors
 */
class MCPOAuthError extends Error {
    constructor(message, code = null, description = null) {
        super(message);
        this.name = 'MCPOAuthError';
        this.code = code;
        this.description = description;
    }
}

/**
 * OAuth token class for managing token lifecycle
 */
class OAuthToken {
    constructor(tokenData) {
        this.accessToken = tokenData.access_token;
        this.tokenType = tokenData.token_type || 'Bearer';
        this.expiresIn = tokenData.expires_in;
        this.refreshToken = tokenData.refresh_token;
        this.scope = tokenData.scope;
        this.issuedAt = tokenData.issued_at || Date.now();
        this.idToken = tokenData.id_token; // For OpenID Connect
    }

    /**
     * Check if token is expired
     * @returns {boolean} True if token is expired
     */
    isExpired() {
        if (!this.expiresIn) {
            return false; // No expiry info, assume valid
        }
        const expiryTime = this.issuedAt + (this.expiresIn * 1000);
        // Add 60 second buffer to refresh before actual expiry
        return Date.now() > (expiryTime - 60000);
    }

    /**
     * Get remaining lifetime in seconds
     * @returns {number} Remaining lifetime in seconds, or -1 if no expiry
     */
    getRemainingLifetime() {
        if (!this.expiresIn) {
            return -1;
        }
        const expiryTime = this.issuedAt + (this.expiresIn * 1000);
        const remaining = Math.floor((expiryTime - Date.now()) / 1000);
        return Math.max(0, remaining);
    }

    /**
     * Convert to storage format
     * @returns {Object} Token data for storage
     */
    toJSON() {
        return {
            access_token: this.accessToken,
            token_type: this.tokenType,
            expires_in: this.expiresIn,
            refresh_token: this.refreshToken,
            scope: this.scope,
            issued_at: this.issuedAt,
            id_token: this.idToken
        };
    }
}

/**
 * PKCE (Proof Key for Code Exchange) helper
 */
class PKCEHelper {
    /**
     * Generate code verifier
     * @returns {string} Code verifier
     */
    static generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return this.base64URLEncode(array);
    }

    /**
     * Generate code challenge from verifier
     * @param {string} verifier - Code verifier
     * @returns {Promise<string>} Code challenge
     */
    static async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return this.base64URLEncode(new Uint8Array(digest));
    }

    /**
     * Base64 URL encode
     * @param {Uint8Array} buffer - Buffer to encode
     * @returns {string} Base64 URL encoded string
     */
    static base64URLEncode(buffer) {
        const base64 = btoa(String.fromCharCode(...buffer));
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}

/**
 * OAuth service for managing OAuth flows and tokens
 */
class OAuthService {
    constructor() {
        this.storageService = window.CoreStorageService;
        this.tokens = new Map(); // In-memory cache
        this.pendingFlows = new Map(); // Track pending authorization flows
        this.serverConfigs = new Map(); // Server OAuth configurations
        this.STORAGE_KEY = 'mcp-oauth-tokens';
        
        // Initialize metadata discovery and client registration services
        this.metadataService = null;
        this.registrationService = null;
        
        // Check if storage service is available before initializing
        if (this.storageService) {
            this.initializeServices();
            this.loadTokens();
        } else {
            console.warn('[MCP OAuth] Storage service not available, deferring initialization');
            // Try again after a short delay
            setTimeout(() => {
                this.storageService = window.CoreStorageService;
                if (this.storageService) {
                    this.initializeServices();
                    this.loadTokens();
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
     * Load tokens from encrypted storage
     */
    async loadTokens() {
        if (!this.storageService) {
            console.warn('[MCP OAuth] Storage service not available, skipping token loading');
            return;
        }
        
        try {
            const storedTokens = await this.storageService.getValue(this.STORAGE_KEY);
            if (storedTokens && typeof storedTokens === 'object') {
                Object.entries(storedTokens).forEach(([serverName, tokenData]) => {
                    this.tokens.set(serverName, new OAuthToken(tokenData));
                });
            }
        } catch (error) {
            console.error('[MCP OAuth] Failed to load tokens:', error);
        }
    }

    /**
     * Save tokens to encrypted storage
     */
    async saveTokens() {
        if (!this.storageService) {
            console.warn('[MCP OAuth] Storage service not available, skipping token saving');
            return;
        }
        
        try {
            const tokensObj = {};
            this.tokens.forEach((token, serverName) => {
                tokensObj[serverName] = token.toJSON();
            });
            await this.storageService.setValue(this.STORAGE_KEY, tokensObj);
        } catch (error) {
            console.error('[MCP OAuth] Failed to save tokens:', error);
        }
    }

    /**
     * Start OAuth authorization flow with automatic metadata discovery and client registration
     * @param {string} serverName - Name of the MCP server
     * @param {Object} config - OAuth configuration
     * @returns {Promise<Object>} Authorization URL and flow info
     */
    async startAuthorizationFlow(serverName, config) {
        try {
            // Step 1: Discover OAuth server metadata if MCP server URL provided
            let effectiveConfig = { ...config };
            if (config.mcpServerUrl && !config.skipMetadataDiscovery && this.metadataService) {
                console.log(`[MCP OAuth] Discovering metadata for ${serverName}`);
                try {
                    const metadata = await this.metadataService.discoverMetadata(
                        config.mcpServerUrl,
                        config.mcpProtocolVersion || '2024-11-05'
                    );
                    
                    // Update config with discovered endpoints
                    effectiveConfig.authorizationUrl = metadata.authorization_endpoint;
                    effectiveConfig.tokenUrl = metadata.token_endpoint;
                    effectiveConfig.registrationEndpoint = metadata.registration_endpoint;
                    effectiveConfig._metadata = metadata;
                    
                    console.log('[MCP OAuth] Metadata discovery successful');
                } catch (metadataError) {
                    console.warn(`[MCP OAuth] Metadata discovery failed: ${metadataError.message}`);
                    // Continue with provided config
                }
            }
            
            // Step 2: Register client if registration endpoint is available
            if (effectiveConfig.registrationEndpoint && !config.skipClientRegistration && this.registrationService) {
                console.log(`[MCP OAuth] Attempting client registration for ${serverName}`);
                try {
                    const clientCredentials = await this.registrationService.registerClient(
                        serverName,
                        effectiveConfig.registrationEndpoint,
                        {
                            clientName: config.clientName || `hacka.re MCP Client (${serverName})`,
                            clientUri: config.clientUri || 'https://hacka.re',
                            scope: effectiveConfig.scope,
                            customRedirectUri: config.redirectUri
                        }
                    );
                    
                    // Update config with registered client credentials
                    effectiveConfig.clientId = clientCredentials.client_id;
                    effectiveConfig.clientSecret = clientCredentials.client_secret;
                    effectiveConfig.redirectUri = clientCredentials.redirect_uris[0];
                    effectiveConfig._clientCredentials = clientCredentials;
                    
                    console.log('[MCP OAuth] Client registration successful');
                } catch (registrationError) {
                    console.warn(`[MCP OAuth] Client registration failed: ${registrationError.message}`);
                    // Continue with provided credentials
                }
            }
            
            // Store the effective configuration
            this.serverConfigs.set(serverName, effectiveConfig);
            
            // Step 3: Generate PKCE values (OAuth 2.1 requirement)
            const codeVerifier = PKCEHelper.generateCodeVerifier();
            const codeChallenge = await PKCEHelper.generateCodeChallenge(codeVerifier);
        
            // Generate state for CSRF protection
            const state = PKCEHelper.generateCodeVerifier();
            
            // Build authorization URL
            const params = new URLSearchParams({
                response_type: effectiveConfig.responseType || 'code',
                client_id: effectiveConfig.clientId,
                redirect_uri: effectiveConfig.redirectUri,
                scope: effectiveConfig.scope,
                state: state,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            });

            // Add custom parameters if provided
            if (effectiveConfig.additionalParams) {
                Object.entries(effectiveConfig.additionalParams).forEach(([key, value]) => {
                    params.set(key, value);
                });
            }

            const authorizationUrl = `${effectiveConfig.authorizationUrl}?${params.toString()}`;
            
            // Store flow information
            const flowInfo = {
                serverName,
                config: effectiveConfig,
                state,
                codeVerifier,
                codeChallenge,
                startedAt: Date.now()
            };
            
            this.pendingFlows.set(state, flowInfo);
            
            // Clean up old flows (older than 10 minutes)
            this.cleanupPendingFlows();
            
            console.log(`[MCP OAuth] Authorization flow started for ${serverName}`);
            return {
                authorizationUrl,
                state,
                serverName,
                metadata: effectiveConfig._metadata,
                clientCredentials: effectiveConfig._clientCredentials
            };
            
        } catch (error) {
            console.error(`[MCP OAuth] Failed to start authorization flow: ${error.message}`);
            throw new MCPOAuthError(
                `Authorization flow startup failed: ${error.message}`,
                'flow_start_failed'
            );
        }
    }

    /**
     * Complete OAuth authorization flow
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @returns {Promise<OAuthToken>} OAuth token
     */
    async completeAuthorizationFlow(code, state) {
        const flowInfo = this.pendingFlows.get(state);
        if (!flowInfo) {
            throw new MCPOAuthError('Invalid or expired state parameter', 'invalid_state');
        }
        
        this.pendingFlows.delete(state);
        
        const { serverName, config, codeVerifier } = flowInfo;
        
        // Exchange code for token
        const tokenData = await this.exchangeCodeForToken(code, config, codeVerifier);
        
        // Create and store token
        const token = new OAuthToken(tokenData);
        this.tokens.set(serverName, token);
        await this.saveTokens();
        
        console.log(`[MCP OAuth] Successfully obtained token for ${serverName}`);
        
        return token;
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code
     * @param {Object} config - OAuth configuration
     * @param {string} codeVerifier - PKCE code verifier
     * @returns {Promise<Object>} Token response
     */
    async exchangeCodeForToken(code, config, codeVerifier) {
        const params = new URLSearchParams({
            grant_type: config.grantType || 'authorization_code',
            code: code,
            redirect_uri: config.redirectUri,
            client_id: config.clientId,
            code_verifier: codeVerifier
        });

        // Add client secret if provided (for confidential clients)
        if (config.clientSecret) {
            params.set('client_secret', config.clientSecret);
        }

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'token_exchange_failed' }));
            throw new MCPOAuthError(
                'Failed to exchange code for token',
                error.error,
                error.error_description
            );
        }

        const tokenData = await response.json();
        tokenData.issued_at = Date.now();
        
        return tokenData;
    }

    /**
     * Refresh access token
     * @param {string} serverName - Name of the MCP server
     * @returns {Promise<OAuthToken>} New OAuth token
     */
    async refreshAccessToken(serverName) {
        const token = this.tokens.get(serverName);
        if (!token || !token.refreshToken) {
            throw new MCPOAuthError('No refresh token available', 'no_refresh_token');
        }

        const config = this.getServerConfig(serverName);
        if (!config) {
            throw new MCPOAuthError('Server configuration not found', 'config_not_found');
        }

        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
            client_id: config.clientId
        });

        if (config.clientSecret) {
            params.set('client_secret', config.clientSecret);
        }

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'refresh_failed' }));
            throw new MCPOAuthError(
                'Failed to refresh token',
                error.error,
                error.error_description
            );
        }

        const tokenData = await response.json();
        tokenData.issued_at = Date.now();
        
        // Preserve refresh token if not included in response
        if (!tokenData.refresh_token && token.refreshToken) {
            tokenData.refresh_token = token.refreshToken;
        }

        const newToken = new OAuthToken(tokenData);
        this.tokens.set(serverName, newToken);
        await this.saveTokens();

        console.log(`[MCP OAuth] Successfully refreshed token for ${serverName}`);
        
        return newToken;
    }

    /**
     * Get access token for server
     * @param {string} serverName - Name of the MCP server
     * @param {boolean} autoRefresh - Automatically refresh if expired
     * @returns {Promise<string>} Access token
     */
    async getAccessToken(serverName, autoRefresh = true) {
        let token = this.tokens.get(serverName);
        
        if (!token) {
            throw new MCPOAuthError('No token found for server', 'no_token');
        }

        if (autoRefresh && token.isExpired() && token.refreshToken) {
            try {
                token = await this.refreshAccessToken(serverName);
            } catch (error) {
                console.error(`[MCP OAuth] Failed to refresh token for ${serverName}:`, error);
                throw error;
            }
        }

        return token.accessToken;
    }

    /**
     * Get token info for server
     * @param {string} serverName - Name of the MCP server
     * @returns {Object|null} Token info or null
     */
    getTokenInfo(serverName) {
        const token = this.tokens.get(serverName);
        if (!token) {
            return null;
        }

        return {
            hasToken: true,
            isExpired: token.isExpired(),
            remainingLifetime: token.getRemainingLifetime(),
            scope: token.scope,
            tokenType: token.tokenType,
            hasRefreshToken: !!token.refreshToken
        };
    }

    /**
     * Revoke token for server
     * @param {string} serverName - Name of the MCP server
     */
    async revokeToken(serverName) {
        this.tokens.delete(serverName);
        await this.saveTokens();
        console.log(`[MCP OAuth] Revoked token for ${serverName}`);
    }

    /**
     * Get server configuration
     * @param {string} serverName - Name of the MCP server
     * @returns {Object|null} Server OAuth configuration
     */
    getServerConfig(serverName) {
        // Check if we have a stored configuration
        if (this.serverConfigs && this.serverConfigs.has(serverName)) {
            return this.serverConfigs.get(serverName);
        }
        
        // Try to get from OAuth config component if available
        if (window.mcpOAuthConfig) {
            return window.mcpOAuthConfig.getConfiguration(serverName);
        }
        
        return null;
    }

    /**
     * Clean up old pending flows
     */
    cleanupPendingFlows() {
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        for (const [state, flowInfo] of this.pendingFlows) {
            if (flowInfo.startedAt < tenMinutesAgo) {
                this.pendingFlows.delete(state);
            }
        }
    }

    /**
     * Handle OAuth redirect
     * @param {string} url - Redirect URL with parameters
     * @returns {Promise<Object>} Result of handling redirect
     */
    async handleRedirect(url) {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        
        // Check for error response
        const error = params.get('error');
        if (error) {
            throw new MCPOAuthError(
                'OAuth authorization failed',
                error,
                params.get('error_description')
            );
        }
        
        // Extract code and state
        const code = params.get('code');
        const state = params.get('state');
        
        if (!code || !state) {
            throw new MCPOAuthError('Missing code or state parameter', 'invalid_response');
        }
        
        // Complete the flow
        const token = await this.completeAuthorizationFlow(code, state);
        
        return {
            success: true,
            serverName: this.pendingFlows.get(state)?.serverName,
            token
        };
    }

    /**
     * Build authorization header
     * @param {string} serverName - Name of the MCP server
     * @returns {Promise<Object>} Authorization header
     */
    async getAuthorizationHeader(serverName) {
        const token = await this.getAccessToken(serverName);
        const tokenInfo = this.tokens.get(serverName);
        
        return {
            'Authorization': `${tokenInfo.tokenType} ${token}`
        };
    }

    /**
     * Get comprehensive server information including metadata and client credentials
     * @param {string} serverName - Name of the MCP server
     * @returns {Promise<Object|null>} Complete server information
     */
    async getServerInfo(serverName) {
        const config = this.serverConfigs.get(serverName);
        const tokenInfo = this.getTokenInfo(serverName);
        const clientCredentials = this.registrationService ? 
            await this.registrationService.getClientCredentials(serverName) : null;
        
        return {
            serverName,
            config,
            tokenInfo,
            clientCredentials,
            hasMetadata: !!(config && config._metadata),
            hasClientRegistration: !!clientCredentials,
            isAuthenticated: !!(tokenInfo && tokenInfo.hasToken && !tokenInfo.isExpired)
        };
    }

    /**
     * Validate OAuth 2.1 compliance for a server
     * @param {string} serverName - Name of the MCP server
     * @returns {Promise<Object>} Compliance report
     */
    async validateOAuth21Compliance(serverName) {
        const config = this.serverConfigs.get(serverName);
        if (!config || !config._metadata) {
            return {
                compatible: false,
                error: 'No metadata available for compliance check'
            };
        }

        return this.metadataService ? 
            this.metadataService.validateOAuth21Compatibility(config._metadata) :
            { compatible: false, error: 'Metadata service not available' };
    }

    /**
     * Update client registration
     * @param {string} serverName - Name of the MCP server
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated registration
     */
    async updateClientRegistration(serverName, updates) {
        if (!this.registrationService) {
            throw new MCPOAuthError('Client registration service not available', 'service_unavailable');
        }

        const updatedCredentials = await this.registrationService.updateClientRegistration(
            serverName,
            updates
        );
        
        // Update stored config if we have one
        const config = this.serverConfigs.get(serverName);
        if (config) {
            config._clientCredentials = updatedCredentials;
            config.clientId = updatedCredentials.client_id;
            config.clientSecret = updatedCredentials.client_secret;
            this.serverConfigs.set(serverName, config);
        }
        
        return updatedCredentials;
    }

    /**
     * Delete client registration and revoke tokens
     * @param {string} serverName - Name of the MCP server
     * @returns {Promise<void>}
     */
    async deleteServerRegistration(serverName) {
        // Revoke tokens first
        await this.revokeToken(serverName);
        
        // Delete client registration if service available
        if (this.registrationService) {
            await this.registrationService.deleteClientRegistration(serverName);
        }
        
        // Clean up local state
        this.serverConfigs.delete(serverName);
        
        console.log(`[MCP OAuth] Deleted registration for ${serverName}`);
    }

    /**
     * List all configured servers with their status
     * @returns {Promise<Array<Object>>} Array of server information
     */
    async listServers() {
        const servers = [];
        
        // Get all servers from configs
        for (const serverName of this.serverConfigs.keys()) {
            servers.push(await this.getServerInfo(serverName));
        }
        
        // Get servers that only have client registrations
        if (this.registrationService) {
            const registeredClients = await this.registrationService.listRegisteredClients();
            for (const client of registeredClients) {
                if (!this.serverConfigs.has(client.serverName)) {
                    servers.push({
                        serverName: client.serverName,
                        config: null,
                        tokenInfo: this.getTokenInfo(client.serverName),
                        clientCredentials: await this.registrationService.getClientCredentials(client.serverName),
                        hasMetadata: false,
                        hasClientRegistration: true,
                        isAuthenticated: false
                    });
                }
            }
        }
        
        return servers;
    }

    /**
     * Enhanced PKCE helper using TweetNaCl for additional entropy
     * @returns {string} Secure code verifier
     */
    static generateSecureCodeVerifier() {
        // Use TweetNaCl for additional entropy if available
        if (window.CryptoUtils) {
            return window.CryptoUtils.generateRandomAlphaNum(128);
        }
        return PKCEHelper.generateCodeVerifier();
    }
}

// Export service
window.MCPOAuthService = {
    OAuthService,
    OAuthToken,
    PKCEHelper,
    MCPOAuthError,
    OAUTH_PROVIDERS
};