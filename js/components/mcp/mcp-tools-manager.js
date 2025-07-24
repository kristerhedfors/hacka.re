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
     * @param {string} functionName - Cleaned function name to use
     * @returns {string} JavaScript function code
     */
    function generateFunctionCode(serverName, tool, functionName) {
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
async function ${functionName}(params = {}) {
    try {
        // Use the MCP Client Service to call the tool
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            console.error('[${functionName}] MCP Client Service not available');
            return { 
                success: false, 
                error: "MCP Client Service not available" 
            };
        }
        
        // Use params directly as MCP expects an object
        const args = params;
        
        console.log('[${functionName}] Function called with params object:', params);
        console.log('[${functionName}] Args object for MCP:', args);
        console.log('[${functionName}] Calling MCP tool:', {
            serverName: '${serverName}',
            toolName: '${tool.name}',
            args: args
        });
        
        const result = await MCPClient.callTool('${serverName}', '${tool.name}', args);
        
        console.log('[${functionName}] MCP tool result:', result);
        
        return {
            success: true,
            result: result
        };
    } catch (error) {
        console.error('[${functionName}] MCP tool error:', error);
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
                    const sanitizedName = tool.name.replace(/-/g, '_');
                    tools.push({
                        serverName,
                        tool,
                        functionName: sanitizedName,
                        functionCode: generateFunctionCode(serverName, tool, sanitizedName)
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
        
        return info.tools.map(tool => {
            const sanitizedName = tool.name.replace(/-/g, '_');
            return {
                serverName,
                tool,
                functionName: sanitizedName,
                functionCode: generateFunctionCode(serverName, tool, sanitizedName)
            };
        });
    }
    
    /**
     * Copy tool usage example to clipboard
     * @param {string} serverName - Name of the server
     * @param {string} toolName - Name of the tool
     */
    function copyToolUsage(serverName, toolName) {
        const functionName = toolName.replace(/-/g, '_');
        const usage = `${functionName}({ /* parameters */ })`;  // Note: MCP tool from ${serverName}
        
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
        
        const sanitizedName = tool.name.replace(/-/g, '_');
        const functionCode = generateFunctionCode(serverName, tool, sanitizedName);
        
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
            const message = `Tool: ${toolName}\nDescription: ${tool.description || 'No description'}\n\nTo test this tool, use it in chat with the function name: ${toolName}\n\nNote: This is an MCP tool from server "${serverName}"`;
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
        const functionCallingManager = window.functionCallingManager || 
                                     (window.aiHackare && window.aiHackare.functionCallingManager);
        if (functionCallingManager && functionCallingManager.addFunction) {
            for (const toolInfo of tools) {
                try {
                    // Check if function already exists and remove it if it's from the same MCP server
                    if (functionCallingManager.hasFunction && functionCallingManager.hasFunction(toolInfo.functionName)) {
                        // Check if it's an MCP function from the same server by looking at the collection
                        const functions = FunctionToolsService.getJsFunctions();
                        const functionCollections = FunctionToolsService.getFunctionCollections ? FunctionToolsService.getFunctionCollections() : {};
                        const existingCollectionId = functionCollections[toolInfo.functionName];
                        const expectedCollectionId = `mcp_${serverName}_collection`;
                        
                        if (existingCollectionId === expectedCollectionId || existingCollectionId === 'mcp_tools_collection') {
                            // Remove the existing MCP function from same server to re-register with updated code
                            FunctionToolsService.removeJsFunction(toolInfo.functionName);
                            console.log(`Removed existing MCP function "${toolInfo.functionName}" from ${serverName} for re-registration`);
                        } else {
                            throw new Error(`Function name collision: "${toolInfo.functionName}" already exists from different source (collection: ${existingCollectionId})`);
                        }
                    }
                    
                    // Create proper tool definition with inputSchema
                    const toolDefinition = {
                        type: 'function',
                        function: {
                            name: toolInfo.functionName,
                            description: toolInfo.tool.description || `MCP tool ${toolInfo.tool.name} from ${serverName}`,
                            parameters: toolInfo.tool.inputSchema || {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        }
                    };
                    
                    // Add the function to the function calling system with custom tool definition
                    // Pass serverName to create server-specific collections
                    functionCallingManager.addFunction(
                        toolInfo.functionName,
                        toolInfo.functionCode,
                        `MCP tool from ${serverName}`,
                        toolDefinition,
                        serverName
                    );
                    registeredCount++;
                } catch (error) {
                    console.error(`Failed to register tool ${toolInfo.tool.name}:`, error);
                    // Re-throw name collision errors to stop registration
                    if (error.message.includes('Function name collision')) {
                        notificationHandler(`Error: ${error.message}`, 'error');
                        throw error;
                    }
                }
            }
            
            if (registeredCount > 0) {
                notificationHandler(`Registered ${registeredCount} tools from ${serverName}`, 'success');
            }
        } else {
            console.warn('[MCPToolsManager] FunctionCallingManager not available', {
                'window.functionCallingManager': !!window.functionCallingManager,
                'window.aiHackare': !!window.aiHackare,
                'aiHackare.functionCallingManager': !!(window.aiHackare && window.aiHackare.functionCallingManager)
            });
        }
    }
    
    /**
     * Unregister all tools from a server
     * @param {string} serverName - Name of the server
     */
    function unregisterServerTools(serverName) {
        const tools = getServerTools(serverName);
        
        if (tools.length === 0) {
            console.log(`No tools found for server ${serverName} to unregister`);
            return;
        }
        
        // Use FunctionToolsService to remove the entire server collection at once
        if (window.FunctionToolsService && window.FunctionToolsService.removeJsFunction) {
            try {
                // Remove just the first function - this will remove the entire server collection
                // since all functions from the same server share the same collection ID
                const firstTool = tools[0];
                const functions = window.FunctionToolsService.getJsFunctions();
                
                if (functions[firstTool.functionName]) {
                    console.log(`Removing entire MCP server collection for "${serverName}" by removing function: ${firstTool.functionName}`);
                    window.FunctionToolsService.removeJsFunction(firstTool.functionName);
                    
                    notificationHandler(`Unregistered all tools from ${serverName}`, 'info');
                    console.log(`Successfully unregistered all MCP tools from ${serverName}`);
                } else {
                    console.log(`No functions found for server ${serverName} in registry`);
                }
            } catch (error) {
                console.error(`Failed to unregister tools from server ${serverName}:`, error);
            }
        } else {
            console.warn('[MCPToolsManager] FunctionToolsService not available for unregistering tools');
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