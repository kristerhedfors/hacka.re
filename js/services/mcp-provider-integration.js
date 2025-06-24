/**
 * MCP Provider Integration Module
 * Handles provider registration and integration with the existing MCP system
 */

window.MCPProviderIntegration = (function() {
    'use strict';

/**
 * MCP Provider Integration Manager
 * Coordinates provider registration and system integration
 */
class MCPProviderIntegrationClass {
    constructor() {
        this.initialized = false;
        this.registeredProviders = new Set();
        
        // Reference to existing MCP components
        this.functionToolsRegistry = null;
        this.functionToolsStorage = null;
        this.coreStorageService = null;
        
        console.log('[MCPProviderIntegration] Initialized');
    }

    /**
     * Initialize the integration system
     * @param {Object} dependencies - System dependencies
     */
    async initialize(dependencies = {}) {
        if (this.initialized) {
            console.log('[MCPProviderIntegration] Already initialized');
            return;
        }

        try {
            // Get references to existing systems
            this.functionToolsRegistry = dependencies.functionToolsRegistry || window.FunctionToolsRegistry;
            this.functionToolsStorage = dependencies.functionToolsStorage || window.FunctionToolsStorage;
            this.coreStorageService = dependencies.coreStorageService || window.CoreStorageService;

            // Register built-in providers
            await this.registerBuiltInProviders();

            // Set up event listeners
            this.setupEventListeners();

            this.initialized = true;
            console.log('[MCPProviderIntegration] Initialization complete');
        } catch (error) {
            console.error('[MCPProviderIntegration] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Register built-in providers with the factory
     */
    async registerBuiltInProviders() {
        try {
            // Register GitHub provider
            window.MCPProviderFactory.register(
                'github',
                window.GitHubProvider,
                {
                    type: 'pat',
                    requiredScopes: ['repo', 'read:user'],
                    endpoints: {
                        api: 'https://api.github.com',
                        userInfo: 'https://api.github.com/user'
                    }
                },
                ['gh'] // Alias
            );

            console.log('[MCPProviderIntegration] Built-in providers registered');
        } catch (error) {
            console.error('[MCPProviderIntegration] Failed to register built-in providers:', error);
            throw error;
        }
    }

    /**
     * Connect a provider using the new architecture
     * @param {string} providerType - Provider type
     * @param {Object} config - Provider configuration
     * @returns {Promise<Object>} Connection result
     */
    async connectProvider(providerType, config = {}) {
        try {
            // Create provider instance
            const provider = window.MCPProviderFactory.createProvider(providerType, config);
            
            // Authenticate
            const authResult = await provider.authenticate(config.auth || {});
            if (!authResult.success) {
                return {
                    success: false,
                    error: authResult.error || 'Authentication failed',
                    errorCode: authResult.errorCode
                };
            }

            // Register provider with tool registry
            const toolDefinitions = await provider.getToolDefinitions();
            const providerMetadata = provider.getMetadata();
            
            // Enhance tool definitions with categories
            const enhancedTools = toolDefinitions.map(tool => ({
                ...tool,
                category: this.getToolCategory(tool.name),
                tags: this.getToolTags(tool.name),
                priority: this.getToolPriority(tool.name)
            }));

            window.MCPToolRegistry.registerProvider(providerType, providerMetadata, enhancedTools);
            window.MCPToolRegistry.updateProviderStatus(providerType, true, {
                connectedAt: Date.now(),
                userInfo: authResult.userInfo
            });

            // Register tools with function calling system
            await this.registerProviderTools(provider, enhancedTools);

            // Mark as registered
            this.registeredProviders.add(providerType);

            console.log(`[MCPProviderIntegration] Provider ${providerType} connected successfully`);
            
            return {
                success: true,
                provider: providerType,
                toolCount: enhancedTools.length,
                userInfo: authResult.userInfo
            };
        } catch (error) {
            console.error(`[MCPProviderIntegration] Failed to connect provider ${providerType}:`, error);
            return {
                success: false,
                error: error.message,
                errorCode: 'CONNECTION_FAILED'
            };
        }
    }

    /**
     * Disconnect a provider
     * @param {string} providerType - Provider type
     * @returns {Promise<boolean>} Success status
     */
    async disconnectProvider(providerType) {
        try {
            // Update tool registry
            window.MCPToolRegistry.updateProviderStatus(providerType, false);
            
            // Remove tools from function calling system
            await this.unregisterProviderTools(providerType);

            // Mark as disconnected
            this.registeredProviders.delete(providerType);

            console.log(`[MCPProviderIntegration] Provider ${providerType} disconnected`);
            return true;
        } catch (error) {
            console.error(`[MCPProviderIntegration] Failed to disconnect provider ${providerType}:`, error);
            return false;
        }
    }

    /**
     * Register provider tools with the function calling system
     * @param {MCPProvider} provider - Provider instance
     * @param {Array} tools - Tool definitions
     */
    async registerProviderTools(provider, tools) {
        if (!this.functionToolsRegistry || !this.functionToolsStorage) {
            console.warn('[MCPProviderIntegration] Function calling system not available');
            return;
        }

        try {
            for (const tool of tools) {
                // Create function wrapper
                const functionName = tool.name;
                const functionCode = this.generateFunctionWrapper(provider, tool);
                
                // Add to global scope
                window[functionName] = functionCode;
                
                // Register with function calling system
                const functionDefinition = {
                    type: "function",
                    function: {
                        name: functionName,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                };

                // Store in function tools system
                await this.functionToolsStorage.storeFunctionDefinition(functionName, {
                    name: functionName,
                    description: tool.description,
                    parameters: tool.parameters,
                    code: functionCode.toString(),
                    enabled: true,
                    collection: `mcp_${provider.name}_collection`
                });

                console.log(`[MCPProviderIntegration] Registered function: ${functionName}`);
            }
        } catch (error) {
            console.error('[MCPProviderIntegration] Failed to register provider tools:', error);
            throw error;
        }
    }

    /**
     * Unregister provider tools from function calling system
     * @param {string} providerType - Provider type
     */
    async unregisterProviderTools(providerType) {
        if (!this.functionToolsStorage) {
            return;
        }

        try {
            const tools = window.MCPToolRegistry.getProviderTools(providerType);
            
            for (const tool of tools) {
                // Remove from global scope
                if (window[tool.name]) {
                    delete window[tool.name];
                }
                
                // Remove from function tools system
                await this.functionToolsStorage.deleteFunctionDefinition(tool.name);
                
                console.log(`[MCPProviderIntegration] Unregistered function: ${tool.name}`);
            }
        } catch (error) {
            console.error('[MCPProviderIntegration] Failed to unregister provider tools:', error);
        }
    }

    /**
     * Generate function wrapper for provider tool
     * @param {MCPProvider} provider - Provider instance
     * @param {Object} tool - Tool definition
     * @returns {Function} Wrapper function
     */
    generateFunctionWrapper(provider, tool) {
        return async (params = {}) => {
            try {
                // Get stored credentials
                const credentials = await this.coreStorageService?.get(provider.getStorageKeyPrefix() + '_credentials');
                
                if (!credentials) {
                    throw new Error(`No credentials found for ${provider.name}`);
                }

                // Execute tool
                const result = await provider.executeTool(tool.originalName, params, { credentials });
                
                return result;
            } catch (error) {
                console.error(`[${tool.name}] Execution failed:`, error);
                throw error;
            }
        };
    }

    /**
     * Get tool category based on tool name
     * @param {string} toolName - Tool name
     * @returns {string} Tool category
     */
    getToolCategory(toolName) {
        const name = toolName.toLowerCase();
        
        if (name.includes('repo')) return window.MCPToolRegistry.TOOL_CATEGORIES.REPOSITORY;
        if (name.includes('issue')) return window.MCPToolRegistry.TOOL_CATEGORIES.ISSUES;
        if (name.includes('pull') || name.includes('pr')) return window.MCPToolRegistry.TOOL_CATEGORIES.PULL_REQUESTS;
        if (name.includes('file') || name.includes('content')) return window.MCPToolRegistry.TOOL_CATEGORIES.FILES;
        if (name.includes('commit')) return window.MCPToolRegistry.TOOL_CATEGORIES.COMMITS;
        if (name.includes('branch')) return window.MCPToolRegistry.TOOL_CATEGORIES.BRANCHES;
        if (name.includes('search')) return window.MCPToolRegistry.TOOL_CATEGORIES.SEARCH;
        
        return window.MCPToolRegistry.TOOL_CATEGORIES.OTHER;
    }

    /**
     * Get tool tags based on tool name
     * @param {string} toolName - Tool name
     * @returns {string[]} Tool tags
     */
    getToolTags(toolName) {
        const tags = [];
        const name = toolName.toLowerCase();
        
        if (name.includes('list')) tags.push('list', 'read');
        if (name.includes('get')) tags.push('get', 'read');
        if (name.includes('create')) tags.push('create', 'write');
        if (name.includes('update')) tags.push('update', 'write');
        if (name.includes('delete')) tags.push('delete', 'write');
        if (name.includes('github')) tags.push('github', 'git', 'repository');
        
        return tags;
    }

    /**
     * Get tool priority based on tool name
     * @param {string} toolName - Tool name
     * @returns {number} Tool priority (lower = higher priority)
     */
    getToolPriority(toolName) {
        const name = toolName.toLowerCase();
        
        // Common operations get higher priority
        if (name.includes('list_repos')) return 10;
        if (name.includes('get_repo')) return 20;
        if (name.includes('get_file_content')) return 30;
        if (name.includes('list_issues')) return 40;
        if (name.includes('create_issue')) return 50;
        if (name.includes('list_pull_requests')) return 60;
        if (name.includes('get_pull_request')) return 70;
        if (name.includes('list_commits')) return 80;
        if (name.includes('list_branches')) return 90;
        
        return 100; // Default priority
    }

    /**
     * Set up event listeners for system integration
     */
    setupEventListeners() {
        // Listen for tool registry events
        window.MCPToolRegistry.on('provider-status-changed', (event) => {
            console.log(`[MCPProviderIntegration] Provider status changed: ${event.provider} -> ${event.connected}`);
        });

        window.MCPToolRegistry.on('tool-execution-start', (event) => {
            console.log(`[MCPProviderIntegration] Tool execution started: ${event.tool}`);
        });

        window.MCPToolRegistry.on('tool-execution-error', (event) => {
            console.error(`[MCPProviderIntegration] Tool execution error: ${event.tool}`, event.error);
        });
    }

    /**
     * Get integration status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.initialized,
            registeredProviders: Array.from(this.registeredProviders),
            availableProviders: window.MCPProviderFactory.getAvailableProviders(),
            toolRegistryStats: window.MCPToolRegistry.getStats(),
            functionCallingAvailable: !!(this.functionToolsRegistry && this.functionToolsStorage)
        };
    }

    /**
     * Migrate existing GitHub connection to new architecture
     * @returns {Promise<boolean>} Migration success
     */
    async migrateExistingGitHubConnection() {
        try {
            if (!this.coreStorageService) {
                console.warn('[MCPProviderIntegration] Core storage service not available for migration');
                return false;
            }

            // Check for existing GitHub token
            const existingToken = await this.coreStorageService.get('mcp_github_token');
            if (!existingToken) {
                console.log('[MCPProviderIntegration] No existing GitHub token found');
                return false;
            }

            // Connect using new architecture
            const result = await this.connectProvider('github', {
                auth: {
                    token: existingToken,
                    skipValidation: false
                }
            });

            if (result.success) {
                console.log('[MCPProviderIntegration] Successfully migrated existing GitHub connection');
                return true;
            } else {
                console.error('[MCPProviderIntegration] Failed to migrate GitHub connection:', result.error);
                return false;
            }
        } catch (error) {
            console.error('[MCPProviderIntegration] Migration failed:', error);
            return false;
        }
    }
}

    // Create and return singleton instance
    const providerIntegration = new MCPProviderIntegrationClass();

    // Public API
    return {
        // Singleton instance methods
        initialize: providerIntegration.initialize.bind(providerIntegration),
        registerBuiltInProviders: providerIntegration.registerBuiltInProviders.bind(providerIntegration),
        connectProvider: providerIntegration.connectProvider.bind(providerIntegration),
        disconnectProvider: providerIntegration.disconnectProvider.bind(providerIntegration),
        registerProviderTools: providerIntegration.registerProviderTools.bind(providerIntegration),
        unregisterProviderTools: providerIntegration.unregisterProviderTools.bind(providerIntegration),
        generateFunctionWrapper: providerIntegration.generateFunctionWrapper.bind(providerIntegration),
        getToolCategory: providerIntegration.getToolCategory.bind(providerIntegration),
        getToolTags: providerIntegration.getToolTags.bind(providerIntegration),
        getToolPriority: providerIntegration.getToolPriority.bind(providerIntegration),
        setupEventListeners: providerIntegration.setupEventListeners.bind(providerIntegration),
        getStatus: providerIntegration.getStatus.bind(providerIntegration),
        migrateExistingGitHubConnection: providerIntegration.migrateExistingGitHubConnection.bind(providerIntegration),
        
        // Constructor for creating new instances if needed
        MCPProviderIntegrationClass: MCPProviderIntegrationClass
    };
})();