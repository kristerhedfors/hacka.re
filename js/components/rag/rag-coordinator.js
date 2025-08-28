/**
 * RAG Coordinator
 * Main coordinator for all RAG functionality, replacing the monolithic rag-manager
 * Orchestrates specialized RAG components
 */

window.RAGCoordinator = (function() {
    
    let isInitialized = false;
    let elements = {};

    /**
     * Initialize the RAG Coordinator and all sub-components
     * @param {Object} domElements - DOM elements object
     */
    function init(domElements) {
        if (isInitialized) {
            return;
        }

        elements = domElements;
        
        // Initialize all RAG sub-components
        initializeSubComponents();
        
        // Initialize RAG services
        VectorRAGService.initialize();
        
        // Initialize regulations service
        if (window.ragRegulationsService) {
            window.ragRegulationsService.initialize().catch(error => {
                console.warn('Failed to initialize regulations service:', error);
            });
        }
        
        // Migrate legacy localStorage settings to proper storage
        RAGStorageService.migrateLegacyRAGSettings();
        
        isInitialized = true;
        console.log('RAGCoordinator: Initialized successfully');
        
        // Load initial data
        updateAllComponents();
    }

    /**
     * Initialize all sub-components
     */
    function initializeSubComponents() {
        // Initialize modal manager
        if (window.RAGModalManager) {
            window.RAGModalManager.init(elements);
        }

        // Initialize search manager
        if (window.RAGSearchManager) {
            window.RAGSearchManager.init();
        }

        // Initialize index stats manager
        if (window.RAGIndexStatsManager) {
            window.RAGIndexStatsManager.init();
        }

        // Initialize file knowledge manager
        if (window.RAGFileKnowledgeManager) {
            window.RAGFileKnowledgeManager.init();
        }

        // Initialize prompts list manager
        if (window.RAGPromptsListManager) {
            window.RAGPromptsListManager.init();
        }

        // Initialize user bundles manager
        if (window.RAGUserBundlesManager) {
            window.RAGUserBundlesManager.init();
        }

        // Initialize embedding generator
        if (window.RAGEmbeddingGenerator) {
            window.RAGEmbeddingGenerator.init();
        }

        console.log('RAGCoordinator: All sub-components initialized');
    }

    /**
     * Update all RAG components
     */
    function updateAllComponents() {
        // Update statistics
        if (window.RAGIndexStatsManager) {
            window.RAGIndexStatsManager.updateStats();
        }

        // Update prompts list
        if (window.RAGPromptsListManager) {
            window.RAGPromptsListManager.loadPromptsList();
        }

        // Update file knowledge
        if (window.RAGFileKnowledgeManager) {
            window.RAGFileKnowledgeManager.loadFiles();
        }

        // Update user bundles
        if (window.RAGUserBundlesManager) {
            window.RAGUserBundlesManager.loadBundlesList();
        }

        // Update search button state
        if (window.RAGSearchManager) {
            window.RAGSearchManager.updateSearchButtonState();
        }
    }

    /**
     * Show the RAG modal
     */
    function showRAGModal() {
        if (window.RAGModalManager) {
            window.RAGModalManager.showModal();
        }
    }

    /**
     * Hide the RAG modal
     */
    function hideRAGModal() {
        if (window.RAGModalManager) {
            window.RAGModalManager.hideModal();
        }
    }

    /**
     * Check if RAG is currently enabled
     * @returns {boolean} Whether RAG is enabled
     */
    function isRAGEnabled() {
        if (window.RAGModalManager) {
            return window.RAGModalManager.isRAGEnabled();
        }
        return RAGStorageService.isRAGEnabled();
    }

    /**
     * Get RAG enabled state
     * @returns {boolean} Whether RAG is enabled
     */
    function getRAGEnabledState() {
        if (window.RAGModalManager) {
            return window.RAGModalManager.getRAGEnabledState();
        }
        return RAGStorageService.isRAGEnabled();
    }

    /**
     * Set RAG enabled state
     * @param {boolean} enabled - Whether RAG should be enabled
     */
    function setRAGEnabledState(enabled) {
        if (window.RAGModalManager) {
            window.RAGModalManager.setRAGEnabledState(enabled);
        } else {
            RAGStorageService.setRAGEnabled(enabled);
        }
    }

    /**
     * Get current RAG status
     * @returns {Object} Current status
     */
    function getStatus() {
        return {
            initialized: isInitialized,
            enabled: getRAGEnabledState(),
            stats: VectorRAGService.getIndexStats()
        };
    }

    /**
     * Refresh all RAG data
     */
    function refreshData() {
        VectorRAGService.reloadIndexes();
        updateAllComponents();
    }

    /**
     * Copy search result to clipboard (delegate to search manager)
     * @param {number} index - Result index
     */
    function copyResultToClipboard(index) {
        if (window.RAGSearchManager) {
            window.RAGSearchManager.copyResultToClipboard(index);
        }
    }

    /**
     * Use search result in chat (delegate to search manager)
     * @param {number} index - Result index
     */
    function useResultInChat(index) {
        if (window.RAGSearchManager) {
            window.RAGSearchManager.useResultInChat(index);
        }
    }

    /**
     * Remove user bundle (delegate to bundles manager)
     * @param {string} bundleName - Name of bundle to remove
     */
    function removeUserBundle(bundleName) {
        if (window.RAGUserBundlesManager) {
            window.RAGUserBundlesManager.removeBundle(bundleName);
        }
    }

    /**
     * Remove file (delegate to file knowledge manager)
     * @param {string} fileId - File ID to remove
     */
    function removeFile(fileId) {
        if (window.RAGFileKnowledgeManager) {
            window.RAGFileKnowledgeManager.removeFile(fileId);
        }
    }

    /**
     * Update UI (refresh all components)
     */
    function updateUI() {
        updateAllComponents();
    }

    /**
     * Refresh prompts list (delegate to prompts list manager)
     */
    function refreshPromptsList() {
        if (window.RAGPromptsListManager) {
            window.RAGPromptsListManager.loadPromptsList();
        }
    }

    // Public API - maintaining compatibility with existing code
    return {
        init,
        showRAGModal,
        hideRAGModal,
        getStatus,
        copyResultToClipboard,
        useResultInChat,
        updateUI,
        removeUserBundle,
        removeFile,
        isRAGEnabled,
        getRAGEnabledState,
        setRAGEnabledState,
        refreshPromptsList,
        refreshData,
        
        // Additional methods for component coordination
        updateAllComponents,
        initializeSubComponents
    };
})();

// Maintain backward compatibility
window.RAGManager = window.RAGCoordinator;