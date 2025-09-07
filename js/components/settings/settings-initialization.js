/**
 * Settings Initialization Module
 * 
 * Handles initialization logic and setup for the settings system,
 * including shared link processing and modal display logic.
 */

window.SettingsInitialization = (function() {
    'use strict';
    
    // Constants
    const MODEL_FETCH_INTERVAL = 60000; // 1 minute in milliseconds
    
    /**
     * Handle initial API key check and setup
     * @param {Object} elements - DOM elements
     * @param {Object} componentManagers - Component managers object
     * @param {Function} showApiKeyModal - Function to show API key modal
     * @param {Function} updateModelInfoDisplay - Function to update model info display
     */
    function handleInitialApiKeyCheck(elements, componentManagers, showApiKeyModal, updateModelInfoDisplay) {
        const apiKey = componentManagers.apiKey.getApiKey();
        
        if (!apiKey) {
            // Show welcome modal for first time users, but don't auto-open settings
            componentManagers.welcome.showWelcomeModalIfFirstTime();
            // No automatic opening of settings modal - user must click settings button
        } else {
            // Load saved base URL before fetching models
            const baseUrl = componentManagers.baseUrl.getBaseUrl();
            
            // Fetch available models if API key exists
            // Use updateStorage=true to ensure the values are properly loaded
            componentManagers.model.fetchAvailableModels(
                apiKey, 
                baseUrl, 
                true, 
                SettingsCoordinator.createContextUsageCallback({updateModelInfoDisplay}, componentManagers)
            );
        }
    }
    
    /**
     * Process shared model when password verification was already completed
     * @param {string} pendingModel - The pending shared model
     * @param {Object} componentManagers - Component managers object
     * @param {Object} state - Current state object
     * @param {Function} updateModelInfoDisplay - Function to update model info display
     */
    function processSharedModel(pendingModel, componentManagers, state, updateModelInfoDisplay) {
        // Get the API key and base URL
        const apiKey = componentManagers.apiKey.getApiKey();
        const baseUrl = componentManagers.baseUrl.getBaseUrl();
        
        // Fetch models with the new values and pass the callback
        componentManagers.model.fetchAvailableModels(
            apiKey, 
            baseUrl, 
            true, 
            SettingsCoordinator.createContextUsageCallback(state, componentManagers)
        ).then(modelResult => {
            if (modelResult.success && modelResult.model) {
                // If a shared model was applied successfully
                const displayName = ModelInfoService.getDisplayName(modelResult.model);
                // Skip showing system message about model being applied
                
                // Update model info display
                if (updateModelInfoDisplay) {
                    updateModelInfoDisplay(componentManagers.model.getCurrentModel());
                }
            } else if (modelResult.model) {
                // If a shared model was not available
                const displayName = ModelInfoService.getDisplayName(modelResult.model);
                // Note: No addSystemMessage available in this path
                console.warn(`Shared model "${displayName}" is not available with your API key. Using default model instead.`);
            }
            
            // Welcome message is now handled by the prepending system in ChatManager
            // No need for deferred display - message will appear first when conversation loads
        });
    }
    
    /**
     * Process shared link initialization
     * @param {Object} elements - DOM elements
     * @param {Object} componentManagers - Component managers object
     * @param {Object} state - Current state object
     * @param {Function} updateModelInfoDisplay - Function to update model info display
     * @param {Function} addSystemMessage - Function to add system message
     * @param {Function} showApiKeyModal - Function to show API key modal
     */
    async function processSharedLinkInitialization(elements, componentManagers, state, updateModelInfoDisplay, addSystemMessage, showApiKeyModal) {
        if (componentManagers.sharedLink.hasSharedLink()) {
            // Check if password verification was already completed by the early shared link system
            if (window._passwordVerificationComplete) {
                console.log('[Settings Init] Password already verified by early system, processing shared data...');
                
                // The early system only verified the password but didn't process the data
                // We need to extract and process the shared data using the stored session key
                try {
                    const sessionResult = await componentManagers.sharedLink.trySessionKeyDecryption ?
                        await componentManagers.sharedLink.trySessionKeyDecryption(addSystemMessage, state.setMessages) :
                        null;
                    
                    if (sessionResult && sessionResult.success) {
                        // Process model if there is one
                        if (sessionResult.pendingSharedModel) {
                            processSharedModel(sessionResult.pendingSharedModel, componentManagers, state, updateModelInfoDisplay);
                        }
                        // Success means data was processed (welcome messages, etc.) even if no model
                        console.log('[Settings Init] Shared data processed successfully');
                    } else {
                        console.warn('[Settings Init] Early password verification completed but no shared data could be processed');
                        
                        // Check if we have pending shared data that was extracted but not processed
                        if (window._pendingSharedData) {
                            console.log('[Settings Init] Found pending shared data, attempting to process it now');
                            try {
                                const processedModel = window.SharedLinkDataProcessor ? 
                                    await window.SharedLinkDataProcessor.processSharedData(
                                        window._pendingSharedData, 
                                        { 
                                            addSystemMessage, 
                                            setMessages: state.setMessages, 
                                            displayWelcomeMessage: true 
                                        }
                                    ) : null;
                                
                                if (processedModel) {
                                    processSharedModel(processedModel, componentManagers, state, updateModelInfoDisplay);
                                }
                                
                                console.log('[Settings Init] Successfully processed pending shared data');
                                delete window._pendingSharedData; // Clean up
                            } catch (retryError) {
                                console.error('[Settings Init] Failed to process pending shared data:', retryError);
                            }
                        }
                    }
                } catch (error) {
                    console.error('[Settings Init] Error processing early verified shared data:', error);
                }
                return;
            }
            
            // Show password prompt for decryption
            componentManagers.sharedLink.promptForDecryptionPassword(
                addSystemMessage, 
                state.setMessages
            ).then(result => {
                if (result.success) {
                    // If a shared model was provided, fetch models to check if it's available
                    if (result.pendingSharedModel) {
                        processSharedModel(result.pendingSharedModel, componentManagers, state, updateModelInfoDisplay);
                    } else {
                        // No shared model, just fetch models
                        const apiKey = componentManagers.apiKey.getApiKey();
                        const baseUrl = componentManagers.baseUrl.getBaseUrl();
                        
                        // Fetch models with the new values and pass the callback
                        componentManagers.model.fetchAvailableModels(
                            apiKey, 
                            baseUrl, 
                            true, 
                            SettingsCoordinator.createContextUsageCallback(state, componentManagers)
                        ).then(() => {
                            // Welcome message is now handled by the prepending system in ChatManager
                            // No need for deferred display - message will appear first when conversation loads
                        });
                    }
                } else {
                    // Decryption failed or was cancelled
                    handleInitialApiKeyCheck(elements, componentManagers, showApiKeyModal, updateModelInfoDisplay);
                }
            });
        } else {
            // No shared link, perform normal initialization
            // Mark password verification as complete (no shared link means no password needed)
            window._passwordVerificationComplete = true;
            handleInitialApiKeyCheck(elements, componentManagers, showApiKeyModal, updateModelInfoDisplay);
        }
    }
    
    /**
     * Show the settings modal with proper initialization
     * @param {Object} elements - DOM elements
     * @param {Object} componentManagers - Component managers object
     * @param {Object} state - Current state object
     * @param {string} apiKey - Current API key
     * @param {string} currentModel - Current model ID
     * @param {string} systemPrompt - Current system prompt
     * @param {Function} fetchAvailableModels - Function to fetch available models
     * @param {Function} populateDefaultModels - Function to populate default models
     */
    function showSettingsModal(elements, componentManagers, state, apiKey, currentModel, systemPrompt, fetchAvailableModels, populateDefaultModels) {
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
            // Focus the API key field if it's empty, otherwise focus the model select
            if (elements.apiKeyUpdate && !apiKey) {
                setTimeout(() => elements.apiKeyUpdate.focus(), 100);
            }
        }
    }
    
    // Public API
    return {
        MODEL_FETCH_INTERVAL,
        handleInitialApiKeyCheck,
        processSharedLinkInitialization,
        showSettingsModal
    };
})();