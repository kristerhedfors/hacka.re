/**
 * MCP Service Manager
 * Orchestrates all service connectors and provides a unified interface
 */

(function(global) {
    'use strict';

    class MCPServiceManager {
        constructor() {
            this.connectors = new Map();
            this.perfLogger = window.mcpPerfLogger || new (window.PerformanceLogger || class { log() {} })('MCPServiceManager');
            this.initializeConnectors();
        }

        /**
         * Initialize all available connectors
         */
        initializeConnectors() {
            // Register GitHub connector
            if (global.GitHubConnector) {
                this.registerConnector('github', new global.GitHubConnector());
            }

            // Register Shodan connector
            if (global.ShodanConnector) {
                this.registerConnector('shodan', new global.ShodanConnector());
            }

            // Register Gmail connector
            if (global.GmailConnector) {
                this.registerConnector('gmail', new global.GmailConnector());
            }

            // Register Google Docs connector (when implemented)
            if (global.GDocsConnector) {
                this.registerConnector('gdocs', new global.GDocsConnector());
            }

            this.perfLogger.log(`Initialized with ${this.connectors.size} connectors`);
        }

        /**
         * Register a service connector
         */
        registerConnector(serviceKey, connector) {
            this.connectors.set(serviceKey, connector);
            this.perfLogger.log(`Registered connector: ${serviceKey}`);
        }

        /**
         * Get a specific connector
         */
        getConnector(serviceKey) {
            return this.connectors.get(serviceKey);
        }

        /**
         * Connect to a service
         */
        async connectService(serviceKey, credentials = null) {
            const connector = this.getConnector(serviceKey);
            if (!connector) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            this.perfLogger.log(`Connecting to ${serviceKey}...`);

            // If credentials provided, use them directly
            if (credentials) {
                if (connector.createConnection) {
                    // Handle different credential formats
                    let credentialValue = credentials;
                    
                    // For object credentials, extract the actual value
                    if (typeof credentials === 'object' && credentials !== null) {
                        // Try different property names based on service type
                        if (serviceKey === 'shodan' && credentials.apiKey) {
                            credentialValue = credentials.apiKey;
                        } else if (serviceKey === 'github' && credentials.token) {
                            credentialValue = credentials.token;
                        } else if (credentials.key) {
                            credentialValue = credentials.key;
                        } else if (credentials.token) {
                            credentialValue = credentials.token;
                        } else if (credentials.apiKey) {
                            credentialValue = credentials.apiKey;
                        }
                    }
                    
                    return await connector.createConnection(credentialValue);
                }
            }

            // Otherwise try auto-connect
            return await connector.connect();
        }

        /**
         * Disconnect from a service
         */
        async disconnectService(serviceKey) {
            const connector = this.getConnector(serviceKey);
            if (!connector) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            this.perfLogger.log(`Disconnecting from ${serviceKey}...`);
            return await connector.disconnect();
        }

        /**
         * Check if a service is connected
         */
        isConnected(serviceKey) {
            const connector = this.getConnector(serviceKey);
            return connector ? connector.isConnected() : false;
        }

        /**
         * Get all connected services
         */
        getConnectedServices() {
            const connected = [];
            
            for (const [key, connector] of this.connectors) {
                if (connector.isConnected()) {
                    connected.push({
                        key,
                        name: connector.config.name,
                        type: connector.config.authType,
                        connected: true,
                        toolCount: Object.keys(connector.getToolsToRegister()).length
                    });
                }
            }
            
            this.perfLogger.log(`${connected.length} services connected`);
            return connected;
        }

        /**
         * Get all available services
         */
        getAvailableServices() {
            const services = [];
            
            for (const [key, connector] of this.connectors) {
                services.push({
                    key,
                    name: connector.config.name,
                    description: connector.config.description,
                    icon: connector.config.icon,
                    iconType: connector.config.iconType,
                    authType: connector.config.authType,
                    connected: connector.isConnected(),
                    setupInstructions: connector.config.setupInstructions
                });
            }
            
            return services;
        }

        /**
         * Execute a service tool
         */
        async executeServiceTool(serviceKey, toolName, params) {
            const connector = this.getConnector(serviceKey);
            if (!connector) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            const connected = connector.isConnected();
            this.perfLogger.log(`executeServiceTool ${serviceKey}:${toolName} - connected: ${connected}`);
            console.log(`[MCPServiceManager] executeServiceTool params:`, params);
            console.log(`[MCPServiceManager] params type:`, typeof params);
            
            if (!connected) {
                this.perfLogger.log(`Connection state:`, connector.connection);
                this.perfLogger.log(`hasValidCredentials:`, connector.hasValidCredentials());
                throw new Error(`Service ${serviceKey} not connected`);
            }

            return await connector.executeTool(toolName, params);
        }

        /**
         * Validate a service connection
         */
        async validateService(serviceKey) {
            const connector = this.getConnector(serviceKey);
            if (!connector) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            return await connector.validate();
        }

        /**
         * Bulk disconnect services
         */
        async bulkDisconnectServices(serviceKeys = []) {
            this.perfLogger.log(`Bulk disconnecting ${serviceKeys.length} services`);
            
            const results = {
                successful: [],
                failed: [],
                totalRequested: serviceKeys.length,
                totalDisconnected: 0
            };
            
            for (const serviceKey of serviceKeys) {
                try {
                    const success = await this.disconnectService(serviceKey);
                    if (success) {
                        results.successful.push(serviceKey);
                        results.totalDisconnected++;
                    } else {
                        results.failed.push({ serviceKey, error: 'Disconnection returned false' });
                    }
                } catch (error) {
                    console.error(`[MCPServiceManager] Failed to disconnect ${serviceKey}:`, error);
                    results.failed.push({ serviceKey, error: error.message });
                }
            }
            
            return results;
        }

        /**
         * Quick connect for services with stored credentials
         */
        async quickConnect(serviceKey) {
            const connector = this.getConnector(serviceKey);
            if (!connector) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            // Check if connector supports quick connect
            if (connector.quickConnect) {
                return await connector.quickConnect();
            }

            // Otherwise try regular connect
            return await connector.connect();
        }

        /**
         * Get service configuration
         */
        getServiceConfig(serviceKey) {
            const connector = this.getConnector(serviceKey);
            return connector ? connector.config : null;
        }

        /**
         * Load all stored connections on startup
         */
        async loadStoredConnections() {
            const loaded = [];
            
            for (const [key, connector] of this.connectors) {
                try {
                    await connector.loadConnection();
                    if (connector.isConnected()) {
                        // Validate the connection
                        const isValid = await connector.validate();
                        if (isValid) {
                            loaded.push(key);
                            console.log(`[MCPServiceManager] Loaded stored connection for ${key}`);
                        } else {
                            // Invalid connection, clear it
                            await connector.clearConnection();
                            console.log(`[MCPServiceManager] Cleared invalid connection for ${key}`);
                        }
                    }
                } catch (error) {
                    console.warn(`[MCPServiceManager] Failed to load connection for ${key}:`, error);
                }
            }
            
            console.log(`[MCPServiceManager] Loaded ${loaded.length} stored connections`);
            return loaded;
        }

        /**
         * Handle OAuth callback for services
         */
        async handleOAuthCallback(serviceKey, code, state) {
            const connector = this.getConnector(serviceKey);
            if (!connector) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            // Check if connector is OAuth-based
            if (!connector.exchangeCodeForTokens) {
                throw new Error(`Service ${serviceKey} does not support OAuth`);
            }

            // Exchange code for tokens
            // Note: Client ID and secret should be retrieved from UI or storage
            const clientId = state?.clientId;
            const clientSecret = state?.clientSecret;
            
            if (!clientId || !clientSecret) {
                throw new Error('OAuth client credentials not provided');
            }

            const tokens = await connector.exchangeCodeForTokens(code, clientId, clientSecret);
            
            // Create connection with tokens
            await connector.createConnection(tokens);
            
            return true;
        }

        /**
         * Build OAuth authorization URL
         */
        buildOAuthUrl(serviceKey, clientId, additionalParams = {}) {
            const connector = this.getConnector(serviceKey);
            if (!connector) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            if (!connector.buildAuthorizationUrl) {
                throw new Error(`Service ${serviceKey} does not support OAuth`);
            }

            return connector.buildAuthorizationUrl(clientId, additionalParams);
        }

        /**
         * Register Gmail functions after OAuth restore (for shared links)
         */
        async registerGmailFunctions(oauthTokens) {
            const connector = this.getConnector('gmail');
            if (!connector) {
                console.warn('[MCPServiceManager] Gmail connector not available');
                return false;
            }

            try {
                // Create connection with restored tokens
                await connector.createConnection(oauthTokens);
                
                console.log('[MCPServiceManager] Gmail functions registered after OAuth restore');
                
                // Auto-register and enable Gmail integration prompt if available
                if (window.DefaultPromptsService && window.GmailIntegrationGuide) {
                    try {
                        // First register the prompt (safe to call multiple times)
                        window.DefaultPromptsService.registerPrompt(window.GmailIntegrationGuide);
                        // Then enable it
                        window.DefaultPromptsService.enablePrompt('Gmail MCP prompt');
                        console.log('[MCPServiceManager] Gmail MCP prompt registered and auto-enabled');
                    } catch (error) {
                        console.warn('[MCPServiceManager] Failed to register/enable Gmail prompt:', error);
                    }
                }
                
                return true;
            } catch (error) {
                console.error('[MCPServiceManager] Failed to register Gmail functions:', error);
                return false;
            }
        }
    }

    // Create singleton instance
    const manager = new MCPServiceManager();

    // Export both the class and instance
    global.MCPServiceManager = MCPServiceManager;
    global.mcpServiceManager = manager;
    
    // Create bridge for backwards compatibility (used by GitHub UI and other components)
    global.MCPServiceConnectors = {
        connectService: (serviceKey, credentials = null) => manager.connectService(serviceKey, credentials),
        disconnectService: (serviceKey) => manager.disconnectService(serviceKey),
        isConnected: (serviceKey) => manager.isConnected(serviceKey),
        getConnectedServices: () => manager.getConnectedServices(),
        bulkDisconnectServices: (serviceKeys) => manager.bulkDisconnectServices(serviceKeys),
        quickConnect: (serviceKey) => manager.quickConnect(serviceKey),
        validateService: (serviceKey) => manager.validateService(serviceKey),
        executeServiceTool: (serviceKey, toolName, params) => manager.executeServiceTool(serviceKey, toolName, params),
        getServiceConfig: (serviceKey) => manager.getServiceConfig(serviceKey),
        loadStoredConnections: () => manager.loadStoredConnections()
    };
    
    console.log('[MCPServiceManager] Bridge created: MCPServiceConnectors -> mcpServiceManager');

})(window);