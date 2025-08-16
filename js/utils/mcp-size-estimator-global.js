/**
 * MCP Size Estimator Utility (Global Version)
 * Provides size estimation for MCP connections in share links
 */

(function(global) {
    'use strict';

    /**
     * Estimate the size of MCP connections data for share links
     * @returns {Promise<number>} Estimated size in bytes
     */
    async function estimateMcpConnectionsSize() {
        try {
            let totalSize = 0;
            
            // Check for GitHub token
            if (global.CoreStorageService) {
                const githubToken = await global.CoreStorageService.getValue('mcp_github_token');
                if (githubToken && typeof githubToken === 'string') {
                    // GitHub token + service key + JSON structure
                    totalSize += githubToken.length + 15; // "github" key + quotes + colon
                    console.log(`MCP Size Estimator: GitHub token size: ${githubToken.length} bytes`);
                }
            }
            
            // Check for other MCP connections (Gmail OAuth, etc.)
            if (global.CoreStorageService) {
                const gmailOAuth = await global.CoreStorageService.getValue('mcp_gmail_oauth');
                if (gmailOAuth && gmailOAuth.refreshToken) {
                    // OAuth data is larger than PAT tokens
                    const oauthSize = JSON.stringify(gmailOAuth).length;
                    totalSize += oauthSize + 10;
                    console.log(`MCP Size Estimator: Gmail OAuth size: ${oauthSize} bytes`);
                }
            }
            
            // Add JSON wrapper overhead
            if (totalSize > 0) {
                totalSize += 20; // {"mcpConnections": {...}}
            }
            
            console.log(`MCP Size Estimator: Total estimated size: ${totalSize} bytes`);
            return totalSize;
            
        } catch (error) {
            console.error('MCP Size Estimator: Error estimating size:', error);
            return 80; // Fallback estimate (increased from 60)
        }
    }

    /**
     * Synchronous size estimation (uses cached value or default)
     * @returns {number} Estimated size in bytes
     */
    function estimateMcpConnectionsSizeSync() {
        // Return cached value if available
        if (global.mcpSizeCache && Date.now() - global.mcpSizeCache.timestamp < 5000) {
            console.log(`MCP Size Estimator: Using cached size: ${global.mcpSizeCache.size} bytes`);
            return global.mcpSizeCache.size;
        }
        
        // For immediate sync response, check if we can quickly estimate connection sizes
        try {
            let estimatedSize = 0;
            const localStorage = global.localStorage;
            if (localStorage) {
                // Look for stored MCP connections
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('mcp_github_token') || key.includes('mcp_gmail_oauth'))) {
                        try {
                            const tokenData = localStorage.getItem(key);
                            if (tokenData) {
                                const parsed = JSON.parse(tokenData);
                                if (key.includes('mcp_github_token') && typeof parsed === 'string' && parsed.length > 20) {
                                    estimatedSize += parsed.length + 15; // GitHub token + service key
                                } else if (key.includes('mcp_gmail_oauth') && parsed && typeof parsed === 'object') {
                                    const oauthSize = JSON.stringify(parsed).length;
                                    estimatedSize += oauthSize + 10; // Gmail OAuth + service key
                                }
                            }
                        } catch (e) {
                            // Not JSON or other error, continue
                        }
                    }
                }
                
                if (estimatedSize > 0) {
                    estimatedSize += 20; // JSON wrapper overhead
                    console.log(`MCP Size Estimator: Quick estimate from localStorage: ${estimatedSize} bytes`);
                    return estimatedSize;
                }
            }
        } catch (error) {
            console.log('MCP Size Estimator: localStorage check failed:', error);
        }
        
        // Update cache asynchronously for next time
        estimateMcpConnectionsSize().then(size => {
            global.mcpSizeCache = {
                size: size,
                timestamp: Date.now()
            };
            console.log(`MCP Size Estimator: Updated cache with size: ${size} bytes`);
        }).catch(error => {
            console.error('MCP Size Estimator: Failed to update cache:', error);
        });
        
        // Return conservative estimate for immediate use
        console.log('MCP Size Estimator: Using fallback estimate: 80 bytes');
        return 80;
    }

    /**
     * Check if MCP connections are available
     * @returns {Promise<boolean>} True if any connections exist
     */
    async function hasMcpConnections() {
        try {
            const size = await estimateMcpConnectionsSize();
            return size > 20; // More than just JSON wrapper
        } catch (error) {
            return false;
        }
    }

    // Make functions available globally
    global.mcpConnectionsEstimator = estimateMcpConnectionsSize;
    global.mcpConnectionsEstimatorSync = estimateMcpConnectionsSizeSync;
    global.hasMcpConnections = hasMcpConnections;
    
    console.log('MCP Size Estimator: Global functions registered');

})(window);