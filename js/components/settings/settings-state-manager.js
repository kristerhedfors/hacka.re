/**
 * Settings State Manager Module
 * 
 * Manages state and storage operations for the settings system.
 * Handles component manager initialization and clear operations.
 */

window.SettingsStateManager = (function() {
    'use strict';
    
    /**
     * Create initial state object
     * @returns {Object} Initial state object
     */
    function createInitialState() {
        return {
            getSessionKey: null,        // Function to get session key
            setMessages: null,          // Function to set chat messages
            lastModelsFetchTime: 0,     // Track when models were last fetched
            updateModelInfoDisplay: null // Function to update model info display
        };
    }
    
    /**
     * Initialize component managers
     * @param {Object} elements - DOM elements required by various settings components
     * @returns {Object} Component managers object
     */
    function initializeComponentManagers(elements) {
        return {
            apiKey: ApiKeyManager.createApiKeyManager(),
            model: ModelManager.createModelManager(elements),
            systemPrompt: SystemPromptManager.createSystemPromptManager(elements),
            baseUrl: BaseUrlManager.createBaseUrlManager(elements),
            titleSubtitle: TitleSubtitleManager.createTitleSubtitleManager(),
            welcome: WelcomeManager.createWelcomeManager(elements),
            sharedLink: SharedLinkManager.createSharedLinkManager(elements),
            toolCalling: ToolCallingManager.createToolCallingManager()
        };
    }
    
    /**
     * Initialize component managers for settings functionality
     * @param {Object} componentManagers - Component managers object
     * @param {Object} elements - DOM elements for initialization
     */
    function initializeComponents(componentManagers, elements) {
        componentManagers.model.init();
        componentManagers.systemPrompt.init();
        componentManagers.baseUrl.init();
        
        // Initialize API key input handlers for auto-detection
        if (window.ApiKeyInputHandler && elements) {
            window.ApiKeyInputHandler.setupApiKeyInputHandlers(elements, componentManagers);
        }
    }
    
    /**
     * Update state with callback functions
     * @param {Object} state - State object to update
     * @param {Function} sessionKeyGetter - Function to get the session key
     * @param {Function} messagesUpdater - Function to update chat messages
     * @param {Function} updateModelInfoDisplay - Function to update model info display
     */
    function updateStateCallbacks(state, sessionKeyGetter, messagesUpdater, updateModelInfoDisplay) {
        state.getSessionKey = sessionKeyGetter;
        state.setMessages = messagesUpdater;
        state.updateModelInfoDisplay = updateModelInfoDisplay;
    }
    
    /**
     * Delete all saved settings for the current namespace
     * Uses CoreStorageService.clearAllData() which knows about all storage keys
     * @param {Object} elements - DOM elements
     * @param {Function} hideSettingsModal - Function to hide settings modal
     * @param {Function} addSystemMessage - Function to add system message
     */
    function clearAllSettings(elements, hideSettingsModal, addSystemMessage) {
        try {
            // Use CoreStorageService to clear all data comprehensively
            const result = CoreStorageService.clearAllData();
            
            if (result.success) {
                console.log(`Successfully cleared ${result.clearedKeys.length} storage keys:`, result.clearedKeys);
                
                // Update UI elements to reflect cleared state
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
                
                // Add confirmation message with details
                if (addSystemMessage) {
                    addSystemMessage(`All settings cleared successfully. Removed ${result.clearedKeys.length} storage keys for the current namespace.`);
                }
                
                return true;
            } else {
                console.error('Failed to clear all settings:', result.error);
                
                // Add error message
                if (addSystemMessage) {
                    addSystemMessage(`Error clearing settings: ${result.message}`);
                }
                
                return false;
            }
        } catch (error) {
            console.error('Exception during clearAllSettings:', error);
            
            // Add error message
            if (addSystemMessage) {
                addSystemMessage(`Failed to clear settings: ${error.message}`);
            }
            
            return false;
        }
    }
    
    /**
     * Set a pending shared model to be applied after models are fetched
     * @param {Object} componentManagers - Component managers object
     * @param {string} model - The model ID to set as pending
     */
    function setPendingSharedModel(componentManagers, model) {
        if (model && componentManagers.model && typeof componentManagers.model.setPendingSharedModel === 'function') {
            componentManagers.model.setPendingSharedModel(model);
        }
    }
    
    // Public API
    return {
        createInitialState,
        initializeComponentManagers,
        initializeComponents,
        updateStateCallbacks,
        clearAllSettings,
        setPendingSharedModel
    };
})();