/**
 * MCP Size Estimator Utility
 * Provides size estimation for MCP connections in share links
 */

/**
 * Estimate the size of MCP connections data for share links
 * @returns {Promise<number>} Estimated size in bytes
 */
export async function estimateMcpConnectionsSize() {
    try {
        let totalSize = 0;
        
        // Check for GitHub token
        if (window.CoreStorageService) {
            const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
            if (githubToken && typeof githubToken === 'string') {
                // GitHub token + service key + JSON structure
                totalSize += githubToken.length + 15; // "github" key + quotes + colon
            }
        }
        
        // Check for other MCP connections (Gmail OAuth, Shodan API key, etc.)
        if (window.CoreStorageService) {
            const gmailOAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
            if (gmailOAuth && gmailOAuth.refreshToken) {
                // OAuth data is larger than PAT tokens
                totalSize += JSON.stringify(gmailOAuth).length + 10;
            }
            
            // Check for Shodan API key
            const shodanApiKey = await window.CoreStorageService.getValue('shodan_api_key');
            if (shodanApiKey && typeof shodanApiKey === 'string') {
                // Shodan API key + service key + JSON structure
                totalSize += shodanApiKey.length + 15; // "shodan" key + quotes + colon
            }
        }
        
        // Add JSON wrapper overhead
        if (totalSize > 0) {
            totalSize += 20; // {"mcpConnections": {...}}
        }
        
        return totalSize;
        
    } catch (error) {
        console.error('MCP Size Estimator: Error estimating size:', error);
        return 60; // Fallback estimate
    }
}

/**
 * Synchronous size estimation (uses cached value or default)
 * @returns {number} Estimated size in bytes
 */
export function estimateMcpConnectionsSizeSync() {
    // Return cached value if available
    if (window.mcpSizeCache && Date.now() - window.mcpSizeCache.timestamp < 5000) {
        return window.mcpSizeCache.size;
    }
    
    // Update cache asynchronously
    estimateMcpConnectionsSize().then(size => {
        window.mcpSizeCache = {
            size: size,
            timestamp: Date.now()
        };
    });
    
    // Return conservative estimate
    return 60;
}

/**
 * Check if MCP connections are available
 * @returns {Promise<boolean>} True if any connections exist
 */
export async function hasMcpConnections() {
    try {
        const size = await estimateMcpConnectionsSize();
        return size > 20; // More than just JSON wrapper
    } catch (error) {
        return false;
    }
}

// Make functions available globally for easy access
window.mcpConnectionsEstimator = estimateMcpConnectionsSize;
window.mcpConnectionsEstimatorSync = estimateMcpConnectionsSizeSync;
window.hasMcpConnections = hasMcpConnections;