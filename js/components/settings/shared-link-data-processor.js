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
     * @param {boolean} displayMessage - Whether to display the message or just store it
     */
    function applyWelcomeMessage(sharedData, displayMessage = true) {
        // If there's a welcome message, handle it appropriately
        if (sharedData.welcomeMessage) {
            // Store the welcome message in the share manager for future use (for share modal pre-population)
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSharedWelcomeMessage(sharedData.welcomeMessage);
            }
            
            // Store the welcome message for prepending to conversation history
            if (displayMessage) {
                console.log('[SharedLink] Storing welcome message to be prepended to conversation history');
                
                // Store for prepending to messages array (NEW APPROACH - replaces deferred display)
                window._welcomeMessageToPrepend = {
                    role: 'system',
                    content: sharedData.welcomeMessage,
                    className: 'welcome-message'
                };
                
                console.log('[SharedLink] Welcome message stored to be prepended to conversation history');
            }
        }
    }
    
    /**
     * Apply API configuration from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Object} Configuration summary for consolidated message
     */
    function applyApiConfiguration(sharedData, addSystemMessage) {
        const configSummary = {
            apiKey: null,
            provider: null,
            baseUrl: null,
            model: null,
            systemPrompt: false
        };
        
        // Save the shared API key
        if (sharedData.apiKey) {
            if (DataService && typeof DataService.saveApiKey === 'function') {
                DataService.saveApiKey(sharedData.apiKey);
            } else {
                StorageService.saveApiKey(sharedData.apiKey);
            }
            configSummary.apiKey = maskApiKey(sharedData.apiKey);
        }
        
        // If there's a base URL, save it too
        if (sharedData.baseUrl) {
            if (DataService && typeof DataService.saveBaseUrl === 'function') {
                DataService.saveBaseUrl(sharedData.baseUrl);
            } else {
                StorageService.saveBaseUrl(sharedData.baseUrl);
            }
            configSummary.baseUrl = sharedData.baseUrl;
        }
        
        // If there's a system prompt, save it too
        if (sharedData.systemPrompt) {
            if (DataService && typeof DataService.saveSystemPrompt === 'function') {
                DataService.saveSystemPrompt(sharedData.systemPrompt);
            } else {
                StorageService.saveSystemPrompt(sharedData.systemPrompt);
            }
            configSummary.systemPrompt = true;
        }
        
        // If there's a provider, save it and set the appropriate base URL
        if (sharedData.provider) {
            // Save the provider
            if (DataService && typeof DataService.saveBaseUrlProvider === 'function') {
                DataService.saveBaseUrlProvider(sharedData.provider);
            } else if (StorageService && typeof StorageService.saveBaseUrlProvider === 'function') {
                StorageService.saveBaseUrlProvider(sharedData.provider);
            }
            
            configSummary.provider = sharedData.provider;
            
            // Always set the base URL for known providers, not just when baseUrl is missing
            let defaultBaseUrl = null;
            if (DataService && typeof DataService.getDefaultBaseUrlForProvider === 'function') {
                defaultBaseUrl = DataService.getDefaultBaseUrlForProvider(sharedData.provider);
            }
            
            if (defaultBaseUrl) {
                // Save the base URL
                if (DataService && typeof DataService.saveBaseUrl === 'function') {
                    DataService.saveBaseUrl(defaultBaseUrl);
                } else {
                    StorageService.saveBaseUrl(defaultBaseUrl);
                }
                if (!configSummary.baseUrl) {
                    configSummary.baseUrl = defaultBaseUrl;
                }
            }
        }
        
        // Store model info if present (will be applied later)
        if (sharedData.model) {
            configSummary.model = sharedData.model;
        }
        
        return configSummary;
    }
    
    /**
     * Apply model configuration from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {string|null} Pending shared model
     */
    async function applyModelConfiguration(sharedData, addSystemMessage) {
        let pendingSharedModel = null;
        
        // If there's a model, just use it - let the API determine availability
        if (sharedData.model) {
            let modelToUse = sharedData.model;
            
            // Log the model being applied
            console.log(`🔍 Applying shared model: "${sharedData.model}"`);
            
            // Don't add individual messages here - will be consolidated later
            if (sharedData.provider) {
                console.log(`🔍 Provider: ${sharedData.provider}, Model: ${sharedData.model}`);
            } else {
                console.log(`🔍 No provider info, using model "${sharedData.model}" as-is`);
            }
            
            // Trigger model list refresh after API configuration is applied
            // This ensures we have the actual available models from the API
            if (window.aiHackare && window.aiHackare.settingsManager && 
                window.aiHackare.settingsManager.componentManagers && 
                window.aiHackare.settingsManager.componentManagers.model) {
                
                const modelManager = window.aiHackare.settingsManager.componentManagers.model;
                const apiKey = StorageService.getApiKey() || (DataService && DataService.getApiKey && DataService.getApiKey());
                const baseUrl = StorageService.getBaseUrl() || (DataService && DataService.getBaseUrl && DataService.getBaseUrl());
                
                if (apiKey && baseUrl && typeof modelManager.fetchAvailableModels === 'function') {
                    console.log('🔄 Refreshing model list from API before applying shared model...');
                    try {
                        await modelManager.fetchAvailableModels(apiKey, baseUrl, false);
                        console.log('✅ Model list refreshed from API');
                    } catch (error) {
                        console.warn('⚠️ Failed to refresh model list:', error);
                    }
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
     * DEPRECATED: We now let the API determine model availability instead of hardcoded patterns
     * @param {string} model - Model ID
     * @param {string} provider - Provider name
     * @returns {boolean} Always returns true to allow API validation
     */
    function validateModelProviderCompatibility(model, provider) {
        // Always return true - let the API determine if the model is actually available
        // The API will provide the actual list of available models
        console.log(`[Deprecated] Model validation bypassed for ${model} on ${provider} - will check with API`);
        return true;
    }
    
    /**
     * Get a compatible model for a provider
     * @param {string} provider - Provider name
     * @returns {string|null} Compatible model ID or null
     */
    function getCompatibleModelForProvider(provider) {
        // Use configuration if available
        if (window.DefaultModelsConfig) {
            return window.DefaultModelsConfig.getCompatibleModel(provider);
        }
        
        // Fallback to hardcoded values
        const compatibleModels = {
            'openai': 'gpt-5-nano',
            'groq': 'llama-3.3-70b-versatile', // Updated to Llama 3.3 - replacement for deprecated 3.1
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
            console.log('[SharedLinkDataProcessor] Returning to existing namespace');
            
            // Check if there's actual conversation history in localStorage
            let hasLocalConversation = false;
            try {
                const history = window.StorageService.loadChatHistory();
                hasLocalConversation = history && history.length > 0 && 
                    history.some(msg => msg.role === 'user' || msg.role === 'assistant');
            } catch (error) {
                console.log('[SharedLinkDataProcessor] Could not check localStorage history:', error);
            }
            
            if (hasLocalConversation) {
                console.log('[SharedLinkDataProcessor] Found existing localStorage conversation - using that');
                
                if (addSystemMessage) {
                    addSystemMessage('Returning to existing namespace - loading your conversation history...');
                }
                
                // Trigger conversation history reload via chat manager
                if (window.aiHackare && window.aiHackare.chatManager && 
                    window.aiHackare.chatManager.reloadConversationHistory) {
                    console.log('[SharedLinkDataProcessor] Triggering conversation reload from localStorage');
                    setTimeout(() => {
                        console.log('[SharedLinkDataProcessor] Triggering conversation reload');
                        window.aiHackare.chatManager.reloadConversationHistory();
                    }, 100);
                }
                
                return;
            } else {
                console.log('[SharedLinkDataProcessor] No localStorage conversation found - using shared data');
                // Fall through to load shared data below
            }
        }
        
        // For new namespaces, first-time shared links, or existing namespaces without localStorage conversation
        console.log('[SharedLinkDataProcessor] Checking shared data messages:', {
            hasMessages: !!(sharedData.messages),
            messageCount: sharedData.messages ? sharedData.messages.length : 0,
            hasSetMessages: !!setMessages,
            firstMessage: sharedData.messages && sharedData.messages[0] ? sharedData.messages[0] : null
        });
        
        if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
            // Add system message about conversation loading
            if (addSystemMessage) {
                addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
            }
            
            console.log('[SharedLinkDataProcessor] Loading shared conversation with', sharedData.messages.length, 'messages');
            
            // Combine system messages with shared conversation history
            // Note: systemMessages includes the welcome message, which is always present
            const allMessages = [...systemMessages, ...sharedData.messages];
            setMessages(allMessages);
        } else if (systemMessages.length > 0 && setMessages) {
            // Only system messages (including welcome message) - no actual conversation
            console.log('[SharedLinkDataProcessor] No shared messages, only system messages:', systemMessages.length);
            setMessages(systemMessages);
        } else {
            console.log('[SharedLinkDataProcessor] No messages to set at all');
        }
    }
    
    /**
     * Apply prompts from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Object} Prompts summary
     */
    function applyPrompts(sharedData, addSystemMessage) {
        const promptsSummary = {
            promptCount: 0,
            selectedCount: 0,
            defaultSelectedCount: 0
        };
        
        // If there are shared prompts, save them
        if (sharedData.prompts && Array.isArray(sharedData.prompts)) {
            sharedData.prompts.forEach(prompt => {
                PromptsService.savePrompt(prompt);
            });
            promptsSummary.promptCount = sharedData.prompts.length;
        }
        
        // If there are shared selected prompt IDs, save them
        if (sharedData.selectedPromptIds && Array.isArray(sharedData.selectedPromptIds)) {
            PromptsService.setSelectedPromptIds(sharedData.selectedPromptIds);
            promptsSummary.selectedCount = sharedData.selectedPromptIds.length;
        }
        
        // Apply shared default prompt selections (or reset to default if not present)
        if (window.DefaultPromptsService) {
            if (sharedData.selectedDefaultPromptIds && Array.isArray(sharedData.selectedDefaultPromptIds)) {
                // Apply specific default prompt selections from shared data
                window.DefaultPromptsService.setSelectedDefaultPromptIds(sharedData.selectedDefaultPromptIds);
                promptsSummary.defaultSelectedCount = sharedData.selectedDefaultPromptIds.length;
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
        
        return promptsSummary;
    }
    
    /**
     * Apply RAG settings from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Object} RAG configuration summary
     */
    function applyRAGSettings(sharedData, addSystemMessage) {
        const ragSummary = {
            ragEnabled: false,
            ragAvailable: false,
            documents: []
        };
        
        // Check if RAG is available for the provider
        const provider = sharedData.provider || StorageService.getBaseUrlProvider();
        ragSummary.ragAvailable = (provider === 'openai');
        
        // Apply RAG enabled state
        if (sharedData.ragEnabled !== undefined && window.RAGStorageService) {
            window.RAGStorageService.setRAGEnabled(sharedData.ragEnabled);
            ragSummary.ragEnabled = sharedData.ragEnabled;
            
            // Update checkbox UI if available
            const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
            if (ragEnabledCheckbox) {
                ragEnabledCheckbox.checked = sharedData.ragEnabled;
            }
        }
        
        // Apply enabled EU documents
        if (sharedData.ragEUDocuments && Array.isArray(sharedData.ragEUDocuments) && window.RAGStorageService) {
            window.RAGStorageService.setEnabledEUDocuments(sharedData.ragEUDocuments);
            
            // Update checkbox UI for each document
            ['cra', 'aia', 'dora'].forEach(docId => {
                const checkbox = document.getElementById(`rag-doc-${docId}`);
                if (checkbox) {
                    checkbox.checked = sharedData.ragEUDocuments.includes(docId);
                }
            });
            
            if (sharedData.ragEUDocuments.length > 0) {
                const docNames = {
                    'cra': 'CRA',
                    'aia': 'AIA',
                    'dora': 'DORA'
                };
                ragSummary.documents = sharedData.ragEUDocuments.map(id => docNames[id] || id);
            }
        }
        
        return ragSummary;
    }
    
    /**
     * Apply functions from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @param {boolean} systematicActivation - Whether to systematically control tool activation (default: false for backwards compatibility)
     * @returns {Object} Functions summary
     */
    function applyFunctions(sharedData, addSystemMessage, systematicActivation = false) {
        const functionCount = sharedData.functions ? Object.keys(sharedData.functions).length : 0;
        const enabledCount = sharedData.enabledFunctions ? sharedData.enabledFunctions.length : 0;
        
        if (functionCount > 0 || enabledCount > 0) {
            console.log(`Applying ${functionCount} functions with ${enabledCount} enabled`);
        }
        
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
            
            // Store summary info instead of adding message
            const collectionCount = Object.keys(collectionMetadata).length;
        }
        
        // Handle function activation based on mode
        if (sharedData.enabledFunctions && Array.isArray(sharedData.enabledFunctions)) {
            if (systematicActivation) {
                // Systematic activation: Only activate/deactivate functions that match the agent's configuration
                const allFunctions = Object.keys(FunctionToolsService.getJsFunctions());
                
                // Disable functions that are not in the enabled list
                allFunctions.forEach(functionName => {
                    const shouldBeEnabled = sharedData.enabledFunctions.includes(functionName);
                    const isCurrentlyEnabled = FunctionToolsService.isJsFunctionEnabled(functionName);
                    
                    if (shouldBeEnabled && !isCurrentlyEnabled) {
                        FunctionToolsService.enableJsFunction(functionName);
                    } else if (!shouldBeEnabled && isCurrentlyEnabled) {
                        FunctionToolsService.disableJsFunction(functionName);
                    }
                });
                
            } else {
                // Legacy behavior: Disable all, then enable specified ones
                const allFunctions = Object.keys(FunctionToolsService.getJsFunctions());
                allFunctions.forEach(functionName => {
                    FunctionToolsService.disableJsFunction(functionName);
                });
                
                // Then enable only the shared enabled functions
                sharedData.enabledFunctions.forEach(functionName => {
                    FunctionToolsService.enableJsFunction(functionName);
                });
            }
            
            // Summary info captured below
        }
        
        // Apply function tools enabled state
        let functionToolsEnabled = false;
        if (typeof sharedData.functionToolsEnabled === 'boolean' && FunctionToolsService && typeof FunctionToolsService.setFunctionToolsEnabled === 'function') {
            FunctionToolsService.setFunctionToolsEnabled(sharedData.functionToolsEnabled, null); // Don't add message
            functionToolsEnabled = sharedData.functionToolsEnabled;
        } else {
            // Fallback: Enable function tools if we have functions
            const hasFunctions = (sharedData.functions && Object.keys(sharedData.functions).length > 0) ||
                               (sharedData.enabledFunctions && sharedData.enabledFunctions.length > 0);
            
            if (hasFunctions && FunctionToolsService && typeof FunctionToolsService.setFunctionToolsEnabled === 'function') {
                FunctionToolsService.setFunctionToolsEnabled(true, null); // Don't add message
                functionToolsEnabled = true;
            }
        }
        
        // Apply default function selections if present
        if (window.DefaultFunctionsService && (sharedData.selectedDefaultFunctionIds || sharedData.selectedDefaultFunctionCollectionIds)) {
            // Apply default function collection selections
            if (sharedData.selectedDefaultFunctionCollectionIds && typeof window.DefaultFunctionsService.setSelectedDefaultFunctionIds === 'function') {
                window.DefaultFunctionsService.setSelectedDefaultFunctionIds(sharedData.selectedDefaultFunctionCollectionIds);
            }
            
            // Apply individual default function selections
            if (sharedData.selectedDefaultFunctionIds && typeof window.DefaultFunctionsService.setSelectedIndividualFunctionIds === 'function') {
                window.DefaultFunctionsService.setSelectedIndividualFunctionIds(sharedData.selectedDefaultFunctionIds);
                
                // Load the selected default functions into the system
                if (typeof window.DefaultFunctionsService.loadSelectedDefaultFunctions === 'function') {
                    window.DefaultFunctionsService.loadSelectedDefaultFunctions();
                }
            }
        }
        
        // Return summary of what was applied
        return {
            functionCount: functionCount,
            enabledCount: enabledCount,
            collectionCount: sharedData.functionCollectionMetadata ? Object.keys(sharedData.functionCollectionMetadata).length : 0,
            toolsEnabled: functionToolsEnabled,
            enabledFunctions: sharedData.enabledFunctions || [],
            defaultFunctionCount: (sharedData.selectedDefaultFunctionIds || []).length + (sharedData.selectedDefaultFunctionCollectionIds || []).length
        };
    }
    
    /**
     * Apply theme from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {string|null} Theme name
     */
    function applyTheme(sharedData, addSystemMessage) {
        if (sharedData.theme && window.ThemeService) {
            // Apply the theme using ThemeService
            if (window.ThemeService.applyTheme) {
                window.ThemeService.applyTheme(sharedData.theme);
                return sharedData.theme;
            }
        }
        return null;
    }
    
    /**
     * Apply MCP connections from shared data
     * @param {Object} sharedData - Shared data object
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Promise<Object>} MCP summary
     */
    async function applyMcpConnections(sharedData, addSystemMessage) {
        // If there are shared MCP connections, restore them
        if (sharedData.mcpConnections && typeof sharedData.mcpConnections === 'object') {
            try {
                const connectionKeys = Object.keys(sharedData.mcpConnections);
                let appliedCount = 0;
                
                for (const serviceKey of connectionKeys) {
                    const connectionData = sharedData.mcpConnections[serviceKey];
                    
                    if (serviceKey === 'gmail' && typeof connectionData === 'object' && connectionData.refreshToken) {
                        // Gmail uses OAuth - store the complete OAuth object
                        const storageKey = 'mcp_gmail_oauth';
                        await window.CoreStorageService.setValue(storageKey, connectionData);
                        console.log('Applied Gmail OAuth from shared link');
                        
                        // Automatically register Gmail functions after OAuth is restored
                        if (window.mcpServiceManager && window.mcpServiceManager.registerGmailFunctions) {
                            try {
                                await window.mcpServiceManager.registerGmailFunctions(connectionData);
                                console.log('✅ Gmail functions automatically registered after OAuth restore');
                            } catch (error) {
                                console.warn('Failed to auto-register Gmail functions:', error);
                            }
                        }
                    } else if (serviceKey === 'github') {
                        // GitHub uses PAT tokens - extract string token from object if needed
                        let token = connectionData;
                        if (typeof connectionData === 'object' && connectionData !== null && connectionData.token) {
                            token = connectionData.token;
                        } else if (typeof connectionData !== 'string') {
                            console.error(`Invalid GitHub token format`);
                            continue;
                        }
                        
                        // Store the PAT token using the appropriate storage key
                        const storageKey = 'mcp_github_token';
                        await window.CoreStorageService.setValue(storageKey, token);
                        console.log('Applied GitHub PAT from shared link');
                    } else if (serviceKey === 'shodan') {
                        // Shodan uses API key - should be a string
                        let apiKey = connectionData;
                        if (typeof connectionData === 'object' && connectionData !== null && connectionData.key) {
                            apiKey = connectionData.key;
                        } else if (typeof connectionData !== 'string') {
                            console.error(`Invalid Shodan API key format`);
                            continue;
                        }
                        
                        // Store the API key using the same storage key as MCP service connectors
                        const storageKey = 'mcp_shodan_api_key';
                        await window.CoreStorageService.setValue(storageKey, apiKey);
                        console.log('Applied Shodan API key from shared link');
                        
                        // Also store in the sharing format for configuration service compatibility
                        await window.CoreStorageService.setValue('shodan_api_key', apiKey);
                        
                        // Automatically connect to Shodan if mcpServiceManager is available
                        if (window.mcpServiceManager && window.mcpServiceManager.connectService) {
                            try {
                                // Connect using the stored API key with proper object format
                                const result = await window.mcpServiceManager.connectService('shodan', { apiKey: apiKey });
                                
                                if (result) {
                                    console.log('Shodan auto-connection successful from shared link');
                                } else {
                                    console.warn('Shodan auto-connection returned false');
                                }
                            } catch (error) {
                                console.warn('Failed to auto-connect Shodan service:', error);
                                // Don't let Shodan connection errors break the entire shared link processing
                            }
                        }
                    } else {
                        console.warn(`Unknown MCP service type: ${serviceKey}`, connectionData);
                        continue;
                    }
                    
                    
                    appliedCount++;
                }
                
                // Return summary info
                return {
                    mcpCount: appliedCount,
                    services: connectionKeys
                };
                
                // Trigger MCP service connector to recreate connections if available
                if (window.mcpServiceManager) {
                    // Delay slightly to ensure storage is committed
                    setTimeout(async () => {
                        for (const serviceKey of connectionKeys) {
                            // Try to recreate the connection automatically
                            if (window.mcpServiceManager.quickConnect && serviceKey === 'github') {
                                try {
                                    // First validate the token before attempting connection
                                    const storageKey = `mcp_${serviceKey}_token`;
                                    const token = await window.CoreStorageService.getValue(storageKey);
                                    
                                    
                                    if (token && window.mcpServiceManager.validateGitHubToken) {
                                        const isValid = await window.mcpServiceManager.validateGitHubToken(token);
                                        if (!isValid) {
                                            console.warn(`[MCP Auto-reconnect] Invalid ${serviceKey} token detected, skipping auto-reconnection. Manual reconnection required.`);
                                            if (addSystemMessage) {
                                                addSystemMessage(`${serviceKey} MCP connection restored but token is invalid. Please reconnect manually in the MCP Servers panel.`);
                                            }
                                            continue;
                                        }
                                    }
                                    
                                    const connected = await window.mcpServiceManager.quickConnect('github');
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
                            } else if (serviceKey === 'shodan') {
                                // Shodan connections are already established immediately during restore
                                // Skip delayed reconnection to avoid double connection attempts
                                console.log(`Skipping delayed reconnection for ${serviceKey} - already connected during restore`);
                            }
                        }
                    }, 100);
                }
                
            } catch (error) {
                console.error('Error applying MCP connections from shared data:', error);
                // Return error summary
                return {
                    mcpCount: 0,
                    services: [],
                    error: error.message
                };
            }
        }
        
        return {
            mcpCount: 0,
            services: []
        };
    }
    
    /**
     * Apply session key from decryption password
     * @param {Function} addSystemMessage - Function to add system messages
     */
    function applySessionKey(addSystemMessage) {
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
        if (window.mcpServiceManager) {
            try {
                const services = window.mcpServiceManager.getConnectedServices();
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
                const connectedServices = window.mcpServiceManager ? window.mcpServiceManager.getConnectedServices() : [];
                
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
    async function processSharedData(sharedData, options = {}) {
        const { addSystemMessage, setMessages, displayWelcomeMessage = true, cleanSlate = false, validateState = false } = options;
        
        // Set flag to prevent cross-tab sync loops during processing
        window._processingSharedLink = true;
        
        // Set longer-lasting flag to prevent namespace delayed reload
        window._sharedLinkProcessed = true;
        
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
            const configSummary = applyApiConfiguration(sharedData, null); // Don't add individual messages
            const pendingSharedModel = await applyModelConfiguration(sharedData, null); // Don't add individual messages
            
            // Apply RAG settings and check availability
            console.log('🔧 processSharedData: Applying RAG settings');
            const ragSummary = applyRAGSettings(sharedData, null); // Don't add individual messages
            
            // Create consolidated configuration message
            if (collectSystemMessage) {
                const messageParts = [];
                
                // Get provider and model flags
                const getProviderFlag = (provider) => {
                    const providerFlags = {
                        'openai': '🇺🇸',
                        'groq': '🇺🇸',
                        'berget': '🇸🇪',
                        'ollama': '🏠', // Local/home icon for local models
                        'anthropic': '🇺🇸',
                        'google': '🇺🇸',
                        'cohere': '🇨🇦',
                        'ai21': '🇮🇱',
                        'mistral': '🇫🇷',
                        'perplexity': '🇺🇸',
                        'together': '🇺🇸',
                        'replicate': '🇺🇸'
                    };
                    return providerFlags[provider?.toLowerCase()] || '';
                };
                
                // API configuration message
                if (configSummary.apiKey || configSummary.provider || configSummary.baseUrl) {
                    if (configSummary.provider) {
                        const providerFlag = getProviderFlag(configSummary.provider);
                        let providerMsg = providerFlag ? `${providerFlag} ${configSummary.provider}` : configSummary.provider;
                        providerMsg += ' provider';
                        
                        if (configSummary.baseUrl) {
                            providerMsg += ` (${configSummary.baseUrl})`;
                        }
                        if (configSummary.apiKey) {
                            providerMsg += ` with key ${configSummary.apiKey}`;
                        }
                        if (configSummary.model || pendingSharedModel) {
                            const modelId = configSummary.model || pendingSharedModel;
                            // Get model flag if ModelCountryMapping is available
                            let modelWithFlag = modelId;
                            if (window.ModelCountryMapping && window.ModelCountryMapping.getModelFlag) {
                                const modelFlag = window.ModelCountryMapping.getModelFlag(modelId);
                                if (modelFlag) {
                                    modelWithFlag = `${modelFlag} ${modelId}`;
                                }
                            }
                            providerMsg += `, model "${modelWithFlag}"`;
                        }
                        messageParts.push(providerMsg);
                    } else if (configSummary.apiKey) {
                        let keyMsg = `API key ${configSummary.apiKey}`;
                        if (configSummary.baseUrl) {
                            keyMsg += `, endpoint ${configSummary.baseUrl}`;
                        }
                        messageParts.push(keyMsg);
                    }
                }
                
                // RAG will be mentioned in the "Loaded:" message if enabled
                // Don't mention RAG in the "Configuration applied:" message
                
                if (configSummary.systemPrompt) {
                    messageParts.push('custom system prompt');
                }
                
                // Create single consolidated message if there's anything to report
                if (messageParts.length > 0) {
                    const message = `Configuration applied: ${messageParts.join(', ')}.`;
                    collectSystemMessage(message);
                }
            }
            
            // Apply other configurations and collect summaries
            console.log('🔧 processSharedData: Applying prompts and functions');
            const promptsSummary = applyPrompts(sharedData, null); // Don't add individual messages
            
            // Use systematic activation for agent loading when cleanSlate is true
            const functionsSummary = applyFunctions(sharedData, null, cleanSlate); // Don't add individual messages
            
            console.log('🔧 processSharedData: Applying MCP connections');
            const mcpSummary = await applyMcpConnections(sharedData, null); // Don't add individual messages
            
            // Apply theme if included in shared data
            console.log('🔧 processSharedData: Applying theme');
            const themeName = applyTheme(sharedData, null); // Don't add individual messages
            
            // Create consolidated secondary message for all other configurations
            if (collectSystemMessage) {
                const additionalParts = [];
                
                // Prompts summary - just show count since we only share active ones
                const totalPrompts = promptsSummary.promptCount + promptsSummary.selectedCount + promptsSummary.defaultSelectedCount;
                if (totalPrompts > 0) {
                    additionalParts.push(`${totalPrompts} prompt${totalPrompts !== 1 ? 's' : ''}`);
                }
                
                // Functions summary
                if (functionsSummary.functionCount > 0 || functionsSummary.enabledCount > 0) {
                    // Show function names if there are 5 or fewer
                    if (functionsSummary.enabledCount > 0 && functionsSummary.enabledCount <= 5 && functionsSummary.enabledFunctions.length > 0) {
                        additionalParts.push(`Functions: ${functionsSummary.enabledFunctions.join(', ')}`);
                    } else if (functionsSummary.functionCount > 0) {
                        // Just show count if more than 5
                        additionalParts.push(`${functionsSummary.functionCount} function${functionsSummary.functionCount !== 1 ? 's' : ''}`);
                    }
                } else if (functionsSummary.defaultFunctionCount > 0) {
                    // Show default function selections even if no user functions
                    additionalParts.push(`${functionsSummary.defaultFunctionCount} default function${functionsSummary.defaultFunctionCount !== 1 ? 's' : ''}`);
                }
                
                // MCP summary
                if (mcpSummary.mcpCount > 0) {
                    const mcpServices = mcpSummary.services.join(', ');
                    additionalParts.push(`MCP: ${mcpServices}`);
                } else if (mcpSummary.error) {
                    additionalParts.push(`MCP error`);
                }
                
                // Theme
                if (themeName) {
                    const displayTheme = themeName.charAt(0).toUpperCase() + themeName.slice(1);
                    additionalParts.push(`Theme: ${displayTheme}`);
                }
                
                // RAG indicator - add to "Loaded:" message if enabled and available
                if (ragSummary.ragEnabled && ragSummary.ragAvailable && ragSummary.documents.length > 0) {
                    additionalParts.push(`RAG enabled with documents: ${ragSummary.documents.join(', ')}`);
                }
                
                // Welcome message indicator
                if (sharedData.welcomeMessage && displayWelcomeMessage) {
                    additionalParts.push('Welcome message');
                }
                
                // Create the consolidated additional features message
                if (additionalParts.length > 0) {
                    const message = `Loaded: ${additionalParts.join(' | ')}`;
                    collectSystemMessage(message);
                }
            }
            
            // Session key is now applied immediately in shared-link-manager.js when password is validated
            // This redundant call is no longer needed
            // applySessionKey(password, elements, collectSystemMessage);
            
            // Apply welcome message processing (store for deferred display when password verification completes)
            if (displayWelcomeMessage) {
                applyWelcomeMessage(sharedData, true); // Store welcome message for prepending
            } else {
                applyWelcomeMessage(sharedData, false); // Just process for share manager
            }
            
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
            
            // Note: Removed UI refresh logic as it may be interfering with API requests
            // The MCP connections and function registrations happen automatically
            console.log('🔧 processSharedData: MCP connections and functions registered automatically');
            
            console.log('✅ processSharedData completed successfully');
            
            // Clear the processing flag immediately to avoid blocking chat
            window._processingSharedLink = false;
            
            // Clear the shared link processed flag after a delay to allow all related operations to complete
            setTimeout(() => {
                window._sharedLinkProcessed = false;
                console.log('[SharedLink] Processing complete - chat functionality restored');
            }, 2000); // Allow more time for all async operations to complete
            
            return pendingSharedModel;
            
        } catch (error) {
            console.error('❌ processSharedData failed:', error);
            
            // Clear the processing flag even on error
            window._processingSharedLink = false;
            
            // Clear the shared link processed flag after a delay even on error
            setTimeout(() => {
                window._sharedLinkProcessed = false;
                console.log('[SharedLink] Cleared _sharedLinkProcessed flag after error');
            }, 500); // Short delay
            
            if (addSystemMessage) {
                addSystemMessage(`Error processing shared data: ${error.message}`);
            }
            throw error; // Re-throw to let caller handle
        }
    }
    
    // Legacy deferred display system removed - now using prepending approach in ChatManager
    
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
        applyRAGSettings,
        applyFunctions,
        applyMcpConnections,
        applyTheme,
        applySessionKey,
        processSharedData,
        analyzeSharedDataOptions,
        cleanSlateForAgent,  // Expose cleanSlateForAgent for external use
        validateAgentLoadingState  // Expose validation for external use
    };
}

window.SharedLinkDataProcessor = createSharedLinkDataProcessor();