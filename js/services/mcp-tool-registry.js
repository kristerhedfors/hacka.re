/**
 * Enhanced MCP Tool Registry System
 * Provides extensible tool registration, discovery, and management for MCP providers
 */

window.MCPToolRegistry = (function() {
    'use strict';

    /**
     * Tool category definitions
     */
    const TOOL_CATEGORIES = {
        REPOSITORY: 'repository',
        ISSUES: 'issues', 
        PULL_REQUESTS: 'pull_requests',
        FILES: 'files',
        COMMITS: 'commits',
        BRANCHES: 'branches',
        RELEASES: 'releases',
        COLLABORATION: 'collaboration',
        SEARCH: 'search',
        AUTOMATION: 'automation',
        EMAIL: 'email',
        DOCUMENTS: 'documents',
        CALENDAR: 'calendar',
        STORAGE: 'storage',
        COMMUNICATION: 'communication',
        OTHER: 'other'
    };

/**
 * Tool metadata interface
 * @typedef {Object} ToolMetadata
 * @property {string} name - Tool name
 * @property {string} displayName - Human-readable name
 * @property {string} description - Tool description
 * @property {string} category - Tool category
 * @property {Object} parameters - JSON schema for parameters
 * @property {Function} handler - Tool execution handler
 * @property {string[]} requiredScopes - Required authentication scopes
 * @property {string[]} tags - Searchable tags
 * @property {string} provider - Provider name
 * @property {Object} examples - Usage examples
 * @property {boolean} enabled - Whether tool is enabled
 * @property {number} priority - Display priority (lower = higher priority)
 */

/**
 * Provider tool collection
 * @typedef {Object} ProviderToolCollection
 * @property {string} provider - Provider name
 * @property {string} displayName - Provider display name
 * @property {boolean} connected - Connection status
 * @property {Map<string, ToolMetadata>} tools - Provider tools
 * @property {Object} metadata - Provider metadata
 */

/**
 * Enhanced MCP Tool Registry
 */
class MCPToolRegistryClass {
    constructor() {
        this.providers = new Map(); // Provider name -> ProviderToolCollection
        this.tools = new Map(); // Tool name -> ToolMetadata
        this.categories = new Map(); // Category -> Set of tool names
        this.tags = new Map(); // Tag -> Set of tool names
        this.aliases = new Map(); // Alias -> actual tool name
        
        // Initialize categories
        Object.values(TOOL_CATEGORIES).forEach(category => {
            this.categories.set(category, new Set());
        });
        
        // Event listeners for tool registry changes
        this.listeners = new Map();
        
        console.log('[MCPToolRegistry] Initialized enhanced tool registry');
    }

    /**
     * Register a provider and its tools
     * @param {string} providerName - Provider name
     * @param {Object} providerMetadata - Provider metadata
     * @param {ToolMetadata[]} tools - Array of tool definitions
     * @returns {boolean} Success status
     */
    registerProvider(providerName, providerMetadata, tools = []) {
        try {
            if (!providerName || typeof providerName !== 'string') {
                throw new Error('Provider name must be a non-empty string');
            }

            // Create or update provider collection
            const collection = {
                provider: providerName,
                displayName: providerMetadata.displayName || providerName,
                connected: false,
                tools: new Map(),
                metadata: providerMetadata || {}
            };

            this.providers.set(providerName, collection);

            // Register tools
            tools.forEach(tool => {
                this.registerTool(providerName, tool);
            });

            this._emit('provider-registered', { provider: providerName, metadata: providerMetadata });
            console.log(`[MCPToolRegistry] Registered provider: ${providerName} with ${tools.length} tools`);
            
            return true;
        } catch (error) {
            console.error(`[MCPToolRegistry] Failed to register provider ${providerName}:`, error);
            return false;
        }
    }

    /**
     * Register a single tool
     * @param {string} providerName - Provider name
     * @param {ToolMetadata} toolDef - Tool definition
     * @returns {boolean} Success status
     */
    registerTool(providerName, toolDef) {
        try {
            // Validate tool definition
            if (!toolDef.name || typeof toolDef.name !== 'string') {
                throw new Error('Tool must have a valid name');
            }

            if (!toolDef.handler || typeof toolDef.handler !== 'function') {
                throw new Error('Tool must have a valid handler function');
            }

            // Create full tool name with provider prefix (avoid double-prefixing)
            const fullToolName = toolDef.name.startsWith(`${providerName}_`) 
                ? toolDef.name 
                : `${providerName}_${toolDef.name}`;
            
            // Enhance tool metadata
            const enhancedTool = {
                name: fullToolName,
                originalName: toolDef.name,
                displayName: toolDef.displayName || toolDef.name,
                description: toolDef.description || 'No description provided',
                category: toolDef.category || TOOL_CATEGORIES.OTHER,
                parameters: toolDef.parameters || { type: 'object', properties: {} },
                handler: toolDef.handler,
                requiredScopes: toolDef.requiredScopes || [],
                tags: toolDef.tags || [],
                provider: providerName,
                examples: toolDef.examples || {},
                enabled: toolDef.enabled !== false, // Default to enabled
                priority: toolDef.priority || 100,
                registeredAt: Date.now()
            };

            // Store tool globally
            this.tools.set(fullToolName, enhancedTool);

            // Store in provider collection
            const providerCollection = this.providers.get(providerName);
            if (providerCollection) {
                providerCollection.tools.set(fullToolName, enhancedTool);
            }

            // Index by category
            if (!this.categories.has(enhancedTool.category)) {
                this.categories.set(enhancedTool.category, new Set());
            }
            this.categories.get(enhancedTool.category).add(fullToolName);

            // Index by tags
            enhancedTool.tags.forEach(tag => {
                if (!this.tags.has(tag)) {
                    this.tags.set(tag, new Set());
                }
                this.tags.get(tag).add(fullToolName);
            });

            // Register aliases if any
            if (toolDef.aliases) {
                toolDef.aliases.forEach(alias => {
                    this.aliases.set(alias, fullToolName);
                });
            }

            this._emit('tool-registered', { tool: enhancedTool });
            console.log(`[MCPToolRegistry] Registered tool: ${fullToolName}`);
            
            return true;
        } catch (error) {
            console.error(`[MCPToolRegistry] Failed to register tool ${toolDef.name}:`, error);
            return false;
        }
    }

    /**
     * Update provider connection status
     * @param {string} providerName - Provider name
     * @param {boolean} connected - Connection status
     * @param {Object} [connectionInfo] - Additional connection info
     */
    updateProviderStatus(providerName, connected, connectionInfo = {}) {
        const collection = this.providers.get(providerName);
        if (collection) {
            collection.connected = connected;
            collection.connectionInfo = connectionInfo;
            
            // Update tool availability based on connection status
            collection.tools.forEach(tool => {
                tool.available = connected;
            });

            this._emit('provider-status-changed', { 
                provider: providerName, 
                connected, 
                connectionInfo 
            });
            
            console.log(`[MCPToolRegistry] Provider ${providerName} status: ${connected ? 'connected' : 'disconnected'}`);
        }
    }

    /**
     * Get all tools for a provider
     * @param {string} providerName - Provider name
     * @returns {ToolMetadata[]} Array of tools
     */
    getProviderTools(providerName) {
        const collection = this.providers.get(providerName);
        return collection ? Array.from(collection.tools.values()) : [];
    }

    /**
     * Get tools by category
     * @param {string} category - Tool category
     * @returns {ToolMetadata[]} Array of tools in category
     */
    getToolsByCategory(category) {
        const toolNames = this.categories.get(category) || new Set();
        return Array.from(toolNames)
            .map(name => this.tools.get(name))
            .filter(tool => tool && tool.enabled)
            .sort((a, b) => a.priority - b.priority);
    }

    /**
     * Get tools by tag
     * @param {string} tag - Tool tag
     * @returns {ToolMetadata[]} Array of tools with tag
     */
    getToolsByTag(tag) {
        const toolNames = this.tags.get(tag) || new Set();
        return Array.from(toolNames)
            .map(name => this.tools.get(name))
            .filter(tool => tool && tool.enabled);
    }

    /**
     * Search tools by query
     * @param {string} query - Search query
     * @param {Object} [options] - Search options
     * @returns {ToolMetadata[]} Array of matching tools
     */
    searchTools(query, options = {}) {
        if (!query || typeof query !== 'string') {
            return this.getAllTools(options);
        }

        const searchTerms = query.toLowerCase().split(/\s+/);
        const results = [];

        this.tools.forEach(tool => {
            if (!tool.enabled && !options.includeDisabled) {
                return;
            }

            let score = 0;
            const searchableText = [
                tool.displayName,
                tool.description,
                tool.category,
                tool.provider,
                ...tool.tags
            ].join(' ').toLowerCase();

            // Calculate relevance score
            searchTerms.forEach(term => {
                if (tool.name.toLowerCase().includes(term)) score += 10;
                if (tool.displayName.toLowerCase().includes(term)) score += 8;
                if (tool.description.toLowerCase().includes(term)) score += 5;
                if (tool.category.toLowerCase().includes(term)) score += 3;
                if (tool.tags.some(tag => tag.toLowerCase().includes(term))) score += 4;
                if (searchableText.includes(term)) score += 1;
            });

            if (score > 0) {
                results.push({ ...tool, searchScore: score });
            }
        });

        return results
            .sort((a, b) => b.searchScore - a.searchScore || a.priority - b.priority)
            .map(({ searchScore, ...tool }) => tool);
    }

    /**
     * Get all available tools
     * @param {Object} [options] - Filter options
     * @returns {ToolMetadata[]} Array of all tools
     */
    getAllTools(options = {}) {
        let tools = Array.from(this.tools.values());

        // Filter by enabled status
        if (!options.includeDisabled) {
            tools = tools.filter(tool => tool.enabled);
        }

        // Filter by connected providers only
        if (options.connectedOnly) {
            tools = tools.filter(tool => {
                const collection = this.providers.get(tool.provider);
                return collection && collection.connected;
            });
        }

        // Filter by provider
        if (options.provider) {
            tools = tools.filter(tool => tool.provider === options.provider);
        }

        // Filter by category
        if (options.category) {
            tools = tools.filter(tool => tool.category === options.category);
        }

        return tools.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Get tool by name (including aliases)
     * @param {string} toolName - Tool name or alias
     * @returns {ToolMetadata|null} Tool metadata or null
     */
    getTool(toolName) {
        // Check direct name first
        let tool = this.tools.get(toolName);
        
        // Check aliases
        if (!tool) {
            const actualName = this.aliases.get(toolName);
            if (actualName) {
                tool = this.tools.get(actualName);
            }
        }

        return tool || null;
    }

    /**
     * Execute a tool
     * @param {string} toolName - Tool name
     * @param {Object} parameters - Tool parameters
     * @param {Object} context - Execution context
     * @returns {Promise<any>} Tool result
     */
    async executeTool(toolName, parameters = {}, context = {}) {
        const tool = this.getTool(toolName);
        
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }

        if (!tool.enabled) {
            throw new Error(`Tool is disabled: ${toolName}`);
        }

        // Check provider connection
        const collection = this.providers.get(tool.provider);
        if (!collection || !collection.connected) {
            throw new Error(`Provider not connected: ${tool.provider}`);
        }

        try {
            this._emit('tool-execution-start', { tool: tool.name, parameters });
            
            const result = await tool.handler(parameters, context);
            
            this._emit('tool-execution-complete', { tool: tool.name, result });
            
            return result;
        } catch (error) {
            this._emit('tool-execution-error', { tool: tool.name, error });
            throw new Error(`Tool execution failed: ${error.message}`);
        }
    }

    /**
     * Enable/disable a tool
     * @param {string} toolName - Tool name
     * @param {boolean} enabled - Enable status
     */
    setToolEnabled(toolName, enabled) {
        const tool = this.getTool(toolName);
        if (tool) {
            tool.enabled = enabled;
            this._emit('tool-status-changed', { tool: toolName, enabled });
            console.log(`[MCPToolRegistry] Tool ${toolName} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get available categories
     * @returns {string[]} Array of category names
     */
    getCategories() {
        return Array.from(this.categories.keys());
    }

    /**
     * Get available tags
     * @returns {string[]} Array of tag names
     */
    getTags() {
        return Array.from(this.tags.keys());
    }

    /**
     * Get provider info
     * @param {string} providerName - Provider name
     * @returns {ProviderToolCollection|null} Provider collection or null
     */
    getProvider(providerName) {
        return this.providers.get(providerName) || null;
    }

    /**
     * Get all providers
     * @returns {ProviderToolCollection[]} Array of provider collections
     */
    getAllProviders() {
        return Array.from(this.providers.values());
    }

    /**
     * Unregister a provider and all its tools
     * @param {string} providerName - Provider name
     */
    unregisterProvider(providerName) {
        const collection = this.providers.get(providerName);
        if (!collection) return;

        // Remove all tools for this provider
        collection.tools.forEach((tool, toolName) => {
            this.unregisterTool(toolName);
        });

        // Remove provider
        this.providers.delete(providerName);
        
        this._emit('provider-unregistered', { provider: providerName });
        console.log(`[MCPToolRegistry] Unregistered provider: ${providerName}`);
    }

    /**
     * Unregister a tool
     * @param {string} toolName - Tool name
     */
    unregisterTool(toolName) {
        const tool = this.tools.get(toolName);
        if (!tool) return;

        // Remove from global registry
        this.tools.delete(toolName);

        // Remove from provider collection
        const collection = this.providers.get(tool.provider);
        if (collection) {
            collection.tools.delete(toolName);
        }

        // Remove from category index
        this.categories.get(tool.category)?.delete(toolName);

        // Remove from tag indexes
        tool.tags.forEach(tag => {
            this.tags.get(tag)?.delete(toolName);
        });

        // Remove aliases
        this.aliases.forEach((actualName, alias) => {
            if (actualName === toolName) {
                this.aliases.delete(alias);
            }
        });

        this._emit('tool-unregistered', { tool: toolName });
        console.log(`[MCPToolRegistry] Unregistered tool: ${toolName}`);
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @private
     */
    _emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[MCPToolRegistry] Event listener error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry statistics
     */
    getStats() {
        let connectedProviders = 0;
        let enabledTools = 0;
        let totalTools = 0;

        this.providers.forEach(collection => {
            if (collection.connected) connectedProviders++;
        });

        this.tools.forEach(tool => {
            totalTools++;
            if (tool.enabled) enabledTools++;
        });

        return {
            providers: this.providers.size,
            connectedProviders,
            totalTools,
            enabledTools,
            categories: this.categories.size,
            tags: this.tags.size
        };
    }

    /**
     * Clear all registrations
     */
    clear() {
        this.providers.clear();
        this.tools.clear();
        this.categories.clear();
        this.tags.clear();
        this.aliases.clear();
        
        // Reinitialize categories
        Object.values(TOOL_CATEGORIES).forEach(category => {
            this.categories.set(category, new Set());
        });
        
        this._emit('registry-cleared', {});
        console.log('[MCPToolRegistry] Cleared all registrations');
    }
}

    // Create and return singleton instance
    const toolRegistry = new MCPToolRegistryClass();

    // Public API
    return {
        // Singleton instance methods
        registerProvider: toolRegistry.registerProvider.bind(toolRegistry),
        registerTool: toolRegistry.registerTool.bind(toolRegistry),
        updateProviderStatus: toolRegistry.updateProviderStatus.bind(toolRegistry),
        getProviderTools: toolRegistry.getProviderTools.bind(toolRegistry),
        getToolsByCategory: toolRegistry.getToolsByCategory.bind(toolRegistry),
        getToolsByTag: toolRegistry.getToolsByTag.bind(toolRegistry),
        searchTools: toolRegistry.searchTools.bind(toolRegistry),
        getAllTools: toolRegistry.getAllTools.bind(toolRegistry),
        getTool: toolRegistry.getTool.bind(toolRegistry),
        executeTool: toolRegistry.executeTool.bind(toolRegistry),
        setToolEnabled: toolRegistry.setToolEnabled.bind(toolRegistry),
        getCategories: toolRegistry.getCategories.bind(toolRegistry),
        getTags: toolRegistry.getTags.bind(toolRegistry),
        getProvider: toolRegistry.getProvider.bind(toolRegistry),
        getAllProviders: toolRegistry.getAllProviders.bind(toolRegistry),
        unregisterProvider: toolRegistry.unregisterProvider.bind(toolRegistry),
        unregisterTool: toolRegistry.unregisterTool.bind(toolRegistry),
        on: toolRegistry.on.bind(toolRegistry),
        off: toolRegistry.off.bind(toolRegistry),
        getStats: toolRegistry.getStats.bind(toolRegistry),
        clear: toolRegistry.clear.bind(toolRegistry),
        
        // Constants
        TOOL_CATEGORIES: TOOL_CATEGORIES,
        
        // Constructor for creating new instances if needed
        MCPToolRegistryClass: MCPToolRegistryClass
    };
})();