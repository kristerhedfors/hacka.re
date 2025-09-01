#!/usr/bin/env node

/**
 * Test script for pre-cached embeddings build
 * Generates a small sample to verify the process works
 */

const fs = require('fs');
const path = require('path');

// Mock configuration for testing
const CONFIG = {
    chunkSize: 512,
    chunkOverlap: 50,
    embeddingModel: 'text-embedding-3-small',
    charPerToken: 4,
    outputFile: path.join(__dirname, '../js/data/precached-embeddings-test.js')
};

// Sample regulation content for testing
const sampleContent = `
# EU AI Act Sample Content

## Article 1: Subject Matter
This Regulation lays down harmonised rules on artificial intelligence.

## Article 2: Scope
This Regulation applies to providers placing on the market AI systems.

## Article 3: Definitions
For the purposes of this Regulation, the following definitions apply:
- 'artificial intelligence system' means a machine-based system
- 'provider' means a natural or legal person developing an AI system
`;

/**
 * Chunk text into smaller pieces with overlap
 */
function chunkText(text, chunkSize = 512, chunkOverlap = 50) {
    const chunkSizeChars = chunkSize * CONFIG.charPerToken;
    const chunkOverlapChars = chunkOverlap * CONFIG.charPerToken;
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSizeChars;
        if (end > text.length) end = text.length;

        let chunk = text.substring(start, end).trim();
        if (chunk.length > 0) {
            chunks.push({
                content: chunk,
                position: { start, end }
            });
        }

        start = end - chunkOverlapChars;
        if (start < 0) start = 0;
        if (start >= text.length) break;
    }

    return chunks;
}

/**
 * Generate mock embeddings for testing
 */
function generateMockEmbeddings(chunks) {
    // Generate random embeddings with 1536 dimensions (same as text-embedding-3-small)
    return chunks.map(() => {
        const embedding = [];
        for (let i = 0; i < 1536; i++) {
            embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
        }
        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    });
}

/**
 * Generate test output file
 */
function generateTestOutput() {
    console.log('Generating test embeddings...');
    
    // Chunk the sample content
    const chunks = chunkText(sampleContent, CONFIG.chunkSize, CONFIG.chunkOverlap);
    console.log(`Created ${chunks.length} chunks from sample content`);
    
    // Generate mock embeddings
    const embeddings = generateMockEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} mock embeddings`);
    
    // Create vectors with metadata
    const vectors = chunks.map((chunk, index) => ({
        id: `test_chunk_${index}`,
        embedding: embeddings[index],
        position: chunk.position,
        metadata: {
            documentId: 'test',
            documentName: 'Test Document',
            chunkIndex: index,
            totalChunks: chunks.length,
            chunkSize: chunk.content.length
        }
    }));
    
    // Create the embeddings data structure
    const embeddingsData = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        model: CONFIG.embeddingModel,
        config: {
            chunkSize: CONFIG.chunkSize,
            chunkOverlap: CONFIG.chunkOverlap
        },
        documents: [{
            documentId: 'test',
            documentName: 'Test Document',
            vectors: vectors,
            metadata: {
                totalChunks: chunks.length,
                embeddingModel: CONFIG.embeddingModel,
                chunkSize: CONFIG.chunkSize,
                chunkOverlap: CONFIG.chunkOverlap,
                generatedAt: new Date().toISOString()
            }
        }]
    };
    
    // Generate JavaScript output more efficiently
    let output = `/**
 * Test Pre-cached Embeddings
 * Generated: ${new Date().toISOString()}
 * Model: ${CONFIG.embeddingModel}
 * 
 * This is a test file with mock embeddings for development.
 */

window.precachedEmbeddings = {
    version: "${embeddingsData.version}",
    generatedAt: "${embeddingsData.generatedAt}",
    model: "${embeddingsData.model}",
    config: ${JSON.stringify(embeddingsData.config)},
    documents: [{
        documentId: "test",
        documentName: "Test Document",
        vectors: [`;
    
    // Add vectors one by one to avoid memory issues
    for (let i = 0; i < vectors.length; i++) {
        if (i > 0) output += ',';
        output += `
            {
                id: "${vectors[i].id}",
                embedding: [${vectors[i].embedding.slice(0, 10).join(',')}], // Truncated for test
                position: ${JSON.stringify(vectors[i].position)},
                metadata: ${JSON.stringify(vectors[i].metadata)}
            }`;
    }
    
    output += `
        ],
        metadata: ${JSON.stringify(embeddingsData.documents[0].metadata)}
    }]
};

// Initialize function to load pre-cached embeddings into RAG system
window.initializePrecachedEmbeddings = function() {
    if (!window.ragVectorStore) {
        console.warn('RAG vector store not initialized yet');
        return false;
    }
    
    const embeddings = window.precachedEmbeddings;
    let totalVectors = 0;
    
    for (const docData of embeddings.documents) {
        // Store vectors in memory
        window.ragVectorStore.storeVectors(docData.documentId, docData.vectors);
        totalVectors += docData.vectors.length;
        
        // Update document index metadata
        const euDocsIndex = CoreStorageService.getValue('rag_eu_documents_index') || {};
        euDocsIndex[docData.documentId] = {
            name: docData.documentName,
            enabled: true,
            lastIndexed: docData.metadata.generatedAt,
            chunks: docData.vectors.length,
            metadata: docData.metadata
        };
        CoreStorageService.setValue('rag_eu_documents_index', euDocsIndex);
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
    
    // Write the output file
    fs.writeFileSync(CONFIG.outputFile, output);
    console.log(`\nTest file written to: ${CONFIG.outputFile}`);
    console.log(`File size: ${(output.length / 1024).toFixed(2)} KB`);
    
    return {
        chunks: chunks.length,
        vectors: vectors.length,
        dimensions: 1536,
        fileSize: output.length
    };
}

// Run the test
const results = generateTestOutput();
console.log('\nTest Summary:');
console.log(`- Chunks created: ${results.chunks}`);
console.log(`- Vectors generated: ${results.vectors}`);
console.log(`- Embedding dimensions: ${results.dimensions}`);
console.log(`- Output file size: ${(results.fileSize / 1024).toFixed(2)} KB`);
console.log('\nTest embeddings generated successfully!');