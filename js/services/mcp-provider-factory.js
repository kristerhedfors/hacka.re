/**
 * Factory for creating MCP provider instances
 * Handles provider registration, configuration, and instantiation
 */

window.MCPProviderFactory = (function() {
    'use strict';

/**
 * Provider registration information
 * @typedef {Object} ProviderRegistration
 * @property {string} name - Provider name
 * @property {Function} providerClass - Provider constructor class
 * @property {Object} defaultConfig - Default configuration for provider
 * @property {string[]} aliases - Alternative names for the provider
 */

/**
 * Factory class for managing and creating MCP providers
 */
class MCPProviderFactoryClass {
    constructor() {
        this.providers = new Map();
        this.aliases = new Map();
        this._registerBuiltInProviders();
    }

    /**
     * Register a new provider type
     * @param {string} name - Provider name
     * @param {Function} providerClass - Provider constructor class
     * @param {Object} [defaultConfig={}] - Default configuration
     * @param {string[]} [aliases=[]] - Alternative names
     */
    register(name, providerClass, defaultConfig = {}, aliases = []) {
        // Validate provider class
        if (!providerClass || !providerClass.prototype instanceof window.MCPProviderInterface) {
            throw new Error(`Provider class for "${name}" must extend MCPProvider`);
        }

        // Validate name
        if (!name || typeof name !== 'string') {
            throw new Error('Provider name must be a non-empty string');
        }

        // Create registration
        const registration = {
            name,
            providerClass,
            defaultConfig: {
                name,
                ...defaultConfig
            },
            aliases: aliases || []
        };

        // Register main name
        this.providers.set(name.toLowerCase(), registration);

        // Register aliases
        aliases.forEach(alias => {
            this.aliases.set(alias.toLowerCase(), name.toLowerCase());
        });

        console.log(`[MCPProviderFactory] Registered provider: ${name}${aliases.length > 0 ? ` (aliases: ${aliases.join(', ')})` : ''}`);
    }

    /**
     * Create a provider instance
     * @param {string} type - Provider type name or alias
     * @param {Object} [config={}] - Provider-specific configuration
     * @returns {MCPProvider} Provider instance
     */
    createProvider(type, config = {}) {
        if (!type || typeof type !== 'string') {
            throw new Error('Provider type must be a non-empty string');
        }

        const normalizedType = type.toLowerCase();
        
        // Check for alias first
        const actualType = this.aliases.get(normalizedType) || normalizedType;
        
        // Get provider registration
        const registration = this.providers.get(actualType);
        if (!registration) {
            throw new Error(`Unknown provider type: ${type}. Available providers: ${this.getAvailableProviders().join(', ')}`);
        }

        // Merge configuration
        const finalConfig = {
            ...registration.defaultConfig,
            ...config,
            name: registration.name // Ensure name matches registration
        };

        // Create and return provider instance
        try {
            return new registration.providerClass(finalConfig);
        } catch (error) {
            throw new Error(`Failed to create provider "${type}": ${error.message}`);
        }
    }

    /**
     * Check if a provider type is available
     * @param {string} type - Provider type name or alias
     * @returns {boolean} Whether the provider is available
     */
    hasProvider(type) {
        if (!type || typeof type !== 'string') {
            return false;
        }

        const normalizedType = type.toLowerCase();
        return this.providers.has(normalizedType) || this.aliases.has(normalizedType);
    }

    /**
     * Get list of available provider names
     * @returns {string[]} Array of provider names
     */
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }

    /**
     * Get provider registration information
     * @param {string} type - Provider type name or alias
     * @returns {ProviderRegistration|null} Provider registration or null if not found
     */
    getProviderInfo(type) {
        if (!type || typeof type !== 'string') {
            return null;
        }

        const normalizedType = type.toLowerCase();
        const actualType = this.aliases.get(normalizedType) || normalizedType;
        
        return this.providers.get(actualType) || null;
    }

    /**
     * Get all provider registrations
     * @returns {ProviderRegistration[]} Array of all provider registrations
     */
    getAllProviders() {
        return Array.from(this.providers.values());
    }

    /**
     * Unregister a provider
     * @param {string} type - Provider type to unregister
     * @returns {boolean} Whether the provider was unregistered
     */
    unregister(type) {
        if (!type || typeof type !== 'string') {
            return false;
        }

        const normalizedType = type.toLowerCase();
        const registration = this.providers.get(normalizedType);
        
        if (!registration) {
            return false;
        }

        // Remove main registration
        this.providers.delete(normalizedType);

        // Remove aliases
        registration.aliases.forEach(alias => {
            this.aliases.delete(alias.toLowerCase());
        });

        console.log(`[MCPProviderFactory] Unregistered provider: ${type}`);
        return true;
    }

    /**
     * Clear all registered providers
     */
    clear() {
        this.providers.clear();
        this.aliases.clear();
        console.log('[MCPProviderFactory] Cleared all providers');
    }

    /**
     * Get provider configuration template
     * @param {string} type - Provider type
     * @returns {Object|null} Configuration template or null if provider not found
     */
    getConfigTemplate(type) {
        const registration = this.getProviderInfo(type);
        if (!registration) {
            return null;
        }

        return {
            ...registration.defaultConfig,
            // Add common configuration options
            enabled: true,
            timeout: 45000,
            retryAttempts: 3,
            retryDelay: 1000
        };
    }

    /**
     * Validate provider configuration
     * @param {string} type - Provider type
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    validateConfig(type, config) {
        const registration = this.getProviderInfo(type);
        if (!registration) {
            return {
                valid: false,
                errors: [`Unknown provider type: ${type}`]
            };
        }

        const errors = [];
        
        // Basic validation
        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be an object');
        } else {
            // Validate required fields based on auth type
            const authType = config.type || registration.defaultConfig.type;
            
            switch (authType) {
                case 'oauth':
                    if (!config.endpoints?.authorization) {
                        errors.push('OAuth providers require authorization endpoint');
                    }
                    if (!config.endpoints?.token) {
                        errors.push('OAuth providers require token endpoint');
                    }
                    break;
                    
                case 'pat':
                case 'apikey':
                    // These types require runtime credentials, not config validation
                    break;
                    
                default:
                    errors.push(`Unknown authentication type: ${authType}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Register built-in providers
     * @private
     */
    _registerBuiltInProviders() {
        // Built-in providers will be registered here
        // This method is called during factory construction
        
        // Note: Actual provider classes will be imported dynamically
        // to avoid circular dependencies
        console.log('[MCPProviderFactory] Initialized (built-in providers will be registered by modules)');
    }

    /**
     * Create provider with automatic configuration discovery
     * @param {string} type - Provider type
     * @param {Object} [overrides={}] - Configuration overrides
     * @returns {Promise<MCPProvider>} Provider instance with discovered configuration
     */
    async createProviderWithDiscovery(type, overrides = {}) {
        const registration = this.getProviderInfo(type);
        if (!registration) {
            throw new Error(`Unknown provider type: ${type}`);
        }

        let config = { ...registration.defaultConfig, ...overrides };

        // For OAuth providers, attempt metadata discovery
        if (config.type === 'oauth' && config.discoveryEndpoint) {
            try {
                const discoveredConfig = await this._discoverOAuthMetadata(config.discoveryEndpoint);
                config = { ...config, ...discoveredConfig };
            } catch (error) {
                console.warn(`[MCPProviderFactory] Discovery failed for ${type}:`, error.message);
                // Continue with existing config
            }
        }

        return this.createProvider(type, config);
    }

    /**
     * Discover OAuth metadata from well-known endpoint
     * @param {string} discoveryEndpoint - OAuth discovery endpoint URL
     * @returns {Promise<Object>} Discovered configuration
     * @private
     */
    async _discoverOAuthMetadata(discoveryEndpoint) {
        const response = await fetch(discoveryEndpoint);
        if (!response.ok) {
            throw new Error(`Discovery request failed: ${response.status}`);
        }

        const metadata = await response.json();
        
        return {
            endpoints: {
                authorization: metadata.authorization_endpoint,
                token: metadata.token_endpoint,
                deviceAuthorization: metadata.device_authorization_endpoint,
                userInfo: metadata.userinfo_endpoint,
                revocation: metadata.revocation_endpoint
            },
            supportedScopes: metadata.scopes_supported,
            supportedGrantTypes: metadata.grant_types_supported,
            supportedAuthMethods: metadata.token_endpoint_auth_methods_supported
        };
    }
}

    // Create and return singleton instance
    const providerFactory = new MCPProviderFactoryClass();

    // Public API
    return {
        // Singleton instance methods
        register: providerFactory.register.bind(providerFactory),
        createProvider: providerFactory.createProvider.bind(providerFactory),
        hasProvider: providerFactory.hasProvider.bind(providerFactory),
        getAvailableProviders: providerFactory.getAvailableProviders.bind(providerFactory),
        getProviderInfo: providerFactory.getProviderInfo.bind(providerFactory),
        getAllProviders: providerFactory.getAllProviders.bind(providerFactory),
        unregister: providerFactory.unregister.bind(providerFactory),
        clear: providerFactory.clear.bind(providerFactory),
        getConfigTemplate: providerFactory.getConfigTemplate.bind(providerFactory),
        validateConfig: providerFactory.validateConfig.bind(providerFactory),
        createProviderWithDiscovery: providerFactory.createProviderWithDiscovery.bind(providerFactory),
        
        // Constructor for creating new instances if needed
        MCPProviderFactoryClass: MCPProviderFactoryClass
    };
})();