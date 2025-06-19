/**
 * OAuth Providers Configuration
 * 
 * Configuration for common OAuth providers and error handling
 */

window.OAuthProvidersConfig = (function() {
    'use strict';

    /**
     * OAuth configuration for common providers
     */
    const OAUTH_PROVIDERS = {
        github: {
            deviceCodeUrl: 'https://github.com/login/device/code',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            scope: 'repo read:user',
            grantType: 'urn:ietf:params:oauth:grant-type:device_code',
            useDeviceFlow: true,
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            responseType: 'code'
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
        constructor(message, code = null, data = null) {
            super(message);
            this.name = 'MCPOAuthError';
            this.code = code;
            this.data = data;
        }
    }

    /**
     * Get provider configuration
     */
    function getProviderConfig(provider) {
        return OAUTH_PROVIDERS[provider] || null;
    }

    /**
     * Get all provider configurations
     */
    function getAllProviders() {
        return { ...OAUTH_PROVIDERS };
    }

    /**
     * Add custom provider configuration
     */
    function addProvider(name, config) {
        OAUTH_PROVIDERS[name] = { ...config };
    }

    /**
     * Update provider configuration
     */
    function updateProvider(name, config) {
        if (OAUTH_PROVIDERS[name]) {
            OAUTH_PROVIDERS[name] = { ...OAUTH_PROVIDERS[name], ...config };
        }
    }

    /**
     * Check if provider supports device flow
     */
    function supportsDeviceFlow(provider) {
        const config = getProviderConfig(provider);
        return config && config.useDeviceFlow === true;
    }

    /**
     * Check if provider supports authorization code flow
     */
    function supportsAuthorizationCodeFlow(provider) {
        const config = getProviderConfig(provider);
        return config && config.authorizationUrl && config.tokenUrl;
    }

    /**
     * Get device flow URL for provider
     */
    function getDeviceCodeUrl(provider) {
        const config = getProviderConfig(provider);
        return config?.deviceCodeUrl || null;
    }

    /**
     * Get token URL for provider
     */
    function getTokenUrl(provider) {
        const config = getProviderConfig(provider);
        return config?.tokenUrl || null;
    }

    /**
     * Get authorization URL for provider
     */
    function getAuthorizationUrl(provider) {
        const config = getProviderConfig(provider);
        return config?.authorizationUrl || null;
    }

    /**
     * Get default scope for provider
     */
    function getDefaultScope(provider) {
        const config = getProviderConfig(provider);
        return config?.scope || '';
    }

    // Public API
    return {
        OAUTH_PROVIDERS,
        MCPOAuthError,
        getProviderConfig,
        getAllProviders,
        addProvider,
        updateProvider,
        supportsDeviceFlow,
        supportsAuthorizationCodeFlow,
        getDeviceCodeUrl,
        getTokenUrl,
        getAuthorizationUrl,
        getDefaultScope
    };
})();