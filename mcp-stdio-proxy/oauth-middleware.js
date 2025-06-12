/**
 * OAuth Middleware for MCP Stdio Proxy
 * 
 * Provides OAuth 2.1 authentication support for stdio-based MCP servers.
 * Handles environment-based credential management and token validation.
 * 
 * Features:
 * - OAuth token validation for stdio transport
 * - Environment-based credential injection
 * - Bearer token authentication
 * - Secure credential storage
 */

/**
 * OAuth middleware for stdio proxy authentication
 */
class OAuthMiddleware {
    constructor(options = {}) {
        this.enableAuth = options.enableAuth || process.env.OAUTH_ENABLED === 'true';
        this.trustedOrigins = options.trustedOrigins || this._parseOrigins(process.env.TRUSTED_ORIGINS);
        this.bearerTokens = new Map(); // In-memory token storage
        this.serverCredentials = new Map(); // Per-server OAuth credentials
        
        console.log(`[OAuth Middleware] Initialized - Auth enabled: ${this.enableAuth}`);
    }

    /**
     * Parse trusted origins from environment variable
     * @param {string} originsEnv - Comma-separated origins
     * @returns {Array<string>} Array of trusted origins
     */
    _parseOrigins(originsEnv) {
        if (!originsEnv) return [];
        return originsEnv.split(',').map(origin => origin.trim()).filter(Boolean);
    }

    /**
     * Middleware function for request authentication
     * @param {Object} req - HTTP request object
     * @param {Object} res - HTTP response object
     * @param {Function} next - Next middleware function
     */
    authenticate(req, res, next) {
        // Skip auth if disabled
        if (!this.enableAuth) {
            return next();
        }

        // Check for trusted origins (localhost is always trusted)
        const origin = req.headers.origin;
        if (this._isTrustedOrigin(origin)) {
            return next();
        }

        // Extract and validate bearer token
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return this._authError(res, 'Missing Authorization header');
        }

        const tokenMatch = authHeader.match(/Bearer\s+(.+)/);
        if (!tokenMatch) {
            return this._authError(res, 'Invalid Authorization header format');
        }

        const token = tokenMatch[1];
        if (!this._validateToken(token)) {
            return this._authError(res, 'Invalid or expired token');
        }

        // Token is valid, proceed
        req.oauthToken = token;
        next();
    }

    /**
     * Check if origin is trusted
     * @param {string} origin - Request origin
     * @returns {boolean} True if trusted
     */
    _isTrustedOrigin(origin) {
        // Always trust localhost
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return true;
        }

        // Check against configured trusted origins
        return this.trustedOrigins.includes(origin);
    }

    /**
     * Validate bearer token
     * @param {string} token - Bearer token to validate
     * @returns {boolean} True if valid
     */
    _validateToken(token) {
        // Check if token is in our store
        const tokenInfo = this.bearerTokens.get(token);
        if (!tokenInfo) {
            return false;
        }

        // Check expiration
        if (tokenInfo.expiresAt && Date.now() > tokenInfo.expiresAt) {
            this.bearerTokens.delete(token);
            return false;
        }

        return true;
    }

    /**
     * Send authentication error response
     * @param {Object} res - HTTP response object
     * @param {string} message - Error message
     */
    _authError(res, message) {
        res.writeHead(401, {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="MCP Stdio Proxy"'
        });
        res.end(JSON.stringify({
            error: 'unauthorized',
            error_description: message
        }));
    }

    /**
     * Add bearer token to store
     * @param {string} token - Bearer token
     * @param {Object} tokenInfo - Token information
     */
    addToken(token, tokenInfo = {}) {
        this.bearerTokens.set(token, {
            addedAt: Date.now(),
            expiresAt: tokenInfo.expiresAt || null,
            scope: tokenInfo.scope || '',
            serverName: tokenInfo.serverName
        });
        console.log(`[OAuth Middleware] Added token for server: ${tokenInfo.serverName}`);
    }

    /**
     * Remove bearer token from store
     * @param {string} token - Bearer token to remove
     */
    removeToken(token) {
        this.bearerTokens.delete(token);
        console.log('[OAuth Middleware] Removed token');
    }

    /**
     * Set OAuth credentials for a server
     * @param {string} serverName - Server identifier
     * @param {Object} credentials - OAuth credentials
     */
    setServerCredentials(serverName, credentials) {
        this.serverCredentials.set(serverName, {
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            tokenEndpoint: credentials.tokenEndpoint,
            addedAt: Date.now()
        });
        console.log(`[OAuth Middleware] Set credentials for server: ${serverName}`);
    }

    /**
     * Get OAuth credentials for a server
     * @param {string} serverName - Server identifier
     * @returns {Object|null} OAuth credentials or null
     */
    getServerCredentials(serverName) {
        return this.serverCredentials.get(serverName) || null;
    }

    /**
     * Inject OAuth environment variables for server process
     * @param {string} serverName - Server identifier
     * @param {Object} baseEnv - Base environment variables
     * @returns {Object} Enhanced environment with OAuth variables
     */
    injectOAuthEnvironment(serverName, baseEnv = {}) {
        const credentials = this.getServerCredentials(serverName);
        if (!credentials) {
            return baseEnv;
        }

        // Follow stdio transport OAuth convention from MCP spec
        const oauthEnv = {
            ...baseEnv,
            
            // OAuth 2.0 credentials
            OAUTH_CLIENT_ID: credentials.clientId,
            OAUTH_ACCESS_TOKEN: credentials.accessToken,
            
            // Optional OAuth variables
            ...(credentials.clientSecret && { OAUTH_CLIENT_SECRET: credentials.clientSecret }),
            ...(credentials.refreshToken && { OAUTH_REFRESH_TOKEN: credentials.refreshToken }),
            ...(credentials.tokenEndpoint && { OAUTH_TOKEN_ENDPOINT: credentials.tokenEndpoint }),
            
            // MCP-specific OAuth indicators
            MCP_OAUTH_ENABLED: 'true',
            MCP_TRANSPORT_TYPE: 'stdio'
        };

        console.log(`[OAuth Middleware] Injected OAuth environment for ${serverName}`);
        return oauthEnv;
    }

    /**
     * Refresh access token for a server
     * @param {string} serverName - Server identifier
     * @returns {Promise<boolean>} True if refresh successful
     */
    async refreshServerToken(serverName) {
        const credentials = this.getServerCredentials(serverName);
        if (!credentials || !credentials.refreshToken || !credentials.tokenEndpoint) {
            return false;
        }

        try {
            const response = await fetch(credentials.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: credentials.refreshToken,
                    client_id: credentials.clientId,
                    ...(credentials.clientSecret && { client_secret: credentials.clientSecret })
                })
            });

            if (!response.ok) {
                console.error(`[OAuth Middleware] Token refresh failed for ${serverName}: ${response.status}`);
                return false;
            }

            const tokenData = await response.json();
            
            // Update stored credentials
            this.setServerCredentials(serverName, {
                ...credentials,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || credentials.refreshToken
            });

            console.log(`[OAuth Middleware] Token refreshed for ${serverName}`);
            return true;

        } catch (error) {
            console.error(`[OAuth Middleware] Token refresh error for ${serverName}:`, error.message);
            return false;
        }
    }

    /**
     * Get OAuth status for all servers
     * @returns {Object} OAuth status information
     */
    getOAuthStatus() {
        const servers = {};
        
        for (const [serverName, credentials] of this.serverCredentials) {
            servers[serverName] = {
                hasCredentials: true,
                hasAccessToken: !!credentials.accessToken,
                hasRefreshToken: !!credentials.refreshToken,
                credentialsAge: Date.now() - credentials.addedAt
            };
        }

        return {
            enabled: this.enableAuth,
            trustedOrigins: this.trustedOrigins,
            activeTokens: this.bearerTokens.size,
            servers: servers
        };
    }

    /**
     * Clean up expired tokens
     */
    cleanupExpiredTokens() {
        const now = Date.now();
        let cleaned = 0;

        for (const [token, tokenInfo] of this.bearerTokens) {
            if (tokenInfo.expiresAt && now > tokenInfo.expiresAt) {
                this.bearerTokens.delete(token);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[OAuth Middleware] Cleaned up ${cleaned} expired tokens`);
        }
    }

    /**
     * Create middleware function for Express-like usage
     * @returns {Function} Middleware function
     */
    middleware() {
        return (req, res, next) => this.authenticate(req, res, next);
    }
}

module.exports = {
    OAuthMiddleware
};