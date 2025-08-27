/**
 * Settings Coordinator Module
 * 
 * Core coordination logic for orchestrating various specialized managers 
 * for different aspects of settings functionality.
 */

window.SettingsCoordinator = (function() {
    'use strict';
    
    /**
     * Create a callback to update context usage
     * @param {Object} state - Current state object
     * @param {Object} componentManagers - Component managers object
     * @returns {Function} Callback function for context usage updates
     */
    function createContextUsageCallback(state, componentManagers) {
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
     * Set up the model reload button event listener
     * @param {Object} elements - DOM elements
     * @param {Object} componentManagers - Component managers object
     * @param {Function} updateModelInfoDisplay - Function to update model info display
     */
    function setupModelReloadButton(elements, componentManagers, updateModelInfoDisplay) {
        if (!elements.modelReloadBtn) return;
        
        elements.modelReloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Invalidate model selection cache
            if (window.ModelSelectionManager && window.ModelSelectionManager.invalidateCache) {
                window.ModelSelectionManager.invalidateCache();
            }
            
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
                createContextUsageCallback({updateModelInfoDisplay}, componentManagers)
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
     * @param {Object} componentManagers - Component managers object
     * @param {HTMLElement} settingsForm - The settings form element
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     */
    function addToolCallingSetting(componentManagers, settingsForm, addSystemMessage) {
        if (componentManagers.toolCalling && typeof componentManagers.toolCalling.addToolCallingSetting === 'function') {
            componentManagers.toolCalling.addToolCallingSetting(settingsForm, addSystemMessage);
        }
    }
    
    /**
     * Save the API key
     * @param {Object} elements - DOM elements
     * @param {Object} componentManagers - Component managers object
     * @param {Object} state - Current state object
     * @param {Function} hideApiKeyModal - Function to hide API key modal
     * @param {Function} addSystemMessage - Function to add system message
     */
    function saveApiKey(elements, componentManagers, state, hideApiKeyModal, addSystemMessage) {
        const newApiKey = elements.apiKeyInput && elements.apiKeyInput.value.trim();
        
        if (newApiKey) {
            // Create update provider callback that handles model selection too
            var updateProvider = componentManagers.baseUrl && componentManagers.baseUrl.updateProviderFromDetection
                ? function(detection) { 
                    var defaultModel = componentManagers.baseUrl.updateProviderFromDetection(detection);
                    // Auto-select default model if available, but only if no model is currently stored
                    if (defaultModel && componentManagers.model && componentManagers.model.selectModel) {
                        // Check if there's already a stored model to avoid overriding user's choice
                        const currentStoredModel = DataService && DataService.getModel ? DataService.getModel() : null;
                        if (!currentStoredModel || currentStoredModel === '') {
                            console.log('🔄 Auto-selecting model (no stored model):', defaultModel);
                            componentManagers.model.selectModel(defaultModel);
                        } else {
                            console.log('🔄 Skipping auto-selection, model already stored:', currentStoredModel);
                        }
                    }
                    return defaultModel;
                }
                : null;
            
            // Save API key using the API key manager
            componentManagers.apiKey.saveApiKey(newApiKey, hideApiKeyModal, addSystemMessage, updateProvider);
            
            // Make sure base URL is loaded AFTER provider update
            // Need to get fresh base URL in case it was just updated by auto-detection
            const baseUrl = componentManagers.baseUrl.getBaseUrl();
            
            // Fetch available models with the new API key and update storage
            componentManagers.model.fetchAvailableModels(
                newApiKey, 
                baseUrl, 
                true, 
                createContextUsageCallback(state, componentManagers)
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
     * @param {Object} elements - DOM elements
     * @param {Object} componentManagers - Component managers object
     * @param {Object} state - Current state object
     * @param {Function} hideSettingsModal - Function to hide settings modal
     * @param {Function} updateModelInfoDisplay - Function to update model info display
     * @param {Function} addSystemMessage - Function to add system message
     */
    function saveSettings(elements, componentManagers, state, hideSettingsModal, updateModelInfoDisplay, addSystemMessage) {
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
        
        // Save the API key if provided
        if (newApiKey && apiKeyChanged) {
            // Create update provider callback that handles model selection too
            var updateProvider = componentManagers.baseUrl && componentManagers.baseUrl.updateProviderFromDetection
                ? function(detection) { 
                    var defaultModel = componentManagers.baseUrl.updateProviderFromDetection(detection);
                    // Auto-select default model if available, but only if no model is currently stored
                    if (defaultModel && componentManagers.model && componentManagers.model.selectModel) {
                        // Check if there's already a stored model to avoid overriding user's choice
                        const currentStoredModel = DataService && DataService.getModel ? DataService.getModel() : null;
                        if (!currentStoredModel || currentStoredModel === '') {
                            console.log('🔄 Auto-selecting model (no stored model):', defaultModel);
                            componentManagers.model.selectModel(defaultModel);
                        } else {
                            console.log('🔄 Skipping auto-selection, model already stored:', currentStoredModel);
                        }
                    }
                    return defaultModel;
                }
                : null;
            
            // Save API key using the API key manager
            componentManagers.apiKey.saveApiKey(newApiKey, null, addSystemMessage, updateProvider);
        }
        
        // We'll use these values to fetch models with updateStorage=true
        // This ensures the values are saved and used for future API calls
        const apiKeyToUse = newApiKey || componentManagers.apiKey.getApiKey();
        
        // If API key or base URL changed, reset the model fetch cache
        if (apiKeyChanged || baseUrlChanged) {
            console.log("API key or base URL changed, resetting model fetch cache");
            state.lastModelsFetchTime = 0;
            
            // Invalidate model selection cache
            if (window.ModelSelectionManager && window.ModelSelectionManager.invalidateCache) {
                window.ModelSelectionManager.invalidateCache();
            }
        }
        
        // Fetch models with the new values and update storage
        // This ensures the values are saved and used for future API calls
        componentManagers.model.fetchAvailableModels(
            apiKeyToUse, 
            newBaseUrl, 
            true, 
            createContextUsageCallback(state, componentManagers)
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
    
    /**
     * Save the current model with context usage update
     * @param {Object} componentManagers - Component managers object
     * @param {string} model - The model ID to save
     */
    function saveModel(componentManagers, model) {
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
    
    // Public API
    return {
        createContextUsageCallback,
        setupModelReloadButton,
        addToolCallingSetting,
        saveApiKey,
        saveSettings,
        saveModel
    };
})();