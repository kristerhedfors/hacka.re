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

// Constants
const JSONRPC_VERSION = '2.0';
const MCP_PROTOCOL_VERSION = '0.1.0';
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const INIT_TIMEOUT_MAX_MS = 10000;

/**
 * Custom error classes for better error handling
 */
class MCPError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'MCPError';
        this.code = code;
    }
}

class MCPTransportError extends MCPError {
    constructor(message, code = null) {
        super(message, code);
        this.name = 'MCPTransportError';
    }
}

class MCPConnectionError extends MCPError {
    constructor(message, code = null) {
        super(message, code);
        this.name = 'MCPConnectionError';
    }
}

/**
 * Base transport class
 */
class Transport {
    constructor() {
        this.onMessage = null;
        this.onError = null;
        this.onClose = null;
    }

    async connect() {
        throw new Error('connect() must be implemented by subclass');
    }

    async send(message) {
        throw new Error('send() must be implemented by subclass');
    }

    async close() {
        throw new Error('close() must be implemented by subclass');
    }
}

/**
 * Stdio transport for local MCP servers via proxy
 */
class StdioTransport extends Transport {
    constructor(config, serverName) {
        super();
        this.config = config;
        this.serverName = serverName;
        this.proxyUrl = config.proxyUrl || 'http://localhost:3001';
        this.eventSource = null;
        this.connected = false;
    }

    async connect() {
        try {
            await this._checkAndStartServer();
            await this._connectEventStream();
        } catch (error) {
            throw new MCPTransportError(`Failed to connect stdio transport: ${error.message}`);
        }
    }

    async _checkAndStartServer() {
        let serverAlreadyRunning = false;
        try {
            const listResponse = await fetch(`${this.proxyUrl}/mcp/list`);
            if (listResponse.ok) {
                const data = await listResponse.json();
                const servers = data.servers || [];
                serverAlreadyRunning = servers.some(s => s.name === this.serverName);
            }
        } catch (error) {
            console.log('[MCP] Could not check server list, will try to start:', error.message);
        }

        if (!serverAlreadyRunning) {
            const startResponse = await fetch(`${this.proxyUrl}/mcp/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: this.serverName,
                    command: this.config.command,
                    args: this.config.args || [],
                    env: this.config.env || {}
                })
            });

            if (!startResponse.ok) {
                const error = await startResponse.json();
                if (error.error && error.error.includes('already running')) {
                    console.log(`[MCP] Server ${this.serverName} is already running, proceeding with connection`);
                } else {
                    throw new Error(error.error || 'Failed to start server');
                }
            }
        } else {
            console.log(`[MCP] Server ${this.serverName} is already running, connecting to existing instance`);
        }
    }

    async _connectEventStream() {
        return new Promise((resolve, reject) => {
            this.eventSource = new EventSource(`${this.proxyUrl}/mcp/events?server=${encodeURIComponent(this.serverName)}`);

            this.eventSource.addEventListener('connected', () => {
                this.connected = true;
                resolve();
            });

            this.eventSource.addEventListener('message', (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (this.onMessage) {
                        this.onMessage(message);
                    }
                } catch (error) {
                    console.error('[MCP] Failed to parse message:', error);
                }
            });

            this.eventSource.addEventListener('exit', (event) => {
                const { code, signal } = JSON.parse(event.data);
                console.log(`[MCP] Server ${this.serverName} exited with code ${code}, signal ${signal}`);
                this.connected = false;
                if (this.onClose) {
                    this.onClose();
                }
            });

            this.eventSource.addEventListener('error', (error) => {
                this.connected = false;
                if (this.onError) {
                    this.onError(error);
                }
                reject(new MCPTransportError('Failed to connect to event stream'));
            });
        });
    }

    async send(message) {
        if (!this.connected) {
            throw new MCPTransportError('Stdio transport not connected');
        }

        const response = await fetch(`${this.proxyUrl}/mcp/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Server-Name': this.serverName
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new MCPTransportError(error.error || `HTTP error! status: ${response.status}`);
        }
    }

    async close() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        try {
            await fetch(`${this.proxyUrl}/mcp/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: this.serverName })
            });
        } catch (error) {
            console.error('[MCP] Failed to stop server:', error);
        }

        this.connected = false;
    }
}

/**
 * SSE transport for HTTP-based MCP servers
 */
class SseTransport extends Transport {
    constructor(config) {
        super();
        this.config = config;
        this.eventSource = null;
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.eventSource = new EventSource(this.config.url);

            this.eventSource.onopen = () => {
                this.connected = true;
                resolve();
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (this.onMessage) {
                        this.onMessage(message);
                    }
                } catch (error) {
                    console.error('[MCP] Failed to parse SSE message:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                this.connected = false;
                if (this.onError) {
                    this.onError(error);
                }
                reject(new MCPTransportError('SSE connection failed'));
            };
        });
    }

    async send(message) {
        if (!this.connected) {
            throw new MCPTransportError('SSE transport not connected');
        }

        const response = await fetch(this.config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.config.headers
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            throw new MCPTransportError(`HTTP error! status: ${response.status}`);
        }
    }

    close() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.connected = false;
        }
    }
}

/**
 * JSON-RPC request manager
 */
class RequestManager {
    constructor() {
        this.requestIdCounter = 0;
        this.pendingRequests = new Map();
    }

    generateRequestId() {
        return ++this.requestIdCounter;
    }

    createJsonRpcRequest(method, params = {}) {
        return {
            jsonrpc: JSONRPC_VERSION,
            id: this.generateRequestId(),
            method,
            params
        };
    }

    createJsonRpcNotification(method, params = {}) {
        return {
            jsonrpc: JSONRPC_VERSION,
            method,
            params
        };
    }

    async sendRequest(serverName, connection, request, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
        return new Promise((resolve, reject) => {
            const requestKey = `${serverName}-${request.id}`;

            const timeoutTimer = setTimeout(() => {
                this.pendingRequests.delete(requestKey);
                reject(new MCPError(`Request timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            this.pendingRequests.set(requestKey, {
                resolve,
                reject,
                timeoutTimer
            });

            try {
                connection.send(request);
            } catch (error) {
                clearTimeout(timeoutTimer);
                this.pendingRequests.delete(requestKey);
                reject(error);
            }
        });
    }

    handleResponse(serverName, message) {
        if ('id' in message && message.id !== null) {
            const requestKey = `${serverName}-${message.id}`;
            const pending = this.pendingRequests.get(requestKey);

            if (pending) {
                clearTimeout(pending.timeoutTimer);
                this.pendingRequests.delete(requestKey);

                if (message.error) {
                    pending.reject(new MCPError(message.error.message || 'Unknown error', message.error.code));
                } else {
                    pending.resolve(message.result);
                }
                return true;
            }
        }
        return false;
    }

    clearPendingRequests(serverName) {
        for (const [key, pending] of this.pendingRequests.entries()) {
            if (key.startsWith(`${serverName}-`)) {
                clearTimeout(pending.timeoutTimer);
                pending.reject(new MCPConnectionError('Connection closed'));
                this.pendingRequests.delete(key);
            }
        }
    }
}

window.MCPClientService = (function() {
    // Active connections
    const activeConnections = new Map();
    
    // Request manager
    const requestManager = new RequestManager();
    
    /**
     * Tool registry for managing MCP tools integration with hacka.re
     */
    class ToolRegistry {
        constructor() {
            this.registeredTools = new Map();
        }

        /**
         * Register MCP server tools with hacka.re's function calling system
         */
        registerServerTools(serverName, tools) {
            if (!window.FunctionToolsService) {
                console.warn('[MCP] FunctionToolsService not available, cannot register tools');
                return;
            }

            const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9_]/g, '_');
            const groupId = `mcp-${serverName}-${Date.now()}`;

            const connection = activeConnections.get(serverName);
            let mcpCommand = serverName;
            if (connection && connection.config && connection.config.transport) {
                const transport = connection.config.transport;
                if (transport.command && transport.args) {
                    mcpCommand = `${transport.command} ${transport.args.join(' ')}`;
                }
            }

            const groupMetadata = {
                name: `MCP: ${serverName}`,
                createdAt: new Date().toISOString(),
                source: 'mcp',
                mcpServer: serverName,
                mcpCommand: mcpCommand,
                toolCount: tools.length
            };

            let firstTool = true;
            const registeredNames = [];

            for (const tool of tools) {
                const functionName = `${sanitizedServerName}_${tool.name}`.replace(/[^a-zA-Z0-9_$]/g, '_');
                const functionCode = this._createToolFunction(serverName, functionName, tool);

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
                console.log(`[MCP] Registered and enabled tool: ${functionName}`);
            }

            this.registeredTools.set(serverName, registeredNames);
        }

        /**
         * Unregister MCP server tools from hacka.re's function calling system
         */
        unregisterServerTools(serverName) {
            if (!window.FunctionToolsService) {
                return;
            }

            const registeredNames = this.registeredTools.get(serverName);
            if (registeredNames) {
                for (const functionName of registeredNames) {
                    window.FunctionToolsService.removeJsFunction(functionName);
                    console.log(`[MCP] Unregistered tool: ${functionName}`);
                }
                this.registeredTools.delete(serverName);
            }
        }

        /**
         * Create a JavaScript function that calls an MCP tool
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
                docs.push(` * @param {${type}} params.${name} ${isRequired ? '(required)' : ''} - ${description}`);
            }

            return docs.join('\n');
        }
    }

    /**
     * Connection class to encapsulate connection state and methods
     */
    class Connection {
        constructor(name, config, transport, options = {}) {
            this.name = name;
            this.config = config;
            this.transport = transport;
            this.capabilities = {};
            this.tools = [];
            this.resources = [];
            this.prompts = [];
            this.progressCallbacks = {};
            this.onNotification = options.onNotification;
        }

        async send(message) {
            return this.transport.send(message);
        }

        async initialize() {
            const initRequest = requestManager.createJsonRpcRequest('initialize', {
                protocolVersion: MCP_PROTOCOL_VERSION,
                clientInfo: {
                    name: 'hacka.re-mcp-client',
                    version: '1.0.0'
                },
                capabilities: {}
            });

            const initResponse = await requestManager.sendRequest(this.name, this, initRequest, INIT_TIMEOUT_MAX_MS);
            this.capabilities = initResponse.capabilities || {};

            console.log(`[MCP] Connected to ${this.name}, capabilities:`, this.capabilities);

            await this.send(requestManager.createJsonRpcNotification('notifications/initialized', {}));
        }

        async refreshCapabilities() {
            try {
                if (this.capabilities.tools) {
                    const toolsRequest = requestManager.createJsonRpcRequest('tools/list', {});
                    const toolsResponse = await requestManager.sendRequest(this.name, this, toolsRequest);
                    this.tools = toolsResponse.tools || [];
                    console.log(`[MCP] ${this.name} tools:`, this.tools);
                    toolRegistry.registerServerTools(this.name, this.tools);
                }

                if (this.capabilities.resources) {
                    const resourcesRequest = requestManager.createJsonRpcRequest('resources/list', {});
                    const resourcesResponse = await requestManager.sendRequest(this.name, this, resourcesRequest);
                    this.resources = resourcesResponse.resources || [];
                    console.log(`[MCP] ${this.name} resources:`, this.resources);
                }

                if (this.capabilities.prompts) {
                    const promptsRequest = requestManager.createJsonRpcRequest('prompts/list', {});
                    const promptsResponse = await requestManager.sendRequest(this.name, this, promptsRequest);
                    this.prompts = promptsResponse.prompts || [];
                    console.log(`[MCP] ${this.name} prompts:`, this.prompts);
                }
            } catch (error) {
                console.error(`[MCP] Failed to refresh capabilities for ${this.name}:`, error);
            }
        }

        async callTool(toolName, params = {}, options = {}) {
            const request = requestManager.createJsonRpcRequest('tools/call', {
                name: toolName,
                arguments: params
            });

            console.log(`[MCP] Calling tool ${toolName} with arguments:`, params);
            console.log(`[MCP] Full request:`, request);

            if (options.onProgress) {
                this.progressCallbacks[request.id] = options.onProgress;
            }

            try {
                const result = await requestManager.sendRequest(this.name, this, request, options.timeout);
                return result;
            } finally {
                delete this.progressCallbacks[request.id];
            }
        }

        async readResource(uri) {
            const request = requestManager.createJsonRpcRequest('resources/read', { uri });
            return await requestManager.sendRequest(this.name, this, request);
        }

        async getPrompt(promptName, args = {}) {
            const request = requestManager.createJsonRpcRequest('prompts/get', {
                name: promptName,
                arguments: args
            });
            return await requestManager.sendRequest(this.name, this, request);
        }

        close() {
            if (this.transport) {
                this.transport.close();
            }
        }

        getInfo() {
            return {
                name: this.name,
                transport: this.config.transport.type,
                capabilities: this.capabilities,
                tools: this.tools.map(t => ({ name: t.name, description: t.description })),
                resources: this.resources.map(r => ({ uri: r.uri, name: r.name })),
                prompts: this.prompts.map(p => ({ name: p.name, description: p.description }))
            };
        }
    }

    // Initialize tool registry
    const toolRegistry = new ToolRegistry();
    
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
        if (requestManager.handleResponse(serverName, message)) {
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
     * Create transport based on configuration
     * @param {Object} config - Transport configuration
     * @param {string} serverName - Name of the server
     * @returns {Transport} Transport instance
     */
    function createTransport(config, serverName) {
        if (config.type === 'stdio') {
            return new StdioTransport(config, serverName);
        } else if (config.type === 'sse') {
            return new SseTransport(config);
        } else {
            throw new MCPError(`Unsupported transport type: ${config.type}`);
        }
    }
    
    /**
     * Connect to an MCP server
     * @param {string} name - Unique name for this server connection
     * @param {Object} config - Server configuration
     * @param {Object} options - Connection options
     * @returns {Promise<Connection>} Connection object
     */
    async function connect(name, config, options = {}) {
        if (activeConnections.has(name)) {
            throw new MCPConnectionError(`Already connected to server: ${name}`);
        }
        
        console.log(`[MCP] Connecting to ${name}...`);
        
        try {
            // Create transport
            const transport = createTransport(config.transport, name);
            
            // Create connection object
            const connection = new Connection(name, config, transport, options);
            
            // Set up message handlers
            transport.onMessage = (message) => handleMessage(name, message, connection);
            transport.onError = (error) => {
                console.error(`[MCP] Transport error for ${name}:`, error);
                disconnect(name);
            };
            transport.onClose = () => {
                console.log(`[MCP] Transport closed for ${name}`);
                disconnect(name);
            };
            
            // Connect transport
            await transport.connect();
            
            // Initialize the connection
            await connection.initialize();
            
            // Store the connection
            activeConnections.set(name, connection);
            
            // Fetch available tools, resources, and prompts
            await connection.refreshCapabilities();
            
            return connection;
        } catch (error) {
            throw new MCPConnectionError(`Failed to connect to ${name}: ${error.message}`);
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
        toolRegistry.unregisterServerTools(name);
        
        // Close connection
        connection.close();
        
        // Clean up pending requests
        requestManager.clearPendingRequests(name);
        
        // Remove connection
        activeConnections.delete(name);
        
        console.log(`[MCP] Disconnected from ${name}`);
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
            throw new MCPConnectionError(`Not connected to server: ${serverName}`);
        }
        
        return await connection.callTool(toolName, params, options);
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
            throw new MCPConnectionError(`Not connected to server: ${serverName}`);
        }
        
        return await connection.readResource(uri);
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
            throw new MCPConnectionError(`Not connected to server: ${serverName}`);
        }
        
        return await connection.getPrompt(promptName, args);
    }
    
    /**
     * Refresh server capabilities (tools, resources, prompts)
     * @param {string} name - Name of the server
     */
    async function refreshServerCapabilities(name) {
        const connection = activeConnections.get(name);
        if (!connection) {
            throw new MCPConnectionError(`Not connected to server: ${name}`);
        }
        
        await connection.refreshCapabilities();
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
        
        return connection.getInfo();
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