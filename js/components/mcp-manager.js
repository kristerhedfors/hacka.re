/**
 * MCP Manager Module
 * Handles MCP-related functionality for the AIHackare application
 */

window.McpManager = (function() {
    /**
     * Create an MCP Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} MCP Manager instance
     */
    function createMcpManager(elements) {
        /**
         * Initialize the MCP manager
         * @param {Function} addSystemMessage - Function to add system message to chat
         */
        function init(addSystemMessage) {
            // Set up event listeners
            if (elements.mcpBtn) {
                elements.mcpBtn.addEventListener('click', showMcpModal);
            }
            
            if (elements.closeMcpModal) {
                elements.closeMcpModal.addEventListener('click', hideMcpModal);
            }
            
            // Set up tool calling checkbox
            if (elements.mcpEnableToolCalling) {
                elements.mcpEnableToolCalling.checked = ApiToolsService.isToolCallingEnabled();
                
                elements.mcpEnableToolCalling.addEventListener('change', function() {
                    ApiToolsService.setToolCallingEnabled(this.checked, addSystemMessage);
                });
            }
            
            // Initialize MCP servers list
            refreshServersList();
            
            console.log('MCP Manager initialized');
        }
        
        /**
         * Show the MCP modal
         */
        function showMcpModal() {
            if (elements.mcpModal) {
                elements.mcpModal.classList.add('active');
                
                // Refresh the servers list
                refreshServersList();
                
                // Update tool calling checkbox
                if (elements.mcpEnableToolCalling) {
                    elements.mcpEnableToolCalling.checked = ApiToolsService.isToolCallingEnabled();
                }
            }
        }
        
        /**
         * Hide the MCP modal
         */
        function hideMcpModal() {
            if (elements.mcpModal) {
                elements.mcpModal.classList.remove('active');
            }
        }
        
        /**
         * Refresh the MCP servers list
         */
        function refreshServersList() {
            if (!elements.mcpServersList) return;
            
            // Clear the current list
            elements.mcpServersList.innerHTML = '';
            
            // Get all registered servers
            const serverRegistry = window.MCP_SERVER_REGISTRY || {};
            const serverNames = Object.keys(serverRegistry);
            
            if (serverNames.length === 0) {
                // No servers registered
                const noServersMessage = document.createElement('div');
                noServersMessage.className = 'mcp-server-item';
                noServersMessage.innerHTML = '<div class="mcp-server-info"><span class="mcp-server-name">No MCP servers available</span><span class="mcp-server-description">Enable tool calling to use MCP functionality</span></div>';
                elements.mcpServersList.appendChild(noServersMessage);
                return;
            }
            
            // Add each server to the list
            serverNames.forEach(serverName => {
                const server = serverRegistry[serverName];
                
                const serverItem = document.createElement('div');
                serverItem.className = 'mcp-server-item';
                
                const serverInfo = document.createElement('div');
                serverInfo.className = 'mcp-server-info';
                
                const serverNameElement = document.createElement('span');
                serverNameElement.className = 'mcp-server-name';
                serverNameElement.textContent = server.name;
                
                const serverDescription = document.createElement('span');
                serverDescription.className = 'mcp-server-description';
                serverDescription.textContent = server.description || '';
                
                serverInfo.appendChild(serverNameElement);
                serverInfo.appendChild(serverDescription);
                
                const serverTools = document.createElement('div');
                serverTools.className = 'mcp-server-tools';
                
                const toolsCount = document.createElement('span');
                toolsCount.className = 'mcp-tools-count';
                toolsCount.textContent = `${server.tools.length} tools`;
                
                serverTools.appendChild(toolsCount);
                
                serverItem.appendChild(serverInfo);
                serverItem.appendChild(serverTools);
                
                // Add click event to show server details
                serverItem.addEventListener('click', () => {
                    showServerDetails(server);
                });
                
                elements.mcpServersList.appendChild(serverItem);
            });
        }
        
        /**
         * Show details for a specific MCP server
         * @param {Object} server - The server object
         */
        function showServerDetails(server) {
            // Check if details container already exists
            let detailsContainer = document.getElementById('mcp-server-details-' + server.name);
            
            // Remove any existing details containers
            const existingDetails = document.querySelectorAll('.mcp-server-details');
            existingDetails.forEach(el => el.remove());
            
            // If the clicked server details were already showing, just return (toggle off)
            if (detailsContainer) {
                return;
            }
            
            // Create details container
            detailsContainer = document.createElement('div');
            detailsContainer.className = 'mcp-server-details active';
            detailsContainer.id = 'mcp-server-details-' + server.name;
            
            // Create tools list
            const toolsList = document.createElement('div');
            toolsList.className = 'mcp-tools-list';
            
            // Add each tool to the list
            server.tools.forEach(tool => {
                const toolItem = document.createElement('div');
                toolItem.className = 'mcp-tool-item';
                
                const toolName = document.createElement('div');
                toolName.className = 'mcp-tool-name';
                toolName.textContent = tool.name;
                
                const toolDescription = document.createElement('div');
                toolDescription.className = 'mcp-tool-description';
                toolDescription.textContent = tool.description || '';
                
                const toolParams = document.createElement('div');
                toolParams.className = 'mcp-tool-params';
                toolParams.textContent = JSON.stringify(tool.inputSchema, null, 2);
                
                toolItem.appendChild(toolName);
                toolItem.appendChild(toolDescription);
                toolItem.appendChild(toolParams);
                
                toolsList.appendChild(toolItem);
            });
            
            detailsContainer.appendChild(toolsList);
            
            // Add details container after the servers list
            elements.mcpServersList.parentNode.insertBefore(detailsContainer, elements.mcpServersList.nextSibling);
        }
        
        /**
         * Connect to an MCP server
         * @param {string} serverName - The name of the server to connect to
         * @param {Function} addSystemMessage - Function to add system message to chat
         */
        function connectToServer(serverName, addSystemMessage) {
            if (!window.mcpClient) {
                console.error('MCP client not initialized');
                return;
            }
            
            const serverRegistry = window.MCP_SERVER_REGISTRY || {};
            const server = serverRegistry[serverName];
            
            if (!server) {
                console.error(`Server "${serverName}" not found in registry`);
                return;
            }
            
            window.mcpClient.connectToStaticServer(server)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage(`Connected to MCP server: ${serverName}`);
                    }
                    refreshServersList();
                })
                .catch(error => {
                    console.error(`Error connecting to server "${serverName}":`, error);
                    if (addSystemMessage) {
                        addSystemMessage(`Error connecting to MCP server: ${error.message}`);
                    }
                });
        }
        
        // Public API
        return {
            init,
            showMcpModal,
            hideMcpModal,
            refreshServersList,
            connectToServer
        };
    }

    // Public API
    return {
        createMcpManager: createMcpManager
    };
})();
