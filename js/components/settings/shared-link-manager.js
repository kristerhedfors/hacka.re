/**
 * Shared Link Manager Module
 * Handles decryption and application of shared links for the AIHackare application
 */

window.SharedLinkManager = (function() {
    /**
     * Create a Shared Link Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Shared Link Manager instance
     */
    function createSharedLinkManager(elements) {
        // Pending shared model to be applied after models are fetched
        let pendingSharedModel = null;
        
        /**
         * Check if there's a shared link in the URL
         * @returns {boolean} True if there's a shared link
         */
        function hasSharedLink() {
            return ShareService.hasSharedApiKey();
        }
        
        /**
         * Prompt for password to decrypt shared data from URL
         * @param {Function} getSessionKey - Function to get the session key
         * @param {Function} setMessages - Function to set messages in the chat
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} addSystemMessage - Function to add system message
         */
        function promptForDecryptionPassword(getSessionKey, setMessages, updateModelInfoDisplay, addSystemMessage) {
            // Try the current session key first if available
            if (getSessionKey && getSessionKey()) {
                try {
                    const sharedData = ShareService.extractSharedApiKey(getSessionKey());
                    
                    if (sharedData && sharedData.apiKey) {
                        // If there's a title, save it and update the UI FIRST
                        // This is important to do before saving other data to ensure proper namespacing
                        if (sharedData.title) {
                            StorageService.saveTitle(sharedData.title);
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared title "${sharedData.title}" has been applied.`);
                            }
                        }
                        
                        // If there's a subtitle, save it and update the UI FIRST
                        // This is important to do before saving other data to ensure proper namespacing
                        if (sharedData.subtitle) {
                            StorageService.saveSubtitle(sharedData.subtitle);
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared subtitle "${sharedData.subtitle}" has been applied.`);
                            }
                        }
                        
                        // Update title and subtitle in the UI if either was changed
                        if (sharedData.title || sharedData.subtitle) {
                            window.updateTitleAndSubtitle(true); // Force update even if there's a shared link
                        }
                        
                        // Session key worked, apply the shared data
                        StorageService.saveApiKey(sharedData.apiKey);
                        
                        // Use the current session key (no need to set it again since it's already set)
                        // But make sure it's locked for future use
                        if (window.aiHackare && window.aiHackare.shareManager) {
                            // The session key is already set, but we need to make sure it's locked
                            if (elements.lockSessionKeyCheckbox) {
                                elements.lockSessionKeyCheckbox.checked = true;
                            }
                            
                            if (elements.passwordInputContainer) {
                                elements.passwordInputContainer.classList.add('locked');
                            }
                        }
                        
                        // Mask the API key to show only first and last 4 bytes
                        const maskedApiKey = maskApiKey(sharedData.apiKey);
                        
                        // Report each setting separately
                        if (addSystemMessage) {
                            addSystemMessage(`Shared API key (${maskedApiKey}) has been applied using the current session key.`);
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
                        
                        // If there's a model, check if it's available and apply it
                        if (sharedData.model) {
                            // We'll fetch models first and then check if the model is available
                            pendingSharedModel = sharedData.model;
                            
                            // Show a message about the model preference
                            if (addSystemMessage) {
                                addSystemMessage(`Shared model preference "${sharedData.model}" will be applied if available.`);
                            }
                            
                            // Save the model to storage immediately to ensure it's available for API requests
                            // This will be overwritten later if the model is not available
                            StorageService.saveModel(sharedData.model);
                            
                            // If we have a model manager, set the pending shared model there too
                            if (window.aiHackare && window.aiHackare.settingsManager && 
                                typeof window.aiHackare.settingsManager.setPendingSharedModel === 'function') {
                                window.aiHackare.settingsManager.setPendingSharedModel(sharedData.model);
                            }
                        }
                        
                        // If there are shared messages, update the chat
                        if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
                            setMessages(sharedData.messages);
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
                            }
                        }
                        
                        // If there are shared prompts, save them
                        if (sharedData.prompts && Array.isArray(sharedData.prompts)) {
                            // Save each prompt
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
                        
                        // If there are shared functions, save them
                        if (sharedData.functions && typeof sharedData.functions === 'object') {
                            // Save each function
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
                        
                        // Clear the shared data from the URL
                        ShareService.clearSharedApiKeyFromUrl();
                        
                        return {
                            success: true,
                            pendingSharedModel: pendingSharedModel
                        };
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
            label.textContent = 'Password / session key';
            
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
            
            // Return a promise that resolves when the form is submitted
            return new Promise((resolve, reject) => {
                // Handle form submission
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const password = input.value.trim();
                    if (!password) return;
                    
                    // Try to decrypt with the provided password
                    try {
                        const sharedData = ShareService.extractSharedApiKey(password);
                        
                        if (sharedData && sharedData.apiKey) {
                            
                            // If there's a title, save it and update the UI FIRST
                            // This is important to do before saving other data to ensure proper namespacing
                            if (sharedData.title) {
                                StorageService.saveTitle(sharedData.title);
                                
                                if (addSystemMessage) {
                                    addSystemMessage(`Shared title "${sharedData.title}" has been applied.`);
                                }
                            }
                            
                            // If there's a subtitle, save it and update the UI FIRST
                            // This is important to do before saving other data to ensure proper namespacing
                            if (sharedData.subtitle) {
                                StorageService.saveSubtitle(sharedData.subtitle);
                                
                                if (addSystemMessage) {
                                    addSystemMessage(`Shared subtitle "${sharedData.subtitle}" has been applied.`);
                                }
                            }
                            
                            // Update title and subtitle in the UI if either was changed
                            if (sharedData.title || sharedData.subtitle) {
                                window.updateTitleAndSubtitle(true); // Force update even if there's a shared link
                            }
                            
                            // Save the shared API key
                            StorageService.saveApiKey(sharedData.apiKey);
                            
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
                            
                            // Mask the API key to show only first and last 4 bytes
                            const maskedApiKey = maskApiKey(sharedData.apiKey);
                            
                            // Report each setting separately
                            if (addSystemMessage) {
                                addSystemMessage(`Shared API key (${maskedApiKey}) has been applied.`);
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
                            
                            // If there's a model, check if it's available and apply it
                            if (sharedData.model) {
                                // We'll fetch models first and then check if the model is available
                                pendingSharedModel = sharedData.model;
                                
                                // Show a message about the model preference
                                if (addSystemMessage) {
                                    addSystemMessage(`Shared model preference "${sharedData.model}" will be applied if available.`);
                                }
                                
                                // Save the model to storage immediately to ensure it's available for API requests
                                // This will be overwritten later if the model is not available
                                StorageService.saveModel(sharedData.model);
                                
                                // If we have a model manager, set the pending shared model there too
                                if (window.aiHackare && window.aiHackare.settingsManager && 
                                    typeof window.aiHackare.settingsManager.setPendingSharedModel === 'function') {
                                    window.aiHackare.settingsManager.setPendingSharedModel(sharedData.model);
                                }
                            }
                            
                            // If there are shared messages, update the chat
                            if (sharedData.messages && sharedData.messages.length > 0 && setMessages) {
                                setMessages(sharedData.messages);
                                
                                if (addSystemMessage) {
                                    addSystemMessage(`Shared conversation history with ${sharedData.messages.length} messages has been loaded.`);
                                }
                            }
                            
                            // If there are shared prompts, save them
                            if (sharedData.prompts && Array.isArray(sharedData.prompts)) {
                                // Save each prompt
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
                            
                            // If there are shared functions, save them
                            if (sharedData.functions && typeof sharedData.functions === 'object') {
                                // Save each function
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
                            
                            // Clear the shared data from the URL
                            ShareService.clearSharedApiKeyFromUrl();
                            
                            // Remove the password modal
                            passwordModal.remove();
                            
                            // Resolve the promise with success
                            resolve({
                                success: true,
                                pendingSharedModel: pendingSharedModel
                            });
                        } else {
                            // If decryption failed, show an error message
                            paragraph.textContent = 'Incorrect password. Please try again.';
                            paragraph.style.color = 'red';
                            input.value = '';
                            input.focus();
                        }
                    } catch (error) {
                        // If decryption failed, show an error message
                        paragraph.textContent = 'Error decrypting data. Please try again.';
                        paragraph.style.color = 'red';
                        input.value = '';
                        input.focus();
                    }
                });
                
                // Close modal when clicking outside
                passwordModal.addEventListener('click', (e) => {
                    if (e.target === passwordModal) {
                        passwordModal.remove();
                        // Resolve the promise with failure
                        resolve({
                            success: false,
                            pendingSharedModel: null
                        });
                    }
                });
                
                // Handle escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && document.getElementById('password-modal')) {
                        passwordModal.remove();
                        // Resolve the promise with failure
                        resolve({
                            success: false,
                            pendingSharedModel: null
                        });
                    }
                });
            });
        }
        
        /**
         * Get the pending shared model
         * @returns {string|null} The pending shared model or null if none
         */
        function getPendingSharedModel() {
            return pendingSharedModel;
        }
        
        /**
         * Clear the pending shared model
         */
        function clearPendingSharedModel() {
            pendingSharedModel = null;
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
        
        // Public API
        return {
            hasSharedLink,
            promptForDecryptionPassword,
            getPendingSharedModel,
            clearPendingSharedModel,
            maskApiKey
        };
    }

    // Public API
    return {
        createSharedLinkManager
    };
})();
