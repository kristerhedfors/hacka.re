/**
 * Link Sharing Service
 * Handles creation and extraction of shareable links with encrypted data
 */

window.LinkSharingService = (function() {
    // For testing purposes
    let _location = window.location;
    let _history = window.history;
    
    // Cache for extracted shared data to avoid repeated decryption
    let _cachedSharedData = null;
    
    /**
     * Set custom location and history objects for testing
     * @param {Object} locationObj - Custom location object
     * @param {Object} historyObj - Custom history object
     */
    function _setTestingObjects(locationObj, historyObj) {
        if (locationObj) _location = locationObj;
        if (historyObj) _history = historyObj;
    }
    
    /**
     * Reset to using the real window.location and window.history
     */
    function _resetTestingObjects() {
        _location = window.location;
        _history = window.history;
    }
    /**
     * Create a shareable link with encrypted API key
     * @param {string} apiKey - The API key to share
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL
     */
    function createShareableLink(apiKey, password) {
        // Create payload with just the API key
        const payload = { apiKey };
        
        // Encrypt the payload
        const encryptedData = CryptoUtils.encryptData(payload, password);
        
        // Create URL with hash fragment
        const baseUrl = _location.href.split('#')[0];
        return `${baseUrl}#gpt=${encryptedData}`;
    }
    

    /**
     * Create a custom shareable link with encrypted payload
     * This creates a link that contains any combination of data specified in the payload.
     * 
     * @param {Object} payload - The data to encrypt and share (optional - will collect current state if not provided)
     * @param {string} password - The password to use for encryption
     * @param {Object} options - Additional options for sharing
     * @param {boolean} options.includePromptLibrary - Whether to include the prompt library in the link
     * @param {boolean} options.includeFunctionLibrary - Whether to include the function library in the link
     * @param {boolean} options.includeMcpConnections - Whether to include MCP connections in the link
     * @param {boolean} options.includeLLMConfig - Whether to include LLM configuration in the link
     * @param {boolean} options.includeChatData - Whether to include chat data in the link
     * @returns {string} Shareable URL with #gpt= fragment
     */
    function createCustomShareableLink(payload, password, options = {}) {
        let finalPayload;
        
        // If no payload provided, collect current configuration
        if (!payload || Object.keys(payload).length === 0) {
            // Use ConfigurationService to collect current state
            const configOptions = {
                includeLLMConfig: options.includeLLMConfig !== false, // Default true
                includePromptLibrary: options.includePromptLibrary === true,
                includeFunctionLibrary: options.includeFunctionLibrary === true,
                includeMcpConnections: options.includeMcpConnections === true,
                includeChatData: options.includeChatData !== false // Default true
            };
            
            const currentConfig = ConfigurationService.collectCurrentConfiguration(configOptions);
            
            // Convert to the flat structure expected by shared links
            finalPayload = convertConfigToShareFormat(currentConfig);
            
            console.log('Collected current configuration for sharing:', {
                hasLLM: !!currentConfig.llm,
                hasPrompts: !!currentConfig.prompts,
                hasFunctions: !!currentConfig.functions,
                hasMCP: !!currentConfig.mcp,
                hasChat: !!currentConfig.chat
            });
            
        } else {
            // Use provided payload and apply legacy options
            finalPayload = { ...payload };
            
            // Add prompt library if requested (legacy support)
            if (options.includePromptLibrary) {
                const prompts = PromptsService.getPrompts();
                finalPayload.prompts = prompts;
                
                const selectedPromptIds = PromptsService.getSelectedPromptIds();
                finalPayload.selectedPromptIds = selectedPromptIds;
                
                const selectedDefaultPromptIds = window.DefaultPromptsService ? 
                    window.DefaultPromptsService.getSelectedDefaultPromptIds() : [];
                if (selectedDefaultPromptIds.length > 0) {
                    finalPayload.selectedDefaultPromptIds = selectedDefaultPromptIds;
                }
            }
            
            // Add function library if requested (legacy support)
            if (options.includeFunctionLibrary) {
                const functions = FunctionToolsService.getJsFunctions();
                finalPayload.functions = functions;
                
                const enabledFunctions = FunctionToolsService.getEnabledFunctionNames();
                finalPayload.enabledFunctions = enabledFunctions;
            }
            
            // Add MCP connections if requested and available in payload (legacy support)
            if (options.includeMcpConnections && payload.mcpConnections) {
                finalPayload.mcpConnections = payload.mcpConnections;
            }
        }
        
        // Encrypt the payload
        const encryptedData = CryptoUtils.encryptData(finalPayload, password);
        
        // Create URL with hash fragment
        const baseUrl = _location.href.split('#')[0];
        return `${baseUrl}#gpt=${encryptedData}`;
    }
    
    /**
     * Convert unified configuration object to flat share format
     * @private
     * @param {Object} config - Unified configuration object
     * @returns {Object} Flat payload for sharing
     */
    function convertConfigToShareFormat(config) {
        const payload = {};
        
        // LLM configuration
        if (config.llm) {
            if (config.llm.apiKey) payload.apiKey = config.llm.apiKey;
            if (config.llm.model) payload.model = config.llm.model;
            if (config.llm.baseUrl) payload.baseUrl = config.llm.baseUrl;
            if (config.llm.provider) payload.provider = config.llm.provider;
        }
        
        // Prompt configuration
        if (config.prompts) {
            if (config.prompts.library) payload.prompts = config.prompts.library;
            if (config.prompts.selectedIds) payload.selectedPromptIds = config.prompts.selectedIds;
            if (config.prompts.selectedDefaultIds) payload.selectedDefaultPromptIds = config.prompts.selectedDefaultIds;
        }
        
        // Function configuration
        if (config.functions) {
            if (config.functions.library) payload.functions = config.functions.library;
            if (config.functions.enabled) payload.enabledFunctions = config.functions.enabled;
        }
        
        // MCP configuration  
        if (config.mcp && config.mcp.connections) {
            payload.mcpConnections = config.mcp.connections;
        }
        
        // Chat configuration
        if (config.chat) {
            if (config.chat.systemPrompt) payload.systemPrompt = config.chat.systemPrompt;
            if (config.chat.messages) payload.messages = config.chat.messages;
            if (config.chat.welcomeMessage) payload.welcomeMessage = config.chat.welcomeMessage;
        }
        
        return payload;
    }
    
    /**
     * Check if the current URL contains a shared API key
     * @returns {boolean} True if URL contains a shared API key
     */
    function hasSharedApiKey() {
        const hash = _location.hash;
        return hash.includes('#shared=') || hash.includes('#gpt=');
    }
    
    /**
     * Extract and decrypt shared data from the URL
     * @param {string} password - The password to use for decryption
     * @returns {Object} Object containing the decrypted data (apiKey, systemPrompt, messages, prompts, selectedPromptIds, etc.)
     */
    function extractSharedApiKey(password) {
        // Return cached data if available and password matches
        if (_cachedSharedData && _cachedSharedData._password === password) {
            console.log('Returning cached shared data');
            return _cachedSharedData;
        }
        
        try {
            // Get the hash fragment
            const hash = _location.hash;
            
            // Check if it contains a shared data
            if (hash.includes('#shared=') || hash.includes('#gpt=')) {
                // Extract the encrypted data
                let encryptedData;
                if (hash.includes('#gpt=')) {
                    encryptedData = hash.split('#gpt=')[1];
                } else {
                    encryptedData = hash.split('#shared=')[1];
                }
                
                if (!encryptedData) {
                    console.error('No encrypted data found in URL hash');
                    return null;
                }
                
                // Decrypt the data
                const data = CryptoUtils.decryptData(encryptedData, password);
                
                if (!data) {
                    console.error('Decryption failed or returned null');
                    return null;
                }
                
                // Check if the decrypted data contains at least one valid field
                // We no longer require apiKey to be present, allowing sharing of just conversation or model
                if (!data.apiKey && !data.messages && !data.model && !data.systemPrompt && !data.prompts && !data.mcpConnections && !data.welcomeMessage) {
                    console.error('Decrypted data does not contain any valid fields');
                    return null;
                }
                
                // Create the result object with required fields
                const result = {
                    baseUrl: data.baseUrl || null,
                    apiKey: data.apiKey,
                    systemPrompt: data.systemPrompt || null,
                    model: data.model || null,
                    messages: data.messages || null
                };
                
                // Include prompt library if present
                if (data.prompts) {
                    result.prompts = data.prompts;
                    console.log('Extracted prompts from shared link:', data.prompts);
                } else {
                    console.log('No prompts found in shared link data:', data);
                    console.log('DEBUG: Full decrypted data structure:', JSON.stringify(data, null, 2));
                }
                
                if (data.selectedPromptIds) {
                    result.selectedPromptIds = data.selectedPromptIds;
                    console.log('Extracted selected prompt IDs from shared link:', data.selectedPromptIds);
                }
                
                // Include function library if present
                if (data.functions) {
                    result.functions = data.functions;
                    console.log('Extracted functions from shared link:', Object.keys(data.functions));
                }
                
                if (data.enabledFunctions) {
                    result.enabledFunctions = data.enabledFunctions;
                    console.log('Extracted enabled function names from shared link:', data.enabledFunctions);
                }
                
                // Include MCP connections if present
                if (data.mcpConnections) {
                    result.mcpConnections = data.mcpConnections;
                    console.log('Extracted MCP connections from shared link:', Object.keys(data.mcpConnections));
                }
                
                // Include welcome message if present
                if (data.welcomeMessage) {
                    result.welcomeMessage = data.welcomeMessage;
                    console.log('Extracted welcome message from shared link:', data.welcomeMessage.substring(0, 50) + '...');
                }
                
                // Cache the result with the password for future access
                result._password = password; // Store password for cache validation
                _cachedSharedData = result;
                console.log('Cached shared data for future access');
                
                return result;
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting shared data:', error);
            return null;
        }
    }
    
    /**
     * Clear the shared API key from the URL
     */
    function clearSharedApiKeyFromUrl() {
        // Remove the hash fragment
        _history.replaceState(null, null, _location.pathname + _location.search);
    }
    
    // Public API
    return {
        createShareableLink: createShareableLink,
        createCustomShareableLink: createCustomShareableLink,
        hasSharedApiKey: hasSharedApiKey,
        extractSharedApiKey: extractSharedApiKey,
        clearSharedApiKeyFromUrl: clearSharedApiKeyFromUrl,
        // Testing helpers
        _setTestingObjects: _setTestingObjects,
        _resetTestingObjects: _resetTestingObjects
    };
})();
