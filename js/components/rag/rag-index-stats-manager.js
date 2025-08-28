/**
 * RAG Index Stats Manager
 * Manages display of RAG index statistics and button states
 */

window.RAGIndexStatsManager = (function() {
    
    let isInitialized = false;

    /**
     * Initialize the RAG Index Stats Manager
     */
    function init() {
        if (isInitialized) {
            return;
        }

        isInitialized = true;
        console.log('RAGIndexStatsManager: Initialized successfully');
    }

    /**
     * Update all statistics displays
     */
    function updateStats() {
        updateIndexStats();
        updateButtonStates();
        
        // Also update search button state if search manager exists
        if (window.RAGSearchManager) {
            window.RAGSearchManager.updateSearchButtonState();
        }
    }

    /**
     * Update index statistics display
     */
    function updateIndexStats() {
        const stats = VectorRAGService.getIndexStats();
        
        // Update default prompts stats
        const defaultChunksEl = document.getElementById('rag-default-chunks');
        const defaultModelEl = document.getElementById('rag-default-model');
        
        if (defaultChunksEl) {
            defaultChunksEl.textContent = `${stats.defaultPrompts.chunks} chunks indexed`;
        }
        
        if (defaultModelEl) {
            defaultModelEl.textContent = stats.defaultPrompts.available 
                ? `Model: ${stats.settings.embeddingModel}`
                : 'No embeddings model';
        }

        // Update user bundles stats
        const userChunksEl = document.getElementById('rag-user-chunks');
        const userFilesEl = document.getElementById('rag-user-files');
        
        if (userChunksEl) {
            userChunksEl.textContent = `${stats.userBundles.totalChunks} chunks available`;
        }
        
        if (userFilesEl) {
            userFilesEl.textContent = `${stats.userBundles.bundles} bundles`;
        }
    }

    /**
     * Update button states based on current conditions
     */
    function updateButtonStates() {
        const apiKey = StorageService.getApiKey();
        const generateBtn = document.getElementById('rag-index-defaults-btn');
        
        if (generateBtn) {
            generateBtn.disabled = !apiKey;
            generateBtn.title = apiKey 
                ? 'Generate embeddings for selected default prompts'
                : 'API key required for embedding generation';
        }
    }

    /**
     * Get current statistics
     * @returns {Object} Current RAG statistics
     */
    function getStats() {
        return VectorRAGService.getIndexStats();
    }

    // Public API
    return {
        init,
        updateStats,
        updateIndexStats,
        updateButtonStates,
        getStats
    };
})();