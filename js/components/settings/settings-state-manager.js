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
     */
    function initializeComponents(componentManagers) {
        componentManagers.model.init();
        componentManagers.systemPrompt.init();
        componentManagers.baseUrl.init();
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
     * @param {Object} elements - DOM elements
     * @param {Function} hideSettingsModal - Function to hide settings modal
     * @param {Function} addSystemMessage - Function to add system message
     */
    function clearAllSettings(elements, hideSettingsModal, addSystemMessage) {
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
        
        // Define function tools storage keys to remove
        const functionToolsKeysToRemove = [
            'function_tools_enabled',
            'js_functions',
            'enabled_functions',
            'function_collections',
            'function_collection_metadata'
        ];
        
        // Remove all settings from localStorage for the current namespace
        keysToRemove.forEach(key => {
            localStorage.removeItem(StorageService.getNamespacedKey(key));
        });
        
        // Remove function tools settings from localStorage for the current namespace
        functionToolsKeysToRemove.forEach(key => {
            const namespacedKey = `hackare_${currentNamespace}_${key}`;
            localStorage.removeItem(namespacedKey);
            console.log(`Removed function tools key: ${namespacedKey}`);
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
            addSystemMessage('All settings for the current namespace have been deleted.');
        }
        
        return true;
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