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
            
            // Add all results with positive similarity for token-based selection
            if (similarity > 0) {
                results.push({
                    content: chunk.content,
                    similarity: similarity,
                    embedding: chunk.embedding,  // Include embedding for multi-query ranking
                    metadata: chunk.metadata,
                    source: 'default_prompts',
                    type: chunk.metadata?.type || 'default_prompt',
                    promptName: chunk.metadata?.promptName || 'Unknown',
                    chunkId: chunk.id
                });
            }
        }

        // Sort by similarity (highest first)
        results.sort((a, b) => b.similarity - a.similarity);
        // Return more results for token-based selection
        return results.slice(0, Math.max(maxResults * 3, 50));
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
            // Handle new reference format for EU documents
            if (bundle.indexReference && bundle.type === 'regulation') {
                // This is a reference to EU documents index
                // The actual vectors are stored in rag_eu_documents_index
                // Skip here as they'll be searched via searchEUDocumentsIndex
                console.log(`VectorRAGService: Bundle ${bundle.id} is a reference to EU documents, skipping in user bundles search`);
                continue;
            }
            
            // Handle traditional bundles with embedded chunks
            if (!bundle.chunks || !Array.isArray(bundle.chunks)) {
                continue;
            }

            for (const chunk of bundle.chunks) {
                if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
                    continue;
                }

                const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
                
                // Add all results with positive similarity for token-based selection
                if (similarity > 0) {
                    results.push({
                        content: chunk.content,
                        similarity: similarity,
                        embedding: chunk.embedding,  // Include embedding for multi-query ranking
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

        // Sort by similarity (highest first)
        results.sort((a, b) => b.similarity - a.similarity);
        // Return more results for token-based selection
        return results.slice(0, Math.max(maxResults * 3, 50));
    }

    /**
     * Get document content by ID
     * @param {string} docId - Document ID ('aia', 'cra', 'dora')
     * @returns {string|null} Document content or null if not found
     */
    function getDocumentContent(docId) {
        // Try to get from rag-coordinator functions first
        if (window.RAGCoordinator) {
            if (docId === 'aia' && window.RAGCoordinator.getAIADocumentContent) {
                return window.RAGCoordinator.getAIADocumentContent();
            } else if (docId === 'cra' && window.RAGCoordinator.getCRADocumentContent) {
                return window.RAGCoordinator.getCRADocumentContent();
            } else if (docId === 'dora' && window.RAGCoordinator.getDORADocumentContent) {
                return window.RAGCoordinator.getDORADocumentContent();
            }
        }
        
        // Fallback to regulations service
        if (window.ragRegulationsService) {
            const content = window.ragRegulationsService.getRegulationContent(docId);
            if (content) return content;
        }
        
        return null;
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
            euDocuments = CoreStorageService.getValue('rag_eu_documents_index');
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
            // Check if document is enabled for search
            if (document.enabled === false) {
                console.log(`VectorRAGService: Document ${docId} is disabled for search`);
                continue;
            }
            
            // Get vectors from in-memory store
            let items = null;
            
            // Check if vectors are in memory (new approach)
            if (window.ragVectorStore && window.ragVectorStore.hasVectors(docId)) {
                items = window.ragVectorStore.getVectors(docId);
                if (items && items.length > 0) {
                    console.log(`VectorRAGService: Using ${items.length} vectors for ${docId} from memory`);
                } else {
                    console.log(`VectorRAGService: No vectors found for ${docId} in memory`);
                    continue;
                }
            } else {
                console.log(`VectorRAGService: Document ${docId} not indexed in memory`);
                continue;
            }
            
            if (!items || !Array.isArray(items)) {
                continue;
            }
            
            for (const item of items) {
                if (!item.embedding || !Array.isArray(item.embedding)) {
                    continue;
                }

                const similarity = cosineSimilarity(queryEmbedding, item.embedding);
                
                // Always add results with their similarity score (don't filter by threshold here)
                // The selectChunksWithGapFilling will handle prioritization and token limits
                if (similarity > 0) {
                    // Always retrieve content from source document using positions
                    let content = '';
                    if (item.position) {
                        const documentContent = getDocumentContent(docId);
                        if (documentContent) {
                            content = documentContent.substring(item.position.start, item.position.end);
                        } else {
                            console.warn(`VectorRAGService: Could not retrieve content for ${docId}`);
                            continue;
                        }
                    } else {
                        console.warn(`VectorRAGService: Vector has no position data for ${docId}`);
                        continue;
                    }
                    
                    results.push({
                        content: content,
                        similarity: similarity,
                        embedding: item.embedding,  // Include embedding for multi-query ranking
                        metadata: item.metadata || {},
                        source: 'eu_documents',
                        type: 'regulation',
                        documentName: document.name || docId,
                        documentId: docId,
                        vectorId: item.id,
                        position: item.position  // Include position for debugging
                    });
                }
            }
        }

        // Sort by similarity (highest first)
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Count how many are above threshold for logging
        const aboveThreshold = results.filter(r => r.similarity >= threshold).length;
        console.log(`VectorRAGService: EU docs search found ${results.length} total results (${aboveThreshold} above threshold ${threshold})`);
        
        // Direct debug output for testing
        if (results.length > 0) {
            console.log(`VectorRAGService: Top 3 EU doc matches before returning:`);
            results.slice(0, 3).forEach((r, i) => {
                console.log(`  ${i+1}. similarity=${(r.similarity * 100).toFixed(2)}% | ${r.content.substring(0, 50)}...`);
            });
        }
        
        // Debug: Show top matches with their cosine similarity scores
        if (window.DebugService && results.length > 0) {
            window.DebugService.debugLog('rag', `Top EU document matches (cosine similarity):`);
            const topMatches = results.slice(0, 5); // Show top 5
            topMatches.forEach((result, index) => {
                const preview = result.content.substring(0, 100).replace(/\n/g, ' ');
                window.DebugService.debugLog('rag', `  ${index + 1}. Score: ${(result.similarity * 100).toFixed(2)}% | Chunk: "${preview}..."`);
            });
            
        }
        
        // Show the closest match even if none found above threshold
        if (window.DebugService && results.length === 0 && items.length > 0) {
            // Find the best match regardless of threshold
            let bestMatch = null;
            let bestScore = 0;
            for (const item of items) {
                if (!item.embedding || !Array.isArray(item.embedding)) {
                    continue;
                }
                const similarity = cosineSimilarity(queryEmbedding, item.embedding);
                if (similarity > bestScore) {
                    bestScore = similarity;
                    bestMatch = item;
                }
            }
            if (bestMatch) {
                const documentContent = getDocumentContent(docId);
                if (documentContent) {
                    const content = documentContent.substring(bestMatch.position.start, bestMatch.position.end);
                    const preview = content.substring(0, 100).replace(/\n/g, ' ');
                    window.DebugService.debugLog('rag', `⚠️ No matches above threshold (${(threshold * 100).toFixed(0)}%)`);
                    window.DebugService.debugLog('rag', `Closest EU doc match: Score: ${(bestScore * 100).toFixed(2)}% | "${preview}..."`);
                    window.DebugService.debugLog('rag', `Tip: This score is below threshold. Consider lowering threshold or using different search terms.`);
                }
            }
        }
        
        // Return more results than maxResults to give selectChunksWithGapFilling more options
        // It will handle the final selection based on token limits
        return results.slice(0, Math.max(maxResults * 3, 50));
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
                // Skip references to EU documents (they're searched separately)
                if (bundle.indexReference && bundle.type === 'regulation') {
                    continue;
                }
                
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

        // Text-based search for EU documents (only if they don't have embeddings)
        let euDocuments = null;
        try {
            euDocuments = CoreStorageService.getValue('rag_eu_documents_index');
        } catch (error) {
            console.warn('VectorRAGService: Error reading EU documents for text search:', error);
        }

        if (euDocuments && typeof euDocuments === 'object') {
            for (const [docId, document] of Object.entries(euDocuments)) {
                // Skip documents with vectors (they should use vector search)
                if (document.vectorsKey) {
                    console.log(`VectorRAGService: Skipping ${docId} in text search - has vectors`);
                    continue;
                }
                
                // For text-based search, get the document content directly
                const documentContent = getDocumentContent(docId);
                if (!documentContent) {
                    continue;
                }
                
                const content = documentContent.toLowerCase();
                let matches = 0;
                
                for (const word of queryWords) {
                    if (content.includes(word)) {
                        matches++;
                    }
                }
                
                if (matches > 0) {
                    const similarity = matches / queryWords.length;
                    // Return a snippet around the first match
                    const firstMatch = queryWords.find(word => content.includes(word));
                    const matchIndex = content.indexOf(firstMatch);
                    const snippetStart = Math.max(0, matchIndex - 200);
                    const snippetEnd = Math.min(documentContent.length, matchIndex + 200);
                    
                    results.push({
                        content: documentContent.substring(snippetStart, snippetEnd),
                        similarity: similarity,
                        metadata: document.metadata || {},
                        source: 'eu_documents',
                        type: 'regulation',
                        documentName: document.name || docId,
                        documentId: docId,
                        searchType: 'text_based'
                    });
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
            maxResults = ragSettings?.maxResults || 50,  // Increased to get more candidates for token-based selection
            tokenLimit = 5000,  // Token limit for context
            threshold = ragSettings?.similarityThreshold || 0.3,
            useTextFallback = true,
            apiKey = null,
            baseUrl = null,
            embeddingModel = ragSettings?.embeddingModel || 'text-embedding-3-small',
            useMultiQuery = false,
            expansionModel = 'gpt-4o-mini'
        } = options;

        if (!query || typeof query !== 'string') {
            throw new Error('Invalid search query provided');
        }

        // Debug logging
        if (window.DebugService) {
            window.DebugService.debugLog('rag', `Starting search for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
            window.DebugService.debugLog('rag', `Search parameters: maxResults=${maxResults}, threshold=${threshold}, tokenLimit=${tokenLimit}, embeddingModel=${embeddingModel}`);
        }

        console.log(`VectorRAGService: Searching for: "${query}"`);

        let results = [];
        let searchType = 'none';
        let error = null;

        try {
            // Try vector search first if we have API key
            if (apiKey && baseUrl) {
                try {
                    let allResults = [];
                    
                    if (useMultiQuery && window.RAGQueryExpansionService) {
                        // Multi-query search path
                        if (window.DebugService) {
                            window.DebugService.debugLog('rag', 'Using multi-query search...');
                        }
                        
                        // Expand query into multiple search terms
                        const searchTerms = await window.RAGQueryExpansionService.expandQuery(
                            query, 
                            expansionModel, 
                            apiKey, 
                            baseUrl
                        );
                        
                        console.log(`VectorRAGService: Expanded to ${searchTerms.length} search terms:`, searchTerms);
                        
                        // Generate embeddings for all search terms
                        const queryEmbeddings = await window.RAGQueryExpansionService.generateMultipleEmbeddings(
                            searchTerms,
                            apiKey,
                            baseUrl,
                            embeddingModel
                        );
                        
                        if (queryEmbeddings.length > 0) {
                            // Search with the first (primary) embedding to get candidates
                            const primaryEmbedding = queryEmbeddings[0].embedding;
                            
                            // Get more results for multi-query ranking
                            const expandedMaxResults = maxResults * 2;
                            const defaultResults = searchDefaultPromptsIndex(primaryEmbedding, expandedMaxResults, threshold * 0.8);
                            const userResults = searchUserBundlesIndex(primaryEmbedding, expandedMaxResults, threshold * 0.8);
                            const euResults = searchEUDocumentsIndex(primaryEmbedding, expandedMaxResults, threshold * 0.8);
                            
                            // Combine all results
                            allResults = [...defaultResults, ...userResults, ...euResults];
                            
                            // Rank using all query embeddings
                            allResults = window.RAGQueryExpansionService.rankChunksWithMultipleQueries(
                                allResults,
                                queryEmbeddings,
                                'weighted'
                            );
                            
                            if (window.DebugService) {
                                window.DebugService.debugLog('rag', `Multi-query search found ${allResults.length} candidates`);
                            }
                            
                            // Debug: Check similarity scores after ranking
                            console.log(`VectorRAGService: After multi-query ranking, top 3 results:`);
                            allResults.slice(0, 3).forEach((r, i) => {
                                console.log(`  ${i+1}. similarity=${r.similarity ? (r.similarity * 100).toFixed(2) : 'undefined'}% | multiQueryScore=${r.multiQueryScore ? (r.multiQueryScore * 100).toFixed(2) : 'undefined'}%`);
                            });
                            
                            // Sort by similarity after multi-query ranking
                            allResults.sort((a, b) => b.similarity - a.similarity);
                            
                        } else {
                            // Fallback to single query if expansion failed
                            console.warn('VectorRAGService: Multi-query expansion failed, using single query');
                            const queryEmbedding = await generateQueryEmbedding(query, apiKey, baseUrl, embeddingModel);
                            const defaultResults = searchDefaultPromptsIndex(queryEmbedding, maxResults, threshold);
                            const userResults = searchUserBundlesIndex(queryEmbedding, maxResults, threshold);
                            const euResults = searchEUDocumentsIndex(queryEmbedding, maxResults, threshold);
                            allResults = [...defaultResults, ...userResults, ...euResults];
                        }
                        
                    } else {
                        // Single query search (original behavior)
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
                        allResults = [...defaultResults, ...userResults, ...euResults];
                    }
                    
                    // Sort results by similarity
                    allResults.sort((a, b) => b.similarity - a.similarity);
                    
                    // Apply smart chunk selection with gap-filling
                    // Pass the threshold for logging/debugging purposes
                    results = selectChunksWithGapFilling(allResults, tokenLimit, threshold);
                    
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

        // Final debug summary with top overall matches
        if (window.DebugService) {
            window.DebugService.debugLog('rag', `Search summary: ${results.length} results found using ${searchType} search`);
            if (results.length > 0) {
                const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
                const gapFilledCount = results.filter(r => r.isGapFiller).length;
                const estimateTokens = (text) => Math.ceil(text.length / 4);
                const totalTokens = results.reduce((sum, r) => sum + estimateTokens(r.content || ''), 0);
                
                window.DebugService.debugLog('rag', `Average similarity score: ${(avgSimilarity * 100).toFixed(1)}%`);
                window.DebugService.debugLog('rag', `Results: ${results.length} chunks (${gapFilledCount} gap-fillers) | ~${totalTokens} tokens total`);
                
                // Generate chunk hit pattern for EU documents
                const euChunks = results.filter(r => r.source === 'eu_documents');
                if (euChunks.length > 0) {
                    // Group chunks by document
                    const chunksByDoc = {};
                    euChunks.forEach(chunk => {
                        const docId = chunk.documentId || 'unknown';
                        if (!chunksByDoc[docId]) {
                            chunksByDoc[docId] = [];
                        }
                        // Extract chunk number from vectorId (e.g., "aia_chunk_5" -> 5)
                        const match = chunk.vectorId?.match(/_chunk_(\d+)$/);
                        if (match) {
                            chunksByDoc[docId].push(parseInt(match[1]));
                        }
                    });
                    
                    // Format chunk patterns for each document
                    Object.keys(chunksByDoc).forEach(docId => {
                        const chunks = chunksByDoc[docId].sort((a, b) => a - b);
                        const pattern = formatChunkPattern(chunks);
                        window.DebugService.debugLog('rag', `EU Document ${docId.toUpperCase()} chunks: ${pattern}`);
                    });
                }
                
                // Show top overall matches across all sources
                window.DebugService.debugLog('rag', `Top overall matches (all sources):`);
                const topOverall = results.slice(0, 5);
                topOverall.forEach((result, index) => {
                    const source = result.documentName || result.bundleName || result.promptName || 'Unknown';
                    const preview = result.content.substring(0, 80).replace(/\n/g, ' ');
                    const gapMarker = result.isGapFiller ? ' [GAP-FILLER]' : '';
                    window.DebugService.debugLog('rag', `  ${index + 1}. [${source}] Score: ${(result.similarity * 100).toFixed(2)}%${gapMarker} | "${preview}..."`);
                });
            } else {
                window.DebugService.debugLog('rag', `No matches found above threshold ${threshold}. Try lowering threshold or using different search terms.`);
            }
        }
        
        /**
         * Format chunk numbers into pattern like "1, 4, 7-9, 12-15, 18"
         * @param {Array<number>} chunks - Array of chunk numbers
         * @returns {string} Formatted pattern
         */
        function formatChunkPattern(chunks) {
            if (!chunks || chunks.length === 0) return 'none';
            
            const ranges = [];
            let start = chunks[0];
            let end = chunks[0];
            
            for (let i = 1; i <= chunks.length; i++) {
                if (i < chunks.length && chunks[i] === end + 1) {
                    // Continue the range
                    end = chunks[i];
                } else {
                    // End of range
                    if (start === end) {
                        ranges.push(start.toString());
                    } else if (end === start + 1) {
                        // Two consecutive numbers - show both
                        ranges.push(`${start}, ${end}`);
                    } else {
                        // Range of 3 or more
                        ranges.push(`${start}-${end}`);
                    }
                    
                    // Start new range
                    if (i < chunks.length) {
                        start = chunks[i];
                        end = chunks[i];
                    }
                }
            }
            
            return ranges.join(', ');
        }

        return {
            query: query,
            results: results,
            metadata: {
                searchType: searchType,
                totalResults: results.length,
                tokenLimit: tokenLimit,
                threshold: threshold,
                timestamp: new Date().toISOString(),
                error: error,
                gapFilledChunks: results.filter(r => r.isGapFiller).length
            }
        };
    }

    /**
     * Smart chunk selection with gap-filling for coherence
     * @param {Array} results - All search results sorted by similarity
     * @param {number} maxTokens - Maximum number of tokens to include
     * @param {number} threshold - Similarity threshold (optional, for logging)
     * @returns {Array} Selected and gap-filled results
     */
    function selectChunksWithGapFilling(results, maxTokens = 5000, threshold = 0.3) {
        if (!results || results.length === 0) {
            return [];
        }

        // Rough token estimation (1 token ≈ 4 characters)
        const estimateTokens = (text) => Math.ceil(text.length / 4);
        
        const selected = [];
        const selectedIndices = new Set();
        let currentTokens = 0;
        
        // First pass: select chunks by similarity until token limit
        // Fill up to the token limit regardless of threshold
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const tokens = estimateTokens(result.content || '');
            
            if (currentTokens + tokens <= maxTokens) {
                selected.push(result);
                selectedIndices.add(i);
                currentTokens += tokens;
            } else if (selected.length === 0 && tokens > maxTokens) {
                // If first chunk is too large, truncate it
                const truncateLength = Math.floor(maxTokens * 4 * 0.9); // Leave 10% margin
                result.content = result.content.substring(0, truncateLength) + '...';
                result.truncated = true;
                selected.push(result);
                break;
            } else if (currentTokens < maxTokens * 0.8) {
                // If we haven't used 80% of the token budget, try to fit a truncated version
                const remainingTokens = maxTokens - currentTokens;
                const truncateLength = Math.floor(remainingTokens * 4 * 0.9);
                if (truncateLength > 200) { // Only include if we can get meaningful content
                    const truncatedResult = { ...result };
                    truncatedResult.content = result.content.substring(0, truncateLength) + '...';
                    truncatedResult.truncated = true;
                    selected.push(truncatedResult);
                    currentTokens += estimateTokens(truncatedResult.content);
                }
                break;
            } else {
                // Can't fit more chunks
                break;
            }
        }
        
        // Second pass: identify and fill gaps for coherence
        // Group selected chunks by document/source
        const chunksByDocument = {};
        selected.forEach((chunk, idx) => {
            const docId = chunk.documentId || chunk.source || 'unknown';
            if (!chunksByDocument[docId]) {
                chunksByDocument[docId] = [];
            }
            chunksByDocument[docId].push({
                chunk: chunk,
                originalIndex: Array.from(selectedIndices)[idx],
                vectorIndex: chunk.metadata?.vectorIndex || chunk.vectorId || idx
            });
        });
        
        // For each document, find gaps and fill them
        const gapFillers = [];
        Object.keys(chunksByDocument).forEach(docId => {
            const docChunks = chunksByDocument[docId];
            if (docChunks.length < 2) return; // Need at least 2 chunks to have gaps
            
            // Sort by vector index to find sequential gaps
            docChunks.sort((a, b) => {
                const aIdx = parseInt(a.vectorIndex) || 0;
                const bIdx = parseInt(b.vectorIndex) || 0;
                return aIdx - bIdx;
            });
            
            // Find one-gaps between selected chunks
            for (let i = 0; i < docChunks.length - 1; i++) {
                const currentIdx = parseInt(docChunks[i].vectorIndex) || 0;
                const nextIdx = parseInt(docChunks[i + 1].vectorIndex) || 0;
                
                if (nextIdx - currentIdx === 2) {
                    // Found a one-gap, find the missing chunk
                    const missingIdx = currentIdx + 1;
                    
                    // Look for the missing chunk in the original results
                    for (let j = 0; j < results.length; j++) {
                        if (selectedIndices.has(j)) continue; // Already selected
                        
                        const candidate = results[j];
                        const candidateDocId = candidate.documentId || candidate.source || 'unknown';
                        const candidateVectorIdx = parseInt(candidate.metadata?.vectorIndex || candidate.vectorId || -1);
                        
                        if (candidateDocId === docId && candidateVectorIdx === missingIdx) {
                            const tokens = estimateTokens(candidate.content || '');
                            
                            // Only add if we have token budget
                            if (currentTokens + tokens <= maxTokens) {
                                candidate.isGapFiller = true;
                                candidate.gapFillerReason = `Filling gap between chunks ${currentIdx} and ${nextIdx}`;
                                gapFillers.push(candidate);
                                currentTokens += tokens;
                                console.log(`VectorRAGService: Added gap-filler chunk ${missingIdx} for document ${docId}`);
                            }
                            break;
                        }
                    }
                }
            }
        });
        
        // Combine selected and gap-filler chunks
        const finalResults = [...selected, ...gapFillers];
        
        // Sort by document and vector index for coherent presentation
        finalResults.sort((a, b) => {
            const aDoc = a.documentId || a.source || 'unknown';
            const bDoc = b.documentId || b.source || 'unknown';
            
            if (aDoc !== bDoc) {
                return aDoc.localeCompare(bDoc);
            }
            
            const aIdx = parseInt(a.metadata?.vectorIndex || a.vectorId || 0);
            const bIdx = parseInt(b.metadata?.vectorIndex || b.vectorId || 0);
            return aIdx - bIdx;
        });
        
        // Add debug info about threshold distribution
        const aboveThreshold = finalResults.filter(r => r.similarity >= threshold).length;
        const belowThreshold = finalResults.length - aboveThreshold;
        
        console.log(`VectorRAGService: Selected ${selected.length} chunks + ${gapFillers.length} gap-fillers = ${finalResults.length} total chunks (≈${currentTokens} tokens)`);
        
        if (window.DebugService) {
            window.DebugService.debugLog('rag', `Token usage: ${currentTokens}/${maxTokens} (${Math.round(currentTokens/maxTokens*100)}% of limit)`);
            window.DebugService.debugLog('rag', `Chunks: ${aboveThreshold} above threshold (${threshold}), ${belowThreshold} below threshold`);
        }
        
        return finalResults;
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
            let sourceLabel = result.promptName || result.fileName || result.documentName || 'Unknown';
            
            if (result.isGapFiller) {
                sourceLabel += ' [Gap-filler]';
            }
            
            const resultText = `**Source: ${sourceLabel}** (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n${result.content}\n\n`;
            
            if (currentLength + resultText.length > maxLength) {
                // If this is the first result and it's too long, truncate it
                if (i === 0) {
                    const remaining = maxLength - currentLength - 50; // Leave some margin
                    if (remaining > 100) {
                        const truncated = result.content.substring(0, remaining) + '...';
                        context += `**Source: ${sourceLabel}** (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n${truncated}\n\n`;
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

        // Check for in-memory vectors first (from RAGCoordinator's vectorStore)
        let inMemoryVectorCount = 0;
        let inMemoryDocumentCount = 0;
        if (window.ragVectorStore) {
            const docIds = window.ragVectorStore.getDocumentIds();
            inMemoryDocumentCount = docIds.length;
            docIds.forEach(docId => {
                const vectors = window.ragVectorStore.getVectors(docId);
                if (vectors && vectors.length > 0) {
                    inMemoryVectorCount += vectors.length;
                }
            });
        }

        // Check for EU documents in localStorage (metadata only)
        let euDocuments = null;
        let euDocumentsChunks = 0;
        let euDocumentsCount = 0;
        try {
            euDocuments = CoreStorageService.getValue('rag_eu_documents_index');
            if (euDocuments && typeof euDocuments === 'object') {
                euDocumentsCount = Object.keys(euDocuments).length;
                // Count total chunks in EU documents
                Object.values(euDocuments).forEach(doc => {
                    if (doc && doc.chunks && Array.isArray(doc.chunks)) {
                        euDocumentsChunks += doc.chunks.length;
                    }
                });
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
                available: !!userBundlesIndex || inMemoryVectorCount > 0,
                bundles: userBundlesIndex?.bundles?.length || 0,
                totalChunks: inMemoryVectorCount,  // Use in-memory vector count
                lastUpdated: userBundlesIndex?.savedAt || null
            },
            euDocuments: {
                available: euDocumentsCount > 0 || inMemoryDocumentCount > 0,
                documents: Math.max(euDocumentsCount, inMemoryDocumentCount),
                chunks: Math.max(euDocumentsChunks, inMemoryVectorCount),
                lastUpdated: euDocuments ? Object.values(euDocuments).map(doc => doc.lastIndexed).filter(Boolean).sort().pop() : null
            },
            settings: ragSettings
        };

        // Add count from traditional user bundles if any
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
    /**
     * Get user bundles index
     * @returns {Object|null} Current user bundles index
     */
    function getUserBundlesIndex() {
        return userBundlesIndex;
    }

    return {
        initialize,
        search,
        formatResultsForContext,
        getIndexStats,
        reloadIndexes,
        setDefaultPromptsIndex,
        setUserBundlesIndex,
        getUserBundlesIndex,
        updateSettings,
        
        // Utility functions
        cosineSimilarity,
        generateQueryEmbedding,
        textBasedSearch,
        selectChunksWithGapFilling
    };
})();