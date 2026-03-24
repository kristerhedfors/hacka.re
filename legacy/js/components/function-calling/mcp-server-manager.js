/**
 * MCP Server Manager Module
 * Handles MCP server connections, testing, and management UI
 */

window.McpServerManager = (function() {
    /**
     * Create an MCP Server Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} MCP Server Manager instance
     */
    function createMcpServerManager(elements, addSystemMessage) {
        /**
         * Initialize the MCP server manager
         */
        function init() {
            // Set up event listeners
            if (elements.closeMcpServersModal) {
                elements.closeMcpServersModal.addEventListener('click', hideMcpServersModal);
            }
            
            if (elements.mcpServerForm) {
                elements.mcpServerForm.addEventListener('submit', handleAddMcpServer);
            }
            
            if (elements.mcpServerTestBtn) {
                elements.mcpServerTestBtn.addEventListener('click', testMcpServerConnection);
            }
            
            console.log('MCP Server Manager initialized');
        }
        
        /**
         * Show the MCP servers modal
         */
        function showMcpServersModal() {
            if (elements.mcpServersModal) {
                elements.mcpServersModal.classList.add('active');
                renderMcpServersList();
            }
        }
        
        /**
         * Hide the MCP servers modal
         */
        function hideMcpServersModal() {
            if (elements.mcpServersModal) {
                elements.mcpServersModal.classList.remove('active');
            }
        }
        
        /**
         * Render the list of connected MCP servers
         */
        function renderMcpServersList() {
            // Server list functionality removed - no longer displaying connected servers
            return;
            
            // Clear the list
            elements.mcpServersList.innerHTML = '';
            
            // Get saved MCP servers from storage
            const mcpServers = getMcpServersFromStorage();
            
            // Show empty state if no servers
            if (mcpServers.length === 0) {
                if (elements.emptyMcpServersState) {
                    elements.emptyMcpServersState.style.display = 'block';
                    elements.mcpServersList.appendChild(elements.emptyMcpServersState);
                }
                return;
            }
            
            // Hide empty state if we have servers
            if (elements.emptyMcpServersState) {
                elements.emptyMcpServersState.style.display = 'none';
            }
            
            // Render each server
            mcpServers.forEach(server => {
                const serverItem = createMcpServerItem(server);
                elements.mcpServersList.appendChild(serverItem);
            });
        }
        
        /**
         * Create a MCP server item element
         * @param {Object} server - The MCP server object
         * @returns {HTMLElement} The created server item element
         */
        function createMcpServerItem(server) {
            const serverItem = document.createElement('div');
            serverItem.className = 'mcp-server-item';
            
            // Create server info container
            const serverInfo = document.createElement('div');
            serverInfo.className = 'mcp-server-info';
            
            // Server name
            const nameElement = document.createElement('div');
            nameElement.className = 'mcp-server-name';
            nameElement.textContent = server.name;
            serverInfo.appendChild(nameElement);
            
            // Server URL
            const urlElement = document.createElement('div');
            urlElement.className = 'mcp-server-url';
            urlElement.textContent = server.url;
            serverInfo.appendChild(urlElement);
            
            // Server description (if available)
            if (server.description) {
                const descElement = document.createElement('div');
                descElement.className = 'mcp-server-description';
                descElement.textContent = server.description;
                serverInfo.appendChild(descElement);
            }
            
            serverItem.appendChild(serverInfo);
            
            // Create actions container
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'mcp-server-actions';
            
            // Test connection button
            const testButton = document.createElement('button');
            testButton.className = 'btn secondary-btn';
            testButton.textContent = 'Test';
            testButton.title = 'Test connection to this MCP server';
            testButton.addEventListener('click', () => testSpecificMcpServer(server));
            actionsContainer.appendChild(testButton);
            
            // Load tools button
            const loadButton = document.createElement('button');
            loadButton.className = 'btn primary-btn';
            loadButton.textContent = 'Load Tools';
            loadButton.title = 'Load tool bundles from this MCP server';
            loadButton.addEventListener('click', () => loadMcpServerTools(server));
            actionsContainer.appendChild(loadButton);
            
            // Delete server button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn danger-btn';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.title = 'Remove this MCP server';
            deleteButton.addEventListener('click', () => {
                if (confirm(`Are you sure you want to remove the MCP server "${server.name}"?`)) {
                    removeMcpServer(server.name);
                    renderMcpServersList();
                    
                    if (addSystemMessage) {
                        addSystemMessage(`MCP server "${server.name}" removed.`);
                    }
                }
            });
            actionsContainer.appendChild(deleteButton);
            
            serverItem.appendChild(actionsContainer);
            
            return serverItem;
        }
        
        /**
         * Handle adding a new MCP server
         * @param {Event} event - The form submit event
         */
        function handleAddMcpServer(event) {
            event.preventDefault();
            
            const name = elements.mcpServerName?.value.trim();
            const url = elements.mcpServerUrl?.value.trim();
            const description = elements.mcpServerDescription?.value.trim();
            
            if (!name || !url) {
                alert('Server name and URL are required.');
                return;
            }
            
            // Validate URL format
            try {
                new URL(url);
            } catch (e) {
                alert('Please enter a valid URL.');
                return;
            }
            
            // Check if server name already exists
            const existingServers = getMcpServersFromStorage();
            if (existingServers.some(server => server.name === name)) {
                alert('A server with this name already exists.');
                return;
            }
            
            // Create server object
            const server = {
                name,
                url,
                description: description || '',
                addedAt: new Date().toISOString()
            };
            
            // Save to storage
            saveMcpServerToStorage(server);
            
            // Clear form
            if (elements.mcpServerName) elements.mcpServerName.value = '';
            if (elements.mcpServerUrl) elements.mcpServerUrl.value = '';
            if (elements.mcpServerDescription) elements.mcpServerDescription.value = '';
            
            // Re-render list
            renderMcpServersList();
            
            if (addSystemMessage) {
                addSystemMessage(`MCP server "${name}" added successfully.`);
            }
        }
        
        /**
         * Test MCP server connection
         */
        function testMcpServerConnection() {
            const url = elements.mcpServerUrl?.value.trim();
            
            if (!url) {
                alert('Please enter a server URL to test.');
                return;
            }
            
            // Validate URL format
            try {
                new URL(url);
            } catch (e) {
                alert('Please enter a valid URL.');
                return;
            }
            
            testSpecificMcpServer({ url, name: 'Test Server' });
        }
        
        /**
         * Test a specific MCP server connection
         * @param {Object} server - The MCP server to test
         */
        async function testSpecificMcpServer(server) {
            try {
                // Disable the test button temporarily
                const testButton = event.target;
                const originalText = testButton.textContent;
                testButton.disabled = true;
                testButton.textContent = 'Testing...';
                
                // Basic connectivity test
                const response = await fetch(server.url, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    alert(`Connection to "${server.name}" successful!`);
                    if (addSystemMessage) {
                        addSystemMessage(`MCP server "${server.name}" connection test passed.`);
                    }
                } else {
                    alert(`Connection to "${server.name}" failed with status: ${response.status}`);
                    if (addSystemMessage) {
                        addSystemMessage(`MCP server "${server.name}" connection test failed (${response.status}).`);
                    }
                }
            } catch (error) {
                console.error('MCP server test error:', error);
                alert(`Connection to "${server.name}" failed: ${error.message}`);
                if (addSystemMessage) {
                    addSystemMessage(`MCP server "${server.name}" connection test failed: ${error.message}`);
                }
            } finally {
                // Re-enable the test button
                const testButton = event.target;
                testButton.disabled = false;
                testButton.textContent = originalText;
            }
        }
        
        /**
         * Load tools from an MCP server
         * @param {Object} server - The MCP server to load tools from
         */
        async function loadMcpServerTools(server) {
            try {
                // This is a placeholder for MCP server tool loading
                // In a real implementation, this would connect to the MCP server
                // and fetch available tools/functions
                alert(`Loading tools from "${server.name}" is not yet implemented. This would connect to the MCP server and import available tool bundles.`);
                
                if (addSystemMessage) {
                    addSystemMessage(`MCP server tool loading for "${server.name}" is not yet implemented.`);
                }
            } catch (error) {
                console.error('MCP server tool loading error:', error);
                alert(`Failed to load tools from "${server.name}": ${error.message}`);
                if (addSystemMessage) {
                    addSystemMessage(`Failed to load tools from MCP server "${server.name}": ${error.message}`);
                }
            }
        }
        
        /**
         * Get MCP servers from storage
         * @returns {Array} Array of MCP server objects
         */
        function getMcpServersFromStorage() {
            try {
                const stored = localStorage.getItem('hacka_re_mcp_servers');
                return stored ? JSON.parse(stored) : [];
            } catch (error) {
                console.error('Error loading MCP servers from storage:', error);
                return [];
            }
        }
        
        /**
         * Save MCP server to storage
         * @param {Object} server - The MCP server to save
         */
        function saveMcpServerToStorage(server) {
            try {
                const servers = getMcpServersFromStorage();
                servers.push(server);
                localStorage.setItem('hacka_re_mcp_servers', JSON.stringify(servers));
            } catch (error) {
                console.error('Error saving MCP server to storage:', error);
                throw new Error('Failed to save MCP server');
            }
        }
        
        /**
         * Remove MCP server from storage
         * @param {string} serverName - The name of the server to remove
         */
        function removeMcpServer(serverName) {
            try {
                const servers = getMcpServersFromStorage();
                const filteredServers = servers.filter(server => server.name !== serverName);
                localStorage.setItem('hacka_re_mcp_servers', JSON.stringify(filteredServers));
            } catch (error) {
                console.error('Error removing MCP server from storage:', error);
                throw new Error('Failed to remove MCP server');
            }
        }
        
        // Public API
        return {
            init,
            showMcpServersModal,
            hideMcpServersModal,
            renderMcpServersList
        };
    }

    // Public API
    return {
        createMcpServerManager: createMcpServerManager
    };
})();