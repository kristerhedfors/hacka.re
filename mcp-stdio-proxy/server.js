#!/usr/bin/env node
/**
 * MCP Stdio Proxy Server
 * 
 * Bridges browser-based MCP clients to stdio-based MCP servers
 * Allows hacka.re to connect to local MCP servers that communicate via stdin/stdout
 * 
 * Usage: node server.js [port]
 */

const http = require('http');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { OAuthMiddleware } = require('./oauth-middleware');

// Parse command line arguments
const args = process.argv.slice(2);
const debugIndex = args.indexOf('--debug');
const DEBUG = process.env.DEBUG === 'true' || debugIndex !== -1;

// Remove --debug from args if present to get the port
const filteredArgs = args.filter(arg => arg !== '--debug');
const PORT = process.env.PORT || filteredArgs[0] || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

// Active MCP server processes
const activeServers = new Map();

// Initialize OAuth middleware
const oauthMiddleware = new OAuthMiddleware({
    enableAuth: process.env.OAUTH_ENABLED === 'true',
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',').map(o => o.trim())
});

// Debug logging
function debug(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] === '*' ? '*' : ALLOWED_ORIGINS.join(', '),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Server-Name',
    'Access-Control-Max-Age': '86400'
};

/**
 * MCP Server Process Manager
 */
class MCPServerProcess extends EventEmitter {
    constructor(command, args = [], env = {}, serverName = '') {
        super();
        this.command = command;
        this.args = args;
        this.serverName = serverName;
        
        // Inject OAuth environment variables if configured
        this.env = oauthMiddleware.injectOAuthEnvironment(serverName, { ...process.env, ...env });
        
        this.process = null;
        this.buffer = '';
        this.messageQueue = [];
        this.connected = false;
    }

    start() {
        console.log(`Starting MCP server: ${this.command} ${this.args.join(' ')}`);
        debug('Environment:', JSON.stringify(this.env, null, 2));
        debug('Working directory:', process.cwd());
        
        this.process = spawn(this.command, this.args, {
            env: this.env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        debug(`Process spawned with PID: ${this.process.pid}`);

        // Handle stdout (responses from server)
        this.process.stdout.on('data', (data) => {
            const chunk = data.toString();
            debug(`[STDOUT] Raw data (${chunk.length} bytes):`, JSON.stringify(chunk));
            
            this.buffer += chunk;
            debug(`[STDOUT] Buffer size: ${this.buffer.length} bytes`);
            debug(`[STDOUT] Buffer content:`, JSON.stringify(this.buffer));
            
            this.processBuffer();
        });

        // Handle stderr (error messages)
        this.process.stderr.on('data', (data) => {
            const stderr = data.toString();
            console.error(`[${this.command}] stderr:`, stderr);
            debug(`[STDERR] Raw:`, JSON.stringify(stderr));
        });

        // Handle process exit
        this.process.on('exit', (code, signal) => {
            console.log(`MCP server exited with code ${code}, signal ${signal}`);
            debug(`[EXIT] Process ${this.process.pid} exited`);
            debug(`[EXIT] Final buffer state:`, JSON.stringify(this.buffer));
            this.connected = false;
            this.emit('exit', { code, signal });
        });

        // Handle process errors
        this.process.on('error', (error) => {
            console.error(`Failed to start MCP server:`, error);
            debug(`[ERROR] Process error:`, error.stack);
            this.emit('error', error);
        });

        this.connected = true;
        debug(`[STARTED] Server connected: ${this.connected}`);
    }

    processBuffer() {
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';
        
        debug(`[PROCESS_BUFFER] Found ${lines.length} complete lines`);
        debug(`[PROCESS_BUFFER] Remaining buffer: ${JSON.stringify(this.buffer)}`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            debug(`[PROCESS_BUFFER] Line ${i + 1}/${lines.length}: ${JSON.stringify(line)}`);
            
            if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    debug(`[PARSED] Message:`, JSON.stringify(message, null, 2));
                    this.emit('message', message);
                } catch (error) {
                    console.error('Failed to parse message:', line);
                    debug(`[PARSE_ERROR] Error:`, error.message);
                    debug(`[PARSE_ERROR] Line length:`, line.length);
                    debug(`[PARSE_ERROR] Line chars:`, Array.from(line).map(c => c.charCodeAt(0)));
                }
            } else {
                debug(`[PROCESS_BUFFER] Skipping empty line`);
            }
        }
    }

    send(message) {
        if (!this.connected || !this.process) {
            debug(`[SEND] Cannot send - connected: ${this.connected}, process: ${!!this.process}`);
            throw new Error('Server not connected');
        }

        const data = JSON.stringify(message) + '\n';
        debug(`[SEND] Sending message to stdin:`, JSON.stringify(message, null, 2));
        debug(`[SEND] Raw data (${data.length} bytes):`, JSON.stringify(data));
        
        this.process.stdin.write(data, (err) => {
            if (err) {
                console.error(`[SEND] Error writing to stdin:`, err);
                debug(`[SEND] Write error:`, err.stack);
            } else {
                debug(`[SEND] Successfully wrote to stdin`);
            }
        });
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.connected = false;
        }
    }
}

/**
 * HTTP request handler
 */
function handleRequest(req, res) {
    debug(`[HTTP] ${req.method} ${req.url}`);
    debug(`[HTTP] Headers:`, JSON.stringify(req.headers, null, 2));
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        debug(`[HTTP] CORS preflight request`);
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }
    
    // Apply OAuth authentication middleware for protected endpoints
    const url = new URL(req.url, `http://${req.headers.host}`);
    const isProtectedEndpoint = ['/mcp/start', '/mcp/stop', '/mcp/command'].includes(url.pathname);
    
    if (isProtectedEndpoint) {
        // Use OAuth middleware authentication
        oauthMiddleware.authenticate(req, res, () => {
            continueRequest(req, res);
        });
    } else {
        continueRequest(req, res);
    }
}

function continueRequest(req, res) {

    const url = new URL(req.url, `http://${req.headers.host}`);
    debug(`[HTTP] Parsed URL:`, url.pathname);
    
    // SSE endpoint for server events
    if (req.method === 'GET' && url.pathname === '/mcp/events') {
        debug(`[HTTP] SSE events request`);
        handleSSE(req, res);
        return;
    }

    // Command endpoint for sending messages to servers
    if (req.method === 'POST' && url.pathname === '/mcp/command') {
        handleCommand(req, res);
        return;
    }

    // Start server endpoint
    if (req.method === 'POST' && url.pathname === '/mcp/start') {
        handleStart(req, res);
        return;
    }

    // Stop server endpoint
    if (req.method === 'POST' && url.pathname === '/mcp/stop') {
        handleStop(req, res);
        return;
    }

    // List servers endpoint
    if (req.method === 'GET' && url.pathname === '/mcp/list') {
        handleList(req, res);
        return;
    }

    // OAuth endpoints
    if (req.method === 'POST' && url.pathname === '/oauth/credentials') {
        handleOAuthCredentials(req, res);
        return;
    }

    if (req.method === 'GET' && url.pathname === '/oauth/status') {
        handleOAuthStatus(req, res);
        return;
    }

    if (req.method === 'POST' && url.pathname === '/oauth/refresh') {
        handleOAuthRefresh(req, res);
        return;
    }

    // Health check
    if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            servers: activeServers.size,
            oauth: oauthMiddleware.getOAuthStatus()
        }));
        return;
    }

    // Root endpoint - redirect to health for basic connectivity tests
    if (req.method === 'GET' && url.pathname === '/') {
        debug(`[HTTP] Root endpoint accessed, redirecting to health check`);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            name: 'MCP Stdio Proxy',
            version: '1.0.0',
            status: 'running',
            servers: activeServers.size,
            endpoints: ['/health', '/mcp/start', '/mcp/stop', '/mcp/command', '/mcp/events', '/mcp/list']
        }));
        return;
    }

    // 404 for unknown routes
    res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Handle SSE connection for server events
 */
function handleSSE(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const serverName = url.searchParams.get('server') || req.headers['x-server-name'];
    debug(`[SSE] Request for server: ${serverName}`);
    debug(`[SSE] Active servers:`, Array.from(activeServers.keys()));
    
    if (!serverName || !activeServers.has(serverName)) {
        debug(`[SSE] Server not found: ${serverName}`);
        res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server not found' }));
        return;
    }

    const server = activeServers.get(serverName);
    debug(`[SSE] Found server, establishing SSE connection`);

    res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // Send initial connection event
    const connectedEvent = `event: connected\ndata: ${JSON.stringify({ serverName })}\n\n`;
    debug(`[SSE] Sending connected event:`, connectedEvent);
    res.write(connectedEvent);

    // Forward messages from server to client
    const messageHandler = (message) => {
        const sseData = `data: ${JSON.stringify(message)}\n\n`;
        debug(`[SSE] Forwarding message to client:`, sseData);
        res.write(sseData);
    };

    const exitHandler = ({ code, signal }) => {
        const exitEvent = `event: exit\ndata: ${JSON.stringify({ code, signal })}\n\n`;
        debug(`[SSE] Server exited, sending exit event:`, exitEvent);
        res.write(exitEvent);
        res.end();
    };

    server.on('message', messageHandler);
    server.on('exit', exitHandler);
    debug(`[SSE] Event handlers attached`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
        debug(`[SSE] Sending keepalive`);
        res.write(':keepalive\n\n');
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
        debug(`[SSE] Client disconnected`);
        clearInterval(keepAlive);
        server.off('message', messageHandler);
        server.off('exit', exitHandler);
    });
}

/**
 * Handle command sending to server
 */
async function handleCommand(req, res) {
    const serverName = req.headers['x-server-name'];
    debug(`[COMMAND] Request for server: ${serverName}`);
    
    if (!serverName || !activeServers.has(serverName)) {
        debug(`[COMMAND] Server not found: ${serverName}`);
        res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server not found' }));
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk;
        debug(`[COMMAND] Received data chunk (${chunk.length} bytes)`);
    });
    
    req.on('end', () => {
        debug(`[COMMAND] Complete body (${body.length} bytes):`, body);
        
        try {
            const message = JSON.parse(body);
            debug(`[COMMAND] Parsed message:`, JSON.stringify(message, null, 2));
            
            const server = activeServers.get(serverName);
            server.send(message);

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            debug(`[COMMAND] Response sent successfully`);
        } catch (error) {
            debug(`[COMMAND] Error:`, error.message);
            debug(`[COMMAND] Error stack:`, error.stack);
            res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

/**
 * Handle starting a new server
 */
async function handleStart(req, res) {
    debug(`[START] Server start request`);
    
    let body = '';
    req.on('data', chunk => {
        body += chunk;
        debug(`[START] Received data chunk (${chunk.length} bytes)`);
    });
    
    req.on('end', () => {
        debug(`[START] Complete body (${body.length} bytes):`, body);
        
        try {
            const { name, command, args = [], env = {} } = JSON.parse(body);
            debug(`[START] Parsed request:`, { name, command, args, env });

            if (!name || !command) {
                debug(`[START] Missing required fields - name: ${name}, command: ${command}`);
                res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Name and command are required' }));
                return;
            }

            if (activeServers.has(name)) {
                debug(`[START] Server already running: ${name}`);
                res.writeHead(409, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Server already running' }));
                return;
            }

            debug(`[START] Creating new server process:`, { command, args, env });
            const server = new MCPServerProcess(command, args, env, name);
            server.start();
            activeServers.set(name, server);
            debug(`[START] Server added to active servers. Total servers: ${activeServers.size}`);

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, name }));
            debug(`[START] Success response sent`);
        } catch (error) {
            debug(`[START] Error:`, error.message);
            debug(`[START] Error stack:`, error.stack);
            res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

/**
 * Handle stopping a server
 */
async function handleStop(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { name } = JSON.parse(body);

            if (!name || !activeServers.has(name)) {
                res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Server not found' }));
                return;
            }

            const server = activeServers.get(name);
            server.stop();
            activeServers.delete(name);

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

/**
 * Handle listing active servers
 */
function handleList(req, res) {
    const servers = Array.from(activeServers.entries()).map(([name, server]) => ({
        name,
        command: server.command,
        args: server.args,
        connected: server.connected
    }));

    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ servers }));
}

/**
 * Handle OAuth credentials endpoint
 */
async function handleOAuthCredentials(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { serverName, credentials } = JSON.parse(body);

            if (!serverName || !credentials) {
                res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing serverName or credentials' }));
                return;
            }

            // Store OAuth credentials for the server
            oauthMiddleware.setServerCredentials(serverName, credentials);

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, serverName }));
        } catch (error) {
            res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

/**
 * Handle OAuth status endpoint
 */
function handleOAuthStatus(req, res) {
    const status = oauthMiddleware.getOAuthStatus();
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
}

/**
 * Handle OAuth token refresh endpoint
 */
async function handleOAuthRefresh(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { serverName } = JSON.parse(body);

            if (!serverName) {
                res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing serverName' }));
                return;
            }

            const refreshed = await oauthMiddleware.refreshServerToken(serverName);

            if (refreshed) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, serverName, refreshed: true }));
            } else {
                res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Token refresh failed',
                    serverName,
                    refreshed: false
                }));
            }
        } catch (error) {
            res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`\n🔌 MCP Stdio Proxy running on http://localhost:${PORT}`);
    console.log(`📊 Debug mode: ${DEBUG ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🌐 CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`🔐 OAuth authentication: ${oauthMiddleware.enableAuth ? 'ENABLED' : 'DISABLED'}`);
    console.log('\n📡 Endpoints:');
    console.log(`  POST   /mcp/start         - Start a new MCP server`);
    console.log(`  POST   /mcp/stop          - Stop an MCP server`);
    console.log(`  POST   /mcp/command       - Send command to server`);
    console.log(`  GET    /mcp/events        - SSE event stream`);
    console.log(`  GET    /mcp/list          - List active servers`);
    console.log(`  GET    /health            - Health check`);
    console.log(`  POST   /oauth/credentials - Set OAuth credentials`);
    console.log(`  GET    /oauth/status      - OAuth status`);
    console.log(`  POST   /oauth/refresh     - Refresh OAuth token`);
    
    console.log('\n💡 Usage examples:');
    console.log('   Basic:           node server.js');
    console.log('   With debug:      node server.js --debug');
    console.log('   Custom port:     node server.js 8080');
    console.log('   Port + debug:    node server.js 8080 --debug');
    console.log('   Environment:     DEBUG=true PORT=8080 node server.js');
    
    console.log('\n🚀 Ready to accept MCP connections from hacka.re!\n');
    
    // Set up OAuth token cleanup interval
    if (oauthMiddleware.enableAuth) {
        setInterval(() => {
            oauthMiddleware.cleanupExpiredTokens();
        }, 5 * 60 * 1000); // Clean up every 5 minutes
        console.log('🧹 OAuth token cleanup scheduled every 5 minutes');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    
    // Stop all servers
    for (const [name, server] of activeServers) {
        console.log(`Stopping ${name}...`);
        server.stop();
    }
    
    server.close(() => {
        console.log('Proxy stopped');
        process.exit(0);
    });
});