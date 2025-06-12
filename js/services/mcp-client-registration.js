/**
 * MCP Dynamic Client Registration Service
 * 
 * Implements OAuth 2.0 Dynamic Client Registration Protocol (RFC 7591)
 * for automatic client registration with MCP servers. Provides seamless
 * client credential management without manual intervention.
 * 
 * Features:
 * - OAuth 2.0 Dynamic Client Registration (RFC 7591)
 * - Automatic client credential generation
 * - Secure credential storage using TweetNaCl
 * - Registration response validation
 * - Client configuration management
 */

/**
 * Client registration error class
 */
class MCPClientRegistrationError extends Error {
    constructor(message, code = null, response = null) {
        super(message);
        this.name = 'MCPClientRegistrationError';
        this.code = code;
        this.response = response;
    }
}

/**
 * Dynamic Client Registration Service
 */
class ClientRegistrationService {
    constructor() {
        this.storageService = window.CoreStorageService || window.StorageService;
        this.cryptoUtils = window.CryptoUtils;
        this.registrationCache = new Map();
    }

    /**
     * Register a client with an MCP server
     * @param {string} serverName - Unique server identifier
     * @param {string} registrationEndpoint - Registration endpoint URL
     * @param {Object} options - Registration options
     * @returns {Promise<Object>} Client credentials and metadata
     */
    async registerClient(serverName, registrationEndpoint, options = {}) {
        try {
            console.log(`[MCP Registration] Registering client for server: ${serverName}`);

            // Check if already registered
            const existingCredentials = await this._getStoredCredentials(serverName);
            if (existingCredentials && !options.forceRegistration) {
                console.log('[MCP Registration] Using existing client credentials');
                return existingCredentials;
            }

            // Prepare registration request
            const registrationRequest = this._buildRegistrationRequest(serverName, options);
            
            console.log('[MCP Registration] Sending registration request');
            const response = await fetch(registrationEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(registrationRequest)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new MCPClientRegistrationError(
                    `Registration failed: ${response.status} ${response.statusText}`,
                    errorData.error || 'registration_failed',
                    errorData
                );
            }

            const registrationResponse = await response.json();
            console.log('[MCP Registration] Registration successful');

            // Process and validate response
            const clientCredentials = this._processRegistrationResponse(
                registrationResponse, 
                serverName, 
                registrationRequest
            );

            // Store credentials securely
            await this._storeCredentials(serverName, clientCredentials);

            // Cache for immediate use
            this.registrationCache.set(serverName, clientCredentials);

            return clientCredentials;

        } catch (error) {
            if (error instanceof MCPClientRegistrationError) {
                throw error;
            }
            throw new MCPClientRegistrationError(
                `Client registration failed: ${error.message}`,
                'registration_error'
            );
        }
    }

    /**
     * Build OAuth 2.0 dynamic client registration request
     * @param {string} serverName - Server identifier
     * @param {Object} options - Registration options
     * @returns {Object} Registration request payload
     */
    _buildRegistrationRequest(serverName, options) {
        // Generate redirect URIs for different scenarios
        const redirectUris = this._generateRedirectUris(options.customRedirectUri);

        const request = {
            // Required fields
            client_name: options.clientName || `hacka.re MCP Client (${serverName})`,
            redirect_uris: redirectUris,
            
            // OAuth 2.1 compliance
            grant_types: ['authorization_code'],
            response_types: ['code'],
            token_endpoint_auth_method: 'none', // Public client
            
            // PKCE support (OAuth 2.1 requirement)
            code_challenge_method: 'S256',
            
            // Client metadata
            client_uri: options.clientUri || 'https://hacka.re',
            logo_uri: options.logoUri || 'https://hacka.re/favicon.ico',
            policy_uri: options.policyUri,
            tos_uri: options.tosUri,
            
            // Application type
            application_type: 'web',
            
            // Requested scopes
            scope: options.scope || '',
            
            // Additional metadata
            software_id: 'hacka.re-mcp-client',
            software_version: '1.0.0',
            
            // MCP-specific metadata
            mcp_client: true,
            mcp_server_name: serverName
        };

        // Add optional fields if provided
        if (options.contacts && Array.isArray(options.contacts)) {
            request.contacts = options.contacts;
        }

        if (options.jwks_uri) {
            request.jwks_uri = options.jwks_uri;
        }

        // Remove undefined values
        Object.keys(request).forEach(key => {
            if (request[key] === undefined) {
                delete request[key];
            }
        });

        return request;
    }

    /**
     * Generate appropriate redirect URIs
     * @param {string} customRedirectUri - Custom redirect URI
     * @returns {Array<string>} Array of redirect URIs
     */
    _generateRedirectUris(customRedirectUri) {
        const uris = [];

        // Custom URI first if provided
        if (customRedirectUri) {
            uris.push(customRedirectUri);
        }

        // Current origin
        if (typeof window !== 'undefined') {
            uris.push(`${window.location.origin}/oauth/callback`);
            uris.push(`${window.location.origin}`);
        }

        // Localhost variations for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const port = window.location.port;
            uris.push(`http://localhost:${port || '8000'}/oauth/callback`);
            uris.push(`http://127.0.0.1:${port || '8000'}/oauth/callback`);
        }

        // Remove duplicates
        return [...new Set(uris)];
    }

    /**
     * Process and validate registration response
     * @param {Object} response - Registration response from server
     * @param {string} serverName - Server identifier
     * @param {Object} request - Original request
     * @returns {Object} Processed client credentials
     */
    _processRegistrationResponse(response, serverName, request) {
        // Validate required fields
        if (!response.client_id) {
            throw new MCPClientRegistrationError(
                'Registration response missing client_id',
                'invalid_response'
            );
        }

        // OAuth 2.0 Dynamic Client Registration response fields
        const credentials = {
            // Required fields
            client_id: response.client_id,
            client_secret: response.client_secret || null, // Optional for public clients
            
            // Registration metadata
            client_id_issued_at: response.client_id_issued_at || Math.floor(Date.now() / 1000),
            client_secret_expires_at: response.client_secret_expires_at || 0,
            
            // Application configuration
            redirect_uris: response.redirect_uris || request.redirect_uris,
            grant_types: response.grant_types || request.grant_types,
            response_types: response.response_types || request.response_types,
            scope: response.scope || request.scope,
            
            // Authentication
            token_endpoint_auth_method: response.token_endpoint_auth_method || request.token_endpoint_auth_method,
            
            // Client information
            client_name: response.client_name || request.client_name,
            client_uri: response.client_uri || request.client_uri,
            logo_uri: response.logo_uri || request.logo_uri,
            
            // Registration management
            registration_access_token: response.registration_access_token,
            registration_client_uri: response.registration_client_uri,
            
            // Internal metadata
            server_name: serverName,
            registered_at: Date.now(),
            _original_request: request,
            _original_response: response
        };

        // Validate client type consistency
        if (credentials.client_secret && credentials.token_endpoint_auth_method === 'none') {
            console.warn('[MCP Registration] Inconsistent client type: secret provided but auth method is none');
        }

        // Validate redirect URIs
        if (!credentials.redirect_uris || credentials.redirect_uris.length === 0) {
            throw new MCPClientRegistrationError(
                'No redirect URIs in registration response',
                'invalid_response'
            );
        }

        console.log('[MCP Registration] Client registration processed successfully');
        return credentials;
    }

    /**
     * Store client credentials securely
     * @param {string} serverName - Server identifier
     * @param {Object} credentials - Client credentials to store
     */
    async _storeCredentials(serverName, credentials) {
        if (!this.storageService) {
            throw new MCPClientRegistrationError('Storage service not available', 'storage_error');
        }

        const storageKey = `mcp_client_credentials_${serverName}`;
        
        try {
            this.storageService.setValue(storageKey, credentials);
            console.log(`[MCP Registration] Credentials stored for server: ${serverName}`);
        } catch (error) {
            throw new MCPClientRegistrationError(
                `Failed to store credentials: ${error.message}`,
                'storage_error'
            );
        }
    }

    /**
     * Retrieve stored client credentials
     * @param {string} serverName - Server identifier
     * @returns {Promise<Object|null>} Stored credentials or null
     */
    async _getStoredCredentials(serverName) {
        if (!this.storageService) {
            return null;
        }

        // Check cache first
        if (this.registrationCache.has(serverName)) {
            return this.registrationCache.get(serverName);
        }

        const storageKey = `mcp_client_credentials_${serverName}`;
        
        try {
            const credentials = this.storageService.getValue(storageKey);
            if (credentials) {
                // Validate credentials are still valid
                if (this._areCredentialsValid(credentials)) {
                    this.registrationCache.set(serverName, credentials);
                    return credentials;
                } else {
                    console.log(`[MCP Registration] Stored credentials for ${serverName} are expired`);
                    await this._removeStoredCredentials(serverName);
                    return null;
                }
            }
            return null;
        } catch (error) {
            console.error(`[MCP Registration] Failed to retrieve credentials: ${error.message}`);
            return null;
        }
    }

    /**
     * Check if stored credentials are still valid
     * @param {Object} credentials - Credentials to validate
     * @returns {boolean} True if credentials are valid
     */
    _areCredentialsValid(credentials) {
        // Check client secret expiration
        if (credentials.client_secret_expires_at > 0) {
            const expiresAt = credentials.client_secret_expires_at * 1000; // Convert to milliseconds
            if (Date.now() >= expiresAt) {
                return false;
            }
        }

        // Check if credentials are reasonably recent (avoid very old registrations)
        const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
        if (credentials.registered_at && (Date.now() - credentials.registered_at) > maxAge) {
            return false;
        }

        return true;
    }

    /**
     * Remove stored credentials
     * @param {string} serverName - Server identifier
     */
    async _removeStoredCredentials(serverName) {
        if (!this.storageService) {
            return;
        }

        const storageKey = `mcp_client_credentials_${serverName}`;
        
        try {
            this.storageService.removeValue(storageKey);
            this.registrationCache.delete(serverName);
            console.log(`[MCP Registration] Removed credentials for server: ${serverName}`);
        } catch (error) {
            console.error(`[MCP Registration] Failed to remove credentials: ${error.message}`);
        }
    }

    /**
     * Get client credentials for a server
     * @param {string} serverName - Server identifier
     * @returns {Promise<Object|null>} Client credentials or null
     */
    async getClientCredentials(serverName) {
        return await this._getStoredCredentials(serverName);
    }

    /**
     * Update client registration
     * @param {string} serverName - Server identifier
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated credentials
     */
    async updateClientRegistration(serverName, updates) {
        const credentials = await this._getStoredCredentials(serverName);
        if (!credentials) {
            throw new MCPClientRegistrationError(
                'No registered client found for server',
                'no_registration'
            );
        }

        if (!credentials.registration_client_uri || !credentials.registration_access_token) {
            throw new MCPClientRegistrationError(
                'Client registration management not supported by server',
                'management_not_supported'
            );
        }

        try {
            const response = await fetch(credentials.registration_client_uri, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${credentials.registration_access_token}`
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new MCPClientRegistrationError(
                    `Update failed: ${response.status} ${response.statusText}`,
                    errorData.error || 'update_failed'
                );
            }

            const updatedResponse = await response.json();
            const updatedCredentials = this._processRegistrationResponse(
                updatedResponse,
                serverName,
                updates
            );

            await this._storeCredentials(serverName, updatedCredentials);
            return updatedCredentials;

        } catch (error) {
            if (error instanceof MCPClientRegistrationError) {
                throw error;
            }
            throw new MCPClientRegistrationError(
                `Client update failed: ${error.message}`,
                'update_error'
            );
        }
    }

    /**
     * Delete client registration
     * @param {string} serverName - Server identifier
     * @returns {Promise<void>}
     */
    async deleteClientRegistration(serverName) {
        const credentials = await this._getStoredCredentials(serverName);
        if (!credentials) {
            console.log(`[MCP Registration] No registration found for ${serverName}`);
            return;
        }

        // If server supports management, delete remotely
        if (credentials.registration_client_uri && credentials.registration_access_token) {
            try {
                await fetch(credentials.registration_client_uri, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${credentials.registration_access_token}`
                    }
                });
                console.log(`[MCP Registration] Deleted remote registration for ${serverName}`);
            } catch (error) {
                console.warn(`[MCP Registration] Failed to delete remote registration: ${error.message}`);
            }
        }

        // Always remove local credentials
        await this._removeStoredCredentials(serverName);
    }

    /**
     * List all registered clients
     * @returns {Promise<Array<Object>>} Array of client information
     */
    async listRegisteredClients() {
        if (!this.storageService) {
            return [];
        }

        try {
            // Get all keys from localStorage and filter for our credential keys
            const allKeys = Object.keys(localStorage);
            const credentialKeys = allKeys.filter(key => 
                key.includes('mcp_client_credentials_') && 
                !key.startsWith('ns_')  // Skip namespaced keys for now
            );
            
            const clients = [];
            for (const key of credentialKeys) {
                const serverName = key.replace('mcp_client_credentials_', '');
                const credentials = await this._getStoredCredentials(serverName);
                if (credentials) {
                    clients.push({
                        serverName: serverName,
                        clientId: credentials.client_id,
                        clientName: credentials.client_name,
                        registeredAt: credentials.registered_at,
                        expiresAt: credentials.client_secret_expires_at,
                        hasSecret: !!credentials.client_secret,
                        manageable: !!(credentials.registration_client_uri && credentials.registration_access_token)
                    });
                }
            }

            return clients;
        } catch (error) {
            console.error(`[MCP Registration] Failed to list clients: ${error.message}`);
            return [];
        }
    }

    /**
     * Clear registration cache
     */
    clearCache() {
        this.registrationCache.clear();
    }
}

// Export the service
window.MCPClientRegistration = {
    ClientRegistrationService,
    MCPClientRegistrationError
};