/**
 * Settings Manager Module
 * Handles settings-related functionality for the AIHackare application
 * Uses modular components for different aspects of settings management
 */

window.SettingsManager = (function() {
    /**
     * Create a Settings Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Settings Manager instance
     */
    function createSettingsManager(elements) {
        // Create component managers
        const apiKeyManager = ApiKeyManager.createApiKeyManager();
        const modelManager = ModelManager.createModelManager(elements);
        const systemPromptManager = SystemPromptManager.createSystemPromptManager(elements);
        const baseUrlManager = BaseUrlManager.createBaseUrlManager(elements);
        const titleSubtitleManager = TitleSubtitleManager.createTitleSubtitleManager();
        const welcomeManager = WelcomeManager.createWelcomeManager(elements);
        const sharedLinkManager = SharedLinkManager.createSharedLinkManager(elements);
        
        // Session key getter function
        let getSessionKey = null;
        
        // Function to set messages in the chat
        let setMessages = null;
        
        /**
         * Initialize the settings manager
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} showApiKeyModal - Function to show API key modal
         * @param {Function} addSystemMessage - Function to add system message
         * @param {Function} sessionKeyGetter - Function to get the session key
         * @param {Function} messagesUpdater - Function to update chat messages
         */
        function init(updateModelInfoDisplay, showApiKeyModal, addSystemMessage, sessionKeyGetter, messagesUpdater) {
            // Store the session key getter function and messages updater
            getSessionKey = sessionKeyGetter;
            setMessages = messagesUpdater;
            
            // Initialize component managers
            modelManager.init();
            systemPromptManager.init();
            baseUrlManager.init();
            
            // Check if there's a shared API key in the URL
            if (sharedLinkManager.hasSharedLink()) {
                // Show password prompt for decryption
                sharedLinkManager.promptForDecryptionPassword(
                    getSessionKey, 
                    setMessages, 
                    updateModelInfoDisplay, 
                    addSystemMessage
                ).then(result => {
                    if (result.success) {
                        // If a shared model was provided, fetch models to check if it's available
                        if (result.pendingSharedModel) {
                            // Get the API key and base URL
                            const apiKey = apiKeyManager.getApiKey();
                            const baseUrl = baseUrlManager.getBaseUrl();
                            
                            // Fetch models with the new values
                            modelManager.fetchAvailableModels(apiKey, baseUrl, true).then(modelResult => {
                                if (modelResult.success && modelResult.model) {
                                    // If a shared model was applied successfully
                                    const displayName = ModelInfoService.getDisplayName(modelResult.model);
                                    if (addSystemMessage) {
                                        addSystemMessage(`Shared model "${displayName}" has been applied.`);
                                    }
                                    
                                    // Update model info display
                                    if (updateModelInfoDisplay) {
                                        updateModelInfoDisplay(modelManager.getCurrentModel());
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
                            const apiKey = apiKeyManager.getApiKey();
                            const baseUrl = baseUrlManager.getBaseUrl();
                            
                            // Fetch models with the new values
                            modelManager.fetchAvailableModels(apiKey, baseUrl, true);
                        }
                    } else {
                        // Decryption failed or was cancelled
                        // Check if API key exists
                        const apiKey = apiKeyManager.getApiKey();
                        
                        if (!apiKey) {
                            showApiKeyModal();
                        } else {
                            // Fetch available models if API key exists
                            const baseUrl = baseUrlManager.getBaseUrl();
                            modelManager.fetchAvailableModels(apiKey, baseUrl, true);
                        }
                    }
                });
            } else {
                // Check if API key exists
                const apiKey = apiKeyManager.getApiKey();
                
                if (!apiKey) {
                    // Create a welcome modal to show the first time
                    const wasWelcomeShown = welcomeManager.showWelcomeModalIfFirstTime(() => {
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
                    const baseUrl = baseUrlManager.getBaseUrl();
                    
                    // Fetch available models if API key exists
                    // Use updateStorage=true to ensure the values are properly loaded
                    modelManager.fetchAvailableModels(apiKey, baseUrl, true);
                }
            }
            
            // Set up event listener for model reload button
            if (elements.modelReloadBtn) {
                elements.modelReloadBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Clear the model select and show loading state
                    elements.modelSelect.innerHTML = '<option disabled selected>Loading models...</option>';
                    
                    // Disable the button and show loading state
                    const originalIcon = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    this.disabled = true;
                    
                    // Get the current values from the UI instead of using stored values
                    const currentApiKey = elements.apiKeyUpdate.value.trim() || apiKeyManager.getApiKey();
                    const currentBaseUrl = elements.baseUrl.value.trim() || baseUrlManager.getBaseUrl();
                    
                    // Fetch models from API using the current UI values
                    modelManager.fetchAvailableModels(currentApiKey, currentBaseUrl).then(() => {
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
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(modelManager.getCurrentModel());
            }
        }
        
        /**
         * Save the API key
         * @param {Function} hideApiKeyModal - Function to hide API key modal
         * @param {Function} addSystemMessage - Function to add system message
         */
        function saveApiKey(hideApiKeyModal, addSystemMessage) {
            const newApiKey = elements.apiKeyInput.value.trim();
            
            if (newApiKey) {
                // Save API key using the API key manager
                apiKeyManager.saveApiKey(newApiKey, hideApiKeyModal, addSystemMessage);
                
                // Make sure base URL is loaded before fetching models
                const baseUrl = baseUrlManager.getBaseUrl();
                
                // Fetch available models with the new API key and update storage
                modelManager.fetchAvailableModels(newApiKey, baseUrl, true);
                
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
            const selectedModel = elements.modelSelect.value;
            modelManager.saveModel(selectedModel);
            
            // Get values from UI
            const newApiKey = elements.apiKeyUpdate.value.trim();
            const selectedProvider = elements.baseUrlSelect.value;
            
            // Determine the base URL based on the selected provider
            const newBaseUrl = baseUrlManager.determineBaseUrl(
                selectedProvider,
                elements.baseUrl.value.trim()
            );
            
            // Save the provider selection and base URL
            baseUrlManager.saveBaseUrl(newBaseUrl, selectedProvider);
            
            // We'll use these values to fetch models with updateStorage=true
            // This ensures the values are saved and used for future API calls
            const apiKeyToUse = newApiKey || apiKeyManager.getApiKey();
            
            // System prompt is now managed by the PromptsService and SystemPromptManager
            // No need to save it here as it's saved when prompts are selected
            
            // Fetch models with the new values and update storage
            // This ensures the values are saved and used for future API calls
            modelManager.fetchAvailableModels(apiKeyToUse, newBaseUrl, true);
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(modelManager.getCurrentModel());
            }
            
            // Hide modal
            if (hideSettingsModal) {
                hideSettingsModal();
            }
            
            // Get a simplified display name for the model
            const displayName = ModelInfoService.getDisplayName(selectedModel);
            
            // Add confirmation message
            if (addSystemMessage) {
                addSystemMessage(`Settings saved. Using model: ${displayName}`);
            }
            
            return true;
        }
        
        /**
         * Get the current API key
         * @returns {string} Current API key
         */
        function getApiKey() {
            return apiKeyManager.getApiKey();
        }
        
        /**
         * Get the current model
         * @returns {string} Current model ID
         */
        function getCurrentModel() {
            return modelManager.getCurrentModel();
        }
        
        /**
         * Get the current system prompt
         * @returns {string} Current system prompt
         */
        function getSystemPrompt() {
            return systemPromptManager.getSystemPrompt();
        }
        
        /**
         * Get the current base URL
         * @returns {string} Current base URL
         */
        function getBaseUrl() {
            return baseUrlManager.getBaseUrl();
        }
        
        /**
         * Fetch available models from the API
         * @param {string} apiKey - The API key to use
         * @param {string} baseUrl - The base URL to use
         * @param {boolean} updateStorage - Whether to update storage with the provided values
         * @returns {Promise<Object>} Promise resolving to result object
         */
        function fetchAvailableModels(apiKey, baseUrl, updateStorage = false) {
            return modelManager.fetchAvailableModels(apiKey, baseUrl, updateStorage);
        }
        
        /**
         * Handle the case when models can't be fetched
         */
        function populateDefaultModels() {
            modelManager.populateDefaultModels();
        }
        
        /**
         * Clear all settings from localStorage or reset to default values
         * @param {Function} hideSettingsModal - Function to hide settings modal
         * @param {Function} addSystemMessage - Function to add system message
         */
        function clearAllSettings(hideSettingsModal, addSystemMessage) {
            // Save the current namespace before clearing title/subtitle
            const currentNamespace = StorageService.getNamespace();
            
            // Remove all settings from localStorage
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.API_KEY));
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.MODEL));
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.SYSTEM_PROMPT));
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.SHARE_OPTIONS));
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.BASE_URL));
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.BASE_URL_PROVIDER));
            
            // Clear chat history from current namespace
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.HISTORY));
            
            // Now clear the title and subtitle (which will change the namespace)
            localStorage.removeItem(StorageService.STORAGE_KEYS.TITLE);
            localStorage.removeItem(StorageService.STORAGE_KEYS.SUBTITLE);
            
            // Reset the session key if ShareManager is available
            if (window.aiHackare && window.aiHackare.shareManager) {
                window.aiHackare.shareManager.setSessionKey(null);
            }
            
            // Update the title and subtitle in the UI
            titleSubtitleManager.updateTitleAndSubtitle(true);
            
            // Update UI elements
            if (elements.baseUrl) {
                elements.baseUrl.value = '';
            }
            if (elements.apiKeyUpdate) {
                elements.apiKeyUpdate.value = '';
            }
            if (elements.systemPromptInput) {
                elements.systemPromptInput.value = '';
            }
            
            // Hide modal if provided
            if (hideSettingsModal) {
                hideSettingsModal();
            }
            
            // Add confirmation message
            if (addSystemMessage) {
                addSystemMessage('All settings have been cleared.');
            }
            
            return true;
        }
        
        // Public API
        return {
            init,
            saveApiKey,
            saveSettings,
            getApiKey,
            getCurrentModel,
            getSystemPrompt,
            getBaseUrl,
            fetchAvailableModels,
            populateDefaultModels,
            clearAllSettings
        };
    }

    // Public API
    return {
        createSettingsManager
    };
})();
