/**
 * OAuth Token Manager
 * 
 * Manages OAuth token lifecycle, storage, and refresh operations
 */

window.OAuthTokenManager = (function() {
    'use strict';

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
            this.idToken = tokenData.id_token;
        }

        /**
         * Check if token is expired
         */
        isExpired() {
            if (!this.expiresIn) {
                return false;
            }
            const expiryTime = this.issuedAt + (this.expiresIn * 1000);
            return Date.now() > (expiryTime - 60000);
        }

        /**
         * Get remaining lifetime in seconds
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
     * Token Manager class
     */
    class TokenManager {
        constructor() {
            this.storageService = window.CoreStorageService;
            this.tokens = new Map();
            this.STORAGE_KEY = 'mcp-oauth-tokens';
            
            if (this.storageService) {
                this.loadTokens();
            }
        }

        /**
         * Store token for a connection
         */
        async storeToken(connectionId, tokenData) {
            try {
                const token = new OAuthToken(tokenData);
                this.tokens.set(connectionId, token);
                await this.saveTokens();
                console.log(`[Token Manager] Stored token for ${connectionId}`);
                return true;
            } catch (error) {
                console.error('[Token Manager] Error storing token:', error);
                return false;
            }
        }

        /**
         * Get token for a connection
         */
        getToken(connectionId) {
            return this.tokens.get(connectionId) || null;
        }

        /**
         * Get valid token (refresh if needed)
         */
        async getValidToken(connectionId, config = null) {
            let token = this.getToken(connectionId);
            
            if (!token) {
                return null;
            }
            
            if (token.isExpired() && token.refreshToken && config) {
                console.log(`[Token Manager] Token expired for ${connectionId}, refreshing...`);
                token = await this.refreshToken(connectionId, config);
            }
            
            return token;
        }

        /**
         * Refresh token
         */
        async refreshToken(connectionId, config) {
            try {
                const token = this.getToken(connectionId);
                if (!token || !token.refreshToken) {
                    throw new Error('No refresh token available');
                }
                
                const response = await fetch(config.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: token.refreshToken,
                        client_id: config.clientId,
                        ...(config.clientSecret && { client_secret: config.clientSecret })
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Token refresh failed: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(`Token refresh error: ${data.error_description || data.error}`);
                }
                
                // Update token with new data, preserving refresh token if not provided
                const newTokenData = {
                    ...data,
                    refresh_token: data.refresh_token || token.refreshToken,
                    issued_at: Date.now()
                };
                
                const newToken = new OAuthToken(newTokenData);
                this.tokens.set(connectionId, newToken);
                await this.saveTokens();
                
                console.log(`[Token Manager] Token refreshed for ${connectionId}`);
                return newToken;
            } catch (error) {
                console.error(`[Token Manager] Error refreshing token for ${connectionId}:`, error);
                
                // Remove invalid token
                this.tokens.delete(connectionId);
                await this.saveTokens();
                
                throw error;
            }
        }

        /**
         * Remove token for a connection
         */
        async removeToken(connectionId) {
            try {
                this.tokens.delete(connectionId);
                await this.saveTokens();
                console.log(`[Token Manager] Removed token for ${connectionId}`);
                return true;
            } catch (error) {
                console.error('[Token Manager] Error removing token:', error);
                return false;
            }
        }

        /**
         * Get all stored tokens
         */
        getAllTokens() {
            return new Map(this.tokens);
        }

        /**
         * Get connection IDs with valid tokens
         */
        getConnectionsWithValidTokens() {
            const validConnections = [];
            
            for (const [connectionId, token] of this.tokens.entries()) {
                if (!token.isExpired()) {
                    validConnections.push(connectionId);
                }
            }
            
            return validConnections;
        }

        /**
         * Get connection IDs with expired tokens
         */
        getConnectionsWithExpiredTokens() {
            const expiredConnections = [];
            
            for (const [connectionId, token] of this.tokens.entries()) {
                if (token.isExpired()) {
                    expiredConnections.push(connectionId);
                }
            }
            
            return expiredConnections;
        }

        /**
         * Clean up expired tokens without refresh tokens
         */
        async cleanupExpiredTokens() {
            const toRemove = [];
            
            for (const [connectionId, token] of this.tokens.entries()) {
                if (token.isExpired() && !token.refreshToken) {
                    toRemove.push(connectionId);
                }
            }
            
            for (const connectionId of toRemove) {
                this.tokens.delete(connectionId);
            }
            
            if (toRemove.length > 0) {
                await this.saveTokens();
                console.log(`[Token Manager] Cleaned up ${toRemove.length} expired tokens`);
            }
            
            return toRemove.length;
        }

        /**
         * Load tokens from storage
         */
        async loadTokens() {
            try {
                if (!this.storageService) return;
                
                const stored = await this.storageService.getValue(this.STORAGE_KEY);
                if (stored) {
                    for (const [connectionId, tokenData] of Object.entries(stored)) {
                        this.tokens.set(connectionId, new OAuthToken(tokenData));
                    }
                    console.log(`[Token Manager] Loaded ${this.tokens.size} tokens from storage`);
                }
            } catch (error) {
                console.error('[Token Manager] Error loading tokens:', error);
            }
        }

        /**
         * Save tokens to storage
         */
        async saveTokens() {
            try {
                if (!this.storageService) return;
                
                const toStore = {};
                for (const [connectionId, token] of this.tokens.entries()) {
                    toStore[connectionId] = token.toJSON();
                }
                
                await this.storageService.setValue(this.STORAGE_KEY, toStore);
            } catch (error) {
                console.error('[Token Manager] Error saving tokens:', error);
            }
        }

        /**
         * Clear all tokens
         */
        async clearAllTokens() {
            try {
                this.tokens.clear();
                await this.saveTokens();
                console.log('[Token Manager] Cleared all tokens');
                return true;
            } catch (error) {
                console.error('[Token Manager] Error clearing tokens:', error);
                return false;
            }
        }
    }

    // Export classes
    return {
        OAuthToken,
        TokenManager
    };
})();