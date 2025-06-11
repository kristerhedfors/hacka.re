/**
 * Settings Manager Module
 * 
 * Central coordinator for all settings-related functionality in the AIHackare application.
 * This module orchestrates various specialized managers for different aspects of settings:
 * - API Key management
 * - Model selection and fetching
 * - System prompt configuration
 * - Base URL management
 * - Title/Subtitle customization
 * - Welcome modal handling
 * - Shared link processing
 * - Tool calling configuration
 */

window.SettingsManager = (function() {
    'use strict';
    
    // Constants
    const MODEL_FETCH_INTERVAL = 60000; // 1 minute in milliseconds
    
    /**
     * Create a Settings Manager instance
     * @param {Object} elements - DOM elements required by various settings components
     * @returns {Object} Settings Manager instance with public methods
     */
    function createSettingsManager(elements) {
        // Validate required elements
        if (!elements) {
            throw new Error('DOM elements object is required for SettingsManager');
        }
        
        // Component managers - each handles a specific aspect of settings
        const componentManagers = {
            apiKey: ApiKeyManager.createApiKeyManager(),
            model: ModelManager.createModelManager(elements),
            systemPrompt: SystemPromptManager.createSystemPromptManager(elements),
            baseUrl: BaseUrlManager.createBaseUrlManager(elements),
            titleSubtitle: TitleSubtitleManager.createTitleSubtitleManager(),
            welcome: WelcomeManager.createWelcomeManager(elements),
            sharedLink: SharedLinkManager.createSharedLinkManager(elements),
            toolCalling: ToolCallingManager.createToolCallingManager()
        };
        
        // State management
        const state = {
            getSessionKey: null,        // Function to get session key
            setMessages: null,          // Function to set chat messages
            lastModelsFetchTime: 0,     // Track when models were last fetched
            updateModelInfoDisplay: null // Function to update model info display
        };
        
        // Helper functions
        /**
         * Create a callback to update context usage
         * @returns {Function} Callback function for context usage updates
         */
        function createContextUsageCallback() {
            return () => {
                if (window.aiHackare && window.aiHackare.chatManager && state.updateModelInfoDisplay) {
                    window.aiHackare.chatManager.estimateContextUsage(
                        state.updateModelInfoDisplay,
                        componentManagers.model.getCurrentModel()
                    );
                }
            };
        }
        
        /**
         * Initialize the settings manager
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} showApiKeyModal - Function to show API key modal
         * @param {Function} addSystemMessage - Function to add system message
         * @param {Function} sessionKeyGetter - Function to get the session key
         * @param {Function} messagesUpdater - Function to update chat messages
         */
        function init(updateModelInfoDisplay, showApiKeyModal, addSystemMessage, sessionKeyGetter, messagesUpdater) {
            // Store callback functions in state
            state.getSessionKey = sessionKeyGetter;
            state.setMessages = messagesUpdater;
            state.updateModelInfoDisplay = updateModelInfoDisplay;
            
            // Initialize component managers
            componentManagers.model.init();
            componentManagers.systemPrompt.init();
            componentManagers.baseUrl.init();
            
            // Check if there's a shared API key in the URL
            if (componentManagers.sharedLink.hasSharedLink()) {
                // Show password prompt for decryption
                componentManagers.sharedLink.promptForDecryptionPassword(
                    state.getSessionKey, 
                    state.setMessages, 
                    updateModelInfoDisplay, 
                    addSystemMessage
                ).then(result => {
                    if (result.success) {
                        // If a shared model was provided, fetch models to check if it's available
                        if (result.pendingSharedModel) {
                            // Get the API key and base URL
                            const apiKey = componentManagers.apiKey.getApiKey();
                            const baseUrl = componentManagers.baseUrl.getBaseUrl();
                            
                            // Fetch models with the new values and pass the callback
                            componentManagers.model.fetchAvailableModels(
                                apiKey, 
                                baseUrl, 
                                true, 
                                createContextUsageCallback()
                            ).then(modelResult => {
                                if (modelResult.success && modelResult.model) {
                                    // If a shared model was applied successfully
                                    const displayName = ModelInfoService.getDisplayName(modelResult.model);
                                    if (addSystemMessage) {
                                        addSystemMessage(`Shared model "${displayName}" has been applied.`);
                                    }
                                    
                                    // Update model info display
                                    if (updateModelInfoDisplay) {
                                        updateModelInfoDisplay(componentManagers.model.getCurrentModel());
                                    }
                                } else if (modelResult.model) {
                                    // If a shared model was not available
                                    const displayName = ModelInfoService.getDisplayName(modelResult.model);
                                    if (addSystemMessage) {
                                        addSystemMessage(`Warning: Shared model "${displayName}" is not available with your API key. Using default model instead.`);
                                    }
                                }
                            });
                        } else {
                            // No shared model, just fetch models
                            const apiKey = componentManagers.apiKey.getApiKey();
                            const baseUrl = componentManagers.baseUrl.getBaseUrl();
                            
                            // Fetch models with the new values and pass the callback
                            componentManagers.model.fetchAvailableModels(
                                apiKey, 
                                baseUrl, 
                                true, 
                                createContextUsageCallback()
                            );
                        }
                    } else {
                        // Decryption failed or was cancelled
                        handleInitialApiKeyCheck(showApiKeyModal, updateModelInfoDisplay);
                    }
                });
            } else {
                // No shared link, perform normal initialization
                handleInitialApiKeyCheck(showApiKeyModal, updateModelInfoDisplay);
            }
            
            // Set up event listener for model reload button
            setupModelReloadButton(elements, updateModelInfoDisplay);
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(componentManagers.model.getCurrentModel());
            }
        }
        
        /**
         * Handle initial API key check and setup
         * @param {Function} showApiKeyModal - Function to show API key modal
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         */
        function handleInitialApiKeyCheck(showApiKeyModal, updateModelInfoDisplay) {
            const apiKey = componentManagers.apiKey.getApiKey();
            
            if (!apiKey) {
                // Create a welcome modal to show the first time
                const wasWelcomeShown = componentManagers.welcome.showWelcomeModalIfFirstTime(() => {
                    // Show settings modal after welcome modal is closed
                    if (elements.settingsModal) {
                        elements.settingsModal.classList.add('active');
                    }
                });
                
                // If welcome modal wasn't shown (not first time), show settings modal directly
                if (!wasWelcomeShown) {
                    if (elements.settingsModal) {
                        elements.settingsModal.classList.add('active');
                    }
                }
            } else {
                // Load saved base URL before fetching models
                const baseUrl = componentManagers.baseUrl.getBaseUrl();
                
                // Fetch available models if API key exists
                // Use updateStorage=true to ensure the values are properly loaded
                componentManagers.model.fetchAvailableModels(
                    apiKey, 
                    baseUrl, 
                    true, 
                    createContextUsageCallback()
                );
            }
        }
        
        /**
         * Set up the model reload button event listener
         * @param {Object} elements - DOM elements
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         */
        function setupModelReloadButton(elements, updateModelInfoDisplay) {
            if (!elements.modelReloadBtn) return;
            
            elements.modelReloadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Clear the model select and show loading state
                if (elements.modelSelect) {
                    elements.modelSelect.innerHTML = '<option disabled selected>Loading models...</option>';
                }
                
                // Disable the button and show loading state
                const originalIcon = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                this.disabled = true;
                
                // Get the current values from the UI instead of using stored values
                const currentApiKey = (elements.apiKeyUpdate && elements.apiKeyUpdate.value.trim()) || 
                                    componentManagers.apiKey.getApiKey();
                const currentBaseUrl = (elements.baseUrl && elements.baseUrl.value.trim()) || 
                                     componentManagers.baseUrl.getBaseUrl();
                
                // Fetch models from API using the current UI values
                componentManagers.model.fetchAvailableModels(
                    currentApiKey, 
                    currentBaseUrl, 
                    false, 
                    createContextUsageCallback()
                ).then(() => {
                    // Re-enable the button and restore icon
                    this.innerHTML = originalIcon;
                    this.disabled = false;
                }).catch(() => {
                    // Re-enable the button and restore icon even if there's an error
                    this.innerHTML = originalIcon;
                    this.disabled = false;
                });
            });
        }
        
        /**
         * Add tool calling setting to settings form
         * @param {HTMLElement} settingsForm - The settings form element
         * @param {Function} addSystemMessage - Function to add a system message to the chat
         */
        function addToolCallingSetting(settingsForm, addSystemMessage) {
            if (componentManagers.toolCalling && typeof componentManagers.toolCalling.addToolCallingSetting === 'function') {
                componentManagers.toolCalling.addToolCallingSetting(settingsForm, addSystemMessage);
            }
        }
        
        /**
         * Show the settings modal
         * @param {string} apiKey - Current API key
         * @param {string} currentModel - Current model ID
         * @param {string} systemPrompt - Current system prompt
         * @param {Function} fetchAvailableModels - Function to fetch available models
         * @param {Function} populateDefaultModels - Function to populate default models
         */
        function showSettingsModal(apiKey, currentModel, systemPrompt, fetchAvailableModels, populateDefaultModels) {
            // Update the API key field with masked value if exists
            if (apiKey && elements.apiKeyUpdate) {
                elements.apiKeyUpdate.placeholder = '••••••••••••••••••••••••••';
                
                // Check if we should fetch models
                const currentTime = Date.now();
                const shouldFetchModels = (currentTime - state.lastModelsFetchTime) > MODEL_FETCH_INTERVAL;
                
                if (shouldFetchModels) {
                    console.log("Auto-fetching models (time since last fetch: " + 
                        Math.round((currentTime - state.lastModelsFetchTime) / 1000) + " seconds)");
                    
                    // Show loading state in the model select
                    if (elements.modelSelect) {
                        elements.modelSelect.innerHTML = '<option disabled selected>Loading models...</option>';
                    }
                    
                    // Fetch models
                    fetchAvailableModels().then(() => {
                        // Update last fetch time
                        state.lastModelsFetchTime = Date.now();
                        
                        // Set current model
                        if (currentModel && elements.modelSelect) {
                            elements.modelSelect.value = currentModel;
                        }
                    }).catch(error => {
                        console.error("Error auto-fetching models:", error);
                        populateDefaultModels();
                    });
                } else {
                    console.log("Using cached models (fetched " + 
                        Math.round((currentTime - state.lastModelsFetchTime) / 1000) + " seconds ago)");
                }
            } else {
                populateDefaultModels();
            }
            
            // Set current model
            if (elements.modelSelect && elements.modelSelect.options.length > 0) {
                elements.modelSelect.value = currentModel;
            }
            
            // Show model dropdown and reload button for all providers
            if (elements.modelSelect && elements.modelSelect.parentNode) {
                elements.modelSelect.parentNode.style.display = 'flex';
            }
            
            // Set the provider dropdown
            const currentProvider = DataService.getBaseUrlProvider();
            if (elements.baseUrlSelect) {
                elements.baseUrlSelect.value = currentProvider;
                
                // Show/hide custom URL field based on selection
                if (currentProvider === 'custom') {
                    if (elements.customBaseUrlGroup) {
                        elements.customBaseUrlGroup.style.display = 'block';
                    }
                    if (elements.baseUrl) {
                        elements.baseUrl.value = DataService.getBaseUrl() || '';
                    }
                } else {
                    if (elements.customBaseUrlGroup) {
                        elements.customBaseUrlGroup.style.display = 'none';
                    }
                }
            }
            
            // System prompt is now handled by the system-prompt-manager.js
            // No need to set it here as it's displayed on demand when the user clicks "Show System Prompt"
            
            if (elements.settingsModal) {
                elements.settingsModal.classList.add('active');
            }
        }
        
        /**
         * Save the API key
         * @param {Function} hideApiKeyModal - Function to hide API key modal
         * @param {Function} addSystemMessage - Function to add system message
         */
        function saveApiKey(hideApiKeyModal, addSystemMessage) {
            const newApiKey = elements.apiKeyInput && elements.apiKeyInput.value.trim();
            
            if (newApiKey) {
                // Save API key using the API key manager
                componentManagers.apiKey.saveApiKey(newApiKey, hideApiKeyModal, addSystemMessage);
                
                // Make sure base URL is loaded before fetching models
                const baseUrl = componentManagers.baseUrl.getBaseUrl();
                
                // Fetch available models with the new API key and update storage
                componentManagers.model.fetchAvailableModels(
                    newApiKey, 
                    baseUrl, 
                    true, 
                    createContextUsageCallback()
                ).then(() => {
                    // Update last fetch time
                    state.lastModelsFetchTime = Date.now();
                });
                
                return true;
            }
            
            return false;
        }
        
        /**
         * Save settings
         * @param {Function} hideSettingsModal - Function to hide settings modal
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} addSystemMessage - Function to add system message
         */
        function saveSettings(hideSettingsModal, updateModelInfoDisplay, addSystemMessage) {
            // Save model preference
            const selectedModel = elements.modelSelect && elements.modelSelect.value;
            if (selectedModel) {
                componentManagers.model.saveModel(selectedModel);
            }
            
            // Get values from UI
            const newApiKey = elements.apiKeyUpdate && elements.apiKeyUpdate.value.trim();
            const selectedProvider = elements.baseUrlSelect && elements.baseUrlSelect.value;
            const baseUrlValue = elements.baseUrl && elements.baseUrl.value.trim();
            
            // Determine the base URL based on the selected provider
            const newBaseUrl = componentManagers.baseUrl.determineBaseUrl(
                selectedProvider,
                baseUrlValue
            );
            
            // Check if API key or base URL changed
            const currentApiKey = componentManagers.apiKey.getApiKey();
            const currentBaseUrl = componentManagers.baseUrl.getBaseUrl();
            const apiKeyChanged = newApiKey && newApiKey !== currentApiKey;
            const baseUrlChanged = newBaseUrl !== currentBaseUrl;
            
            // Save the provider selection and base URL
            componentManagers.baseUrl.saveBaseUrl(newBaseUrl, selectedProvider);
            
            // We'll use these values to fetch models with updateStorage=true
            // This ensures the values are saved and used for future API calls
            const apiKeyToUse = newApiKey || componentManagers.apiKey.getApiKey();
            
            // If API key or base URL changed, reset the model fetch cache
            if (apiKeyChanged || baseUrlChanged) {
                console.log("API key or base URL changed, resetting model fetch cache");
                state.lastModelsFetchTime = 0;
            }
            
            // Fetch models with the new values and update storage
            // This ensures the values are saved and used for future API calls
            componentManagers.model.fetchAvailableModels(
                apiKeyToUse, 
                newBaseUrl, 
                true, 
                createContextUsageCallback()
            ).then(() => {
                // Update last fetch time
                state.lastModelsFetchTime = Date.now();
            });
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(componentManagers.model.getCurrentModel());
            }
            
            // Hide modal
            if (hideSettingsModal) {
                hideSettingsModal();
            }
            
            // Get a simplified display name for the model
            const displayName = selectedModel ? ModelInfoService.getDisplayName(selectedModel) : 'default';
            
            // Add confirmation message
            if (addSystemMessage) {
                addSystemMessage(`Settings saved. Using model: ${displayName}`);
            }
            
            return true;
        }
        
        // Public API methods - delegate to component managers
        /**
         * Get the current API key
         * @returns {string} Current API key
         */
        function getApiKey() {
            return componentManagers.apiKey.getApiKey();
        }
        
        /**
         * Get the current model
         * @returns {string} Current model ID
         */
        function getCurrentModel() {
            return componentManagers.model.getCurrentModel();
        }
        
        /**
         * Save the current model
         * @param {string} model - The model ID to save
         */
        function saveModel(model) {
            if (model && componentManagers.model && typeof componentManagers.model.saveModel === 'function') {
                console.log(`SettingsManager: Saving model ${model}`);
                componentManagers.model.saveModel(model);
                
                // Update context usage with the new model if possible
                if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.uiManager) {
                    window.aiHackare.chatManager.estimateContextUsage(
                        window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                        model
                    );
                }
            } else {
                console.warn('SettingsManager: Unable to save model - invalid model or modelManager');
            }
        }
        
        /**
         * Get the current system prompt
         * @returns {string} Current system prompt
         */
        function getSystemPrompt() {
            return componentManagers.systemPrompt.getSystemPrompt();
        }
        
        /**
         * Get the current base URL
         * @returns {string} Current base URL
         */
        function getBaseUrl() {
            return componentManagers.baseUrl.getBaseUrl();
        }
        
        /**
         * Fetch available models from the API
         * @param {string} apiKey - The API key to use
         * @param {string} baseUrl - The base URL to use
         * @param {boolean} updateStorage - Whether to update storage with the provided values
         * @returns {Promise<Object>} Promise resolving to result object
         */
        function fetchAvailableModels(apiKey, baseUrl, updateStorage = false) {
            return componentManagers.model.fetchAvailableModels(apiKey, baseUrl, updateStorage);
        }
        
        /**
         * Handle the case when models can't be fetched
         */
        function populateDefaultModels() {
            componentManagers.model.populateDefaultModels();
        }
        
        /**
         * Delete all saved settings for the current GPT namespace
         * @param {Function} hideSettingsModal - Function to hide settings modal
         * @param {Function} addSystemMessage - Function to add system message
         */
        function clearAllSettings(hideSettingsModal, addSystemMessage) {
            // Save the current namespace before clearing settings
            const currentNamespace = StorageService.getNamespace();
            
            // Define all storage keys to remove
            const keysToRemove = [
                StorageService.STORAGE_KEYS.API_KEY,
                StorageService.STORAGE_KEYS.MODEL,
                StorageService.STORAGE_KEYS.SYSTEM_PROMPT,
                StorageService.STORAGE_KEYS.SHARE_OPTIONS,
                StorageService.STORAGE_KEYS.BASE_URL,
                StorageService.STORAGE_KEYS.BASE_URL_PROVIDER,
                StorageService.STORAGE_KEYS.DEBUG_MODE,
                StorageService.STORAGE_KEYS.HISTORY
            ];
            
            // Remove all settings from localStorage for the current namespace
            keysToRemove.forEach(key => {
                localStorage.removeItem(StorageService.getNamespacedKey(key));
            });
            
            // Remove tool calling settings
            localStorage.removeItem(`hackare_${currentNamespace}_tool_calling_enabled`);
            
            // Remove namespace-related entries
            localStorage.removeItem(`hackare_${currentNamespace}_namespace`);
            localStorage.removeItem(`hackare_${currentNamespace}_master_key`);
            
            // Reset the session key if ShareManager is available
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSessionKey(null);
            }
            
            // Update UI elements
            const uiElements = [
                { element: elements.baseUrl, value: '' },
                { element: elements.apiKeyUpdate, value: '' },
                { element: elements.systemPromptInput, value: '' }
            ];
            
            uiElements.forEach(({ element, value }) => {
                if (element) {
                    element.value = value;
                }
            });
            
            // Hide modal if provided
            if (hideSettingsModal) {
                hideSettingsModal();
            }
            
            // Add confirmation message
            if (addSystemMessage) {
                addSystemMessage('All settings for the current GPT namespace have been deleted.');
            }
            
            return true;
        }
        
        /**
         * Set a pending shared model to be applied after models are fetched
         * @param {string} model - The model ID to set as pending
         */
        function setPendingSharedModel(model) {
            if (model && componentManagers.model && typeof componentManagers.model.setPendingSharedModel === 'function') {
                componentManagers.model.setPendingSharedModel(model);
            }
        }
        
        // Public API
        return {
            init,
            addToolCallingSetting,
            saveApiKey,
            saveSettings,
            getApiKey,
            getCurrentModel,
            saveModel,
            getSystemPrompt,
            getBaseUrl,
            fetchAvailableModels,
            populateDefaultModels,
            clearAllSettings,
            setPendingSharedModel,
            showSettingsModal
        };
    }

    // Public API
    return {
        createSettingsManager
    };
})();
