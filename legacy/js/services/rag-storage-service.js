/**
 * RAG Storage Service
 * Handles encrypted storage of vector embeddings and chunks for RAG functionality
 */

window.RAGStorageService = (function() {
    // Storage keys
    const STORAGE_KEYS = {
        DEFAULT_PROMPTS_INDEX: 'rag_default_prompts_index',
        USER_BUNDLES_INDEX: 'rag_user_bundles_index',
        RAG_SETTINGS: 'rag_settings',
        EMBEDDINGS_CACHE: 'rag_embeddings_cache',
        SELECTED_RAG_PROMPTS: 'rag_selected_prompts'  // Separate from default prompts modal
    };

    /**
     * Save default prompts index to encrypted storage
     * @param {Object} indexData - The index data to store
     * @returns {boolean} Success status
     */
    function saveDefaultPromptsIndex(indexData) {
        try {
            if (!indexData || typeof indexData !== 'object') {
                console.error('RAGStorageService: Invalid index data provided');
                return false;
            }

            // Add metadata
            const dataToStore = {
                ...indexData,
                savedAt: new Date().toISOString(),
                version: '1.0'
            };

            const success = CoreStorageService.setValue(STORAGE_KEYS.DEFAULT_PROMPTS_INDEX, dataToStore);
            if (success) {
                console.log('RAGStorageService: Default prompts index saved successfully');
                return true;
            } else {
                console.error('RAGStorageService: Failed to save default prompts index - storage quota may be exceeded');
                return false;
            }
        } catch (error) {
            console.error('RAGStorageService: Error saving default prompts index:', error);
            return false;
        }
    }

    /**
     * Load default prompts index from encrypted storage
     * @returns {Object|null} The loaded index data or null if not found
     */
    function loadDefaultPromptsIndex() {
        try {
            const data = CoreStorageService.getValue(STORAGE_KEYS.DEFAULT_PROMPTS_INDEX);
            if (data && typeof data === 'object') {
                console.log('RAGStorageService: Default prompts index loaded successfully');
                return data;
            }
            return null;
        } catch (error) {
            console.error('RAGStorageService: Error loading default prompts index:', error);
            return null;
        }
    }

    /**
     * Save user bundles index to encrypted storage
     * @param {Object} bundlesData - The bundles data to store
     * @returns {boolean} Success status
     */
    function saveUserBundlesIndex(bundlesData) {
        try {
            if (!bundlesData || typeof bundlesData !== 'object') {
                console.error('RAGStorageService: Invalid bundles data provided');
                return false;
            }

            const dataToStore = {
                ...bundlesData,
                savedAt: new Date().toISOString(),
                version: '1.0'
            };

            const success = CoreStorageService.setValue(STORAGE_KEYS.USER_BUNDLES_INDEX, dataToStore);
            if (success) {
                console.log('RAGStorageService: User bundles index saved successfully');
                return true;
            } else {
                console.error('RAGStorageService: Failed to save user bundles index - storage quota may be exceeded');
                return false;
            }
        } catch (error) {
            console.error('RAGStorageService: Error saving user bundles index:', error);
            return false;
        }
    }

    /**
     * Load user bundles index from encrypted storage
     * @returns {Object|null} The loaded bundles data or null if not found
     */
    function loadUserBundlesIndex() {
        try {
            const data = CoreStorageService.getValue(STORAGE_KEYS.USER_BUNDLES_INDEX);
            if (data && typeof data === 'object') {
                console.log('RAGStorageService: User bundles index loaded successfully');
                return data;
            }
            return null;
        } catch (error) {
            console.error('RAGStorageService: Error loading user bundles index:', error);
            return null;
        }
    }

    /**
     * Save RAG settings
     * @param {Object} settings - RAG settings object
     * @returns {boolean} Success status
     */
    function saveRAGSettings(settings) {
        try {
            if (!settings || typeof settings !== 'object') {
                console.error('RAGStorageService: Invalid settings provided');
                return false;
            }

            CoreStorageService.setValue(STORAGE_KEYS.RAG_SETTINGS, settings);
            console.log('RAGStorageService: RAG settings saved successfully');
            return true;
        } catch (error) {
            console.error('RAGStorageService: Error saving RAG settings:', error);
            return false;
        }
    }

    /**
     * Load RAG settings
     * @returns {Object} RAG settings with defaults
     */
    function loadRAGSettings() {
        try {
            const settings = CoreStorageService.getValue(STORAGE_KEYS.RAG_SETTINGS);
            
            // Return settings with defaults
            return {
                embeddingModel: 'text-embedding-3-small',
                chunkSize: 512,
                chunkOverlap: 50,
                maxResults: 5,
                similarityThreshold: 0.3,
                enableAutoSearch: false,
                enabled: false,  // RAG disabled by default
                ...settings
            };
        } catch (error) {
            console.error('RAGStorageService: Error loading RAG settings:', error);
            // Return defaults on error
            return {
                embeddingModel: 'text-embedding-3-small',
                chunkSize: 512,
                chunkOverlap: 50,
                maxResults: 5,
                similarityThreshold: 0.3,
                enableAutoSearch: false,
                enabled: false
            };
        }
    }

    /**
     * Get RAG enabled state
     * @returns {boolean} Whether RAG is enabled
     */
    function isRAGEnabled() {
        try {
            const settings = loadRAGSettings();
            return settings.enabled;
        } catch (error) {
            console.error('RAGStorageService: Error getting RAG enabled state:', error);
            return false; // Default to disabled
        }
    }

    /**
     * Set RAG enabled state
     * @param {boolean} enabled - Whether RAG should be enabled
     * @returns {boolean} Success status
     */
    function setRAGEnabled(enabled) {
        try {
            const settings = loadRAGSettings();
            settings.enabled = Boolean(enabled);
            return saveRAGSettings(settings);
        } catch (error) {
            console.error('RAGStorageService: Error setting RAG enabled state:', error);
            return false;
        }
    }

    /**
     * Get the list of enabled EU regulation documents
     * @returns {Array<string>} Array of enabled document IDs ('cra', 'aia', 'dora')
     */
    function getEnabledEUDocuments() {
        try {
            const euDocsKey = 'rag_eu_documents_index';
            const existingDocs = CoreStorageService.getValue(euDocsKey);
            
            if (!existingDocs || typeof existingDocs !== 'object') {
                return [];
            }
            
            // Return IDs of enabled documents
            return Object.keys(existingDocs).filter(docId => 
                existingDocs[docId] && existingDocs[docId].enabled === true
            );
        } catch (error) {
            console.error('RAGStorageService: Error getting enabled EU documents:', error);
            return [];
        }
    }

    /**
     * Set the enabled EU regulation documents
     * @param {Array<string>} documentIds - Array of document IDs to enable ('cra', 'aia', 'dora')
     * @returns {boolean} Success status
     */
    function setEnabledEUDocuments(documentIds) {
        try {
            const euDocsKey = 'rag_eu_documents_index';
            const documentNames = {
                'cra': 'CRA (Cyber Resilience Act)',
                'aia': 'AIA (AI Act)',
                'dora': 'DORA (Digital Operational Resilience Act)'
            };
            
            // Get existing data or create new
            let existingDocs = {};
            const existing = CoreStorageService.getValue(euDocsKey);
            if (existing && typeof existing === 'object') {
                existingDocs = existing;
            }
            
            // Update all document states
            ['cra', 'aia', 'dora'].forEach(docId => {
                const shouldBeEnabled = documentIds.includes(docId);
                
                if (!existingDocs[docId]) {
                    existingDocs[docId] = {
                        name: documentNames[docId],
                        documentId: docId,
                        enabled: shouldBeEnabled,
                        hasVectors: false  // Will be updated when actually indexed
                    };
                } else {
                    existingDocs[docId].enabled = shouldBeEnabled;
                }
            });
            
            return CoreStorageService.setValue(euDocsKey, existingDocs);
        } catch (error) {
            console.error('RAGStorageService: Error setting enabled EU documents:', error);
            return false;
        }
    }

    /**
     * Migrate legacy rag_enabled from localStorage to proper storage
     * This should be called once during initialization
     */
    function migrateLegacyRAGSettings() {
        try {
            // Check if legacy rag_enabled exists in localStorage
            const legacyEnabled = localStorage.getItem('rag_enabled');
            if (legacyEnabled !== null) {
                console.log('RAGStorageService: Migrating legacy rag_enabled setting');
                
                // Parse the legacy value
                const enabled = JSON.parse(legacyEnabled);
                
                // Set it using the proper storage
                setRAGEnabled(enabled);
                
                // Remove the legacy setting
                localStorage.removeItem('rag_enabled');
                
                console.log('RAGStorageService: Legacy rag_enabled migrated and removed');
            }
        } catch (error) {
            console.warn('RAGStorageService: Error migrating legacy RAG settings:', error);
        }
    }

    /**
     * Cache embeddings for later use
     * @param {string} cacheKey - Unique key for the cache entry
     * @param {Array} embeddings - Array of embedding vectors
     * @param {string} model - Model used for embeddings
     * @returns {boolean} Success status
     */
    function cacheEmbeddings(cacheKey, embeddings, model) {
        try {
            if (!cacheKey || !embeddings || !Array.isArray(embeddings)) {
                console.error('RAGStorageService: Invalid cache parameters');
                return false;
            }

            let cache = CoreStorageService.getValue(STORAGE_KEYS.EMBEDDINGS_CACHE) || {};
            
            cache[cacheKey] = {
                embeddings: embeddings,
                model: model,
                timestamp: new Date().toISOString(),
                size: embeddings.length
            };

            // Clean old cache entries if cache gets too large
            const cacheKeys = Object.keys(cache);
            if (cacheKeys.length > 100) {
                // Remove oldest entries
                const sortedKeys = cacheKeys.sort((a, b) => {
                    return new Date(cache[a].timestamp) - new Date(cache[b].timestamp);
                });
                
                // Keep only the 50 most recent entries
                const keysToKeep = sortedKeys.slice(-50);
                const newCache = {};
                keysToKeep.forEach(key => {
                    newCache[key] = cache[key];
                });
                cache = newCache;
            }

            CoreStorageService.setValue(STORAGE_KEYS.EMBEDDINGS_CACHE, cache);
            console.log(`RAGStorageService: Cached ${embeddings.length} embeddings with key: ${cacheKey}`);
            return true;
        } catch (error) {
            console.error('RAGStorageService: Error caching embeddings:', error);
            return false;
        }
    }

    /**
     * Retrieve cached embeddings
     * @param {string} cacheKey - Unique key for the cache entry
     * @returns {Object|null} Cached embeddings data or null if not found
     */
    function getCachedEmbeddings(cacheKey) {
        try {
            const cache = CoreStorageService.getValue(STORAGE_KEYS.EMBEDDINGS_CACHE) || {};
            
            if (cache[cacheKey]) {
                console.log(`RAGStorageService: Found cached embeddings for key: ${cacheKey}`);
                return cache[cacheKey];
            }
            
            return null;
        } catch (error) {
            console.error('RAGStorageService: Error retrieving cached embeddings:', error);
            return null;
        }
    }

    /**
     * Clear all RAG storage
     * @returns {boolean} Success status
     */
    function clearAllRAGStorage() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                CoreStorageService.removeValue(key);
            });
            console.log('RAGStorageService: All RAG storage cleared');
            return true;
        } catch (error) {
            console.error('RAGStorageService: Error clearing RAG storage:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage statistics
     */
    function getStorageStats() {
        try {
            const defaultIndex = loadDefaultPromptsIndex();
            const userBundles = loadUserBundlesIndex();
            const cache = CoreStorageService.getValue(STORAGE_KEYS.EMBEDDINGS_CACHE) || {};

            return {
                defaultPromptsIndexed: defaultIndex ? (defaultIndex.chunks?.length || 0) : 0,
                userBundlesLoaded: userBundles ? (userBundles.bundles?.length || 0) : 0,
                cachedEmbeddings: Object.keys(cache).length,
                lastUpdated: defaultIndex ? defaultIndex.savedAt : null
            };
        } catch (error) {
            console.error('RAGStorageService: Error getting storage stats:', error);
            return {
                defaultPromptsIndexed: 0,
                userBundlesLoaded: 0,
                cachedEmbeddings: 0,
                lastUpdated: null
            };
        }
    }

    /**
     * Get selected RAG prompts (for indexing)
     * @returns {Array} Array of selected RAG prompt IDs
     */
    function getSelectedRAGPrompts() {
        try {
            const selectedIds = CoreStorageService.getValue(STORAGE_KEYS.SELECTED_RAG_PROMPTS);
            return Array.isArray(selectedIds) ? selectedIds : [];
        } catch (error) {
            console.error('RAGStorageService: Error getting selected RAG prompts:', error);
            return [];
        }
    }

    /**
     * Set selected RAG prompts (for indexing)
     * @param {Array} promptIds - Array of prompt IDs to select for RAG indexing
     * @returns {boolean} Success status
     */
    function setSelectedRAGPrompts(promptIds) {
        try {
            if (!Array.isArray(promptIds)) {
                console.error('RAGStorageService: Invalid prompt IDs array');
                return false;
            }
            
            CoreStorageService.setValue(STORAGE_KEYS.SELECTED_RAG_PROMPTS, promptIds);
            console.log('RAGStorageService: RAG prompt selections saved:', promptIds);
            return true;
        } catch (error) {
            console.error('RAGStorageService: Error saving selected RAG prompts:', error);
            return false;
        }
    }

    /**
     * Toggle RAG prompt selection (for indexing)
     * @param {string} promptId - Prompt ID to toggle
     * @returns {boolean} True if now selected, false if unselected
     */
    function toggleRAGPromptSelection(promptId) {
        try {
            const selectedIds = getSelectedRAGPrompts();
            const index = selectedIds.indexOf(promptId);
            
            if (index >= 0) {
                // Remove from selected
                selectedIds.splice(index, 1);
                setSelectedRAGPrompts(selectedIds);
                console.log('RAGStorageService: Deselected RAG prompt:', promptId);
                return false;
            } else {
                // Add to selected
                selectedIds.push(promptId);
                setSelectedRAGPrompts(selectedIds);
                console.log('RAGStorageService: Selected RAG prompt:', promptId);
                return true;
            }
        } catch (error) {
            console.error('RAGStorageService: Error toggling RAG prompt selection:', error);
            return false;
        }
    }

    /**
     * Check if a prompt is selected for RAG indexing
     * @param {string} promptId - Prompt ID to check
     * @returns {boolean} True if selected for RAG
     */
    function isRAGPromptSelected(promptId) {
        try {
            const selectedIds = getSelectedRAGPrompts();
            return selectedIds.includes(promptId);
        } catch (error) {
            console.error('RAGStorageService: Error checking RAG prompt selection:', error);
            return false;
        }
    }

    /**
     * Clear all RAG prompt selections
     * @returns {boolean} Success status
     */
    function clearRAGPromptSelections() {
        try {
            CoreStorageService.removeValue(STORAGE_KEYS.SELECTED_RAG_PROMPTS);
            console.log('RAGStorageService: All RAG prompt selections cleared');
            return true;
        } catch (error) {
            console.error('RAGStorageService: Error clearing RAG prompt selections:', error);
            return false;
        }
    }

    /**
     * Get the configured query expansion model
     * @returns {string|null} The expansion model ID or null if not set
     */
    function getExpansionModel() {
        try {
            const settings = loadRAGSettings();
            return settings.expansionModel || null;
        } catch (error) {
            console.error('RAGStorageService: Error getting expansion model:', error);
            return null;
        }
    }

    /**
     * Set the query expansion model
     * @param {string} modelId - The model ID to use for query expansion
     * @returns {boolean} Success status
     */
    function setExpansionModel(modelId) {
        try {
            const settings = loadRAGSettings();
            settings.expansionModel = modelId;
            return saveRAGSettings(settings);
        } catch (error) {
            console.error('RAGStorageService: Error setting expansion model:', error);
            return false;
        }
    }

    /**
     * Validate storage integrity
     * @returns {Object} Validation results
     */
    function validateStorage() {
        const validation = {
            isValid: true,
            issues: [],
            stats: getStorageStats()
        };

        try {
            // Check default prompts index
            const defaultIndex = loadDefaultPromptsIndex();
            if (defaultIndex) {
                if (!defaultIndex.chunks || !Array.isArray(defaultIndex.chunks)) {
                    validation.isValid = false;
                    validation.issues.push('Default prompts index: missing or invalid chunks array');
                }
                if (!defaultIndex.embeddings || !Array.isArray(defaultIndex.embeddings)) {
                    validation.isValid = false;
                    validation.issues.push('Default prompts index: missing or invalid embeddings array');
                }
            }

            // Check user bundles
            const userBundles = loadUserBundlesIndex();
            if (userBundles) {
                if (!userBundles.bundles || !Array.isArray(userBundles.bundles)) {
                    validation.isValid = false;
                    validation.issues.push('User bundles: missing or invalid bundles array');
                }
            }

            // Check cache integrity
            const cache = CoreStorageService.getValue(STORAGE_KEYS.EMBEDDINGS_CACHE);
            if (cache && typeof cache !== 'object') {
                validation.isValid = false;
                validation.issues.push('Embeddings cache: invalid format');
            }

        } catch (error) {
            validation.isValid = false;
            validation.issues.push(`Validation error: ${error.message}`);
        }

        console.log('RAGStorageService: Storage validation completed', validation);
        return validation;
    }

    // Public API
    return {
        // Default prompts index
        saveDefaultPromptsIndex,
        loadDefaultPromptsIndex,
        
        // User bundles
        saveUserBundlesIndex,
        loadUserBundlesIndex,
        
        // Settings
        saveRAGSettings,
        loadRAGSettings,
        isRAGEnabled,
        setRAGEnabled,
        getEnabledEUDocuments,
        setEnabledEUDocuments,
        
        // Embeddings cache
        cacheEmbeddings,
        getCachedEmbeddings,
        
        // RAG prompt selections (separate from default prompts modal)
        getSelectedRAGPrompts,
        setSelectedRAGPrompts,
        toggleRAGPromptSelection,
        isRAGPromptSelected,
        clearRAGPromptSelections,
        
        // Query expansion model
        getExpansionModel,
        setExpansionModel,
        
        // Management
        clearAllRAGStorage,
        getStorageStats,
        validateStorage,
        migrateLegacyRAGSettings,
        
        // Constants
        STORAGE_KEYS
    };
})();