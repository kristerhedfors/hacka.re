/**
 * MCP Client Service for hacka.re
 * 
 * A zero-dependency implementation of the Model Context Protocol (MCP) client
 * tailored for hacka.re's architecture. This service enables communication
 * with MCP servers to extend hacka.re's capabilities with external tools,
 * resources, and prompts.
 * 
 * Features:
 * - Pure JavaScript, no external dependencies
 * - Seamless integration with hacka.re's function calling system
 * - Support for stdio (local process) transport
 * - Automatic tool registration with hacka.re's function system
 * - Privacy-focused: all communication happens client-side
 */

window.MCPClientService = (function() {
    // Constants
    const JSONRPC_VERSION = '2.0';
    const MCP_PROTOCOL_VERSION = '0.1.0';
    const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
    const INIT_TIMEOUT_MAX_MS = 10000;
    
    // Request ID counter
    let requestIdCounter = 0;
    
    // Active connections
    const activeConnections = new Map();
    
    // Pending requests per connection
    const pendingRequests = new Map();
    
    /**
     * Generate a unique request ID
     * @returns {number} Unique request ID
     */
    function generateRequestId() {
        return ++requestIdCounter;
    }
    
    /**
     * Create a JSON-RPC request
     * @param {string} method - The method to call
     * @param {Object} params - The parameters for the method
     * @returns {Object} JSON-RPC request object
     */
    function createJsonRpcRequest(method, params = {}) {
        return {
            jsonrpc: JSONRPC_VERSION,
            id: generateRequestId(),
            method,
            params
        };
    }
    
    /**
     * Create a JSON-RPC notification (no id, no response expected)
     * @param {string} method - The method to call
     * @param {Object} params - The parameters for the method
     * @returns {Object} JSON-RPC notification object
     */
    function createJsonRpcNotification(method, params = {}) {
        return {
            jsonrpc: JSONRPC_VERSION,
            method,
            params
        };
    }
    
    /**
     * Handle incoming JSON-RPC message
     * @param {string} serverName - Name of the server
     * @param {Object} message - The JSON-RPC message
     * @param {Object} connection - The connection object
     */
    function handleMessage(serverName, message, connection) {
        if (!message || typeof message !== 'object') {
            console.error(`[MCP] Invalid message from ${serverName}:`, message);
            return;
        }
        
        // Handle response to a request
        if ('id' in message && message.id !== null) {
            const requestKey = `${serverName}-${message.id}`;
            const pending = pendingRequests.get(requestKey);
            
            if (pending) {
                clearTimeout(pending.timeoutTimer);
                pendingRequests.delete(requestKey);
                
                if (message.error) {
                    pending.reject(new Error(message.error.message || 'Unknown error'));
                } else {
                    pending.resolve(message.result);
                }
            }
            return;
        }
        
        // Handle notification
        if (message.method && !('id' in message)) {
            handleNotification(serverName, message, connection);
        }
    }
    
    /**
     * Handle server notification
     * @param {string} serverName - Name of the server
     * @param {Object} notification - The notification message
     * @param {Object} connection - The connection object
     */
    function handleNotification(serverName, notification, connection) {
        console.log(`[MCP] Notification from ${serverName}:`, notification.method, notification.params);
        
        // Handle progress notifications
        if (notification.method === '$/progress' && notification.params) {
            const { requestId, progress } = notification.params;
            if (requestId && connection.progressCallbacks && connection.progressCallbacks[requestId]) {
                connection.progressCallbacks[requestId](progress);
            }
        }
        
        // Handle logging notifications
        if (notification.method === 'notifications/message' && notification.params) {
            const { level, message } = notification.params;
            console.log(`[MCP][${serverName}][${level}] ${message}`);
        }
        
        // Notify any registered handlers
        if (connection.onNotification) {
            connection.onNotification(serverName, notification);
        }
    }
    
    /**
     * Send a request and wait for response
     * @param {string} serverName - Name of the server
     * @param {Object} connection - The connection object
     * @param {Object} request - The JSON-RPC request
     * @param {number} timeoutMs - Request timeout in milliseconds
     * @returns {Promise<any>} The response result
     */
    async function sendRequest(serverName, connection, request, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
        return new Promise((resolve, reject) => {
            const requestKey = `${serverName}-${request.id}`;
            
            // Set up timeout
            const timeoutTimer = setTimeout(() => {
                pendingRequests.delete(requestKey);
                reject(new Error(`Request timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            
            // Store pending request
            pendingRequests.set(requestKey, {
                resolve,
                reject,
                timeoutTimer
            });
            
            // Send the request
            try {
                connection.send(request);
            } catch (error) {
                clearTimeout(timeoutTimer);
                pendingRequests.delete(requestKey);
                reject(error);
            }
        });
    }
    
    /**
     * Create a stdio transport for local MCP servers via proxy
     * @param {Object} config - Transport configuration
     * @param {string} serverName - Name of the server
     * @returns {Object} Transport object
     */
    function createStdioTransport(config, serverName) {
        // Default proxy URL if not specified
        const proxyUrl = config.proxyUrl || 'http://localhost:3001';
        let eventSource = null;
        let connected = false;
        
        const transport = {
            type: 'stdio',
            send: async (message) => {
                if (!connected) {
                    throw new Error('Stdio transport not connected');
                }
                
                // Send command to proxy
                const response = await fetch(`${proxyUrl}/mcp/command`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Server-Name': serverName
                    },
                    body: JSON.stringify(message)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `HTTP error! status: ${response.status}`);
                }
            },
            close: async () => {
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }
                
                // Stop the server process
                try {
                    await fetch(`${proxyUrl}/mcp/stop`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name: serverName })
                    });
                } catch (error) {
                    console.error('[MCP] Failed to stop server:', error);
                }
                
                connected = false;
            },
            connect: async () => {
                // Check if server is already running first
                let serverAlreadyRunning = false;
                try {
                    const listResponse = await fetch(`${proxyUrl}/mcp/list`);
                    if (listResponse.ok) {
                        const data = await listResponse.json();
                        const servers = data.servers || [];
                        serverAlreadyRunning = servers.some(s => s.name === serverName);
                    }
                } catch (error) {
                    console.log('[MCP] Could not check server list, will try to start:', error.message);
                }
                
                // Only try to start the server if it's not already running
                if (!serverAlreadyRunning) {
                    const startResponse = await fetch(`${proxyUrl}/mcp/start`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: serverName,
                            command: config.command,
                            args: config.args || [],
                            env: config.env || {}
                        })
                    });
                    
                    if (!startResponse.ok) {
                        const error = await startResponse.json();
                        // If server is already running, that's OK - continue with connection
                        if (error.error && error.error.includes('already running')) {
                            console.log(`[MCP] Server ${serverName} is already running, proceeding with connection`);
                        } else {
                            throw new Error(error.error || 'Failed to start server');
                        }
                    }
                } else {
                    console.log(`[MCP] Server ${serverName} is already running, connecting to existing instance`);
                }
                
                // Connect to SSE event stream
                return new Promise((resolve, reject) => {
                    // EventSource doesn't support custom headers, so pass server name as query param
                    eventSource = new EventSource(`${proxyUrl}/mcp/events?server=${encodeURIComponent(serverName)}`);
                    
                    eventSource.addEventListener('connected', () => {
                        connected = true;
                        resolve();
                    });
                    
                    eventSource.addEventListener('message', (event) => {
                        try {
                            const message = JSON.parse(event.data);
                            if (transport.onMessage) {
                                transport.onMessage(message);
                            }
                        } catch (error) {
                            console.error('[MCP] Failed to parse message:', error);
                        }
                    });
                    
                    eventSource.addEventListener('exit', (event) => {
                        const { code, signal } = JSON.parse(event.data);
                        console.log(`[MCP] Server ${serverName} exited with code ${code}, signal ${signal}`);
                        connected = false;
                        if (transport.onClose) {
                            transport.onClose();
                        }
                    });
                    
                    eventSource.addEventListener('error', (error) => {
                        connected = false;
                        if (transport.onError) {
                            transport.onError(error);
                        }
                        reject(new Error('Failed to connect to event stream'));
                    });
                });
            },
            onMessage: null,
            onError: null,
            onClose: null
        };
        
        return transport;
    }
    
    /**
     * Create an SSE (Server-Sent Events) transport for HTTP-based MCP servers
     * @param {Object} config - Transport configuration
     * @returns {Object} Transport object
     */
    function createSseTransport(config) {
        let eventSource = null;
        const messageQueue = [];
        let connected = false;
        
        const transport = {
            type: 'sse',
            send: async (message) => {
                if (!connected) {
                    throw new Error('SSE transport not connected');
                }
                
                // Send via POST request
                const response = await fetch(config.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...config.headers
                    },
                    body: JSON.stringify(message)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            },
            close: () => {
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                    connected = false;
                }
            },
            connect: () => {
                return new Promise((resolve, reject) => {
                    eventSource = new EventSource(config.url);
                    
                    eventSource.onopen = () => {
                        connected = true;
                        resolve();
                    };
                    
                    eventSource.onmessage = (event) => {
                        try {
                            const message = JSON.parse(event.data);
                            if (transport.onMessage) {
                                transport.onMessage(message);
                            }
                        } catch (error) {
                            console.error('[MCP] Failed to parse SSE message:', error);
                        }
                    };
                    
                    eventSource.onerror = (error) => {
                        connected = false;
                        if (transport.onError) {
                            transport.onError(error);
                        }
                        reject(error);
                    };
                });
            },
            onMessage: null,
            onError: null,
            onClose: null
        };
        
        return transport;
    }
    
    /**
     * Connect to an MCP server
     * @param {string} name - Unique name for this server connection
     * @param {Object} config - Server configuration
     * @param {Object} options - Connection options
     * @returns {Promise<Object>} Connection object
     */
    async function connect(name, config, options = {}) {
        if (activeConnections.has(name)) {
            throw new Error(`Already connected to server: ${name}`);
        }
        
        console.log(`[MCP] Connecting to ${name}...`);
        
        // Create transport based on type
        let transport;
        if (config.transport.type === 'stdio') {
            transport = createStdioTransport(config.transport, name);
        } else if (config.transport.type === 'sse') {
            transport = createSseTransport(config.transport);
        } else {
            throw new Error(`Unsupported transport type: ${config.transport.type}`);
        }
        
        // Create connection object
        const connection = {
            name,
            config,
            transport,
            capabilities: {},
            tools: [],
            resources: [],
            prompts: [],
            progressCallbacks: {},
            onNotification: options.onNotification,
            send: (message) => transport.send(message)
        };
        
        // Set up message handler
        transport.onMessage = (message) => handleMessage(name, message, connection);
        transport.onError = (error) => {
            console.error(`[MCP] Transport error for ${name}:`, error);
            disconnect(name);
        };
        transport.onClose = () => {
            console.log(`[MCP] Transport closed for ${name}`);
            disconnect(name);
        };
        
        // Connect transport if needed
        if (transport.connect) {
            await transport.connect();
        }
        
        // Initialize the connection
        try {
            const initRequest = createJsonRpcRequest('initialize', {
                protocolVersion: MCP_PROTOCOL_VERSION,
                clientInfo: {
                    name: 'hacka.re-mcp-client',
                    version: '1.0.0'
                },
                capabilities: {}
            });
            
            const initResponse = await sendRequest(name, connection, initRequest, INIT_TIMEOUT_MAX_MS);
            connection.capabilities = initResponse.capabilities || {};
            
            console.log(`[MCP] Connected to ${name}, capabilities:`, connection.capabilities);
            
            // Send initialized notification
            connection.send(createJsonRpcNotification('notifications/initialized', {}));
            
            // Store the connection
            activeConnections.set(name, connection);
            
            // Fetch available tools, resources, and prompts
            await refreshServerCapabilities(name);
            
            return connection;
        } catch (error) {
            // Clean up on initialization failure
            transport.close();
            throw error;
        }
    }
    
    /**
     * Disconnect from an MCP server
     * @param {string} name - Name of the server to disconnect
     */
    async function disconnect(name) {
        const connection = activeConnections.get(name);
        if (!connection) {
            return;
        }
        
        console.log(`[MCP] Disconnecting from ${name}...`);
        
        // Remove any registered functions
        unregisterServerTools(name);
        
        // Close transport
        if (connection.transport) {
            connection.transport.close();
        }
        
        // Clean up pending requests
        for (const [key, pending] of pendingRequests.entries()) {
            if (key.startsWith(`${name}-`)) {
                clearTimeout(pending.timeoutTimer);
                pending.reject(new Error('Connection closed'));
                pendingRequests.delete(key);
            }
        }
        
        // Remove connection
        activeConnections.delete(name);
        
        console.log(`[MCP] Disconnected from ${name}`);
    }
    
    /**
     * Refresh server capabilities (tools, resources, prompts)
     * @param {string} name - Name of the server
     */
    async function refreshServerCapabilities(name) {
        const connection = activeConnections.get(name);
        if (!connection) {
            throw new Error(`Not connected to server: ${name}`);
        }
        
        try {
            // Fetch tools if supported
            if (connection.capabilities.tools) {
                const toolsRequest = createJsonRpcRequest('tools/list', {});
                const toolsResponse = await sendRequest(name, connection, toolsRequest);
                connection.tools = toolsResponse.tools || [];
                console.log(`[MCP] ${name} tools:`, connection.tools);
                
                // Register tools with hacka.re's function system
                registerServerTools(name, connection.tools);
            }
            
            // Fetch resources if supported
            if (connection.capabilities.resources) {
                const resourcesRequest = createJsonRpcRequest('resources/list', {});
                const resourcesResponse = await sendRequest(name, connection, resourcesRequest);
                connection.resources = resourcesResponse.resources || [];
                console.log(`[MCP] ${name} resources:`, connection.resources);
            }
            
            // Fetch prompts if supported
            if (connection.capabilities.prompts) {
                const promptsRequest = createJsonRpcRequest('prompts/list', {});
                const promptsResponse = await sendRequest(name, connection, promptsRequest);
                connection.prompts = promptsResponse.prompts || [];
                console.log(`[MCP] ${name} prompts:`, connection.prompts);
            }
        } catch (error) {
            console.error(`[MCP] Failed to refresh capabilities for ${name}:`, error);
        }
    }
    
    /**
     * Register MCP server tools with hacka.re's function calling system
     * @param {string} serverName - Name of the server
     * @param {Array} tools - Array of tool definitions from the server
     */
    function registerServerTools(serverName, tools) {
        if (!window.FunctionToolsService) {
            console.warn('[MCP] FunctionToolsService not available, cannot register tools');
            return;
        }
        
        const groupId = `mcp-${serverName}`;
        
        for (const tool of tools) {
            const functionName = `mcp_${serverName}_${tool.name}`;
            const functionCode = createToolFunction(serverName, tool);
            
            // Create tool definition compatible with hacka.re
            const toolDefinition = {
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
            
            // Register with hacka.re's function system
            window.FunctionToolsService.addJsFunction(
                functionName,
                functionCode,
                toolDefinition,
                groupId
            );
            
            // Enable the function by default (check it)
            window.FunctionToolsService.enableJsFunction(functionName);
            
            console.log(`[MCP] Registered and enabled tool: ${functionName}`);
        }
    }
    
    /**
     * Unregister MCP server tools from hacka.re's function calling system
     * @param {string} serverName - Name of the server
     */
    function unregisterServerTools(serverName) {
        if (!window.FunctionToolsService) {
            return;
        }
        
        const functions = window.FunctionToolsService.getJsFunctions();
        const prefix = `mcp_${serverName}_`;
        
        for (const functionName in functions) {
            if (functionName.startsWith(prefix)) {
                window.FunctionToolsService.removeJsFunction(functionName);
                console.log(`[MCP] Unregistered tool: ${functionName}`);
            }
        }
    }
    
    /**
     * Create a JavaScript function that calls an MCP tool
     * @param {string} serverName - Name of the server
     * @param {Object} tool - Tool definition
     * @returns {string} JavaScript function code
     */
    function createToolFunction(serverName, tool) {
        // Generate parameter documentation from schema
        const paramDocs = generateParameterDocs(tool.inputSchema);
        
        return `/**
 * ${tool.description || `MCP tool: ${tool.name}`}
 * @description Executes ${tool.name} tool from MCP server ${serverName}
${paramDocs}
 * @returns {Promise<Object>} Tool execution result
 * @callable
 */
async function mcp_${serverName}_${tool.name}(params) {
    try {
        // Debug: log the incoming params
        console.log(\`[MCP Function] mcp_${serverName}_${tool.name} called with params:\`, params);
        console.log(\`[MCP Function] params type:\`, typeof params);
        
        // Get the MCP client service
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { error: "MCP Client Service not available", success: false };
        }
        
        // Just pass params directly - it should already be an object
        const args = params || {};
        console.log(\`[MCP Function] args to be sent:\`, args);
        
        // Call the tool
        const result = await MCPClient.callTool('${serverName}', '${tool.name}', args);
        
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
     * @param {Object} schema - JSON schema for parameters
     * @returns {string} JSDoc parameter documentation
     */
    function generateParameterDocs(schema) {
        if (!schema || !schema.properties) {
            return ' * @param {Object} params - Tool parameters';
        }
        
        const docs = [];
        const required = new Set(schema.required || []);
        
        for (const [name, prop] of Object.entries(schema.properties)) {
            const isRequired = required.has(name);
            const type = prop.type || 'any';
            const description = prop.description || '';
            docs.push(` * @param {${type}} params.${name} ${isRequired ? '(required)' : ''} - ${description}`);
        }
        
        return docs.join('\n');
    }
    
    /**
     * Call a tool on an MCP server
     * @param {string} serverName - Name of the server
     * @param {string} toolName - Name of the tool
     * @param {Object} params - Tool parameters
     * @param {Object} options - Call options
     * @returns {Promise<any>} Tool result
     */
    async function callTool(serverName, toolName, params = {}, options = {}) {
        const connection = activeConnections.get(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }
        
        const request = createJsonRpcRequest('tools/call', {
            name: toolName,
            arguments: params
        });
        
        // Debug: log the actual arguments being sent
        console.log(`[MCP] Calling tool ${toolName} with arguments:`, params);
        console.log(`[MCP] Full request:`, request);
        
        // Set up progress callback if provided
        if (options.onProgress) {
            connection.progressCallbacks[request.id] = options.onProgress;
        }
        
        try {
            const result = await sendRequest(serverName, connection, request, options.timeout);
            return result;
        } finally {
            // Clean up progress callback
            delete connection.progressCallbacks[request.id];
        }
    }
    
    /**
     * Read a resource from an MCP server
     * @param {string} serverName - Name of the server
     * @param {string} uri - Resource URI
     * @returns {Promise<Object>} Resource content
     */
    async function readResource(serverName, uri) {
        const connection = activeConnections.get(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }
        
        const request = createJsonRpcRequest('resources/read', { uri });
        return await sendRequest(serverName, connection, request);
    }
    
    /**
     * Get a prompt from an MCP server
     * @param {string} serverName - Name of the server
     * @param {string} promptName - Name of the prompt
     * @param {Object} args - Prompt arguments
     * @returns {Promise<Object>} Prompt result
     */
    async function getPrompt(serverName, promptName, args = {}) {
        const connection = activeConnections.get(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }
        
        const request = createJsonRpcRequest('prompts/get', {
            name: promptName,
            arguments: args
        });
        return await sendRequest(serverName, connection, request);
    }
    
    /**
     * Get list of active connections
     * @returns {Array<string>} Array of server names
     */
    function getActiveConnections() {
        return Array.from(activeConnections.keys());
    }
    
    /**
     * Get connection info
     * @param {string} name - Server name
     * @returns {Object|null} Connection info or null if not connected
     */
    function getConnectionInfo(name) {
        const connection = activeConnections.get(name);
        if (!connection) {
            return null;
        }
        
        return {
            name: connection.name,
            transport: connection.config.transport.type,
            capabilities: connection.capabilities,
            tools: connection.tools.map(t => ({ name: t.name, description: t.description })),
            resources: connection.resources.map(r => ({ uri: r.uri, name: r.name })),
            prompts: connection.prompts.map(p => ({ name: p.name, description: p.description }))
        };
    }
    
    // Public API
    return {
        // Connection management
        connect,
        disconnect,
        getActiveConnections,
        getConnectionInfo,
        
        // Server interaction
        callTool,
        readResource,
        getPrompt,
        refreshServerCapabilities,
        
        // Constants
        JSONRPC_VERSION,
        MCP_PROTOCOL_VERSION,
        DEFAULT_REQUEST_TIMEOUT_MS
    };
})();