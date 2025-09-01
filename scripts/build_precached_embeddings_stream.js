#!/usr/bin/env node

/**
 * Memory-efficient build script for pre-cached embeddings
 * Streams output to file instead of building in memory
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from _tests/playwright/.env
const envPath = path.join(__dirname, '../_tests/playwright/.env');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2];
        }
    });
    console.log('✓ Loaded .env file');
} catch (err) {
    console.error('✗ Could not load .env file:', err.message);
    process.exit(1);
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
    console.error('✗ OPENAI_API_KEY not found');
    process.exit(1);
}

// Configuration
const CONFIG = {
    chunkSize: 512,
    chunkOverlap: 50,
    embeddingModel: 'text-embedding-3-small',
    charPerToken: 4,
    batchSize: 5, // Smaller batch size to reduce memory
    outputFile: path.join(__dirname, '../js/data/precached-embeddings.js')
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
 * Load regulation content
 */
function loadRegulationContent(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const contentMatch = fileContent.match(/content:\s*`([^`]+)`/s);
    if (contentMatch && contentMatch[1]) {
        return contentMatch[1];
    }
    throw new Error(`Could not extract content from ${filePath}`);
}

/**
 * Chunk text
 */
function chunkText(text, chunkSize = 512, chunkOverlap = 50) {
    const chunkSizeChars = chunkSize * CONFIG.charPerToken;
    const chunkOverlapChars = chunkOverlap * CONFIG.charPerToken;
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSizeChars;
        if (end > text.length) end = text.length;

        let chunk = text.substring(start, end);

        // Try to break at sentence boundaries
        if (end < text.length) {
            const lastSentenceEnd = Math.max(
                chunk.lastIndexOf('.'),
                chunk.lastIndexOf('!'),
                chunk.lastIndexOf('?'),
                chunk.lastIndexOf('\n')
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
                position: { start, end }
            });
        }

        start = end - chunkOverlapChars;
        if (start >= text.length) break;
    }

    return chunks;
}

/**
 * Generate embeddings via API
 */
async function generateEmbeddings(textChunks) {
    const embeddings = [];
    
    for (let i = 0; i < textChunks.length; i += CONFIG.batchSize) {
        const batch = textChunks.slice(i, i + CONFIG.batchSize);
        const progress = Math.round((i / textChunks.length) * 100);
        
        process.stdout.write(`\r  ${progress}% - Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}...`);

        const requestBody = JSON.stringify({
            model: CONFIG.embeddingModel,
            input: batch.map(chunk => chunk.content),
            encoding_format: 'float'
        });

        const response = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.openai.com',
                path: '/v1/embeddings',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`Failed to parse response: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`API error ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(requestBody);
            req.end();
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new Error('Invalid response format from embeddings API');
        }

        for (const item of response.data) {
            if (item.embedding && Array.isArray(item.embedding)) {
                embeddings.push(item.embedding);
            }
        }

        // Small delay between batches
        if (i + CONFIG.batchSize < textChunks.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log('\n  ✓ Embeddings generated successfully');
    return embeddings;
}

/**
 * Process regulation and write vectors to stream
 */
async function processRegulation(regulation, writer, isFirst) {
    console.log(`\nProcessing ${regulation.name}...`);
    
    // Load content
    const content = loadRegulationContent(regulation.file);
    console.log(`  Loaded ${content.length} characters`);
    
    // Chunk the content
    const chunks = chunkText(content, CONFIG.chunkSize, CONFIG.chunkOverlap);
    console.log(`  Created ${chunks.length} chunks`);
    
    // Generate embeddings
    console.log(`  Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks);
    
    // Write document entry
    if (!isFirst) writer.write(',');
    writer.write('\n    {\n');
    writer.write(`        "documentId": "${regulation.id}",\n`);
    writer.write(`        "documentName": "${regulation.name}",\n`);
    writer.write('        "vectors": [');
    
    // Write vectors
    for (let i = 0; i < chunks.length; i++) {
        if (i > 0) writer.write(',');
        writer.write('\n            {\n');
        writer.write(`                "id": "${regulation.id}_chunk_${i}",\n`);
        writer.write(`                "embedding": [${embeddings[i].join(',')}],\n`);
        writer.write(`                "position": ${JSON.stringify(chunks[i].position)},\n`);
        writer.write('                "metadata": {\n');
        writer.write(`                    "documentId": "${regulation.id}",\n`);
        writer.write(`                    "documentName": "${regulation.name}",\n`);
        writer.write(`                    "chunkIndex": ${i},\n`);
        writer.write(`                    "totalChunks": ${chunks.length},\n`);
        writer.write(`                    "chunkSize": ${chunks[i].content.length}\n`);
        writer.write('                }\n');
        writer.write('            }');
    }
    
    writer.write('\n        ],\n');
    writer.write('        "metadata": {\n');
    writer.write(`            "totalChunks": ${chunks.length},\n`);
    writer.write(`            "embeddingModel": "${CONFIG.embeddingModel}",\n`);
    writer.write(`            "chunkSize": ${CONFIG.chunkSize},\n`);
    writer.write(`            "chunkOverlap": ${CONFIG.chunkOverlap},\n`);
    writer.write(`            "generatedAt": "${new Date().toISOString()}"\n`);
    writer.write('        }\n');
    writer.write('    }');
    
    return chunks.length;
}

/**
 * Main execution
 */
async function main() {
    console.log('Pre-cached Embeddings Generator (Streaming)');
    console.log('============================================');
    console.log(`Model: ${CONFIG.embeddingModel}`);
    console.log(`Output: ${CONFIG.outputFile}`);
    
    // Create write stream
    const writer = fs.createWriteStream(CONFIG.outputFile);
    
    // Write header
    writer.write(`/**
 * Pre-cached Embeddings for EU Regulation Documents
 * Generated: ${new Date().toISOString()}
 * Model: ${CONFIG.embeddingModel}
 * 
 * This file contains pre-computed embeddings for EU regulation documents
 * to enable RAG functionality without requiring API calls for indexing.
 */

window.precachedEmbeddings = {
    "version": "1.0",
    "generatedAt": "${new Date().toISOString()}",
    "model": "${CONFIG.embeddingModel}",
    "config": ${JSON.stringify(CONFIG, ['chunkSize', 'chunkOverlap', 'embeddingModel'])},
    "documents": [`);
    
    let totalVectors = 0;
    
    try {
        // Process each regulation
        for (let i = 0; i < regulations.length; i++) {
            const vectorCount = await processRegulation(regulations[i], writer, i === 0);
            totalVectors += vectorCount;
        }
        
        // Close documents array
        writer.write('\n    ]\n};\n\n');
        
        // Write initialization function
        writer.write(`// Initialize function
window.initializePrecachedEmbeddings = function() {
    if (!window.ragVectorStore) {
        console.warn('RAG vector store not initialized yet');
        return false;
    }
    
    const embeddings = window.precachedEmbeddings;
    let totalVectors = 0;
    
    for (const docData of embeddings.documents) {
        window.ragVectorStore.storeVectors(docData.documentId, docData.vectors);
        totalVectors += docData.vectors.length;
        
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

// Auto-initialize
(function() {
    let initAttempts = 0;
    const maxAttempts = 50;
    
    function tryInit() {
        if (window.ragVectorStore && window.CoreStorageService) {
            window.initializePrecachedEmbeddings();
        } else if (initAttempts < maxAttempts) {
            initAttempts++;
            setTimeout(tryInit, 100);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
`);
        
        writer.end();
        
        console.log('\n\n✅ Generation Complete!');
        console.log(`Total vectors: ${totalVectors}`);
        console.log(`Output file: ${CONFIG.outputFile}`);
        
    } catch (error) {
        console.error('\n\n❌ Error:', error.message);
        writer.end();
        process.exit(1);
    }
}

// Run
main().catch(console.error);