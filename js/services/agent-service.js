/**
 * Agent Service
 * Handles saving, loading, and managing agent configurations
 * All data is encrypted using CoreStorageService
 */

window.AgentService = (function() {
    
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
            
            // Create agent entry with metadata
            const agentEntry = {
                name: name,
                config: config,
                description: options.description || '',
                agentType: options.agentType || 'general',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                namespace: NamespaceService.getNamespace()
            };
            
            // Add to agents list
            existingAgents[name] = agentEntry;
            
            // Save encrypted to storage
            const success = CoreStorageService.setValue(NamespaceService.BASE_STORAGE_KEYS.SAVED_AGENTS, existingAgents);
            
            if (success) {
                console.log(`Agent "${name}" saved successfully`);
                
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
     * @param {string} name - Name of the agent to apply
     * @returns {boolean} True if successful
     */
    function applyAgent(name) {
        try {
            const agent = loadAgent(name);
            if (!agent) {
                console.error(`Cannot apply agent "${name}" - not found`);
                return false;
            }
            
            const success = ConfigurationService.applyConfiguration(agent.config);
            
            if (success) {
                console.log(`Agent "${name}" configuration applied successfully`);
                return true;
            } else {
                console.error(`Failed to apply agent "${name}" configuration`);
                return false;
            }
            
        } catch (error) {
            console.error('Error applying agent configuration:', error);
            return false;
        }
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
        createAgentFromCurrentState: createAgentFromCurrentState,
        getAgentMetadata: getAgentMetadata,
        exportAgents: exportAgents,
        importAgents: importAgents
    };
})();