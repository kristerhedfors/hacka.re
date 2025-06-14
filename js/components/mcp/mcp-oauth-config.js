/**
 * MCP OAuth Configuration Component for hacka.re
 * 
 * Provides UI for configuring OAuth providers, managing client credentials,
 * and building authorization URLs for MCP server connections.
 * 
 * Features:
 * - Provider selection (GitHub, Google, custom)
 * - Client ID and redirect URI management
 * - Scope configuration
 * - Authorization URL preview
 * - Secure credential storage
 */

class MCPOAuthConfig {
    constructor() {
        this.storageService = window.CoreStorageService;
        this.oauthService = null;
        this.currentConfig = null;
        this.STORAGE_KEY = 'mcp-oauth-configs';
        this.configs = new Map();
        
        // Check if storage service is available before initializing
        if (this.storageService) {
            this.initializeService();
        } else {
            console.warn('[MCP OAuth Config] Storage service not available, deferring initialization');
            // Try again after a short delay
            setTimeout(() => {
                this.storageService = window.CoreStorageService;
                if (this.storageService) {
                    this.initializeService();
                }
            }, 100);
        }
    }

    async initializeService() {
        // Initialize OAuth service
        if (window.MCPOAuthService) {
            this.oauthService = new window.MCPOAuthService.OAuthService();
        }
        
        // Initialize metadata discovery service
        if (window.MCPMetadataDiscovery) {
            this.metadataService = new window.MCPMetadataDiscovery.MetadataDiscoveryService();
        }
        
        // Initialize client registration service
        if (window.MCPClientRegistration) {
            this.registrationService = new window.MCPClientRegistration.ClientRegistrationService();
        }
        
        // Load saved configurations
        await this.loadConfigs();
    }

    /**
     * Load OAuth configurations from storage
     */
    async loadConfigs() {
        if (!this.storageService) {
            console.warn('[MCP OAuth Config] Storage service not available, skipping config loading');
            return;
        }
        
        try {
            const savedConfigs = await this.storageService.getValue(this.STORAGE_KEY);
            if (savedConfigs && typeof savedConfigs === 'object') {
                Object.entries(savedConfigs).forEach(([serverName, config]) => {
                    this.configs.set(serverName, config);
                });
            }
        } catch (error) {
            console.error('[MCP OAuth Config] Failed to load configurations:', error);
        }
    }

    /**
     * Save OAuth configurations to storage
     */
    async saveConfigs() {
        if (!this.storageService) {
            console.warn('[MCP OAuth Config] Storage service not available, skipping config saving');
            return;
        }
        
        try {
            const configsObj = {};
            this.configs.forEach((config, serverName) => {
                configsObj[serverName] = config;
            });
            await this.storageService.setValue(this.STORAGE_KEY, configsObj);
        } catch (error) {
            console.error('[MCP OAuth Config] Failed to save configurations:', error);
        }
    }

    /**
     * Generate default redirect URI for the current environment
     * @returns {string} Default redirect URI
     */
    generateDefaultRedirectUri() {
        // For production, always use https://hacka.re
        if (window.location.hostname === 'hacka.re') {
            return 'https://hacka.re';
        }
        
        // For local development, use the current origin
        return window.location.origin;
    }

    /**
     * Create OAuth configuration UI
     * @param {HTMLElement} container - Container element
     * @param {string} serverName - Server name for configuration
     */
    createConfigUI(container, serverName) {
        const existingConfig = this.configs.get(serverName) || {};
        
        const configHTML = `
            <div class="mcp-oauth-config">
                <h4>OAuth Configuration</h4>
                
                <div class="oauth-provider-selection">
                    <label>Provider:</label>
                    <select id="oauth-provider-select" class="mcp-select">
                        <option value="github">GitHub</option>
                        <option value="google">Google</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                <div class="oauth-config-fields">
                    <div class="mcp-form-group">
                        <label for="oauth-client-id">Client ID:</label>
                        <input type="text" id="oauth-client-id" class="mcp-input" 
                               placeholder="Enter OAuth client ID" 
                               value="${existingConfig.clientId || ''}">
                    </div>

                    <div class="mcp-form-group">
                        <label for="oauth-client-secret">Client Secret (optional):</label>
                        <input type="password" id="oauth-client-secret" class="mcp-input" 
                               placeholder="For confidential clients only"
                               value="${existingConfig.clientSecret || ''}">
                        <small>Note: Client secrets should only be used in secure server environments</small>
                    </div>

                    <div class="mcp-form-group">
                        <label for="oauth-redirect-uri">Redirect URI:</label>
                        <input type="text" id="oauth-redirect-uri" class="mcp-input" 
                               placeholder="e.g., https://hacka.re" 
                               value="${existingConfig.redirectUri || this.generateDefaultRedirectUri()}">
                        <small>
                            <strong>For GitHub OAuth Apps:</strong><br>
                            • Homepage URL: <code>https://hacka.re</code><br>
                            • Authorization callback URL: <code>https://hacka.re</code><br>
                            <em>Note: GitHub uses Device Flow (no redirect required)</em>
                        </small>
                    </div>

                    <div class="mcp-form-group custom-only" style="display: none;">
                        <label for="oauth-auth-url">Authorization URL:</label>
                        <input type="text" id="oauth-auth-url" class="mcp-input" 
                               placeholder="https://provider.com/oauth/authorize"
                               value="${existingConfig.authorizationUrl || ''}">
                    </div>

                    <div class="mcp-form-group custom-only" style="display: none;">
                        <label for="oauth-token-url">Token URL:</label>
                        <input type="text" id="oauth-token-url" class="mcp-input" 
                               placeholder="https://provider.com/oauth/token"
                               value="${existingConfig.tokenUrl || ''}">
                    </div>

                    <div class="mcp-form-group">
                        <label for="oauth-scope">Scope:</label>
                        <input type="text" id="oauth-scope" class="mcp-input" 
                               placeholder="Space-separated scopes (e.g., read:user repo)"
                               value="${existingConfig.scope || ''}">
                    </div>

                    <div class="mcp-form-group">
                        <label for="oauth-additional-params">Additional Parameters (JSON):</label>
                        <textarea id="oauth-additional-params" class="mcp-input" rows="3" 
                                  placeholder='{"prompt": "consent", "access_type": "offline"}'>${existingConfig.additionalParams ? JSON.stringify(existingConfig.additionalParams, null, 2) : ''}</textarea>
                    </div>
                </div>

                <div class="oauth-preview-section">
                    <h5>Authorization URL Preview:</h5>
                    <div class="oauth-url-preview">
                        <code id="oauth-url-preview-text">Configure settings above to generate URL</code>
                        <button class="copy-button" onclick="this.parentElement.querySelector('code').select(); document.execCommand('copy');">
                            Copy
                        </button>
                    </div>
                </div>

                <div class="oauth-actions">
                    <button class="secondary-button" onclick="window.mcpOAuthConfig.testConfiguration('${serverName}')">
                        Test Configuration
                    </button>
                    <button class="primary-button" onclick="window.mcpOAuthConfig.saveConfiguration('${serverName}')">
                        Save Configuration
                    </button>
                </div>

                <div class="oauth-status" id="oauth-status-${serverName}" style="display: none;">
                    <div class="status-message"></div>
                </div>
            </div>
        `;

        container.innerHTML = configHTML;
        
        // Set up event listeners
        this.setupEventListeners(container, serverName);
        
        // Load existing provider if configured
        if (existingConfig.provider) {
            container.querySelector('#oauth-provider-select').value = existingConfig.provider;
            this.updateProviderFields(container, existingConfig.provider);
        }
        
        // Update preview
        this.updateAuthUrlPreview(container);
    }

    /**
     * Set up event listeners for the configuration UI
     * @param {HTMLElement} container - Container element
     * @param {string} serverName - Server name
     */
    setupEventListeners(container, serverName) {
        // Provider selection
        const providerSelect = container.querySelector('#oauth-provider-select');
        providerSelect.addEventListener('change', (e) => {
            this.updateProviderFields(container, e.target.value);
            this.updateAuthUrlPreview(container);
        });

        // Update preview on input changes
        const inputs = container.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateAuthUrlPreview(container);
            });
        });
    }

    /**
     * Update fields based on selected provider
     * @param {HTMLElement} container - Container element
     * @param {string} provider - Selected provider
     */
    updateProviderFields(container, provider) {
        const customFields = container.querySelectorAll('.custom-only');
        const scopeInput = container.querySelector('#oauth-scope');
        
        if (provider === 'custom') {
            customFields.forEach(field => field.style.display = 'block');
        } else {
            customFields.forEach(field => field.style.display = 'none');
            
            // Set default values for known providers
            const providerConfig = window.MCPOAuthService.OAUTH_PROVIDERS[provider];
            if (providerConfig && !scopeInput.value) {
                scopeInput.value = providerConfig.scope;
            }
        }
    }

    /**
     * Update authorization URL preview
     * @param {HTMLElement} container - Container element
     */
    updateAuthUrlPreview(container) {
        const preview = container.querySelector('#oauth-url-preview-text');
        
        try {
            const config = this.buildConfiguration(container);
            if (!config.clientId || !config.redirectUri) {
                preview.textContent = 'Configure Client ID and Redirect URI to generate URL';
                return;
            }

            // Build preview URL
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: config.clientId,
                redirect_uri: config.redirectUri,
                scope: config.scope || '',
                state: 'preview_state',
                code_challenge: 'preview_challenge',
                code_challenge_method: 'S256'
            });

            if (config.additionalParams) {
                Object.entries(config.additionalParams).forEach(([key, value]) => {
                    params.set(key, value);
                });
            }

            const authUrl = `${config.authorizationUrl}?${params.toString()}`;
            preview.textContent = authUrl;
        } catch (error) {
            preview.textContent = 'Invalid configuration';
        }
    }

    /**
     * Build configuration from form inputs
     * @param {HTMLElement} container - Container element
     * @returns {Object} OAuth configuration
     */
    buildConfiguration(container) {
        const provider = container.querySelector('#oauth-provider-select').value;
        const config = {
            provider: provider,
            clientId: container.querySelector('#oauth-client-id').value.trim(),
            clientSecret: container.querySelector('#oauth-client-secret').value.trim(),
            redirectUri: container.querySelector('#oauth-redirect-uri').value.trim(),
            scope: container.querySelector('#oauth-scope').value.trim()
        };

        // Get provider-specific URLs
        if (provider === 'custom') {
            config.authorizationUrl = container.querySelector('#oauth-auth-url').value.trim();
            config.tokenUrl = container.querySelector('#oauth-token-url').value.trim();
        } else {
            const providerConfig = window.MCPOAuthService.OAUTH_PROVIDERS[provider];
            config.authorizationUrl = providerConfig.authorizationUrl;
            config.tokenUrl = providerConfig.tokenUrl;
            config.responseType = providerConfig.responseType;
            config.grantType = providerConfig.grantType;
            
            // Copy device flow specific properties
            if (providerConfig.useDeviceFlow) {
                config.useDeviceFlow = providerConfig.useDeviceFlow;
                config.deviceCodeUrl = providerConfig.deviceCodeUrl;
            }
        }

        // Parse additional parameters
        const additionalParamsText = container.querySelector('#oauth-additional-params').value.trim();
        if (additionalParamsText) {
            try {
                config.additionalParams = JSON.parse(additionalParamsText);
            } catch (error) {
                console.warn('[MCP OAuth Config] Invalid additional parameters JSON');
            }
        }

        return config;
    }

    /**
     * Save OAuth configuration
     * @param {string} serverName - Server name
     */
    async saveConfiguration(serverName) {
        const container = document.querySelector('.mcp-oauth-config');
        const statusDiv = container.querySelector(`#oauth-status-${serverName}`);
        const statusMessage = statusDiv.querySelector('.status-message');
        
        try {
            const config = this.buildConfiguration(container);
            
            // Validate required fields
            if (!config.clientId) {
                throw new Error('Client ID is required');
            }
            if (!config.redirectUri) {
                throw new Error('Redirect URI is required');
            }
            if (config.provider === 'custom' && (!config.authorizationUrl || !config.tokenUrl)) {
                throw new Error('Authorization URL and Token URL are required for custom providers');
            }

            // Save configuration
            this.configs.set(serverName, config);
            await this.saveConfigs();
            
            // Update OAuth service configuration
            if (this.oauthService) {
                // Store config in OAuth service (this would be extended in the service)
                this.oauthService.serverConfigs = this.oauthService.serverConfigs || new Map();
                this.oauthService.serverConfigs.set(serverName, config);
            }
            
            // Show success message
            statusDiv.style.display = 'block';
            statusDiv.className = 'oauth-status success';
            statusMessage.textContent = 'Configuration saved successfully';
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        } catch (error) {
            // Show error message
            statusDiv.style.display = 'block';
            statusDiv.className = 'oauth-status error';
            statusMessage.textContent = `Error: ${error.message}`;
        }
    }

    /**
     * Test OAuth configuration
     * @param {string} serverName - Server name
     */
    async testConfiguration(serverName) {
        const container = document.querySelector('.mcp-oauth-config');
        const statusDiv = container.querySelector(`#oauth-status-${serverName}`);
        const statusMessage = statusDiv.querySelector('.status-message');
        
        try {
            const config = this.buildConfiguration(container);
            
            // Show testing message
            statusDiv.style.display = 'block';
            statusDiv.className = 'oauth-status info';
            statusMessage.textContent = 'Testing configuration...';
            
            // Save config temporarily for testing
            if (this.oauthService) {
                this.oauthService.serverConfigs = this.oauthService.serverConfigs || new Map();
                this.oauthService.serverConfigs.set(serverName, config);
                
                // Start authorization flow
                const flowResult = await this.oauthService.startAuthorizationFlow(serverName, config);
                
                // Show authorization URL
                statusDiv.className = 'oauth-status success';
                statusMessage.innerHTML = `
                    Ready to authorize! 
                    <a href="${flowResult.authorizationUrl}" target="_blank" 
                       onclick="window.mcpOAuthConfig.handleAuthWindow(event, '${serverName}', '${flowResult.state}')">
                        Click here to authorize
                    </a>
                `;
            }
        } catch (error) {
            statusDiv.style.display = 'block';
            statusDiv.className = 'oauth-status error';
            statusMessage.textContent = `Test failed: ${error.message}`;
        }
    }

    /**
     * Handle authorization window
     * @param {Event} event - Click event
     * @param {string} serverName - Server name
     * @param {string} state - OAuth state parameter
     */
    handleAuthWindow(event, serverName, state) {
        event.preventDefault();
        
        const authUrl = event.target.href;
        const authWindow = window.open(authUrl, 'oauth_authorize', 'width=600,height=700');
        
        // Monitor for redirect
        const checkInterval = setInterval(() => {
            try {
                if (authWindow.closed) {
                    clearInterval(checkInterval);
                    return;
                }
                
                // Check if redirected to callback URL
                const currentUrl = authWindow.location.href;
                if (currentUrl.includes('/oauth/callback')) {
                    // Extract code and state
                    authWindow.close();
                    clearInterval(checkInterval);
                    
                    // Handle the redirect
                    this.handleOAuthCallback(currentUrl, serverName);
                }
            } catch (e) {
                // Cross-origin error is expected until redirect
            }
        }, 500);
    }

    /**
     * Handle OAuth callback
     * @param {string} callbackUrl - Callback URL with parameters
     * @param {string} serverName - Server name
     */
    async handleOAuthCallback(callbackUrl, serverName) {
        const statusDiv = document.querySelector(`#oauth-status-${serverName}`);
        const statusMessage = statusDiv.querySelector('.status-message');
        
        try {
            if (this.oauthService) {
                const result = await this.oauthService.handleRedirect(callbackUrl);
                
                statusDiv.className = 'oauth-status success';
                statusMessage.textContent = 'Authorization successful! Token obtained.';
                
                // Trigger UI update if callback is provided
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(serverName);
                }
            }
        } catch (error) {
            statusDiv.className = 'oauth-status error';
            statusMessage.textContent = `Authorization failed: ${error.message}`;
        }
    }

    /**
     * Get configuration for a server
     * @param {string} serverName - Server name
     * @returns {Object|null} Configuration or null
     */
    getConfiguration(serverName) {
        return this.configs.get(serverName) || null;
    }

    /**
     * Check if server has OAuth configuration
     * @param {string} serverName - Server name
     * @returns {boolean} True if configured
     */
    hasConfiguration(serverName) {
        return this.configs.has(serverName);
    }

    /**
     * Discover OAuth metadata for MCP server URL
     * @param {string} mcpServerUrl - MCP server URL
     * @param {string} protocolVersion - MCP protocol version
     * @returns {Promise<Object>} Discovered metadata
     */
    async discoverMetadata(mcpServerUrl, protocolVersion = '2024-11-05') {
        if (!this.metadataService) {
            throw new Error('Metadata discovery service not available');
        }

        try {
            const metadata = await this.metadataService.discoverMetadata(mcpServerUrl, protocolVersion);
            
            // Update UI to show discovery results
            this.displayMetadataDiscoveryResults(mcpServerUrl, metadata);
            
            return metadata;
        } catch (error) {
            console.error('[MCP OAuth Config] Metadata discovery failed:', error);
            this.displayMetadataDiscoveryError(mcpServerUrl, error.message);
            throw error;
        }
    }

    /**
     * Display metadata discovery results in UI
     * @param {string} mcpServerUrl - MCP server URL
     * @param {Object} metadata - Discovered metadata
     */
    displayMetadataDiscoveryResults(mcpServerUrl, metadata) {
        const discoverySection = document.getElementById('oauth-metadata-discovery');
        if (!discoverySection) return;

        discoverySection.innerHTML = `
            <div class="discovery-success">
                <h4>🔍 OAuth Metadata Discovered</h4>
                <div class="metadata-details">
                    <div class="metadata-item">
                        <strong>Authorization Endpoint:</strong> 
                        <span class="endpoint-url">${metadata.authorization_endpoint}</span>
                    </div>
                    <div class="metadata-item">
                        <strong>Token Endpoint:</strong> 
                        <span class="endpoint-url">${metadata.token_endpoint}</span>
                    </div>
                    ${metadata.registration_endpoint ? `
                        <div class="metadata-item">
                            <strong>Registration Endpoint:</strong> 
                            <span class="endpoint-url">${metadata.registration_endpoint}</span>
                        </div>
                    ` : ''}
                    <div class="metadata-item">
                        <strong>PKCE Support:</strong> 
                        <span class="feature-indicator ${metadata.code_challenge_methods_supported.includes('S256') ? 'supported' : 'not-supported'}">
                            ${metadata.code_challenge_methods_supported.includes('S256') ? '✓ S256' : '✗ Not supported'}
                        </span>
                    </div>
                    <div class="metadata-item">
                        <strong>Discovery Status:</strong> 
                        <span class="feature-indicator ${metadata._discovered ? 'discovered' : 'fallback'}">
                            ${metadata._discovered ? '✓ Discovered' : '⚠ Fallback endpoints'}
                        </span>
                    </div>
                </div>
                <button type="button" class="btn secondary-btn" onclick="mcpOAuthConfig.validateCompliance('${mcpServerUrl}')">
                    Check OAuth 2.1 Compliance
                </button>
            </div>
        `;
    }

    /**
     * Display metadata discovery error
     * @param {string} mcpServerUrl - MCP server URL
     * @param {string} errorMessage - Error message
     */
    displayMetadataDiscoveryError(mcpServerUrl, errorMessage) {
        const discoverySection = document.getElementById('oauth-metadata-discovery');
        if (!discoverySection) return;

        discoverySection.innerHTML = `
            <div class="discovery-error">
                <h4>❌ Metadata Discovery Failed</h4>
                <p class="error-message">${errorMessage}</p>
                <p class="fallback-note">Using default OAuth endpoints. Manual configuration may be required.</p>
                <button type="button" class="btn secondary-btn" onclick="mcpOAuthConfig.retryDiscovery('${mcpServerUrl}')">
                    Retry Discovery
                </button>
            </div>
        `;
    }

    /**
     * Validate OAuth 2.1 compliance for discovered metadata
     * @param {string} mcpServerUrl - MCP server URL
     */
    async validateCompliance(mcpServerUrl) {
        if (!this.metadataService) {
            console.warn('Metadata service not available for compliance check');
            return;
        }

        try {
            // First get the metadata
            const metadata = await this.metadataService.discoverMetadata(mcpServerUrl);
            const compliance = this.metadataService.validateOAuth21Compatibility(metadata);
            
            this.displayComplianceResults(compliance);
        } catch (error) {
            console.error('Compliance validation failed:', error);
        }
    }

    /**
     * Display OAuth 2.1 compliance results
     * @param {Object} compliance - Compliance report
     */
    displayComplianceResults(compliance) {
        const complianceSection = document.getElementById('oauth-compliance-results') || 
            this.createComplianceResultsSection();

        const statusClass = compliance.compatible ? 'compliant' : 'non-compliant';
        const statusIcon = compliance.compatible ? '✅' : '❌';
        
        complianceSection.innerHTML = `
            <div class="compliance-report ${statusClass}">
                <h4>${statusIcon} OAuth 2.1 Compliance Report</h4>
                <div class="compliance-score">
                    <strong>Compatibility Score: ${compliance.score}%</strong>
                </div>
                
                ${compliance.issues.length > 0 ? `
                    <div class="compliance-issues">
                        <h5>❌ Issues:</h5>
                        <ul>
                            ${compliance.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${compliance.warnings.length > 0 ? `
                    <div class="compliance-warnings">
                        <h5>⚠️ Warnings:</h5>
                        <ul>
                            ${compliance.warnings.map(warning => `<li>${warning}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${compliance.compatible ? `
                    <div class="compliance-success">
                        <p>✅ This server is fully compatible with OAuth 2.1 specifications.</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Create compliance results section if it doesn't exist
     * @returns {HTMLElement} Compliance results section
     */
    createComplianceResultsSection() {
        const container = document.getElementById('oauth-metadata-discovery');
        if (!container) return null;

        const section = document.createElement('div');
        section.id = 'oauth-compliance-results';
        section.className = 'compliance-results-section';
        container.appendChild(section);
        
        return section;
    }

    /**
     * Retry metadata discovery
     * @param {string} mcpServerUrl - MCP server URL
     */
    async retryDiscovery(mcpServerUrl) {
        const discoverySection = document.getElementById('oauth-metadata-discovery');
        if (!discoverySection) return;

        discoverySection.innerHTML = `
            <div class="discovery-loading">
                <h4>🔍 Discovering OAuth Metadata...</h4>
                <div class="loading-spinner"></div>
                <p>Attempting to discover OAuth server endpoints...</p>
            </div>
        `;

        try {
            await this.discoverMetadata(mcpServerUrl);
        } catch (error) {
            // Error handling is done in discoverMetadata method
        }
    }

    /**
     * Auto-configure from discovered metadata
     * @param {string} serverName - Server name
     * @param {string} mcpServerUrl - MCP server URL
     * @returns {Promise<Object>} Configuration object
     */
    async autoConfigureFromMetadata(serverName, mcpServerUrl) {
        try {
            const metadata = await this.discoverMetadata(mcpServerUrl);
            
            const autoConfig = {
                provider: 'custom',
                authorizationUrl: metadata.authorization_endpoint,
                tokenUrl: metadata.token_endpoint,
                scope: '', // Will be filled by user
                clientId: '', // Will be filled by user or registration
                clientSecret: '', // Optional
                redirectUri: `${window.location.origin}`,
                mcpServerUrl: mcpServerUrl,
                _metadata: metadata,
                _autoConfigured: true
            };

            // If registration endpoint is available, suggest automatic registration
            if (metadata.registration_endpoint) {
                autoConfig._suggestRegistration = true;
                autoConfig.registrationEndpoint = metadata.registration_endpoint;
            }

            // Save the configuration
            this.configs.set(serverName, autoConfig);
            await this.saveConfigs();

            console.log(`[MCP OAuth Config] Auto-configured OAuth for ${serverName}`);
            return autoConfig;

        } catch (error) {
            console.error(`[MCP OAuth Config] Auto-configuration failed for ${serverName}:`, error);
            throw error;
        }
    }
}

// Create global instance
window.mcpOAuthConfig = new MCPOAuthConfig();