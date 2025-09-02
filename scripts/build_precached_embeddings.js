#!/usr/bin/env node

/**
 * Build Script for Pre-cached Embeddings
 * Generates embeddings for EU regulation documents and saves them as a JavaScript file
 * 
 * Usage: node scripts/build_precached_embeddings.js
 * 
 * Required: OPENAI_API_KEY environment variable or .env file
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from _tests/playwright/.env
try {
    require('dotenv').config({ path: path.join(__dirname, '../_tests/playwright/.env') });
} catch (e) {
    // If dotenv not available, try to load .env file manually
    try {
        const envPath = path.join(__dirname, '../_tests/playwright/.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                process.env[match[1]] = match[2];
            }
        });
    } catch (err) {
        console.warn('Could not load .env file:', err.message);
    }
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
    console.error('Error: OPENAI_API_KEY not found');
    console.error('Please ensure OPENAI_API_KEY is set in _tests/playwright/.env file');
    console.error('Or set it via: export OPENAI_API_KEY=your_api_key');
    process.exit(1);
}

// Configuration
const CONFIG = {
    chunkSize: 512,      // tokens per chunk (approximate)
    chunkOverlap: 50,    // token overlap between chunks
    embeddingModel: 'text-embedding-3-small',
    charPerToken: 4,     // rough approximation
    batchSize: 10,       // embeddings to generate per API call
    outputFile: path.join(__dirname, '../js/data/precached-embeddings.js')
};

// Load regulation documents
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
 * Chunk text into smaller pieces with overlap
 */
function chunkText(text, chunkSize = 512, chunkOverlap = 50) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const chunkSizeChars = chunkSize * CONFIG.charPerToken;
    const chunkOverlapChars = chunkOverlap * CONFIG.charPerToken;

    const chunks = [];
    let start = 0;

    while (start < text.length) {
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
 * Generate embeddings via OpenAI API
 */
async function generateEmbeddings(textChunks, progressCallback = null) {
    const embeddings = [];
    
    for (let i = 0; i < textChunks.length; i += CONFIG.batchSize) {
        const batch = textChunks.slice(i, i + CONFIG.batchSize);
        const progress = Math.round((i / textChunks.length) * 100);
        
        if (progressCallback) {
            progressCallback(progress, `Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}...`);
        }

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

    if (progressCallback) {
        progressCallback(100, 'Embeddings generation completed');
    }

    return embeddings;
}

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
    
    // Fallback: try to extract from window assignment
    const windowMatch = fileContent.match(/window\.\w+\s*=\s*{[\s\S]*?content:\s*`([^`]+)`/);
    if (windowMatch && windowMatch[1]) {
        return windowMatch[1];
    }
    
    throw new Error(`Could not extract content from ${filePath}`);
}

/**
 * Process a single regulation document
 */
async function processRegulation(regulation) {
    console.log(`\nProcessing ${regulation.name}...`);
    
    // Load content
    const content = loadRegulationContent(regulation.file);
    console.log(`  Loaded ${content.length} characters`);
    
    // Chunk the content
    const chunks = chunkText(content, CONFIG.chunkSize, CONFIG.chunkOverlap);
    console.log(`  Created ${chunks.length} chunks`);
    
    // Generate embeddings
    console.log(`  Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks, (progress, message) => {
        process.stdout.write(`\r  ${progress}% - ${message}`);
    });
    console.log('\n  Embeddings generated successfully');
    
    // Combine chunks with embeddings
    const vectors = chunks.map((chunk, index) => ({
        id: `${regulation.id}_chunk_${index}`,
        embedding: embeddings[index],
        position: chunk.position,
        metadata: {
            documentId: regulation.id,
            documentName: regulation.name,
            chunkIndex: index,
            totalChunks: chunks.length,
            chunkSize: chunk.content.length
        }
    }));
    
    return {
        documentId: regulation.id,
        documentName: regulation.name,
        vectors: vectors,
        metadata: {
            totalChunks: chunks.length,
            embeddingModel: CONFIG.embeddingModel,
            chunkSize: CONFIG.chunkSize,
            chunkOverlap: CONFIG.chunkOverlap,
            generatedAt: new Date().toISOString()
        }
    };
}

/**
 * Generate the JavaScript output file
 */
function generateOutputFile(embeddingsData) {
    const output = `/**
 * Pre-cached Embeddings for EU Regulation Documents
 * Generated: ${new Date().toISOString()}
 * Model: ${CONFIG.embeddingModel}
 * 
 * This file contains pre-computed embeddings for EU regulation documents
 * to enable RAG functionality without requiring API calls for indexing.
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
    
    fs.writeFileSync(CONFIG.outputFile, output);
    console.log(`\nOutput written to: ${CONFIG.outputFile}`);
}

/**
 * Main execution
 */
async function main() {
    console.log('Pre-cached Embeddings Generator');
    console.log('================================');
    console.log(`Model: ${CONFIG.embeddingModel}`);
    console.log(`Chunk size: ${CONFIG.chunkSize} tokens`);
    console.log(`Chunk overlap: ${CONFIG.chunkOverlap} tokens`);
    
    const embeddingsData = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        model: CONFIG.embeddingModel,
        config: {
            chunkSize: CONFIG.chunkSize,
            chunkOverlap: CONFIG.chunkOverlap
        },
        documents: []
    };
    
    try {
        for (const regulation of regulations) {
            const docData = await processRegulation(regulation);
            embeddingsData.documents.push(docData);
        }
        
        // Generate output file
        generateOutputFile(embeddingsData);
        
        // Summary
        console.log('\n================================');
        console.log('Generation Complete!');
        console.log(`Total documents: ${embeddingsData.documents.length}`);
        console.log(`Total vectors: ${embeddingsData.documents.reduce((sum, doc) => sum + doc.vectors.length, 0)}`);
        
    } catch (error) {
        console.error('\nError:', error.message);
        process.exit(1);
    }
}

// Run the script
main().catch(console.error);