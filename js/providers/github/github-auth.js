/**
 * GitHub Authentication Module
 * Handles GitHub Personal Access Token authentication and validation
 * 
 * Dependencies: window.MCPAuthStrategies, window.CoreStorageService
 */

window.GitHubAuth = class GitHubAuth {
    constructor(config = {}) {
        this.config = {
            endpoints: {
                api: 'https://api.github.com',
                userInfo: 'https://api.github.com/user'
            },
            requiredScopes: ['repo', 'read:user'],
            timeout: 10000,
            ...config
        };
        
        this.authStrategy = new window.MCPAuthStrategies.PersonalTokenStrategy({
            tokenValidationEndpoint: this.config.endpoints.userInfo,
            requiredScopes: this.config.requiredScopes
        });
    }

    /**
     * Authenticate with GitHub using Personal Access Token
     * @param {Object} authConfig - Authentication configuration
     * @param {string} authConfig.token - GitHub PAT token
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(authConfig = {}) {
        try {
            const result = await this.authStrategy.authenticate({
                ...authConfig,
                provider: 'github'
            });
            
            return result;
        } catch (error) {
            return this._createError(`Authentication failed: ${error.message}`, 'AUTH_FAILED');
        }
    }

    /**
     * Validate GitHub credentials
     * @param {Object} credentials - Credentials to validate
     * @param {string} credentials.token - GitHub PAT token
     * @returns {Promise<Object>} Validation result
     */
    async validateCredentials(credentials) {
        try {
            const result = await this.authStrategy.validate(credentials);
            return {
                valid: result.valid,
                userInfo: result.userInfo,
                error: result.error,
                needsRefresh: result.needsRefresh
            };
        } catch (error) {
            return {
                valid: false,
                error: `Validation failed: ${error.message}`
            };
        }
    }

    /**
     * Validate GitHub token directly against API
     * @param {string} token - GitHub PAT token
     * @returns {Promise<boolean>} True if valid
     */
    async validateToken(token) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            
            const response = await fetch(this.config.endpoints.userInfo, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'hacka.re-mcp-integration'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
            
        } catch (error) {
            console.error('GitHub Auth: Token validation failed:', error);
            return false;
        }
    }

    /**
     * Get user information from GitHub API
     * @param {string} token - GitHub PAT token
     * @returns {Promise<Object|null>} User info or null
     */
    async getUserInfo(token) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            
            const response = await fetch(this.config.endpoints.userInfo, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'hacka.re-mcp-integration'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return await response.json();
            }
            
            return null;
            
        } catch (error) {
            console.error('GitHub Auth: Error getting user info:', error);
            return null;
        }
    }

    /**
     * Refresh tokens (not supported for PAT)
     * @param {string} refreshToken - Refresh token (unused for PAT)
     * @returns {Promise<Object>} Error result
     */
    async refreshTokens(refreshToken) {
        return this._createError('GitHub Personal Access Tokens cannot be refreshed', 'NOT_REFRESHABLE');
    }

    /**
     * Save token to storage
     * @param {string} token - GitHub PAT token
     * @returns {Promise<void>}
     */
    async saveToken(token) {
        try {
            await window.CoreStorageService.setValue('mcp_github_token', token);
            console.log('GitHub Auth: Token saved successfully');
        } catch (error) {
            console.error('GitHub Auth: Error saving token:', error);
            throw new Error('Failed to save token to storage');
        }
    }

    /**
     * Get saved token from storage
     * @returns {Promise<string|null>} Saved token or null
     */
    async getSavedToken() {
        try {
            return await window.CoreStorageService.getValue('mcp_github_token');
        } catch (error) {
            console.error('GitHub Auth: Error getting token:', error);
            return null;
        }
    }

    /**
     * Remove saved token from storage
     * @returns {Promise<void>}
     */
    async removeToken() {
        try {
            await window.CoreStorageService.removeValue('mcp_github_token');
            console.log('GitHub Auth: Token removed');
        } catch (error) {
            console.error('GitHub Auth: Error removing token:', error);
        }
    }

    /**
     * Check if valid token exists in storage
     * @returns {Promise<boolean>} True if valid token exists
     */
    async hasValidToken() {
        try {
            const token = await this.getSavedToken();
            if (!token) return false;
            
            return await this.validateToken(token);
        } catch (error) {
            console.error('GitHub Auth: Error checking token validity:', error);
            return false;
        }
    }

    /**
     * Get credentials for API requests
     * @returns {Promise<Object|null>} Credentials object or null
     */
    async getCredentials() {
        const token = await this.getSavedToken();
        return token ? { token } : null;
    }

    /**
     * Create error response object
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @returns {Object} Error response
     */
    _createError(message, code) {
        return {
            success: false,
            error: message,
            code: code
        };
    }
}