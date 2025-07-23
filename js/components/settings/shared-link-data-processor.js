/**
 * SharedLinkDataProcessor - Handles processing and applying shared data
 */
function createSharedLinkDataProcessor() {
    
    /**
     * Mask an API key, showing first 10 and last 4 characters
     * @param {string} apiKey - The API key to mask
     * @returns {string} Masked API key
     */
    function maskApiKey(apiKey) {
        if (!apiKey || apiKey.length < 14) {
            return "Invalid API key format";
        }
        
        const first10 = apiKey.substring(0, 10);
        const last4 = apiKey.substring(apiKey.length - 4);
        const maskedPart = '*'.repeat(16); // Fixed 16 asterisks regardless of key length
        
        return `${first10}${maskedPart}${last4}`;
    }
    
    /**
     * Apply welcome message from shared data - should be called last
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @param {boolean} displayMessage - Whether to display the message or just store it
     */
    function applyWelcomeMessage(sharedData, addSystemMessage, displayMessage = true) {
        // If there's a welcome message, handle it appropriately
        if (sharedData.welcomeMessage) {
            // Store the welcome message in the share manager for future use (for share modal pre-population)
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSharedWelcomeMessage(sharedData.welcomeMessage);
            }
            
            // Store the welcome message for deferred display instead of displaying immediately
            if (displayMessage && addSystemMessage) {
                // Store the message and display function for later use
                window._deferredWelcomeMessage = {
                    message: sharedData.welcomeMessage,
                    displayFunction: addSystemMessage
                };
            }
        }
    }
    
    /**
     * Apply API configuration from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     */
    function applyApiConfiguration(sharedData, addSystemMessage) {
        // Save the shared API key
        if (sharedData.apiKey) {
            if (DataService && typeof DataService.saveApiKey === 'function') {
                DataService.saveApiKey(sharedData.apiKey);
            } else {
                StorageService.saveApiKey(sharedData.apiKey);
            }
            const maskedApiKey = maskApiKey(sharedData.apiKey);
            if (addSystemMessage) {
                addSystemMessage(`Shared API key (${maskedApiKey}) has been applied.`);
            }
        }
        
        // If there's a base URL, save it too
        if (sharedData.baseUrl) {
            if (DataService && typeof DataService.saveBaseUrl === 'function') {
                DataService.saveBaseUrl(sharedData.baseUrl);
            } else {
                StorageService.saveBaseUrl(sharedData.baseUrl);
            }
            if (addSystemMessage) {
                addSystemMessage(`Shared base URL has been applied.`);
            }
        }
        
        // If there's a system prompt, save it too
        if (sharedData.systemPrompt) {
            if (DataService && typeof DataService.saveSystemPrompt === 'function') {
                DataService.saveSystemPrompt(sharedData.systemPrompt);
            } else {
                StorageService.saveSystemPrompt(sharedData.systemPrompt);
            }
            if (addSystemMessage) {
                addSystemMessage(`Shared system prompt has been applied.`);
            }
        }
        
        // If there's a provider, save it and set the appropriate base URL
        if (sharedData.provider) {
            if (DataService && typeof DataService.saveBaseUrlProvider === 'function') {
                DataService.saveBaseUrlProvider(sharedData.provider);
            } else if (StorageService && typeof StorageService.saveBaseUrlProvider === 'function') {
                StorageService.saveBaseUrlProvider(sharedData.provider);
            }
            
            // Also set the appropriate base URL for the provider if not explicitly provided
            if (!sharedData.baseUrl) {
                let defaultBaseUrl = null;
                if (DataService && typeof DataService.getDefaultBaseUrlForProvider === 'function') {
                    defaultBaseUrl = DataService.getDefaultBaseUrlForProvider(sharedData.provider);
                }
                if (defaultBaseUrl) {
                    if (DataService && typeof DataService.saveBaseUrl === 'function') {
                        DataService.saveBaseUrl(defaultBaseUrl);
                    } else {
                        StorageService.saveBaseUrl(defaultBaseUrl);
                    }
                    if (addSystemMessage) {
                        addSystemMessage(`Shared provider (${sharedData.provider}) with default base URL has been applied.`);
                    }
                } else {
                    if (addSystemMessage) {
                        addSystemMessage(`Shared provider (${sharedData.provider}) has been applied.`);
                    }
                }
            } else {
                if (addSystemMessage) {
                    addSystemMessage(`Shared provider (${sharedData.provider}) has been applied.`);
                }
            }
        }
    }
    
    /**
     * Apply model configuration from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {string|null} Pending shared model
     */
    function applyModelConfiguration(sharedData, addSystemMessage) {
        let pendingSharedModel = null;
        
        // If there's a model, check if it's compatible with the provider
        if (sharedData.model) {
            let modelToUse = sharedData.model;
            
            // Check if we have provider information and validate compatibility
            if (sharedData.provider) {
                console.log(`🔍 Validating model compatibility: "${sharedData.model}" with provider "${sharedData.provider}"`);
                const isCompatible = validateModelProviderCompatibility(sharedData.model, sharedData.provider);
                console.log(`🔍 Compatibility result: ${isCompatible}`);
                
                if (!isCompatible) {
                    // Get a compatible model for this provider
                    const compatibleModel = getCompatibleModelForProvider(sharedData.provider);
                    console.log(`🔍 Suggested compatible model: ${compatibleModel}`);
                    
                    if (compatibleModel) {
                        modelToUse = compatibleModel;
                        console.log(`🔧 Replacing incompatible model "${sharedData.model}" with "${compatibleModel}"`);
                        if (addSystemMessage) {
                            addSystemMessage(`Model "${sharedData.model}" is not compatible with ${sharedData.provider}. Using "${compatibleModel}" instead.`);
                        }
                    } else {
                        if (addSystemMessage) {
                            addSystemMessage(`Model "${sharedData.model}" is not compatible with ${sharedData.provider}. Model selection may fail.`);
                        }
                    }
                } else {
                    console.log(`✅ Model "${sharedData.model}" is compatible with provider "${sharedData.provider}"`);
                    if (addSystemMessage) {
                        addSystemMessage(`Shared model "${sharedData.model}" is compatible with ${sharedData.provider}.`);
                    }
                }
            } else {
                // No provider info, use the model as-is
                console.log(`🔍 No provider info, using model "${sharedData.model}" as-is`);
                if (addSystemMessage) {
                    addSystemMessage(`Shared model preference "${sharedData.model}" will be applied if available.`);
                }
            }
            
            pendingSharedModel = modelToUse;
            
            // Save the (possibly corrected) model to storage immediately to ensure it's available for API requests
            // Use DataService instead of StorageService to ensure timestamp is set properly
            if (DataService && typeof DataService.saveModel === 'function') {
                DataService.saveModel(modelToUse);
            } else {
                StorageService.saveModel(modelToUse);
            }
            
            // Force reset the model manager memory to prevent conflicts
            if (window.aiHackare && window.aiHackare.settingsManager && window.aiHackare.settingsManager.componentManagers) {
                const modelManager = window.aiHackare.settingsManager.componentManagers.model;
                if (modelManager && typeof modelManager.resetMemoryState === 'function') {
                    modelManager.resetMemoryState();
                    console.log('🔧 Model manager memory reset to prevent conflicts with stored model:', modelToUse);
                }
            }
            
            // Also try to access the model manager directly if available
            if (window.ModelManager && typeof window.ModelManager.resetMemoryState === 'function') {
                window.ModelManager.resetMemoryState();
                console.log('🔧 Global model manager memory reset');
            }
            
            // If we have a model manager, set the pending shared model there too
            if (window.aiHackare && window.aiHackare.settingsManager && 
                typeof window.aiHackare.settingsManager.setPendingSharedModel === 'function') {
                window.aiHackare.settingsManager.setPendingSharedModel(modelToUse);
            }
        }
        
        return pendingSharedModel;
    }
    
    /**
     * Validate if a model is compatible with a provider
     * @param {string} model - Model ID
     * @param {string} provider - Provider name
     * @returns {boolean} Whether the model is compatible
     */
    function validateModelProviderCompatibility(model, provider) {
        // Simple compatibility checks based on model naming patterns
        if (provider === 'openai') {
            return model.startsWith('gpt-') || model.startsWith('o1-') || model.includes('davinci') || model.includes('turbo');
        } else if (provider === 'groq') {
            // Groq models: llama, mixtral, gemma, qwen variants
            return model.includes('llama') || model.includes('mixtral') || model.includes('qwen') || model.includes('gemma');
        } else if (provider === 'ollama') {
            // Ollama can run various models, but they usually don't have provider prefixes
            return !model.startsWith('gpt-') && !model.includes('claude');
        }
        
        // For unknown providers, assume compatibility
        return true;
    }
    
    /**
     * Get a compatible model for a provider
     * @param {string} provider - Provider name
     * @returns {string|null} Compatible model ID or null
     */
    function getCompatibleModelForProvider(provider) {
        const compatibleModels = {
            'openai': 'gpt-4o-mini',
            'groq': 'llama-3.1-70b-versatile', // Updated to correct Groq model name
            'ollama': 'llama3.2'
        };
        
        return compatibleModels[provider] || null;
    }
    
    /**
     * Apply chat messages from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @param {Function} setMessages - Function to set chat messages
     */
    function applyChatMessages(sharedData, addSystemMessage, setMessages, systemMessages = []) {
        // If there are shared messages, update the chat
        if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
            // Add system message about conversation loading
            if (addSystemMessage) {
                addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
            }
            
            // Combine system messages with shared conversation history
            const allMessages = [...systemMessages, ...sharedData.messages];
            setMessages(allMessages);
        } else if (systemMessages.length > 0 && setMessages) {
            // Even if no conversation history, show system messages
            setMessages(systemMessages);
        }
    }
    
    /**
     * Apply prompts from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     */
    function applyPrompts(sharedData, addSystemMessage) {
        // If there are shared prompts, save them
        if (sharedData.prompts && Array.isArray(sharedData.prompts)) {
            sharedData.prompts.forEach(prompt => {
                PromptsService.savePrompt(prompt);
            });
            
            if (addSystemMessage) {
                addSystemMessage(`Shared prompt library with ${sharedData.prompts.length} prompts has been loaded.`);
            }
        }
        
        // If there are shared selected prompt IDs, save them
        if (sharedData.selectedPromptIds && Array.isArray(sharedData.selectedPromptIds)) {
            PromptsService.setSelectedPromptIds(sharedData.selectedPromptIds);
            
            if (addSystemMessage) {
                addSystemMessage(`Shared prompt selections have been applied.`);
            }
        }
        
        // Apply shared default prompt selections (or reset to default if not present)
        if (window.DefaultPromptsService) {
            if (sharedData.selectedDefaultPromptIds && Array.isArray(sharedData.selectedDefaultPromptIds)) {
                // Apply specific default prompt selections from shared data
                window.DefaultPromptsService.setSelectedDefaultPromptIds(sharedData.selectedDefaultPromptIds);
                
                if (addSystemMessage) {
                    addSystemMessage(`Shared default prompt selections have been applied.`);
                }
            } else {
                // No default prompt selections in shared data means default state (none selected)
                window.DefaultPromptsService.setSelectedDefaultPromptIds([]);
            }
        }
        
        // Apply all selected prompts (both user and default) as system prompt
        if ((sharedData.selectedPromptIds && sharedData.selectedPromptIds.length > 0) || 
            (sharedData.selectedDefaultPromptIds && sharedData.selectedDefaultPromptIds.length > 0)) {
            PromptsService.applySelectedPromptsAsSystem();
        }
    }
    
    /**
     * Apply functions from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     */
    function applyFunctions(sharedData, addSystemMessage) {
        // If there are shared functions, save them with collection information
        if (sharedData.functions && typeof sharedData.functions === 'object') {
            const functionCollections = sharedData.functionCollections || {};
            const collectionMetadata = sharedData.functionCollectionMetadata || {};
            
            Object.keys(sharedData.functions).forEach(functionName => {
                const functionData = sharedData.functions[functionName];
                const collectionId = functionCollections[functionName];
                const metadata = collectionId ? collectionMetadata[collectionId] : null;
                
                // Add function with preserved collection information
                FunctionToolsService.addJsFunction(
                    functionName,
                    functionData.code,
                    functionData.toolDefinition,
                    collectionId,
                    metadata
                );
            });
            
            if (addSystemMessage) {
                const collectionCount = Object.keys(collectionMetadata).length;
                const collectionText = collectionCount > 0 ? ` in ${collectionCount} collection(s)` : '';
                addSystemMessage(`Shared function library with ${Object.keys(sharedData.functions).length} functions${collectionText} has been loaded.`);
            }
        }
        
        // If there are shared enabled functions, save them
        if (sharedData.enabledFunctions && Array.isArray(sharedData.enabledFunctions)) {
            // First disable all functions
            const allFunctions = Object.keys(FunctionToolsService.getJsFunctions());
            allFunctions.forEach(functionName => {
                FunctionToolsService.disableJsFunction(functionName);
            });
            
            // Then enable only the shared enabled functions
            sharedData.enabledFunctions.forEach(functionName => {
                FunctionToolsService.enableJsFunction(functionName);
            });
            
            if (addSystemMessage) {
                addSystemMessage(`Shared function selections have been applied.`);
            }
        }
        
        // Apply function tools enabled state
        if (typeof sharedData.functionToolsEnabled === 'boolean' && FunctionToolsService && typeof FunctionToolsService.setFunctionToolsEnabled === 'function') {
            FunctionToolsService.setFunctionToolsEnabled(sharedData.functionToolsEnabled, addSystemMessage);
            console.log(`🔧 Function tools ${sharedData.functionToolsEnabled ? 'enabled' : 'disabled'} during shared data application`);
        } else {
            // Fallback: Enable function tools if we have functions
            const hasFunctions = (sharedData.functions && Object.keys(sharedData.functions).length > 0) ||
                               (sharedData.enabledFunctions && sharedData.enabledFunctions.length > 0);
            
            if (hasFunctions && FunctionToolsService && typeof FunctionToolsService.setFunctionToolsEnabled === 'function') {
                FunctionToolsService.setFunctionToolsEnabled(true, addSystemMessage);
                console.log('🔧 Function tools enabled during shared data application (fallback)');
            }
        }
    }
    
    /**
     * Apply MCP connections from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     */
    async function applyMcpConnections(sharedData, addSystemMessage) {
        // If there are shared MCP connections, restore them
        if (sharedData.mcpConnections && typeof sharedData.mcpConnections === 'object') {
            try {
                const connectionKeys = Object.keys(sharedData.mcpConnections);
                let appliedCount = 0;
                
                for (const serviceKey of connectionKeys) {
                    const rawToken = sharedData.mcpConnections[serviceKey];
                    
                    // TRACE TOKEN: Log token during agent load
                    console.log(`🔍 AGENT LOAD TOKEN TRACE: Service=${serviceKey}, Type=${typeof rawToken}, Token=${rawToken}, Length=${rawToken ? rawToken.length : 0}`);
                    
                    // FIX TOKEN: Extract string token from object if needed
                    let token = rawToken;
                    if (typeof rawToken === 'object' && rawToken !== null && rawToken.token) {
                        token = rawToken.token;
                        console.log(`🔧 FIXED TOKEN: Extracted string token from object: ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);
                    } else if (typeof rawToken !== 'string') {
                        console.error(`🚨 INVALID TOKEN: Expected string or {token: string}, got ${typeof rawToken}:`, rawToken);
                        continue;
                    }
                    
                    // Store the PAT token using the appropriate storage key
                    const storageKey = `mcp_${serviceKey}_token`;
                    await window.CoreStorageService.setValue(storageKey, token);
                    
                    // TRACE TOKEN: Verify token was stored correctly
                    const storedToken = await window.CoreStorageService.getValue(storageKey);
                    console.log(`🔍 AGENT LOAD TOKEN VERIFY: Stored token for ${serviceKey}: Type=${typeof storedToken}, Value=${storedToken}, Match=${token === storedToken}`);
                    
                    appliedCount++;
                    
                    if (addSystemMessage) {
                        addSystemMessage(`Shared ${serviceKey} MCP connection has been applied.`);
                    }
                }
                
                if (appliedCount > 0 && addSystemMessage) {
                    addSystemMessage(`Total ${appliedCount} MCP connection(s) restored. You may need to manually reconnect in the MCP Servers panel.`);
                }
                
                // Trigger MCP service connector to recreate connections if available
                if (window.MCPServiceConnectors) {
                    // Delay slightly to ensure storage is committed
                    setTimeout(async () => {
                        for (const serviceKey of connectionKeys) {
                            // Try to recreate the connection automatically
                            if (window.MCPServiceConnectors.quickConnect && serviceKey === 'github') {
                                try {
                                    // First validate the token before attempting connection
                                    const storageKey = `mcp_${serviceKey}_token`;
                                    const token = await window.CoreStorageService.getValue(storageKey);
                                    
                                    // TRACE TOKEN: Log token during validation
                                    console.log(`🔍 VALIDATION TOKEN TRACE: Service=${serviceKey}, StorageKey=${storageKey}, Type=${typeof token}, Token=${token}, Length=${token ? token.length : 0}`);
                                    
                                    if (token && window.MCPServiceConnectors.validateGitHubToken) {
                                        console.log(`🔍 VALIDATION: About to validate ${serviceKey} token: Type=${typeof token}, Value=${token}`);
                                        const isValid = await window.MCPServiceConnectors.validateGitHubToken(token);
                                        console.log(`🔍 VALIDATION RESULT: ${serviceKey} token validation result: ${isValid}`);
                                        if (!isValid) {
                                            console.warn(`[MCP Auto-reconnect] Invalid ${serviceKey} token detected, skipping auto-reconnection. Manual reconnection required.`);
                                            if (addSystemMessage) {
                                                addSystemMessage(`${serviceKey} MCP connection restored but token is invalid. Please reconnect manually in the MCP Servers panel.`);
                                            }
                                            continue;
                                        }
                                    }
                                    
                                    const connected = await window.MCPServiceConnectors.quickConnect('github');
                                    if (connected) {
                                        console.log(`Auto-reconnected to ${serviceKey} MCP service`);
                                    } else {
                                        console.warn(`Auto-reconnection to ${serviceKey} MCP service failed - no valid token`);
                                        if (addSystemMessage) {
                                            addSystemMessage(`${serviceKey} MCP connection could not be restored automatically. Please reconnect manually in the MCP Servers panel.`);
                                        }
                                    }
                                } catch (error) {
                                    console.warn(`Failed to auto-reconnect to ${serviceKey} MCP service:`, error);
                                    if (addSystemMessage) {
                                        addSystemMessage(`${serviceKey} MCP connection restoration failed: ${error.message}. Please reconnect manually.`);
                                    }
                                }
                            }
                        }
                    }, 100);
                }
                
            } catch (error) {
                console.error('Error applying MCP connections from shared data:', error);
                if (addSystemMessage) {
                    addSystemMessage(`Error applying MCP connections: ${error.message}`);
                }
            }
        }
    }
    
    /**
     * Apply session key from decryption password
     * @param {string} password - The decryption password
     * @param {Object} elements - DOM elements for UI updates
     * @param {Function} addSystemMessage - Function to add system messages
     */
    function applySessionKey(password, elements, addSystemMessage) {
        // Use the decryption password as the session key and lock it
        if (window.aiHackare && window.aiHackare.shareManager) {
            // Set the session key on the instance, not the module
            window.aiHackare.shareManager.setSessionKey(password);
            
            // Also lock the session key for future use
            if (elements.lockSessionKeyCheckbox) {
                elements.lockSessionKeyCheckbox.checked = true;
            }
            
            if (elements.passwordInputContainer) {
                elements.passwordInputContainer.classList.add('locked');
            }
            
            if (addSystemMessage) {
                addSystemMessage(`Using decryption password as session key for future sharing.`);
            }
        }
    }
    
    /**
     * Clean up existing state before applying agent configuration
     * @param {Function} addSystemMessage - Function to add system messages
     */
    async function cleanSlateForAgent(addSystemMessage) {
        // Disconnect ALL MCP connections
        if (window.MCPServiceConnectors) {
            try {
                // Get all currently connected services dynamically
                const serviceKeys = [];
                if (typeof window.MCPServiceConnectors.getConnectedServices === 'function') {
                    const services = window.MCPServiceConnectors.getConnectedServices();
                    serviceKeys.push(...services.map(service => service.key));
                    console.log(`🧹 Found ${serviceKeys.length} connected services: ${serviceKeys.join(', ')}`);
                } else {
                    // Fallback to known service types
                    serviceKeys.push('github', 'gmail', 'filesystem', 'google-docs');
                    console.log(`🧹 Using fallback service list: ${serviceKeys.join(', ')}`);
                }
                
                // Disconnect each service
                for (const serviceKey of serviceKeys) {
                    if (typeof window.MCPServiceConnectors.disconnectService === 'function') {
                        try {
                            await window.MCPServiceConnectors.disconnectService(serviceKey);
                            console.log(`🧹 Disconnected MCP service: ${serviceKey}`);
                        } catch (error) {
                            console.warn(`Failed to disconnect MCP service ${serviceKey}:`, error);
                        }
                    }
                }
                console.log(`🧹 Disconnected ${serviceKeys.length} MCP connections for clean agent loading`);
            } catch (error) {
                console.warn('Failed to disconnect MCP connections:', error);
            }
        }
        
        // Clear ALL function collections completely
        if (window.FunctionToolsService) {
            try {
                // Method 1: Try to clear all collections using the service's clear method
                if (typeof window.FunctionToolsService.clearAllCollections === 'function') {
                    window.FunctionToolsService.clearAllCollections();
                    console.log('🧹 Cleared all function collections using clearAllCollections()');
                } else {
                    // Method 2: Get all functions and remove ALL of them
                    const allFunctions = window.FunctionToolsService.getJsFunctions();
                    const functionNames = Object.keys(allFunctions);
                    
                    if (functionNames.length > 0) {
                        console.log(`🧹 Clearing ${functionNames.length} individual functions from collections`);
                        
                        // Remove each function individually to ensure complete cleanup
                        functionNames.forEach(functionName => {
                            try {
                                window.FunctionToolsService.removeJsFunction(functionName);
                                console.log(`🧹 Removed function: ${functionName}`);
                            } catch (error) {
                                console.warn(`Failed to remove function ${functionName}:`, error);
                            }
                        });
                        
                        console.log(`🧹 Cleared all ${functionNames.length} functions for clean agent loading`);
                    }
                }
                
                // Disable function tools
                window.FunctionToolsService.setFunctionToolsEnabled(false);
                console.log('🧹 Disabled function tools for clean agent loading');
            } catch (error) {
                console.warn('Failed to clean function collections:', error);
            }
        }
        
        // Clear any cached MCP tool registrations
        if (window.MCPToolRegistry && typeof window.MCPToolRegistry.clearAll === 'function') {
            try {
                window.MCPToolRegistry.clearAll();
                console.log('🧹 Cleared MCP tool registry');
            } catch (error) {
                console.warn('Failed to clear MCP tool registry:', error);
            }
        }
        
        // Clear any UI state that might be holding onto old connections
        if (window.MCPQuickConnectors && typeof window.MCPQuickConnectors.clearAllStates === 'function') {
            try {
                window.MCPQuickConnectors.clearAllStates();
                console.log('🧹 Cleared MCP quick connector states');
            } catch (error) {
                console.warn('Failed to clear MCP quick connector states:', error);
            }
        }
        
        if (addSystemMessage) {
            addSystemMessage('Previous MCP connections, function collections, and related state cleared for clean agent loading.');
        }
    }
    
    /**
     * Process all shared data
     * @param {Object} sharedData - Shared data object
     * @param {string} password - Decryption password
     * @param {Object} options - Processing options
     * @returns {Promise<string|null>} Pending shared model
     */
    async function processSharedData(sharedData, password, options = {}) {
        const { addSystemMessage, setMessages, elements, displayWelcomeMessage = true, cleanSlate = false } = options;
        
        // Clean slate if requested (for agent loading)
        if (cleanSlate) {
            await cleanSlateForAgent(addSystemMessage);
        }
        
        // Analyze and store what options were included in the shared data
        const sharedLinkOptions = analyzeSharedDataOptions(sharedData);
        if (window.aiHackare && window.aiHackare.shareManager) {
            window.aiHackare.shareManager.setSharedLinkOptions(sharedLinkOptions);
        }
        
        // Collect system messages to display before conversation history
        const systemMessages = [];
        const collectSystemMessage = (message) => {
            systemMessages.push({ role: 'system', content: message });
        };
        
        // Add user-defined welcome message FIRST (with markdown rendering)
        if (sharedData.welcomeMessage && displayWelcomeMessage) {
            systemMessages.push({ role: 'system', content: sharedData.welcomeMessage, className: 'welcome-message' });
        }
        
        // Apply data and collect system messages
        // IMPORTANT: Apply API configuration and model together to ensure compatibility
        applyApiConfiguration(sharedData, collectSystemMessage);
        const pendingSharedModel = applyModelConfiguration(sharedData, collectSystemMessage);
        
        // Apply other configurations
        applyPrompts(sharedData, collectSystemMessage);
        applyFunctions(sharedData, collectSystemMessage);
        await applyMcpConnections(sharedData, collectSystemMessage);
        applySessionKey(password, elements, collectSystemMessage);
        
        // Apply welcome message processing (for storage in share manager)
        applyWelcomeMessage(sharedData, () => {}, false); // Don't display, just process
        
        // Apply conversation history with system messages prepended
        applyChatMessages(sharedData, collectSystemMessage, setMessages, systemMessages);
        
        return pendingSharedModel;
    }
    
    /**
     * Display any deferred welcome message (only after password verification is complete)
     */
    function displayDeferredWelcomeMessage() {
        if (window._deferredWelcomeMessage && window._passwordVerificationComplete) {
            const { message, displayFunction } = window._deferredWelcomeMessage;
            // Display the welcome message with markdown rendering and special styling
            displayFunction(message, 'welcome-message');
            // Clear the deferred message
            window._deferredWelcomeMessage = null;
        }
    }
    
    /**
     * Analyze shared data and determine what options were included
     * @param {Object} sharedData - The shared data object
     * @returns {Object} Options object indicating what was included
     */
    function analyzeSharedDataOptions(sharedData) {
        const options = {
            includeBaseUrl: !!sharedData.baseUrl,
            includeApiKey: !!sharedData.apiKey,
            includeSystemPrompt: !!sharedData.systemPrompt,
            includeModel: !!sharedData.model,
            includeConversation: !!(sharedData.messages && sharedData.messages.length > 0),
            messageCount: sharedData.messages ? sharedData.messages.length : 0,
            includePromptLibrary: !!(sharedData.prompts && sharedData.prompts.length > 0),
            includeFunctionLibrary: !!(sharedData.functions && Object.keys(sharedData.functions).length > 0),
            includeMcpConnections: !!(sharedData.mcpConnections && Object.keys(sharedData.mcpConnections).length > 0),
            includeWelcomeMessage: !!sharedData.welcomeMessage
        };
        
        return options;
    }
    
    return {
        maskApiKey,
        applyWelcomeMessage,
        applyApiConfiguration,
        applyModelConfiguration,
        applyChatMessages,
        applyPrompts,
        applyFunctions,
        applyMcpConnections,
        applySessionKey,
        processSharedData,
        displayDeferredWelcomeMessage,
        analyzeSharedDataOptions
    };
}

window.SharedLinkDataProcessor = createSharedLinkDataProcessor();