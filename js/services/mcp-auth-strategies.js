/**
 * Authentication strategies for MCP providers
 * Implements various authentication patterns used by different providers
 */

window.MCPAuthStrategies = (function() {
    'use strict';

/**
 * Base authentication strategy class
 */
class AuthStrategy {
    constructor(config) {
        if (new.target === AuthStrategy) {
            throw new Error('AuthStrategy is abstract and cannot be instantiated directly');
        }
        this.config = config;
        this.storage = window.CoreStorageService;
    }

    /**
     * Authenticate using this strategy
     * @param {Object} params - Authentication parameters
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(params) {
        throw new Error('authenticate() must be implemented by subclass');
    }

    /**
     * Validate existing credentials
     * @param {Object} credentials - Credentials to validate
     * @returns {Promise<Object>} Validation result
     */
    async validate(credentials) {
        throw new Error('validate() must be implemented by subclass');
    }

    /**
     * Refresh expired tokens
     * @param {Object} credentials - Current credentials including refresh token
     * @returns {Promise<Object>} Refresh result
     */
    async refresh(credentials) {
        throw new Error('refresh() must be implemented by subclass');
    }

    /**
     * Revoke/logout credentials
     * @param {Object} credentials - Credentials to revoke
     * @returns {Promise<Object>} Revocation result
     */
    async revoke(credentials) {
        // Default implementation - subclasses can override
        return { success: true };
    }

    /**
     * Get storage key for credentials
     * @param {string} provider - Provider name
     * @returns {string} Storage key
     */
    getStorageKey(provider) {
        return `mcp_${provider}_credentials`;
    }

    /**
     * Store credentials securely
     * @param {string} provider - Provider name
     * @param {Object} credentials - Credentials to store
     * @returns {Promise<void>}
     */
    async storeCredentials(provider, credentials) {
        const key = this.getStorageKey(provider);
        await this.storage.set(key, credentials);
    }

    /**
     * Retrieve stored credentials
     * @param {string} provider - Provider name
     * @returns {Promise<Object|null>} Stored credentials or null
     */
    async getStoredCredentials(provider) {
        const key = this.getStorageKey(provider);
        return await this.storage.get(key);
    }

    /**
     * Clear stored credentials
     * @param {string} provider - Provider name
     * @returns {Promise<void>}
     */
    async clearCredentials(provider) {
        const key = this.getStorageKey(provider);
        await this.storage.delete(key);
    }

    /**
     * Check if credentials are expired
     * @param {Object} credentials - Credentials to check
     * @returns {boolean} Whether credentials are expired
     */
    isExpired(credentials) {
        if (!credentials.expiresAt) {
            return false; // No expiration info, assume valid
        }
        return Date.now() >= credentials.expiresAt;
    }

    /**
     * Create standardized error response
     * @param {string} message - Error message
     * @param {string} [code] - Error code
     * @returns {Object} Error response
     */
    createError(message, code = 'AUTH_ERROR') {
        return {
            success: false,
            error: message,
            errorCode: code
        };
    }

    /**
     * Create standardized success response
     * @param {Object} data - Success data
     * @returns {Object} Success response
     */
    createSuccess(data) {
        return {
            success: true,
            ...data
        };
    }
}

/**
 * Personal Access Token authentication strategy
 */
class PersonalTokenStrategy extends AuthStrategy {
    constructor(config) {
        super(config);
        this.tokenValidationEndpoint = config.tokenValidationEndpoint;
        this.tokenValidationMethod = config.tokenValidationMethod || 'GET';
        this.requiredScopes = config.requiredScopes || [];
    }

    async authenticate(params) {
        const { token, skipValidation } = params;
        
        if (!token) {
            return this.createError('Personal access token is required', 'MISSING_TOKEN');
        }

        if (skipValidation) {
            // Skip validation and store token directly
            const credentials = {
                token,
                type: 'pat',
                createdAt: Date.now()
            };
            
            if (params.provider) {
                await this.storeCredentials(params.provider, credentials);
            }
            
            return this.createSuccess({ credentials });
        }

        // Validate token with API
        try {
            const validationResult = await this.validate({ token });
            if (!validationResult.valid) {
                return this.createError(validationResult.error || 'Token validation failed', 'INVALID_TOKEN');
            }

            const credentials = {
                token,
                type: 'pat',
                createdAt: Date.now(),
                userInfo: validationResult.userInfo
            };

            if (params.provider) {
                await this.storeCredentials(params.provider, credentials);
            }

            return this.createSuccess({ credentials, userInfo: validationResult.userInfo });
        } catch (error) {
            return this.createError(`Token validation failed: ${error.message}`, 'VALIDATION_ERROR');
        }
    }

    async validate(credentials) {
        if (!credentials.token) {
            return { valid: false, error: 'No token provided' };
        }

        if (!this.tokenValidationEndpoint) {
            return { valid: false, error: 'No validation endpoint configured' };
        }

        try {
            const response = await fetch(this.tokenValidationEndpoint, {
                method: this.tokenValidationMethod,
                headers: {
                    'Authorization': `Bearer ${credentials.token}`,
                    'Accept': 'application/json',
                    'User-Agent': 'hacka.re/1.0'
                },
                timeout: 10000
            });

            if (!response.ok) {
                if (response.status === 401) {
                    return { valid: false, error: 'Token is invalid or expired' };
                }
                return { valid: false, error: `Validation failed: ${response.status}` };
            }

            const userInfo = await response.json();
            
            // Check scopes if required
            if (this.requiredScopes.length > 0 && userInfo.scopes) {
                const hasRequiredScopes = this.requiredScopes.every(scope => 
                    userInfo.scopes.includes(scope)
                );
                
                if (!hasRequiredScopes) {
                    return { 
                        valid: false, 
                        error: `Missing required scopes: ${this.requiredScopes.join(', ')}` 
                    };
                }
            }

            return { valid: true, userInfo };
        } catch (error) {
            return { valid: false, error: `Validation request failed: ${error.message}` };
        }
    }

    async refresh(credentials) {
        // PATs don't typically expire or have refresh tokens
        return this.createError('Personal access tokens cannot be refreshed', 'NOT_REFRESHABLE');
    }
}

/**
 * OAuth 2.0 Device Flow authentication strategy
 */
class DeviceFlowStrategy extends AuthStrategy {
    constructor(config) {
        super(config);
        this.clientId = config.clientId;
        this.deviceAuthEndpoint = config.deviceAuthEndpoint;
        this.tokenEndpoint = config.tokenEndpoint;
        this.scope = config.scope || config.requiredScopes?.join(' ') || '';
        this.pollInterval = config.pollInterval || 5;
        this.maxPollTime = config.maxPollTime || 300; // 5 minutes
    }

    async authenticate(params) {
        try {
            // Step 1: Get device code
            const deviceCodeResult = await this.requestDeviceCode();
            if (!deviceCodeResult.success) {
                return deviceCodeResult;
            }

            const { device_code, user_code, verification_uri, expires_in } = deviceCodeResult.data;

            // Step 2: Return auth info for user to complete
            if (params.returnAuthInfo) {
                return this.createSuccess({
                    authInfo: {
                        userCode: user_code,
                        verificationUri: verification_uri,
                        deviceCode: device_code,
                        expiresIn: expires_in,
                        pollInterval: this.pollInterval
                    }
                });
            }

            // Step 3: Poll for token (if not returning auth info)
            const tokenResult = await this.pollForToken(device_code, expires_in);
            if (!tokenResult.success) {
                return tokenResult;
            }

            const credentials = {
                token: tokenResult.data.access_token,
                refreshToken: tokenResult.data.refresh_token,
                type: 'oauth',
                createdAt: Date.now(),
                expiresAt: tokenResult.data.expires_in ? 
                    Date.now() + (tokenResult.data.expires_in * 1000) : null
            };

            if (params.provider) {
                await this.storeCredentials(params.provider, credentials);
            }

            return this.createSuccess({ credentials });
        } catch (error) {
            return this.createError(`Device flow authentication failed: ${error.message}`, 'DEVICE_FLOW_ERROR');
        }
    }

    async validate(credentials) {
        if (!credentials.token) {
            return { valid: false, error: 'No access token provided' };
        }

        // Check expiration
        if (this.isExpired(credentials)) {
            return { valid: false, error: 'Token is expired', needsRefresh: !!credentials.refreshToken };
        }

        // TODO: Implement token introspection if endpoint is available
        return { valid: true };
    }

    async refresh(credentials) {
        if (!credentials.refreshToken) {
            return this.createError('No refresh token available', 'NO_REFRESH_TOKEN');
        }

        try {
            const response = await fetch(this.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: credentials.refreshToken,
                    client_id: this.clientId
                })
            });

            if (!response.ok) {
                const error = await response.text();
                return this.createError(`Token refresh failed: ${error}`, 'REFRESH_FAILED');
            }

            const tokenData = await response.json();
            
            const newCredentials = {
                ...credentials,
                token: tokenData.access_token,
                refreshToken: tokenData.refresh_token || credentials.refreshToken,
                expiresAt: tokenData.expires_in ? 
                    Date.now() + (tokenData.expires_in * 1000) : null
            };

            return this.createSuccess({ credentials: newCredentials });
        } catch (error) {
            return this.createError(`Token refresh failed: ${error.message}`, 'REFRESH_ERROR');
        }
    }

    async requestDeviceCode() {
        try {
            const response = await fetch(this.deviceAuthEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    scope: this.scope
                })
            });

            if (!response.ok) {
                const error = await response.text();
                return this.createError(`Device code request failed: ${error}`, 'DEVICE_CODE_ERROR');
            }

            const data = await response.json();
            return this.createSuccess({ data });
        } catch (error) {
            return this.createError(`Device code request failed: ${error.message}`, 'DEVICE_CODE_ERROR');
        }
    }

    async pollForToken(deviceCode, expiresIn) {
        const startTime = Date.now();
        const maxEndTime = startTime + (Math.min(expiresIn, this.maxPollTime) * 1000);

        while (Date.now() < maxEndTime) {
            try {
                const response = await fetch(this.tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                        device_code: deviceCode,
                        client_id: this.clientId
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    return this.createSuccess({ data });
                }

                // Handle OAuth errors
                if (data.error === 'authorization_pending') {
                    // Wait and continue polling
                    await new Promise(resolve => setTimeout(resolve, this.pollInterval * 1000));
                    continue;
                } else if (data.error === 'slow_down') {
                    // Increase polling interval
                    this.pollInterval += 5;
                    await new Promise(resolve => setTimeout(resolve, this.pollInterval * 1000));
                    continue;
                } else if (data.error === 'expired_token') {
                    return this.createError('Device code expired', 'DEVICE_CODE_EXPIRED');
                } else if (data.error === 'access_denied') {
                    return this.createError('User denied authorization', 'ACCESS_DENIED');
                } else {
                    return this.createError(`OAuth error: ${data.error}`, 'OAUTH_ERROR');
                }
            } catch (error) {
                // Wait before retrying on network errors
                await new Promise(resolve => setTimeout(resolve, this.pollInterval * 1000));
            }
        }

        return this.createError('Authentication timed out', 'TIMEOUT');
    }
}

/**
 * API Key authentication strategy
 */
class ApiKeyStrategy extends AuthStrategy {
    constructor(config) {
        super(config);
        this.keyHeader = config.keyHeader || 'X-API-Key';
        this.keyPrefix = config.keyPrefix || '';
        this.validationEndpoint = config.validationEndpoint;
    }

    async authenticate(params) {
        const { apiKey, skipValidation } = params;
        
        if (!apiKey) {
            return this.createError('API key is required', 'MISSING_API_KEY');
        }

        const credentials = {
            apiKey,
            type: 'apikey',
            createdAt: Date.now()
        };

        if (!skipValidation && this.validationEndpoint) {
            try {
                const validationResult = await this.validate(credentials);
                if (!validationResult.valid) {
                    return this.createError(validationResult.error || 'API key validation failed', 'INVALID_API_KEY');
                }
                credentials.userInfo = validationResult.userInfo;
            } catch (error) {
                return this.createError(`API key validation failed: ${error.message}`, 'VALIDATION_ERROR');
            }
        }

        if (params.provider) {
            await this.storeCredentials(params.provider, credentials);
        }

        return this.createSuccess({ credentials });
    }

    async validate(credentials) {
        if (!credentials.apiKey) {
            return { valid: false, error: 'No API key provided' };
        }

        if (!this.validationEndpoint) {
            return { valid: true }; // No validation endpoint, assume valid
        }

        try {
            const headers = {
                'Accept': 'application/json',
                'User-Agent': 'hacka.re/1.0'
            };
            
            headers[this.keyHeader] = this.keyPrefix + credentials.apiKey;

            const response = await fetch(this.validationEndpoint, {
                method: 'GET',
                headers,
                timeout: 10000
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    return { valid: false, error: 'API key is invalid' };
                }
                return { valid: false, error: `Validation failed: ${response.status}` };
            }

            const userInfo = await response.json();
            return { valid: true, userInfo };
        } catch (error) {
            return { valid: false, error: `Validation request failed: ${error.message}` };
        }
    }

    async refresh(credentials) {
        // API keys don't typically refresh
        return this.createError('API keys cannot be refreshed', 'NOT_REFRESHABLE');
    }
}

/**
 * Strategy factory for creating appropriate auth strategies
 */
class AuthStrategyFactory {
    static createStrategy(type, config) {
        switch (type.toLowerCase()) {
            case 'pat':
            case 'personal_token':
                return new PersonalTokenStrategy(config);
                
            case 'oauth':
            case 'device_flow':
                return new DeviceFlowStrategy(config);
                
            case 'apikey':
            case 'api_key':
                return new ApiKeyStrategy(config);
                
            default:
                throw new Error(`Unknown authentication strategy: ${type}`);
        }
    }

    static getSupportedStrategies() {
        return ['pat', 'oauth', 'apikey'];
    }
}

    // Return public API
    return {
        AuthStrategy,
        PersonalTokenStrategy,
        DeviceFlowStrategy,
        ApiKeyStrategy,
        AuthStrategyFactory
    };
})();