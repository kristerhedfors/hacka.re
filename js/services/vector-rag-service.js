/**
 * Vector RAG Service
 * Core RAG functionality with cosine similarity search and result ranking
 */

window.VectorRAGService = (function() {
    
    let isInitialized = false;
    let defaultPromptsIndex = null;
    let userBundlesIndex = null;
    let ragSettings = null;

    /**
     * Initialize the RAG service
     */
    function initialize() {
        if (isInitialized) {
            return;
        }

        console.log('VectorRAGService: Initializing...');
        
        // Load existing indexes and settings
        defaultPromptsIndex = RAGStorageService.loadDefaultPromptsIndex();
        userBundlesIndex = RAGStorageService.loadUserBundlesIndex();
        ragSettings = RAGStorageService.loadRAGSettings();
        
        isInitialized = true;
        console.log('VectorRAGService: Initialization completed');
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array} vecA - First vector
     * @param {Array} vecB - Second vector
     * @returns {number} Cosine similarity score (0-1)
     */
    function cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Generate query embedding
     * @param {string} query - Search query
     * @param {string} apiKey - API key
     * @param {string} baseUrl - Base URL
     * @param {string} model - Embedding model
     * @returns {Promise<Array>} Query embedding vector
     */
    async function generateQueryEmbedding(query, apiKey, baseUrl, model = 'text-embedding-3-small') {
        if (!query || typeof query !== 'string') {
            throw new Error('Invalid query provided');
        }

        if (!apiKey) {
            throw new Error('API key is required for query embedding generation');
        }

        try {
            const response = await fetch(`${baseUrl}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    input: [query],
                    encoding_format: 'float'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.data || !Array.isArray(data.data) || !data.data[0]?.embedding) {
                throw new Error('Invalid response format from embeddings API');
            }

            return data.data[0].embedding;
        } catch (error) {
            console.error('VectorRAGService: Error generating query embedding:', error);
            throw error;
        }
    }

    /**
     * Search default prompts index
     * @param {Array} queryEmbedding - Query embedding vector
     * @param {number} maxResults - Maximum number of results
     * @param {number} threshold - Similarity threshold
     * @returns {Array} Search results
     */
    function searchDefaultPromptsIndex(queryEmbedding, maxResults = 5, threshold = 0.3) {
        if (!defaultPromptsIndex || !defaultPromptsIndex.chunks) {
            console.log('VectorRAGService: No default prompts index available');
            return [];
        }

        const results = [];

        for (const chunk of defaultPromptsIndex.chunks) {
            if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
                continue;
            }

            const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
            
            if (similarity >= threshold) {
                results.push({
                    content: chunk.content,
                    similarity: similarity,
                    metadata: chunk.metadata,
                    source: 'default_prompts',
                    type: chunk.metadata?.type || 'default_prompt',
                    promptName: chunk.metadata?.promptName || 'Unknown',
                    chunkId: chunk.id
                });
            }
        }

        // Sort by similarity (highest first) and limit results
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, maxResults);
    }

    /**
     * Search user bundles index
     * @param {Array} queryEmbedding - Query embedding vector
     * @param {number} maxResults - Maximum number of results
     * @param {number} threshold - Similarity threshold
     * @returns {Array} Search results
     */
    function searchUserBundlesIndex(queryEmbedding, maxResults = 5, threshold = 0.3) {
        if (!userBundlesIndex || !userBundlesIndex.bundles) {
            console.log('VectorRAGService: No user bundles index available');
            return [];
        }

        const results = [];

        for (const bundle of userBundlesIndex.bundles) {
            if (!bundle.chunks || !Array.isArray(bundle.chunks)) {
                continue;
            }

            for (const chunk of bundle.chunks) {
                if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
                    continue;
                }

                const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
                
                if (similarity >= threshold) {
                    results.push({
                        content: chunk.content,
                        similarity: similarity,
                        metadata: chunk.metadata,
                        source: 'user_bundles',
                        type: 'user_document',
                        bundleName: bundle.name || 'Unknown Bundle',
                        fileName: chunk.metadata?.file || 'Unknown File',
                        chunkId: chunk.id
                    });
                }
            }
        }

        // Sort by similarity (highest first) and limit results
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, maxResults);
    }

    /**
     * Search EU documents index
     * @param {Array} queryEmbedding - Query embedding vector
     * @param {number} maxResults - Maximum number of results
     * @param {number} threshold - Similarity threshold
     * @returns {Array} Search results
     */
    function searchEUDocumentsIndex(queryEmbedding, maxResults = 5, threshold = 0.3) {
        let euDocuments = null;
        try {
            const euDocsData = localStorage.getItem('ragEUDocuments');
            if (euDocsData) {
                euDocuments = JSON.parse(euDocsData);
            }
        } catch (error) {
            console.warn('VectorRAGService: Error reading EU documents for search:', error);
            return [];
        }

        if (!euDocuments || typeof euDocuments !== 'object') {
            console.log('VectorRAGService: No EU documents index available');
            return [];
        }

        const results = [];

        for (const [docId, document] of Object.entries(euDocuments)) {
            if (!document.chunks || !Array.isArray(document.chunks)) {
                continue;
            }

            for (const chunk of document.chunks) {
                if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
                    continue;
                }

                const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
                
                if (similarity >= threshold) {
                    results.push({
                        content: chunk.content,
                        similarity: similarity,
                        metadata: chunk.metadata || {},
                        source: 'eu_documents',
                        type: 'regulation',
                        documentName: document.name || docId,
                        documentId: docId,
                        chunkId: chunk.id
                    });
                }
            }
        }

        // Sort by similarity (highest first) and limit results
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, maxResults);
    }

    /**
     * Text-based fallback search when no embeddings are available
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum number of results
     * @returns {Array} Search results
     */
    function textBasedSearch(query, maxResults = 5) {
        const results = [];
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        
        if (queryWords.length === 0) {
            return results;
        }

        // Search default prompts
        if (defaultPromptsIndex && defaultPromptsIndex.chunks) {
            for (const chunk of defaultPromptsIndex.chunks) {
                const content = chunk.content.toLowerCase();
                let matches = 0;
                
                for (const word of queryWords) {
                    if (content.includes(word)) {
                        matches++;
                    }
                }
                
                if (matches > 0) {
                    const similarity = matches / queryWords.length;
                    results.push({
                        content: chunk.content,
                        similarity: similarity,
                        metadata: chunk.metadata,
                        source: 'default_prompts',
                        type: 'default_prompt',
                        promptName: chunk.metadata?.promptName || 'Unknown',
                        chunkId: chunk.id,
                        searchType: 'text_based'
                    });
                }
            }
        }

        // Search user bundles
        if (userBundlesIndex && userBundlesIndex.bundles) {
            for (const bundle of userBundlesIndex.bundles) {
                if (!bundle.chunks || !Array.isArray(bundle.chunks)) {
                    continue;
                }

                for (const chunk of bundle.chunks) {
                    const content = chunk.content.toLowerCase();
                    let matches = 0;
                    
                    for (const word of queryWords) {
                        if (content.includes(word)) {
                            matches++;
                        }
                    }
                    
                    if (matches > 0) {
                        const similarity = matches / queryWords.length;
                        results.push({
                            content: chunk.content,
                            similarity: similarity,
                            metadata: chunk.metadata,
                            source: 'user_bundles',
                            type: 'user_document',
                            bundleName: bundle.name || 'Unknown Bundle',
                            fileName: chunk.metadata?.file || 'Unknown File',
                            chunkId: chunk.id,
                            searchType: 'text_based'
                        });
                    }
                }
            }
        }

        // Search EU documents
        let euDocuments = null;
        try {
            const euDocsData = localStorage.getItem('ragEUDocuments');
            if (euDocsData) {
                euDocuments = JSON.parse(euDocsData);
            }
        } catch (error) {
            console.warn('VectorRAGService: Error reading EU documents for text search:', error);
        }

        if (euDocuments && typeof euDocuments === 'object') {
            for (const [docId, document] of Object.entries(euDocuments)) {
                if (!document.chunks || !Array.isArray(document.chunks)) {
                    continue;
                }

                for (const chunk of document.chunks) {
                    const content = chunk.content.toLowerCase();
                    let matches = 0;
                    
                    for (const word of queryWords) {
                        if (content.includes(word)) {
                            matches++;
                        }
                    }
                    
                    if (matches > 0) {
                        const similarity = matches / queryWords.length;
                        results.push({
                            content: chunk.content,
                            similarity: similarity,
                            metadata: chunk.metadata || {},
                            source: 'eu_documents',
                            type: 'regulation',
                            documentName: document.name || docId,
                            documentId: docId,
                            chunkId: chunk.id,
                            searchType: 'text_based'
                        });
                    }
                }
            }
        }

        // Sort by similarity and limit results
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, maxResults);
    }

    /**
     * Perform comprehensive search across all available indexes
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results with metadata
     */
    async function search(query, options = {}) {
        initialize();

        const {
            maxResults = ragSettings?.maxResults || 5,
            threshold = ragSettings?.similarityThreshold || 0.3,
            useTextFallback = true,
            apiKey = null,
            baseUrl = null,
            embeddingModel = ragSettings?.embeddingModel || 'text-embedding-3-small'
        } = options;

        if (!query || typeof query !== 'string') {
            throw new Error('Invalid search query provided');
        }

        // Debug logging
        if (window.DebugService) {
            window.DebugService.debugLog('rag', `Starting search for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
            window.DebugService.debugLog('rag', `Search parameters: maxResults=${maxResults}, threshold=${threshold}, embeddingModel=${embeddingModel}`);
        }

        console.log(`VectorRAGService: Searching for: "${query}"`);

        let results = [];
        let searchType = 'none';
        let error = null;

        try {
            // Try vector search first if we have API key
            if (apiKey && baseUrl) {
                try {
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', 'Generating query embedding via API...');
                    }
                    
                    const queryEmbedding = await generateQueryEmbedding(query, apiKey, baseUrl, embeddingModel);
                    
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', `Query embedding generated successfully (${queryEmbedding.length} dimensions)`);
                    }
                    
                    // Search all indexes
                    const defaultResults = searchDefaultPromptsIndex(queryEmbedding, maxResults, threshold);
                    const userResults = searchUserBundlesIndex(queryEmbedding, maxResults, threshold);
                    const euResults = searchEUDocumentsIndex(queryEmbedding, maxResults, threshold);
                    
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', `Default prompts search: ${defaultResults.length} matches`);
                        window.DebugService.debugLog('rag', `User bundles search: ${userResults.length} matches`);
                        window.DebugService.debugLog('rag', `EU documents search: ${euResults.length} matches`);
                    }
                    
                    // Combine and re-rank results
                    results = [...defaultResults, ...userResults, ...euResults];
                    results.sort((a, b) => b.similarity - a.similarity);
                    results = results.slice(0, maxResults);
                    
                    searchType = 'vector';
                    
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', `Vector search completed: ${results.length} final results`);
                        if (results.length > 0) {
                            const topResult = results[0];
                            window.DebugService.debugLog('rag', `Top result: ${(topResult.similarity * 100).toFixed(1)}% similarity from ${topResult.source}`);
                        }
                    }
                    
                    console.log(`VectorRAGService: Vector search found ${results.length} results`);
                    
                } catch (vectorError) {
                    console.warn('VectorRAGService: Vector search failed, falling back to text search:', vectorError);
                    error = vectorError.message;
                    
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', `Vector search failed: ${vectorError.message}. Using text fallback...`);
                    }
                    
                    if (useTextFallback) {
                        results = textBasedSearch(query, maxResults);
                        searchType = 'text_fallback';
                        
                        if (window.DebugService) {
                            window.DebugService.debugLog('rag', `Text fallback search found ${results.length} results`);
                        }
                    }
                }
            } else {
                // Use text-based search as fallback
                if (useTextFallback) {
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', 'No API key available - using text-based search only');
                    }
                    
                    results = textBasedSearch(query, maxResults);
                    searchType = 'text_only';
                    
                    if (window.DebugService) {
                        window.DebugService.debugLog('rag', `Text-based search found ${results.length} results`);
                    }
                    
                    console.log(`VectorRAGService: Text-based search found ${results.length} results`);
                }
            }

        } catch (searchError) {
            console.error('VectorRAGService: Search failed:', searchError);
            error = searchError.message;
            
            if (window.DebugService) {
                window.DebugService.debugLog('rag', `Search failed with error: ${searchError.message}`);
            }
        }

        // Final debug summary
        if (window.DebugService) {
            window.DebugService.debugLog('rag', `Search summary: ${results.length} results found using ${searchType} search`);
            if (results.length > 0) {
                const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
                window.DebugService.debugLog('rag', `Average similarity score: ${(avgSimilarity * 100).toFixed(1)}%`);
            }
        }

        return {
            query: query,
            results: results,
            metadata: {
                searchType: searchType,
                totalResults: results.length,
                maxResults: maxResults,
                threshold: threshold,
                timestamp: new Date().toISOString(),
                error: error
            }
        };
    }

    /**
     * Format search results for context injection
     * @param {Array} results - Search results
     * @param {number} maxLength - Maximum total length for context
     * @returns {string} Formatted context string
     */
    function formatResultsForContext(results, maxLength = 2000) {
        if (!results || results.length === 0) {
            return '';
        }

        let context = '## Relevant Knowledge Base Content\n\n';
        let currentLength = context.length;

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const resultText = `**Source: ${result.promptName || result.fileName || 'Unknown'}** (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n${result.content}\n\n`;
            
            if (currentLength + resultText.length > maxLength) {
                // If this is the first result and it's too long, truncate it
                if (i === 0) {
                    const remaining = maxLength - currentLength - 50; // Leave some margin
                    if (remaining > 100) {
                        const truncated = result.content.substring(0, remaining) + '...';
                        context += `**Source: ${result.promptName || result.fileName || 'Unknown'}** (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n${truncated}\n\n`;
                    }
                }
                break;
            }
            
            context += resultText;
            currentLength += resultText.length;
        }

        context += '---\n\n';
        return context;
    }

    /**
     * Get available indexes statistics
     * @returns {Object} Statistics about available indexes
     */
    function getIndexStats() {
        initialize();

        // Check for EU documents in localStorage
        let euDocuments = null;
        let euDocumentsChunks = 0;
        let euDocumentsCount = 0;
        try {
            const euDocsData = localStorage.getItem('ragEUDocuments');
            if (euDocsData) {
                euDocuments = JSON.parse(euDocsData);
                if (euDocuments && typeof euDocuments === 'object') {
                    euDocumentsCount = Object.keys(euDocuments).length;
                    // Count total chunks in EU documents
                    Object.values(euDocuments).forEach(doc => {
                        if (doc && doc.chunks && Array.isArray(doc.chunks)) {
                            euDocumentsChunks += doc.chunks.length;
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('VectorRAGService: Error reading EU documents:', error);
        }

        const stats = {
            defaultPrompts: {
                available: !!defaultPromptsIndex,
                chunks: defaultPromptsIndex?.chunks?.length || 0,
                prompts: defaultPromptsIndex?.metadata?.totalPrompts || 0,
                lastUpdated: defaultPromptsIndex?.metadata?.createdAt || null
            },
            userBundles: {
                available: !!userBundlesIndex,
                bundles: userBundlesIndex?.bundles?.length || 0,
                totalChunks: 0,
                lastUpdated: userBundlesIndex?.savedAt || null
            },
            euDocuments: {
                available: euDocumentsCount > 0,
                documents: euDocumentsCount,
                chunks: euDocumentsChunks,
                lastUpdated: euDocuments ? Object.values(euDocuments).map(doc => doc.lastIndexed).filter(Boolean).sort().pop() : null
            },
            settings: ragSettings
        };

        // Count total chunks in user bundles
        if (userBundlesIndex && userBundlesIndex.bundles) {
            for (const bundle of userBundlesIndex.bundles) {
                if (bundle.chunks && Array.isArray(bundle.chunks)) {
                    stats.userBundles.totalChunks += bundle.chunks.length;
                }
            }
        }

        return stats;
    }

    /**
     * Reload indexes from storage
     */
    function reloadIndexes() {
        console.log('VectorRAGService: Reloading indexes from storage');
        defaultPromptsIndex = RAGStorageService.loadDefaultPromptsIndex();
        userBundlesIndex = RAGStorageService.loadUserBundlesIndex();
        ragSettings = RAGStorageService.loadRAGSettings();
    }

    /**
     * Set default prompts index
     * @param {Object} indexData - Index data
     */
    function setDefaultPromptsIndex(indexData) {
        defaultPromptsIndex = indexData;
        RAGStorageService.saveDefaultPromptsIndex(indexData);
        console.log('VectorRAGService: Default prompts index updated');
    }

    /**
     * Set user bundles index
     * @param {Object} bundlesData - Bundles data
     */
    function setUserBundlesIndex(bundlesData) {
        userBundlesIndex = bundlesData;
        RAGStorageService.saveUserBundlesIndex(bundlesData);
        console.log('VectorRAGService: User bundles index updated');
    }

    /**
     * Update RAG settings
     * @param {Object} newSettings - New settings
     */
    function updateSettings(newSettings) {
        ragSettings = { ...ragSettings, ...newSettings };
        RAGStorageService.saveRAGSettings(ragSettings);
        console.log('VectorRAGService: Settings updated');
    }

    // Public API
    return {
        initialize,
        search,
        formatResultsForContext,
        getIndexStats,
        reloadIndexes,
        setDefaultPromptsIndex,
        setUserBundlesIndex,
        updateSettings,
        
        // Utility functions
        cosineSimilarity,
        generateQueryEmbedding,
        textBasedSearch
    };
})();