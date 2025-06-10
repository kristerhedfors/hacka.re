/**
 * MCP Transport Service for hacka.re
 * 
 * Provides transport layer implementations for the Model Context Protocol (MCP).
 * Supports stdio (local process via proxy) and SSE (HTTP-based) transports.
 * 
 * Features:
 * - Pure JavaScript, no external dependencies
 * - Pluggable transport architecture
 * - Event-driven communication
 * - Proper error handling and cleanup
 */

/**
 * Custom error classes for transport-specific errors
 */
class MCPTransportError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'MCPTransportError';
        this.code = code;
    }
}

/**
 * Base transport class defining the interface all transports must implement
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
 * 
 * This transport communicates with local MCP servers through an HTTP proxy
 * that manages the stdio communication with the actual MCP server process.
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
            console.log('[MCP Transport] Could not check server list, will try to start:', error.message);
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
                    console.log(`[MCP Transport] Server ${this.serverName} is already running, proceeding with connection`);
                } else {
                    throw new Error(error.error || 'Failed to start server');
                }
            }
        } else {
            console.log(`[MCP Transport] Server ${this.serverName} is already running, connecting to existing instance`);
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
                    console.error('[MCP Transport] Failed to parse message:', error);
                }
            });

            this.eventSource.addEventListener('exit', (event) => {
                const { code, signal } = JSON.parse(event.data);
                console.log(`[MCP Transport] Server ${this.serverName} exited with code ${code}, signal ${signal}`);
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
            console.error('[MCP Transport] Failed to stop server:', error);
        }

        this.connected = false;
    }
}

/**
 * SSE transport for HTTP-based MCP servers
 * 
 * This transport communicates with MCP servers that expose an HTTP API
 * with Server-Sent Events for bidirectional communication.
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
                    console.error('[MCP Transport] Failed to parse SSE message:', error);
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
 * Transport factory for creating transport instances
 */
class TransportFactory {
    /**
     * Create a transport instance based on configuration
     * @param {Object} config - Transport configuration
     * @param {string} serverName - Name of the server (for stdio transport)
     * @returns {Transport} Transport instance
     */
    static createTransport(config, serverName) {
        if (config.type === 'stdio') {
            return new StdioTransport(config, serverName);
        } else if (config.type === 'sse') {
            return new SseTransport(config);
        } else {
            throw new Error(`Unsupported transport type: ${config.type}`);
        }
    }

    /**
     * Get list of supported transport types
     * @returns {Array<string>} Array of supported transport types
     */
    static getSupportedTypes() {
        return ['stdio', 'sse'];
    }
}

// Export classes and factory
window.MCPTransportService = {
    Transport,
    StdioTransport,
    SseTransport,
    TransportFactory,
    MCPTransportError
};