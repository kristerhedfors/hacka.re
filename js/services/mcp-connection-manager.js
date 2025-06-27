/**
 * MCP Connection Manager for hacka.re
 * 
 * Manages the lifecycle of MCP server connections, including initialization,
 * capability discovery, tool registration, and cleanup. Provides a high-level
 * interface for connection management.
 * 
 * Features:
 * - Connection lifecycle management
 * - MCP protocol initialization
 * - Capability discovery and caching
 * - Tool/resource/prompt enumeration
 * - Progress tracking for long-running operations
 * - Automatic cleanup on disconnection
 */

// Constants
const MCP_PROTOCOL_VERSION = '0.1.0';
const INIT_TIMEOUT_MAX_MS = 10000;

/**
 * Custom error class for connection-specific errors
 */
class MCPConnectionError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'MCPConnectionError';
        this.code = code;
    }
}

/**
 * Connection class to encapsulate connection state and operations
 * 
 * Represents a single connection to an MCP server, managing its state,
 * capabilities, and providing methods for interaction.
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
        this.state = 'disconnected';
        this.lastError = null;
        this.connectedAt = null;
    }

    /**
     * Send a message through the transport
     * @param {Object} message - Message to send
     * @returns {Promise<void>}
     */
    async send(message) {
        if (this.state === 'disconnected' || this.state === 'error') {
            throw new MCPConnectionError(`Cannot send message: connection is ${this.state}`);
        }
        return this.transport.send(message);
    }

    /**
     * Initialize the MCP connection
     * @param {Object} requestManager - Request manager instance
     * @returns {Promise<void>}
     */
    async initialize(requestManager) {
        try {
            this.state = 'initializing';

            const initRequest = requestManager.createJsonRpcRequest('initialize', {
                protocolVersion: MCP_PROTOCOL_VERSION,
                clientInfo: {
                    name: 'hacka.re-mcp-client',
                    version: '1.0.0'
                },
                capabilities: {}
            });

            const initResponse = await requestManager.sendRequest(
                this.name, 
                this, 
                initRequest, 
                INIT_TIMEOUT_MAX_MS
            );

            this.capabilities = initResponse.capabilities || {};

            // Send initialized notification
            await this.send(requestManager.createJsonRpcNotification('notifications/initialized', {}));

            this.state = 'connected';
            this.connectedAt = new Date();
            this.lastError = null;
        } catch (error) {
            this.state = 'error';
            this.lastError = error;
            throw new MCPConnectionError(`Failed to initialize connection to ${this.name}: ${error.message}`);
        }
    }

    /**
     * Refresh server capabilities (tools, resources, prompts)
     * @param {Object} requestManager - Request manager instance
     * @param {Object} toolRegistry - Tool registry instance
     * @returns {Promise<void>}
     */
    async refreshCapabilities(requestManager, toolRegistry) {
        if (this.state !== 'connected') {
            throw new MCPConnectionError(`Cannot refresh capabilities: connection is ${this.state}`);
        }

        try {
            // Refresh tools
            if (this.capabilities.tools) {
                const toolsRequest = requestManager.createJsonRpcRequest('tools/list', {});
                const toolsResponse = await requestManager.sendRequest(this.name, this, toolsRequest);
                this.tools = toolsResponse.tools || [];
                // Tools loaded
                
                if (toolRegistry) {
                    toolRegistry.registerServerTools(this.name, this.tools, this.config);
                }
            }

            // Refresh resources
            if (this.capabilities.resources) {
                const resourcesRequest = requestManager.createJsonRpcRequest('resources/list', {});
                const resourcesResponse = await requestManager.sendRequest(this.name, this, resourcesRequest);
                this.resources = resourcesResponse.resources || [];
                // Resources loaded
            }

            // Refresh prompts
            if (this.capabilities.prompts) {
                const promptsRequest = requestManager.createJsonRpcRequest('prompts/list', {});
                const promptsResponse = await requestManager.sendRequest(this.name, this, promptsRequest);
                this.prompts = promptsResponse.prompts || [];
                // Prompts loaded
            }
        } catch (error) {
            console.error(`[MCP Connection] Failed to refresh capabilities for ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Call a tool on this connection
     * @param {Object} requestManager - Request manager instance
     * @param {string} toolName - Name of the tool to call
     * @param {Object} params - Tool parameters
     * @param {Object} options - Call options
     * @returns {Promise<any>} Tool result
     */
    async callTool(requestManager, toolName, params = {}, options = {}) {
        if (this.state !== 'connected') {
            throw new MCPConnectionError(`Cannot call tool: connection is ${this.state}`);
        }

        const request = requestManager.createJsonRpcRequest('tools/call', {
            name: toolName,
            arguments: params
        });

        // Calling MCP tool

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

    /**
     * Read a resource from this connection
     * @param {Object} requestManager - Request manager instance
     * @param {string} uri - Resource URI
     * @returns {Promise<Object>} Resource content
     */
    async readResource(requestManager, uri) {
        if (this.state !== 'connected') {
            throw new MCPConnectionError(`Cannot read resource: connection is ${this.state}`);
        }

        const request = requestManager.createJsonRpcRequest('resources/read', { uri });
        return await requestManager.sendRequest(this.name, this, request);
    }

    /**
     * Get a prompt from this connection
     * @param {Object} requestManager - Request manager instance
     * @param {string} promptName - Name of the prompt
     * @param {Object} args - Prompt arguments
     * @returns {Promise<Object>} Prompt result
     */
    async getPrompt(requestManager, promptName, args = {}) {
        if (this.state !== 'connected') {
            throw new MCPConnectionError(`Cannot get prompt: connection is ${this.state}`);
        }

        const request = requestManager.createJsonRpcRequest('prompts/get', {
            name: promptName,
            arguments: args
        });
        return await requestManager.sendRequest(this.name, this, request);
    }

    /**
     * Handle progress notification for this connection
     * @param {number} requestId - Request ID
     * @param {Object} progress - Progress data
     */
    handleProgress(requestId, progress) {
        if (this.progressCallbacks[requestId]) {
            this.progressCallbacks[requestId](progress);
        }
    }

    /**
     * Close the connection
     * @param {Object} toolRegistry - Tool registry instance for cleanup
     */
    close(toolRegistry) {
        console.log(`[MCP Connection] Closing connection to ${this.name}`);

        // Unregister tools
        if (toolRegistry) {
            toolRegistry.unregisterServerTools(this.name);
        }

        // Close transport
        if (this.transport) {
            this.transport.close();
        }

        // Clear progress callbacks
        this.progressCallbacks = {};

        this.state = 'disconnected';
    }

    /**
     * Get connection information
     * @returns {Object} Connection information
     */
    getInfo() {
        return {
            name: this.name,
            state: this.state,
            transport: this.config.transport?.type || 'unknown',
            capabilities: this.capabilities,
            connectedAt: this.connectedAt,
            lastError: this.lastError?.message || null,
            tools: this.tools.map(t => ({ name: t.name, description: t.description })),
            resources: this.resources.map(r => ({ uri: r.uri, name: r.name })),
            prompts: this.prompts.map(p => ({ name: p.name, description: p.description }))
        };
    }

    /**
     * Check if connection is healthy
     * @returns {boolean} True if connection is healthy
     */
    isHealthy() {
        return this.state === 'connected' && this.lastError === null;
    }

    /**
     * Get connection uptime in milliseconds
     * @returns {number|null} Uptime in milliseconds, or null if not connected
     */
    getUptime() {
        if (!this.connectedAt || this.state !== 'connected') {
            return null;
        }
        return Date.now() - this.connectedAt.getTime();
    }
}

/**
 * Connection manager for handling multiple MCP connections
 * 
 * Provides high-level management of MCP connections, including creation,
 * lifecycle management, and cleanup.
 */
class ConnectionManager {
    constructor() {
        this.connections = new Map();
    }

    /**
     * Create a new connection
     * @param {string} name - Unique name for the connection
     * @param {Object} config - Connection configuration
     * @param {Object} transport - Transport instance
     * @param {Object} options - Connection options
     * @returns {Connection} Connection instance
     */
    createConnection(name, config, transport, options = {}) {
        if (this.connections.has(name)) {
            throw new MCPConnectionError(`Connection ${name} already exists`);
        }

        const connection = new Connection(name, config, transport, options);
        this.connections.set(name, connection);
        return connection;
    }

    /**
     * Get a connection by name
     * @param {string} name - Connection name
     * @returns {Connection|null} Connection instance or null if not found
     */
    getConnection(name) {
        return this.connections.get(name) || null;
    }

    /**
     * Check if a connection exists
     * @param {string} name - Connection name
     * @returns {boolean} True if connection exists
     */
    hasConnection(name) {
        return this.connections.has(name);
    }

    /**
     * Remove a connection
     * @param {string} name - Connection name
     * @param {Object} toolRegistry - Tool registry for cleanup
     */
    removeConnection(name, toolRegistry) {
        const connection = this.connections.get(name);
        if (connection) {
            connection.close(toolRegistry);
            this.connections.delete(name);
        }
    }

    /**
     * Get all connection names
     * @returns {Array<string>} Array of connection names
     */
    getConnectionNames() {
        return Array.from(this.connections.keys());
    }

    /**
     * Get all connections
     * @returns {Array<Connection>} Array of connection instances
     */
    getAllConnections() {
        return Array.from(this.connections.values());
    }

    /**
     * Get healthy connections
     * @returns {Array<Connection>} Array of healthy connection instances
     */
    getHealthyConnections() {
        return this.getAllConnections().filter(conn => conn.isHealthy());
    }

    /**
     * Close all connections
     * @param {Object} toolRegistry - Tool registry for cleanup
     */
    closeAllConnections(toolRegistry) {
        for (const connection of this.connections.values()) {
            connection.close(toolRegistry);
        }
        this.connections.clear();
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics
     */
    getStatistics() {
        const connections = this.getAllConnections();
        const healthy = this.getHealthyConnections();
        
        return {
            total: connections.length,
            healthy: healthy.length,
            error: connections.filter(c => c.state === 'error').length,
            initializing: connections.filter(c => c.state === 'initializing').length,
            disconnected: connections.filter(c => c.state === 'disconnected').length
        };
    }
}

// Export classes and constants
window.MCPConnectionManager = {
    Connection,
    ConnectionManager,
    MCPConnectionError,
    MCP_PROTOCOL_VERSION,
    INIT_TIMEOUT_MAX_MS
};