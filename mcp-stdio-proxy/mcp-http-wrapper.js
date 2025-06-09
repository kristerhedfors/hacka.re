#!/usr/bin/env node
/**
 * MCP HTTP Wrapper - One-liner solution
 * 
 * Wraps any stdio-based MCP server with HTTP/SSE interface for direct hacka.re connection
 * Usage: node mcp-http-wrapper.js <command> [args...] [--port=3001] [--debug]
 * 
 * Examples:
 *   node mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem /Users/username/Desktop
 *   node mcp-http-wrapper.js --port=8080 npx @modelcontextprotocol/server-memory
 *   node mcp-http-wrapper.js docker run -i --rm mcp/filesystem /projects --port=3001 --debug
 */

const http = require('http');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 3001;
let debug = false;
let serverCommand = [];

// Check for help
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.error('Usage: node mcp-http-wrapper.js <command> [args...] [--port=3001] [--debug]');
    console.error('');
    console.error('Wraps any stdio-based MCP server with HTTP/SSE interface for direct hacka.re connection');
    console.error('');
    console.error('Examples:');
    console.error('  node mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem /Users/username/Desktop');
    console.error('  node mcp-http-wrapper.js npx @modelcontextprotocol/server-memory');
    console.error('  node mcp-http-wrapper.js docker run -i --rm mcp/filesystem /projects --port=8080 --debug');
    console.error('');
    console.error('Options:');
    console.error('  --port=PORT     HTTP server port (default: 3001)');
    console.error('  --debug         Enable debug output');
    console.error('  --help, -h      Show this help');
    process.exit(0);
}

// Separate flags from command
const commandFlags = [];
const commandArgs = [];
let parsingFlags = true;

for (const arg of args) {
    if (parsingFlags && arg.startsWith('--port=')) {
        port = parseInt(arg.split('=')[1]) || 3001;
        commandFlags.push(arg);
    } else if (parsingFlags && arg === '--debug') {
        debug = true;
        commandFlags.push(arg);
    } else {
        // Once we hit a non-flag, everything else is the command
        parsingFlags = false;
        commandArgs.push(arg);
    }
}

// Handle mixed case where flags appear after command
serverCommand = commandArgs.filter(arg => !arg.startsWith('--port=') && arg !== '--debug');

// Extract any remaining flags from server command
for (const arg of commandArgs) {
    if (arg.startsWith('--port=')) {
        port = parseInt(arg.split('=')[1]) || 3001;
    } else if (arg === '--debug') {
        debug = true;
    }
}

if (serverCommand.length === 0) {
    console.error('❌ Error: No command provided');
    console.error('');
    console.error('Usage: node mcp-http-wrapper.js <command> [args...] [--port=3001] [--debug]');
    console.error('Example: node mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem $HOME');
    process.exit(1);
}

const command = serverCommand[0];
const mcpArgs = serverCommand.slice(1);

// Debug logging
function log(...args) {
    if (debug) {
        console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
};

/**
 * MCP Server Process Manager
 */
class MCPServerProcess extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.buffer = '';
        this.connected = false;
    }

    start() {
        console.log(`🚀 Starting MCP server: ${command} ${mcpArgs.join(' ')}`);
        
        this.process = spawn(command, mcpArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        log(`Process spawned with PID: ${this.process.pid}`);

        // Handle stdout (responses from server)
        this.process.stdout.on('data', (data) => {
            const chunk = data.toString();
            log(`[STDOUT] Raw data (${chunk.length} bytes):`, JSON.stringify(chunk));
            
            this.buffer += chunk;
            this.processBuffer();
        });

        // Handle stderr (error messages)
        this.process.stderr.on('data', (data) => {
            const stderr = data.toString();
            console.error(`[MCP] stderr:`, stderr);
        });

        // Handle process exit
        this.process.on('exit', (code, signal) => {
            console.log(`💀 MCP server exited with code ${code}, signal ${signal}`);
            this.connected = false;
            this.emit('exit', { code, signal });
        });

        // Handle process errors
        this.process.on('error', (error) => {
            console.error(`❌ Failed to start MCP server:`, error);
            this.emit('error', error);
        });

        this.connected = true;
        log(`Server connected: ${this.connected}`);
    }

    processBuffer() {
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';
        
        log(`Found ${lines.length} complete lines`);

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    log(`Parsed message:`, JSON.stringify(message, null, 2));
                    this.emit('message', message);
                } catch (error) {
                    console.error('Failed to parse message:', line);
                    log(`Parse error:`, error.message);
                }
            }
        }
    }

    send(message) {
        if (!this.connected || !this.process) {
            throw new Error('Server not connected');
        }

        const data = JSON.stringify(message) + '\n';
        log(`Sending message to stdin:`, JSON.stringify(message, null, 2));
        
        this.process.stdin.write(data, (err) => {
            if (err) {
                console.error(`Error writing to stdin:`, err);
            } else {
                log(`Successfully wrote to stdin`);
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

// Create MCP server instance
const mcpServer = new MCPServerProcess();
const sseClients = new Set();
const pendingRequests = new Map();

/**
 * HTTP request handler
 */
function handleRequest(req, res) {
    log(`${req.method} ${req.url}`);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // SSE endpoint for server events
    if (req.method === 'GET' && url.pathname === '/mcp/events') {
        handleSSE(req, res);
        return;
    }

    // Command endpoint for sending messages to server
    if (req.method === 'POST' && url.pathname === '/mcp/command') {
        handleCommand(req, res);
        return;
    }

    // Health check
    if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            server: `${command} ${mcpArgs.join(' ')}`,
            connected: mcpServer.connected
        }));
        return;
    }

    // Root endpoint
    if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            name: 'MCP HTTP Wrapper',
            version: '1.0.0',
            status: 'running',
            server: `${command} ${mcpArgs.join(' ')}`,
            connected: mcpServer.connected,
            endpoints: ['/health', '/mcp/command', '/mcp/events']
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
    log(`SSE connection established`);

    res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // Send initial connection event
    const connectedEvent = `event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`;
    res.write(connectedEvent);

    // Add client to SSE clients set
    sseClients.add(res);

    // Keep connection alive
    const keepAlive = setInterval(() => {
        log(`Sending keepalive`);
        res.write(':keepalive\n\n');
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
        log(`SSE client disconnected`);
        clearInterval(keepAlive);
        sseClients.delete(res);
    });
}

/**
 * Handle command sending to server
 */
async function handleCommand(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
        log(`Received data chunk (${chunk.length} bytes)`);
    });
    
    req.on('end', () => {
        log(`Complete body (${body.length} bytes):`, body);
        
        try {
            const message = JSON.parse(body);
            log(`Parsed message:`, JSON.stringify(message, null, 2));
            
            mcpServer.send(message);

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            log(`Response sent successfully`);
        } catch (error) {
            log(`Error:`, error.message);
            res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

// Set up MCP server event handlers
mcpServer.on('message', (message) => {
    // Forward message to all SSE clients
    const sseData = `data: ${JSON.stringify(message)}\n\n`;
    log(`Broadcasting message to ${sseClients.size} SSE clients`);
    
    for (const client of sseClients) {
        try {
            client.write(sseData);
        } catch (error) {
            log(`Failed to send to SSE client:`, error.message);
            sseClients.delete(client);
        }
    }
});

mcpServer.on('exit', ({ code, signal }) => {
    const exitEvent = `event: exit\ndata: ${JSON.stringify({ code, signal })}\n\n`;
    log(`Server exited, broadcasting to ${sseClients.size} SSE clients`);
    
    for (const client of sseClients) {
        try {
            client.write(exitEvent);
            client.end();
        } catch (error) {
            log(`Failed to send exit event to SSE client:`, error.message);
        }
    }
    
    console.log(`💀 MCP server terminated, shutting down HTTP wrapper`);
    process.exit(code || 0);
});

// Create and start HTTP server
const httpServer = http.createServer(handleRequest);

httpServer.listen(port, () => {
    console.log(`\n🔌 MCP HTTP Wrapper running on http://localhost:${port}`);
    console.log(`🖥️  MCP Server: ${command} ${mcpArgs.join(' ')}`);
    console.log(`📊 Debug mode: ${debug ? 'ENABLED' : 'DISABLED'}`);
    console.log('\n📡 Endpoints:');
    console.log(`  POST   /mcp/command - Send command to MCP server`);
    console.log(`  GET    /mcp/events  - SSE event stream from MCP server`);
    console.log(`  GET    /health      - Health check`);
    console.log(`  GET    /           - Server info`);
    
    console.log('\n💡 In hacka.re:');
    console.log(`   1. Open MCP Servers modal`);
    console.log(`   2. Set proxy URL to: http://localhost:${port}`);
    console.log(`   3. Click 'Test Connection'`);
    console.log(`   4. Add server with name 'mcp-server'`);
    console.log(`   5. Click 'Connect & Load Tools'`);
    
    console.log('\n🚀 Starting MCP server...\n');
    
    // Start the MCP server
    mcpServer.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    
    mcpServer.stop();
    
    httpServer.close(() => {
        console.log('✅ HTTP wrapper stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    mcpServer.stop();
    httpServer.close(() => {
        process.exit(0);
    });
});