/**
 * Agent Loader Service
 * 
 * Manages loading and switching between different AI agents while preserving
 * existing MCP connections and functions. Only activates/deactivates tools
 * that differ from the agent's requirements.
 */

window.AgentLoader = (function() {
    'use strict';
    
    const Logger = window.FunctionToolsLogger || {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console)
    };
    
    /**
     * Agent configuration structure
     * @typedef {Object} AgentConfig
     * @property {string} id - Unique agent identifier
     * @property {string} name - Human-readable agent name
     * @property {string} description - Agent description
     * @property {string} version - Agent version
     * @property {Object} requirements - Agent requirements
     * @property {Array<string>} requirements.mcpServices - Required MCP service keys
     * @property {Array<string>} requirements.functions - Required function names
     * @property {Object} requirements.functionCollections - Required function collections
     * @property {Object} settings - Agent-specific settings
     * @property {string} settings.systemPrompt - Agent system prompt
     * @property {string} settings.model - Preferred model
     * @property {string} settings.provider - Preferred provider
     * @property {Object} metadata - Additional metadata
     * @property {number} metadata.createdAt - Creation timestamp
     * @property {number} metadata.lastUsed - Last used timestamp
     * @property {string} metadata.author - Agent author
     */

    class AgentLoader {
        constructor() {
            this.currentAgent = null;
            this.loadingInProgress = false;
            this.agentConfigs = new Map();
            this.initializeDefaultAgents();
        }

        /**
         * Initialize default agent configurations
         */
        initializeDefaultAgents() {
            // Default general purpose agent
            this.registerAgent({
                id: 'general',
                name: 'General Assistant',
                description: 'A versatile AI assistant for general tasks',
                version: '1.0.0',
                requirements: {
                    mcpServices: [], // No specific MCP requirements
                    functions: [], // No specific function requirements
                    functionCollections: {}
                },
                settings: {
                    systemPrompt: 'You are a helpful AI assistant.',
                    model: 'gpt-4o-mini',
                    provider: 'openai'
                },
                metadata: {
                    createdAt: Date.now(),
                    lastUsed: Date.now(),
                    author: 'system'
                }
            });

            // Developer agent with code-related tools
            this.registerAgent({
                id: 'developer',
                name: 'Developer Assistant',
                description: 'AI assistant specialized for software development tasks',
                version: '1.0.0',
                requirements: {
                    mcpServices: ['github'], // Requires GitHub MCP connection
                    functions: [], // Will be populated with code-related functions
                    functionCollections: {
                        'code_tools': ['code_formatter', 'syntax_checker', 'test_generator']
                    }
                },
                settings: {
                    systemPrompt: 'You are an expert software developer assistant. Help with coding, debugging, and development best practices.',
                    model: 'gpt-4o',
                    provider: 'openai'
                },
                metadata: {
                    createdAt: Date.now(),
                    lastUsed: 0,
                    author: 'system'
                }
            });

            // Research agent with research-focused tools
            this.registerAgent({
                id: 'researcher',
                name: 'Research Assistant',
                description: 'AI assistant specialized for research and information gathering',
                version: '1.0.0',
                requirements: {
                    mcpServices: ['github', 'gmail', 'gdocs'], // Requires multiple MCP services
                    functions: ['web_search', 'citation_formatter', 'data_analyzer'],
                    functionCollections: {
                        'research_tools': ['web_search', 'citation_formatter'],
                        'data_tools': ['data_analyzer', 'chart_generator']
                    }
                },
                settings: {
                    systemPrompt: 'You are a research assistant specializing in information gathering, analysis, and academic writing. Always cite sources and provide thorough, well-researched responses.',
                    model: 'gpt-4o',
                    provider: 'openai'
                },
                metadata: {
                    createdAt: Date.now(),
                    lastUsed: 0,
                    author: 'system'
                }
            });

            if (Logger && typeof Logger.log === 'function') {
                Logger.log('AgentLoader: Initialized with default agent configurations');
            }
        }

        /**
         * Register a new agent configuration
         * @param {AgentConfig} config - Agent configuration
         * @returns {boolean} Whether registration was successful
         */
        registerAgent(config) {
            try {
                // Validate configuration
                const validation = this.validateAgentConfig(config);
                if (!validation.valid) {
                    if (Logger && typeof Logger.error === 'function') {
                        Logger.error('AgentLoader: Invalid agent configuration:', validation.errors);
                    }
                    return false;
                }

                this.agentConfigs.set(config.id, config);
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`AgentLoader: Registered agent '${config.name}' (${config.id})`);
                }
                return true;
            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('AgentLoader: Failed to register agent:', error);
                }
                return false;
            }
        }

        /**
         * Validate agent configuration
         * @param {AgentConfig} config - Configuration to validate
         * @returns {Object} Validation result
         */
        validateAgentConfig(config) {
            const validation = { valid: true, errors: [] };

            if (!config.id || typeof config.id !== 'string') {
                validation.errors.push('Agent ID is required and must be a string');
                validation.valid = false;
            }

            if (!config.name || typeof config.name !== 'string') {
                validation.errors.push('Agent name is required and must be a string');
                validation.valid = false;
            }

            if (!config.requirements || typeof config.requirements !== 'object') {
                validation.errors.push('Agent requirements are required and must be an object');
                validation.valid = false;
            } else {
                if (!Array.isArray(config.requirements.mcpServices)) {
                    validation.errors.push('requirements.mcpServices must be an array');
                    validation.valid = false;
                }

                if (!Array.isArray(config.requirements.functions)) {
                    validation.errors.push('requirements.functions must be an array');
                    validation.valid = false;
                }
            }

            return validation;
        }

        /**
         * Get current system state for comparison
         * @returns {Object} Current system state
         */
        getCurrentState() {
            const state = {
                mcpServices: [],
                functions: [],
                enabledFunctions: [],
                functionCollections: {}
            };

            try {
                // Get MCP services
                if (window.MCPServiceConnectors) {
                    const connectedServices = window.MCPServiceConnectors.getConnectedServices();
                    state.mcpServices = connectedServices.map(service => service.key);
                }

                // Get functions
                if (window.FunctionToolsService) {
                    const allFunctions = window.FunctionToolsService.getJsFunctions();
                    state.functions = Object.keys(allFunctions);
                    state.enabledFunctions = window.FunctionToolsService.getEnabledFunctionNames();
                    state.functionCollections = window.FunctionToolsService.getAllFunctionCollections();
                }

                if (Logger && typeof Logger.log === 'function') {
                    Logger.log('AgentLoader: Current state retrieved:', state);
                }
                return state;
            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('AgentLoader: Failed to get current state:', error);
                }
                return state;
            }
        }

        /**
         * Compare agent requirements with current state
         * @param {AgentConfig} agentConfig - Agent configuration
         * @param {Object} currentState - Current system state
         * @returns {Object} Comparison result with required changes
         */
        compareStateWithRequirements(agentConfig, currentState) {
            const comparison = {
                mcpChanges: {
                    toConnect: [],
                    toDisconnect: [],
                    toKeep: []
                },
                functionChanges: {
                    toEnable: [],
                    toDisable: [],
                    toKeep: []
                },
                requiresChanges: false
            };

            // Compare MCP services
            const requiredMcp = new Set(agentConfig.requirements.mcpServices);
            const currentMcp = new Set(currentState.mcpServices);

            // Services to connect (required but not currently connected)
            comparison.mcpChanges.toConnect = [...requiredMcp].filter(service => !currentMcp.has(service));

            // Services to keep (required and currently connected)
            comparison.mcpChanges.toKeep = [...requiredMcp].filter(service => currentMcp.has(service));

            // Services to disconnect (currently connected but not required)
            comparison.mcpChanges.toDisconnect = [...currentMcp].filter(service => !requiredMcp.has(service));

            // Compare functions
            const requiredFunctions = new Set(agentConfig.requirements.functions);
            const currentEnabledFunctions = new Set(currentState.enabledFunctions);

            // Functions to enable (required but not currently enabled)
            comparison.functionChanges.toEnable = [...requiredFunctions].filter(func => !currentEnabledFunctions.has(func));

            // Functions to keep (required and currently enabled)
            comparison.functionChanges.toKeep = [...requiredFunctions].filter(func => currentEnabledFunctions.has(func));

            // Functions to disable (currently enabled but not required)
            comparison.functionChanges.toDisable = [...currentEnabledFunctions].filter(func => !requiredFunctions.has(func));

            // Determine if changes are required
            comparison.requiresChanges = 
                comparison.mcpChanges.toConnect.length > 0 ||
                comparison.mcpChanges.toDisconnect.length > 0 ||
                comparison.functionChanges.toEnable.length > 0 ||
                comparison.functionChanges.toDisable.length > 0;

            if (Logger && typeof Logger.log === 'function') {
                Logger.log('AgentLoader: State comparison result:', comparison);
            }
            return comparison;
        }

        /**
         * Load an agent by applying only necessary changes
         * @param {string} agentId - Agent ID to load
         * @param {Function} addSystemMessage - Optional callback for system messages
         * @returns {Promise<boolean>} Whether loading was successful
         */
        async loadAgent(agentId, addSystemMessage = null) {
            if (this.loadingInProgress) {
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('AgentLoader: Agent loading already in progress');
                }
                return false;
            }

            this.loadingInProgress = true;

            try {
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`AgentLoader: Starting to load agent '${agentId}'`);
                }

                // Get agent configuration
                const agentConfig = this.agentConfigs.get(agentId);
                if (!agentConfig) {
                    throw new Error(`Agent '${agentId}' not found`);
                }

                // Get current state
                const currentState = this.getCurrentState();

                // Compare and determine required changes
                const comparison = this.compareStateWithRequirements(agentConfig, currentState);

                if (addSystemMessage) {
                    addSystemMessage(`Loading agent: ${agentConfig.name}`);
                }

                // Apply changes only if necessary
                if (comparison.requiresChanges) {
                    if (Logger && typeof Logger.log === 'function') {
                        Logger.log('AgentLoader: Applying selective changes for agent loading');
                    }

                    // Apply MCP changes
                    await this.applyMcpChanges(comparison.mcpChanges, addSystemMessage);

                    // Apply function changes
                    await this.applyFunctionChanges(comparison.functionChanges, addSystemMessage);

                    if (addSystemMessage) {
                        const changesSummary = this.generateChangesSummary(comparison);
                        addSystemMessage(`Agent state updated: ${changesSummary}`);
                    }
                } else {
                    if (Logger && typeof Logger.log === 'function') {
                        Logger.log('AgentLoader: No state changes required for agent loading');
                    }
                    if (addSystemMessage) {
                        addSystemMessage('Agent requirements already satisfied - no changes needed.');
                    }
                }

                // Apply agent settings (always apply these)
                await this.applyAgentSettings(agentConfig, addSystemMessage);

                // Update current agent
                this.currentAgent = agentConfig;
                agentConfig.metadata.lastUsed = Date.now();

                // Save agent state
                await this.saveCurrentAgentState();

                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`AgentLoader: Successfully loaded agent '${agentConfig.name}'`);
                }
                if (addSystemMessage) {
                    addSystemMessage(`Agent '${agentConfig.name}' loaded successfully.`);
                }

                return true;

            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('AgentLoader: Failed to load agent:', error);
                }
                if (addSystemMessage) {
                    addSystemMessage(`Failed to load agent: ${error.message}`);
                }
                return false;
            } finally {
                this.loadingInProgress = false;
            }
        }

        /**
         * Apply MCP connection changes
         * @param {Object} mcpChanges - MCP changes to apply
         * @param {Function} addSystemMessage - Optional callback for system messages
         */
        async applyMcpChanges(mcpChanges, addSystemMessage) {
            if (!window.MCPServiceConnectors) {
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('AgentLoader: MCPServiceConnectors not available');
                }
                return;
            }

            // Disconnect services that are no longer needed
            if (mcpChanges.toDisconnect.length > 0) {
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`AgentLoader: Disconnecting ${mcpChanges.toDisconnect.length} MCP services:`, mcpChanges.toDisconnect);
                }
                
                const disconnectResults = await window.MCPServiceConnectors.bulkDisconnectServices(mcpChanges.toDisconnect);
                
                if (addSystemMessage && disconnectResults.totalDisconnected > 0) {
                    addSystemMessage(`Disconnected ${disconnectResults.totalDisconnected} MCP services: ${disconnectResults.successful.join(', ')}`);
                }
            }

            // Connect new required services
            if (mcpChanges.toConnect.length > 0) {
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`AgentLoader: Need to connect ${mcpChanges.toConnect.length} MCP services:`, mcpChanges.toConnect);
                }
                
                if (addSystemMessage) {
                    addSystemMessage(`The following MCP services need to be connected: ${mcpChanges.toConnect.join(', ')}. Please configure them in the MCP Servers panel.`);
                }
            }

            // Keep existing connections (no action needed)
            if (mcpChanges.toKeep.length > 0) {
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`AgentLoader: Keeping ${mcpChanges.toKeep.length} existing MCP connections:`, mcpChanges.toKeep);
                }
            }
        }

        /**
         * Apply function activation changes
         * @param {Object} functionChanges - Function changes to apply
         * @param {Function} addSystemMessage - Optional callback for system messages
         */
        async applyFunctionChanges(functionChanges, addSystemMessage) {
            if (!window.FunctionToolsService) {
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('AgentLoader: FunctionToolsService not available');
                }
                return;
            }

            let changesApplied = 0;

            // Enable required functions
            for (const functionName of functionChanges.toEnable) {
                try {
                    const enabled = window.FunctionToolsService.enableJsFunction(functionName);
                    if (enabled) {
                        changesApplied++;
                        if (Logger && typeof Logger.log === 'function') {
                            Logger.log(`AgentLoader: Enabled function: ${functionName}`);
                        }
                    } else {
                        if (Logger && typeof Logger.warn === 'function') {
                            Logger.warn(`AgentLoader: Failed to enable function: ${functionName} (function may not exist)`);
                        }
                    }
                } catch (error) {
                    if (Logger && typeof Logger.error === 'function') {
                        Logger.error(`AgentLoader: Error enabling function ${functionName}:`, error);
                    }
                }
            }

            // Disable functions that are no longer needed
            for (const functionName of functionChanges.toDisable) {
                try {
                    const disabled = window.FunctionToolsService.disableJsFunction(functionName);
                    if (disabled) {
                        changesApplied++;
                        if (Logger && typeof Logger.log === 'function') {
                            Logger.log(`AgentLoader: Disabled function: ${functionName}`);
                        }
                    }
                } catch (error) {
                    if (Logger && typeof Logger.error === 'function') {
                        Logger.error(`AgentLoader: Error disabling function ${functionName}:`, error);
                    }
                }
            }

            // Keep enabled functions (no action needed)
            if (functionChanges.toKeep.length > 0) {
                if (Logger && typeof Logger.log === 'function') {
                    Logger.log(`AgentLoader: Keeping ${functionChanges.toKeep.length} enabled functions:`, functionChanges.toKeep);
                }
            }

            if (addSystemMessage && changesApplied > 0) {
                addSystemMessage(`Updated ${changesApplied} function activations for agent requirements.`);
            }
        }

        /**
         * Apply agent-specific settings
         * @param {AgentConfig} agentConfig - Agent configuration
         * @param {Function} addSystemMessage - Optional callback for system messages
         */
        async applyAgentSettings(agentConfig, addSystemMessage) {
            try {
                // Apply system prompt
                if (agentConfig.settings.systemPrompt && window.StorageService) {
                    window.StorageService.saveSystemPrompt(agentConfig.settings.systemPrompt);
                    if (Logger && typeof Logger.log === 'function') {
                        Logger.log('AgentLoader: Applied agent system prompt');
                    }
                }

                // Apply model preference
                if (agentConfig.settings.model && window.StorageService) {
                    window.StorageService.saveModel(agentConfig.settings.model);
                    if (Logger && typeof Logger.log === 'function') {
                        Logger.log(`AgentLoader: Applied agent model preference: ${agentConfig.settings.model}`);
                    }
                }

                // Apply provider preference
                if (agentConfig.settings.provider && window.StorageService) {
                    window.StorageService.saveBaseUrlProvider(agentConfig.settings.provider);
                    if (Logger && typeof Logger.log === 'function') {
                        Logger.log(`AgentLoader: Applied agent provider preference: ${agentConfig.settings.provider}`);
                    }
                }

                if (addSystemMessage) {
                    addSystemMessage(`Applied agent settings: ${agentConfig.settings.model || 'default model'} with ${agentConfig.settings.provider || 'default provider'}.`);
                }
            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('AgentLoader: Failed to apply agent settings:', error);
                }
            }
        }

        /**
         * Generate a human-readable summary of changes
         * @param {Object} comparison - State comparison result
         * @returns {string} Changes summary
         */
        generateChangesSummary(comparison) {
            const summaryParts = [];

            if (comparison.mcpChanges.toConnect.length > 0) {
                summaryParts.push(`${comparison.mcpChanges.toConnect.length} MCP services to connect`);
            }

            if (comparison.mcpChanges.toDisconnect.length > 0) {
                summaryParts.push(`${comparison.mcpChanges.toDisconnect.length} MCP services disconnected`);
            }

            if (comparison.functionChanges.toEnable.length > 0) {
                summaryParts.push(`${comparison.functionChanges.toEnable.length} functions enabled`);
            }

            if (comparison.functionChanges.toDisable.length > 0) {
                summaryParts.push(`${comparison.functionChanges.toDisable.length} functions disabled`);
            }

            return summaryParts.length > 0 ? summaryParts.join(', ') : 'no changes needed';
        }

        /**
         * Get available agents
         * @returns {Array<AgentConfig>} Array of available agent configurations
         */
        getAvailableAgents() {
            return Array.from(this.agentConfigs.values())
                .sort((a, b) => b.metadata.lastUsed - a.metadata.lastUsed);
        }

        /**
         * Get current agent
         * @returns {AgentConfig|null} Current agent configuration
         */
        getCurrentAgent() {
            return this.currentAgent;
        }

        /**
         * Save current agent state to storage
         */
        async saveCurrentAgentState() {
            try {
                if (this.currentAgent && window.CoreStorageService) {
                    await window.CoreStorageService.setValue('current_agent', this.currentAgent.id);
                    if (Logger && typeof Logger.log === 'function') {
                        Logger.log('AgentLoader: Saved current agent state');
                    }
                }
            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('AgentLoader: Failed to save current agent state:', error);
                }
            }
        }

        /**
         * Load agent state from storage on initialization
         */
        async loadAgentStateFromStorage() {
            try {
                if (window.CoreStorageService) {
                    const currentAgentId = await window.CoreStorageService.getValue('current_agent');
                    if (currentAgentId && this.agentConfigs.has(currentAgentId)) {
                        this.currentAgent = this.agentConfigs.get(currentAgentId);
                        if (Logger && typeof Logger.log === 'function') {
                            Logger.log(`AgentLoader: Restored current agent: ${this.currentAgent.name}`);
                        }
                    }
                }
            } catch (error) {
                if (Logger && typeof Logger.error === 'function') {
                    Logger.error('AgentLoader: Failed to load agent state from storage:', error);
                }
            }
        }
    }

    // Create singleton instance
    const agentLoader = new AgentLoader();

    // Initialize from storage when available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            agentLoader.loadAgentStateFromStorage();
        });
    } else {
        agentLoader.loadAgentStateFromStorage();
    }

    return agentLoader;
})();