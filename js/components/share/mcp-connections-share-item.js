/**
 * MCP Connections Share Item Module
 * Handles sharing of MCP connection configurations
 */

/**
 * Estimate the size of MCP connections data for sharing
 * @param {Object} connections - MCP connections object
 * @returns {number} Estimated size in bytes
 */
function estimateMcpConnectionsSize(connections) {
    if (!connections || typeof connections !== 'object') {
        return 0;
    }
    
    try {
        return JSON.stringify(connections).length;
    } catch (error) {
        console.warn('Error estimating MCP connections size:', error);
        return 0;
    }
}

/**
 * Get a summary of MCP connections for sharing
 * @param {Object} connections - MCP connections object
 * @returns {Object} Summary object with connection details
 */
function getMcpConnectionsSummary(connections) {
    if (!connections || typeof connections !== 'object') {
        return {
            count: 0,
            connections: [],
            totalSize: 0
        };
    }
    
    try {
        const connectionList = Object.entries(connections).map(([key, connection]) => ({
            id: key,
            name: connection.name || 'Unnamed Connection',
            type: connection.type || 'unknown',
            status: connection.status || 'inactive'
        }));
        
        return {
            count: connectionList.length,
            connections: connectionList,
            totalSize: estimateMcpConnectionsSize(connections)
        };
    } catch (error) {
        console.warn('Error getting MCP connections summary:', error);
        return {
            count: 0,
            connections: [],
            totalSize: 0
        };
    }
}

/**
 * Prepare MCP connections data for sharing
 * @param {Object} connections - MCP connections object
 * @returns {Object} Prepared data for sharing
 */
function prepareMcpConnectionsForSharing(connections) {
    if (!connections || typeof connections !== 'object') {
        return null;
    }
    
    try {
        // Remove sensitive information before sharing
        const sanitizedConnections = {};
        
        Object.entries(connections).forEach(([key, connection]) => {
            sanitizedConnections[key] = {
                name: connection.name,
                type: connection.type,
                // Exclude sensitive fields like tokens, keys, etc.
                config: {
                    ...connection.config,
                    // Remove any potential sensitive data
                    token: undefined,
                    apiKey: undefined,
                    secret: undefined,
                    password: undefined
                }
            };
        });
        
        return sanitizedConnections;
    } catch (error) {
        console.warn('Error preparing MCP connections for sharing:', error);
        return null;
    }
}

/**
 * Collect MCP connections data for sharing/testing
 * @returns {Promise<Object>} Collected connections data (flat structure for sharing)
 */
async function collectMcpConnectionsData() {
    try {
        const connections = {};
        
        // Check for GitHub token
        if (window.CoreStorageService) {
            const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
            if (githubToken) {
                // Ensure we store as string, not object
                let tokenToShare = githubToken;
                if (typeof githubToken === 'object' && githubToken !== null && githubToken.token) {
                    tokenToShare = githubToken.token;
                }
                
                connections.github = tokenToShare;
                console.log('🔌 collectMcpConnectionsData: Found GitHub token for sharing, type:', typeof tokenToShare);
            } else {
                console.log('🔌 collectMcpConnectionsData: No GitHub token found');
            }
        } else {
            console.warn('🔌 collectMcpConnectionsData: CoreStorageService not available');
        }
        
        console.log('🔌 collectMcpConnectionsData: Returning connections:', Object.keys(connections));
        return connections;
    } catch (error) {
        console.error('🔌 collectMcpConnectionsData: Error collecting MCP connections:', error);
        return {};
    }
}

/**
 * Apply MCP connections data (for testing/sharing)
 * @param {Object} data - Connection data to apply
 * @returns {Promise} Application result
 */
async function applyMcpConnectionsData(data) {
    if (!data || !data.connections) {
        console.warn('No connection data to apply');
        return false;
    }
    
    try {
        // For now, just log the data
        // This would normally apply the connections to the actual MCP system
        console.log('Applying MCP connections data:', data);
        return true;
    } catch (error) {
        console.error('Error applying MCP connections data:', error);
        return false;
    }
}

// Make functions available globally
window.estimateMcpConnectionsSize = estimateMcpConnectionsSize;
window.getMcpConnectionsSummary = getMcpConnectionsSummary;
window.prepareMcpConnectionsForSharing = prepareMcpConnectionsForSharing;
window.collectMcpConnectionsData = collectMcpConnectionsData;
window.applyMcpConnectionsData = applyMcpConnectionsData;