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
        EMBEDDINGS_CACHE: 'rag_embeddings_cache'
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

            CoreStorageService.setValue(STORAGE_KEYS.DEFAULT_PROMPTS_INDEX, dataToStore);
            console.log('RAGStorageService: Default prompts index saved successfully');
            return true;
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

            CoreStorageService.setValue(STORAGE_KEYS.USER_BUNDLES_INDEX, dataToStore);
            console.log('RAGStorageService: User bundles index saved successfully');
            return true;
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
                enableAutoSearch: false
            };
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
        
        // Embeddings cache
        cacheEmbeddings,
        getCachedEmbeddings,
        
        // Management
        clearAllRAGStorage,
        getStorageStats,
        validateStorage,
        
        // Constants
        STORAGE_KEYS
    };
})();