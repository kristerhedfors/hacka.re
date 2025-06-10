/**
 * MCP Request Manager for hacka.re
 * 
 * Handles JSON-RPC request/response management for MCP communication.
 * Provides request ID generation, timeout handling, and response correlation.
 * 
 * Features:
 * - JSON-RPC 2.0 compliant message creation
 * - Request/response correlation by ID
 * - Timeout handling with automatic cleanup
 * - Support for both requests and notifications
 * - Per-server request isolation
 */

// Constants
const JSONRPC_VERSION = '2.0';
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

/**
 * Custom error class for MCP-specific errors
 */
class MCPError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'MCPError';
        this.code = code;
    }
}

/**
 * JSON-RPC request manager for MCP communication
 * 
 * Manages the lifecycle of JSON-RPC requests, including ID generation,
 * timeout handling, and response correlation.
 */
class RequestManager {
    constructor() {
        this.requestIdCounter = 0;
        this.pendingRequests = new Map();
    }

    /**
     * Generate a unique request ID
     * @returns {number} Unique request ID
     */
    generateRequestId() {
        return ++this.requestIdCounter;
    }

    /**
     * Create a JSON-RPC request message
     * @param {string} method - RPC method name
     * @param {Object} params - Method parameters
     * @returns {Object} JSON-RPC request object
     */
    createJsonRpcRequest(method, params = {}) {
        return {
            jsonrpc: JSONRPC_VERSION,
            id: this.generateRequestId(),
            method,
            params
        };
    }

    /**
     * Create a JSON-RPC notification message (no response expected)
     * @param {string} method - RPC method name
     * @param {Object} params - Method parameters
     * @returns {Object} JSON-RPC notification object
     */
    createJsonRpcNotification(method, params = {}) {
        return {
            jsonrpc: JSONRPC_VERSION,
            method,
            params
        };
    }

    /**
     * Send a request and wait for response
     * @param {string} serverName - Name of the server
     * @param {Object} connection - Connection object with send method
     * @param {Object} request - JSON-RPC request object
     * @param {number} timeoutMs - Request timeout in milliseconds
     * @returns {Promise<any>} Promise that resolves with the response result
     */
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

    /**
     * Handle an incoming response message
     * @param {string} serverName - Name of the server
     * @param {Object} message - JSON-RPC response message
     * @returns {boolean} True if message was handled as a response, false otherwise
     */
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

    /**
     * Clear all pending requests for a server (e.g., on disconnect)
     * @param {string} serverName - Name of the server
     */
    clearPendingRequests(serverName) {
        for (const [key, pending] of this.pendingRequests.entries()) {
            if (key.startsWith(`${serverName}-`)) {
                clearTimeout(pending.timeoutTimer);
                pending.reject(new MCPError('Connection closed'));
                this.pendingRequests.delete(key);
            }
        }
    }

    /**
     * Get the number of pending requests for a server
     * @param {string} serverName - Name of the server
     * @returns {number} Number of pending requests
     */
    getPendingRequestCount(serverName) {
        let count = 0;
        for (const key of this.pendingRequests.keys()) {
            if (key.startsWith(`${serverName}-`)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get total number of pending requests across all servers
     * @returns {number} Total number of pending requests
     */
    getTotalPendingRequestCount() {
        return this.pendingRequests.size;
    }

    /**
     * Check if a message is a valid JSON-RPC message
     * @param {Object} message - Message to validate
     * @returns {boolean} True if valid JSON-RPC message
     */
    static isValidJsonRpcMessage(message) {
        if (!message || typeof message !== 'object') {
            return false;
        }

        // Must have jsonrpc version
        if (message.jsonrpc !== JSONRPC_VERSION) {
            return false;
        }

        // Must have method for requests/notifications or id for responses
        if (!message.method && !('id' in message)) {
            return false;
        }

        return true;
    }

    /**
     * Check if a message is a JSON-RPC request
     * @param {Object} message - Message to check
     * @returns {boolean} True if message is a request
     */
    static isRequest(message) {
        return this.isValidJsonRpcMessage(message) && 
               message.method && 
               'id' in message && 
               message.id !== null;
    }

    /**
     * Check if a message is a JSON-RPC notification
     * @param {Object} message - Message to check
     * @returns {boolean} True if message is a notification
     */
    static isNotification(message) {
        return this.isValidJsonRpcMessage(message) && 
               message.method && 
               !('id' in message);
    }

    /**
     * Check if a message is a JSON-RPC response
     * @param {Object} message - Message to check
     * @returns {boolean} True if message is a response
     */
    static isResponse(message) {
        return this.isValidJsonRpcMessage(message) && 
               !message.method && 
               'id' in message;
    }
}

// Export the request manager and related classes
window.MCPRequestManager = {
    RequestManager,
    MCPError,
    JSONRPC_VERSION,
    DEFAULT_REQUEST_TIMEOUT_MS
};