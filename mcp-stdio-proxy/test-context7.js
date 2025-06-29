#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Testing Context7 MCP server...\n');

// Start Context7 server
const context7 = spawn('npx', ['-y', '@upstash/context7-mcp@latest'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialize message
const initMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
            name: 'test-client',
            version: '1.0.0'
        }
    }
};

console.log('Sending initialize message:', JSON.stringify(initMessage));
context7.stdin.write(JSON.stringify(initMessage) + '\n');

// Capture output
context7.stdout.on('data', (data) => {
    console.log('STDOUT:', data.toString());
});

context7.stderr.on('data', (data) => {
    console.log('STDERR:', data.toString());
});

// After 2 seconds, send tools/list
setTimeout(() => {
    const toolsMessage = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
    };
    console.log('\nSending tools/list message:', JSON.stringify(toolsMessage));
    context7.stdin.write(JSON.stringify(toolsMessage) + '\n');
}, 2000);

// Exit after 5 seconds
setTimeout(() => {
    console.log('\nTest complete, exiting...');
    context7.kill();
    process.exit(0);
}, 5000);

context7.on('exit', (code, signal) => {
    console.log(`\nContext7 exited with code ${code}, signal ${signal}`);
});