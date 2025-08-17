/**
 * RAG Indexing Service
 * Handles embedding generation and text chunking for RAG functionality
 */

window.RAGIndexingService = (function() {
    
    /**
     * Chunk text into smaller pieces with overlap
     * @param {string} text - Text to chunk
     * @param {number} chunkSize - Size of each chunk in tokens (approximate)
     * @param {number} chunkOverlap - Overlap between chunks in tokens
     * @returns {Array} Array of text chunks
     */
    function chunkText(text, chunkSize = 512, chunkOverlap = 50) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        // Rough approximation: 1 token ≈ 4 characters
        const charPerToken = 4;
        const chunkSizeChars = chunkSize * charPerToken;
        const chunkOverlapChars = chunkOverlap * charPerToken;

        const chunks = [];
        let start = 0;
        let iterations = 0;
        const maxIterations = Math.ceil(text.length / (chunkSizeChars - chunkOverlapChars)) + 10; // Safety margin

        while (start < text.length && iterations < maxIterations) {
            iterations++;
            let end = start + chunkSizeChars;
            
            // Don't exceed text length
            if (end > text.length) {
                end = text.length;
            }

            let chunk = text.substring(start, end);

            // Try to break at sentence boundaries if we're not at the end
            if (end < text.length) {
                const lastSentenceEnd = Math.max(
                    chunk.lastIndexOf('.'),
                    chunk.lastIndexOf('!'),
                    chunk.lastIndexOf('?'),
                    chunk.lastIndexOf('\n')
                );

                // If we found a sentence boundary and it's not too early in the chunk
                if (lastSentenceEnd > chunkSizeChars * 0.5) {
                    chunk = text.substring(start, start + lastSentenceEnd + 1);
                    end = start + lastSentenceEnd + 1;
                }
            }

            // Clean up the chunk
            chunk = chunk.trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            // Move start position, accounting for overlap
            start = end - chunkOverlapChars;
            
            // Ensure we make progress and don't get stuck
            if (start < 0) {
                start = 0;
            }
            
            // If start hasn't advanced far enough, force it forward
            const lastChunkStart = chunks.length > 0 ? text.indexOf(chunks[chunks.length - 1]) : -1;
            if (lastChunkStart >= 0 && start <= lastChunkStart) {
                start = Math.min(end, text.length);
            }

            // If we've reached the end, break
            if (start >= text.length) {
                break;
            }
        }

        if (iterations >= maxIterations) {
            console.warn(`RAGIndexingService: Hit safety limit of ${maxIterations} iterations while chunking text of length ${text.length}`);
        }

        console.log(`RAGIndexingService: Chunked text into ${chunks.length} chunks`);
        return chunks;
    }

    /**
     * Generate embeddings for text chunks using OpenAI API
     * @param {Array} textChunks - Array of text chunks
     * @param {string} apiKey - OpenAI API key
     * @param {string} baseUrl - API base URL
     * @param {string} model - Embedding model to use
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Array>} Array of embedding vectors
     */
    async function generateEmbeddings(textChunks, apiKey, baseUrl, model = 'text-embedding-3-small', progressCallback = null) {
        if (!textChunks || !Array.isArray(textChunks) || textChunks.length === 0) {
            throw new Error('Invalid text chunks provided');
        }

        if (!apiKey) {
            throw new Error('API key is required for embedding generation');
        }

        const embeddings = [];
        const batchSize = 10; // Process in batches to avoid overwhelming the API
        
        console.log(`RAGIndexingService: Generating embeddings for ${textChunks.length} chunks using model ${model}`);

        try {
            for (let i = 0; i < textChunks.length; i += batchSize) {
                const batch = textChunks.slice(i, i + batchSize);
                const progress = Math.round((i / textChunks.length) * 100);
                
                if (progressCallback) {
                    progressCallback(progress, `Processing batch ${Math.floor(i / batchSize) + 1}...`);
                }

                console.log(`RAGIndexingService: Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} chunks)`);

                const response = await fetch(`${baseUrl}/embeddings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        input: batch,
                        encoding_format: 'float'
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();
                
                if (!data.data || !Array.isArray(data.data)) {
                    throw new Error('Invalid response format from embeddings API');
                }

                // Extract embeddings from response
                for (const item of data.data) {
                    if (item.embedding && Array.isArray(item.embedding)) {
                        embeddings.push(item.embedding);
                    } else {
                        throw new Error('Invalid embedding format in API response');
                    }
                }

                // Small delay between batches to be respectful to the API
                if (i + batchSize < textChunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            if (progressCallback) {
                progressCallback(100, 'Embeddings generation completed');
            }

            console.log(`RAGIndexingService: Successfully generated ${embeddings.length} embeddings`);
            return embeddings;

        } catch (error) {
            console.error('RAGIndexingService: Error generating embeddings:', error);
            throw error;
        }
    }

    /**
     * Index default prompts and generate embeddings
     * @param {Array} prompts - Array of prompt objects with id, name, and content
     * @param {string} apiKey - OpenAI API key
     * @param {string} baseUrl - API base URL
     * @param {Object} options - Indexing options
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Index data with chunks and embeddings
     */
    async function indexDefaultPrompts(prompts, apiKey, baseUrl, options = {}, progressCallback = null) {
        const {
            chunkSize = 512,
            chunkOverlap = 50,
            embeddingModel = 'text-embedding-3-small'
        } = options;

        if (!prompts || !Array.isArray(prompts)) {
            throw new Error('Invalid prompts array provided');
        }

        console.log(`RAGIndexingService: Starting to index ${prompts.length} default prompts`);

        const chunks = [];
        const chunkMetadata = [];

        // Process each prompt and chunk the content
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            
            if (!prompt.content || typeof prompt.content !== 'string') {
                console.warn(`RAGIndexingService: Skipping prompt ${prompt.id} - no content`);
                continue;
            }

            if (progressCallback) {
                progressCallback(
                    Math.round((i / prompts.length) * 30), // First 30% for chunking
                    `Chunking prompt: ${prompt.name || prompt.id}`
                );
            }

            const promptChunks = chunkText(prompt.content, chunkSize, chunkOverlap);
            
            for (let j = 0; j < promptChunks.length; j++) {
                chunks.push(promptChunks[j]);
                chunkMetadata.push({
                    promptId: prompt.id,
                    promptName: prompt.name || prompt.id,
                    chunkIndex: j,
                    totalChunks: promptChunks.length,
                    type: 'default_prompt'
                });
            }
        }

        console.log(`RAGIndexingService: Created ${chunks.length} chunks from ${prompts.length} prompts`);

        // Generate embeddings for all chunks
        const embeddings = await generateEmbeddings(
            chunks,
            apiKey,
            baseUrl,
            embeddingModel,
            (progress, message) => {
                if (progressCallback) {
                    // Map embedding progress to 30-100% of total progress
                    const adjustedProgress = 30 + Math.round((progress / 100) * 70);
                    progressCallback(adjustedProgress, message);
                }
            }
        );

        // Combine chunks with their embeddings and metadata
        const indexedChunks = chunks.map((chunk, index) => ({
            content: chunk,
            embedding: embeddings[index],
            metadata: chunkMetadata[index],
            id: `chunk_${index}`,
            length: chunk.length
        }));

        const indexData = {
            chunks: indexedChunks,
            metadata: {
                totalChunks: chunks.length,
                totalPrompts: prompts.length,
                embeddingModel: embeddingModel,
                chunkSize: chunkSize,
                chunkOverlap: chunkOverlap,
                createdAt: new Date().toISOString(),
                version: '1.0'
            }
        };

        console.log(`RAGIndexingService: Successfully indexed ${prompts.length} prompts into ${chunks.length} chunks`);
        return indexData;
    }

    /**
     * Create a cache key for embeddings
     * @param {string} content - Text content
     * @param {string} model - Model name
     * @returns {string} Cache key
     */
    function createCacheKey(content, model) {
        // Create a simple hash of the content and model
        const contentHash = content.split('').reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0);
        }, 0);
        
        return `${model}_${Math.abs(contentHash)}_${content.length}`;
    }

    /**
     * Check if embeddings are cached
     * @param {Array} textChunks - Text chunks to check
     * @param {string} model - Model name
     * @returns {Object} Cache check result with status and cached embeddings
     */
    function checkEmbeddingsCache(textChunks, model) {
        const cacheKey = createCacheKey(textChunks.join(''), model);
        const cached = RAGStorageService.getCachedEmbeddings(cacheKey);
        
        if (cached && cached.embeddings && cached.embeddings.length === textChunks.length) {
            console.log(`RAGIndexingService: Found cached embeddings for ${textChunks.length} chunks`);
            return {
                found: true,
                embeddings: cached.embeddings,
                cacheKey: cacheKey
            };
        }
        
        return {
            found: false,
            cacheKey: cacheKey
        };
    }

    /**
     * Generate embeddings with caching support
     * @param {Array} textChunks - Text chunks
     * @param {string} apiKey - API key
     * @param {string} baseUrl - Base URL
     * @param {string} model - Model name
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Array>} Embeddings array
     */
    async function generateEmbeddingsWithCache(textChunks, apiKey, baseUrl, model, progressCallback = null) {
        // Check cache first
        const cacheCheck = checkEmbeddingsCache(textChunks, model);
        
        if (cacheCheck.found) {
            if (progressCallback) {
                progressCallback(100, 'Using cached embeddings');
            }
            return cacheCheck.embeddings;
        }
        
        // Generate new embeddings
        const embeddings = await generateEmbeddings(textChunks, apiKey, baseUrl, model, progressCallback);
        
        // Cache the embeddings
        RAGStorageService.cacheEmbeddings(cacheCheck.cacheKey, embeddings, model);
        
        return embeddings;
    }

    // Public API
    return {
        chunkText,
        generateEmbeddings,
        generateEmbeddingsWithCache,
        indexDefaultPrompts,
        createCacheKey,
        checkEmbeddingsCache
    };
})();