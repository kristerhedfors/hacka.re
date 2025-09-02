#!/usr/bin/env node

/**
 * Generate realistic test embeddings from actual EU regulation documents
 * Uses real document chunks but with smaller mock embeddings for testing
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    chunkSize: 512,      // tokens per chunk (approximate)
    chunkOverlap: 50,    // token overlap between chunks
    charPerToken: 4,     // rough approximation
    maxChunksPerDoc: 10, // Limit chunks for testing
    embeddingDims: 50,   // Smaller embeddings for testing (real is 1536)
    outputFile: path.join(__dirname, '../js/data/precached-embeddings-realistic.js')
};

// Regulation files
const regulations = [
    {
        id: 'aia',
        name: 'EU AI Act',
        file: path.join(__dirname, '../js/data/regulations/eu-regulation-ai-act.js')
    },
    {
        id: 'cra',
        name: 'EU Cyber Resilience Act',
        file: path.join(__dirname, '../js/data/regulations/eu-regulation-cra.js')
    },
    {
        id: 'dora',
        name: 'EU Digital Operational Resilience Act',
        file: path.join(__dirname, '../js/data/regulations/eu-regulation-dora.js')
    }
];

/**
 * Load and extract content from regulation file
 */
function loadRegulationContent(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract the content property from the JavaScript module
    const contentMatch = fileContent.match(/content:\s*`([^`]+)`/s);
    if (contentMatch && contentMatch[1]) {
        return contentMatch[1];
    }
    
    throw new Error(`Could not extract content from ${filePath}`);
}

/**
 * Chunk text into smaller pieces with overlap
 */
function chunkText(text, chunkSize = 512, chunkOverlap = 50, maxChunks = 10) {
    const chunkSizeChars = chunkSize * CONFIG.charPerToken;
    const chunkOverlapChars = chunkOverlap * CONFIG.charPerToken;
    const chunks = [];
    let start = 0;

    while (start < text.length && chunks.length < maxChunks) {
        let end = start + chunkSizeChars;
        
        if (end > text.length) {
            end = text.length;
        }

        let chunk = text.substring(start, end);

        // Try to break at sentence boundaries
        if (end < text.length) {
            const lastSentenceEnd = Math.max(
                chunk.lastIndexOf('.'),
                chunk.lastIndexOf('!'),
                chunk.lastIndexOf('?'),
                chunk.lastIndexOf('\n\n')
            );

            if (lastSentenceEnd > chunkSizeChars * 0.5) {
                chunk = text.substring(start, start + lastSentenceEnd + 1);
                end = start + lastSentenceEnd + 1;
            }
        }

        chunk = chunk.trim();
        if (chunk.length > 0) {
            chunks.push({
                content: chunk,
                position: {
                    start: start,
                    end: end
                }
            });
        }

        start = end - chunkOverlapChars;
        if (start < 0) start = 0;
        if (start >= text.length) break;
    }

    return chunks;
}

/**
 * Generate mock embedding based on content
 * Creates deterministic embeddings based on content for testing
 */
function generateMockEmbedding(content, dims = 50) {
    const embedding = [];
    
    // Create a simple hash from content
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 100); i++) {
        hash = ((hash << 5) - hash) + content.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Generate deterministic values based on hash
    for (let i = 0; i < dims; i++) {
        const seed = hash + i * 1000;
        const value = (Math.sin(seed) + Math.cos(seed * 0.5)) / 2;
        embedding.push(value);
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
}

/**
 * Process a regulation document
 */
function processRegulation(regulation) {
    console.log(`Processing ${regulation.name}...`);
    
    // Load content
    const content = loadRegulationContent(regulation.file);
    console.log(`  Loaded ${content.length} characters`);
    
    // Chunk the content
    const chunks = chunkText(content, CONFIG.chunkSize, CONFIG.chunkOverlap, CONFIG.maxChunksPerDoc);
    console.log(`  Created ${chunks.length} chunks (limited to ${CONFIG.maxChunksPerDoc})`);
    
    // Generate mock embeddings
    const vectors = chunks.map((chunk, index) => ({
        id: `${regulation.id}_chunk_${index}`,
        embedding: generateMockEmbedding(chunk.content, CONFIG.embeddingDims),
        position: chunk.position,
        metadata: {
            documentId: regulation.id,
            documentName: regulation.name,
            chunkIndex: index,
            totalChunks: chunks.length,
            chunkSize: chunk.content.length,
            vectorIndex: index // Add vectorIndex for gap-filling tests
        }
    }));
    
    return {
        documentId: regulation.id,
        documentName: regulation.name,
        vectors: vectors,
        metadata: {
            totalChunks: chunks.length,
            embeddingModel: 'text-embedding-3-small',
            embeddingDims: CONFIG.embeddingDims,
            chunkSize: CONFIG.chunkSize,
            chunkOverlap: CONFIG.chunkOverlap,
            generatedAt: new Date().toISOString()
        }
    };
}

/**
 * Generate the output file
 */
function generateOutput() {
    const embeddingsData = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        model: 'text-embedding-3-small',
        testMode: true, // Flag to indicate this uses mock embeddings
        config: {
            chunkSize: CONFIG.chunkSize,
            chunkOverlap: CONFIG.chunkOverlap,
            embeddingDims: CONFIG.embeddingDims
        },
        documents: []
    };
    
    // Process each regulation
    for (const regulation of regulations) {
        try {
            const docData = processRegulation(regulation);
            embeddingsData.documents.push(docData);
        } catch (error) {
            console.error(`Error processing ${regulation.name}:`, error.message);
        }
    }
    
    // Generate JavaScript output
    const jsContent = `/**
 * Realistic Test Pre-cached Embeddings
 * Generated: ${new Date().toISOString()}
 * 
 * This file contains real document chunks with mock embeddings for testing.
 * Mock embeddings are ${CONFIG.embeddingDims} dimensions (real would be 1536).
 */

window.precachedEmbeddings = ${JSON.stringify(embeddingsData, null, 2)};

// Initialize function to load pre-cached embeddings into RAG system
window.initializePrecachedEmbeddings = function() {
    if (!window.ragVectorStore) {
        console.warn('RAG vector store not initialized yet');
        return false;
    }
    
    const embeddings = window.precachedEmbeddings;
    let totalVectors = 0;
    
    console.log('Loading pre-cached embeddings...');
    
    for (const docData of embeddings.documents) {
        // Store vectors in memory
        window.ragVectorStore.storeVectors(docData.documentId, docData.vectors);
        totalVectors += docData.vectors.length;
        
        // Update document index metadata
        if (window.CoreStorageService) {
            const euDocsIndex = window.CoreStorageService.getValue('rag_eu_documents_index') || {};
            euDocsIndex[docData.documentId] = {
                name: docData.documentName,
                enabled: true,
                lastIndexed: docData.metadata.generatedAt,
                chunks: docData.vectors.length,
                metadata: docData.metadata
            };
            window.CoreStorageService.setValue('rag_eu_documents_index', euDocsIndex);
        }
        
        console.log(\`  Loaded \${docData.vectors.length} vectors for \${docData.documentName}\`);
    }
    
    console.log(\`Successfully loaded \${totalVectors} pre-cached embeddings for \${embeddings.documents.length} documents\`);
    
    // Notify other components
    if (window.RAGIndexStatsManager) {
        window.RAGIndexStatsManager.updateStats();
    }
    
    return true;
};

// Auto-initialize when RAG system is ready
(function() {
    let initAttempts = 0;
    const maxAttempts = 50;
    
    function tryInit() {
        if (window.ragVectorStore && window.CoreStorageService) {
            window.initializePrecachedEmbeddings();
        } else if (initAttempts < maxAttempts) {
            initAttempts++;
            setTimeout(tryInit, 100);
        } else {
            console.warn('Failed to initialize pre-cached embeddings after', maxAttempts, 'attempts');
        }
    }
    
    // Start initialization after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
`;
    
    // Write the output file
    fs.writeFileSync(CONFIG.outputFile, jsContent);
    
    // Calculate statistics
    const totalVectors = embeddingsData.documents.reduce((sum, doc) => sum + doc.vectors.length, 0);
    const fileSizeKB = (jsContent.length / 1024).toFixed(2);
    
    console.log('\n================================');
    console.log('Generation Complete!');
    console.log(`Output file: ${CONFIG.outputFile}`);
    console.log(`File size: ${fileSizeKB} KB`);
    console.log(`Documents: ${embeddingsData.documents.length}`);
    console.log(`Total vectors: ${totalVectors}`);
    console.log(`Embedding dimensions: ${CONFIG.embeddingDims} (mock)`);
    
    // Summary per document
    console.log('\nDocument Summary:');
    for (const doc of embeddingsData.documents) {
        console.log(`  ${doc.documentName}: ${doc.vectors.length} chunks`);
    }
}

// Run the generator
generateOutput();