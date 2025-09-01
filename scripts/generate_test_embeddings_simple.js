#!/usr/bin/env node

/**
 * Simple test script for pre-cached embeddings
 * Generates a minimal test file with a few vectors
 */

const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, '../js/data/precached-embeddings-test.js');

// Generate a small mock embedding (10 dimensions instead of 1536)
function generateSmallEmbedding() {
    const embedding = [];
    for (let i = 0; i < 10; i++) {
        embedding.push(Math.random() * 2 - 1);
    }
    return embedding;
}

// Create test data
const testData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    model: 'text-embedding-3-small',
    config: {
        chunkSize: 512,
        chunkOverlap: 50
    },
    documents: [{
        documentId: 'test',
        documentName: 'Test Document',
        vectors: [
            {
                id: 'test_chunk_0',
                embedding: generateSmallEmbedding(),
                position: { start: 0, end: 100 },
                metadata: {
                    documentId: 'test',
                    documentName: 'Test Document',
                    chunkIndex: 0,
                    totalChunks: 3,
                    chunkSize: 100
                }
            },
            {
                id: 'test_chunk_1',
                embedding: generateSmallEmbedding(),
                position: { start: 50, end: 150 },
                metadata: {
                    documentId: 'test',
                    documentName: 'Test Document',
                    chunkIndex: 1,
                    totalChunks: 3,
                    chunkSize: 100
                }
            },
            {
                id: 'test_chunk_2',
                embedding: generateSmallEmbedding(),
                position: { start: 100, end: 200 },
                metadata: {
                    documentId: 'test',
                    documentName: 'Test Document',
                    chunkIndex: 2,
                    totalChunks: 3,
                    chunkSize: 100
                }
            }
        ],
        metadata: {
            totalChunks: 3,
            embeddingModel: 'text-embedding-3-small',
            chunkSize: 512,
            chunkOverlap: 50,
            generatedAt: new Date().toISOString()
        }
    }]
};

// Generate JavaScript file
const jsContent = `/**
 * Test Pre-cached Embeddings (Simplified)
 * Generated: ${new Date().toISOString()}
 * 
 * This is a test file with mock embeddings for development.
 * Uses smaller embeddings (10 dimensions) for testing.
 */

window.precachedEmbeddings = ${JSON.stringify(testData, null, 2)};

// Initialize function to load pre-cached embeddings into RAG system
window.initializePrecachedEmbeddings = function() {
    // Check if RAG vector store exists
    if (!window.ragVectorStore) {
        console.warn('RAG vector store not initialized yet');
        
        // Create a simple mock if needed for testing
        window.ragVectorStore = {
            vectors: {},
            storeVectors: function(docId, vectors) {
                this.vectors[docId] = vectors;
                console.log(\`Stored \${vectors.length} vectors for document \${docId}\`);
            },
            getVectors: function(docId) {
                return this.vectors[docId] || [];
            },
            hasVectors: function(docId) {
                return !!this.vectors[docId];
            },
            getDocumentIds: function() {
                return Object.keys(this.vectors);
            }
        };
    }
    
    const embeddings = window.precachedEmbeddings;
    let totalVectors = 0;
    
    for (const docData of embeddings.documents) {
        // Store vectors in memory
        window.ragVectorStore.storeVectors(docData.documentId, docData.vectors);
        totalVectors += docData.vectors.length;
        
        // Update document index metadata if CoreStorageService exists
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
    }
    
    console.log(\`Loaded \${totalVectors} pre-cached embeddings for \${embeddings.documents.length} documents\`);
    return true;
};

// Auto-initialize when RAG system is ready
if (window.ragVectorStore) {
    window.initializePrecachedEmbeddings();
} else {
    // Wait for RAG system to be ready
    const checkInterval = setInterval(() => {
        if (window.ragVectorStore) {
            clearInterval(checkInterval);
            window.initializePrecachedEmbeddings();
        }
    }, 100);
}
`;

// Write file
fs.writeFileSync(outputFile, jsContent);

console.log('Test embeddings generated successfully!');
console.log(`Output file: ${outputFile}`);
console.log(`File size: ${(jsContent.length / 1024).toFixed(2)} KB`);
console.log(`Documents: 1`);
console.log(`Vectors: 3`);
console.log(`Dimensions: 10 (simplified for testing)`);