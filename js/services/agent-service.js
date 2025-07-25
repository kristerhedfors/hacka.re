/**
 * Agent Service
 * Handles saving, loading, and managing agent configurations
 * All data is encrypted using CoreStorageService
 */

window.AgentService = (function() {

    // Get AgentContextManager for configuration isolation
    function getContextManager() {
        const manager = window.AgentContextManager || null;
        return manager;
    }
    
    /**
     * Save an agent configuration with a given name
     * @param {string} name - Name of the agent
     * @param {Object} config - Configuration object from ConfigurationService
     * @param {Object} options - Additional options
     * @param {string} options.description - Optional description for the agent
     * @param {string} options.agentType - Optional agent type classification
     * @returns {boolean} True if successful
     */
    function saveAgent(name, config, options = {}) {
        try {
            if (!name || typeof name !== 'string') {
                console.error('Agent name must be a non-empty string');
                return false;
            }
            
            if (!config || typeof config !== 'object') {
                console.error('Agent configuration must be an object');
                return false;
            }
            
            // Validate the configuration
            const validation = ConfigurationService.validateConfiguration(config);
            if (!validation.isValid) {
                console.error('Invalid agent configuration:', validation.errors);
                return false;
            }
            
            // Get existing agents
            const existingAgents = getAllAgents();
            
            // Check if this is a new agent
            const isNewAgent = !existingAgents.hasOwnProperty(name);
            
            // Create agent entry with metadata
            const agentEntry = {
                name: name,
                config: config,
                description: options.description || '',
                agentType: options.agentType || 'general',
                createdAt: existingAgents[name]?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                namespace: NamespaceService.getNamespace()
            };
            
            // Add to agents list
            existingAgents[name] = agentEntry;
            
            // Save encrypted to storage
            const success = CoreStorageService.setValue(NamespaceService.BASE_STORAGE_KEYS.SAVED_AGENTS, existingAgents);
            
            if (success) {
                console.log(`Agent "${name}" saved successfully`);
                
                // Auto-enable new agents by default
                if (isNewAgent && window.aiHackare) {
                    const enabledAgents = window.aiHackare.getEnabledAgents();
                    if (!enabledAgents.includes(name)) {
                        enabledAgents.push(name);
                        window.aiHackare.setEnabledAgents(enabledAgents);
                        console.log(`Agent "${name}" auto-enabled for multi-agent queries`);
                    }
                }
                
                // Update metadata
                updateAgentMetadata();
                
                return true;
            } else {
                console.error(`Failed to save agent "${name}"`);
                return false;
            }
            
        } catch (error) {
            console.error('Error saving agent:', error);
            return false;
        }
    }
    
    /**
     * Load an agent configuration by name
     * @param {string} name - Name of the agent to load
     * @returns {Object|null} Agent configuration object or null if not found
     */
    function loadAgent(name) {
        try {
            if (!name || typeof name !== 'string') {
                console.error('Agent name must be a non-empty string');
                return null;
            }
            
            const agents = getAllAgents();
            const agent = agents[name];
            
            if (!agent) {
                console.warn(`Agent "${name}" not found`);
                return null;
            }
            
            console.log(`Agent "${name}" loaded successfully`);
            return agent;
            
        } catch (error) {
            console.error('Error loading agent:', error);
            return null;
        }
    }
    
    /**
     * Get all saved agents
     * @returns {Object} Object with agent names as keys and agent data as values
     */
    function getAllAgents() {
        try {
            const agents = CoreStorageService.getValue(NamespaceService.BASE_STORAGE_KEYS.SAVED_AGENTS);
            return agents || {};
        } catch (error) {
            console.error('Error getting all agents:', error);
            return {};
        }
    }
    
    /**
     * List all agent names with basic metadata
     * @returns {Array} Array of agent summaries
     */
    function listAgents() {
        try {
            const agents = getAllAgents();
            return Object.keys(agents).map(name => {
                const agent = agents[name];
                return {
                    name: name,
                    description: agent.description || '',
                    agentType: agent.agentType || 'general',
                    createdAt: agent.createdAt,
                    updatedAt: agent.updatedAt,
                    hasLLMConfig: !!(agent.config && agent.config.llm),
                    hasPrompts: !!(agent.config && agent.config.prompts),
                    hasFunctions: !!(agent.config && agent.config.functions),
                    hasMCP: !!(agent.config && agent.config.mcp)
                };
            });
        } catch (error) {
            console.error('Error listing agents:', error);
            return [];
        }
    }
    
    /**
     * Delete an agent by name
     * @param {string} name - Name of the agent to delete
     * @returns {boolean} True if successful
     */
    function deleteAgent(name) {
        try {
            if (!name || typeof name !== 'string') {
                console.error('Agent name must be a non-empty string');
                return false;
            }
            
            const agents = getAllAgents();
            
            if (!agents[name]) {
                console.warn(`Agent "${name}" not found for deletion`);
                return false;
            }
            
            // Remove from agents object
            delete agents[name];
            
            // Save updated agents list
            const success = CoreStorageService.setValue(NamespaceService.BASE_STORAGE_KEYS.SAVED_AGENTS, agents);
            
            if (success) {
                console.log(`Agent "${name}" deleted successfully`);
                
                // Update metadata
                updateAgentMetadata();
                
                return true;
            } else {
                console.error(`Failed to delete agent "${name}"`);
                return false;
            }
            
        } catch (error) {
            console.error('Error deleting agent:', error);
            return false;
        }
    }
    
    /**
     * Check if an agent exists
     * @param {string} name - Name of the agent
     * @returns {boolean} True if agent exists
     */
    function agentExists(name) {
        try {
            if (!name || typeof name !== 'string') {
                return false;
            }
            
            const agents = getAllAgents();
            return agents.hasOwnProperty(name);
            
        } catch (error) {
            console.error('Error checking if agent exists:', error);
            return false;
        }
    }
    
    /**
     * Update an existing agent configuration
     * @param {string} name - Name of the agent to update
     * @param {Object} config - New configuration object
     * @param {Object} options - Additional options
     * @returns {boolean} True if successful
     */
    function updateAgent(name, config, options = {}) {
        try {
            if (!agentExists(name)) {
                console.error(`Agent "${name}" does not exist`);
                return false;
            }
            
            // Get existing agent
            const agents = getAllAgents();
            const existingAgent = agents[name];
            
            // Validate new configuration
            const validation = ConfigurationService.validateConfiguration(config);
            if (!validation.isValid) {
                console.error('Invalid agent configuration:', validation.errors);
                return false;
            }
            
            // Update agent entry
            agents[name] = {
                ...existingAgent,
                config: config,
                description: options.description !== undefined ? options.description : existingAgent.description,
                agentType: options.agentType !== undefined ? options.agentType : existingAgent.agentType,
                updatedAt: new Date().toISOString()
            };
            
            // Save updated agents
            const success = CoreStorageService.setValue(NamespaceService.BASE_STORAGE_KEYS.SAVED_AGENTS, agents);
            
            if (success) {
                console.log(`Agent "${name}" updated successfully`);
                updateAgentMetadata();
                return true;
            } else {
                console.error(`Failed to update agent "${name}"`);
                return false;
            }
            
        } catch (error) {
            console.error('Error updating agent:', error);
            return false;
        }
    }
    
    /**
     * Apply an agent's configuration to the current application state
     * Uses the same comprehensive approach as shared link loading
     * @param {string} name - Name of the agent to apply
     * @returns {Promise<boolean>} True if successful
     */
    async function applyAgent(name) {
        try {
            const agent = loadAgent(name);
            if (!agent) {
                console.error(`Cannot apply agent "${name}" - not found`);
                return false;
            }
            
            // Use SharedLinkDataProcessor for comprehensive configuration application
            // This ensures the same processing as shared links, including MCP auto-reconnection
            const systemMessages = [];
            const collectSystemMessage = (message) => {
                systemMessages.push({ role: 'system', content: message });
                console.log(`Agent "${name}": ${message}`);
            };
            
            // Reset model manager memory state by forcing a timestamp update
            // This ensures the timestamp check will favor storage over memory
            console.log('🔄 Forcing model manager timestamp update to prevent memory conflicts');
            const timestamp = Date.now();
            window.CoreStorageService.setValue(window.NamespaceService.BASE_STORAGE_KEYS.MODEL_LAST_UPDATED, timestamp.toString());
            
            // Convert agent config to shared data format
            const sharedData = convertAgentConfigToSharedDataFormat(agent.config);
            
            // Apply configuration using the same processor as shared links
            // Use cleanSlate=true to prepare state using selective function enable/disable
            await SharedLinkDataProcessor.processSharedData(
                sharedData,
                '', // No password needed for agents
                {
                    addSystemMessage: collectSystemMessage,
                    setMessages: null, // Don't override chat messages for agents
                    elements: {}, // No UI elements needed
                    displayWelcomeMessage: false, // Don't display welcome messages for agents
                    cleanSlate: true // Clear previous state for clean agent loading
                }
            );
            
            console.log(`Agent "${name}" configuration applied successfully`);
            return true;
            
        } catch (error) {
            console.error('Error applying agent configuration:', error);
            return false;
        }
    }
    
    /**
     * Fast agent application bypassing UI-heavy processing
     * Optimized for rapid agent switching and multi-agent orchestration
     * @param {string} name - Name of the agent to apply
     * @param {Object} options - Fast loading options
     * @param {boolean} options.useCache - Use cached configuration if available (default: true)
     * @param {boolean} options.differential - Only apply changed sections (default: true)
     * @param {boolean} options.silent - Suppress console logging (default: false)
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise<boolean>} True if successful
     */
    async function applyAgentFast(name, options = {}) {
        const startTime = performance.now();
        const opts = {
            useCache: true,
            differential: true,
            silent: false,
            onProgress: null,
            ...options
        };
        
        try {
            if (!opts.silent) {
                console.log(`🚀 FastAgent: Starting optimized loading of "${name}"`);
            }
            
            opts.onProgress?.('loading', 'Loading agent configuration...');
            
            // Try to get cached configuration first
            let agentConfig = null;
            if (opts.useCache && window.AgentCache) {
                agentConfig = window.AgentCache.getCachedConfiguration(name);
            }
            
            // Load from storage if not cached
            if (!agentConfig) {
                const agent = loadAgent(name);
                if (!agent) {
                    console.error(`FastAgent: Cannot apply agent "${name}" - not found`);
                    return false;
                }
                agentConfig = agent.config;
                
                // Cache the configuration for future use
                if (window.AgentCache) {
                    window.AgentCache.cacheConfiguration(name, agentConfig);
                }
            }
            
            opts.onProgress?.('applying', 'Applying agent context...');
            
            // ALWAYS use AgentContextManager for agent switching (bypass differential loading for context)
            const contextManager = getContextManager();
            if (contextManager) {
                console.log(`🎯 AgentContextManager: Switching to "${name}" (always applied for context isolation)`);
                contextManager.switchToAgent(name, agentConfig);
                
                // Update cache and complete
                if (window.AgentCache) {
                    window.AgentCache.cacheCurrentState(name);
                }
                
                const loadTime = performance.now() - startTime;
                if (!opts.silent) {
                    console.log(`✅ FastAgent: "${name}" context applied in ${loadTime.toFixed(2)}ms`);
                }
                opts.onProgress?.('completed', `Agent "${name}" context loaded in ${loadTime.toFixed(0)}ms`);
                return true;
            }
            
            // Fallback: If no context manager, use differential loading for direct configuration
            opts.onProgress?.('analyzing', 'Analyzing state differences...');
            let sections = { llm: true, functions: true, mcp: true, prompts: true };
            if (opts.differential && window.AgentCache) {
                const currentState = window.AgentCache.getCurrentStateSnapshot();
                const targetState = convertConfigToStateSnapshot(agentConfig);
                const differences = window.AgentCache.compareStates(currentState, targetState);
                
                if (!differences.hasChanges) {
                    if (!opts.silent) {
                        console.log(`⚡ FastAgent: "${name}" already applied (no changes needed) - ${(performance.now() - startTime).toFixed(2)}ms`);
                    }
                    return true;
                }
                
                sections = differences.sections;
                if (!opts.silent) {
                    const changedSections = Object.keys(sections).filter(k => sections[k]);
                    console.log(`🔄 FastAgent: Applying changes to sections: ${changedSections.join(', ')}`);
                }
            }
            
            opts.onProgress?.('applying', 'Applying configuration...');
            // Fallback to direct configuration application
            await applyConfigurationDirect(agentConfig, sections, opts);
            
            // Cache the current state after successful application
            if (window.AgentCache) {
                window.AgentCache.cacheCurrentState(name);
            }
            
            const loadTime = performance.now() - startTime;
            if (!opts.silent) {
                console.log(`✅ FastAgent: "${name}" applied successfully in ${loadTime.toFixed(2)}ms`);
            }
            
            opts.onProgress?.('completed', `Agent "${name}" loaded in ${loadTime.toFixed(0)}ms`);
            return true;
            
        } catch (error) {
            console.error(`❌ FastAgent: Error applying agent "${name}":`, error);
            opts.onProgress?.('error', `Failed to load agent: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Apply agent configuration directly to services without UI processing
     * @param {Object} config - Agent configuration
     * @param {Object} sections - Which sections to apply
     * @param {Object} options - Application options
     * @private
     */
    async function applyConfigurationDirect(config, sections, options = {}) {
        // Apply LLM configuration
        if (sections.llm && config.llm) {
            if (config.llm.apiKey && DataService?.saveApiKey) {
                DataService.saveApiKey(config.llm.apiKey);
            }
            if (config.llm.model && DataService?.saveModel) {
                DataService.saveModel(config.llm.model);
            }
            if (config.llm.baseUrl && DataService?.saveBaseUrl) {
                DataService.saveBaseUrl(config.llm.baseUrl);
            }
            if (config.llm.provider && DataService?.saveBaseUrlProvider) {
                DataService.saveBaseUrlProvider(config.llm.provider);
            }
            
            // Reset model manager memory to prevent conflicts
            if (window.ModelManager?.resetMemoryState) {
                window.ModelManager.resetMemoryState();
            }
        }
        
        // Apply function configuration
        if (sections.functions && config.functions) {
            // Add functions to registry if provided
            if (config.functions.library && typeof config.functions.library === 'object') {
                Object.keys(config.functions.library).forEach(functionName => {
                    const functionData = config.functions.library[functionName];
                    const collectionId = config.functions.collections?.[functionName];
                    const metadata = collectionId ? config.functions.collectionMetadata?.[collectionId] : null;
                    
                    if (window.FunctionToolsService?.addJsFunction) {
                        window.FunctionToolsService.addJsFunction(
                            functionName,
                            functionData.code,
                            functionData.toolDefinition,
                            collectionId,
                            metadata
                        );
                    }
                });
            }
            
            // Apply enabled functions selectively
            if (config.functions.enabled && Array.isArray(config.functions.enabled) && window.FunctionToolsService) {
                const allFunctions = Object.keys(window.FunctionToolsService.getJsFunctions?.() || {});
                
                // Disable functions not needed by this agent
                allFunctions.forEach(functionName => {
                    const shouldBeEnabled = config.functions.enabled.includes(functionName);
                    const isCurrentlyEnabled = window.FunctionToolsService.isJsFunctionEnabled?.(functionName);
                    
                    if (shouldBeEnabled && !isCurrentlyEnabled) {
                        window.FunctionToolsService.enableJsFunction?.(functionName);
                    } else if (!shouldBeEnabled && isCurrentlyEnabled) {
                        window.FunctionToolsService.disableJsFunction?.(functionName);
                    }
                });
            }
            
            // Apply function tools enabled state
            if (typeof config.functions.toolsEnabled === 'boolean' && window.FunctionToolsService?.setFunctionToolsEnabled) {
                window.FunctionToolsService.setFunctionToolsEnabled(config.functions.toolsEnabled);
            }
        }
        
        // Apply prompt configuration
        if (sections.prompts && config.prompts) {
            // Apply prompt library
            if (config.prompts.library && PromptsService?.savePrompt) {
                Object.values(config.prompts.library).forEach(prompt => {
                    PromptsService.savePrompt(prompt);
                });
            }
            
            // Apply selected prompt IDs
            if (config.prompts.selectedIds && PromptsService?.setSelectedPromptIds) {
                PromptsService.setSelectedPromptIds(config.prompts.selectedIds);
            }
            
            // Apply selected default prompt IDs
            if (config.prompts.selectedDefaultIds && window.DefaultPromptsService?.setSelectedDefaultPromptIds) {
                window.DefaultPromptsService.setSelectedDefaultPromptIds(config.prompts.selectedDefaultIds);
            }
            
            // Apply selected prompts as system prompt
            if ((config.prompts.selectedIds?.length > 0 || config.prompts.selectedDefaultIds?.length > 0) && 
                PromptsService?.applySelectedPromptsAsSystem) {
                PromptsService.applySelectedPromptsAsSystem();
            }
        }
        
        // Apply MCP configuration
        if (sections.mcp && config.mcp?.connections) {
            const connections = config.mcp.connections;
            
            for (const [serviceKey, connectionData] of Object.entries(connections)) {
                // Extract token from connection data
                let token = connectionData;
                if (typeof connectionData === 'object' && connectionData?.token) {
                    token = connectionData.token;
                }
                
                if (typeof token === 'string' && window.CoreStorageService?.setValue) {
                    const storageKey = `mcp_${serviceKey}_token`;
                    await window.CoreStorageService.setValue(storageKey, token);
                    
                    // Auto-reconnect to service if available
                    if (serviceKey === 'github' && window.MCPServiceConnectors?.quickConnect) {
                        try {
                            // Small delay to ensure storage is committed
                            setTimeout(async () => {
                                await window.MCPServiceConnectors.quickConnect('github');
                            }, 50);
                        } catch (error) {
                            if (!options.silent) {
                                console.warn(`FastAgent: Failed to auto-reconnect ${serviceKey}:`, error);
                            }
                        }
                    }
                }
            }
        }
        
        // Apply system prompt if in chat config
        if (config.chat?.systemPrompt && DataService?.saveSystemPrompt) {
            DataService.saveSystemPrompt(config.chat.systemPrompt);
        }
    }
    
    /**
     * Convert agent configuration to state snapshot format for comparison
     * @param {Object} config - Agent configuration
     * @returns {Object} State snapshot
     * @private
     */
    function convertConfigToStateSnapshot(config) {
        const state = {};
        
        if (config.llm) {
            state.llm = {
                apiKey: config.llm.apiKey || null,
                model: config.llm.model || null,
                baseUrl: config.llm.baseUrl || null,
                provider: config.llm.provider || null
            };
        }
        
        if (config.functions) {
            state.functions = {
                enabled: config.functions.enabled || [],
                toolsEnabled: config.functions.toolsEnabled || false,
                library: config.functions.library ? Object.keys(config.functions.library) : []
            };
        }
        
        if (config.mcp?.connections) {
            state.mcp = {
                connectedServices: Object.keys(config.mcp.connections)
            };
        }
        
        if (config.prompts) {
            state.prompts = {
                selectedIds: config.prompts.selectedIds || [],
                librarySize: config.prompts.library ? Object.keys(config.prompts.library).length : 0
            };
        }
        
        return state;
    }
    
    /**
     * Preload an agent configuration in the background for instant switching
     * @param {string} name - Name of the agent to preload
     * @param {number} priority - Priority level (higher = more important)
     * @returns {Promise<boolean>} True if successful
     */
    async function preloadAgent(name, priority = 1) {
        try {
            if (!window.AgentCache) {
                console.warn('FastAgent: AgentCache not available for preloading');
                return false;
            }
            
            // Check if already cached
            if (window.AgentCache.getCachedConfiguration(name)) {
                console.log(`FastAgent: "${name}" already preloaded`);
                return true;
            }
            
            // Queue for background preloading
            window.AgentCache.queueForPreload(name, priority);
            return true;
            
        } catch (error) {
            console.error(`FastAgent: Error preloading agent "${name}":`, error);
            return false;
        }
    }
    
    /**
     * Convert agent configuration to shared data format for processing
     * @param {Object} agentConfig - Agent configuration object
     * @returns {Object} Shared data format
     * @private
     */
    function convertAgentConfigToSharedDataFormat(agentConfig) {
        const sharedData = {};
        
        // Convert LLM configuration
        if (agentConfig.llm) {
            if (agentConfig.llm.apiKey) sharedData.apiKey = agentConfig.llm.apiKey;
            if (agentConfig.llm.model) sharedData.model = agentConfig.llm.model;
            if (agentConfig.llm.baseUrl) sharedData.baseUrl = agentConfig.llm.baseUrl;
            if (agentConfig.llm.provider) sharedData.provider = agentConfig.llm.provider;
        }
        
        // Convert chat configuration
        if (agentConfig.chat) {
            if (agentConfig.chat.systemPrompt) sharedData.systemPrompt = agentConfig.chat.systemPrompt;
            // Don't include messages for agent loading to avoid overriding current chat
        }
        
        // Convert prompts configuration  
        if (agentConfig.prompts) {
            if (agentConfig.prompts.library) sharedData.prompts = Object.values(agentConfig.prompts.library);
            if (agentConfig.prompts.selectedIds) sharedData.selectedPromptIds = agentConfig.prompts.selectedIds;
            if (agentConfig.prompts.selectedDefaultIds) sharedData.selectedDefaultPromptIds = agentConfig.prompts.selectedDefaultIds;
        }
        
        // Convert functions configuration
        if (agentConfig.functions) {
            if (agentConfig.functions.library) sharedData.functions = agentConfig.functions.library;
            if (agentConfig.functions.enabled) sharedData.enabledFunctions = agentConfig.functions.enabled;
            if (agentConfig.functions.collections) sharedData.functionCollections = agentConfig.functions.collections;
            if (agentConfig.functions.collectionMetadata) sharedData.functionCollectionMetadata = agentConfig.functions.collectionMetadata;
            if (typeof agentConfig.functions.toolsEnabled === 'boolean') sharedData.functionToolsEnabled = agentConfig.functions.toolsEnabled;
        }
        
        // Convert MCP configuration
        if (agentConfig.mcp && agentConfig.mcp.connections) {
            sharedData.mcpConnections = agentConfig.mcp.connections;
        }
        
        return sharedData;
    }
    
    /**
     * Create an agent from current application state
     * @param {string} name - Name for the new agent
     * @param {Object} options - Options for configuration collection and agent metadata
     * @returns {boolean} True if successful
     */
    function createAgentFromCurrentState(name, options = {}) {
        try {
            // Collect current configuration
            const config = ConfigurationService.collectCurrentConfiguration(options);
            
            // Save as agent
            return saveAgent(name, config, options);
            
        } catch (error) {
            console.error('Error creating agent from current state:', error);
            return false;
        }
    }
    
    /**
     * Update agent metadata (counts, statistics, etc.)
     * @private
     */
    function updateAgentMetadata() {
        try {
            const agents = getAllAgents();
            const agentNames = Object.keys(agents);
            
            const metadata = {
                totalAgents: agentNames.length,
                agentTypes: {},
                lastUpdated: new Date().toISOString(),
                namespace: NamespaceService.getNamespace()
            };
            
            // Count by agent type
            agentNames.forEach(name => {
                const agent = agents[name];
                const type = agent.agentType || 'general';
                metadata.agentTypes[type] = (metadata.agentTypes[type] || 0) + 1;
            });
            
            // Save metadata
            CoreStorageService.setValue(NamespaceService.BASE_STORAGE_KEYS.AGENT_METADATA, metadata);
            
        } catch (error) {
            console.error('Error updating agent metadata:', error);
        }
    }
    
    /**
     * Get agent metadata
     * @returns {Object} Agent metadata object
     */
    function getAgentMetadata() {
        try {
            const metadata = CoreStorageService.getValue(NamespaceService.BASE_STORAGE_KEYS.AGENT_METADATA);
            return metadata || {
                totalAgents: 0,
                agentTypes: {},
                lastUpdated: null,
                namespace: NamespaceService.getNamespace()
            };
        } catch (error) {
            console.error('Error getting agent metadata:', error);
            return {
                totalAgents: 0,
                agentTypes: {},
                lastUpdated: null,
                namespace: NamespaceService.getNamespace()
            };
        }
    }
    
    /**
     * Export all agents for backup or sharing
     * @returns {Object} All agents data
     */
    function exportAgents() {
        try {
            const agents = getAllAgents();
            const metadata = getAgentMetadata();
            
            return {
                agents: agents,
                metadata: metadata,
                exportedAt: new Date().toISOString(),
                namespace: NamespaceService.getNamespace()
            };
        } catch (error) {
            console.error('Error exporting agents:', error);
            return null;
        }
    }
    
    /**
     * Import agents from backup data
     * @param {Object} exportData - Data from exportAgents()
     * @param {boolean} merge - Whether to merge with existing agents or replace
     * @returns {boolean} True if successful
     */
    function importAgents(exportData, merge = true) {
        try {
            if (!exportData || !exportData.agents) {
                console.error('Invalid export data for import');
                return false;
            }
            
            let agents;
            if (merge) {
                // Merge with existing agents
                agents = getAllAgents();
                Object.assign(agents, exportData.agents);
            } else {
                // Replace all agents
                agents = exportData.agents;
            }
            
            // Save imported agents
            const success = CoreStorageService.setValue(NamespaceService.BASE_STORAGE_KEYS.SAVED_AGENTS, agents);
            
            if (success) {
                updateAgentMetadata();
                console.log(`Successfully imported ${Object.keys(exportData.agents).length} agents`);
                return true;
            } else {
                console.error('Failed to save imported agents');
                return false;
            }
            
        } catch (error) {
            console.error('Error importing agents:', error);
            return false;
        }
    }

    /**
     * Restore global configuration (exit agent mode)
     */
    function restoreGlobalConfiguration() {
        const contextManager = getContextManager();
        return contextManager ? contextManager.restoreGlobalConfiguration() : false;
    }

    /**
     * Check if currently in agent context
     */
    function isInAgentContext() {
        const contextManager = getContextManager();
        return contextManager ? contextManager.isInAgentContext() : false;
    }

    /**
     * Get current agent context info
     */
    function getCurrentAgentContext() {
        const contextManager = getContextManager();
        return contextManager ? contextManager.getCurrentContext() : null;
    }

    /**
     * Get the current agent's system prompt
     * Returns agent-specific prompt if in agent context
     */
    function getCurrentAgentSystemPrompt() {
        const contextManager = getContextManager();
        return contextManager ? contextManager.getCurrentSystemPrompt() : localStorage.getItem('system_prompt') || '';
    }
    
    // Public API
    return {
        saveAgent: saveAgent,
        loadAgent: loadAgent,
        getAllAgents: getAllAgents,
        listAgents: listAgents,
        deleteAgent: deleteAgent,
        agentExists: agentExists,
        updateAgent: updateAgent,
        applyAgent: applyAgent,
        applyAgentFast: applyAgentFast,
        preloadAgent: preloadAgent,
        createAgentFromCurrentState: createAgentFromCurrentState,
        getAgentMetadata: getAgentMetadata,
        exportAgents: exportAgents,
        importAgents: importAgents,
        restoreGlobalConfiguration: restoreGlobalConfiguration,
        isInAgentContext: isInAgentContext,
        getCurrentAgentContext: getCurrentAgentContext,
        getCurrentAgentSystemPrompt: getCurrentAgentSystemPrompt
    };
})();