/**
 * MCP Service Connectors - Refactored Main Coordinator
 * 
 * This module coordinates between different service providers and the MCP infrastructure.
 * Service-specific logic has been extracted to separate provider modules.
 */

(function(global) {
    'use strict';

    class MCPServiceConnectors {
        constructor() {
            this.connectedServices = new Map();
            this.providers = new Map();
            this.initializeProviders();
            this.initializeEventListeners();
        }

        /**
         * Initialize service providers
         */
        initializeProviders() {
            // Initialize GitHub provider
            if (global.GitHubProvider) {
                this.providers.set('github', new global.GitHubProvider());
            }

            // Initialize Gmail provider
            if (global.GmailProvider) {
                this.providers.set('gmail', new global.GmailProvider());
            }

            // Initialize Google Workspace provider
            if (global.GoogleWorkspaceProvider) {
                const workspaceProvider = new global.GoogleWorkspaceProvider();
                this.providers.set('gdocs', workspaceProvider);
                this.providers.set('calendar', workspaceProvider);
                this.providers.set('drive', workspaceProvider);
            }
        }

        initializeEventListeners() {
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'oauth-callback') {
                    this.handleOAuthCallback(event.data);
                }
            });
        }

        /**
         * Connect to a service
         */
        async connectService(serviceKey) {
            const provider = this.providers.get(serviceKey);
            if (!provider) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            console.log(`[MCP Service Connectors] Connecting to ${provider.config.name}...`);

            try {
                const result = await provider.connect();
                
                if (result.success) {
                    // Store connection info
                    this.connectedServices.set(serviceKey, {
                        provider: provider,
                        config: provider.config,
                        authData: result.token || result.tokens
                    });

                    // Register tools with function calling system
                    await this.registerServiceTools(serviceKey, provider.config, result.token || result.tokens);
                    
                    console.log(`[MCP Service Connectors] ${provider.config.name} connected successfully`);
                    return true;
                } else if (result.requiresAuth) {
                    return await this.showPATInputDialog(serviceKey, provider.config);
                } else if (result.requiresOAuth) {
                    return await this.showOAuthSetupDialog(serviceKey, provider.config);
                } else if (result.requiresGmail) {
                    alert('This service requires Gmail authentication. Please connect Gmail first.');
                    return false;
                } else if (result.requiresAdditionalScopes) {
                    alert('Additional permissions needed. Please re-authenticate.');
                    return false;
                }
                
                return false;
            } catch (error) {
                console.error(`[MCP Service Connectors] Connection failed:`, error);
                alert(`Failed to connect to ${provider.config.name}: ${error.message}`);
                return false;
            }
        }

        /**
         * Register service tools with function calling system
         */
        async registerServiceTools(serviceKey, config, authData) {
            const tools = [];
            for (const [toolName, toolConfig] of Object.entries(config.tools)) {
                const functionName = `${serviceKey}_${toolName}`;
                const functionCode = this.generateServiceFunction(serviceKey, toolName, toolConfig);
                tools.push({
                    name: functionName,
                    code: functionCode,
                    description: toolConfig.description
                });
            }

            for (const tool of tools) {
                try {
                    eval(`window.${tool.name} = ${tool.code}`);
                    console.log(`[MCP Service Connectors] Registered function: ${tool.name}`);
                    
                    if (window.FunctionToolsRegistry && window.FunctionToolsStorage) {
                        const currentToolConfig = config.tools[tool.name.replace(`${serviceKey}_`, '')];
                        
                        const toolDefinition = {
                            type: "function",
                            function: {
                                name: tool.name,
                                description: tool.description,
                                parameters: currentToolConfig?.parameters || {
                                    type: "object",
                                    properties: {},
                                    required: []
                                }
                            }
                        };
                        
                        const collectionId = `mcp_${serviceKey}_collection`;
                        const collectionMetadata = {
                            name: `${config.name} MCP Functions`,
                            createdAt: Date.now(),
                            source: 'mcp-service'
                        };
                        
                        const added = window.FunctionToolsRegistry.addJsFunction(
                            tool.name,
                            tool.code,
                            toolDefinition,
                            collectionId,
                            collectionMetadata
                        );
                        
                        if (added) {
                            console.log(`[MCP Service Connectors] Added ${tool.name} to Function Registry`);
                            
                            const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                            if (!enabledFunctions.includes(tool.name)) {
                                enabledFunctions.push(tool.name);
                                window.FunctionToolsStorage.setEnabledFunctions(enabledFunctions);
                                window.FunctionToolsStorage.save();
                                console.log(`[MCP Service Connectors] Enabled ${tool.name} in Function Calling`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`[MCP Service Connectors] Failed to register function ${tool.name}:`, error);
                }
            }
        }

        /**
         * Generate JavaScript function code for service tools
         */
        generateServiceFunction(serviceKey, toolName, toolConfig) {
            const paramNames = [];
            if (toolConfig.parameters && toolConfig.parameters.properties) {
                paramNames.push(...Object.keys(toolConfig.parameters.properties));
            }

            return `async function ${serviceKey}_${toolName}(${paramNames.join(', ')}) {
                try {
                    const MCPServiceConnectors = window.MCPServiceConnectors;
                    const params = {${paramNames.map(name => `${name}: ${name}`).join(', ')}};
                    const result = await MCPServiceConnectors.executeServiceTool('${serviceKey}', '${toolName}', params);
                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }`;
        }

        /**
         * Execute a service-specific tool
         */
        async executeServiceTool(serviceKey, toolName, params) {
            const connection = this.connectedServices.get(serviceKey);
            if (!connection) {
                throw new Error(`Service ${serviceKey} not connected`);
            }

            const { provider, authData } = connection;
            
            if (serviceKey === 'gdocs' || serviceKey === 'calendar' || serviceKey === 'drive') {
                return await provider.executeTool(serviceKey, toolName, params, authData);
            } else {
                return await provider.executeTool(toolName, params, authData);
            }
        }

        /**
         * Show PAT input dialog (for GitHub)
         */
        async showPATInputDialog(serviceKey, config) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-pat-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} Personal Access Token</h3>
                        
                        <div class="token-setup-instructions">
                            <h4>${config.setupInstructions.title}</h4>
                            <ol>
                                ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                            
                            <p class="form-help">
                                <a href="${config.setupInstructions.docUrl}" target="_blank">
                                    View official documentation <i class="fas fa-external-link-alt"></i>
                                </a>
                            </p>
                        </div>
                        
                        <div class="token-input-form">
                            <div class="form-group">
                                <label for="${serviceKey}-pat-input">Personal Access Token</label>
                                <input type="password" 
                                       id="${serviceKey}-pat-input" 
                                       placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                                       class="mcp-input" />
                                <small class="form-help">Your token will be encrypted and stored locally</small>
                            </div>
                            
                            <div class="form-actions">
                                <button class="btn primary-btn" id="${serviceKey}-save-token">
                                    Save & Connect
                                </button>
                                <button class="btn secondary-btn" onclick="document.getElementById('service-pat-modal').remove()">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                document.getElementById(`${serviceKey}-pat-input`).focus();
                
                document.getElementById(`${serviceKey}-save-token`).onclick = async () => {
                    const token = document.getElementById(`${serviceKey}-pat-input`).value.trim();
                    
                    if (!token) {
                        alert('Please enter a Personal Access Token');
                        return;
                    }
                    
                    const provider = this.providers.get(serviceKey);
                    const isValid = await provider.validateToken(token);
                    if (!isValid) {
                        alert('Invalid token. Please check and try again.');
                        return;
                    }
                    
                    await provider.storeToken(token);
                    modal.remove();
                    
                    this.connectedServices.set(serviceKey, {
                        provider: provider,
                        config: provider.config,
                        authData: token
                    });

                    await this.registerServiceTools(serviceKey, provider.config, token);
                    resolve(true);
                };
            });
        }

        /**
         * Show OAuth setup dialog (for Google services)
         */
        async showOAuthSetupDialog(serviceKey, config) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-oauth-setup-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} OAuth Setup</h3>
                        
                        <div class="oauth-setup-instructions">
                            <h4>Setup Instructions:</h4>
                            <ol>
                                ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                            
                            <p class="form-help">
                                <a href="${config.setupInstructions.docUrl}" target="_blank">
                                    View official documentation <i class="fas fa-external-link-alt"></i>
                                </a>
                            </p>
                        </div>
                        
                        <div class="oauth-credentials-form">
                            <div class="form-group">
                                <label for="${serviceKey}-client-id">OAuth Client ID</label>
                                <input type="text" 
                                       id="${serviceKey}-client-id" 
                                       placeholder="Your OAuth Client ID" 
                                       class="mcp-input" />
                            </div>
                            
                            <div class="form-group">
                                <label for="${serviceKey}-client-secret">OAuth Client Secret</label>
                                <input type="password" 
                                       id="${serviceKey}-client-secret" 
                                       placeholder="Your OAuth Client Secret" 
                                       class="mcp-input" />
                                <small class="form-help">Your credentials will be encrypted and stored locally</small>
                            </div>
                            
                            <div class="form-actions">
                                <button class="btn primary-btn" id="${serviceKey}-start-oauth">
                                    Start Authentication
                                </button>
                                <button class="btn secondary-btn" onclick="document.getElementById('service-oauth-setup-modal').remove()">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                document.getElementById(`${serviceKey}-start-oauth`).onclick = async () => {
                    const clientId = document.getElementById(`${serviceKey}-client-id`).value.trim();
                    const clientSecret = document.getElementById(`${serviceKey}-client-secret`).value.trim();
                    
                    console.log('[OAuth Setup] Captured credentials:', {
                        clientId: clientId ? `present (${clientId.substring(0, 10)}...)` : 'MISSING',
                        clientSecret: clientSecret ? 'present' : 'MISSING',
                        serviceKey: serviceKey
                    });
                    
                    if (!clientId || !clientSecret) {
                        alert('Please enter both Client ID and Client Secret');
                        return;
                    }
                    
                    const oauthConfig = {
                        ...config.oauthConfig,
                        clientId,
                        clientSecret
                    };
                    
                    modal.remove();
                    
                    const result = await this.startDeviceFlow(serviceKey, oauthConfig);
                    resolve(result);
                };
            });
        }

        /**
         * Start device flow authentication
         */
        async startDeviceFlow(serviceKey, oauthConfig) {
            try {
                console.log('[Service Connectors] Starting device flow with config:', {
                    serviceKey,
                    clientId: oauthConfig.clientId ? `present (${oauthConfig.clientId.substring(0, 10)}...)` : 'MISSING',
                    clientSecret: oauthConfig.clientSecret ? 'present' : 'MISSING'
                });
                
                const provider = this.providers.get(serviceKey);
                const deviceData = await provider.startDeviceFlow(oauthConfig);
                
                this.showDeviceCodeDialog(serviceKey, deviceData);
                
                const tokens = await provider.pollForAuthorization(oauthConfig, deviceData);
                
                if (tokens) {
                    this.connectedServices.set(serviceKey, {
                        provider: provider,
                        config: provider.config,
                        authData: tokens
                    });

                    await this.registerServiceTools(serviceKey, provider.config, tokens);
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error(`[MCP Service Connectors] OAuth device flow failed:`, error);
                alert(`Failed to authenticate with ${this.providers.get(serviceKey).config.name}: ${error.message}`);
                return false;
            }
        }

        /**
         * Show device code dialog
         */
        showDeviceCodeDialog(serviceKey, deviceData) {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'device-code-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Complete Authentication</h3>
                    
                    <div class="device-code-instructions">
                        <p>To complete authentication:</p>
                        <ol>
                            <li>Visit: <a href="${deviceData.verification_url}" target="_blank">${deviceData.verification_url}</a></li>
                            <li>Enter this code: <code class="device-code">${deviceData.user_code}</code></li>
                            <li>Grant permissions when prompted</li>
                        </ol>
                        
                        <div class="device-code-display">
                            <span class="device-code-large">${deviceData.user_code}</span>
                            <button class="btn secondary-btn" onclick="navigator.clipboard.writeText('${deviceData.user_code}')">
                                <i class="fas fa-copy"></i> Copy Code
                            </button>
                        </div>
                        
                        <p class="waiting-message">
                            <i class="fas fa-spinner fa-spin"></i> Waiting for authentication...
                        </p>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }

        /**
         * Disconnect a service
         */
        async disconnectService(serviceKey) {
            const connection = this.connectedServices.get(serviceKey);
            if (!connection) return;

            const { provider, config } = connection;

            // Remove registered functions
            if (config && config.tools) {
                for (const toolName of Object.keys(config.tools)) {
                    const functionName = `${serviceKey}_${toolName}`;
                    if (window[functionName]) {
                        delete window[functionName];
                        console.log(`[MCP Service Connectors] Removed function: ${functionName}`);
                    }
                    
                    if (window.FunctionToolsStorage && window.FunctionToolsRegistry) {
                        const jsFunctions = window.FunctionToolsStorage.getJsFunctions() || {};
                        const functionCollections = window.FunctionToolsStorage.getFunctionCollections() || {};
                        
                        if (jsFunctions[functionName]) {
                            delete jsFunctions[functionName];
                            delete functionCollections[functionName];
                            window.FunctionToolsStorage.setJsFunctions(jsFunctions);
                            window.FunctionToolsStorage.setFunctionCollections(functionCollections);
                        }
                        
                        const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                        const index = enabledFunctions.indexOf(functionName);
                        if (index > -1) {
                            enabledFunctions.splice(index, 1);
                            window.FunctionToolsStorage.setEnabledFunctions(enabledFunctions);
                        }
                        
                        window.FunctionToolsStorage.save();
                        console.log(`[MCP Service Connectors] Removed ${functionName} from Function Calling system`);
                    }
                }
            }

            // Disconnect provider
            await provider.disconnect();

            // Remove from connected services
            this.connectedServices.delete(serviceKey);

            console.log(`[MCP Service Connectors] ${config.name} disconnected`);
        }

        /**
         * Utility methods
         */
        isConnected(serviceKey) {
            return this.connectedServices.has(serviceKey);
        }

        getConnectedServices() {
            return Array.from(this.connectedServices.entries()).map(([key, connection]) => ({
                key,
                ...connection.config,
                connected: true
            }));
        }

        getAvailableServices() {
            const services = [];
            
            for (const [key, provider] of this.providers.entries()) {
                // Handle Google Workspace provider (has multiple services)
                if (provider.getProvider && typeof provider.getProvider === 'function') {
                    const serviceProvider = provider.getProvider(key);
                    if (serviceProvider && serviceProvider.config) {
                        services.push({
                            key,
                            ...serviceProvider.config,
                            connected: this.isConnected(key)
                        });
                    }
                } else {
                    // Handle regular providers
                    services.push({
                        key,
                        ...provider.config,
                        connected: this.isConnected(key)
                    });
                }
            }
            
            return services;
        }

        getToolCount(serviceKey) {
            const provider = this.providers.get(serviceKey);
            if (!provider) return 0;
            
            // Handle Google Workspace provider (has multiple services)
            if (provider.getProvider && typeof provider.getProvider === 'function') {
                const serviceProvider = provider.getProvider(serviceKey);
                if (serviceProvider && serviceProvider.config && serviceProvider.config.tools) {
                    return Object.keys(serviceProvider.config.tools).length;
                }
                return 0;
            }
            
            // Handle regular providers
            if (!provider.config || !provider.config.tools) return 0;
            return Object.keys(provider.config.tools).length;
        }

        async quickConnect(serviceKey) {
            try {
                const provider = this.providers.get(serviceKey);
                if (!provider) {
                    throw new Error(`Unknown service: ${serviceKey}`);
                }

                const result = await provider.connect();
                if (result.success) {
                    this.connectedServices.set(serviceKey, {
                        provider: provider,
                        config: provider.config,
                        authData: result.token || result.tokens
                    });
                    await this.registerServiceTools(serviceKey, provider.config, result.token || result.tokens);
                    return true;
                }

                return false;
            } catch (error) {
                console.error(`[MCP Service Connectors] Quick connect failed for ${serviceKey}:`, error);
                return false;
            }
        }
    }

    global.MCPServiceConnectors = new MCPServiceConnectors();

})(window);