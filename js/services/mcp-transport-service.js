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
 * OAuth transport for MCP servers with OAuth authentication
 * 
 * This transport extends SSE transport to add OAuth token management,
 * automatic token refresh, and proper authorization headers.
 */
class OAuthTransport extends SseTransport {
    constructor(config, serverName) {
        super(config);
        this.serverName = serverName;
        this.oauthService = null;
        this.initializeOAuthService();
    }

    initializeOAuthService() {
        // Initialize OAuth service if available
        if (window.MCPOAuthService) {
            this.oauthService = new window.MCPOAuthService.OAuthService();
        } else {
            console.warn('[MCP Transport] OAuth service not available');
        }
    }

    async connect() {
        // Ensure we have a valid token before connecting
        if (this.oauthService) {
            try {
                await this.oauthService.getAccessToken(this.serverName);
            } catch (error) {
                throw new MCPTransportError(`OAuth authentication required: ${error.message}`);
            }
        }

        return super.connect();
    }

    async send(message) {
        if (!this.connected) {
            throw new MCPTransportError('OAuth transport not connected');
        }

        const maxRetries = 2;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                // Get fresh authorization header
                let headers = {
                    'Content-Type': 'application/json',
                    ...this.config.headers
                };

                if (this.oauthService) {
                    try {
                        const authHeader = await this.oauthService.getAuthorizationHeader(this.serverName);
                        headers = { ...headers, ...authHeader };
                    } catch (error) {
                        console.error('[MCP Transport] Failed to get OAuth token:', error);
                        
                        // Check if this is a recoverable error
                        if (error.code === 'no_token' || error.code === 'token_expired') {
                            throw new MCPTransportError('OAuth authentication required', 'auth_required');
                        }
                        throw new MCPTransportError(`OAuth error: ${error.message}`, 'oauth_error');
                    }
                }

                const response = await fetch(this.config.url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(message)
                });

                // Handle OAuth errors with retry logic
                if (response.status === 401) {
                    if (attempt < maxRetries && this.oauthService) {
                        console.log(`[MCP Transport] Received 401, attempting token refresh (attempt ${attempt + 1}/${maxRetries})`);
                        
                        try {
                            // Try to refresh the token
                            const refreshed = await this.oauthService.refreshAccessToken(this.serverName);
                            if (refreshed) {
                                attempt++;
                                continue; // Retry with refreshed token
                            }
                        } catch (refreshError) {
                            console.error('[MCP Transport] Token refresh failed:', refreshError.message);
                        }
                    }
                    
                    // If we can't refresh or max retries reached
                    throw new MCPTransportError(
                        'Authentication failed - token invalid or expired', 
                        'auth_failed',
                        { status: 401, retries: attempt }
                    );
                }

                // Handle other OAuth-specific errors
                if (response.status === 403) {
                    const errorText = await response.text().catch(() => '');
                    throw new MCPTransportError(
                        `Insufficient permissions: ${errorText}`,
                        'insufficient_scope',
                        { status: 403 }
                    );
                }

                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get('retry-after');
                    throw new MCPTransportError(
                        `Rate limited${retryAfter ? ` - retry after ${retryAfter}s` : ''}`,
                        'rate_limited',
                        { status: 429, retryAfter }
                    );
                }

                // Handle server errors
                if (response.status >= 500) {
                    throw new MCPTransportError(
                        `Server error: ${response.status} ${response.statusText}`,
                        'server_error',
                        { status: response.status }
                    );
                }

                // Handle other client errors
                if (!response.ok) {
                    const errorText = await response.text().catch(() => response.statusText);
                    throw new MCPTransportError(
                        `HTTP error: ${response.status} - ${errorText}`,
                        'http_error',
                        { status: response.status }
                    );
                }

                // Success - exit retry loop
                console.log(`[MCP Transport] Message sent successfully to ${this.serverName}`);
                return;

            } catch (error) {
                // Don't retry on these error types
                if (error instanceof MCPTransportError && 
                    ['auth_required', 'insufficient_scope', 'rate_limited'].includes(error.code)) {
                    throw error;
                }

                // If this is the last attempt, throw the error
                if (attempt >= maxRetries) {
                    if (error instanceof MCPTransportError) {
                        throw error;
                    }
                    throw new MCPTransportError(
                        `Request failed after ${maxRetries + 1} attempts: ${error.message}`,
                        'request_failed'
                    );
                }

                // Wait before retry (exponential backoff)
                const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
                console.warn(`[MCP Transport] Request failed, retrying in ${backoffMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                attempt++;
            }
        }
    }

    /**
     * Get OAuth status for this transport
     * @returns {Object} OAuth status information
     */
    getOAuthStatus() {
        if (!this.oauthService) {
            return { 
                available: false,
                error: 'OAuth service not initialized'
            };
        }

        const tokenInfo = this.oauthService.getTokenInfo(this.serverName);
        const serverInfo = this.oauthService.getServerConfig ? 
            this.oauthService.getServerConfig(this.serverName) : null;

        return {
            available: true,
            authenticated: !!(tokenInfo && tokenInfo.hasToken && !tokenInfo.isExpired),
            serverName: this.serverName,
            tokenInfo: tokenInfo,
            serverConfig: serverInfo ? {
                hasMetadata: !!(serverInfo._metadata),
                hasClientRegistration: !!(serverInfo._clientCredentials),
                authorizationUrl: serverInfo.authorizationUrl,
                tokenUrl: serverInfo.tokenUrl
            } : null,
            lastError: this._lastError || null
        };
    }

    /**
     * Enhanced connect with OAuth 2.1 compliance validation
     */
    async connect() {
        try {
            // Validate OAuth 2.1 compliance if metadata available
            if (this.oauthService && this.oauthService.validateOAuth21Compliance) {
                const compliance = await this.oauthService.validateOAuth21Compliance(this.serverName);
                if (!compliance.compatible) {
                    console.warn(`[MCP Transport] OAuth 2.1 compliance issues for ${this.serverName}:`, compliance.issues);
                }
            }

            // Ensure we have a valid token before connecting
            if (this.oauthService) {
                try {
                    await this.oauthService.getAccessToken(this.serverName);
                    console.log(`[MCP Transport] OAuth token validated for ${this.serverName}`);
                } catch (error) {
                    this._lastError = error.message;
                    throw new MCPTransportError(`OAuth authentication required: ${error.message}`, 'auth_required');
                }
            }

            return super.connect();
        } catch (error) {
            this._lastError = error.message;
            throw error;
        }
    }

    /**
     * Disconnect and clean up OAuth resources
     */
    async close() {
        this._lastError = null;
        return super.close();
    }

    /**
     * Test OAuth connectivity
     * @returns {Promise<Object>} Connection test result
     */
    async testOAuthConnection() {
        if (!this.oauthService) {
            return {
                success: false,
                error: 'OAuth service not available'
            };
        }

        try {
            // Try to get a fresh token
            await this.oauthService.getAccessToken(this.serverName);
            
            // Test a simple request if connected
            if (this.connected) {
                await this.send({ jsonrpc: '2.0', method: 'ping', id: 'oauth-test' });
            }

            return {
                success: true,
                message: 'OAuth connection test successful'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code
            };
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
        } else if (config.type === 'oauth') {
            return new OAuthTransport(config, serverName);
        } else {
            throw new Error(`Unsupported transport type: ${config.type}`);
        }
    }

    /**
     * Get list of supported transport types
     * @returns {Array<string>} Array of supported transport types
     */
    static getSupportedTypes() {
        return ['stdio', 'sse', 'oauth'];
    }
}

// Export classes and factory
window.MCPTransportService = {
    Transport,
    StdioTransport,
    SseTransport,
    OAuthTransport,
    TransportFactory,
    MCPTransportError
};