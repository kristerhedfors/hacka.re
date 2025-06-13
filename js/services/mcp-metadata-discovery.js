/**
 * MCP OAuth Metadata Discovery Service
 * 
 * Implements OAuth 2.0 Authorization Server Metadata discovery (RFC 8414)
 * for MCP servers with OAuth support. Provides automatic endpoint discovery
 * and fallback to default endpoints.
 * 
 * Features:
 * - OAuth 2.0 Authorization Server Metadata discovery
 * - MCP-Protocol-Version header support
 * - Fallback to default endpoints
 * - Authorization base URL calculation
 * - Comprehensive error handling
 */

/**
 * Metadata discovery error class
 */
class MCPMetadataError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'MCPMetadataError';
        this.code = code;
    }
}

/**
 * OAuth Server Metadata Discovery Service
 */
class MetadataDiscoveryService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes cache
    }

    /**
     * Discover OAuth server metadata for an MCP server
     * @param {string} mcpServerUrl - The MCP server URL
     * @param {string} protocolVersion - MCP protocol version (e.g., '2024-11-05')
     * @returns {Promise<Object>} Server metadata with endpoints
     */
    async discoverMetadata(mcpServerUrl, protocolVersion = '2024-11-05') {
        const cacheKey = `${mcpServerUrl}:${protocolVersion}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.metadata;
        }

        try {
            const authBaseUrl = this._getAuthorizationBaseUrl(mcpServerUrl);
            const metadataUrl = `${authBaseUrl}/.well-known/oauth-authorization-server`;

            console.log(`[MCP Metadata] Discovering metadata at: ${metadataUrl}`);

            // Attempt metadata discovery
            const response = await fetch(metadataUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'MCP-Protocol-Version': protocolVersion
                }
            });

            if (response.ok) {
                const metadata = await response.json();
                const processedMetadata = this._processMetadata(metadata, authBaseUrl);
                
                // Cache successful discovery
                this.cache.set(cacheKey, {
                    metadata: processedMetadata,
                    timestamp: Date.now()
                });

                console.log('[MCP Metadata] Successfully discovered server metadata');
                return processedMetadata;
            } else if (response.status === 404) {
                console.log('[MCP Metadata] Metadata endpoint not found, using fallback endpoints');
                return this._getFallbackMetadata(authBaseUrl);
            } else {
                throw new MCPMetadataError(
                    `Metadata discovery failed with status ${response.status}`,
                    'discovery_failed'
                );
            }
        } catch (error) {
            if (error instanceof MCPMetadataError) {
                throw error;
            }
            
            console.warn(`[MCP Metadata] Metadata discovery failed: ${error.message}`);
            console.log('[MCP Metadata] Using fallback endpoints');
            
            // Return fallback metadata on any error
            const authBaseUrl = this._getAuthorizationBaseUrl(mcpServerUrl);
            return this._getFallbackMetadata(authBaseUrl);
        }
    }

    /**
     * Get authorization base URL from MCP server URL
     * @param {string} mcpServerUrl - The MCP server URL
     * @returns {string} Authorization base URL
     */
    _getAuthorizationBaseUrl(mcpServerUrl) {
        try {
            const url = new URL(mcpServerUrl);
            // Return base URL without path components
            return `${url.protocol}//${url.host}`;
        } catch (error) {
            throw new MCPMetadataError(`Invalid MCP server URL: ${mcpServerUrl}`, 'invalid_url');
        }
    }

    /**
     * Process and validate discovered metadata
     * @param {Object} metadata - Raw metadata from server
     * @param {string} authBaseUrl - Authorization base URL
     * @returns {Object} Processed metadata
     */
    _processMetadata(metadata, authBaseUrl) {
        // Validate required fields
        if (!metadata.authorization_endpoint) {
            throw new MCPMetadataError('Missing authorization_endpoint in metadata', 'invalid_metadata');
        }
        if (!metadata.token_endpoint) {
            throw new MCPMetadataError('Missing token_endpoint in metadata', 'invalid_metadata');
        }

        // Ensure URLs are absolute
        const processedMetadata = {
            issuer: metadata.issuer || authBaseUrl,
            authorization_endpoint: this._ensureAbsoluteUrl(metadata.authorization_endpoint, authBaseUrl),
            token_endpoint: this._ensureAbsoluteUrl(metadata.token_endpoint, authBaseUrl),
            registration_endpoint: metadata.registration_endpoint ? 
                this._ensureAbsoluteUrl(metadata.registration_endpoint, authBaseUrl) : null,
            
            // OAuth capabilities
            grant_types_supported: metadata.grant_types_supported || ['authorization_code'],
            response_types_supported: metadata.response_types_supported || ['code'],
            code_challenge_methods_supported: metadata.code_challenge_methods_supported || ['S256'],
            scopes_supported: metadata.scopes_supported || [],
            
            // Token endpoint authentication
            token_endpoint_auth_methods_supported: metadata.token_endpoint_auth_methods_supported || 
                ['client_secret_basic', 'client_secret_post', 'none'],
            
            // PKCE support
            pkce_required: metadata.pkce_required !== false, // Default to true for security
            
            // Additional endpoints
            revocation_endpoint: metadata.revocation_endpoint ? 
                this._ensureAbsoluteUrl(metadata.revocation_endpoint, authBaseUrl) : null,
            introspection_endpoint: metadata.introspection_endpoint ? 
                this._ensureAbsoluteUrl(metadata.introspection_endpoint, authBaseUrl) : null,

            // MCP-specific metadata
            mcp_protocol_version: metadata.mcp_protocol_version,
            
            // Store raw metadata for debugging
            _raw: metadata,
            _discovered: true
        };

        this._validateMetadata(processedMetadata);
        return processedMetadata;
    }

    /**
     * Get fallback metadata when discovery fails
     * @param {string} authBaseUrl - Authorization base URL
     * @returns {Object} Fallback metadata with default endpoints
     */
    _getFallbackMetadata(authBaseUrl) {
        return {
            issuer: authBaseUrl,
            authorization_endpoint: `${authBaseUrl}/authorize`,
            token_endpoint: `${authBaseUrl}/token`,
            registration_endpoint: `${authBaseUrl}/register`,
            
            // Default OAuth capabilities
            grant_types_supported: ['authorization_code'],
            response_types_supported: ['code'],
            code_challenge_methods_supported: ['S256'],
            scopes_supported: [],
            
            // Default authentication methods
            token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
            
            // PKCE required by default for security
            pkce_required: true,
            
            // Mark as fallback
            _discovered: false,
            _fallback: true
        };
    }

    /**
     * Ensure URL is absolute
     * @param {string} url - URL to check
     * @param {string} baseUrl - Base URL for relative URLs
     * @returns {string} Absolute URL
     */
    _ensureAbsoluteUrl(url, baseUrl) {
        try {
            return new URL(url, baseUrl).href;
        } catch (error) {
            throw new MCPMetadataError(`Invalid URL: ${url}`, 'invalid_url');
        }
    }

    /**
     * Validate processed metadata
     * @param {Object} metadata - Metadata to validate
     * @throws {MCPMetadataError} If metadata is invalid
     */
    _validateMetadata(metadata) {
        // Ensure PKCE is supported for OAuth 2.1 compliance
        if (!metadata.code_challenge_methods_supported.includes('S256')) {
            console.warn('[MCP Metadata] Server does not support S256 PKCE method');
        }

        // Ensure authorization code grant is supported
        if (!metadata.grant_types_supported.includes('authorization_code')) {
            throw new MCPMetadataError(
                'Server does not support authorization_code grant type',
                'unsupported_grant_type'
            );
        }

        // Validate URLs
        try {
            new URL(metadata.authorization_endpoint);
            new URL(metadata.token_endpoint);
        } catch (error) {
            throw new MCPMetadataError('Invalid endpoint URLs in metadata', 'invalid_endpoints');
        }
    }

    /**
     * Clear metadata cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cached metadata (for debugging)
     * @returns {Map} Current cache contents
     */
    getCache() {
        return new Map(this.cache);
    }

    /**
     * Check if metadata discovery is supported by a server
     * @param {string} mcpServerUrl - The MCP server URL
     * @returns {Promise<boolean>} True if discovery is supported
     */
    async isDiscoverySupported(mcpServerUrl) {
        try {
            const authBaseUrl = this._getAuthorizationBaseUrl(mcpServerUrl);
            const metadataUrl = `${authBaseUrl}/.well-known/oauth-authorization-server`;

            const response = await fetch(metadataUrl, {
                method: 'HEAD',
                headers: {
                    'Accept': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate server compatibility with OAuth 2.1
     * @param {Object} metadata - Server metadata
     * @returns {Object} Compatibility report
     */
    validateOAuth21Compatibility(metadata) {
        const issues = [];
        const warnings = [];

        // Check PKCE support (required in OAuth 2.1)
        if (!metadata.code_challenge_methods_supported.includes('S256')) {
            issues.push('S256 PKCE method not supported (required for OAuth 2.1)');
        }

        // Check if PKCE is required
        if (!metadata.pkce_required) {
            warnings.push('PKCE not required by server (recommended for OAuth 2.1)');
        }

        // Check supported grant types
        if (!metadata.grant_types_supported.includes('authorization_code')) {
            issues.push('Authorization code grant type not supported');
        }

        // Check for deprecated implicit grant
        if (metadata.grant_types_supported.includes('implicit')) {
            warnings.push('Implicit grant type supported (deprecated in OAuth 2.1)');
        }

        return {
            compatible: issues.length === 0,
            issues: issues,
            warnings: warnings,
            score: issues.length === 0 ? (warnings.length === 0 ? 100 : 85) : 0
        };
    }
}

// Export the service
window.MCPMetadataDiscovery = {
    MetadataDiscoveryService,
    MCPMetadataError
};