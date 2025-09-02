/**
 * RAG Query Expansion Service
 * Derives multiple search terms from user questions for multi-vector RAG search
 */

window.RAGQueryExpansionService = (function() {
    
    // Cache for expanded queries and their embeddings
    const queryCache = new Map();
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    
    /**
     * Expand a user query into multiple search terms
     * @param {string} userQuery - The original user question
     * @param {string} model - Model to use for expansion
     * @param {string} apiKey - API key
     * @param {string} baseUrl - API base URL
     * @returns {Promise<Array>} Array of search terms/phrases
     */
    async function expandQuery(userQuery, model = 'gpt-5-nano', apiKey, baseUrl = 'https://api.openai.com/v1') {
        if (!userQuery || !apiKey) {
            throw new Error('Query and API key are required');
        }
        
        // Check cache first
        const cacheKey = `${userQuery}_${model}`;
        const cached = queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('RAGQueryExpansionService: Using cached expansion');
            return cached.terms;
        }
        
        const systemPrompt = `You are a search query expansion expert. Given a user question, derive up to 10 relevant search terms or phrases that would help find information to answer the question.

Output ONLY a bullet list of search terms, one per line, starting with "- ".
Include:
1. Key concepts from the question
2. Related technical terms
3. Synonyms and variations
4. Broader and narrower terms
5. Domain-specific terminology

Be concise - each term should be 1-4 words.`;

        const userPrompt = `Question: ${userQuery}

Generate search terms:`;

        try {
            // Build request body with correct max tokens parameter for the model
            const baseBody = {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3
            };
            
            // Use ModelCompatibility utility to set correct parameter
            const requestBody = window.ModelCompatibility ? 
                window.ModelCompatibility.buildRequestBodyWithMaxTokens(baseBody, model, 200) :
                { ...baseBody, max_tokens: 200 }; // Fallback if utility not loaded
            
            let response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            
            // Handle max_tokens parameter error with retry
            if (!response.ok && response.status === 400) {
                const errorData = await response.json();
                
                if (window.ModelCompatibility && 
                    window.ModelCompatibility.isMaxTokensParameterError(errorData)) {
                    
                    console.warn('RAGQueryExpansionService: Retrying with max_completion_tokens');
                    
                    // Rebuild request with max_completion_tokens
                    const updatedBody = window.ModelCompatibility.handleMaxTokensError(errorData, requestBody);
                    
                    if (updatedBody) {
                        // Retry with updated body
                        response = await fetch(`${baseUrl}/chat/completions`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify(updatedBody)
                        });
                    }
                }
            }
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            const content = data.choices[0]?.message?.content || '';
            
            // Parse bullet list
            const terms = content.split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.trim().substring(1).trim())
                .filter(term => term.length > 0)
                .slice(0, 10); // Max 10 terms
            
            // Add the original query as the first term if not already included
            const normalizedTerms = terms.map(t => t.toLowerCase());
            if (!normalizedTerms.some(t => t === userQuery.toLowerCase())) {
                terms.unshift(userQuery);
            }
            
            // Cache the result
            queryCache.set(cacheKey, {
                terms: terms,
                timestamp: Date.now()
            });
            
            console.log(`RAGQueryExpansionService: Expanded query into ${terms.length} search terms`);
            return terms;
            
        } catch (error) {
            console.error('RAGQueryExpansionService: Expansion failed:', error);
            // Fallback to original query
            return [userQuery];
        }
    }
    
    /**
     * Generate embeddings for multiple search terms
     * @param {Array} searchTerms - Array of search terms
     * @param {string} apiKey - API key
     * @param {string} baseUrl - API base URL
     * @param {string} embeddingModel - Embedding model to use
     * @returns {Promise<Array>} Array of {term, embedding} objects
     */
    async function generateMultipleEmbeddings(searchTerms, apiKey, baseUrl, embeddingModel = 'text-embedding-3-small') {
        if (!searchTerms || searchTerms.length === 0) {
            return [];
        }
        
        const embeddings = [];
        
        // Check cache for each term
        const uncachedTerms = [];
        const cachedEmbeddings = new Map();
        
        for (const term of searchTerms) {
            const cacheKey = `emb_${term}_${embeddingModel}`;
            const cached = queryCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                cachedEmbeddings.set(term, cached.embedding);
            } else {
                uncachedTerms.push(term);
            }
        }
        
        console.log(`RAGQueryExpansionService: ${cachedEmbeddings.size} cached, ${uncachedTerms.length} to generate`);
        
        // Generate embeddings for uncached terms in batches
        if (uncachedTerms.length > 0) {
            const BATCH_SIZE = 10; // Process up to 10 at once
            
            for (let i = 0; i < uncachedTerms.length; i += BATCH_SIZE) {
                const batch = uncachedTerms.slice(i, i + BATCH_SIZE);
                
                try {
                    const response = await fetch(`${baseUrl}/embeddings`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            input: batch,
                            model: embeddingModel
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Embedding API error: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Cache the new embeddings
                    for (let j = 0; j < batch.length; j++) {
                        const term = batch[j];
                        const embedding = data.data[j].embedding;
                        
                        const cacheKey = `emb_${term}_${embeddingModel}`;
                        queryCache.set(cacheKey, {
                            embedding: embedding,
                            timestamp: Date.now()
                        });
                        
                        cachedEmbeddings.set(term, embedding);
                    }
                    
                } catch (error) {
                    console.error(`RAGQueryExpansionService: Failed to generate embeddings for batch ${i/BATCH_SIZE + 1}:`, error);
                }
            }
        }
        
        // Compile final results
        for (const term of searchTerms) {
            const embedding = cachedEmbeddings.get(term);
            if (embedding) {
                embeddings.push({
                    term: term,
                    embedding: embedding
                });
            }
        }
        
        console.log(`RAGQueryExpansionService: Generated ${embeddings.length} embeddings`);
        return embeddings;
    }
    
    /**
     * Rank chunks using multiple query embeddings
     * @param {Array} chunks - Array of chunks with embeddings
     * @param {Array} queryEmbeddings - Array of {term, embedding} objects
     * @param {string} strategy - Ranking strategy ('max', 'average', 'weighted')
     * @returns {Array} Chunks with multi-query scores
     */
    function rankChunksWithMultipleQueries(chunks, queryEmbeddings, strategy = 'weighted') {
        if (!chunks || chunks.length === 0 || !queryEmbeddings || queryEmbeddings.length === 0) {
            return chunks;
        }
        
        // Debug: Check what we're receiving
        console.log(`RAGQueryExpansionService: Ranking ${chunks.length} chunks with ${queryEmbeddings.length} query embeddings`);
        if (chunks.length > 0) {
            console.log(`  First chunk has embedding: ${!!chunks[0].embedding}, length: ${chunks[0].embedding ? chunks[0].embedding.length : 0}`);
        }
        
        const rankedChunks = chunks.map(chunk => {
            if (!chunk.embedding) {
                console.warn('RAGQueryExpansionService: Chunk missing embedding, returning with 0 score');
                return { ...chunk, multiQueryScore: 0, queryScores: [], similarity: 0 };
            }
            
            // Calculate similarity with each query embedding
            const queryScores = queryEmbeddings.map(qe => ({
                term: qe.term,
                similarity: cosineSimilarity(chunk.embedding, qe.embedding)
            }));
            
            // Debug: Check if scores are valid
            const hasInvalidScores = queryScores.some(qs => isNaN(qs.similarity) || qs.similarity === undefined);
            if (hasInvalidScores) {
                console.warn('RAGQueryExpansionService: Invalid similarity scores detected:', queryScores);
            }
            
            // Calculate combined score based on strategy
            let multiQueryScore = 0;
            
            switch (strategy) {
                case 'max':
                    // Use the highest similarity score
                    multiQueryScore = Math.max(...queryScores.map(qs => qs.similarity));
                    break;
                    
                case 'average':
                    // Simple average of all scores
                    multiQueryScore = queryScores.reduce((sum, qs) => sum + qs.similarity, 0) / queryScores.length;
                    break;
                    
                case 'weighted':
                    // Weighted average: first term (original query) gets higher weight
                    const weights = [0.3]; // First term gets 30% weight
                    const remainingWeight = 0.7 / (queryScores.length - 1);
                    for (let i = 1; i < queryScores.length; i++) {
                        weights.push(remainingWeight);
                    }
                    
                    multiQueryScore = queryScores.reduce((sum, qs, idx) => {
                        return sum + (qs.similarity * (weights[idx] || remainingWeight));
                    }, 0);
                    break;
                    
                default:
                    multiQueryScore = chunk.similarity || 0;
            }
            
            return {
                ...chunk,
                multiQueryScore: multiQueryScore,
                queryScores: queryScores,
                // Preserve original similarity for comparison
                originalSimilarity: chunk.similarity || 0
            };
        });
        
        // Sort by multi-query score
        rankedChunks.sort((a, b) => b.multiQueryScore - a.multiQueryScore);
        
        // Update similarity field to use multi-query score
        rankedChunks.forEach(chunk => {
            chunk.similarity = chunk.multiQueryScore;
        });
        
        console.log(`RAGQueryExpansionService: Ranked ${chunks.length} chunks using ${strategy} strategy`);
        
        // Debug: Log top scores to verify they're set correctly
        if (window.DebugService && rankedChunks.length > 0) {
            const top3 = rankedChunks.slice(0, 3);
            window.DebugService.debugLog('rag', `Multi-query ranking results:`);
            top3.forEach((chunk, idx) => {
                window.DebugService.debugLog('rag', `  ${idx + 1}. similarity=${(chunk.similarity * 100).toFixed(2)}%, multiQueryScore=${(chunk.multiQueryScore * 100).toFixed(2)}%`);
            });
        }
        
        return rankedChunks;
    }
    
    /**
     * Calculate cosine similarity between two vectors
     * @param {Array} vecA - First vector
     * @param {Array} vecB - Second vector
     * @returns {number} Similarity score between 0 and 1
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
        
        if (normA === 0 || normB === 0) {
            return 0;
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    /**
     * Clear the query cache
     */
    function clearCache() {
        queryCache.clear();
        console.log('RAGQueryExpansionService: Cache cleared');
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    function getCacheStats() {
        let validEntries = 0;
        let expiredEntries = 0;
        const now = Date.now();
        
        for (const [key, value] of queryCache.entries()) {
            if (now - value.timestamp < CACHE_TTL) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }
        
        return {
            totalEntries: queryCache.size,
            validEntries: validEntries,
            expiredEntries: expiredEntries,
            cacheTTL: CACHE_TTL
        };
    }
    
    // Public API
    return {
        expandQuery,
        generateMultipleEmbeddings,
        rankChunksWithMultipleQueries,
        clearCache,
        getCacheStats,
        cosineSimilarity
    };
})();