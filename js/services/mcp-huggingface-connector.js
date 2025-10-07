/**
 * Hugging Face Service Connector for MCP
 * Uses Hugging Face Access Tokens for authentication
 * Connects to HF MCP server via proxy with Bearer token
 */

(function(global) {
    'use strict';

    class HuggingFaceConnector extends global.BaseServiceConnector {
        constructor() {
            super('huggingface', {
                name: 'Hugging Face',
                icon: 'images/huggingface-icon.svg',
                iconType: 'svg',
                description: 'Access Hugging Face Hub: search models, datasets, Spaces, papers, and run AI apps',
                authType: 'token',
                mcpServerUrl: 'http://localhost:8014/mcp',
                apiBaseUrl: 'https://huggingface.co/api',
                setupInstructions: {
                    title: 'Hugging Face Access Token Setup',
                    steps: [
                        '1. Go to https://huggingface.co/settings/tokens',
                        '2. Click "New token" button',
                        '3. Give your token a name like "hacka.re MCP"',
                        '4. Select token type: "Read" (or "Write" if you need write access)',
                        '5. Click "Generate token"',
                        '6. Copy the token immediately (you won\'t see it again)',
                        '7. Paste the token when prompted below',
                        'Note: Your token will be encrypted and stored locally',
                        '',
                        '⚠️ Proxy Required: Make sure the proxy is running:',
                        '  .venv/bin/python mcp_proxy/huggingface_proxy.py'
                    ],
                    docUrl: 'https://huggingface.co/settings/tokens'
                },
                tools: {} // Tools will be discovered via introspection
            });

            this.mcpClient = null;
            this.discoveredTools = {};
        }

        /**
         * Connect to Hugging Face using access token
         */
        async connect() {
            console.log('[HuggingFaceConnector] Starting connection...');

            // First try to load existing connection
            await this.loadConnection();
            if (this.isConnected()) {
                console.log('[HuggingFaceConnector] Using loaded connection');
                // Reconnect MCP client with token
                await this.reconnectMCPClient();
                return true;
            }

            // Check for existing token
            const storageKey = this.getStorageKey('access_token');
            const existingToken = await this.storage.getValue(storageKey);

            if (existingToken) {
                const isValid = await this.validateToken(existingToken);
                if (isValid) {
                    console.log('[HuggingFaceConnector] Using existing access token');
                    await this.createConnection(existingToken);
                    return true;
                }
            }

            // No valid token found - show UI to get one
            if (window.mcpServiceUIHelper) {
                const token = await window.mcpServiceUIHelper.showAPIKeyInputDialog('huggingface', this.config);
                if (token) {
                    await this.createConnection(token);
                    return true;
                }
            }

            return false;
        }

        /**
         * Check if credentials are valid
         */
        hasValidCredentials() {
            if (!this.connection) {
                return false;
            }

            return !!(this.connection.accessToken && this.connection.accessToken.length > 0);
        }

        /**
         * Create connection with access token
         */
        async createConnection(accessToken) {
            console.log('[HuggingFaceConnector] Creating connection with token');

            // Validate token first
            const isValid = await this.validateToken(accessToken);
            if (!isValid) {
                throw new Error('Invalid Hugging Face access token. Please check your token and try again.');
            }

            const connectionData = {
                type: 'token',
                accessToken: accessToken,
                connectedAt: Date.now(),
                lastValidated: Date.now()
            };

            await this.storeConnection(connectionData);

            // Store token separately for compatibility
            const tokenStorage = this.getStorageKey('access_token');
            await this.storage.setValue(tokenStorage, accessToken);

            // Connect to MCP server with token
            await this.connectMCPServer(accessToken);

            // Discover tools via introspection
            await this.discoverTools();

            // Update connection with discovered tools
            connectionData.tools = this.discoveredTools;
            await this.storeConnection(connectionData);

            // Register tools
            await this.registerTools();

            // Auto-enable the Hugging Face prompt
            if (window.DefaultPromptsService && window.HuggingFaceIntegrationGuide) {
                try {
                    window.DefaultPromptsService.registerPrompt(window.HuggingFaceIntegrationGuide);
                    window.DefaultPromptsService.enablePrompt('Hugging Face MCP prompt');
                    console.log('[HuggingFaceConnector] Auto-enabled Hugging Face prompt');
                } catch (error) {
                    console.warn('[HuggingFaceConnector] Failed to enable prompt:', error);
                }
            }

            console.log('[HuggingFaceConnector] Connected successfully');
            return true;
        }

        /**
         * Validate Hugging Face access token
         */
        async validateToken(token) {
            try {
                // Test token by calling HF API whoami endpoint
                const response = await fetch('https://huggingface.co/api/whoami-v2', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('[HuggingFaceConnector] Token valid for user:', data.name || data.id);
                    return true;
                }

                console.error('[HuggingFaceConnector] Token validation failed:', response.status);
                return false;
            } catch (error) {
                console.error('[HuggingFaceConnector] Token validation error:', error);
                return false;
            }
        }

        /**
         * Connect to MCP server with authentication token
         */
        async connectMCPServer(accessToken) {
            if (!window.MCPClientService) {
                throw new Error('MCP Client Service not available');
            }

            const serverName = 'huggingface-mcp';
            const mcpConfig = {
                name: serverName,
                description: this.config.description,
                skipAutoToolRegistration: true, // We handle tool registration manually for better control
                transport: {
                    type: 'http',
                    url: this.config.mcpServerUrl,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            };

            try {
                console.log('[HuggingFaceConnector] Connecting to MCP server with token authentication');

                // Try a ping first to check if proxy is available
                try {
                    const pingResponse = await fetch(this.config.mcpServerUrl, {
                        method: 'POST',
                        headers: mcpConfig.transport.headers,
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 'ping-test',
                            method: 'ping'
                        })
                    });

                    // If we get a response (even 400), the proxy is working
                    // HF MCP requires session ID, so 400 with "Session ID required" means proxy is OK
                    if (!pingResponse.ok) {
                        // Check if it's the expected "Session ID required" error
                        try {
                            const errorBody = await pingResponse.json();
                            if (errorBody.error && errorBody.error.message === 'Session ID required') {
                                console.log('[HuggingFaceConnector] Proxy is working (session ID will be handled by MCP client)');
                                // Proxy is working, continue with normal MCP connection
                            } else {
                                throw new Error(`Proxy returned unexpected error: ${JSON.stringify(errorBody)}`);
                            }
                        } catch (jsonError) {
                            throw new Error(`Proxy returned status ${pingResponse.status}`);
                        }
                    }
                } catch (pingError) {
                    console.error('[HuggingFaceConnector] Ping test failed:', pingError);

                    // Only show modal if it's a network error (proxy not running)
                    // TypeError: Failed to fetch = proxy is not running
                    if (pingError.name === 'TypeError' || pingError.message.includes('Failed to fetch')) {
                        // Show modal with proxy setup instructions
                        this.showProxyRequiredModal();

                        throw new Error(
                            'Failed to connect to Hugging Face MCP proxy.\n\n' +
                            'Please start the proxy server:\n' +
                            '  .venv/bin/python mcp_proxy/huggingface_proxy.py\n\n' +
                            'Then try connecting again.'
                        );
                    }

                    // For other errors, let them propagate
                    throw pingError;
                }

                await window.MCPClientService.connect(serverName, mcpConfig);
                this.mcpClient = window.MCPClientService;
                console.log('[HuggingFaceConnector] MCP server connected');
                return true;
            } catch (error) {
                console.error('[HuggingFaceConnector] MCP connection error:', error);

                // Check if it's a proxy error
                if (error.message && error.message.includes('Failed to fetch')) {
                    // Show modal with proxy setup instructions
                    this.showProxyRequiredModal();

                    throw new Error(
                        'Failed to connect to Hugging Face MCP proxy.\n\n' +
                        'Please start the proxy server:\n' +
                        '  .venv/bin/python mcp_proxy/huggingface_proxy.py\n\n' +
                        'Then try connecting again.'
                    );
                }

                throw error;
            }
        }

        /**
         * Reconnect MCP client after loading saved connection
         */
        async reconnectMCPClient() {
            if (!window.MCPClientService || !this.connection || !this.connection.accessToken) {
                return false;
            }

            const serverName = 'huggingface-mcp';
            const connectionInfo = window.MCPClientService.getConnectionInfo(serverName);

            if (connectionInfo && connectionInfo.connected) {
                this.mcpClient = window.MCPClientService;
                // Reload tools from connection
                if (this.connection.tools) {
                    this.discoveredTools = this.connection.tools;
                }
                return true;
            }

            // Need to reconnect
            return await this.connectMCPServer(this.connection.accessToken);
        }

        /**
         * Discover available tools via MCP introspection
         */
        async discoverTools() {
            console.log('[HuggingFaceConnector] Discovering tools via introspection...');

            if (!this.mcpClient) {
                throw new Error('MCP client not connected');
            }

            try {
                const serverName = 'huggingface-mcp';
                const connectionInfo = this.mcpClient.getConnectionInfo(serverName);

                if (!connectionInfo || !connectionInfo.tools) {
                    console.warn('[HuggingFaceConnector] No tools discovered');
                    return;
                }

                // Convert MCP tool definitions to our format
                // Store both the display name (without hf_) and the MCP server name (as-is)
                for (const tool of connectionInfo.tools) {
                    const toolName = tool.name.replace('hf_', ''); // Remove hf_ prefix for display/registration

                    this.discoveredTools[toolName] = {
                        mcpName: tool.name, // Store the original MCP server name
                        description: tool.description || `Hugging Face tool: ${toolName}`,
                        parameters: tool.inputSchema || {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                    };
                }

                console.log(`[HuggingFaceConnector] Discovered ${Object.keys(this.discoveredTools).length} tools:`,
                    Object.keys(this.discoveredTools));

            } catch (error) {
                console.error('[HuggingFaceConnector] Tool discovery failed:', error);
                throw error;
            }
        }

        /**
         * Get tools to register
         */
        getToolsToRegister() {
            return this.discoveredTools;
        }

        /**
         * Execute Hugging Face tool via MCP
         */
        async executeTool(toolName, params) {
            console.log('[HuggingFaceConnector] executeTool called:', { toolName, params });

            if (!this.mcpClient) {
                throw new Error('Hugging Face MCP not connected');
            }

            const serverName = 'huggingface-mcp';

            // discoveredTools is a dictionary where keys are tool names (without hf_ prefix)
            // and values contain the original MCP server name
            let mcpToolName = toolName;

            // Remove hf_ prefix if present to match discoveredTools keys
            const toolBaseName = toolName.replace(/^hf_/, '');

            // Check if this tool exists in our discovered tools
            if (this.discoveredTools[toolBaseName]) {
                // Use the original MCP server name (some have hf_ prefix, some don't)
                mcpToolName = this.discoveredTools[toolBaseName].mcpName;
                console.log(`[HuggingFaceConnector] Found tool in registry, using MCP name: ${mcpToolName}`);
            } else {
                // Fallback: use the tool name as-is
                mcpToolName = toolName;
                console.log(`[HuggingFaceConnector] Tool not in registry, using as-is: ${mcpToolName}`);
            }

            try {
                console.log(`[HuggingFaceConnector] Calling MCP tool: ${mcpToolName}`);
                console.log(`[HuggingFaceConnector] Tool params:`, JSON.stringify(params, null, 2));

                const result = await this.mcpClient.callTool(serverName, mcpToolName, params);

                console.log('[HuggingFaceConnector] ===== TOOL RESULT =====');
                console.log('[HuggingFaceConnector] Result type:', typeof result);
                console.log('[HuggingFaceConnector] Result keys:', result ? Object.keys(result) : 'null');
                console.log('[HuggingFaceConnector] Full result:', JSON.stringify(result, null, 2));

                // Special logging for image generation tools
                if (toolName.includes('infer') || toolName.includes('image') || toolName.includes('gr1')) {
                    console.log('[HuggingFaceConnector] 🖼️ IMAGE GENERATION RESULT DETECTED');
                    if (result && result.content) {
                        console.log('[HuggingFaceConnector] Content array length:', result.content.length);
                        result.content.forEach((item, index) => {
                            console.log(`[HuggingFaceConnector] Content[${index}]:`, {
                                type: item.type,
                                hasData: !!item.data,
                                dataLength: item.data ? item.data.length : 0,
                                mimeType: item.mimeType
                            });
                        });
                    }
                }

                console.log('[HuggingFaceConnector] =====================');
                return result;
            } catch (error) {
                console.error('[HuggingFaceConnector] Tool execution failed:', error);
                throw error;
            }
        }

        /**
         * Validate connection
         */
        async validate() {
            if (!this.connection || !this.connection.accessToken) {
                return false;
            }

            // Validate token
            const isValid = await this.validateToken(this.connection.accessToken);

            if (isValid) {
                this.connection.lastValidated = Date.now();
                await this.storeConnection(this.connection);
                return true;
            }

            return false;
        }

        /**
         * Disconnect from Hugging Face MCP
         */
        async disconnect() {
            console.log('[HuggingFaceConnector] Disconnecting...');

            // Disconnect MCP client
            if (this.mcpClient) {
                const serverName = 'huggingface-mcp';
                try {
                    await this.mcpClient.disconnect(serverName);
                } catch (error) {
                    console.warn('[HuggingFaceConnector] MCP disconnect error:', error);
                }
                this.mcpClient = null;
            }

            // Clear discovered tools
            this.discoveredTools = {};

            // Disable the Hugging Face prompt
            if (window.DefaultPromptsService) {
                try {
                    window.DefaultPromptsService.disablePrompt('Hugging Face MCP prompt');
                } catch (error) {
                    console.warn('[HuggingFaceConnector] Failed to disable prompt:', error);
                }
            }

            // Clear connection
            await this.clearConnection();

            console.log('[HuggingFaceConnector] Disconnected');
            return true;
        }

        /**
         * Show modal with proxy setup instructions
         */
        showProxyRequiredModal() {
            // Remove existing modal if present
            const existingModal = document.getElementById('huggingface-proxy-required-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'huggingface-proxy-required-modal';
            modal.style.zIndex = '10001'; // Ensure it's on top

            modal.innerHTML = `
                <div class="modal-content">
                    <h3>⚠️ Hugging Face MCP Proxy Required</h3>

                    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 1rem; margin-bottom: 1rem;">
                        <strong>🧪 Experimental Feature</strong><br>
                        Hugging Face MCP integration is experimental and requires a local proxy server.
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <p><strong>Why do I need a proxy?</strong></p>
                        <p>hacka.re is not yet on the CORS allow list for Hugging Face's MCP server.
                           Until this is resolved, you need to run a local proxy that forwards requests.</p>
                    </div>

                    <div style="background: #f8f9fa; border-radius: 4px; padding: 1rem; margin-bottom: 1rem;">
                        <p><strong>📝 To start the proxy:</strong></p>
                        <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li>Open a terminal in your repository root</li>
                            <li>Run this command:</li>
                        </ol>
                        <div style="background: #2d2d2d; color: #f8f8f2; padding: 0.75rem; border-radius: 4px; margin: 0.5rem 0; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">
                            .venv/bin/python mcp_proxy/huggingface_proxy.py
                        </div>
                        <ol start="3" style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li>Leave the proxy running while using Hugging Face features</li>
                            <li>Come back here and try connecting again</li>
                        </ol>
                    </div>

                    <div style="background: #e7f3ff; border: 1px solid #2196F3; border-radius: 4px; padding: 1rem; margin-bottom: 1rem; font-size: 0.9em;">
                        <strong>💡 Note:</strong> The proxy runs on <code>localhost:8014</code> and only forwards requests to Hugging Face.
                        Your access token is sent directly to Hugging Face's servers.
                    </div>

                    <div class="modal-buttons" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button id="hf-proxy-modal-close" class="btn btn-primary" style="padding: 0.5rem 1.5rem;">
                            Got it!
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add close handler
            const closeBtn = document.getElementById('hf-proxy-modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => modal.remove();
            }

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            // Close on Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }
    }

    // Export to global scope
    global.HuggingFaceConnector = HuggingFaceConnector;

})(window);
