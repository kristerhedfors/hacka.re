/**
 * MCP Tool Registry for hacka.re
 * 
 * Manages the registration and integration of MCP server tools with
 * hacka.re's function calling system. Handles tool discovery, registration,
 * code generation, and cleanup.
 * 
 * Features:
 * - Automatic tool registration with hacka.re's function system
 * - Dynamic function code generation from tool schemas
 * - Tool grouping by MCP server
 * - Parameter documentation generation from JSON schemas
 * - Tool lifecycle management (register/unregister)
 */

/**
 * Tool registry for managing MCP tools integration with hacka.re
 * 
 * This class handles the integration between MCP server tools and hacka.re's
 * function calling system, automatically generating JavaScript functions
 * that can be called by AI models.
 */
class ToolRegistry {
    constructor() {
        this.registeredTools = new Map();
    }

    /**
     * Register MCP server tools with hacka.re's function calling system
     * @param {string} serverName - Name of the MCP server
     * @param {Array} tools - Array of tool definitions from the server
     * @param {Object} serverConfig - Server configuration for metadata
     */
    registerServerTools(serverName, tools, serverConfig = {}) {
        if (!window.FunctionToolsService) {
            console.warn('[MCP Tool Registry] FunctionToolsService not available, cannot register tools');
            return;
        }

        const sanitizedServerName = this._sanitizeServerName(serverName);
        const groupId = `mcp-${serverName}-${Date.now()}`;
        const groupMetadata = this._createGroupMetadata(serverName, tools, serverConfig);

        let firstTool = true;
        const registeredNames = [];
        const existingFunctions = new Set();
        
        // Check for existing function names across all registered tools
        for (const [otherServer, otherTools] of this.registeredTools.entries()) {
            if (otherServer !== serverName) {
                otherTools.forEach(name => existingFunctions.add(name));
            }
        }
        
        // Also check for existing functions in the function tools service
        if (window.FunctionToolsService && window.FunctionToolsService.getAllFunctions) {
            const allFunctions = window.FunctionToolsService.getAllFunctions();
            Object.keys(allFunctions).forEach(name => existingFunctions.add(name));
        }

        for (const tool of tools) {
            try {
                const functionName = this._generateFunctionName(sanitizedServerName, tool.name);
                
                // Check for name collision
                if (existingFunctions.has(functionName)) {
                    throw new Error(`Function name collision: "${functionName}" already exists. ` +
                        `The tool "${tool.name}" from MCP server "${serverName}" conflicts with an existing function.`);
                }
                
                const functionCode = this._createToolFunction(serverName, functionName, tool);
                const toolDefinition = this._createToolDefinition(functionName, tool, serverName);

                window.FunctionToolsService.addJsFunction(
                    functionName,
                    functionCode,
                    toolDefinition,
                    groupId,
                    firstTool ? groupMetadata : null
                );

                firstTool = false;
                window.FunctionToolsService.enableJsFunction(functionName);
                registeredNames.push(functionName);
                existingFunctions.add(functionName);
                console.log(`[MCP Tool Registry] Registered and enabled tool: ${functionName} (original: ${tool.name})`);
            } catch (error) {
                console.error(`[MCP Tool Registry] Failed to register tool ${tool.name}:`, error);
                // Re-throw the error to stop registration if it's a name collision
                if (error.message.includes('Function name collision')) {
                    throw error;
                }
            }
        }

        this.registeredTools.set(serverName, registeredNames);
        console.log(`[MCP Tool Registry] Registered ${registeredNames.length} tools for server ${serverName}`);
    }

    /**
     * Unregister MCP server tools from hacka.re's function calling system
     * @param {string} serverName - Name of the MCP server
     */
    unregisterServerTools(serverName) {
        if (!window.FunctionToolsService) {
            return;
        }

        const registeredNames = this.registeredTools.get(serverName);
        if (registeredNames) {
            for (const functionName of registeredNames) {
                try {
                    window.FunctionToolsService.removeJsFunction(functionName);
                    console.log(`[MCP Tool Registry] Unregistered tool: ${functionName}`);
                } catch (error) {
                    console.error(`[MCP Tool Registry] Failed to unregister tool ${functionName}:`, error);
                }
            }
            this.registeredTools.delete(serverName);
            console.log(`[MCP Tool Registry] Unregistered all tools for server ${serverName}`);
        }
    }

    /**
     * Get the list of registered tools for a server
     * @param {string} serverName - Name of the MCP server
     * @returns {Array<string>} Array of registered function names
     */
    getRegisteredTools(serverName) {
        return this.registeredTools.get(serverName) || [];
    }

    /**
     * Get all registered servers
     * @returns {Array<string>} Array of server names
     */
    getRegisteredServers() {
        return Array.from(this.registeredTools.keys());
    }

    /**
     * Check if a server has registered tools
     * @param {string} serverName - Name of the MCP server
     * @returns {boolean} True if server has registered tools
     */
    hasRegisteredTools(serverName) {
        return this.registeredTools.has(serverName) && 
               this.registeredTools.get(serverName).length > 0;
    }

    /**
     * Get total count of registered tools across all servers
     * @returns {number} Total number of registered tools
     */
    getTotalToolCount() {
        let total = 0;
        for (const tools of this.registeredTools.values()) {
            total += tools.length;
        }
        return total;
    }

    /**
     * Sanitize server name for use in function names
     * @param {string} serverName - Original server name
     * @returns {string} Sanitized server name
     * @private
     */
    _sanitizeServerName(serverName) {
        return serverName.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    /**
     * Generate a function name for a tool (preserving original name)
     * @param {string} sanitizedServerName - Sanitized server name (unused but kept for compatibility)
     * @param {string} toolName - Original tool name
     * @returns {string} Sanitized tool name without prefix
     * @private
     */
    _generateFunctionName(sanitizedServerName, toolName) {
        // Only sanitize characters that are invalid in JavaScript function names
        // but preserve the original tool name without prefixing
        const sanitizedToolName = toolName.replace(/[^a-zA-Z0-9_$]/g, '_');
        return sanitizedToolName;
    }

    /**
     * Create group metadata for tool organization
     * @param {string} serverName - Name of the MCP server
     * @param {Array} tools - Array of tool definitions
     * @param {Object} serverConfig - Server configuration
     * @returns {Object} Group metadata object
     * @private
     */
    _createGroupMetadata(serverName, tools, serverConfig) {
        let mcpCommand = serverName;
        if (serverConfig.transport) {
            const transport = serverConfig.transport;
            if (transport.command && transport.args) {
                mcpCommand = `${transport.command} ${transport.args.join(' ')}`;
            }
        }

        return {
            name: `MCP: ${serverName}`,
            createdAt: new Date().toISOString(),
            source: 'mcp',
            mcpServer: serverName,
            mcpCommand: mcpCommand,
            toolCount: tools.length
        };
    }

    /**
     * Create tool definition for hacka.re's function system
     * @param {string} functionName - Generated function name
     * @param {Object} tool - Tool definition from MCP server
     * @param {string} serverName - Name of the MCP server
     * @returns {Object} Tool definition object
     * @private
     */
    _createToolDefinition(functionName, tool, serverName) {
        return {
            type: 'function',
            function: {
                name: functionName,
                description: tool.description || `MCP tool from ${serverName}`,
                parameters: tool.inputSchema || {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        };
    }

    /**
     * Create a JavaScript function that calls an MCP tool
     * @param {string} serverName - Name of the MCP server
     * @param {string} functionName - Generated function name
     * @param {Object} tool - Tool definition from MCP server
     * @returns {string} Generated JavaScript function code
     * @private
     */
    _createToolFunction(serverName, functionName, tool) {
        const paramDocs = this._generateParameterDocs(tool.inputSchema);
        const paramNames = tool.inputSchema?.properties ? Object.keys(tool.inputSchema.properties) : [];
        const paramDeclaration = paramNames.length > 0 ? paramNames.join(', ') : '';

        return `/**
 * ${tool.description || `MCP tool: ${tool.name}`}
 * @description Executes ${tool.name} tool from MCP server ${serverName}
${paramDocs}
 * @returns {Promise<Object>} Tool execution result
 * @callable
 */
async function ${functionName}(${paramDeclaration}) {
    try {
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { error: "MCP Client Service not available", success: false };
        }
        
        const params = {};
        ${paramNames.map((paramName) => `
        if (typeof ${paramName} !== 'undefined') {
            params['${paramName}'] = ${paramName};
        }`).join('')}
        
        console.log(\`[MCP Function] ${functionName} called with params:\`, params);
        
        const activeConnections = MCPClient.getActiveConnections();
        console.log('[MCP Function] Available server connections:', activeConnections);
        console.log('[MCP Function] Trying to call server:', '${serverName}');
        console.log('[MCP Function] Function name being used:', '${functionName}');
        
        const result = await MCPClient.callTool('${serverName}', '${tool.name}', params);
        
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
     * Generate parameter documentation from JSON schema
     * @param {Object} schema - JSON schema for tool parameters
     * @returns {string} Generated parameter documentation
     * @private
     */
    _generateParameterDocs(schema) {
        if (!schema || !schema.properties) {
            return ' * @param {Object} params - Tool parameters';
        }

        const docs = [];
        const required = new Set(schema.required || []);

        for (const [name, prop] of Object.entries(schema.properties)) {
            const isRequired = required.has(name);
            const type = prop.type || 'any';
            const description = prop.description || '';
            docs.push(` * @param {${type}} ${name} ${isRequired ? '(required)' : ''} - ${description}`);
        }

        return docs.join('\n');
    }
}

// Export the tool registry
window.MCPToolRegistry = {
    ToolRegistry
};