/**
 * Base interface for MCP providers
 * Defines the standard contract that all MCP providers must implement
 */

window.MCPProviderInterface = (function() {
    'use strict';

    /**
     * Standard configuration interface for providers
     * @typedef {Object} ProviderConfig
     * @property {string} name - Provider name (e.g., 'github', 'gmail')
     * @property {string} type - Authentication type ('oauth', 'pat', 'apikey')
     * @property {string[]} requiredScopes - Required scopes for authentication
     * @property {Object} endpoints - API endpoints configuration
     * @property {Object} [metadata] - Optional provider metadata
     */

/**
 * Authentication result interface
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether authentication succeeded
 * @property {string} [token] - Access token if successful
 * @property {string} [refreshToken] - Refresh token if available
 * @property {number} [expiresAt] - Token expiration timestamp
 * @property {string} [error] - Error message if failed
 * @property {string} [errorCode] - Error code for programmatic handling
 */

/**
 * Credential validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether credentials are valid
 * @property {Object} [userInfo] - User information if valid
 * @property {string} [error] - Error message if invalid
 * @property {boolean} [needsRefresh] - Whether token needs refresh
 */

/**
 * Tool definition interface
 * @typedef {Object} ToolDefinition
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object} parameters - JSON schema for parameters
 * @property {Function} handler - Tool execution handler
 * @property {string[]} [requiredScopes] - Required scopes to use this tool
 */

/**
 * Abstract base class for MCP providers
 * All MCP providers should extend this class and implement the required methods
 */
class MCPProvider {
    /**
     * Create a new MCP provider
     * @param {ProviderConfig} config - Provider configuration
     */
    constructor(config) {
        if (new.target === MCPProvider) {
            throw new Error('MCPProvider is abstract and cannot be instantiated directly');
        }
        
        this.config = config;
        this.name = config.name;
        this.type = config.type;
        this.requiredScopes = config.requiredScopes || [];
        this.endpoints = config.endpoints || {};
        this.metadata = config.metadata || {};
        
        // Validate required configuration
        this._validateConfig();
    }

    /**
     * Authenticate with the provider
     * @param {Object} authConfig - Authentication configuration
     * @param {string} [authConfig.token] - Existing token for validation
     * @param {string} [authConfig.refreshToken] - Refresh token if available
     * @param {Object} [authConfig.credentials] - Provider-specific credentials
     * @returns {Promise<AuthResult>} Authentication result
     */
    async authenticate(authConfig = {}) {
        throw new Error('authenticate() must be implemented by subclass');
    }

    /**
     * Validate existing credentials
     * @param {Object} credentials - Credentials to validate
     * @param {string} credentials.token - Access token
     * @param {string} [credentials.refreshToken] - Refresh token
     * @returns {Promise<ValidationResult>} Validation result
     */
    async validateCredentials(credentials) {
        throw new Error('validateCredentials() must be implemented by subclass');
    }

    /**
     * Refresh expired tokens
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<AuthResult>} New authentication result
     */
    async refreshTokens(refreshToken) {
        throw new Error('refreshTokens() must be implemented by subclass');
    }

    /**
     * Get the required scopes for this provider
     * @returns {string[]} Array of required scope strings
     */
    getRequiredScopes() {
        return this.requiredScopes;
    }

    /**
     * Get tool definitions provided by this provider
     * @returns {Promise<ToolDefinition[]>} Array of tool definitions
     */
    async getToolDefinitions() {
        throw new Error('getToolDefinitions() must be implemented by subclass');
    }

    /**
     * Execute a tool with the given parameters
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} parameters - Tool parameters
     * @param {Object} context - Execution context (credentials, etc.)
     * @returns {Promise<any>} Tool execution result
     */
    async executeTool(toolName, parameters, context) {
        throw new Error('executeTool() must be implemented by subclass');
    }

    /**
     * Get provider metadata for UI display
     * @returns {Object} Provider metadata
     */
    getMetadata() {
        return {
            name: this.name,
            displayName: this.metadata.displayName || this.name,
            description: this.metadata.description || `${this.name} integration`,
            icon: this.metadata.icon || null,
            authType: this.type,
            requiredScopes: this.requiredScopes,
            website: this.metadata.website || null,
            documentation: this.metadata.documentation || null
        };
    }

    /**
     * Disconnect and cleanup provider resources
     * @returns {Promise<void>}
     */
    async disconnect() {
        // Default implementation - subclasses can override
        return Promise.resolve();
    }

    /**
     * Check if provider supports a specific authentication type
     * @param {string} authType - Authentication type to check
     * @returns {boolean} Whether the auth type is supported
     */
    supportsAuthType(authType) {
        return this.type === authType;
    }

    /**
     * Get the storage key prefix for this provider
     * @returns {string} Storage key prefix
     */
    getStorageKeyPrefix() {
        return `mcp_${this.name}`;
    }

    /**
     * Validate the provider configuration
     * @private
     */
    _validateConfig() {
        if (!this.config.name) {
            throw new Error('Provider config must include a name');
        }
        
        if (!this.config.type) {
            throw new Error('Provider config must include an authentication type');
        }
        
        const validAuthTypes = ['oauth', 'pat', 'apikey', 'bearer'];
        if (!validAuthTypes.includes(this.config.type)) {
            throw new Error(`Invalid authentication type: ${this.config.type}. Must be one of: ${validAuthTypes.join(', ')}`);
        }
    }

    /**
     * Create a standardized error response
     * @param {string} message - Error message
     * @param {string} [code] - Error code
     * @param {Object} [details] - Additional error details
     * @returns {Object} Standardized error object
     */
    _createError(message, code = 'PROVIDER_ERROR', details = {}) {
        return {
            success: false,
            error: message,
            errorCode: code,
            details,
            provider: this.name
        };
    }

    /**
     * Create a standardized success response
     * @param {Object} data - Success data
     * @returns {Object} Standardized success object
     */
    _createSuccess(data = {}) {
        return {
            success: true,
            provider: this.name,
            ...data
        };
    }
}

    // Return the MCPProvider class
    return MCPProvider;
})();