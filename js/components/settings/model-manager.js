/**
 * Model Manager Module
 * Handles model-related functionality for the AIHackare application
 */

window.ModelManager = (function() {
    /**
     * Create a Model Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Model Manager instance
     */
    function createModelManager(elements) {
        // Current model state
        let currentModel = '';
        let pendingSharedModel = null;
        
        /**
         * Initialize the model manager
         */
        function init() {
            // Load saved model preference
            const savedModel = StorageService.getModel();
            if (savedModel) {
                currentModel = savedModel;
                if (elements.modelSelect) {
                    elements.modelSelect.value = savedModel;
                }
            }
            
            // Add event listener for model select change
            if (elements.modelSelect) {
                elements.modelSelect.addEventListener('change', function() {
                    const selectedModel = this.value;
                    
                    // Update the currentModel in memory immediately when user changes selection
                    // This ensures the selection is respected even if models are refetched
                    currentModel = selectedModel;
                    console.log(`User selected model: ${selectedModel}`);
                    
                    // Update context usage with the new model if possible
                    if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.uiManager) {
                        // Get the context size for the selected model
                        const contextSize = ModelInfoService.getContextSize(selectedModel);
                        console.log(`Model changed to ${selectedModel}, context size: ${contextSize}`);
                        
                        // Update the context usage display with the new model
                        window.aiHackare.chatManager.estimateContextUsage(
                            window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                            selectedModel
                        );
                    }
                });
            }
        }
        
        /**
         * Get the current model
         * @returns {string} Current model ID
         */
        function getCurrentModel() {
            // Always get the current model from storage to ensure we have the latest value
            // This is especially important when the namespace changes due to title/subtitle changes
            const storedModel = StorageService.getModel();
            
            // If we have a current model in memory and it doesn't match storage,
            // we need to decide which one to trust. 
            if (currentModel && currentModel !== storedModel) {
                console.log(`Model mismatch detected: memory=${currentModel}, storage=${storedModel}.`);
                
                // If storage was recently updated (like from agent loading), trust storage
                // Check if the stored model looks like it was recently set by comparing timestamps
                const storageTimestamp = window.CoreStorageService.getValue(window.NamespaceService.BASE_STORAGE_KEYS.MODEL_LAST_UPDATED);
                const now = Date.now();
                const recentlyUpdated = storageTimestamp && (now - parseInt(storageTimestamp)) < 300000; // 5 minutes (much longer window)
                
                if (recentlyUpdated) {
                    console.log('Storage was recently updated, using stored model:', storedModel);
                    currentModel = storedModel;
                    return storedModel;
                } else {
                    // Additional safety check: if storage model looks like a valid new model, prefer it
                    if (storedModel && storedModel.length > 0) {
                        console.log('Storage has valid model, preferring storage over memory:', storedModel);
                        currentModel = storedModel;
                        return storedModel;
                    } else {
                        // Check if we can encrypt before trying to save
                        const namespace = window.NamespaceService?.getNamespace();
                        if (namespace && namespace.masterKey) {
                            console.log('Using memory model and updating storage:', currentModel);
                            StorageService.saveModel(currentModel);
                        } else {
                            console.log('Using memory model (storage unavailable due to missing encryption key):', currentModel);
                        }
                        return currentModel;
                    }
                }
            }
            
            // If we have a stored model but no current model in memory, update our memory
            if (storedModel && !currentModel) {
                console.log(`Updating memory model from storage: ${storedModel}`);
                currentModel = storedModel;
            }
            
            return storedModel || currentModel;
        }
        
        /**
         * Save the current model
         * @param {string} model - The model ID to save
         */
        function saveModel(model) {
            if (!model) {
                console.warn('Attempted to save empty model ID');
                return;
            }
            
            console.log(`Saving model: ${model}`);
            StorageService.saveModel(model);
            currentModel = model;
            
            // Update the model select element if it exists
            if (elements.modelSelect && elements.modelSelect.value !== model) {
                console.log(`Updating model select UI to: ${model}`);
                
                // Check if the option exists
                let optionExists = false;
                for (let i = 0; i < elements.modelSelect.options.length; i++) {
                    if (elements.modelSelect.options[i].value === model) {
                        elements.modelSelect.value = model;
                        optionExists = true;
                        break;
                    }
                }
                
                // If the option doesn't exist, we might need to fetch models
                if (!optionExists && model) {
                    console.log(`Model ${model} not found in select options. Will be applied after models are fetched.`);
                    // Set as pending to be applied after models are fetched
                    pendingSharedModel = model;
                }
            }
        }
        
        /**
         * Set a pending shared model to be applied after models are fetched
         * @param {string} model - The model ID to set as pending
         */
        function setPendingSharedModel(model) {
            pendingSharedModel = model;
        }
        
        /**
         * Reset model manager memory state - used during agent loading
         */
        function resetMemoryState() {
            currentModel = '';
            console.log('🔄 ModelManager memory state reset - will read from storage on next call');
            
            // Force a timestamp update to ensure storage takes precedence
            const timestamp = Date.now();
            window.CoreStorageService.setValue(window.NamespaceService.BASE_STORAGE_KEYS.MODEL_LAST_UPDATED, timestamp.toString());
        }
        
        /**
         * Fetch available models from the API
         * @param {string} apiKey - The API key to use
         * @param {string} baseUrl - The base URL to use
         * @param {boolean} updateStorage - Whether to update storage with the provided values
         * @param {Function} [updateContextUsage] - Optional callback to update context usage display
         * @param {boolean} forceRefresh - If true, bypass cache and fetch from API
         * @returns {Promise<Object>} Promise resolving to result object
         */
        async function fetchAvailableModels(apiKey, baseUrl, updateStorage = false, updateContextUsage = null, forceRefresh = false) {
            if (!apiKey) return { success: false, error: 'API key is required' };
            
            try {
                // Use the provided values for this API call only
                const models = await ApiService.fetchAvailableModels(apiKey, baseUrl, forceRefresh);
                
                // Only update storage and internal variables if explicitly requested
                // This ensures values from UI are not saved unless the user clicks "Save"
                if (updateStorage) {
                    StorageService.saveApiKey(apiKey);
                    StorageService.saveBaseUrl(baseUrl);
                }
                
                // Clear existing options
                elements.modelSelect.innerHTML = '';
                
                // Create optgroups for different model types
                const standardGroup = document.createElement('optgroup');
                standardGroup.label = 'Production Models';
                
                const previewGroup = document.createElement('optgroup');
                previewGroup.label = 'Preview Models';
                
                const systemGroup = document.createElement('optgroup');
                systemGroup.label = 'Preview Systems';
                
                // Get list of fetched model IDs
                const fetchedModelIds = models.map(model => model.id);
                
                // Add production models if they exist in fetched models
                ModelInfoService.productionModels.forEach(modelId => {
                    if (fetchedModelIds.includes(modelId)) {
                        const option = document.createElement('option');
                        option.value = modelId;
                        
                        // Get simplified display name with country flag
                        const displayName = ModelInfoService.getDisplayName(modelId);
                        option.textContent = window.ModelCountryMapping ? 
                            window.ModelCountryMapping.formatModelWithFlag(modelId, displayName) : 
                            displayName;
                        
                        // Set selected if it matches current model
                        if (modelId === currentModel) {
                            option.selected = true;
                        }
                        
                        standardGroup.appendChild(option);
                    }
                });
                
                // Add preview models if they exist in fetched models
                ModelInfoService.previewModels.forEach(modelId => {
                    if (fetchedModelIds.includes(modelId)) {
                        const option = document.createElement('option');
                        option.value = modelId;
                        
                        // Get simplified display name with country flag
                        const displayName = ModelInfoService.getDisplayName(modelId);
                        option.textContent = window.ModelCountryMapping ? 
                            window.ModelCountryMapping.formatModelWithFlag(modelId, displayName) : 
                            displayName;
                        
                        // Set selected if it matches current model
                        if (modelId === currentModel) {
                            option.selected = true;
                        }
                        
                        previewGroup.appendChild(option);
                    }
                });
                
                // Add system models if they exist in fetched models
                ModelInfoService.systemModels.forEach(modelId => {
                    if (fetchedModelIds.includes(modelId)) {
                        const option = document.createElement('option');
                        option.value = modelId;
                        
                        // Get simplified display name with country flag
                        const displayName = ModelInfoService.getDisplayName(modelId);
                        option.textContent = window.ModelCountryMapping ? 
                            window.ModelCountryMapping.formatModelWithFlag(modelId, displayName) : 
                            displayName;
                        
                        // Set selected if it matches current model
                        if (modelId === currentModel) {
                            option.selected = true;
                        }
                        
                        systemGroup.appendChild(option);
                    }
                });
                
                // Add other available models that aren't in our predefined lists
                const knownModelIds = [
                    ...ModelInfoService.productionModels, 
                    ...ModelInfoService.previewModels, 
                    ...ModelInfoService.systemModels
                ];
                
                models.forEach(model => {
                    if (!knownModelIds.includes(model.id)) {
                        const option = document.createElement('option');
                        option.value = model.id;
                        
                        // Try to get a simplified name with country flag, or use the model ID
                        const displayName = ModelInfoService.getDisplayName(model.id);
                        option.textContent = window.ModelCountryMapping ? 
                            window.ModelCountryMapping.formatModelWithFlag(model.id, displayName) : 
                            displayName;
                        
                        // Set selected if it matches current model
                        if (model.id === currentModel) {
                            option.selected = true;
                        }
                        
                        // Add to appropriate group based on naming patterns
                        if (model.id.includes('preview') || model.id.includes('beta')) {
                            previewGroup.appendChild(option);
                        } else {
                            standardGroup.appendChild(option);
                        }
                    }
                });
                
                // Add groups to select element if they have options
                if (standardGroup.children.length > 0) {
                    elements.modelSelect.appendChild(standardGroup);
                }
                
                if (previewGroup.children.length > 0) {
                    elements.modelSelect.appendChild(previewGroup);
                }
                
                if (systemGroup.children.length > 0) {
                    elements.modelSelect.appendChild(systemGroup);
                }
                
                // Check if we have a pending shared model to apply
                if (pendingSharedModel) {
                    const sharedModel = pendingSharedModel;
                    pendingSharedModel = null; // Clear it to avoid reapplying
                    
                    // Check if the model is available
                    if (fetchedModelIds.includes(sharedModel)) {
                        // Apply the model
                        currentModel = sharedModel;
                        StorageService.saveModel(sharedModel);
                        elements.modelSelect.value = sharedModel;
                        
                        console.log(`Applied shared model: ${sharedModel}`);
                        
                        return {
                            success: true,
                            model: sharedModel
                        };
                    } else {
                        console.warn(`Shared model not available: ${sharedModel}. Using default model instead.`);
                        // Don't return here, continue to check SharedLinkManager and potentially select a default model
                    }
                }
                
                // Also check if there's a shared model in the SharedLinkManager
                if (window.SharedLinkManager && typeof window.SharedLinkManager.getPendingSharedModel === 'function') {
                    const sharedLinkModel = window.SharedLinkManager.getPendingSharedModel();
                    if (sharedLinkModel) {
                        console.log(`Found pending shared model in SharedLinkManager: ${sharedLinkModel}`);
                        
                        // Clear it to avoid reapplying
                        if (typeof window.SharedLinkManager.clearPendingSharedModel === 'function') {
                            window.SharedLinkManager.clearPendingSharedModel();
                        }
                        
                        // Check if the model is available
                        if (fetchedModelIds.includes(sharedLinkModel)) {
                            // Apply the model
                            currentModel = sharedLinkModel;
                            StorageService.saveModel(sharedLinkModel);
                            elements.modelSelect.value = sharedLinkModel;
                            
                            console.log(`Applied shared model from SharedLinkManager: ${sharedLinkModel}`);
                            
                            return {
                                success: true,
                                model: sharedLinkModel
                            };
                        } else {
                            console.warn(`Shared model from SharedLinkManager not available: ${sharedLinkModel}. Using default model instead.`);
                            // Don't return here, continue to potentially select a default model
                        }
                    }
                }
                
                // Check what's currently selected in the dropdown
                const dropdownValue = elements.modelSelect ? elements.modelSelect.value : null;
                
                // Check if the dropdown has a valid selection that's different from memory
                const hasValidDropdownSelection = dropdownValue && 
                                                  dropdownValue !== '' && 
                                                  fetchedModelIds.includes(dropdownValue);
                
                // Only auto-select a model if no valid model is currently selected
                // or if the current model is not available in the fetched models
                let shouldSelectNewModel = false;
                
                // If dropdown has a valid selection, always respect it
                if (hasValidDropdownSelection) {
                    console.log(`Using dropdown selection: ${dropdownValue}`);
                    currentModel = dropdownValue;
                    // Don't save yet - let the save button handler do that
                    elements.modelSelect.value = dropdownValue;
                } else if (!currentModel || currentModel === '') {
                    // No model selected, need to select one
                    shouldSelectNewModel = true;
                    console.log('No model currently selected, will auto-select default');
                } else if (!fetchedModelIds.includes(currentModel)) {
                    // Current model is not available in fetched models, need to select a new one
                    shouldSelectNewModel = true;
                    console.log(`Current model ${currentModel} not available, will auto-select default`);
                } else {
                    // Current model is valid and available, keep it
                    console.log(`Keeping existing valid model: ${currentModel}`);
                    elements.modelSelect.value = currentModel;
                }
                
                if (shouldSelectNewModel) {
                    // Determine the provider from the base URL
                    let provider = 'openai'; // Default provider
                    if (baseUrl) {
                        if (baseUrl.includes('openai.com')) {
                            provider = 'openai';
                        } else if (baseUrl.includes('localhost:11434')) {
                            provider = 'ollama';
                        }
                    }
                    
                    let modelToSelect = null;
                    
                    // For Ollama, select the first model in the list
                    if (provider === 'ollama') {
                        if (fetchedModelIds.length > 0) {
                            modelToSelect = fetchedModelIds[0];
                        }
                    } else {
                        // For other providers, try to use the default model
                        const defaultModel = ModelInfoService.defaultModels[provider];
                        
                        // Check if the default model is available
                        if (defaultModel && fetchedModelIds.includes(defaultModel)) {
                            modelToSelect = defaultModel;
                        } else if (fetchedModelIds.length > 0) {
                            // If default model is not available, pick the first available model
                            modelToSelect = fetchedModelIds[0];
                        }
                    }
                    
                    // Apply the selected model if one was found
                    if (modelToSelect) {
                        currentModel = modelToSelect;
                        StorageService.saveModel(modelToSelect);
                        elements.modelSelect.value = modelToSelect;
                        console.log(`Selected model for ${provider}: ${modelToSelect}`);
                    }
                }
                
                // If updateContextUsage callback is provided, call it to refresh the context usage display
                // with the newly fetched model information
                if (updateContextUsage && typeof updateContextUsage === 'function') {
                    console.log('Updating context usage after fetching models');
                    updateContextUsage();
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('Error fetching models:', error);
                // Fallback to default models if fetch fails
                populateDefaultModels();
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle the case when models can't be fetched
         */
        function populateDefaultModels() {
            // Clear existing options
            elements.modelSelect.innerHTML = '';
            
            // Get the current provider to determine default models
            const currentProvider = elements.baseUrlSelect ? elements.baseUrlSelect.value : 'openai';
            
            // Get fallback models from configuration
            let models = [];
            if (window.DefaultModelsConfig && window.DefaultModelsConfig.getFallbackModels) {
                models = window.DefaultModelsConfig.getFallbackModels(currentProvider);
            }
            
            // If no models from config, use hardcoded defaults as last resort
            if (models.length === 0) {
                const fallbackModels = {
                    openai: ['gpt-5-nano', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                    anthropic: ['claude-opus-4-1', 'claude-opus-4-1-20250805', 'claude-opus-4-0', 'claude-opus-4-20250514', 'claude-sonnet-4-0', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-latest', 'claude-3-5-haiku-20241022'],
                    google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
                    mistral: ['ministral-3b-2410', 'ministral-8b-2410', 'mistral-large-2411'],
                    cohere: ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r'],
                    groq: ['moonshotai/kimi-k2-instruct', 'llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
                    berget: ['mistralai/Magistral-Small-2506', 'llama-3.3-70b', 'gpt-5-nano', 'claude-3-opus-20240229'],
                    custom: []
                };
                models = fallbackModels[currentProvider] || [];
            }
            
            if (models.length > 0) {
                // Add a note that these are fallback models
                const noteOption = document.createElement('option');
                noteOption.value = '';
                noteOption.textContent = '-- Default models (API unavailable) --';
                noteOption.disabled = true;
                elements.modelSelect.appendChild(noteOption);
                
                // Add the fallback models
                models.forEach((modelId, index) => {
                    const option = document.createElement('option');
                    option.value = modelId;
                    const displayName = ModelInfoService.getDisplayName(modelId);
                    option.textContent = window.ModelCountryMapping ? 
                        window.ModelCountryMapping.formatModelWithFlag(modelId, displayName) : 
                        displayName;
                    
                    // Select the first model by default
                    if (index === 0) {
                        option.selected = true;
                    }
                    
                    elements.modelSelect.appendChild(option);
                });
            } else {
                // Only show error if no fallback models available
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Failed to fetch models - check API key and connection';
                option.disabled = true;
                option.selected = true;
                elements.modelSelect.appendChild(option);
            }
        }
        
        /**
         * Select a model by ID (used for auto-selection)
         * @param {string} modelId - The model ID to select
         */
        function selectModel(modelId) {
            if (!modelId) return;
            
            console.log('Auto-selecting model:', modelId);
            
            // Update the dropdown if it exists and has the option
            if (elements.modelSelect) {
                var optionExists = false;
                for (var i = 0; i < elements.modelSelect.options.length; i++) {
                    if (elements.modelSelect.options[i].value === modelId) {
                        elements.modelSelect.value = modelId;
                        optionExists = true;
                        break;
                    }
                }
                
                // If option doesn't exist, add it as a temporary option
                if (!optionExists) {
                    var option = document.createElement('option');
                    option.value = modelId;
                    option.textContent = window.ModelCountryMapping ? 
                        window.ModelCountryMapping.formatModelWithFlag(modelId, modelId) : 
                        modelId;
                    elements.modelSelect.appendChild(option);
                    elements.modelSelect.value = modelId;
                }
            }
            
            // Save the model
            saveModel(modelId);
            
            // Update the UI display
            if (window.aiHackare && window.aiHackare.uiManager && window.aiHackare.uiManager.updateModelInfoDisplay) {
                window.aiHackare.uiManager.updateModelInfoDisplay(modelId);
            }
        }
        
        // Public API
        return {
            init,
            getCurrentModel,
            saveModel,
            selectModel,
            setPendingSharedModel,
            resetMemoryState,
            fetchAvailableModels,
            populateDefaultModels
        };
    }

    // Public API
    return {
        createModelManager
    };
})();
