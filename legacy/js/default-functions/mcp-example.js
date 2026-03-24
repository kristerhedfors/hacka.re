/**
 * MCP Example Functions
 * Example functions demonstrating MCP integration capabilities
 */

window.MCPExampleFunctions = {
    id: 'mcp-example',
    name: 'MCP Examples',
    description: 'Example functions for testing MCP integration',
    groupId: 'mcp-example-group',
    functions: [
        {
            name: 'mcp_connect_example',
            code: `/**
 * Connect to an example MCP server
 * @description Demonstrates connecting to an MCP server. This example uses a mock SSE endpoint.
 * @param {string} serverUrl - The URL of the MCP server (e.g., "http://localhost:3000/mcp")
 * @param {string} serverName - A friendly name for the server (e.g., "example-server")
 * @returns {Promise<Object>} Connection result
 * @callable
 */
async function mcp_connect_example(serverUrl, serverName) {
    try {
        if (!serverUrl || !serverName) {
            return { 
                error: "Both serverUrl and serverName are required", 
                success: false 
            };
        }
        
        // Get the MCP client service
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { 
                error: "MCP Client Service not available", 
                success: false 
            };
        }
        
        // Create server configuration
        const config = {
            transport: {
                type: 'sse',
                url: serverUrl
            }
        };
        
        // Connect to the server
        await MCPClient.connect(serverName, config, {
            onNotification: (server, notification) => {
                console.log(\`MCP notification from \${server}:\`, notification);
            }
        });
        
        // Get connection info
        const info = MCPClient.getConnectionInfo(serverName);
        
        return {
            success: true,
            message: \`Connected to \${serverName}\`,
            serverInfo: info
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Connection failed"
        };
    }
}`
        },
        {
            name: 'mcp_list_connections',
            code: `/**
 * List all active MCP connections
 * @description Shows all currently connected MCP servers and their capabilities
 * @returns {Object} List of active connections
 * @callable
 */
function mcp_list_connections() {
    try {
        // Get the MCP client service
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { 
                error: "MCP Client Service not available", 
                success: false 
            };
        }
        
        // Get active connections
        const connections = MCPClient.getActiveConnections();
        
        if (connections.length === 0) {
            return {
                success: true,
                message: "No active MCP connections",
                connections: []
            };
        }
        
        // Get detailed info for each connection
        const connectionDetails = connections.map(name => {
            const info = MCPClient.getConnectionInfo(name);
            return {
                name: name,
                transport: info.transport,
                toolCount: info.tools.length,
                resourceCount: info.resources.length,
                promptCount: info.prompts.length,
                capabilities: Object.keys(info.capabilities)
            };
        });
        
        return {
            success: true,
            connections: connectionDetails,
            count: connections.length
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Failed to list connections"
        };
    }
}`
        },
        {
            name: 'mcp_disconnect',
            code: `/**
 * Disconnect from an MCP server
 * @description Closes the connection to a specified MCP server
 * @param {string} serverName - The name of the server to disconnect from
 * @returns {Promise<Object>} Disconnection result
 * @callable
 */
async function mcp_disconnect(serverName) {
    try {
        if (!serverName) {
            return { 
                error: "Server name is required", 
                success: false 
            };
        }
        
        // Get the MCP client service
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { 
                error: "MCP Client Service not available", 
                success: false 
            };
        }
        
        // Check if server is connected
        const connections = MCPClient.getActiveConnections();
        if (!connections.includes(serverName)) {
            return {
                success: false,
                error: \`Not connected to server: \${serverName}\`
            };
        }
        
        // Disconnect from the server
        await MCPClient.disconnect(serverName);
        
        return {
            success: true,
            message: \`Disconnected from \${serverName}\`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Disconnection failed"
        };
    }
}`
        }
    ]
};