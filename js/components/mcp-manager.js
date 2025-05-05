/**
 * MCP Manager Module
 * Handles MCP-related functionality for the AIHackare application
 */

window.MCPManager = (function() {
    /**
     * Create an MCP Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} MCP Manager instance
     */
    function createMCPManager(elements) {
        // Private variables
        let mcpModal;
        let mcpServersList;
        let mcpEmptyState;
        let mcpAddServerForm;
        let closeMcpModalBtn;
        
        /**
         * Initialize the MCP manager
         */
        function init() {
            // Get DOM elements
            mcpModal = document.getElementById('mcp-modal');
            mcpServersList = document.getElementById('mcp-servers-list');
            mcpEmptyState = document.getElementById('mcp-empty-state');
            mcpAddServerForm = document.getElementById('mcp-add-server-form');
            closeMcpModalBtn = document.getElementById('close-mcp-modal');
            
            // Set up event listeners
            setupEventListeners();
            
            console.log('MCP Manager initialized');
        }
        
        /**
         * Set up event listeners
         */
        function setupEventListeners() {
            // MCP button click
            if (elements.mcpBtn) {
                elements.mcpBtn.addEventListener('click', showMcpModal);
            }
            
            // Close MCP modal button
            if (closeMcpModalBtn) {
                closeMcpModalBtn.addEventListener('click', hideMcpModal);
            }
            
            // Add server form submission
            if (mcpAddServerForm) {
                mcpAddServerForm.addEventListener('submit', handleAddServer);
            }
            
            // Close modal when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === mcpModal) {
                    hideMcpModal();
                }
            });
        }
        
        /**
         * Show the MCP modal
         */
        function showMcpModal() {
            // Refresh the servers list
            refreshServersList();
            
            // Show the modal
            if (mcpModal) {
                mcpModal.classList.add('active');
            }
        }
        
        /**
         * Hide the MCP modal
         */
        function hideMcpModal() {
            if (mcpModal) {
                mcpModal.classList.remove('active');
            }
        }
        
        /**
         * Handle adding a new server
         * @param {Event} e - Form submission event
         */
        function handleAddServer(e) {
            e.preventDefault();
            
            // Get form values
            const nameInput = document.getElementById('mcp-server-name');
            const commandInput = document.getElementById('mcp-server-command');
            const envInput = document.getElementById('mcp-server-env');
            
            if (!nameInput || !commandInput) {
                return;
            }
            
            const name = nameInput.value.trim();
            const command = commandInput.value.trim();
            const envText = envInput ? envInput.value.trim() : '';
            
            // Parse environment variables
            const env = {};
            if (envText) {
                envText.split('\n').forEach(line => {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        env[key.trim()] = value.trim();
                    }
                });
            }
            
            // Add server
            const success = MCPService.addServer({ name, command, env });
            
            if (success) {
                // Clear form
                nameInput.value = '';
                commandInput.value = '';
                if (envInput) {
                    envInput.value = '';
                }
                
                // Refresh servers list
                refreshServersList();
                
                // Add system message
                if (window.aiHackare && window.aiHackare.chatManager) {
                    window.aiHackare.chatManager.addSystemMessage(`MCP server "${name}" added successfully.`);
                }
            } else {
                // Show error
                if (window.aiHackare && window.aiHackare.chatManager) {
                    window.aiHackare.chatManager.addSystemMessage(`Failed to add MCP server "${name}". A server with this name may already exist.`);
                }
            }
        }
        
        /**
         * Refresh the servers list
         */
        function refreshServersList() {
            if (!mcpServersList) {
                return;
            }
            
            // Get servers
            const servers = MCPService.getServers();
            
            // Clear current list (except empty state)
            const serverItems = mcpServersList.querySelectorAll('.mcp-server-item');
            serverItems.forEach(item => item.remove());
            
            // Show/hide empty state
            if (mcpEmptyState) {
                if (servers.length === 0) {
                    mcpEmptyState.style.display = 'block';
                } else {
                    mcpEmptyState.style.display = 'none';
                }
            }
            
            // Add server items
            servers.forEach(server => {
                const serverItem = createServerItem(server);
                mcpServersList.appendChild(serverItem);
            });
        }
        
        /**
         * Create a server item element
         * @param {Object} server - Server configuration
         * @returns {HTMLElement} Server item element
         */
        function createServerItem(server) {
            const serverItem = document.createElement('div');
            serverItem.className = 'mcp-server-item';
            serverItem.dataset.id = server.id;
            
            // Server header (name and actions)
            const serverHeader = document.createElement('div');
            serverHeader.className = 'mcp-server-header';
            
            // Server name
            const serverName = document.createElement('div');
            serverName.className = 'mcp-server-name';
            serverName.textContent = server.name;
            serverHeader.appendChild(serverName);
            
            // Server actions
            const serverActions = document.createElement('div');
            serverActions.className = 'mcp-server-actions';
            
            // Server status
            const serverStatus = document.createElement('div');
            serverStatus.className = `mcp-server-status ${server.status}`;
            
            // Status icon
            const statusIcon = document.createElement('i');
            if (server.status === MCPService.SERVER_STATUS.CONNECTED) {
                statusIcon.className = 'fas fa-plug';
                serverStatus.textContent = ' Connected';
            } else if (server.status === MCPService.SERVER_STATUS.CONNECTING) {
                statusIcon.className = 'fas fa-spinner fa-spin';
                serverStatus.textContent = ' Connecting...';
            } else {
                statusIcon.className = 'fas fa-times-circle';
                serverStatus.textContent = ' Disconnected';
            }
            serverStatus.prepend(statusIcon);
            serverActions.appendChild(serverStatus);
            
            // Start/stop button
            const startStopBtn = document.createElement('button');
            startStopBtn.className = 'btn icon-btn';
            startStopBtn.title = server.status === MCPService.SERVER_STATUS.CONNECTED ? 'Stop Server' : 'Start Server';
            
            const startStopIcon = document.createElement('i');
            startStopIcon.className = server.status === MCPService.SERVER_STATUS.CONNECTED ? 'fas fa-stop' : 'fas fa-play';
            startStopBtn.appendChild(startStopIcon);
            
            startStopBtn.addEventListener('click', async () => {
                if (server.status === MCPService.SERVER_STATUS.CONNECTED) {
                    // Stop server
                    const success = await MCPService.stopServer(server.id);
                    if (success) {
                        refreshServersList();
                        if (window.aiHackare && window.aiHackare.chatManager) {
                            window.aiHackare.chatManager.addSystemMessage(`MCP server "${server.name}" stopped.`);
                        }
                    }
                } else if (server.status === MCPService.SERVER_STATUS.DISCONNECTED) {
                    // Start server
                    const success = await MCPService.startServer(server.id);
                    if (success) {
                        refreshServersList();
                        if (window.aiHackare && window.aiHackare.chatManager) {
                            window.aiHackare.chatManager.addSystemMessage(`MCP server "${server.name}" started.`);
                        }
                    }
                }
            });
            serverActions.appendChild(startStopBtn);
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn icon-btn';
            removeBtn.title = 'Remove Server';
            
            const removeIcon = document.createElement('i');
            removeIcon.className = 'fas fa-trash';
            removeBtn.appendChild(removeIcon);
            
            removeBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to remove the MCP server "${server.name}"?`)) {
                    const success = MCPService.removeServer(server.id);
                    if (success) {
                        refreshServersList();
                        if (window.aiHackare && window.aiHackare.chatManager) {
                            window.aiHackare.chatManager.addSystemMessage(`MCP server "${server.name}" removed.`);
                        }
                    }
                }
            });
            serverActions.appendChild(removeBtn);
            
            serverHeader.appendChild(serverActions);
            serverItem.appendChild(serverHeader);
            
            // Server details
            const serverDetails = document.createElement('div');
            serverDetails.className = 'mcp-server-details';
            serverDetails.textContent = `Command: ${server.command}`;
            
            // Add environment variables if any
            if (server.env && Object.keys(server.env).length > 0) {
                const envText = Object.entries(server.env)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(', ');
                serverDetails.textContent += ` | Env: ${envText}`;
            }
            
            serverItem.appendChild(serverDetails);
            
            // Server tools (if connected)
            if (server.status === MCPService.SERVER_STATUS.CONNECTED && server.tools && server.tools.length > 0) {
                const serverTools = document.createElement('div');
                serverTools.className = 'mcp-server-tools';
                
                // Tools label
                const toolsLabel = document.createElement('div');
                toolsLabel.textContent = 'Available tools: ';
                serverTools.appendChild(toolsLabel);
                
                // Tool badges
                server.tools.forEach(tool => {
                    const toolBadge = document.createElement('span');
                    toolBadge.className = 'mcp-tool-badge';
                    toolBadge.textContent = tool.name;
                    toolBadge.title = tool.description;
                    serverTools.appendChild(toolBadge);
                });
                
                serverItem.appendChild(serverTools);
            }
            
            return serverItem;
        }
        
        /**
         * Get available MCP tools for API requests
         * @returns {Array} Array of tool definitions in OpenAI format
         */
        function getToolDefinitions() {
            const tools = [];
            
            // Get all connected servers
            const servers = MCPService.getServers();
            const connectedServers = servers.filter(server => server.status === MCPService.SERVER_STATUS.CONNECTED);
            
            // Add tools from each connected server
            connectedServers.forEach(server => {
                if (server.tools && server.tools.length > 0) {
                    server.tools.forEach(tool => {
                        tools.push({
                            type: 'function',
                            function: {
                                name: `${server.name}.${tool.name}`,
                                description: tool.description,
                                parameters: tool.inputSchema
                            }
                        });
                    });
                }
            });
            
            return tools;
        }
        
        /**
         * Process tool calls from the API response
         * @param {Array} toolCalls - Array of tool calls from the API
         * @returns {Promise<Array>} Array of tool results
         */
        async function processToolCalls(toolCalls) {
            if (!toolCalls || toolCalls.length === 0) {
                return [];
            }
            
            const toolResults = [];
            
            for (const toolCall of toolCalls) {
                try {
                    // Parse tool name to get server and tool
                    const { name, arguments: args } = toolCall.function;
                    const [serverName, toolName] = name.split('.');
                    
                    if (!serverName || !toolName) {
                        throw new Error(`Invalid tool name: ${name}`);
                    }
                    
                    // Find server
                    const servers = MCPService.getServers();
                    const server = servers.find(s => s.name === serverName);
                    
                    if (!server) {
                        throw new Error(`Server not found: ${serverName}`);
                    }
                    
                    // Parse arguments
                    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
                    
                    // Call tool
                    const result = await MCPService.callTool(server.id, toolName, parsedArgs);
                    
                    // Add result
                    toolResults.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: name,
                        content: JSON.stringify(result)
                    });
                } catch (error) {
                    console.error('Error processing MCP tool call:', error);
                    
                    // Add error result
                    toolResults.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: toolCall.function.name,
                        content: JSON.stringify({ error: error.message })
                    });
                }
            }
            
            return toolResults;
        }
        
        // Public API
        return {
            init,
            showMcpModal,
            hideMcpModal,
            refreshServersList,
            getToolDefinitions,
            processToolCalls
        };
    }

    // Public API
    return {
        createMCPManager: createMCPManager
    };
})();
