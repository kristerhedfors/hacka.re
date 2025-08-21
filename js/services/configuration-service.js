/**
 * Configuration Service
 * Handles collection and application of unified configuration objects
 * Used by both agent system and shared links
 */

window.ConfigurationService = (function() {
    
    /**
     * Collect all current application configuration into a unified object
     * @param {Object} options - Options for what to include
     * @param {boolean} options.includeLLMConfig - Include API key, model, etc.
     * @param {boolean} options.includePromptLibrary - Include prompt library data
     * @param {boolean} options.includeFunctionLibrary - Include function library data
     * @param {boolean} options.includeMcpConnections - Include MCP connection data
     * @param {boolean} options.includeChatData - Include chat messages and system prompt
     * @returns {Object} Unified configuration object
     */
    function collectCurrentConfiguration(options = {}) {
        const config = {};
        
        // Default to including everything
        const opts = {
            includeLLMConfig: true,
            includePromptLibrary: true,
            includeFunctionLibrary: true,
            includeMcpConnections: true,
            includeChatData: true,
            ...options
        };
        
        // Collect LLM configuration
        if (opts.includeLLMConfig) {
            config.llm = collectLLMConfiguration();
        }
        
        // Collect prompt library
        if (opts.includePromptLibrary) {
            config.prompts = collectPromptConfiguration();
        }
        
        // Collect function library
        if (opts.includeFunctionLibrary) {
            config.functions = collectFunctionConfiguration();
        }
        
        // Collect MCP connections
        if (opts.includeMcpConnections) {
            config.mcp = collectMCPConfiguration();
        }
        
        // Collect chat data
        if (opts.includeChatData) {
            config.chat = collectChatConfiguration();
        }
        
        // Add metadata
        config.metadata = {
            version: '1.0',
            createdAt: new Date().toISOString(),
            namespace: NamespaceService.getNamespace()
        };
        
        return config;
    }
    
    /**
     * Collect LLM configuration (API key, model, provider, etc.)
     * @returns {Object} LLM configuration
     */
    function collectLLMConfiguration() {
        const config = {};
        
        // Get API configuration
        if (DataService && typeof DataService.getApiKey === 'function') {
            config.apiKey = DataService.getApiKey();
        }
        
        if (DataService && typeof DataService.getModel === 'function') {
            config.model = DataService.getModel();
        }
        
        if (DataService && typeof DataService.getBaseUrl === 'function') {
            config.baseUrl = DataService.getBaseUrl();
        }
        
        if (DataService && typeof DataService.getBaseUrlProvider === 'function') {
            config.provider = DataService.getBaseUrlProvider();
        }
        
        return config;
    }
    
    /**
     * Collect prompt library configuration
     * @returns {Object} Prompt configuration
     */
    function collectPromptConfiguration() {
        const config = {};
        
        // Get prompts library (excluding MCP-derived prompts)
        if (PromptsService && typeof PromptsService.getPrompts === 'function') {
            const allPrompts = PromptsService.getPrompts();
            // Filter out MCP prompts - they should not be shared
            config.library = allPrompts.filter(prompt => !prompt.isMcpPrompt);
        }
        
        // Get selected prompt IDs
        if (PromptsService && typeof PromptsService.getSelectedPromptIds === 'function') {
            config.selectedIds = PromptsService.getSelectedPromptIds();
        }
        
        // Get selected default prompt IDs (excluding MCP prompts)
        if (window.DefaultPromptsService && typeof window.DefaultPromptsService.getSelectedDefaultPromptIds === 'function') {
            const allSelectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
            // Filter out MCP prompt IDs
            const mcpPromptIds = ['shodan-integration-guide', 'github-integration-guide', 'gmail-integration-guide'];
            config.selectedDefaultIds = allSelectedIds.filter(id => !mcpPromptIds.includes(id));
        }
        
        return config;
    }
    
    /**
     * Collect function library configuration
     * @returns {Object} Function configuration
     */
    function collectFunctionConfiguration() {
        const config = {};
        
        // Identify MCP collections first
        const mcpCollectionIds = [];
        if (window.FunctionToolsService && typeof window.FunctionToolsService.getAllFunctionCollections === 'function') {
            const allCollections = window.FunctionToolsService.getAllFunctionCollections();
            Object.values(allCollections).forEach(collection => {
                const isMcpCollection = collection.metadata.source === 'mcp' || 
                                      collection.metadata.source === 'mcp-service' ||
                                      collection.id.startsWith('mcp_');
                if (isMcpCollection) {
                    mcpCollectionIds.push(collection.id);
                }
            });
        }
        
        // Get functions library (excluding MCP functions)
        if (window.FunctionToolsService && typeof window.FunctionToolsService.getJsFunctions === 'function') {
            const allFunctions = window.FunctionToolsService.getJsFunctions();
            const functionCollections = window.FunctionToolsService.getFunctionCollections ? 
                                       window.FunctionToolsService.getFunctionCollections() : {};
            
            const userFunctions = {};
            Object.entries(allFunctions).forEach(([funcName, funcSpec]) => {
                const collectionId = functionCollections[funcName];
                // Only include if not in an MCP collection
                if (!collectionId || !mcpCollectionIds.includes(collectionId)) {
                    userFunctions[funcName] = funcSpec;
                }
            });
            config.library = userFunctions;
        }
        
        // Get enabled function names (excluding MCP functions)
        if (window.FunctionToolsService && typeof window.FunctionToolsService.getEnabledFunctionNames === 'function') {
            const allEnabled = window.FunctionToolsService.getEnabledFunctionNames();
            const functionCollections = window.FunctionToolsService.getFunctionCollections ? 
                                       window.FunctionToolsService.getFunctionCollections() : {};
            
            config.enabled = allEnabled.filter(funcName => {
                const collectionId = functionCollections[funcName];
                return !collectionId || !mcpCollectionIds.includes(collectionId);
            });
        }
        
        // Get tools enabled status
        if (window.FunctionToolsService && typeof window.FunctionToolsService.isFunctionToolsEnabled === 'function') {
            config.toolsEnabled = window.FunctionToolsService.isFunctionToolsEnabled();
        }
        
        // Get function collections mapping (excluding MCP collections)
        if (window.FunctionToolsService && typeof window.FunctionToolsService.getFunctionCollections === 'function') {
            const allCollections = window.FunctionToolsService.getFunctionCollections();
            const userCollections = {};
            Object.entries(allCollections).forEach(([funcName, collectionId]) => {
                if (!mcpCollectionIds.includes(collectionId)) {
                    userCollections[funcName] = collectionId;
                }
            });
            config.collections = userCollections;
        }
        
        // Get collection metadata (excluding MCP collections)
        if (window.FunctionToolsService && typeof window.FunctionToolsService.getAllFunctionCollections === 'function') {
            const allCollections = window.FunctionToolsService.getAllFunctionCollections();
            config.collectionMetadata = {};
            Object.keys(allCollections).forEach(collectionId => {
                // Only include metadata for non-MCP collections
                if (!mcpCollectionIds.includes(collectionId) && allCollections[collectionId].metadata) {
                    config.collectionMetadata[collectionId] = allCollections[collectionId].metadata;
                }
            });
        }
        
        // Get default function selections (by reference only, not the actual functions)
        if (window.DefaultFunctionsService) {
            // Get selected default function collection IDs
            if (typeof window.DefaultFunctionsService.getSelectedDefaultFunctionIds === 'function') {
                config.selectedDefaultFunctionCollectionIds = window.DefaultFunctionsService.getSelectedDefaultFunctionIds();
            }
            
            // Get selected individual default function IDs  
            if (typeof window.DefaultFunctionsService.getSelectedIndividualFunctionIds === 'function') {
                config.selectedDefaultFunctionIds = window.DefaultFunctionsService.getSelectedIndividualFunctionIds();
            }
        }
        
        return config;
    }
    
    /**
     * Collect MCP connections configuration
     * @returns {Object} MCP configuration
     */
    function collectMCPConfiguration() {
        const config = {};
        
        // Get MCP connections - check various sources
        const connections = {};
        
        // Get GitHub token if available
        if (CoreStorageService && typeof CoreStorageService.getValue === 'function') {
            const githubToken = CoreStorageService.getValue('mcp_github_token');
            if (githubToken) {
                connections.github = { token: githubToken };
            }
            
            // Get Gmail OAuth if available
            const gmailOAuth = CoreStorageService.getValue('mcp_gmail_oauth');
            if (gmailOAuth) {
                connections.gmail = gmailOAuth;
            }
            
            // Get Shodan API key if available
            const shodanApiKey = CoreStorageService.getValue('shodan_api_key');
            if (shodanApiKey) {
                connections.shodan = { key: shodanApiKey };
            }
            
            // Get OAuth tokens if available
            const oauthTokens = CoreStorageService.getValue('mcp-oauth-tokens');
            if (oauthTokens && typeof oauthTokens === 'object') {
                Object.assign(connections, oauthTokens);
            }
        }
        
        config.connections = connections;
        
        return config;
    }
    
    /**
     * Collect chat configuration
     * @returns {Object} Chat configuration
     */
    function collectChatConfiguration() {
        const config = {};
        
        // Get system prompt
        if (DataService && typeof DataService.getSystemPrompt === 'function') {
            config.systemPrompt = DataService.getSystemPrompt();
        }
        
        // Get chat history/messages
        if (DataService && typeof DataService.getHistory === 'function') {
            config.messages = DataService.getHistory();
        }
        
        // Note: welcomeMessage is typically generated dynamically, not stored
        
        return config;
    }
    
    /**
     * Apply a configuration to the current application state
     * @param {Object} config - The configuration to apply
     * @returns {boolean} True if successful
     */
    function applyConfiguration(config) {
        try {
            if (!config || typeof config !== 'object') {
                console.error('Invalid configuration object');
                return false;
            }
            
            // Apply LLM configuration
            if (config.llm) {
                applyLLMConfiguration(config.llm);
            }
            
            // Apply prompt configuration
            if (config.prompts) {
                applyPromptConfiguration(config.prompts);
            }
            
            // Apply function configuration
            if (config.functions) {
                applyFunctionConfiguration(config.functions);
            }
            
            // Apply MCP configuration
            if (config.mcp) {
                applyMCPConfiguration(config.mcp);
            }
            
            // Apply chat configuration
            if (config.chat) {
                applyChatConfiguration(config.chat);
            }
            
            return true;
        } catch (error) {
            console.error('Error applying configuration:', error);
            return false;
        }
    }
    
    /**
     * Apply LLM configuration
     * @param {Object} llmConfig - LLM configuration
     */
    function applyLLMConfiguration(llmConfig) {
        if (!llmConfig) return;
        
        if (llmConfig.apiKey && DataService && typeof DataService.saveApiKey === 'function') {
            DataService.saveApiKey(llmConfig.apiKey);
        }
        
        if (llmConfig.model && DataService && typeof DataService.saveModel === 'function') {
            DataService.saveModel(llmConfig.model);
        }
        
        if (llmConfig.baseUrl && DataService && typeof DataService.saveBaseUrl === 'function') {
            DataService.saveBaseUrl(llmConfig.baseUrl);
        }
        
        if (llmConfig.provider && DataService && typeof DataService.saveBaseUrlProvider === 'function') {
            DataService.saveBaseUrlProvider(llmConfig.provider);
        }
    }
    
    /**
     * Apply prompt configuration
     * @param {Object} promptConfig - Prompt configuration
     */
    function applyPromptConfiguration(promptConfig) {
        if (!promptConfig) return;
        
        // Apply prompts library
        if (promptConfig.library && PromptsService && typeof PromptsService.setPrompts === 'function') {
            PromptsService.setPrompts(promptConfig.library);
        }
        
        // Apply selected prompt IDs
        if (promptConfig.selectedIds && PromptsService && typeof PromptsService.setSelectedPromptIds === 'function') {
            PromptsService.setSelectedPromptIds(promptConfig.selectedIds);
        }
        
        // Apply selected default prompt IDs
        if (promptConfig.selectedDefaultIds && window.DefaultPromptsService && typeof window.DefaultPromptsService.setSelectedDefaultPromptIds === 'function') {
            window.DefaultPromptsService.setSelectedDefaultPromptIds(promptConfig.selectedDefaultIds);
        }
    }
    
    /**
     * Apply function configuration
     * @param {Object} functionConfig - Function configuration
     */
    function applyFunctionConfiguration(functionConfig) {
        if (!functionConfig) return;
        
        // Apply functions library
        if (functionConfig.library && FunctionToolsService && typeof FunctionToolsService.setJsFunctions === 'function') {
            FunctionToolsService.setJsFunctions(functionConfig.library);
        }
        
        // Apply enabled functions
        if (functionConfig.enabled && FunctionToolsService && typeof FunctionToolsService.setEnabledFunctions === 'function') {
            FunctionToolsService.setEnabledFunctions(functionConfig.enabled);
        }
        
        // Apply tools enabled status
        if (typeof functionConfig.toolsEnabled === 'boolean' && FunctionToolsService && typeof FunctionToolsService.setToolsEnabled === 'function') {
            FunctionToolsService.setToolsEnabled(functionConfig.toolsEnabled);
        }
        
        // Apply default function selections
        if (window.DefaultFunctionsService) {
            // Apply selected default function collection IDs
            if (functionConfig.selectedDefaultFunctionCollectionIds && typeof window.DefaultFunctionsService.setSelectedDefaultFunctionIds === 'function') {
                window.DefaultFunctionsService.setSelectedDefaultFunctionIds(functionConfig.selectedDefaultFunctionCollectionIds);
            }
            
            // Apply selected individual default function IDs
            if (functionConfig.selectedDefaultFunctionIds && typeof window.DefaultFunctionsService.setSelectedIndividualFunctionIds === 'function') {
                window.DefaultFunctionsService.setSelectedIndividualFunctionIds(functionConfig.selectedDefaultFunctionIds);
                
                // Load the selected default functions into the system
                if (typeof window.DefaultFunctionsService.loadSelectedDefaultFunctions === 'function') {
                    window.DefaultFunctionsService.loadSelectedDefaultFunctions();
                }
            }
        }
    }
    
    /**
     * Apply MCP configuration
     * @param {Object} mcpConfig - MCP configuration
     */
    function applyMCPConfiguration(mcpConfig) {
        if (!mcpConfig || !mcpConfig.connections) return;
        
        const connections = mcpConfig.connections;
        
        // Apply GitHub token
        if (connections.github && connections.github.token && CoreStorageService && typeof CoreStorageService.setValue === 'function') {
            CoreStorageService.setValue('mcp_github_token', connections.github.token);
        }
        
        // Apply Gmail OAuth
        if (connections.gmail && CoreStorageService && typeof CoreStorageService.setValue === 'function') {
            CoreStorageService.setValue('mcp_gmail_oauth', connections.gmail);
        }
        
        // Apply Shodan API key
        if (connections.shodan && connections.shodan.key && CoreStorageService && typeof CoreStorageService.setValue === 'function') {
            CoreStorageService.setValue('shodan_api_key', connections.shodan.key);
        }
        
        // Apply other OAuth tokens
        const oauthTokens = {};
        Object.keys(connections).forEach(key => {
            if (key !== 'github' && key !== 'gmail' && key !== 'shodan') {
                oauthTokens[key] = connections[key];
            }
        });
        
        if (Object.keys(oauthTokens).length > 0 && CoreStorageService && typeof CoreStorageService.setValue === 'function') {
            CoreStorageService.setValue('mcp-oauth-tokens', oauthTokens);
        }
    }
    
    /**
     * Apply chat configuration
     * @param {Object} chatConfig - Chat configuration
     */
    function applyChatConfiguration(chatConfig) {
        if (!chatConfig) return;
        
        // Apply system prompt
        if (chatConfig.systemPrompt && DataService && typeof DataService.setSystemPrompt === 'function') {
            DataService.setSystemPrompt(chatConfig.systemPrompt);
        }
        
        // Apply messages/history
        if (chatConfig.messages && DataService && typeof DataService.setHistory === 'function') {
            DataService.setHistory(chatConfig.messages);
        }
    }
    
    /**
     * Validate a configuration object
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result with isValid and errors
     */
    function validateConfiguration(config) {
        const result = {
            isValid: true,
            errors: []
        };
        
        if (!config || typeof config !== 'object') {
            result.isValid = false;
            result.errors.push('Configuration must be an object');
            return result;
        }
        
        // Validate LLM config if present
        if (config.llm && typeof config.llm !== 'object') {
            result.isValid = false;
            result.errors.push('LLM configuration must be an object');
        }
        
        // Validate prompts config if present
        if (config.prompts && typeof config.prompts !== 'object') {
            result.isValid = false;
            result.errors.push('Prompts configuration must be an object');
        }
        
        // Validate functions config if present
        if (config.functions && typeof config.functions !== 'object') {
            result.isValid = false;
            result.errors.push('Functions configuration must be an object');
        }
        
        // Validate MCP config if present
        if (config.mcp && typeof config.mcp !== 'object') {
            result.isValid = false;
            result.errors.push('MCP configuration must be an object');
        }
        
        // Validate chat config if present
        if (config.chat && typeof config.chat !== 'object') {
            result.isValid = false;
            result.errors.push('Chat configuration must be an object');
        }
        
        return result;
    }
    
    // Public API
    return {
        collectCurrentConfiguration: collectCurrentConfiguration,
        collectLLMConfiguration: collectLLMConfiguration,
        collectPromptConfiguration: collectPromptConfiguration,
        collectFunctionConfiguration: collectFunctionConfiguration,
        collectMCPConfiguration: collectMCPConfiguration,
        collectChatConfiguration: collectChatConfiguration,
        applyConfiguration: applyConfiguration,
        applyLLMConfiguration: applyLLMConfiguration,
        applyPromptConfiguration: applyPromptConfiguration,
        applyFunctionConfiguration: applyFunctionConfiguration,
        applyMCPConfiguration: applyMCPConfiguration,
        applyChatConfiguration: applyChatConfiguration,
        validateConfiguration: validateConfiguration
    };
})();