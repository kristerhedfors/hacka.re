/**
 * SharedLinkDataProcessor - Handles processing and applying shared data
 */
function createSharedLinkDataProcessor() {
    
    /**
     * Mask an API key, showing only first and last 4 bytes
     * @param {string} apiKey - The API key to mask
     * @returns {string} Masked API key
     */
    function maskApiKey(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return "Invalid API key format";
        }
        
        const first4 = apiKey.substring(0, 4);
        const last4 = apiKey.substring(apiKey.length - 4);
        const maskedLength = apiKey.length - 8;
        const maskedPart = '*'.repeat(maskedLength);
        
        return `${first4}${maskedPart}${last4}`;
    }
    
    /**
     * Apply welcome message from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     */
    function applyWelcomeMessage(sharedData, addSystemMessage) {
        // If there's a welcome message, display it as a system message
        if (sharedData.welcomeMessage) {
            if (addSystemMessage) {
                // Display the welcome message directly as a system message
                addSystemMessage(sharedData.welcomeMessage);
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
            StorageService.saveApiKey(sharedData.apiKey);
            const maskedApiKey = maskApiKey(sharedData.apiKey);
            if (addSystemMessage) {
                addSystemMessage(`Shared API key (${maskedApiKey}) has been applied.`);
            }
        }
        
        // If there's a base URL, save it too
        if (sharedData.baseUrl) {
            StorageService.saveBaseUrl(sharedData.baseUrl);
            if (addSystemMessage) {
                addSystemMessage(`Shared base URL has been applied.`);
            }
        }
        
        // If there's a system prompt, save it too
        if (sharedData.systemPrompt) {
            StorageService.saveSystemPrompt(sharedData.systemPrompt);
            if (addSystemMessage) {
                addSystemMessage(`Shared system prompt has been applied.`);
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
        
        // If there's a model, check if it's available and apply it
        if (sharedData.model) {
            pendingSharedModel = sharedData.model;
            
            // Show a message about the model preference
            if (addSystemMessage) {
                addSystemMessage(`Shared model preference "${sharedData.model}" will be applied if available.`);
            }
            
            // Save the model to storage immediately to ensure it's available for API requests
            StorageService.saveModel(sharedData.model);
            
            // If we have a model manager, set the pending shared model there too
            if (window.aiHackare && window.aiHackare.settingsManager && 
                typeof window.aiHackare.settingsManager.setPendingSharedModel === 'function') {
                window.aiHackare.settingsManager.setPendingSharedModel(sharedData.model);
            }
        }
        
        return pendingSharedModel;
    }
    
    /**
     * Apply chat messages from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @param {Function} setMessages - Function to set chat messages
     */
    function applyChatMessages(sharedData, addSystemMessage, setMessages) {
        // If there are shared messages, update the chat
        if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
            setMessages(sharedData.messages);
            if (addSystemMessage) {
                addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
            }
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
            
            // Apply the selected prompts as system prompt
            PromptsService.applySelectedPromptsAsSystem();
        }
    }
    
    /**
     * Apply functions from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     */
    function applyFunctions(sharedData, addSystemMessage) {
        // If there are shared functions, save them
        if (sharedData.functions && typeof sharedData.functions === 'object') {
            Object.keys(sharedData.functions).forEach(functionName => {
                const functionData = sharedData.functions[functionName];
                FunctionToolsService.addJsFunction(
                    functionName,
                    functionData.code,
                    functionData.toolDefinition
                );
            });
            
            if (addSystemMessage) {
                addSystemMessage(`Shared function library with ${Object.keys(sharedData.functions).length} functions has been loaded.`);
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
                    const token = sharedData.mcpConnections[serviceKey];
                    
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
                    setTimeout(() => {
                        connectionKeys.forEach(serviceKey => {
                            // Try to recreate the connection automatically
                            if (window.MCPServiceConnectors.quickConnect && serviceKey === 'github') {
                                window.MCPServiceConnectors.quickConnect('github')
                                    .then(() => {
                                        console.log(`Auto-reconnected to ${serviceKey} MCP service`);
                                    })
                                    .catch(error => {
                                        console.warn(`Failed to auto-reconnect to ${serviceKey} MCP service:`, error);
                                    });
                            }
                        });
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
     * Process all shared data
     * @param {Object} sharedData - Shared data object
     * @param {string} password - Decryption password
     * @param {Object} options - Processing options
     * @returns {Promise<string|null>} Pending shared model
     */
    async function processSharedData(sharedData, password, options = {}) {
        const { addSystemMessage, setMessages, elements } = options;
        
        // Apply data in order of dependency
        applyWelcomeMessage(sharedData, addSystemMessage);
        applyApiConfiguration(sharedData, addSystemMessage);
        const pendingSharedModel = applyModelConfiguration(sharedData, addSystemMessage);
        applyChatMessages(sharedData, addSystemMessage, setMessages);
        applyPrompts(sharedData, addSystemMessage);
        applyFunctions(sharedData, addSystemMessage);
        await applyMcpConnections(sharedData, addSystemMessage);
        applySessionKey(password, elements, addSystemMessage);
        
        return pendingSharedModel;
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
        processSharedData
    };
}

window.SharedLinkDataProcessor = createSharedLinkDataProcessor();