/**
 * Settings Manager Module
 * Handles settings-related functionality for the AIHackare application
 */

window.SettingsManager = (function() {
    /**
     * Create a Settings Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Settings Manager instance
     */
    function createSettingsManager(elements) {
        // Settings state
        let apiKey = null;
        let currentModel = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Default model
        let systemPrompt = null;
        let pendingSharedModel = null;
        
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
            // Check if there's a shared API key in the URL
            if (ShareService.hasSharedApiKey()) {
                // Show password prompt for decryption
                promptForDecryptionPassword(updateModelInfoDisplay, addSystemMessage);
            } else {
                // Check if API key exists
                apiKey = StorageService.getApiKey();
                
                if (!apiKey) {
                    showApiKeyModal();
                } else {
                    // Fetch available models if API key exists
                    fetchAvailableModels();
                }
            }
            
            // Load saved model preference
            const savedModel = StorageService.getModel();
            if (savedModel) {
                currentModel = savedModel;
                if (elements.modelSelect) {
                    elements.modelSelect.value = savedModel;
                }
            }
            
            // Load saved system prompt
            systemPrompt = StorageService.getSystemPrompt();
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(currentModel);
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
                // Save API key to local storage
                StorageService.saveApiKey(newApiKey);
                apiKey = newApiKey;
                
                // Hide modal
                if (hideApiKeyModal) {
                    hideApiKeyModal();
                }
                
                // Fetch available models with the new API key
                fetchAvailableModels();
                
                // Add welcome message
                if (addSystemMessage) {
                    addSystemMessage('API key saved. You can now start chatting with GroqCloud AI models.');
                }
                
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
            StorageService.saveModel(selectedModel);
            currentModel = selectedModel;
            
            // Update API key if provided
            const newApiKey = elements.apiKeyUpdate.value.trim();
            if (newApiKey) {
                StorageService.saveApiKey(newApiKey);
                apiKey = newApiKey;
            }
            
            // Save system prompt
            const newSystemPrompt = elements.systemPromptInput.value.trim();
            StorageService.saveSystemPrompt(newSystemPrompt);
            systemPrompt = newSystemPrompt;
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(currentModel);
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
         * Fetch available models from the API
         */
        async function fetchAvailableModels() {
            if (!apiKey) return;
            
            try {
                const models = await ApiService.fetchAvailableModels(apiKey);
                
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
                        
                        // Get simplified display name
                        option.textContent = ModelInfoService.getDisplayName(modelId);
                        
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
                        
                        // Get simplified display name
                        option.textContent = ModelInfoService.getDisplayName(modelId);
                        
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
                        
                        // Get simplified display name
                        option.textContent = ModelInfoService.getDisplayName(modelId);
                        
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
                        
                        // Try to get a simplified name, or use the model ID
                        option.textContent = ModelInfoService.getDisplayName(model.id);
                        
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
                        
                        return {
                            success: true,
                            model: sharedModel
                        };
                    } else {
                        return {
                            success: false,
                            model: sharedModel
                        };
                    }
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
         * Populate the model select with default models
         */
        function populateDefaultModels() {
            // Clear existing options
            elements.modelSelect.innerHTML = '';
            
            // Create optgroups for different model types
            const standardGroup = document.createElement('optgroup');
            standardGroup.label = 'Production Models';
            
            const previewGroup = document.createElement('optgroup');
            previewGroup.label = 'Preview Models';
            
            const systemGroup = document.createElement('optgroup');
            systemGroup.label = 'Preview Systems';
            
            // Add production models
            ModelInfoService.productionModels.forEach(modelId => {
                if (ModelInfoService.modelInfo[modelId]) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = ModelInfoService.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === currentModel) {
                        option.selected = true;
                    }
                    
                    standardGroup.appendChild(option);
                }
            });
            
            // Add preview models
            ModelInfoService.previewModels.forEach(modelId => {
                if (ModelInfoService.modelInfo[modelId]) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = ModelInfoService.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === currentModel) {
                        option.selected = true;
                    }
                    
                    previewGroup.appendChild(option);
                }
            });
            
            // Add system models
            ModelInfoService.systemModels.forEach(modelId => {
                if (ModelInfoService.modelInfo[modelId]) {
                    const option = document.createElement('option');
                    option.value = modelId;
                    
                    // Get simplified display name
                    option.textContent = ModelInfoService.getDisplayName(modelId);
                    
                    // Set selected if it matches current model
                    if (modelId === currentModel) {
                        option.selected = true;
                    }
                    
                    systemGroup.appendChild(option);
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
        }
        
        /**
         * Prompt for password to decrypt shared data from URL
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} addSystemMessage - Function to add system message
         */
        function promptForDecryptionPassword(updateModelInfoDisplay, addSystemMessage) {
            // Try the current session key first if available
            if (getSessionKey && getSessionKey()) {
                try {
                    const sharedData = ShareService.extractSharedApiKey(getSessionKey());
                    
                    if (sharedData && sharedData.apiKey) {
                        // Session key worked, apply the shared data
                        StorageService.saveApiKey(sharedData.apiKey);
                        apiKey = sharedData.apiKey;
                        
                        // Mask the API key to show only first and last 4 bytes
                        const maskedApiKey = maskApiKey(sharedData.apiKey);
                        
                        // Report each setting separately
                        if (addSystemMessage) {
                            addSystemMessage(`Shared API key (${maskedApiKey}) has been applied using the current session key.`);
                        }
                        
                        // If there's a system prompt, save it too
                        if (sharedData.systemPrompt) {
                            StorageService.saveSystemPrompt(sharedData.systemPrompt);
                            systemPrompt = sharedData.systemPrompt;
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared system prompt has been applied.`);
                            }
                        }
                        
                        // If there's a model, check if it's available and apply it
                        if (sharedData.model) {
                            // We'll fetch models first and then check if the model is available
                            pendingSharedModel = sharedData.model;
                            
                            if (addSystemMessage) {
                                const displayName = ModelInfoService.getDisplayName(sharedData.model);
                                addSystemMessage(`Shared model preference "${displayName}" will be applied if available.`);
                            }
                        }
                        
                        // If there are shared messages, update the chat
                        if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
                            setMessages(sharedData.messages);
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
                            }
                        }
                        
                        // Clear the shared data from the URL
                        ShareService.clearSharedApiKeyFromUrl();
                        
                        // Fetch available models with the new API key
                        fetchAvailableModels();
                        
                        // No need to show the password modal
                        return;
                    }
                } catch (error) {
                    console.log('Current session key did not work for this shared link, prompting for password');
                    // Continue to password prompt if session key didn't work
                }
            }
            
            // Create a modal for password input
            const passwordModal = document.createElement('div');
            passwordModal.className = 'modal active';
            passwordModal.id = 'password-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            const heading = document.createElement('h2');
            heading.textContent = 'Enter Password';
            
            const paragraph = document.createElement('p');
            paragraph.textContent = 'This shared link is password-protected. Please enter the password to decrypt the data.';
            
            const form = document.createElement('form');
            form.id = 'password-form';
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.htmlFor = 'decrypt-password';
            label.textContent = 'Password';
            
            const input = document.createElement('input');
            input.type = 'password';
            input.id = 'decrypt-password';
            input.placeholder = 'Enter password';
            input.required = true;
            
            const formActions = document.createElement('div');
            formActions.className = 'form-actions';
            
            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.className = 'btn primary-btn';
            submitButton.textContent = 'Decrypt';
            
            // Assemble the modal
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            
            formActions.appendChild(submitButton);
            
            form.appendChild(formGroup);
            form.appendChild(formActions);
            
            modalContent.appendChild(heading);
            modalContent.appendChild(paragraph);
            modalContent.appendChild(form);
            
            passwordModal.appendChild(modalContent);
            
            // Add to document
            document.body.appendChild(passwordModal);
            
            // Focus the input
            input.focus();
            
            // Handle form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const password = input.value.trim();
                if (!password) return;
                
                // Try to decrypt with the provided password
                const sharedData = ShareService.extractSharedApiKey(password);
                
                if (sharedData && sharedData.apiKey) {
                    // Save the shared API key
                    StorageService.saveApiKey(sharedData.apiKey);
                    apiKey = sharedData.apiKey;
                    
                    // Mask the API key to show only first and last 4 bytes
                    const maskedApiKey = maskApiKey(sharedData.apiKey);
                    
                    // Report each setting separately
                    if (addSystemMessage) {
                        addSystemMessage(`Shared API key (${maskedApiKey}) has been applied.`);
                    }
                    
                    // If there's a system prompt, save it too
                    if (sharedData.systemPrompt) {
                        StorageService.saveSystemPrompt(sharedData.systemPrompt);
                        systemPrompt = sharedData.systemPrompt;
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Shared system prompt has been applied.`);
                        }
                    }
                    
                    // If there's a model, check if it's available and apply it
                    if (sharedData.model) {
                        // We'll fetch models first and then check if the model is available
                        pendingSharedModel = sharedData.model;
                        
                        if (addSystemMessage) {
                            const displayName = ModelInfoService.getDisplayName(sharedData.model);
                            addSystemMessage(`Shared model preference "${displayName}" will be applied if available.`);
                        }
                    }
                    
                    // If there are shared messages, update the chat
                    if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
                        setMessages(sharedData.messages);
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
                        }
                    }
                    
                    // Clear the shared data from the URL
                    ShareService.clearSharedApiKeyFromUrl();
                    
                    // Remove the password modal
                    passwordModal.remove();
                    
                    // Fetch available models with the new API key
                    fetchAvailableModels().then(result => {
                        if (result.success && result.model) {
                            // If a shared model was applied successfully
                            const displayName = ModelInfoService.getDisplayName(result.model);
                            if (addSystemMessage) {
                                addSystemMessage(`Shared model "${displayName}" has been applied.`);
                            }
                            
                            // Update model info display
                            if (updateModelInfoDisplay) {
                                updateModelInfoDisplay(currentModel);
                            }
                        } else if (result.model) {
                            // If a shared model was not available
                            const displayName = ModelInfoService.getDisplayName(result.model);
                            if (addSystemMessage) {
                                addSystemMessage(`Warning: Shared model "${displayName}" is not available with your API key. Using default model instead.`);
                            }
                        }
                    });
                } else {
                    // If decryption failed, show an error message
                    paragraph.textContent = 'Incorrect password. Please try again.';
                    paragraph.style.color = 'red';
                    input.value = '';
                    input.focus();
                }
            });
            
            // Close modal when clicking outside
            passwordModal.addEventListener('click', (e) => {
                if (e.target === passwordModal) {
                    passwordModal.remove();
                    
                    // Check if API key exists
                    apiKey = StorageService.getApiKey();
                    
                    if (!apiKey) {
                        showApiKeyModal();
                    } else {
                        // Fetch available models if API key exists
                        fetchAvailableModels();
                    }
                }
            });
            
            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && document.getElementById('password-modal')) {
                    passwordModal.remove();
                    
                    // Check if API key exists
                    apiKey = StorageService.getApiKey();
                    
                    if (!apiKey) {
                        showApiKeyModal();
                    } else {
                        // Fetch available models if API key exists
                        fetchAvailableModels();
                    }
                }
            });
        }
        
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
         * Get the current API key
         * @returns {string} Current API key
         */
        function getApiKey() {
            return apiKey;
        }
        
        /**
         * Get the current model
         * @returns {string} Current model ID
         */
        function getCurrentModel() {
            return currentModel;
        }
        
        /**
         * Get the current system prompt
         * @returns {string} Current system prompt
         */
        function getSystemPrompt() {
            return systemPrompt;
        }
        
        // Public API
        return {
            init,
            saveApiKey,
            saveSettings,
            fetchAvailableModels,
            populateDefaultModels,
            promptForDecryptionPassword,
            maskApiKey,
            getApiKey,
            getCurrentModel,
            getSystemPrompt
        };
    }

    // Public API
    return {
        createSettingsManager: createSettingsManager
    };
})();
