/**
 * MCP Tools Manager
 * 
 * Handles tool discovery, integration, and JavaScript function generation
 */

window.MCPToolsManager = (function() {
    // Dependencies
    let MCPClient = null;
    let notificationHandler = null;
    
    /**
     * Initialize the tools manager
     * @param {Object} config - Configuration object
     * @param {Object} config.MCPClient - MCP client service instance
     * @param {Function} config.notificationHandler - Function to show notifications
     */
    function init(config) {
        MCPClient = config.MCPClient || window.MCPClientService;
        notificationHandler = config.notificationHandler || console.log;
        
        if (!MCPClient) {
            console.error('[MCPToolsManager] MCPClientService not available');
            return false;
        }
        
        return true;
    }
    
    /**
     * Generate JavaScript function code for an MCP tool
     * @param {string} serverName - Name of the MCP server
     * @param {Object} tool - Tool definition
     * @returns {string} JavaScript function code
     */
    function generateFunctionCode(serverName, tool) {
        // Generate parameter documentation
        let paramDocs = '';
        if (tool.inputSchema && tool.inputSchema.properties) {
            const required = new Set(tool.inputSchema.required || []);
            for (const [name, prop] of Object.entries(tool.inputSchema.properties)) {
                const isRequired = required.has(name);
                const type = prop.type || 'any';
                const description = prop.description || '';
                paramDocs += `\n * @param {${type}} params.${name} ${isRequired ? '(required)' : ''} - ${description}`;
            }
        } else {
            paramDocs = '\n * @param {Object} params - Tool parameters';
        }
        
        return `/**
 * ${tool.description || `MCP tool ${tool.name} from ${serverName}`}
 * @description ${tool.description || `Calls ${tool.name} on MCP server ${serverName}`}${paramDocs}
 * @returns {Promise<Object>} Tool execution result
 * @tool This function calls an MCP tool via the proxy
 */
async function mcp_${serverName}_${tool.name}(params) {
    try {
        // Use the MCP Client Service to call the tool
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { 
                success: false, 
                error: "MCP Client Service not available" 
            };
        }
        
        // Call the tool through the proper MCP client
        // If params is not an object, treat it as the first parameter
        let args = params;
        if (typeof params !== 'object' || params === null) {
            // If tool expects parameters and a non-object was passed, 
            // assume it's the first parameter
            const firstParam = ${tool.inputSchema?.properties ? `Object.keys(${JSON.stringify(tool.inputSchema.properties)})[0]` : 'null'};
            if (firstParam) {
                args = { [firstParam]: params };
            } else {
                args = {};
            }
        }
        
        const result = await MCPClient.callTool('${serverName}', '${tool.name}', args || {});
        
        return {
            success: true,
            result: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Tool execution failed"
        };
    }
}`;
    }
    
    /**
     * Get all tools from active connections
     * @returns {Array} Array of tool objects with server info
     */
    function getAllTools() {
        const tools = [];
        const connections = MCPClient.getActiveConnections();
        
        for (const serverName of connections) {
            const info = MCPClient.getConnectionInfo(serverName);
            if (info && info.tools) {
                for (const tool of info.tools) {
                    tools.push({
                        serverName,
                        tool,
                        functionName: `mcp_${serverName}_${tool.name}`,
                        functionCode: generateFunctionCode(serverName, tool)
                    });
                }
            }
        }
        
        return tools;
    }
    
    /**
     * Get tools for a specific server
     * @param {string} serverName - Name of the server
     * @returns {Array} Array of tools from the server
     */
    function getServerTools(serverName) {
        const info = MCPClient.getConnectionInfo(serverName);
        if (!info || !info.tools) {
            return [];
        }
        
        return info.tools.map(tool => ({
            serverName,
            tool,
            functionName: `mcp_${serverName}_${tool.name}`,
            functionCode: generateFunctionCode(serverName, tool)
        }));
    }
    
    /**
     * Copy tool usage example to clipboard
     * @param {string} serverName - Name of the server
     * @param {string} toolName - Name of the tool
     */
    function copyToolUsage(serverName, toolName) {
        const functionName = `mcp_${serverName}_${toolName}`;
        const usage = `${functionName}({ /* parameters */ })`;
        
        navigator.clipboard.writeText(usage).then(() => {
            notificationHandler(`Copied ${functionName} usage to clipboard`, 'success');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            notificationHandler('Failed to copy to clipboard', 'error');
        });
    }
    
    /**
     * Copy tool function code to clipboard
     * @param {string} serverName - Name of the server
     * @param {string} toolName - Name of the tool
     */
    function copyToolFunction(serverName, toolName) {
        const info = MCPClient.getConnectionInfo(serverName);
        const tool = info?.tools?.find(t => t.name === toolName);
        
        if (!tool) {
            notificationHandler('Tool not found', 'error');
            return;
        }
        
        const functionCode = generateFunctionCode(serverName, tool);
        
        navigator.clipboard.writeText(functionCode).then(() => {
            notificationHandler(`Copied ${toolName} function code to clipboard`, 'success');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            notificationHandler('Failed to copy to clipboard', 'error');
        });
    }
    
    /**
     * Test a tool with sample parameters
     * @param {string} serverName - Name of the server
     * @param {string} toolName - Name of the tool
     */
    async function testTool(serverName, toolName) {
        try {
            const info = MCPClient.getConnectionInfo(serverName);
            const tool = info?.tools?.find(t => t.name === toolName);
            
            if (!tool) {
                notificationHandler('Tool not found', 'error');
                return;
            }
            
            // For now, just show info about the tool
            const message = `Tool: ${toolName}\nDescription: ${tool.description || 'No description'}\n\nTo test this tool, use it in chat with the function name: mcp_${serverName}_${toolName}`;
            alert(message);
            
            // In the future, this could open a parameter input dialog
        } catch (error) {
            console.error('Failed to test tool:', error);
            notificationHandler(`Failed to test tool: ${error.message}`, 'error');
        }
    }
    
    /**
     * Register all tools from a server to the function calling system
     * @param {string} serverName - Name of the server
     */
    function registerServerTools(serverName) {
        const tools = getServerTools(serverName);
        let registeredCount = 0;
        
        // Check if function calling manager exists
        if (window.FunctionCallingManager && window.FunctionCallingManager.addFunction) {
            for (const toolInfo of tools) {
                try {
                    // Add the function to the function calling system
                    window.FunctionCallingManager.addFunction(
                        toolInfo.functionName,
                        toolInfo.functionCode,
                        `MCP tool from ${serverName}`
                    );
                    registeredCount++;
                } catch (error) {
                    console.error(`Failed to register tool ${toolInfo.tool.name}:`, error);
                }
            }
            
            if (registeredCount > 0) {
                notificationHandler(`Registered ${registeredCount} tools from ${serverName}`, 'success');
            }
        } else {
            console.warn('[MCPToolsManager] FunctionCallingManager not available');
        }
    }
    
    /**
     * Unregister all tools from a server
     * @param {string} serverName - Name of the server
     */
    function unregisterServerTools(serverName) {
        const tools = getServerTools(serverName);
        let unregisteredCount = 0;
        
        if (window.FunctionCallingManager && window.FunctionCallingManager.deleteFunction) {
            for (const toolInfo of tools) {
                try {
                    window.FunctionCallingManager.deleteFunction(toolInfo.functionName);
                    unregisteredCount++;
                } catch (error) {
                    console.error(`Failed to unregister tool ${toolInfo.tool.name}:`, error);
                }
            }
            
            if (unregisteredCount > 0) {
                notificationHandler(`Unregistered ${unregisteredCount} tools from ${serverName}`, 'info');
            }
        }
    }
    
    /**
     * Get tool statistics
     * @returns {Object} Statistics about loaded tools
     */
    function getToolStats() {
        const connections = MCPClient.getActiveConnections();
        let totalTools = 0;
        let totalResources = 0;
        let totalPrompts = 0;
        const serverStats = {};
        
        for (const serverName of connections) {
            const info = MCPClient.getConnectionInfo(serverName);
            if (info) {
                const toolCount = info.tools?.length || 0;
                const resourceCount = info.resources?.length || 0;
                const promptCount = info.prompts?.length || 0;
                
                totalTools += toolCount;
                totalResources += resourceCount;
                totalPrompts += promptCount;
                
                serverStats[serverName] = {
                    tools: toolCount,
                    resources: resourceCount,
                    prompts: promptCount
                };
            }
        }
        
        return {
            totalServers: connections.length,
            totalTools,
            totalResources,
            totalPrompts,
            serverStats
        };
    }
    
    // Public API
    return {
        init,
        generateFunctionCode,
        getAllTools,
        getServerTools,
        copyToolUsage,
        copyToolFunction,
        testTool,
        registerServerTools,
        unregisterServerTools,
        getToolStats
    };
})();