/**
 * MCP Connections Share Item
 * Handles sharing of MCP service connections (primarily GitHub classic tokens)
 */

/**
 * Collect MCP connections data for sharing
 * @returns {Promise<Object|null>} MCP connections data or null if none available
 */
export async function collectMcpConnectionsData() {
    try {
        console.log('MCP Connections: Collecting data for sharing...');
        const mcpConnections = {};
        let foundConnections = false;
        
        // Check for GitHub PAT token
        const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
        if (githubToken) {
            // Validate the token before including it
            const isValid = await validateGitHubToken(githubToken);
            if (isValid) {
                mcpConnections.github = githubToken;
                foundConnections = true;
                console.log('MCP Connections: GitHub token added to share data');
            } else {
                console.warn('MCP Connections: GitHub token exists but is invalid, skipping');
            }
        }
        
        // Check for other PAT-based services (expandable in the future)
        // const gitlabToken = await window.CoreStorageService.getValue('mcp_gitlab_token');
        // if (gitlabToken) {
        //     mcpConnections.gitlab = gitlabToken;
        //     foundConnections = true;
        // }
        
        // Check for Google OAuth tokens (Gmail/Docs)
        const gmailOAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
        if (gmailOAuth && gmailOAuth.refreshToken) {
            // Only include if the token is still valid and has a refresh token
            mcpConnections.gmail = {
                type: 'oauth',
                refreshToken: gmailOAuth.refreshToken,
                clientId: gmailOAuth.clientId,
                clientSecret: gmailOAuth.clientSecret,
                expiresAt: gmailOAuth.expiresAt
            };
            foundConnections = true;
            console.log('MCP Connections: Gmail OAuth added to share data');
        }
        
        return foundConnections ? mcpConnections : null;
        
    } catch (error) {
        console.error('MCP Connections: Error collecting data:', error);
        return null;
    }
}

/**
 * Apply MCP connections data from shared link
 * @param {Object} data - MCP connections data
 * @returns {Promise<void>}
 */
export async function applyMcpConnectionsData(data) {
    if (!data || typeof data !== 'object') {
        console.warn('MCP Connections: No valid data to apply');
        return;
    }
    
    try {
        console.log('MCP Connections: Applying shared data...');
        let appliedCount = 0;
        const results = [];
        
        for (const [serviceKey, connectionData] of Object.entries(data)) {
            try {
                if (serviceKey === 'github') {
                    // Handle GitHub PAT token
                    if (typeof connectionData === 'string') {
                        // Validate token before storing
                        const isValid = await validateGitHubToken(connectionData);
                        if (isValid) {
                            await window.CoreStorageService.setValue('mcp_github_token', connectionData);
                            appliedCount++;
                            results.push(`GitHub token applied successfully`);
                            
                            // Try to auto-connect if MCP service connectors available
                            await autoConnectGitHub();
                        } else {
                            results.push(`GitHub token is invalid and was not applied`);
                        }
                    }
                    
                } else if (serviceKey === 'gmail') {
                    // Handle Gmail OAuth tokens
                    if (connectionData.type === 'oauth' && connectionData.refreshToken) {
                        await window.CoreStorageService.setValue('mcp_gmail_oauth', connectionData);
                        appliedCount++;
                        results.push(`Gmail OAuth token applied successfully`);
                        
                        // Try to auto-connect if possible
                        await autoConnectGmail();
                    }
                    
                } else {
                    // Handle other future services
                    const storageKey = `mcp_${serviceKey}_token`;
                    await window.CoreStorageService.setValue(storageKey, connectionData);
                    appliedCount++;
                    results.push(`${serviceKey} connection applied successfully`);
                }
                
            } catch (serviceError) {
                console.error(`MCP Connections: Error applying ${serviceKey}:`, serviceError);
                results.push(`Failed to apply ${serviceKey}: ${serviceError.message}`);
            }
        }
        
        console.log(`MCP Connections: Applied ${appliedCount} connection(s)`);
        
        // Show results to user if chat manager is available
        if (window.ChatManager && results.length > 0) {
            const message = `MCP Connections restored:\n${results.join('\n')}`;
            window.ChatManager.addSystemMessage(message);
        }
        
    } catch (error) {
        console.error('MCP Connections: Error applying shared data:', error);
        throw new Error(`Failed to apply MCP connections: ${error.message}`);
    }
}

/**
 * Estimate the size of MCP connections data
 * @returns {Promise<number>} Estimated size in bytes
 */
export async function estimateMcpConnectionsSize() {
    try {
        const data = await collectMcpConnectionsData();
        if (!data) return 0;
        
        let totalSize = 0;
        
        for (const [serviceKey, connectionData] of Object.entries(data)) {
            // Add service key size
            totalSize += serviceKey.length + 5; // quotes and colon
            
            if (typeof connectionData === 'string') {
                // PAT token
                totalSize += connectionData.length + 2; // quotes
            } else if (typeof connectionData === 'object') {
                // OAuth data
                totalSize += JSON.stringify(connectionData).length;
            }
            
            totalSize += 5; // JSON structure overhead
        }
        
        // Add JSON object wrapper
        totalSize += 20;
        
        return totalSize;
        
    } catch (error) {
        console.error('MCP Connections: Error estimating size:', error);
        return 0;
    }
}

/**
 * Validate GitHub token
 * @param {string} token - GitHub PAT token
 * @returns {Promise<boolean>} True if token is valid
 */
async function validateGitHubToken(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'hacka.re-mcp-integration'
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('MCP Connections: GitHub token validation failed:', error);
        return false;
    }
}

/**
 * Auto-connect GitHub if MCP service connectors available
 */
async function autoConnectGitHub() {
    try {
        if (window.MCPServiceConnectors) {
            // Wait a bit for storage to be committed
            setTimeout(async () => {
                try {
                    const connected = await window.MCPServiceConnectors.connectService('github');
                    if (connected) {
                        console.log('MCP Connections: Auto-connected to GitHub');
                        if (window.ChatManager) {
                            window.ChatManager.addSystemMessage('GitHub MCP connection automatically restored and connected.');
                        }
                    }
                } catch (error) {
                    console.warn('MCP Connections: Auto-connect to GitHub failed:', error);
                }
            }, 500);
        }
    } catch (error) {
        console.warn('MCP Connections: Auto-connect setup failed:', error);
    }
}

/**
 * Auto-connect Gmail if MCP service connectors available
 */
async function autoConnectGmail() {
    try {
        if (window.MCPServiceConnectors) {
            setTimeout(async () => {
                try {
                    const connected = await window.MCPServiceConnectors.connectService('gmail');
                    if (connected) {
                        console.log('MCP Connections: Auto-connected to Gmail');
                        if (window.ChatManager) {
                            window.ChatManager.addSystemMessage('Gmail MCP connection automatically restored and connected.');
                        }
                    }
                } catch (error) {
                    console.warn('MCP Connections: Auto-connect to Gmail failed:', error);
                }
            }, 500);
        }
    } catch (error) {
        console.warn('MCP Connections: Auto-connect setup failed:', error);
    }
}

/**
 * Check if any MCP connections are available
 * @returns {Promise<boolean>} True if any connections exist
 */
export async function hasMcpConnections() {
    try {
        const data = await collectMcpConnectionsData();
        return data !== null && Object.keys(data).length > 0;
    } catch (error) {
        console.error('MCP Connections: Error checking for connections:', error);
        return false;
    }
}

/**
 * Get summary of available MCP connections
 * @returns {Promise<Object>} Summary of connections
 */
export async function getMcpConnectionsSummary() {
    try {
        const data = await collectMcpConnectionsData();
        if (!data) {
            return {
                total: 0,
                services: [],
                types: {}
            };
        }
        
        const services = Object.keys(data);
        const types = {};
        
        for (const [service, connectionData] of Object.entries(data)) {
            if (typeof connectionData === 'string') {
                types[service] = 'PAT'; // Personal Access Token
            } else if (connectionData.type === 'oauth') {
                types[service] = 'OAuth';
            } else {
                types[service] = 'Unknown';
            }
        }
        
        return {
            total: services.length,
            services,
            types
        };
        
    } catch (error) {
        console.error('MCP Connections: Error getting summary:', error);
        return {
            total: 0,
            services: [],
            types: {}
        };
    }
}