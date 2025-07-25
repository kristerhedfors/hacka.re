/**
 * AgentContextManager - Manages isolated configuration contexts for agents
 * 
 * This service provides configuration isolation so agents can have their own
 * settings without affecting the global hacka.re configuration.
 */

window.AgentContextManager = (function() {
    
    
    let originalGlobalConfig = null;
    let currentAgentContext = null;
    const agentContexts = new Map();
    let isAgentActive = false;

    /**
     * Capture the current global configuration before agent activation
     */
    function captureGlobalConfiguration() {
        if (originalGlobalConfig) {
            return; // Already captured
        }

        
        originalGlobalConfig = {
            // API Configuration
            apiKey: localStorage.getItem('openai_api_key'),
            model: localStorage.getItem('selected_model'),
            apiEndpoint: localStorage.getItem('api_endpoint'),
            provider: localStorage.getItem('selected_provider'),
            
            // Function Tools
            functionToolsEnabled: localStorage.getItem('function_tools_enabled'),
            enabledFunctions: localStorage.getItem('enabled_functions'),
            
            // MCP Services
            mcpServices: localStorage.getItem('mcp_services'),
            mcpConnections: localStorage.getItem('mcp_connections'),
            
            // System Prompt
            systemPrompt: localStorage.getItem('system_prompt'),
            selectedPrompts: localStorage.getItem('selected_prompts'),
            
            // Other settings
            temperature: localStorage.getItem('temperature'),
            maxTokens: localStorage.getItem('max_tokens'),
            streamingEnabled: localStorage.getItem('streaming_enabled')
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
     * Apply configuration to storage with tracking
     */
    function applyContextToStorage(config, context) {
        const appliedSettings = {};

        // Apply LLM configuration
        if (config.llm) {
            if (config.llm.apiKey) {
                appliedSettings.apiKey = localStorage.getItem('openai_api_key');
                localStorage.setItem('openai_api_key', config.llm.apiKey);
            }
            if (config.llm.model) {
                appliedSettings.model = localStorage.getItem('selected_model');
                localStorage.setItem('selected_model', config.llm.model);
            }
            if (config.llm.provider) {
                appliedSettings.provider = localStorage.getItem('selected_provider');
                localStorage.setItem('selected_provider', config.llm.provider);
            }
            if (config.llm.endpoint) {
                appliedSettings.apiEndpoint = localStorage.getItem('api_endpoint');
                localStorage.setItem('api_endpoint', config.llm.endpoint);
            }
            if (config.llm.temperature !== undefined) {
                appliedSettings.temperature = localStorage.getItem('temperature');
                localStorage.setItem('temperature', config.llm.temperature.toString());
            }
            if (config.llm.maxTokens) {
                appliedSettings.maxTokens = localStorage.getItem('max_tokens');
                localStorage.setItem('max_tokens', config.llm.maxTokens.toString());
            }
        }

        // Apply function tools configuration
        if (config.functionCalling) {
            if (config.functionCalling.enabled !== undefined) {
                appliedSettings.functionToolsEnabled = localStorage.getItem('function_tools_enabled');
                localStorage.setItem('function_tools_enabled', config.functionCalling.enabled.toString());
            }
            if (config.functionCalling.functions) {
                appliedSettings.enabledFunctions = localStorage.getItem('enabled_functions');
                localStorage.setItem('enabled_functions', JSON.stringify(config.functionCalling.functions));
            }
        }

        // Apply MCP configuration
        if (config.mcp) {
            if (config.mcp.services) {
                appliedSettings.mcpServices = localStorage.getItem('mcp_services');
                localStorage.setItem('mcp_services', JSON.stringify(config.mcp.services));
            }
        }

        // Apply system prompt
        if (config.systemPrompt) {
            appliedSettings.systemPrompt = localStorage.getItem('system_prompt');
            localStorage.setItem('system_prompt', config.systemPrompt);
        }

        // Apply prompts configuration
        if (config.prompts) {
            appliedSettings.selectedPrompts = localStorage.getItem('selected_prompts');
            localStorage.setItem('selected_prompts', JSON.stringify(config.prompts));
        }

        // Store what we changed for restoration
        context.appliedSettings = appliedSettings;
        
    }

    /**
     * Restore global configuration when leaving agent mode
     */
    function restoreGlobalConfiguration() {
        if (!originalGlobalConfig || !isAgentActive) {
            return false;
        }

        
        // Restore all original values
        Object.entries(originalGlobalConfig).forEach(([key, value]) => {
            if (value !== null) {
                localStorage.setItem(mapConfigKeyToStorageKey(key), value);
            } else {
                localStorage.removeItem(mapConfigKeyToStorageKey(key));
            }
        });

        currentAgentContext = null;
        isAgentActive = false;
        
        return true;
    }

    /**
     * Map configuration keys to localStorage keys
     */
    function mapConfigKeyToStorageKey(configKey) {
        const mapping = {
            apiKey: 'openai_api_key',
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
     * Get context-aware setting value
     * Returns agent-specific value if in agent context, otherwise global value
     */
    function getContextAwareSetting(key) {
        if (isInAgentContext()) {
            const storageKey = mapConfigKeyToStorageKey(key);
            return localStorage.getItem(storageKey);
        }
        return localStorage.getItem(key);
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
        // Return global system prompt
        return localStorage.getItem('system_prompt') || '';
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