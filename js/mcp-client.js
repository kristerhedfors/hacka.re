/**
 * MCP Client Module for hacka.re
 * 
 * This module implements a client for the Model Context Protocol (MCP),
 * allowing hacka.re to communicate with MCP servers that provide additional tools.
 * 
 * Since hacka.re is a client-side application with no server-side components,
 * this implementation uses "static" MCP servers that are defined entirely in the browser.
 */

window.McpClient = (function() {
    /**
     * Create an MCP client instance
     * @param {Object} options - Configuration options
     * @returns {Object} MCP client instance
     */
    function createMcpClient(options = {}) {
        // Available tools from all connected servers
        const availableTools = [];
        
        // Map of tool names to their handlers
        const toolHandlers = new Map();
        
        // Map of server names to server instances
        const servers = new Map();
        
        /**
         * Connect to a static MCP server
         * @param {Object} serverDefinition - The server definition object
         * @returns {Promise<void>}
         */
        async function connectToStaticServer(serverDefinition) {
            if (!serverDefinition || !serverDefinition.name || !Array.isArray(serverDefinition.tools)) {
                throw new Error('Invalid server definition');
            }
            
            // Store the server
            servers.set(serverDefinition.name, serverDefinition);
            
            console.log(`Connected to MCP server: ${serverDefinition.name}`);
            console.log(`Available tools: ${serverDefinition.tools.map(t => t.name).join(', ')}`);
            
            // Register tools from the server
            for (const tool of serverDefinition.tools) {
                availableTools.push({
                    type: "function",
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema
                    }
                });
                
                // Store the tool handler
                toolHandlers.set(tool.name, tool.handler);
            }
        }
        
        /**
         * Process a single tool call
         * @param {Object} toolCall - The tool call object
         * @returns {Promise<Object>} The tool result
         */
        async function processToolCall(toolCall) {
            const toolName = toolCall.function.name;
            const handler = toolHandlers.get(toolName);
            
            if (!handler) {
                return {
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolName,
                    content: JSON.stringify({ error: `No handler found for tool: ${toolName}` })
                };
            }
            
            try {
                const args = JSON.parse(toolCall.function.arguments || '{}');
                const result = await handler(args);
                
                return {
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolName,
                    content: JSON.stringify(result)
                };
            } catch (error) {
                console.error(`Error executing MCP tool "${toolName}":`, error);
                
                return {
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolName,
                    content: JSON.stringify({ error: error.message })
                };
            }
        }
        
        /**
         * Process multiple tool calls
         * @param {Array} toolCalls - Array of tool calls
         * @returns {Promise<Array>} Array of tool results
         */
        async function processToolCalls(toolCalls) {
            if (!toolCalls || toolCalls.length === 0) {
                return [];
            }
            
            const results = [];
            
            for (const toolCall of toolCalls) {
                try {
                    const result = await processToolCall(toolCall);
                    results.push(result);
                } catch (error) {
                    console.error('Error processing MCP tool call:', error);
                    
                    // Add error result
                    results.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: toolCall.function.name,
                        content: JSON.stringify({ error: error.message })
                    });
                }
            }
            
            return results;
        }
        
        /**
         * Get all available tools from connected servers
         * @returns {Array} Array of tool definitions
         */
        function getAvailableTools() {
            return [...availableTools];
        }
        
        /**
         * Get all connected servers
         * @returns {Array} Array of server names
         */
        function getConnectedServers() {
            return Array.from(servers.keys());
        }
        
        /**
         * Clean up resources
         * @returns {Promise<void>}
         */
        async function cleanup() {
            // Clear all maps
            availableTools.length = 0;
            toolHandlers.clear();
            servers.clear();
        }
        
        // Public API
        return {
            connectToStaticServer,
            processToolCall,
            processToolCalls,
            getAvailableTools,
            getConnectedServers,
            cleanup
        };
    }
    
    // Public API
    return {
        createMcpClient
    };
})();

/**
 * Static MCP Server Module for hacka.re
 * 
 * This module provides a way to create "static" MCP servers that are defined
 * entirely in the browser, with no server-side components.
 */
window.StaticMcpServer = (function() {
    /**
     * Create a static MCP server
     * @param {string} name - The name of the server
     * @param {string} description - The description of the server
     * @returns {Object} Static MCP server instance
     */
    function createStaticServer(name, description) {
        if (!name) {
            throw new Error('Server name is required');
        }
        
        return {
            name,
            description: description || `Static MCP server: ${name}`,
            tools: []
        };
    }
    
    /**
     * Add a tool to a static server
     * @param {Object} server - The server instance
     * @param {string} name - The name of the tool
     * @param {string} description - The description of the tool
     * @param {Object} inputSchema - The JSON Schema for the tool's input
     * @param {Function} handler - The function that handles tool execution
     */
    function addTool(server, name, description, inputSchema, handler) {
        if (!server || !Array.isArray(server.tools)) {
            throw new Error('Invalid server instance');
        }
        
        if (!name || !description || !inputSchema || typeof handler !== 'function') {
            throw new Error('Invalid tool definition');
        }
        
        server.tools.push({
            name,
            description,
            inputSchema,
            handler
        });
    }
    
    // Public API
    return {
        createStaticServer,
        addTool
    };
})();

/**
 * MCP Integration with ApiToolsService
 * 
 * This code extends the ApiToolsService to work with MCP tools.
 */
(function() {
    // Wait for DOM content to be loaded to ensure ApiToolsService is available
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof ApiToolsService === 'undefined') {
            console.error('ApiToolsService is not available. MCP integration will not work.');
            return;
        }
        
        // Global MCP client instance
        window.mcpClient = null;
        
        // Initialize MCP client
        function initMcpClient() {
            if (window.mcpClient) {
                // Clean up existing client
                window.mcpClient.cleanup();
            }
            
            // Create new client
            window.mcpClient = McpClient.createMcpClient();
            
            console.log('MCP client initialized');
        }
        
        // Register MCP tool with ApiToolsService
        function registerMcpTool() {
            // Register a special tool to initialize MCP
            ApiToolsService.registerTool(
                "mcp_init",
                {
                    type: "function",
                    function: {
                        name: "mcp_init",
                        description: "Initialize the MCP client and connect to static servers",
                        parameters: {
                            type: "object",
                            properties: {
                                server: {
                                    type: "string",
                                    description: "The name of the server to connect to"
                                }
                            },
                            required: ["server"]
                        }
                    }
                },
                async function(args) {
                    const { server } = args;
                    
                    if (!window.mcpClient) {
                        initMcpClient();
                    }
                    
                    // Find the server in the registry
                    const serverRegistry = window.MCP_SERVER_REGISTRY || {};
                    const serverDef = serverRegistry[server];
                    
                    if (!serverDef) {
                        return {
                            error: `Server "${server}" not found in registry`,
                            available_servers: Object.keys(serverRegistry)
                        };
                    }
                    
                    try {
                        await window.mcpClient.connectToStaticServer(serverDef);
                        
                        return {
                            success: true,
                            server: server,
                            tools: serverDef.tools.map(t => t.name)
                        };
                    } catch (error) {
                        return {
                            error: `Failed to connect to server "${server}": ${error.message}`
                        };
                    }
                }
            );
        }
        
        // Store the original getToolDefinitions method
        const originalGetToolDefinitions = ApiToolsService.getToolDefinitions;
        
        // Override getToolDefinitions to include MCP tools
        ApiToolsService.getToolDefinitions = function() {
            const tools = originalGetToolDefinitions();
            
            // Add MCP tools if available
            if (window.mcpClient) {
                const mcpTools = window.mcpClient.getAvailableTools();
                if (mcpTools.length > 0) {
                    tools.push(...mcpTools);
                }
            }
            
            return tools;
        };
        
        // Store the original processToolCalls method
        const originalProcessToolCalls = ApiToolsService.processToolCalls;
        
        // Override processToolCalls to handle MCP tools
        ApiToolsService.processToolCalls = async function(toolCalls) {
            if (!toolCalls || toolCalls.length === 0) {
                return [];
            }
            
            const results = [];
            const mcpToolCalls = [];
            const regularToolCalls = [];
            
            // Separate MCP tool calls from regular tool calls
            for (const toolCall of toolCalls) {
                const toolName = toolCall.function.name;
                
                // Check if it's an MCP tool
                if (window.mcpClient && 
                    window.mcpClient.getAvailableTools().some(tool => tool.function.name === toolName)) {
                    mcpToolCalls.push(toolCall);
                } else {
                    regularToolCalls.push(toolCall);
                }
            }
            
            // Process regular tool calls
            if (regularToolCalls.length > 0) {
                const regularResults = await originalProcessToolCalls(regularToolCalls);
                results.push(...regularResults);
            }
            
            // Process MCP tool calls
            if (mcpToolCalls.length > 0 && window.mcpClient) {
                const mcpResults = await window.mcpClient.processToolCalls(mcpToolCalls);
                results.push(...mcpResults);
            }
            
            return results;
        };
        
        // Initialize MCP integration
        initMcpClient();
        registerMcpTool();
        
        console.log('MCP integration with ApiToolsService initialized');
    });
})();

// Global registry for MCP servers
window.MCP_SERVER_REGISTRY = {};
