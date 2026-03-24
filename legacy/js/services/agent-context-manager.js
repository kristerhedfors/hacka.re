/**
 * AgentContextManager - Manages isolated configuration contexts for agents
 * 
 * This service provides configuration isolation so agents can have their own
 * settings without affecting the global hacka.re configuration.
 * 
 * SECURITY: This service has been updated to use the encrypted storage service
 * instead of direct localStorage access to protect sensitive data like API keys.
 */

window.AgentContextManager = (function() {
    
    
    let originalGlobalConfig = null;
    let currentAgentContext = null;
    const agentContexts = new Map();
    let isAgentActive = false;

    /**
     * Get the storage service for secure data access
     */
    function getStorageService() {
        return window.StorageService || window.CoreStorageService;
    }

    /**
     * Capture the current global configuration before agent activation
     * Uses encrypted storage service instead of direct localStorage access
     */
    function captureGlobalConfiguration() {
        if (originalGlobalConfig) {
            return; // Already captured
        }

        const storage = getStorageService();
        if (!storage) {
            console.error('[AgentContextManager] Storage service not available');
            return;
        }
        
        originalGlobalConfig = {
            // API Configuration - now using encrypted storage
            apiKey: storage.getItem('api_key'),
            model: storage.getItem('selected_model'),
            apiEndpoint: storage.getItem('api_endpoint'),
            provider: storage.getItem('selected_provider'),
            
            // Function Tools
            functionToolsEnabled: storage.getItem('function_tools_enabled'),
            enabledFunctions: storage.getItem('enabled_functions'),
            
            // MCP Services
            mcpServices: storage.getItem('mcp_services'),
            mcpConnections: storage.getItem('mcp_connections'),
            
            // System Prompt
            systemPrompt: storage.getItem('system_prompt'),
            selectedPrompts: storage.getItem('selected_prompts'),
            
            // Other settings
            temperature: storage.getItem('temperature'),
            maxTokens: storage.getItem('max_tokens'),
            streamingEnabled: storage.getItem('streaming_enabled')
        };
    }

    /**
     * Create an isolated context for an agent
     */
    function createAgentContext(agentId, agentConfig) {
        
        const context = {
            agentId,
            config: JSON.parse(JSON.stringify(agentConfig)), // Deep clone
            appliedSettings: {},
            timestamp: Date.now()
        };
        
        agentContexts.set(agentId, context);
        return context;
    }

    /**
     * Apply agent configuration to isolated context (not global storage)
     */
    function applyAgentContext(agentId, agentConfig) {
        if (!originalGlobalConfig) {
            captureGlobalConfiguration();
        }

        
        // Create or update agent context
        const context = createAgentContext(agentId, agentConfig);
        currentAgentContext = context;
        isAgentActive = true;

        // Apply agent settings to localStorage (temporarily)
        applyContextToStorage(agentConfig, context);
        
        return context;
    }

    /**
     * Apply configuration to storage with tracking - USING ENCRYPTED STORAGE
     */
    function applyContextToStorage(config, context) {
        const storage = getStorageService();
        if (!storage) {
            console.error('[AgentContextManager] Storage service not available for applying context');
            return;
        }

        const appliedSettings = {};

        // Apply LLM configuration using encrypted storage
        if (config.llm) {
            if (config.llm.apiKey) {
                appliedSettings.apiKey = storage.getItem('api_key');
                storage.setItem('api_key', config.llm.apiKey);
            }
            if (config.llm.model) {
                appliedSettings.model = storage.getItem('selected_model');
                storage.setItem('selected_model', config.llm.model);
            }
            if (config.llm.provider) {
                appliedSettings.provider = storage.getItem('selected_provider');
                storage.setItem('selected_provider', config.llm.provider);
            }
            if (config.llm.endpoint) {
                appliedSettings.apiEndpoint = storage.getItem('api_endpoint');
                storage.setItem('api_endpoint', config.llm.endpoint);
            }
            if (config.llm.temperature !== undefined) {
                appliedSettings.temperature = storage.getItem('temperature');
                storage.setItem('temperature', config.llm.temperature.toString());
            }
            if (config.llm.maxTokens) {
                appliedSettings.maxTokens = storage.getItem('max_tokens');
                storage.setItem('max_tokens', config.llm.maxTokens.toString());
            }
        }

        // Apply function tools configuration
        if (config.functionCalling) {
            if (config.functionCalling.enabled !== undefined) {
                appliedSettings.functionToolsEnabled = storage.getItem('function_tools_enabled');
                storage.setItem('function_tools_enabled', config.functionCalling.enabled.toString());
            }
            if (config.functionCalling.functions) {
                appliedSettings.enabledFunctions = storage.getItem('enabled_functions');
                storage.setItem('enabled_functions', JSON.stringify(config.functionCalling.functions));
            }
        }

        // Apply MCP configuration
        if (config.mcp) {
            if (config.mcp.services) {
                appliedSettings.mcpServices = storage.getItem('mcp_services');
                storage.setItem('mcp_services', JSON.stringify(config.mcp.services));
            }
        }

        // Apply system prompt
        if (config.systemPrompt) {
            appliedSettings.systemPrompt = storage.getItem('system_prompt');
            storage.setItem('system_prompt', config.systemPrompt);
        }

        // Apply prompts configuration
        if (config.prompts) {
            appliedSettings.selectedPrompts = storage.getItem('selected_prompts');
            storage.setItem('selected_prompts', JSON.stringify(config.prompts));
        }

        // Store what we changed for restoration
        context.appliedSettings = appliedSettings;
        
    }

    /**
     * Restore global configuration when leaving agent mode - USING ENCRYPTED STORAGE
     */
    function restoreGlobalConfiguration() {
        if (!originalGlobalConfig || !isAgentActive) {
            return false;
        }

        const storage = getStorageService();
        if (!storage) {
            console.error('[AgentContextManager] Storage service not available for restoration');
            return false;
        }
        
        // Restore all original values using encrypted storage
        Object.entries(originalGlobalConfig).forEach(([key, value]) => {
            const storageKey = mapConfigKeyToStorageKey(key);
            if (value !== null) {
                storage.setItem(storageKey, value);
            } else {
                storage.removeItem(storageKey);
            }
        });

        currentAgentContext = null;
        isAgentActive = false;
        
        return true;
    }

    /**
     * Map configuration keys to storage service keys (encrypted)
     */
    function mapConfigKeyToStorageKey(configKey) {
        const mapping = {
            apiKey: 'api_key',  // Changed from 'openai_api_key' to use encrypted storage key
            model: 'selected_model',
            apiEndpoint: 'api_endpoint',
            provider: 'selected_provider',
            functionToolsEnabled: 'function_tools_enabled',
            enabledFunctions: 'enabled_functions',
            mcpServices: 'mcp_services',
            mcpConnections: 'mcp_connections',
            systemPrompt: 'system_prompt',
            selectedPrompts: 'selected_prompts',
            temperature: 'temperature',
            maxTokens: 'max_tokens',
            streamingEnabled: 'streaming_enabled'
        };
        return mapping[configKey] || configKey;
    }

    /**
     * Switch between agent contexts
     */
    function switchToAgent(agentId, agentConfig) {
        
        // If switching to a different agent, apply new context
        if (!currentAgentContext || currentAgentContext.agentId !== agentId) {
            return applyAgentContext(agentId, agentConfig);
        }
        
        // Already in correct context
        return currentAgentContext;
    }

    /**
     * Check if we're currently in an agent context
     */
    function isInAgentContext() {
        return isAgentActive && currentAgentContext !== null;
    }

    /**
     * Get current agent context info
     */
    function getCurrentContext() {
        return currentAgentContext;
    }

    /**
     * Clear all agent contexts (for cleanup)
     */
    function clearAllContexts() {
        restoreGlobalConfiguration();
        agentContexts.clear();
        originalGlobalConfig = null;
    }

    /**
     * Get context-aware setting value - USING ENCRYPTED STORAGE
     * Returns agent-specific value if in agent context, otherwise global value
     */
    function getContextAwareSetting(key) {
        const storage = getStorageService();
        if (!storage) {
            console.error('[AgentContextManager] Storage service not available for getting setting');
            return null;
        }

        if (isInAgentContext()) {
            const storageKey = mapConfigKeyToStorageKey(key);
            return storage.getItem(storageKey);
        }
        return storage.getItem(key);
    }

    /**
     * Get the current agent's system prompt
     * Returns agent-specific prompt if in agent context, otherwise global prompt
     */
    function getCurrentSystemPrompt() {
        if (isInAgentContext() && currentAgentContext) {
            // Return the agent's system prompt from its configuration
            const agentConfig = currentAgentContext.config;
            
            // Try systemPrompt field first
            if (agentConfig.systemPrompt) {
                return agentConfig.systemPrompt;
            }
            
            // Try prompts.selectedIds for backward compatibility
            if (agentConfig.prompts && agentConfig.prompts.selectedIds) {
                // Get the actual prompt text from the prompts service
                if (window.PromptsService && window.PromptsService.getPromptById) {
                    const promptTexts = agentConfig.prompts.selectedIds.map(id => {
                        const prompt = window.PromptsService.getPromptById(id);
                        return prompt ? prompt.content : '';
                    }).filter(content => content);
                    
                    if (promptTexts.length > 0) {
                        const combinedPrompt = promptTexts.join('\n\n');
                        return combinedPrompt;
                    }
                }
            }
            
            return '';
        }
        // Return global system prompt using encrypted storage
        const storage = getStorageService();
        return storage ? storage.getItem('system_prompt') || '' : '';
    }

    /**
     * Get agent configuration without applying it
     * Used for retrieving agent settings without side effects
     */
    function getAgentConfiguration(agentId) {
        const context = agentContexts.get(agentId);
        return context ? context.config : null;
    }

    // Public API
    return {
        captureGlobalConfiguration: captureGlobalConfiguration,
        createAgentContext: createAgentContext,
        applyAgentContext: applyAgentContext,
        restoreGlobalConfiguration: restoreGlobalConfiguration,
        switchToAgent: switchToAgent,
        isInAgentContext: isInAgentContext,
        getCurrentContext: getCurrentContext,
        clearAllContexts: clearAllContexts,
        getContextAwareSetting: getContextAwareSetting,
        getCurrentSystemPrompt: getCurrentSystemPrompt,
        getAgentConfiguration: getAgentConfiguration
    };
})();