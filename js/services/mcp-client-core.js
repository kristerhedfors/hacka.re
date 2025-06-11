/**
 * MCP Client Core for hacka.re
 * 
 * Main coordination service that integrates all MCP components to provide
 * a unified client interface. This is the primary entry point for MCP
 * functionality in hacka.re.
 * 
 * Features:
 * - Unified API for MCP operations
 * - Automatic component initialization and coordination
 * - Connection lifecycle management
 * - Message routing and handling
 * - Error handling and recovery
 * - Integration with hacka.re's function calling system
 */

/**
 * MCP Client Core Service
 * 
 * Coordinates all MCP components and provides the main public API
 * for MCP functionality in hacka.re.
 */
window.MCPClientService = (function() {
    // Component instances
    let connectionManager = null;
    let requestManager = null;
    let toolRegistry = null;
    let initialized = false;

    /**
     * Initialize the MCP client service
     */
    function initialize() {
        if (initialized) {
            return;
        }

        // Initialize components
        if (window.MCPConnectionManager) {
            connectionManager = new window.MCPConnectionManager.ConnectionManager();
        }
        
        if (window.MCPRequestManager) {
            requestManager = new window.MCPRequestManager.RequestManager();
        }
        
        if (window.MCPToolRegistry) {
            toolRegistry = new window.MCPToolRegistry.ToolRegistry();
        }

        if (!connectionManager || !requestManager || !toolRegistry) {
            throw new Error('Failed to initialize MCP client: missing required components');
        }

        initialized = true;
        console.log('[MCP Client] Initialized successfully');
    }

    /**
     * Ensure the service is initialized
     */
    function ensureInitialized() {
        if (!initialized) {
            initialize();
        }
    }

    /**
     * Handle incoming JSON-RPC message
     * @param {string} serverName - Name of the server
     * @param {Object} message - The JSON-RPC message
     * @param {Object} connection - The connection object
     */
    function handleMessage(serverName, message, connection) {
        if (!message || typeof message !== 'object') {
            console.error(`[MCP Client] Invalid message from ${serverName}:`, message);
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
        console.log(`[MCP Client] Notification from ${serverName}:`, notification.method, notification.params);
        
        // Handle progress notifications
        if (notification.method === '$/progress' && notification.params) {
            const { requestId, progress } = notification.params;
            if (requestId && connection.handleProgress) {
                connection.handleProgress(requestId, progress);
            }
        }
        
        // Handle logging notifications
        if (notification.method === 'notifications/message' && notification.params) {
            const { level, message } = notification.params;
            console.log(`[MCP Client][${serverName}][${level}] ${message}`);
        }
        
        // Notify any registered handlers
        if (connection.onNotification) {
            connection.onNotification(serverName, notification);
        }
    }
    
    /**
     * Connect to an MCP server
     * @param {string} name - Unique name for this server connection
     * @param {Object} config - Server configuration
     * @param {Object} options - Connection options
     * @returns {Promise<Object>} Connection object
     */
    async function connect(name, config, options = {}) {
        ensureInitialized();

        if (connectionManager.hasConnection(name)) {
            throw new Error(`Already connected to server: ${name}`);
        }
        
        console.log(`[MCP Client] Connecting to ${name}...`);
        
        try {
            // Create transport
            if (!window.MCPTransportService) {
                throw new Error('MCPTransportService not available');
            }
            
            const transport = window.MCPTransportService.TransportFactory.createTransport(
                config.transport, 
                name
            );
            
            // Create connection object
            const connection = connectionManager.createConnection(name, config, transport, options);
            
            // Set up message handlers
            transport.onMessage = (message) => handleMessage(name, message, connection);
            transport.onError = (error) => {
                console.error(`[MCP Client] Transport error for ${name}:`, error);
                disconnect(name);
            };
            transport.onClose = () => {
                console.log(`[MCP Client] Transport closed for ${name}`);
                disconnect(name);
            };
            
            // Connect transport
            await transport.connect();
            
            // Initialize the connection
            await connection.initialize(requestManager);
            
            // Fetch available tools, resources, and prompts
            await connection.refreshCapabilities(requestManager, toolRegistry);
            
            return connection;
        } catch (error) {
            // Clean up on failure
            if (connectionManager.hasConnection(name)) {
                connectionManager.removeConnection(name, toolRegistry);
            }
            throw new Error(`Failed to connect to ${name}: ${error.message}`);
        }
    }
    
    /**
     * Disconnect from an MCP server
     * @param {string} name - Name of the server to disconnect
     */
    async function disconnect(name) {
        ensureInitialized();

        const connection = connectionManager.getConnection(name);
        if (!connection) {
            return;
        }
        
        console.log(`[MCP Client] Disconnecting from ${name}...`);
        
        // Clean up pending requests
        requestManager.clearPendingRequests(name);
        
        // Remove connection (this also handles cleanup)
        connectionManager.removeConnection(name, toolRegistry);
        
        console.log(`[MCP Client] Disconnected from ${name}`);
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
        ensureInitialized();

        const connection = connectionManager.getConnection(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }
        
        return await connection.callTool(requestManager, toolName, params, options);
    }
    
    /**
     * Read a resource from an MCP server
     * @param {string} serverName - Name of the server
     * @param {string} uri - Resource URI
     * @returns {Promise<Object>} Resource content
     */
    async function readResource(serverName, uri) {
        ensureInitialized();

        const connection = connectionManager.getConnection(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }
        
        return await connection.readResource(requestManager, uri);
    }
    
    /**
     * Get a prompt from an MCP server
     * @param {string} serverName - Name of the server
     * @param {string} promptName - Name of the prompt
     * @param {Object} args - Prompt arguments
     * @returns {Promise<Object>} Prompt result
     */
    async function getPrompt(serverName, promptName, args = {}) {
        ensureInitialized();

        const connection = connectionManager.getConnection(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }
        
        return await connection.getPrompt(requestManager, promptName, args);
    }
    
    /**
     * Refresh server capabilities (tools, resources, prompts)
     * @param {string} name - Name of the server
     */
    async function refreshServerCapabilities(name) {
        ensureInitialized();

        const connection = connectionManager.getConnection(name);
        if (!connection) {
            throw new Error(`Not connected to server: ${name}`);
        }
        
        await connection.refreshCapabilities(requestManager, toolRegistry);
    }
    
    /**
     * Get list of active connections
     * @returns {Array<string>} Array of server names
     */
    function getActiveConnections() {
        ensureInitialized();
        return connectionManager.getConnectionNames();
    }
    
    /**
     * Get connection info
     * @param {string} name - Server name
     * @returns {Object|null} Connection info or null if not connected
     */
    function getConnectionInfo(name) {
        ensureInitialized();

        const connection = connectionManager.getConnection(name);
        if (!connection) {
            return null;
        }
        
        return connection.getInfo();
    }

    /**
     * Get all connection information
     * @returns {Array<Object>} Array of connection info objects
     */
    function getAllConnectionInfo() {
        ensureInitialized();
        return connectionManager.getAllConnections().map(conn => conn.getInfo());
    }

    /**
     * Get service statistics
     * @returns {Object} Service statistics
     */
    function getStatistics() {
        ensureInitialized();
        
        const connectionStats = connectionManager.getStatistics();
        const toolStats = {
            registeredServers: toolRegistry.getRegisteredServers().length,
            totalTools: toolRegistry.getTotalToolCount()
        };
        const requestStats = {
            totalPendingRequests: requestManager.getTotalPendingRequestCount()
        };

        return {
            connections: connectionStats,
            tools: toolStats,
            requests: requestStats,
            initialized: initialized
        };
    }

    /**
     * Shutdown the MCP client service
     */
    function shutdown() {
        if (!initialized) {
            return;
        }

        console.log('[MCP Client] Shutting down...');

        // Close all connections
        if (connectionManager) {
            connectionManager.closeAllConnections(toolRegistry);
        }

        // Reset components
        connectionManager = null;
        requestManager = null;
        toolRegistry = null;
        initialized = false;

        console.log('[MCP Client] Shutdown complete');
    }

    /**
     * Check if the service is healthy
     * @returns {boolean} True if service is healthy
     */
    function isHealthy() {
        if (!initialized) {
            return false;
        }

        const stats = getStatistics();
        return stats.connections.error === 0 && stats.requests.totalPendingRequests < 100;
    }

    // Auto-initialize on first use
    initialize();
    
    // Public API
    return {
        // Core functionality
        connect,
        disconnect,
        callTool,
        readResource,
        getPrompt,
        refreshServerCapabilities,
        
        // Information and monitoring
        getActiveConnections,
        getConnectionInfo,
        getAllConnectionInfo,
        getStatistics,
        isHealthy,
        
        // Lifecycle
        initialize,
        shutdown,
        
        // Constants for backward compatibility
        JSONRPC_VERSION: window.MCPRequestManager?.JSONRPC_VERSION || '2.0',
        MCP_PROTOCOL_VERSION: window.MCPConnectionManager?.MCP_PROTOCOL_VERSION || '0.1.0',
        DEFAULT_REQUEST_TIMEOUT_MS: window.MCPRequestManager?.DEFAULT_REQUEST_TIMEOUT_MS || 30000
    };
})();