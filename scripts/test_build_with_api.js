#!/usr/bin/env node

/**
 * Test script to verify API key loading and embedding generation
 * Tests with a small sample before running full build
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
    console.log('✓ Loaded .env file from _tests/playwright/.env');
} catch (err) {
    console.error('✗ Could not load .env file:', err.message);
    process.exit(1);
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
    console.error('✗ OPENAI_API_KEY not found in .env file');
    process.exit(1);
}

console.log('✓ API key found:', API_KEY.substring(0, 20) + '...');

// Test with a small text sample
async function testEmbedding() {
    const testText = "This is a test of the embedding generation system.";
    console.log('\nTesting embedding generation...');
    console.log('Test text:', testText);
    
    const requestBody = JSON.stringify({
        model: 'text-embedding-3-small',
        input: [testText],
        encoding_format: 'float'
    });
    
    return new Promise((resolve, reject) => {
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
                        const response = JSON.parse(data);
                        if (response.data && response.data[0] && response.data[0].embedding) {
                            console.log('✓ Embedding generated successfully');
                            console.log('  Dimensions:', response.data[0].embedding.length);
                            console.log('  First 5 values:', response.data[0].embedding.slice(0, 5));
                            console.log('  Model used:', response.model);
                            resolve(true);
                        } else {
                            console.error('✗ Invalid response format');
                            reject(new Error('Invalid response format'));
                        }
                    } catch (e) {
                        console.error('✗ Failed to parse response:', e.message);
                        reject(e);
                    }
                } else {
                    console.error(`✗ API error ${res.statusCode}:`, data);
                    reject(new Error(`API error ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('✗ Request error:', err.message);
            reject(err);
        });
        
        req.write(requestBody);
        req.end();
    });
}

// Run the test
testEmbedding()
    .then(() => {
        console.log('\n✅ Test successful! You can now run the full build script:');
        console.log('   node scripts/build_precached_embeddings.js');
    })
    .catch((err) => {
        console.error('\n❌ Test failed:', err.message);
        console.error('Please check your API key and network connection.');
        process.exit(1);
    });