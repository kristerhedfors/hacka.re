/**
 * Base Service Connector for MCP Services
 * Provides shared functionality for all service connectors
 */

(function(global) {
    'use strict';

    class BaseServiceConnector {
        constructor(serviceKey, config) {
            this.serviceKey = serviceKey;
            this.config = config;
            this.connection = null;
            this.storage = window.CoreStorageService;
        }

        /**
         * Get storage key for this service
         */
        getStorageKey(suffix = '') {
            return `mcp_${this.serviceKey}${suffix ? '_' + suffix : ''}`;
        }

        /**
         * Store connection data
         */
        async storeConnection(connectionData) {
            this.connection = connectionData;
            const storageKey = this.getStorageKey('connection');
            await this.storage.setValue(storageKey, connectionData);
            return connectionData;
        }

        /**
         * Load stored connection data
         */
        async loadConnection() {
            const storageKey = this.getStorageKey('connection');
            this.connection = await this.storage.getValue(storageKey);
            return this.connection;
        }

        /**
         * Clear connection data
         */
        async clearConnection() {
            this.connection = null;
            const storageKey = this.getStorageKey('connection');
            await this.storage.removeValue(storageKey);
        }

        /**
         * Check if service is connected
         */
        isConnected() {
            return this.connection !== null && this.hasValidCredentials();
        }

        /**
         * Check if credentials are valid (to be overridden)
         */
        hasValidCredentials() {
            if (!this.connection) return false;
            
            // Token-based auth
            if (this.connection.token) {
                return typeof this.connection.token === 'string' && this.connection.token.length > 0;
            }
            
            // OAuth-based auth
            if (this.connection.tokens) {
                return !!(this.connection.tokens.accessToken && this.connection.tokens.accessToken.length > 0);
            }
            
            // API key-based auth
            if (this.connection.apiKey) {
                return typeof this.connection.apiKey === 'string' && this.connection.apiKey.length > 0;
            }
            
            return false;
        }

        /**
         * Register tools with function calling system
         */
        async registerTools(authCredentials) {
            const tools = [];
            const toolsToRegister = this.getToolsToRegister();

            for (const [toolName, toolConfig] of Object.entries(toolsToRegister)) {
                const functionName = this.getFunctionName(toolName);
                const functionCode = this.generateToolFunction(functionName, toolName, toolConfig);
                
                tools.push({
                    name: functionName,
                    code: functionCode,
                    description: toolConfig.description,
                    parameters: toolConfig.parameters
                });
            }

            // Register each tool
            for (const tool of tools) {
                await this.registerSingleTool(tool);
            }

            return tools.length;
        }

        /**
         * Get tools to register (to be overridden by subclasses)
         */
        getToolsToRegister() {
            return this.config.tools || {};
        }

        /**
         * Get function name for a tool
         */
        getFunctionName(toolName) {
            // Check if tool name already has service prefix
            if (toolName.startsWith(`${this.serviceKey}_`)) {
                return toolName;
            }
            return `${this.serviceKey}_${toolName}`;
        }

        /**
         * Generate JavaScript function code for a tool
         */
        generateToolFunction(functionName, toolName, toolConfig) {
            const paramNames = [];
            if (toolConfig.parameters && toolConfig.parameters.properties) {
                paramNames.push(...Object.keys(toolConfig.parameters.properties));
            }

            // Remove service prefix from tool name for execution
            const baseToolName = toolName.replace(`${this.serviceKey}_`, '');

            return `async function ${functionName}(${paramNames.join(', ')}) {
                try {
                    const MCPServiceConnectors = window.MCPServiceConnectors;
                    const params = {${paramNames.map(name => `${name}: ${name}`).join(', ')}};
                    const result = await MCPServiceConnectors.executeServiceTool('${this.serviceKey}', '${baseToolName}', params);
                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }`;
        }

        /**
         * Register a single tool with the system
         */
        async registerSingleTool(tool) {
            try {
                // Add function to global scope
                try {
                    eval(`window.${tool.name} = ${tool.code}`);
                    
                    // Verify registration
                    if (typeof window[tool.name] !== 'function') {
                        const func = new Function('return ' + tool.code)();
                        window[tool.name] = func;
                    }
                } catch (evalError) {
                    console.error(`[BaseServiceConnector] Failed to register function ${tool.name}:`, evalError);
                    return false;
                }

                // Register with Function Calling system if available
                if (window.FunctionToolsRegistry && window.FunctionToolsStorage) {
                    const toolDefinition = {
                        type: "function",
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.parameters || {
                                type: "object",
                                properties: {},
                                required: []
                            }
                        }
                    };

                    const collectionId = `mcp_${this.serviceKey}_collection`;
                    const collectionMetadata = {
                        name: `${this.config.name} MCP Functions`,
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
                        // Enable the function by default
                        const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                        if (!enabledFunctions.includes(tool.name)) {
                            enabledFunctions.push(tool.name);
                            window.FunctionToolsStorage.setEnabledFunctions(enabledFunctions);
                            window.FunctionToolsStorage.save();
                        }
                    }

                    return added;
                }

                return true;
            } catch (error) {
                console.error(`[BaseServiceConnector] Failed to register tool ${tool.name}:`, error);
                return false;
            }
        }

        /**
         * Unregister all tools for this service
         */
        async unregisterTools() {
            const toolsToUnregister = this.getToolsToRegister();
            
            for (const toolName of Object.keys(toolsToUnregister)) {
                const functionName = this.getFunctionName(toolName);
                
                try {
                    // Remove from global scope
                    delete window[functionName];
                    
                    // Remove from Function Calling system
                    if (window.FunctionToolsRegistry) {
                        window.FunctionToolsRegistry.removeJsFunction(functionName);
                    }
                } catch (error) {
                    console.error(`[BaseServiceConnector] Failed to unregister ${functionName}:`, error);
                }
            }

            // Disable functions in storage
            if (window.FunctionToolsStorage) {
                const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                const toolNames = Object.keys(toolsToUnregister).map(name => this.getFunctionName(name));
                const filtered = enabledFunctions.filter(fn => !toolNames.includes(fn));
                window.FunctionToolsStorage.setEnabledFunctions(filtered);
                window.FunctionToolsStorage.save();
            }
        }

        /**
         * Execute a tool (to be overridden by subclasses)
         */
        async executeTool(toolName, params) {
            throw new Error(`executeTool must be implemented by ${this.constructor.name}`);
        }

        /**
         * Make API request with standard error handling
         */
        async makeApiRequest(url, options = {}) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || 45000);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = `API error: ${response.status} ${response.statusText}`;
                    
                    try {
                        const errorJson = JSON.parse(errorText);
                        if (errorJson.error && errorJson.error.message) {
                            errorMessage += ` - ${errorJson.error.message}`;
                        } else if (errorJson.message) {
                            errorMessage += ` - ${errorJson.message}`;
                        }
                    } catch (e) {
                        if (errorText) {
                            errorMessage += ` - ${errorText}`;
                        }
                    }
                    
                    throw new Error(errorMessage);
                }

                return await response.json();
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error(`API request timed out after ${options.timeout || 45000}ms`);
                }
                
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    throw new Error('Network error while connecting to API');
                }
                
                throw error;
            }
        }

        /**
         * Connect to the service (to be overridden)
         */
        async connect() {
            throw new Error(`connect must be implemented by ${this.constructor.name}`);
        }

        /**
         * Disconnect from the service
         */
        async disconnect() {
            await this.unregisterTools();
            await this.clearConnection();
            console.log(`[${this.constructor.name}] Disconnected from ${this.config.name}`);
            return true;
        }

        /**
         * Validate connection
         */
        async validate() {
            if (!this.isConnected()) {
                return false;
            }
            
            // Subclasses should override for specific validation
            return true;
        }
    }

    // Export to global scope
    global.BaseServiceConnector = BaseServiceConnector;

})(window);