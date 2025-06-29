#!/usr/bin/env node

/**
 * Context7 MCP Wrapper
 * 
 * This wrapper connects to the Context7 remote server and exposes it as a stdio MCP server
 * to work with hacka.re's proxy system
 */

const readline = require('readline');
const https = require('https');

// Setup stdio interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Log to stderr to avoid interfering with stdio protocol
const log = (msg) => {
    process.stderr.write(`[Context7 Wrapper] ${msg}\n`);
};

log('Context7 MCP Wrapper starting...');

// Buffer for incomplete messages
let buffer = '';

// Handle incoming messages
rl.on('line', async (line) => {
    try {
        const message = JSON.parse(line);
        log(`Received: ${JSON.stringify(message)}`);
        
        // Handle different message types
        if (message.method === 'initialize') {
            // Respond to initialization
            const response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    protocolVersion: '0.1.0',
                    capabilities: {
                        tools: {},
                        resources: {}
                    },
                    serverInfo: {
                        name: 'context7-wrapper',
                        version: '1.0.0'
                    }
                }
            };
            console.log(JSON.stringify(response));
            
        } else if (message.method === 'tools/list') {
            // Return Context7 tools
            const response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    tools: [
                        {
                            name: 'resolve-library-id',
                            description: 'Resolves a general library name into a Context7-compatible library ID',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    libraryName: {
                                        type: 'string',
                                        description: 'The name of the library to search for'
                                    }
                                },
                                required: ['libraryName']
                            }
                        },
                        {
                            name: 'get-library-docs',
                            description: 'Fetches documentation for a library using a Context7-compatible library ID',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    context7CompatibleLibraryID: {
                                        type: 'string',
                                        description: 'Exact Context7-compatible library ID (e.g., /mongodb/docs, /vercel/next.js)'
                                    },
                                    topic: {
                                        type: 'string',
                                        description: 'Focus the docs on a specific topic (e.g., "routing", "hooks")'
                                    },
                                    tokens: {
                                        type: 'number',
                                        description: 'Max number of tokens to return',
                                        default: 10000
                                    }
                                },
                                required: ['context7CompatibleLibraryID']
                            }
                        }
                    ]
                }
            };
            console.log(JSON.stringify(response));
            
        } else if (message.method === 'tools/call') {
            // Forward tool calls to Context7 remote server
            // This would require implementing the actual HTTP/SSE connection
            // For now, return a placeholder response
            const response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    content: [
                        {
                            type: 'text',
                            text: 'Context7 wrapper is connected but remote forwarding not yet implemented. Please use the official Context7 MCP server directly.'
                        }
                    ]
                }
            };
            console.log(JSON.stringify(response));
            
        } else if (message.method === 'notifications/initialized') {
            // Ignore notification
            log('Client initialized notification received');
        } else {
            // Unknown method
            const response = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                    code: -32601,
                    message: 'Method not found'
                }
            };
            console.log(JSON.stringify(response));
        }
        
    } catch (error) {
        log(`Error processing message: ${error.message}`);
        // Try to send error response if we can parse the ID
        try {
            const partialMessage = JSON.parse(line);
            if (partialMessage.id) {
                const response = {
                    jsonrpc: '2.0',
                    id: partialMessage.id,
                    error: {
                        code: -32700,
                        message: 'Parse error',
                        data: error.message
                    }
                };
                console.log(JSON.stringify(response));
            }
        } catch (e) {
            // Can't even parse ID, ignore
        }
    }
});

// Handle process termination
process.on('SIGINT', () => {
    log('Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Shutting down...');
    process.exit(0);
});

log('Context7 MCP Wrapper ready');