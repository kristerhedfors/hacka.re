/**
 * Settings Manager Module
 * 
 * Main entry point that coordinates all settings-related functionality using modular components.
 * This module has been refactored into specialized modules:
 * - SettingsCoordinator: Core coordination logic
 * - SettingsStateManager: State management and storage operations
 * - SettingsInitialization: Initialization logic and setup
 */

window.SettingsManager = (function() {
    'use strict';
    
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
        
        // Initialize component managers using the state manager
        const componentManagers = SettingsStateManager.initializeComponentManagers(elements);
        
        // Initialize state using the state manager
        const state = SettingsStateManager.createInitialState();
        
        /**
         * Initialize the settings manager
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} showApiKeyModal - Function to show API key modal
         * @param {Function} addSystemMessage - Function to add system message
         * @param {Function} sessionKeyGetter - Function to get the session key
         * @param {Function} messagesUpdater - Function to update chat messages
         */
        function init(updateModelInfoDisplay, showApiKeyModal, addSystemMessage, sessionKeyGetter, messagesUpdater) {
            // Update state with callback functions
            SettingsStateManager.updateStateCallbacks(state, sessionKeyGetter, messagesUpdater, updateModelInfoDisplay);
            
            // Initialize component managers
            SettingsStateManager.initializeComponents(componentManagers);
            
            // Process shared link initialization or normal initialization
            SettingsInitialization.processSharedLinkInitialization(
                elements, 
                componentManagers, 
                state, 
                updateModelInfoDisplay, 
                addSystemMessage, 
                showApiKeyModal
            );
            
            // Set up event listener for model reload button
            SettingsCoordinator.setupModelReloadButton(elements, componentManagers, updateModelInfoDisplay);
            
            // Update model info in header
            if (updateModelInfoDisplay) {
                updateModelInfoDisplay(componentManagers.model.getCurrentModel());
            }
        }
        
        /**
         * Add tool calling setting to settings form
         * @param {HTMLElement} settingsForm - The settings form element
         * @param {Function} addSystemMessage - Function to add a system message to the chat
         */
        function addToolCallingSetting(settingsForm, addSystemMessage) {
            SettingsCoordinator.addToolCallingSetting(componentManagers, settingsForm, addSystemMessage);
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
            SettingsInitialization.showSettingsModal(
                elements,
                componentManagers,
                state,
                apiKey,
                currentModel,
                systemPrompt,
                fetchAvailableModels,
                populateDefaultModels
            );
        }
        
        /**
         * Save the API key
         * @param {Function} hideApiKeyModal - Function to hide API key modal
         * @param {Function} addSystemMessage - Function to add system message
         */
        function saveApiKey(hideApiKeyModal, addSystemMessage) {
            return SettingsCoordinator.saveApiKey(elements, componentManagers, state, hideApiKeyModal, addSystemMessage);
        }
        
        /**
         * Save settings
         * @param {Function} hideSettingsModal - Function to hide settings modal
         * @param {Function} updateModelInfoDisplay - Function to update model info display
         * @param {Function} addSystemMessage - Function to add system message
         */
        function saveSettings(hideSettingsModal, updateModelInfoDisplay, addSystemMessage) {
            return SettingsCoordinator.saveSettings(elements, componentManagers, state, hideSettingsModal, updateModelInfoDisplay, addSystemMessage);
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
            SettingsCoordinator.saveModel(componentManagers, model);
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
            return SettingsStateManager.clearAllSettings(elements, hideSettingsModal, addSystemMessage);
        }
        
        /**
         * Set a pending shared model to be applied after models are fetched
         * @param {string} model - The model ID to set as pending
         */
        function setPendingSharedModel(model) {
            SettingsStateManager.setPendingSharedModel(componentManagers, model);
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
