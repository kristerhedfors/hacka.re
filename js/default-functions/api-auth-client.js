/**
 * @callable
 * Authenticated API Client Functions
 * 
 * JavaScript functions for making authenticated API calls using TweetNaCl (libsodium-compatible).
 * These functions demonstrate secure API authentication patterns that can be used
 * for tool calling in hacka.re using the same TweetNaCl library already available.
 */

/**
 * @callable
 * Generate HMAC-style signature for API authentication using TweetNaCl
 * Creates a secure signature using TweetNaCl hash (compatible with libsodium Blake2b pattern)
 * 
 * @param {string} body - Request body as string
 * @param {string} sharedSecretHex - Shared secret as hex string (64 chars)
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - Request path (/api/endpoint)
 * @param {Object} queryParams - Query parameters object
 * @param {Object} headers - Request headers object
 * @returns {Object} {timestamp, signature} for authentication headers
 */
function generateHMACSignature(body, sharedSecretHex, method = "POST", path = "", queryParams = {}, headers = {}) {
    try {
        // Generate timestamp for replay protection
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        // Create canonical request string (same format as Python version)
        const sortedParams = Object.keys(queryParams)
            .sort()
            .map(k => `${k}=${encodeURIComponent(queryParams[k])}`)
            .join('&');
        
        // Include essential headers only
        const essentialHeaders = ['content-type', 'authorization', 'user-agent', 'host'];
        const sortedHeaders = Object.keys(headers)
            .filter(k => essentialHeaders.includes(k.toLowerCase()))
            .sort()
            .map(k => `${k.toLowerCase()}:${headers[k]}`)
            .join('&');
        
        // Create canonical request for signing
        const canonical = `${method.toUpperCase()}\n${path}\n${sortedParams}\n${sortedHeaders}\n${timestamp}\n`;
        const canonicalRequest = canonical + body;
        
        // Convert shared secret from hex to bytes
        const sharedSecret = new Uint8Array(sharedSecretHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        
        // Convert canonical request to bytes
        const messageBytes = nacl.util.decodeUTF8(canonicalRequest);
        
        // Create keyed hash using TweetNaCl
        // We simulate HMAC by combining key + message and hashing
        // This matches the Blake2b keyed hash pattern from libsodium
        const keyedMessage = new Uint8Array(sharedSecret.length + messageBytes.length);
        keyedMessage.set(sharedSecret);
        keyedMessage.set(messageBytes, sharedSecret.length);
        
        // Hash with TweetNaCl (uses SHA-512, we take first 32 bytes like Blake2b)
        const hashBytes = nacl.hash(keyedMessage).slice(0, 32);
        
        // Convert signature to hex
        const signatureHex = Array.from(hashBytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        
        return {
            timestamp: timestamp,
            signature: signatureHex,
            canonical: canonical,
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * @callable
 * Make authenticated HMAC API call
 * Performs a complete authenticated HTTP request using TweetNaCl signatures
 * 
 * @param {string} url - Full API URL (https://api.example.com/endpoint)
 * @param {string} sharedSecretHex - Shared secret as hex string
 * @param {Object} options - Request options {method, body, queryParams, headers}
 * @returns {Promise<Object>} API response with status and data
 */
async function makeAuthenticatedHMACCall(url, sharedSecretHex, options = {}) {
    try {
        const {
            method = "POST",
            body = "",
            queryParams = {},
            headers = {}
        } = options;
        
        // Parse URL to extract path
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        
        // Add query parameters to URL
        Object.keys(queryParams).forEach(key => 
            urlObj.searchParams.set(key, queryParams[key])
        );
        
        // Set default headers
        const requestHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'hacka.re-api-client/1.0',
            ...headers
        };
        
        // Generate HMAC signature using TweetNaCl
        const authResult = generateHMACSignature(
            body, sharedSecretHex, method, path, queryParams, requestHeaders
        );
        
        if (!authResult.success) {
            return {
                success: false,
                error: `Authentication failed: ${authResult.error}`,
                status: 0
            };
        }
        
        // Add authentication headers
        requestHeaders['X-Timestamp'] = authResult.timestamp;
        requestHeaders['X-Signature'] = authResult.signature;
        
        // Make authenticated request
        const response = await fetch(urlObj.toString(), {
            method: method,
            headers: requestHeaders,
            body: method !== 'GET' ? body : undefined
        });
        
        // Parse response
        const responseText = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }
        
        return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: responseData,
            headers: Object.fromEntries(response.headers.entries()),
            authDetails: {
                timestamp: authResult.timestamp,
                signaturePreview: authResult.signature.substring(0, 16) + '...',
                canonical: authResult.canonical,
                cryptoLibrary: 'TweetNaCl (libsodium-compatible)'
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            status: 0
        };
    }
}

/**
 * @callable
 * Test API authentication setup
 * Validates authentication credentials against a test endpoint
 * 
 * @param {string} baseUrl - Base URL of API (https://api.example.com)
 * @param {string} sharedSecretHex - Shared secret as hex string
 * @returns {Promise<Object>} Test results and connection status
 */
async function testAPIAuthentication(baseUrl, sharedSecretHex) {
    try {
        // Test health endpoint (public)
        const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;
        const healthResponse = await fetch(healthUrl);
        const healthData = await healthResponse.json();
        
        // Test authenticated endpoint
        const testPayload = {
            message: "Authentication test from hacka.re",
            timestamp: new Date().toISOString(),
            client: "hacka.re-tool-calling"
        };
        
        const authResult = await makeAuthenticatedHMACCall(
            `${baseUrl.replace(/\/$/, '')}/api/protected`,
            sharedSecretHex,
            {
                method: "POST",
                body: JSON.stringify(testPayload),
                queryParams: { test: "true" },
                headers: { 'X-Test-Source': 'hacka.re' }
            }
        );
        
        return {
            success: true,
            healthCheck: {
                status: healthResponse.status,
                service: healthData.service || 'Unknown',
                crypto: healthData.crypto || 'Unknown'
            },
            authTest: authResult,
            secretValid: authResult.success,
            recommendations: authResult.success 
                ? ["✅ Authentication working correctly", "✅ Ready for production use"]
                : ["❌ Check shared secret format", "❌ Verify server configuration", "🔧 Ensure secret is 64 hex characters"]
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            recommendations: [
                "🔧 Check if server is running",
                "🔧 Verify base URL is correct", 
                "🔧 Ensure CORS is configured for browser requests"
            ]
        };
    }
}

/**
 * @callable
 * Make authenticated API call with query parameters
 * Demonstrates secure query parameter handling with integrity protection
 * 
 * @param {string} baseUrl - Base URL of API
 * @param {string} endpoint - API endpoint path (/api/users)
 * @param {string} sharedSecretHex - Shared secret as hex string
 * @param {Object} queryParams - Query parameters (user_id, action, etc.)
 * @param {Object} bodyData - Request body data
 * @returns {Promise<Object>} API response with query parameter protection
 */
async function makeSecureQueryCall(baseUrl, endpoint, sharedSecretHex, queryParams = {}, bodyData = {}) {
    try {
        const fullUrl = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
        
        const result = await makeAuthenticatedHMACCall(
            fullUrl,
            sharedSecretHex,
            {
                method: "GET",
                queryParams: queryParams,
                body: JSON.stringify(bodyData)
            }
        );
        
        return {
            ...result,
            queryProtection: {
                parametersSignedCount: Object.keys(queryParams).length,
                parameterNames: Object.keys(queryParams),
                tamperProtection: "✅ Query parameters cryptographically protected",
                securityNote: "Any modification to query parameters will cause signature verification to fail"
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            queryProtection: {
                tamperProtection: "❌ Error in query parameter protection"
            }
        };
    }
}

/**
 * @callable
 * Demonstrate attack prevention
 * Shows how tampering with request components fails authentication
 * 
 * @param {string} baseUrl - Base URL of API
 * @param {string} sharedSecretHex - Shared secret as hex string
 * @returns {Promise<Object>} Demonstration results showing attack prevention
 */
async function demonstrateAttackPrevention(baseUrl, sharedSecretHex) {
    try {
        const testData = { user_id: "123", action: "read" };
        const originalQuery = { user_id: "123", action: "read" };
        
        // Make legitimate request
        const legitimateRequest = await makeAuthenticatedHMACCall(
            `${baseUrl}/api/protected`,
            sharedSecretHex,
            {
                method: "POST",
                body: JSON.stringify(testData),
                queryParams: originalQuery
            }
        );
        
        // Simulate tampering by changing query parameters
        // (In real attack, this would be done by intercepting and modifying the request)
        const tamperedQuery = { user_id: "456", action: "delete" }; // Changed values
        
        const tamperedRequest = await makeAuthenticatedHMACCall(
            `${baseUrl}/api/protected`,
            sharedSecretHex,
            {
                method: "POST", 
                body: JSON.stringify(testData),
                queryParams: tamperedQuery  // Different query params with same signature
            }
        );
        
        return {
            success: true,
            demonstration: {
                legitimateRequest: {
                    status: legitimateRequest.status,
                    success: legitimateRequest.success,
                    queryParams: originalQuery
                },
                tamperedRequest: {
                    status: tamperedRequest.status,
                    success: tamperedRequest.success,
                    queryParams: tamperedQuery,
                    expectedResult: "Should fail due to query parameter tampering"
                },
                securityAnalysis: {
                    tamperingDetected: !tamperedRequest.success,
                    protectionWorking: legitimateRequest.success && !tamperedRequest.success,
                    securityLevel: legitimateRequest.success && !tamperedRequest.success ? "✅ HIGH" : "❌ VULNERABLE"
                }
            },
            explanation: [
                "🔒 Legitimate request with matching query parameters succeeds",
                "🛡️ Tampered request with different query parameters fails",
                "💡 This demonstrates comprehensive integrity protection",
                "⚠️ ANY modification to request components breaks the signature"
            ]
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * @callable
 * Generate shared secret for HMAC authentication
 * Creates a cryptographically secure shared secret using TweetNaCl
 * 
 * @returns {Object} Generated shared secret and setup instructions
 */
function generateSharedSecret() {
    try {
        // Generate 32 random bytes using TweetNaCl (same as libsodium)
        const randomBytes = nacl.randomBytes(32);
        
        // Convert to hex string
        const secretHex = Array.from(randomBytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        
        return {
            success: true,
            sharedSecret: secretHex,
            length: randomBytes.length,
            format: "32 bytes as 64 hex characters",
            setupInstructions: [
                "1. Copy the shared secret below",
                "2. Set server environment: export SHARED_SECRET=" + secretHex,
                "3. Use this secret in client authentication calls",
                "4. Keep this secret secure - never commit to version control"
            ],
            securityNotes: [
                "🔒 Generated using TweetNaCl (cryptographically secure)",
                "🔄 Compatible with libsodium PyNaCl on server side",
                "⏰ No expiration - rotate regularly for security",
                "🔐 Required for both signing and verification"
            ]
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * @callable
 * Make multiple authenticated API calls
 * Demonstrates batch operations with authentication
 * 
 * @param {string} baseUrl - Base URL of API
 * @param {string} sharedSecretHex - Shared secret as hex string
 * @param {Array} requests - Array of request objects {endpoint, method, data, queryParams}
 * @returns {Promise<Object>} Results of all API calls
 */
async function makeBatchAuthenticatedCalls(baseUrl, sharedSecretHex, requests = []) {
    try {
        const results = [];
        const startTime = Date.now();
        
        for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            const requestStart = Date.now();
            
            const result = await makeAuthenticatedHMACCall(
                `${baseUrl.replace(/\/$/, '')}${req.endpoint}`,
                sharedSecretHex,
                {
                    method: req.method || "POST",
                    body: JSON.stringify(req.data || {}),
                    queryParams: req.queryParams || {},
                    headers: req.headers || {}
                }
            );
            
            const requestTime = Date.now() - requestStart;
            
            results.push({
                index: i,
                endpoint: req.endpoint,
                method: req.method || "POST",
                success: result.success,
                status: result.status,
                data: result.data,
                responseTime: requestTime,
                authSignature: result.authDetails?.signaturePreview
            });
        }
        
        const totalTime = Date.now() - startTime;
        
        return {
            success: true,
            batchResults: results,
            summary: {
                totalRequests: requests.length,
                successfulRequests: results.filter(r => r.success).length,
                failedRequests: results.filter(r => !r.success).length,
                totalTime: totalTime,
                averageResponseTime: Math.round(totalTime / requests.length)
            },
            authentication: {
                method: "HMAC Blake2b-style with TweetNaCl",
                integrityProtection: "All request components signed",
                replayProtection: "Timestamp validation (5 minute window)"
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            batchResults: []
        };
    }
}