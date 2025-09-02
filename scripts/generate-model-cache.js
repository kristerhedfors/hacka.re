#!/usr/bin/env node

/**
 * Script to generate fresh static model responses for OpenAI, Groq, and Berget
 * Run this script to update the cached model responses when providers update their models
 * 
 * Usage: node scripts/generate-model-cache.js
 * 
 * Requires API keys to be set as environment variables:
 * - OPENAI_API_KEY
 * - GROQ_API_KEY  
 * - BERGET_API_KEY
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Provider configurations
const providers = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com',
        endpoint: '/v1/models',
        apiKeyEnv: 'OPENAI_API_KEY',
        apiKeyHeader: 'Authorization',
        apiKeyPrefix: 'Bearer '
    },
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com',
        endpoint: '/openai/v1/models',
        apiKeyEnv: 'GROQ_API_KEY',
        apiKeyHeader: 'Authorization',
        apiKeyPrefix: 'Bearer '
    },
    berget: {
        name: 'Berget',
        baseUrl: 'https://api.berget.ai',
        endpoint: '/v1/models',
        apiKeyEnv: 'BERGET_API_KEY',
        apiKeyHeader: 'Authorization',
        apiKeyPrefix: 'Bearer '
    }
};

/**
 * Fetch models from a provider's API
 */
async function fetchModels(provider) {
    const config = providers[provider];
    const apiKey = process.env[config.apiKeyEnv];
    
    if (!apiKey) {
        console.warn(`⚠️  ${config.name}: No API key found (${config.apiKeyEnv}). Skipping...`);
        return null;
    }
    
    return new Promise((resolve, reject) => {
        const url = new URL(config.baseUrl + config.endpoint);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                [config.apiKeyHeader]: config.apiKeyPrefix + apiKey,
                'Content-Type': 'application/json'
            }
        };
        
        console.log(`📡 Fetching models from ${config.name}...`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const models = JSON.parse(data);
                        console.log(`✅ ${config.name}: Fetched ${models.data?.length || 0} models`);
                        resolve(models);
                    } catch (error) {
                        console.error(`❌ ${config.name}: Failed to parse response`);
                        reject(error);
                    }
                } else {
                    console.error(`❌ ${config.name}: HTTP ${res.statusCode} - ${data}`);
                    resolve(null);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error(`❌ ${config.name}: Request failed - ${error.message}`);
            resolve(null);
        });
        
        req.end();
    });
}

/**
 * Main function to generate model cache
 */
async function generateModelCache() {
    console.log('🚀 Starting model cache generation...\n');
    
    const cache = {
        timestamp: new Date().toISOString(),
        providers: {}
    };
    
    // Fetch from each provider
    for (const [key, config] of Object.entries(providers)) {
        const response = await fetchModels(key);
        if (response) {
            cache.providers[key] = response;
        }
    }
    
    // Write cache file
    const outputPath = path.join(__dirname, '..', 'js', 'services', 'model-cache.js');
    
    const jsContent = `/**
 * Static model cache for OpenAI, Groq, and Berget
 * Generated: ${cache.timestamp}
 * 
 * This file contains cached model responses to reduce API calls.
 * To update: run scripts/generate-model-cache.js
 */

window.ModelCache = ${JSON.stringify(cache, null, 4)};
`;
    
    fs.writeFileSync(outputPath, jsContent);
    console.log(`\n📝 Cache written to: ${outputPath}`);
    
    // Print summary
    console.log('\n📊 Summary:');
    for (const [provider, data] of Object.entries(cache.providers)) {
        const modelCount = data?.data?.length || 0;
        console.log(`   ${providers[provider].name}: ${modelCount} models`);
        
        // Show first few model IDs as examples
        if (data?.data?.length > 0) {
            const examples = data.data.slice(0, 3).map(m => m.id).join(', ');
            const more = data.data.length > 3 ? `, ... (${data.data.length - 3} more)` : '';
            console.log(`      Examples: ${examples}${more}`);
        }
    }
    
    console.log('\n✨ Model cache generation complete!');
    console.log('💡 Remember to include model-cache.js in index.html before api-service.js');
}

// Run the script
generateModelCache().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});