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
        // Check if we're returning to an existing namespace
        const isReturningToExisting = window.NamespaceService && 
                                    window.NamespaceService.isReturningToExistingNamespace && 
                                    window.NamespaceService.isReturningToExistingNamespace();
        
        if (isReturningToExisting) {
            console.log('[SharedLinkDataProcessor] Returning to existing namespace - loading localStorage conversation');
            
            // For existing namespaces, always prioritize localStorage conversation
            // Only use shared conversation if localStorage has no real conversation
            
            if (addSystemMessage) {
                addSystemMessage('Returning to existing namespace - loading your conversation history...');
            }
            
            // DON'T overwrite conversation history with just system messages!
            // The chat manager will handle loading the correct conversation history
            // and will add system messages if needed
            
            // Trigger conversation history reload via chat manager immediately
            if (window.aiHackare && window.aiHackare.chatManager && 
                window.aiHackare.chatManager.reloadConversationHistory) {
                console.log('[SharedLinkDataProcessor] Triggering conversation reload without overwriting history');
                // Call reload immediately to preserve existing conversation
                setTimeout(() => {
                    console.log('[SharedLinkDataProcessor] Triggering conversation reload');
                    window.aiHackare.chatManager.reloadConversationHistory();
                }, 100);
            }
            
            return;
        }
        
        // For new namespaces or first-time shared links, use shared messages as before
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
     * @param {boolean} systematicActivation - Whether to systematically control tool activation (default: false for backwards compatibility)
     */
    function applyFunctions(sharedData, addSystemMessage, systematicActivation = false) {
        console.log('🔧 SharedLinkDataProcessor.applyFunctions called with:', {
            hasFunctions: !!(sharedData.functions && typeof sharedData.functions === 'object'),
            functionCount: sharedData.functions ? Object.keys(sharedData.functions).length : 0,
            hasEnabledFunctions: !!(sharedData.enabledFunctions && Array.isArray(sharedData.enabledFunctions)),
            enabledCount: sharedData.enabledFunctions ? sharedData.enabledFunctions.length : 0,
            systematicActivation
        });
        
        // If there are shared functions, save them with collection information
        if (sharedData.functions && typeof sharedData.functions === 'object') {
            const functionCollections = sharedData.functionCollections || {};
            const collectionMetadata = sharedData.functionCollectionMetadata || {};
            
            console.log('🔧 Adding functions to registry:', Object.keys(sharedData.functions));
            
            Object.keys(sharedData.functions).forEach(functionName => {
                const functionData = sharedData.functions[functionName];
                const collectionId = functionCollections[functionName];
                const metadata = collectionId ? collectionMetadata[collectionId] : null;
                
                // Add function with preserved collection information
                const added = FunctionToolsService.addJsFunction(
                    functionName,
                    functionData.code,
                    functionData.toolDefinition,
                    collectionId,
                    metadata
                );
                
                console.log(`🔧 Function ${functionName} ${added ? 'added' : 'failed to add'} to registry`);
            });
            
            if (addSystemMessage) {
                const collectionCount = Object.keys(collectionMetadata).length;
                const collectionText = collectionCount > 0 ? ` in ${collectionCount} collection(s)` : '';
                addSystemMessage(`Shared function library with ${Object.keys(sharedData.functions).length} functions${collectionText} has been loaded.`);
            }
        }
        
        // Handle function activation based on mode
        if (sharedData.enabledFunctions && Array.isArray(sharedData.enabledFunctions)) {
            if (systematicActivation) {
                // Systematic activation: Only activate/deactivate functions that match the agent's configuration
                console.log('🔧 Applying systematic function activation');
                
                // Get all currently available functions
                const allFunctions = Object.keys(FunctionToolsService.getJsFunctions());
                console.log('🔧 All available functions:', allFunctions);
                console.log('🔧 Functions to enable:', sharedData.enabledFunctions);
                
                // Disable functions that are not in the enabled list
                allFunctions.forEach(functionName => {
                    const shouldBeEnabled = sharedData.enabledFunctions.includes(functionName);
                    const isCurrentlyEnabled = FunctionToolsService.isJsFunctionEnabled(functionName);
                    
                    if (shouldBeEnabled && !isCurrentlyEnabled) {
                        FunctionToolsService.enableJsFunction(functionName);
                        console.log(`🔧 Enabled function: ${functionName}`);
                    } else if (!shouldBeEnabled && isCurrentlyEnabled) {
                        FunctionToolsService.disableJsFunction(functionName);
                        console.log(`🔧 Disabled function: ${functionName}`);
                    }
                });
                
            } else {
                // Legacy behavior: Disable all, then enable specified ones
                console.log('🔧 Applying legacy function activation (disable all, then enable selected)');
                
                // First disable all functions
                const allFunctions = Object.keys(FunctionToolsService.getJsFunctions());
                allFunctions.forEach(functionName => {
                    FunctionToolsService.disableJsFunction(functionName);
                });
                
                // Then enable only the shared enabled functions
                sharedData.enabledFunctions.forEach(functionName => {
                    FunctionToolsService.enableJsFunction(functionName);
                });
            }
            
            if (addSystemMessage) {
                const method = systematicActivation ? 'systematically applied' : 'applied';
                addSystemMessage(`Shared function selections have been ${method}.`);
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
        
        // Log final state
        const finalEnabledFunctions = FunctionToolsService.getEnabledFunctionNames();
        console.log('🔧 Final enabled functions after applyFunctions:', finalEnabledFunctions);
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
                    
                    
                    // FIX TOKEN: Extract string token from object if needed
                    let token = rawToken;
                    if (typeof rawToken === 'object' && rawToken !== null && rawToken.token) {
                        token = rawToken.token;
                    } else if (typeof rawToken !== 'string') {
                        console.error(`🚨 INVALID TOKEN: Expected string or {token: string}, got ${typeof rawToken}:`, rawToken);
                        continue;
                    }
                    
                    // Store the PAT token using the appropriate storage key
                    const storageKey = `mcp_${serviceKey}_token`;
                    await window.CoreStorageService.setValue(storageKey, token);
                    
                    
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
                                    
                                    
                                    if (token && window.MCPServiceConnectors.validateGitHubToken) {
                                        const isValid = await window.MCPServiceConnectors.validateGitHubToken(token);
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
        // Note: This function is now redundant as session key is applied immediately in shared-link-manager.js
        console.log('[SharedLinkDataProcessor] applySessionKey called - but session key should already be set');
        
        // Check if a session key already exists in sessionStorage for this shared link
        // to prevent race conditions between multiple tabs
        if (window.aiHackare && window.aiHackare.shareManager) {
            const existingSessionKey = window.aiHackare.shareManager.getSessionKey();
            console.log('[SharedLinkDataProcessor] Existing session key:', existingSessionKey ? existingSessionKey.length + ' chars' : 'none');
            
            // Session key should already be set by shared-link-manager.js
            // This function is now redundant but kept for backward compatibility
            console.log('[SharedLinkDataProcessor] Session key already applied, skipping redundant application');
        } else {
            console.error('[SharedLinkDataProcessor] ShareManager not available - cannot set session key!');
            if (addSystemMessage) {
                addSystemMessage(`ERROR: Cannot set session key - ShareManager not available`);
            }
        }
        
        // Also lock the session key for future use
        if (elements.lockSessionKeyCheckbox) {
            elements.lockSessionKeyCheckbox.checked = true;
        }
        
        if (elements.passwordInputContainer) {
            elements.passwordInputContainer.classList.add('locked');
        }
    }
    
    /**
     * Prepare state for agent loading using selective function management
     * Preserves MCP connections and functions, only disables functions not needed by agent
     * @param {Function} addSystemMessage - Function to add system messages
     * @param {Array<string>} requiredFunctions - Array of function names required by the agent
     */
    async function cleanSlateForAgent(addSystemMessage, requiredFunctions = []) {
        console.log('🧹 cleanSlateForAgent: Starting selective state preparation for agent loading');
        console.log('🧹 Required functions for agent:', requiredFunctions);
        
        // PRESERVE MCP connections - do not disconnect them
        if (window.MCPServiceConnectors) {
            try {
                const services = window.MCPServiceConnectors.getConnectedServices();
                const serviceKeys = services.map(service => service.key);
                console.log(`🧹 Preserving ${serviceKeys.length} existing MCP connections:`, serviceKeys);
            } catch (error) {
                console.warn('🧹 Failed to get connected services info:', error);
            }
        }
        
        // PRESERVE functions but selectively enable/disable based on agent requirements
        if (window.FunctionToolsService) {
            try {
                const currentFunctions = window.FunctionToolsService.getJsFunctions();
                const functionNames = Object.keys(currentFunctions);
                const currentEnabledFunctions = window.FunctionToolsService.getEnabledFunctionNames();
                
                console.log(`🧹 Found ${functionNames.length} total functions, ${currentEnabledFunctions.length} currently enabled`);
                console.log('🧹 All available functions:', functionNames);
                console.log('🧹 Currently enabled functions:', currentEnabledFunctions);
                
                // Create sets for efficient comparison
                const requiredSet = new Set(requiredFunctions);
                const currentEnabledSet = new Set(currentEnabledFunctions);
                
                // Functions to disable: currently enabled but not required by agent
                const functionsToDisable = currentEnabledFunctions.filter(name => !requiredSet.has(name));
                
                // Functions to enable: required by agent but not currently enabled
                const functionsToEnable = requiredFunctions.filter(name => !currentEnabledSet.has(name));
                
                console.log(`🧹 Functions to disable (not needed by agent): [${functionsToDisable.length}]`, functionsToDisable);
                console.log(`🧹 Functions to enable (required by agent): [${functionsToEnable.length}]`, functionsToEnable);
                
                // Disable functions not needed by the agent
                let disabledCount = 0;
                for (const functionName of functionsToDisable) {
                    try {
                        const disabled = window.FunctionToolsService.disableJsFunction(functionName);
                        if (disabled) {
                            disabledCount++;
                            console.log(`🧹 Disabled function: ${functionName}`);
                        }
                    } catch (error) {
                        console.warn(`🧹 Failed to disable function ${functionName}:`, error);
                    }
                }
                
                // Enable functions required by the agent
                let enabledCount = 0;
                for (const functionName of functionsToEnable) {
                    try {
                        // Check if function exists before trying to enable it
                        if (functionNames.includes(functionName)) {
                            const enabled = window.FunctionToolsService.enableJsFunction(functionName);
                            if (enabled) {
                                enabledCount++;
                                console.log(`🧹 Enabled function: ${functionName}`);
                            }
                        } else {
                            console.warn(`🧹 Function ${functionName} required by agent but not available`);
                        }
                    } catch (error) {
                        console.warn(`🧹 Failed to enable function ${functionName}:`, error);
                    }
                }
                
                console.log(`🧹 Function state updated: disabled ${disabledCount}, enabled ${enabledCount}`);
                
                // Keep function tools enabled if there are any functions required
                if (requiredFunctions.length > 0) {
                    window.FunctionToolsService.setFunctionToolsEnabled(true);
                    console.log('🧹 Function tools enabled for agent requirements');
                } else {
                    // If agent requires no functions, we can disable function tools but keep functions available
                    window.FunctionToolsService.setFunctionToolsEnabled(false);
                    console.log('🧹 Function tools disabled - agent requires no functions');
                }
                
            } catch (error) {
                console.warn('🧹 Failed to manage function states:', error);
            }
        }
        
        console.log('🧹 cleanSlateForAgent: Selective state preparation completed');
        
        if (addSystemMessage) {
            const preservedMsg = requiredFunctions.length > 0 
                ? `Preserved existing connections and functions. Enabled ${requiredFunctions.length} functions required by agent.`
                : 'Preserved existing connections and functions. Disabled all functions as agent requires none.';
            addSystemMessage(preservedMsg);
        }
    }
    
    /**
     * Validate agent loading state after applying configuration
     * @param {Object} sharedData - The shared data that was applied
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Object} Validation results with success status and details
     */
    function validateAgentLoadingState(sharedData, addSystemMessage) {
        const validation = {
            success: true,
            errors: [],
            warnings: [],
            details: {
                functionsValidated: false,
                mcpValidated: false,
                stateCleared: false
            }
        };
        
        console.log('🔍 validateAgentLoadingState: Starting validation of agent loading state');
        
        // Validate functions state
        if (sharedData.functions || sharedData.enabledFunctions) {
            try {
                const currentFunctions = window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {};
                const enabledFunctions = window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : [];
                
                console.log('🔍 Function validation:', {
                    expectedFunctions: sharedData.functions ? Object.keys(sharedData.functions) : [],
                    currentFunctions: Object.keys(currentFunctions),
                    expectedEnabled: sharedData.enabledFunctions || [],
                    currentEnabled: enabledFunctions
                });
                
                // Check if expected functions are loaded
                if (sharedData.functions) {
                    const expectedFunctions = Object.keys(sharedData.functions);
                    const missingFunctions = expectedFunctions.filter(name => !currentFunctions[name]);
                    
                    if (missingFunctions.length > 0) {
                        validation.errors.push(`Missing functions: ${missingFunctions.join(', ')}`);
                        validation.success = false;
                    }
                }
                
                // Check if enabled functions match expectations
                if (sharedData.enabledFunctions) {
                    const unexpectedEnabled = enabledFunctions.filter(name => !sharedData.enabledFunctions.includes(name));
                    const missingEnabled = sharedData.enabledFunctions.filter(name => !enabledFunctions.includes(name));
                    
                    if (unexpectedEnabled.length > 0) {
                        validation.warnings.push(`Unexpected enabled functions: ${unexpectedEnabled.join(', ')}`);
                    }
                    
                    if (missingEnabled.length > 0) {
                        validation.errors.push(`Functions not enabled: ${missingEnabled.join(', ')}`);
                        validation.success = false;
                    }
                }
                
                validation.details.functionsValidated = true;
            } catch (error) {
                validation.errors.push(`Function validation failed: ${error.message}`);
                validation.success = false;
            }
        }
        
        // Validate MCP connections state
        if (sharedData.mcpConnections || sharedData.cleanSlate) {
            try {
                const connectedServices = window.MCPServiceConnectors ? window.MCPServiceConnectors.getConnectedServices() : [];
                
                console.log('🔍 MCP validation:', {
                    expectedConnections: sharedData.mcpConnections ? Object.keys(sharedData.mcpConnections) : [],
                    currentConnections: connectedServices.map(s => s.key),
                    cleanSlateRequested: !!sharedData.cleanSlate
                });
                
                // If clean slate was requested, verify no old connections remain
                if (sharedData.cleanSlate && connectedServices.length > 0) {
                    validation.warnings.push(`Clean slate requested but ${connectedServices.length} MCP services still connected`);
                }
                
                validation.details.mcpValidated = true;
            } catch (error) {
                validation.errors.push(`MCP validation failed: ${error.message}`);
                validation.success = false;
            }
        }
        
        // Log validation results
        if (validation.success) {
            console.log('✅ validateAgentLoadingState: Validation passed', validation);
            if (addSystemMessage && validation.warnings.length === 0) {
                addSystemMessage('Agent loading state validation passed successfully.');
            }
        } else {
            console.error('❌ validateAgentLoadingState: Validation failed', validation);
            if (addSystemMessage) {
                addSystemMessage(`Agent loading validation failed: ${validation.errors.join('; ')}`);
            }
        }
        
        // Log warnings separately
        if (validation.warnings.length > 0) {
            console.warn('⚠️ validateAgentLoadingState: Validation warnings', validation.warnings);
            if (addSystemMessage) {
                addSystemMessage(`Agent loading warnings: ${validation.warnings.join('; ')}`);
            }
        }
        
        return validation;
    }
    
    /**
     * Process all shared data with enhanced error handling and validation
     * @param {Object} sharedData - Shared data object
     * @param {string} password - Decryption password
     * @param {Object} options - Processing options
     * @returns {Promise<string|null>} Pending shared model
     */
    async function processSharedData(sharedData, password, options = {}) {
        const { addSystemMessage, setMessages, elements, displayWelcomeMessage = true, cleanSlate = false, validateState = false } = options;
        
        console.log('🚀 processSharedData started with options:', {
            hasSharedData: !!sharedData,
            cleanSlate,
            validateState,
            displayWelcomeMessage
        });
        
        try {
            // Clean slate if requested (for agent loading)
            if (cleanSlate) {
                console.log('🧹 processSharedData: Performing clean slate operation');
                // Extract required functions from shared data for selective enable/disable
                const requiredFunctions = sharedData.enabledFunctions || [];
                console.log('🧹 Agent requires functions:', requiredFunctions);
                await cleanSlateForAgent(addSystemMessage, requiredFunctions);
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
            console.log('🔧 processSharedData: Applying API and model configuration');
            applyApiConfiguration(sharedData, collectSystemMessage);
            const pendingSharedModel = applyModelConfiguration(sharedData, collectSystemMessage);
            
            // Apply other configurations
            console.log('🔧 processSharedData: Applying prompts and functions');
            applyPrompts(sharedData, collectSystemMessage);
            
            // Use systematic activation for agent loading when cleanSlate is true
            applyFunctions(sharedData, collectSystemMessage, cleanSlate);
            
            console.log('🔧 processSharedData: Applying MCP connections');
            await applyMcpConnections(sharedData, collectSystemMessage);
            
            // Session key is now applied immediately in shared-link-manager.js when password is validated
            // This redundant call is no longer needed
            // applySessionKey(password, elements, collectSystemMessage);
            
            // Apply welcome message processing (for storage in share manager)
            applyWelcomeMessage(sharedData, () => {}, false); // Don't display, just process
            
            // Validate state if requested (typically for agent loading)
            if (validateState) {
                console.log('🔍 processSharedData: Performing state validation');
                const validation = validateAgentLoadingState(sharedData, addSystemMessage);
                
                if (!validation.success) {
                    console.error('❌ processSharedData: State validation failed', validation.errors);
                    // Continue processing but log the issues
                }
            }
            
            console.log('🔧 processSharedData: Applying chat messages');
            // Apply conversation history with system messages prepended
            applyChatMessages(sharedData, collectSystemMessage, setMessages, systemMessages);
            
            console.log('✅ processSharedData completed successfully');
            return pendingSharedModel;
            
        } catch (error) {
            console.error('❌ processSharedData failed:', error);
            if (addSystemMessage) {
                addSystemMessage(`Error processing shared data: ${error.message}`);
            }
            throw error; // Re-throw to let caller handle
        }
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
        analyzeSharedDataOptions,
        cleanSlateForAgent,  // Expose cleanSlateForAgent for external use
        validateAgentLoadingState  // Expose validation for external use
    };
}

window.SharedLinkDataProcessor = createSharedLinkDataProcessor();