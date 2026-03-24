/**
 * MCP Server Manager
 * 
 * Handles server lifecycle, connections, and server list UI
 */

window.MCPServerManager = (function() {
    // Dependencies
    let MCPClient = null;
    let proxyManager = null;
    let uiManager = null;
    let notificationHandler = null;
    let commandHistoryManager = null;
    
    /**
     * Initialize the server manager
     * @param {Object} config - Configuration object
     * @param {Object} config.MCPClient - MCP client service instance
     * @param {Object} config.proxyManager - Proxy manager instance
     * @param {Object} config.uiManager - UI manager instance
     * @param {Function} config.notificationHandler - Function to show notifications
     * @param {Object} config.commandHistoryManager - Command history manager instance
     */
    function init(config) {
        MCPClient = config.MCPClient || window.MCPClientService;
        proxyManager = config.proxyManager;
        uiManager = config.uiManager;
        notificationHandler = config.notificationHandler || console.log;
        commandHistoryManager = config.commandHistoryManager;
        
        if (!MCPClient) {
            console.error('[MCPServerManager] MCPClientService not available');
            return false;
        }
        
        // Setup form submission handler
        const elements = uiManager.getElements();
        if (elements.addServerForm) {
            elements.addServerForm.addEventListener('submit', handleFormSubmission, true);
        }
        
        return true;
    }
    
    /**
     * Handle form submission - route to proxy or existing system
     * @param {Event} e - Form submit event
     */
    async function handleFormSubmission(e) {
        if (proxyManager.isConnected()) {
            e.preventDefault();
            e.stopPropagation();
            await handleStdioServerSubmission();
        }
        // If not connected to proxy, let the existing system handle it
    }
    
    /**
     * Handle stdio server submission via proxy
     */
    async function handleStdioServerSubmission() {
        const elements = uiManager.getElements();
        const input = document.getElementById('mcp-server-url')?.value.trim();
        const selectedMode = document.querySelector('input[name="input-mode"]:checked')?.value || 'command';
        
        if (!input) {
            alert('Please provide input.\n\nExample command: npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop\n\nExample JSON: {"name": "filesystem", "command": "docker", "args": [...]}');
            return;
        }
        
        let serverName, command, args;
        
        if (selectedMode === 'json') {
            // Parse JSON configuration
            try {
                const config = JSON.parse(input);
                
                if (!config.command) {
                    alert('JSON config must include "command" field.');
                    return;
                }
                
                serverName = config.name || 'mcp-server';
                command = config.command;
                args = config.args || [];
                
                // Auto-generate name if not provided
                if (!config.name) {
                    serverName = generateServerName(command, args);
                }
                
            } catch (error) {
                alert('Invalid JSON format.\n\nExample:\n{\n  "name": "filesystem",\n  "command": "docker",\n  "args": ["run", "-i", "--rm", "..."]\n}');
                return;
            }
        } else {
            // Parse simple command
            const commandParts = input.split(/\s+/).filter(part => part);
            if (commandParts.length === 0) {
                alert('Invalid command format.');
                return;
            }
            
            command = commandParts[0];
            args = commandParts.slice(1);
            serverName = generateServerName(command, args);
        }
        
        try {
            const submitButton = elements.addServerForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = 'Starting...';
            
            await proxyManager.startServer({
                name: serverName,
                command: command,
                args: args
            });
            
            // Save command to history
            if (commandHistoryManager) {
                commandHistoryManager.saveCommand(input, serverName, selectedMode);
            }
            
            // Clear form
            document.getElementById('mcp-server-url').value = '';
            
            notificationHandler(`🚀 Started MCP server "${serverName}"`, 'success');
            
            // Update connection status and servers list  
            setTimeout(() => {
                proxyManager.checkConnection();
                updateServersList();
            }, 1000); // Give server time to start
            
        } catch (error) {
            console.error(`Failed to start stdio server ${serverName}:`, error);
            notificationHandler(`Failed to start server: ${error.message}`, 'error');
        } finally {
            const submitButton = elements.addServerForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Start Server';
        }
    }
    
    /**
     * Generate server name from command and args
     * @param {string} command - Command to run
     * @param {Array} args - Command arguments
     * @returns {string} Generated server name
     */
    function generateServerName(command, args) {
        let serverName = 'mcp-server';
        
        for (const arg of args) {
            if (arg.includes('@modelcontextprotocol/server-')) {
                const match = arg.match(/@modelcontextprotocol\/server-(.+)/);
                if (match) {
                    serverName = match[1];
                    break;
                }
            } else if (arg.includes('server-')) {
                const match = arg.match(/server-(.+)/);
                if (match) {
                    serverName = match[1];
                    break;
                }
            } else if (arg.includes('mcp/')) {
                const match = arg.match(/mcp\/(.+)/);
                if (match) {
                    serverName = match[1];
                    break;
                }
            }
        }
        
        // If server name is still generic, add timestamp
        if (serverName === 'mcp-server') {
            serverName = `mcp-server-${Date.now()}`;
        }
        
        return serverName;
    }
    
    /**
     * Update the servers list display
     */
    async function updateServersList() {
        const elements = uiManager.getElements();
        if (!proxyManager.isConnected() || !elements.serversList) {
            return;
        }
        
        try {
            const servers = await proxyManager.listServers();
            
            // Update server count in the expandable header
            if (window.MCPModalRenderer) {
                window.MCPModalRenderer.updateServerCount(servers.length);
                
                // Auto-expand servers section if there are servers
                if (servers.length > 0) {
                    window.MCPModalRenderer.autoExpandSections({ hasServers: true });
                }
            }
            
            if (servers.length === 0) {
                elements.serversList.innerHTML = '<div class="empty-mcp-servers-state"><p>No servers running. Add a server above.</p></div>';
                return;
            }
            
            // Clear existing content
            elements.serversList.innerHTML = '';
            
            // Create servers list
            servers.forEach(server => {
                const serverItem = createProxyServerItem(server);
                elements.serversList.appendChild(serverItem);
            });
        } catch (error) {
            console.error('[MCPServerManager] Failed to fetch proxy servers:', error);
            if (elements.serversList) {
                elements.serversList.innerHTML = '<div class="empty-mcp-servers-state"><p>Failed to load servers list</p></div>';
            }
            
            // Update count to 0 on error
            if (window.MCPModalRenderer) {
                window.MCPModalRenderer.updateServerCount(0);
            }
        }
    }
    
    /**
     * Create a server item for proxy-managed servers
     * @param {Object} server - Server info from proxy
     * @returns {HTMLElement} Server item element
     */
    function createProxyServerItem(server) {
        const serverItem = document.createElement('div');
        serverItem.className = 'mcp-server-item proxy-server';
        
        // Check if MCP client has an active connection to this server
        const hasActiveConnection = MCPClient && MCPClient.getConnectionInfo(server.name) !== null;
        
        const statusClass = hasActiveConnection ? 'connected' : 'disconnected';
        const statusText = hasActiveConnection ? 'Connected & Tools Loaded' : 'Process Running';
        const statusIcon = hasActiveConnection ? '✅' : '🔄';
        
        serverItem.innerHTML = `
            <div class="mcp-server-info">
                <div class="mcp-server-name">${server.name}</div>
                <div class="mcp-server-status ${statusClass}">${statusIcon} ${statusText}</div>
                <div class="mcp-server-command">${server.command} ${server.args.join(' ')}</div>
            </div>
            <div class="mcp-server-actions">
                ${!hasActiveConnection ? `
                    <button class="btn primary-btn" onclick="MCPServerManager.connectToServer('${server.name}')">
                        Connect &<br>Load Tools
                    </button>
                ` : `
                    <button class="btn secondary-btn" onclick="MCPServerManager.refreshServerTools('${server.name}')">
                        Refresh Tools
                    </button>
                `}
                <button class="btn danger-btn" onclick="MCPServerManager.stopServer('${server.name}')">
                    Stop
                </button>
            </div>
        `;
        
        return serverItem;
    }
    
    /**
     * Connect to a server and load its tools
     * @param {string} serverName - Name of the server to connect to
     */
    async function connectToServer(serverName) {
        try {
            notificationHandler(`Connecting to ${serverName}...`, 'info');
            
            const config = {
                transport: {
                    type: 'stdio',
                    proxyUrl: proxyManager.getProxyUrl(),
                    command: 'echo',  // Dummy command since server is already running
                    args: []
                }
            };
            
            await MCPClient.connect(serverName, config, {
                onNotification: handleServerNotification
            });
            
            const connectionInfo = MCPClient.getConnectionInfo(serverName);
            if (connectionInfo && connectionInfo.tools) {
                notificationHandler(`✅ Connected to ${serverName} - loaded ${connectionInfo.tools.length} tools`, 'success');
            }
            
            updateServersList();
            
        } catch (error) {
            console.error(`Failed to connect to ${serverName}:`, error);
            notificationHandler(`Failed to connect to ${serverName}: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop a server via the proxy
     * @param {string} serverName - Name of the server to stop
     */
    async function stopServer(serverName) {
        if (!confirm(`Stop server ${serverName}?`)) {
            return;
        }
        
        try {
            // First disconnect from MCP client if connected
            if (MCPClient.getConnectionInfo(serverName)) {
                await MCPClient.disconnect(serverName);
                
                // Clean up MCP tools/functions
                if (window.MCPToolsManager) {
                    window.MCPToolsManager.unregisterServerTools(serverName);
                }
                
                // Clean up MCP prompts - remove any server-specific prompts
                // Note: Currently MCP server prompts are not registered as default prompts,
                // but if they were, we'd need to unregister them here
                
                console.log(`[MCPServerManager] Cleaned up tools and prompts for ${serverName}`);
            }
            
            await proxyManager.stopServer(serverName);
            
            notificationHandler(`Stopped server ${serverName}`, 'info');
            updateServersList();
            proxyManager.checkConnection();
        } catch (error) {
            console.error(`Failed to stop server ${serverName}:`, error);
            notificationHandler(`Failed to stop server: ${error.message}`, 'error');
        }
    }
    
    /**
     * Refresh tools from a connected server
     * @param {string} serverName - Name of the server to refresh
     */
    async function refreshServerTools(serverName) {
        try {
            // Check if we have an active connection
            if (!MCPClient.getConnectionInfo(serverName)) {
                notificationHandler(`Not connected to ${serverName}. Connecting now...`, 'info');
                await connectToServer(serverName);
                return;
            }
            
            await MCPClient.refreshServerCapabilities(serverName);
            notificationHandler(`Refreshed tools from ${serverName}`, 'success');
            updateServersList();
        } catch (error) {
            console.error(`Failed to refresh server ${serverName}:`, error);
            notificationHandler(`Failed to refresh server: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle server notifications
     * @param {string} serverName - Name of the server
     * @param {Object} notification - Notification message
     */
    function handleServerNotification(serverName, notification) {
        console.log(`[MCPServerManager] Notification from ${serverName}:`, notification);
        
        if (notification.method === 'notifications/message' && notification.params) {
            const { level, message } = notification.params;
            if (level === 'error') {
                notificationHandler(`${serverName}: ${message}`, 'error');
            }
        }
    }
    
    /**
     * Save connection configuration
     * @param {string} name - Server name
     * @param {Object} config - Server configuration
     */
    function saveConnectionConfig(name, config) {
        const savedConnections = getSavedConnections();
        savedConnections[name] = config;
        window.CoreStorageService?.setValue('mcp-connections', savedConnections);
    }
    
    /**
     * Get saved connection configurations
     * @returns {Object} Saved connections object
     */
    function getSavedConnections() {
        try {
            const connections = window.CoreStorageService?.getValue('mcp-connections');
            return connections || {};
        } catch (error) {
            console.error('[MCPServerManager] Failed to load saved connections:', error);
            return {};
        }
    }
    
    /**
     * Load and connect to saved connections
     */
    async function loadSavedConnections() {
        const savedConnections = getSavedConnections();
        
        for (const [name, config] of Object.entries(savedConnections)) {
            try {
                await MCPClient.connect(name, config, {
                    onNotification: handleServerNotification
                });
                console.log(`[MCPServerManager] Auto-connected to ${name}`);
            } catch (error) {
                console.error(`[MCPServerManager] Failed to auto-connect to ${name}:`, error);
            }
        }
    }
    
    // Public API
    return {
        init,
        updateServersList,
        connectToServer,
        stopServer,
        refreshServerTools,
        loadSavedConnections,
        generateServerName
    };
})();