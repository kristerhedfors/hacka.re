/**
 * Storage Service
 * Main entry point for storage operations, using modular components
 */

window.StorageService = (function() {
    // Initialize the core storage service
    CoreStorageService.init();
    
    // Public API - expose all data service methods
    return {
        // Constants
        STORAGE_KEYS: NamespaceService.BASE_STORAGE_KEYS,
        BASE_STORAGE_KEYS: NamespaceService.BASE_STORAGE_KEYS,
        
        // Namespace methods
        getNamespace: NamespaceService.getNamespace,
        getNamespacedKey: NamespaceService.getNamespacedKey,
        resetNamespaceCache: NamespaceService.resetNamespaceCache,
        
        // Data methods
        saveApiKey: DataService.saveApiKey,
        getApiKey: DataService.getApiKey,
        saveModel: DataService.saveModel,
        getModel: DataService.getModel,
        saveChatHistory: DataService.saveChatHistory,
        loadChatHistory: DataService.loadChatHistory,
        clearChatHistory: DataService.clearChatHistory,
        saveSystemPrompt: DataService.saveSystemPrompt,
        getSystemPrompt: DataService.getSystemPrompt,
        saveShareOptions: DataService.saveShareOptions,
        getShareOptions: DataService.getShareOptions,
        saveBaseUrl: DataService.saveBaseUrl,
        getBaseUrl: DataService.getBaseUrl,
        saveBaseUrlProvider: DataService.saveBaseUrlProvider,
        getBaseUrlProvider: DataService.getBaseUrlProvider,
        getDefaultBaseUrlForProvider: DataService.getDefaultBaseUrlForProvider,
        saveTitle: DataService.saveTitle,
        getTitle: DataService.getTitle,
        saveSubtitle: DataService.saveSubtitle,
        getSubtitle: DataService.getSubtitle,
        saveShareWelcomeSettings: DataService.saveShareWelcomeSettings,
        getShareWelcomeMessage: DataService.getShareWelcomeMessage,
        getShareWelcomeEnabled: DataService.getShareWelcomeEnabled,
        saveDebugMode: DataService.saveDebugMode,
        getDebugMode: DataService.getDebugMode,
        saveDebugCategories: DataService.saveDebugCategories,
        getDebugCategories: DataService.getDebugCategories
    };
})();
