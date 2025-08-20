/**
 * OAuth Base Connector for MCP Services
 * Extends BaseServiceConnector with OAuth-specific functionality
 */

(function(global) {
    'use strict';

    class OAuthConnector extends global.BaseServiceConnector {
        constructor(serviceKey, config) {
            super(serviceKey, config);
            this.oauthTokens = null;
        }

        /**
         * Check if credentials are valid (OAuth-specific)
         */
        hasValidCredentials() {
            if (!this.connection || !this.connection.tokens) {
                return false;
            }
            
            const tokens = this.connection.tokens;
            return !!(tokens.accessToken && tokens.accessToken.length > 0);
        }

        /**
         * Check if token needs refresh
         */
        needsTokenRefresh() {
            if (!this.connection || !this.connection.tokens) {
                return false;
            }
            
            const tokens = this.connection.tokens;
            if (!tokens.expiresAt) {
                return false;
            }
            
            // Refresh if expires in less than 1 minute
            return Date.now() > tokens.expiresAt - 60000;
        }

        /**
         * Connect using OAuth
         */
        async connect() {
            // Check for existing OAuth tokens
            const storageKey = this.getStorageKey('oauth');
            const existingAuth = await this.storage.getValue(storageKey);

            if (existingAuth && existingAuth.refreshToken) {
                // Try to use existing refresh token
                const tokens = await this.refreshOAuthToken(existingAuth);
                if (tokens) {
                    console.log(`[${this.constructor.name}] Using existing OAuth tokens`);
                    await this.createConnection(tokens);
                    return true;
                }
            }

            // OAuth tokens not found or invalid - caller should show UI
            return false;
        }

        /**
         * Create connection with OAuth tokens
         */
        async createConnection(tokens) {
            const connectionData = {
                type: 'oauth',
                tokens: tokens,
                connectedAt: Date.now(),
                lastValidated: Date.now()
            };

            await this.storeConnection(connectionData);
            
            // Store OAuth tokens separately for compatibility
            const oauthKey = this.getStorageKey('oauth');
            await this.storage.setValue(oauthKey, tokens);
            
            // Register tools
            await this.registerTools(tokens);
            
            console.log(`[${this.constructor.name}] Connected successfully via OAuth`);
            return true;
        }

        /**
         * Refresh OAuth token
         */
        async refreshOAuthToken(tokens) {
            if (!tokens.refreshToken) {
                console.error(`[${this.constructor.name}] No refresh token available`);
                return null;
            }

            if (!this.config.oauthConfig) {
                console.error(`[${this.constructor.name}] OAuth config not found`);
                return null;
            }

            try {
                const refreshData = new URLSearchParams({
                    refresh_token: tokens.refreshToken,
                    client_id: tokens.clientId || this.config.oauthConfig.clientId,
                    client_secret: tokens.clientSecret || this.config.oauthConfig.clientSecret,
                    grant_type: 'refresh_token'
                });

                const response = await fetch(this.config.oauthConfig.tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: refreshData.toString()
                });

                if (!response.ok) {
                    console.error(`[${this.constructor.name}] Token refresh failed:`, await response.text());
                    return null;
                }

                const data = await response.json();
                
                // Update tokens
                const newTokens = {
                    ...tokens,
                    accessToken: data.access_token,
                    expiresAt: Date.now() + ((data.expires_in || 3600) * 1000)
                };

                // Store updated tokens
                const oauthKey = this.getStorageKey('oauth');
                await this.storage.setValue(oauthKey, newTokens);

                return newTokens;
            } catch (error) {
                console.error(`[${this.constructor.name}] Failed to refresh token:`, error);
                return null;
            }
        }

        /**
         * Exchange authorization code for tokens
         */
        async exchangeCodeForTokens(code, clientId, clientSecret) {
            try {
                const tokenData = new URLSearchParams({
                    code: code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: this.config.oauthConfig.redirectUri || 'urn:ietf:wg:oauth:2.0:oob',
                    grant_type: 'authorization_code'
                });

                const response = await fetch(this.config.oauthConfig.tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: tokenData.toString()
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Token exchange failed: ${errorText}`);
                }

                const data = await response.json();
                
                const tokens = {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: Date.now() + ((data.expires_in || 3600) * 1000),
                    tokenType: data.token_type || 'Bearer',
                    scope: data.scope,
                    clientId: clientId,
                    clientSecret: clientSecret
                };

                return tokens;
            } catch (error) {
                console.error(`[${this.constructor.name}] Failed to exchange code for tokens:`, error);
                throw error;
            }
        }

        /**
         * Build OAuth authorization URL
         */
        buildAuthorizationUrl(clientId, additionalParams = {}) {
            const params = new URLSearchParams({
                client_id: clientId,
                response_type: this.config.oauthConfig.responseType || 'code',
                redirect_uri: this.config.oauthConfig.redirectUri || 'urn:ietf:wg:oauth:2.0:oob',
                scope: this.config.oauthConfig.scope,
                access_type: this.config.oauthConfig.accessType || 'offline',
                ...additionalParams
            });

            return `${this.config.oauthConfig.authorizationEndpoint}?${params.toString()}`;
        }

        /**
         * Make OAuth-authenticated API request
         */
        async makeOAuthRequest(url, options = {}) {
            // Check if token needs refresh
            if (this.needsTokenRefresh()) {
                const newTokens = await this.refreshOAuthToken(this.connection.tokens);
                if (newTokens) {
                    this.connection.tokens = newTokens;
                    await this.storeConnection(this.connection);
                } else {
                    throw new Error('Failed to refresh OAuth token');
                }
            }

            const authHeaders = {
                'Authorization': `Bearer ${this.connection.tokens.accessToken}`,
                'Accept': 'application/json'
            };

            return await this.makeApiRequest(url, {
                ...options,
                headers: {
                    ...authHeaders,
                    ...options.headers
                }
            });
        }

        /**
         * Validate OAuth connection
         */
        async validate() {
            if (!this.connection || !this.connection.tokens) {
                return false;
            }

            // Try to refresh token if needed
            if (this.needsTokenRefresh()) {
                const newTokens = await this.refreshOAuthToken(this.connection.tokens);
                if (!newTokens) {
                    return false;
                }
                
                this.connection.tokens = newTokens;
                this.connection.lastValidated = Date.now();
                await this.storeConnection(this.connection);
            }

            return true;
        }

        /**
         * Revoke OAuth tokens
         */
        async revokeTokens() {
            if (!this.connection || !this.connection.tokens) {
                return true; // Already disconnected
            }

            try {
                // Google OAuth revocation endpoint
                const revokeUrl = 'https://oauth2.googleapis.com/revoke';
                const response = await fetch(revokeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `token=${this.connection.tokens.accessToken}`
                });

                if (response.ok) {
                    console.log(`[${this.constructor.name}] OAuth tokens revoked successfully`);
                }
            } catch (error) {
                console.warn(`[${this.constructor.name}] Failed to revoke tokens:`, error);
            }

            return true;
        }

        /**
         * Disconnect from service
         */
        async disconnect() {
            await this.revokeTokens();
            return await super.disconnect();
        }
    }

    // Export to global scope
    global.OAuthConnector = OAuthConnector;

})(window);