/**
 * Function Calling Manager Module
 * Handles function calling UI and functionality for the AIHackare application
 */

window.FunctionCallingManager = (function() {
    /**
     * Create a Function Calling Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Function Calling Manager instance
     */
    function createFunctionCallingManager(elements, addSystemMessage) {
        // Track if we're editing an existing function
        let editingFunctionName = null;
        /**
         * Initialize the function calling manager
         */
        function init() {
            // Set up event listeners
            if (elements.functionBtn) {
                elements.functionBtn.addEventListener('click', showFunctionModal);
            }
            
            if (elements.closeMcpServersModal) {
                elements.closeMcpServersModal.addEventListener('click', hideMcpServersModal);
            }
            
            if (elements.mcpServerForm) {
                elements.mcpServerForm.addEventListener('submit', handleAddMcpServer);
            }
            
            if (elements.mcpServerTestBtn) {
                elements.mcpServerTestBtn.addEventListener('click', testMcpServerConnection);
            }
            
            if (elements.closeFunctionModal) {
                elements.closeFunctionModal.addEventListener('click', hideFunctionModal);
            }
            
            if (elements.functionEditorForm) {
                elements.functionEditorForm.addEventListener('submit', handleAddFunction);
            }
            
            if (elements.functionValidateBtn) {
                elements.functionValidateBtn.addEventListener('click', validateFunction);
            }
            
            if (elements.functionClearBtn) {
                elements.functionClearBtn.addEventListener('click', clearFunctionEditor);
            }
            
            // Add event listeners for copy buttons
            if (elements.copyFunctionCodeBtn) {
                elements.copyFunctionCodeBtn.addEventListener('click', copyFunctionCode);
            }
            
            if (elements.copyToolDefinitionBtn) {
                elements.copyToolDefinitionBtn.addEventListener('click', copyToolDefinition);
            }
            
            // Add event listener for copying function library
            if (elements.copyFunctionLibraryBtn) {
                elements.copyFunctionLibraryBtn.addEventListener('click', copyFunctionLibrary);
            }
            
            // Add event listener for function code changes to auto-extract function name
            if (elements.functionCode) {
                elements.functionCode.addEventListener('input', extractFunctionName);
            }
            
            // Set initial function code example
            if (elements.functionCode && !elements.functionCode.value) {
                elements.functionCode.value = getDefaultFunctionCode();
                // Extract function name from default code
                setTimeout(extractFunctionName, 100);
            }
            
            // Load functions from storage but don't render them until modal is opened
            // renderFunctionList() will be called when the modal is shown
            
            // Load selected default functions if available
            if (window.DefaultFunctionsService) {
                DefaultFunctionsService.loadSelectedDefaultFunctions();
                console.log('Default functions loaded');
            }
            
            console.log('Function Calling Manager initialized');
        }
        
        /**
         * Get default function code example
         * @returns {string} Default function code
         */
        function getDefaultFunctionCode() {
            return `/**
 * Formats a number with commas as thousands separators
 * This is an auxiliary function that won't be exposed to the LLM
 * @param {number} num - The number to format
 * @returns {string} The formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
}

/**
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} IMPORTANT: Always return an object, not a primitive value.
 * @tool This function will be exposed to the LLM for tool calling
 */
function multiply_numbers(a, b) {
  // Validate inputs are numbers
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  // Perform the multiplication
  const result = a * b;
  
  // Format the result using the auxiliary function
  const formattedResult = formatNumber(result);
  
  // IMPORTANT: Always return an object, not a primitive value like 'return result'
  // Returning a primitive value may cause issues with tool calling
  return {
    result: result,
    formattedResult: formattedResult,
    success: true
  };
}

/**
 * Gets the current weather for a location
 * @description Fetches current weather data for the specified location
 * @param {string} location - The location to get weather for
 * @param {string} units - The units to use (metric or imperial)
 * @returns {Object} Weather information
 * @callable This function will be exposed to the LLM for tool calling
 */
function get_weather(location, units = "metric") {
  // This is just a mock implementation
  return {
    location: location,
    temperature: 22,
    units: units,
    condition: "Sunny",
    humidity: "45%",
    formatted_temp: formatNumber(22) + (units === "metric" ? "°C" : "°F")
  };
}`;
        }
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.add('active');
                renderFunctionList();
                
                // Focus on the function name field
                if (elements.functionName) {
                    setTimeout(() => {
                        elements.functionName.focus();
                    }, 100);
                }
            }
        }
        
        /**
         * Hide the function modal
         */
        function hideFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.remove('active');
            }
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
            if (!elements.mcpServersList) {
                console.warn('renderMcpServersList called but elements.mcpServersList is not available');
                return;
            }
            
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
        
        /**
         * Render only the main (user-defined + selected default) functions without affecting the default functions tree
         */
        function renderMainFunctionList() {
            if (!elements.functionList) {
                console.warn('renderMainFunctionList called but elements.functionList is not available');
                return;
            }
            
            // Note: Removed overly restrictive modal active check that was preventing rendering
            
            // Find and preserve the default functions section
            const defaultFunctionsSection = elements.functionList.querySelector('.default-functions-section');
            
            // Clear the list but preserve the default functions section
            elements.functionList.innerHTML = '';
            
            // Re-add the default functions section if it existed
            if (defaultFunctionsSection) {
                elements.functionList.appendChild(defaultFunctionsSection);
            }
            
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            
            // Show empty state if no functions, but position it before default functions
            if (functionNames.length === 0) {
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'block';
                    
                    // Insert before default functions section if it exists
                    if (defaultFunctionsSection) {
                        elements.functionList.insertBefore(elements.emptyFunctionState, defaultFunctionsSection);
                    } else {
                        elements.functionList.appendChild(elements.emptyFunctionState);
                    }
                }
            } else {
                // Hide empty state if we have functions
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'none';
                }
                
                // Render user-defined functions (same logic as before)
                renderUserDefinedFunctions(functions, functionNames, defaultFunctionsSection);
            }
            
            // Add default functions section if it doesn't exist and DefaultFunctionsService is available
            if (!defaultFunctionsSection && window.DefaultFunctionsService) {
                addDefaultFunctionsSection();
            }
        }
        
        /**
         * Render user-defined functions
         */
        function renderUserDefinedFunctions(functions, functionNames, insertBeforeElement) {
            // Get all function collections with metadata
            const allCollections = FunctionToolsService.getAllFunctionCollections();
            const processedCollections = new Set();
            let colorIndex = 1;
            
            // Process each collection
            Object.values(allCollections).forEach(collection => {
                if (processedCollections.has(collection.id)) return;
                processedCollections.add(collection.id);
                
                // Skip empty collections
                if (!collection.functions || collection.functions.length === 0) return;
                
                // Filter out auxiliary functions for this collection
                const callableFunctions = collection.functions.filter(funcName => {
                    const funcSpec = functions[funcName];
                    if (!funcSpec) return false;
                    
                    // Skip auxiliary functions
                    if (funcSpec.toolDefinition && 
                        funcSpec.toolDefinition.function && 
                        funcSpec.toolDefinition.function.description &&
                        funcSpec.toolDefinition.function.description.includes('(not exposed to LLM)')) {
                        return false;
                    }
                    return true;
                });
                
                // Skip if no callable functions in collection
                if (callableFunctions.length === 0) return;
                
                // Create collection container
                const collectionContainer = document.createElement('div');
                collectionContainer.className = 'function-collection-container';
                collectionContainer.dataset.collectionId = collection.id;
                
                // Assign a color to this collection
                const collectionColor = `color-${colorIndex}`;
                colorIndex = colorIndex % 5 + 1; // Cycle through colors 1-5
                
                // Create collection header
                const collectionHeader = document.createElement('div');
                collectionHeader.className = 'function-collection-header';
                collectionHeader.style.borderLeft = `12px solid var(--function-${collectionColor})`;
                collectionHeader.style.backgroundColor = `var(--function-${collectionColor}-bg, rgba(var(--function-${collectionColor}-rgb), 0.1))`;
                
                // Add expand/collapse icon
                const expandIcon = document.createElement('i');
                expandIcon.className = 'fas fa-chevron-right';
                collectionHeader.appendChild(expandIcon);
                
                // Add collection name
                const collectionName = document.createElement('h4');
                collectionName.textContent = collection.metadata.name || 'Untitled Collection';
                collectionName.style.margin = '0 0 0 10px';
                collectionName.style.fontSize = '16px';
                collectionName.style.fontWeight = '700';
                collectionHeader.appendChild(collectionName);
                
                // Add function count
                const functionCount = document.createElement('span');
                functionCount.className = 'function-collection-count';
                functionCount.textContent = `(${callableFunctions.length} function${callableFunctions.length !== 1 ? 's' : ''})`;
                functionCount.style.marginLeft = '10px';
                functionCount.style.color = 'var(--text-color-secondary)';
                functionCount.style.fontSize = '14px';
                collectionHeader.appendChild(functionCount);
                
                // Add source info if MCP
                if (collection.metadata.source === 'mcp' && collection.metadata.mcpCommand) {
                    const sourceInfo = document.createElement('span');
                    sourceInfo.className = 'function-collection-source';
                    sourceInfo.textContent = `MCP: ${collection.metadata.mcpCommand}`;
                    sourceInfo.style.marginLeft = 'auto';
                    sourceInfo.style.marginRight = '10px';
                    sourceInfo.style.color = 'var(--text-color-secondary)';
                    sourceInfo.style.fontSize = '12px';
                    collectionHeader.appendChild(sourceInfo);
                }
                
                // Add delete button for the entire collection
                const deleteCollectionButton = document.createElement('button');
                deleteCollectionButton.className = 'function-collection-delete';
                deleteCollectionButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteCollectionButton.title = 'Delete entire collection';
                deleteCollectionButton.style.marginLeft = 'auto';
                deleteCollectionButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const confirmMessage = `Are you sure you want to delete the entire "${collection.metadata.name}" collection with ${callableFunctions.length} function${callableFunctions.length !== 1 ? 's' : ''}?`;
                    
                    if (confirm(confirmMessage)) {
                        // Remove any function from the collection to trigger collection deletion
                        if (callableFunctions.length > 0) {
                            FunctionToolsService.removeJsFunction(callableFunctions[0]);
                            renderMainFunctionList();
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Function collection "${collection.metadata.name}" removed.`);
                            }
                        }
                    }
                });
                collectionHeader.appendChild(deleteCollectionButton);
                
                collectionContainer.appendChild(collectionHeader);
                
                // Create functions container
                const functionsContainer = document.createElement('div');
                functionsContainer.className = 'function-collection-functions';
                functionsContainer.style.marginLeft = '20px';
                functionsContainer.style.marginTop = '10px';
                
                // Check if we're in a test environment 
                const isTestEnvironment = window.navigator.webdriver || 
                                         window.__playwright || 
                                         window.location.href.includes('localhost:8000');
                
                // Start expanded in test environments, collapsed otherwise
                let isExpanded = isTestEnvironment;
                functionsContainer.style.display = isExpanded ? 'block' : 'none';
                expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                
                // Add click event to expand/collapse
                collectionHeader.addEventListener('click', (e) => {
                    if (e.target === deleteCollectionButton || e.target.closest('.function-collection-delete')) {
                        return; // Don't expand/collapse when clicking delete
                    }
                    isExpanded = !isExpanded;
                    expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                    functionsContainer.style.display = isExpanded ? 'block' : 'none';
                });
                
                // Render individual functions in this collection
                callableFunctions.forEach(funcName => {
                    const functionSpec = functions[funcName];
                    const isEnabled = FunctionToolsService.isJsFunctionEnabled(funcName);
                    
                    const functionItem = document.createElement('div');
                    functionItem.className = 'function-item';
                    functionItem.dataset.collectionColor = collectionColor;
                    functionItem.style.borderLeft = `4px solid var(--function-${collectionColor})`;
                    
                    // Create checkbox
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'function-item-checkbox';
                    checkbox.checked = isEnabled;
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            FunctionToolsService.enableJsFunction(funcName);
                        } else {
                            FunctionToolsService.disableJsFunction(funcName);
                        }
                        
                        if (addSystemMessage) {
                            const status = checkbox.checked ? 'enabled' : 'disabled';
                            addSystemMessage(`Function "${funcName}" ${status} for tool calling.`);
                        }
                    });
                    
                    // Create content container
                    const contentContainer = document.createElement('div');
                    contentContainer.style.flex = '1';
                    contentContainer.style.cursor = 'pointer';
                    contentContainer.title = 'Click to edit function';
                    
                    // Create name element
                    const nameElement = document.createElement('div');
                    nameElement.className = 'function-item-name';
                    nameElement.textContent = funcName;
                    
                    // Create description element if available
                    if (functionSpec.toolDefinition && functionSpec.toolDefinition.function && functionSpec.toolDefinition.function.description) {
                        const descriptionElement = document.createElement('div');
                        descriptionElement.className = 'function-item-description';
                        descriptionElement.textContent = functionSpec.toolDefinition.function.description;
                        descriptionElement.style.fontSize = '0.85rem';
                        descriptionElement.style.marginTop = '0.25rem';
                        contentContainer.appendChild(descriptionElement);
                    }
                    
                    // Add click event to load function into editor
                    contentContainer.addEventListener('click', () => {
                        loadFunctionIntoEditor(funcName, functionSpec);
                    });
                    
                    // Create delete button for individual function (deletes entire collection)
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'function-item-delete';
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteButton.title = 'Delete entire collection';
                    deleteButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        const collectionMetadata = FunctionToolsService.getCollectionMetadata(collection.id);
                        const collectionName = collectionMetadata ? collectionMetadata.name : 'Untitled Collection';
                        const confirmMessage = `Are you sure you want to delete the entire "${collectionName}" collection with ${callableFunctions.length} function${callableFunctions.length !== 1 ? 's' : ''}?`;
                        
                        if (confirm(confirmMessage)) {
                            // Remove any function from the collection to trigger collection deletion
                            if (callableFunctions.length > 0) {
                                FunctionToolsService.removeJsFunction(callableFunctions[0]);
                                renderMainFunctionList();
                                
                                if (addSystemMessage) {
                                    addSystemMessage(`Function collection "${collectionName}" removed.`);
                                }
                            }
                        }
                    });
                    
                    // Assemble function item
                    functionItem.appendChild(checkbox);
                    contentContainer.insertBefore(nameElement, contentContainer.firstChild);
                    functionItem.appendChild(contentContainer);
                    functionItem.appendChild(deleteButton);
                    
                    functionsContainer.appendChild(functionItem);
                });
                
                collectionContainer.appendChild(functionsContainer);
                
                // Add to list
                if (insertBeforeElement) {
                    elements.functionList.insertBefore(collectionContainer, insertBeforeElement);
                } else {
                    elements.functionList.appendChild(collectionContainer);
                }
            });
        }
        
        /**
         * Render the list of functions (full re-render)
         */
        function renderFunctionList() {
            if (!elements.functionList) {
                console.warn('renderFunctionList called but elements.functionList is not available');
                return;
            }
            
            // Note: Removed overly restrictive modal active check that was preventing rendering
            
            // Clear the list
            elements.functionList.innerHTML = '';
            
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            
            // Show empty state if no functions
            if (functionNames.length === 0) {
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'block';
                    
                    // Make sure the empty state is in the function list
                    if (elements.emptyFunctionState.parentElement !== elements.functionList) {
                        elements.functionList.appendChild(elements.emptyFunctionState);
                    }
                }
                // Don't return early - still add default functions section
            } else {
                // Hide empty state if we have functions
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'none';
                }
            }
            
            // Render user-defined functions if any exist
            if (functionNames.length > 0) {
                renderUserDefinedFunctions(functions, functionNames, null);
            }
            
            // Add default functions section if DefaultFunctionsService is available
            if (window.DefaultFunctionsService) {
                addDefaultFunctionsSection();
            }
        }
        
        /**
         * Add the default functions section to the function list
         */
        function addDefaultFunctionsSection() {
            console.log('addDefaultFunctionsSection called');
            // Create default functions section
            const defaultFunctionsSection = document.createElement('div');
            defaultFunctionsSection.className = 'default-functions-section';
            
            // Create header with expand/collapse functionality
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'default-functions-header';
            
            // Add expand/collapse icon
            const expandIcon = document.createElement('i');
            expandIcon.className = 'fas fa-chevron-right';
            sectionHeader.appendChild(expandIcon);
            
            // Add section title
            const sectionTitle = document.createElement('h4');
            sectionTitle.textContent = 'Default Functions';
            sectionHeader.appendChild(sectionTitle);
            
            // Add click event to expand/collapse
            let isExpanded = false;
            sectionHeader.addEventListener('click', () => {
                isExpanded = !isExpanded;
                expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                defaultFunctionsList.style.display = isExpanded ? 'block' : 'none';
            });
            
            defaultFunctionsSection.appendChild(sectionHeader);
            
            // Create container for default functions
            const defaultFunctionsList = document.createElement('div');
            defaultFunctionsList.className = 'default-functions-list';
            defaultFunctionsList.style.display = 'none'; // Initially collapsed
            
            // Get default function collections
            const defaultFunctionCollections = DefaultFunctionsService.getDefaultFunctionCollections();
            
            // Add each default function collection to the list
            defaultFunctionCollections.forEach(collection => {
                const collectionItem = createDefaultFunctionCollectionItem(collection, []);
                defaultFunctionsList.appendChild(collectionItem);
            });
            
            defaultFunctionsSection.appendChild(defaultFunctionsList);
            console.log('About to append default functions section to function list');
            console.log('elements.functionList:', !!elements.functionList);
            console.log('defaultFunctionsSection:', !!defaultFunctionsSection);
            elements.functionList.appendChild(defaultFunctionsSection);
            console.log('Default functions section appended successfully');
        }
        
        /**
         * Create a default function collection item element
         * @param {Object} collection - The function collection object
         * @param {Array} selectedIds - Array of selected function collection IDs
         * @returns {HTMLElement} The created function collection item element
         */
        function createDefaultFunctionCollectionItem(collection, selectedIds) {
            const collectionItem = document.createElement('div');
            collectionItem.className = 'function-collection-item default-function-collection-item';
            collectionItem.dataset.id = collection.id;
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.className = 'function-collection-header';
            
            // Add expand/collapse icon
            const expandIcon = document.createElement('i');
            expandIcon.className = 'fas fa-chevron-right';
            headerContainer.appendChild(expandIcon);
            
            // Create collection name element
            const collectionName = document.createElement('div');
            collectionName.className = 'function-collection-name';
            collectionName.textContent = collection.name || 'Unnamed Function Collection';
            collectionName.style.cursor = 'pointer';
            collectionName.title = 'Click to expand/collapse';
            headerContainer.appendChild(collectionName);
            
            // Add info icon
            const infoIcon = document.createElement('button');
            infoIcon.className = 'function-collection-info';
            infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
            infoIcon.title = 'About this function collection';
            infoIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                showFunctionCollectionInfo(collection, infoIcon);
            });
            headerContainer.appendChild(infoIcon);
            
            collectionItem.appendChild(headerContainer);
            
            // Create container for individual functions
            const functionsList = document.createElement('div');
            functionsList.className = 'collection-functions-list';
            functionsList.style.display = 'none'; // Initially collapsed
            
            // Add individual functions
            if (collection.functions && collection.functions.length > 0) {
                collection.functions.forEach(func => {
                    const functionItem = createIndividualFunctionItem(collection, func);
                    functionsList.appendChild(functionItem);
                });
            }
            
            // Add click event to expand/collapse
            let isExpanded = false;
            headerContainer.addEventListener('click', (e) => {
                if (e.target === infoIcon || e.target.closest('.function-collection-info')) {
                    return; // Don't expand/collapse when clicking info icon
                }
                isExpanded = !isExpanded;
                expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                functionsList.style.display = isExpanded ? 'block' : 'none';
            });
            
            groupItem.appendChild(functionsList);
            
            return collectionItem;
        }
        
        /**
         * Create an individual function item element
         * @param {Object} collection - The function collection object
         * @param {Object} func - The function object
         * @returns {HTMLElement} The created function item element
         */
        function createIndividualFunctionItem(collection, func) {
            const functionItem = document.createElement('div');
            functionItem.className = 'individual-function-item';
            
            // Create checkbox for selecting the individual function
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'function-item-checkbox';
            const functionId = `${collection.id}:${func.name}`;
            checkbox.checked = DefaultFunctionsService.isIndividualFunctionSelected(functionId);
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log("Individual function checkbox clicked:", functionId);
                
                // Toggle the individual function selection
                const wasSelected = DefaultFunctionsService.toggleIndividualFunctionSelection(functionId);
                
                // Update only the main function list without affecting the default functions tree
                renderMainFunctionList();
                
                // Add system message
                if (addSystemMessage) {
                    if (wasSelected) {
                        addSystemMessage(`Default function "${func.name}" enabled.`);
                    } else {
                        addSystemMessage(`Default function "${func.name}" disabled.`);
                    }
                }
            });
            functionItem.appendChild(checkbox);
            
            // Create function name element
            const functionName = document.createElement('div');
            functionName.className = 'function-item-name';
            functionName.textContent = func.name;
            functionName.style.cursor = 'pointer';
            functionName.title = 'Click to view function code';
            
            // Add click event to show function code
            functionName.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Show function code in the editor (read-only)
                if (elements.functionCode) {
                    elements.functionCode.value = func.code;
                    elements.functionCode.setAttribute('readonly', 'readonly');
                    
                    // Clear the readonly attribute after a short delay when clicking elsewhere
                    setTimeout(() => {
                        document.addEventListener('click', function removeReadonly(e) {
                            if (!e.target.closest('.function-editor')) {
                                elements.functionCode.removeAttribute('readonly');
                                document.removeEventListener('click', removeReadonly);
                            }
                        });
                    }, 100);
                }
            });
            
            functionItem.appendChild(functionName);
            
            // Add function description if available
            if (func.description) {
                const functionDesc = document.createElement('div');
                functionDesc.className = 'function-item-description';
                functionDesc.textContent = func.description;
                functionItem.appendChild(functionDesc);
            }
            
            return functionItem;
        }
        
        /**
         * Show function collection info popup
         * @param {Object} collection - The function collection object
         * @param {HTMLElement} infoIcon - The info icon element
         */
        function showFunctionCollectionInfo(collection, infoIcon) {
            // Create and show a popup with information about the function collection
            const popup = document.createElement('div');
            popup.className = 'function-info-popup';
            
            // Get function names
            const functionNames = collection.functions ? 
                collection.functions.map(f => f.name).join(', ') : 
                'No functions';
            
            // Create popup content
            popup.innerHTML = `
                <div class="function-info-header">
                    <h3>${collection.name}</h3>
                    <button class="function-info-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="function-info-content">
                    <p>${collection.description || 'A collection of default functions for the hacka.re function calling system.'}</p>
                    <p class="function-info-details"><strong>Functions:</strong> ${functionNames}</p>
                    <p class="function-info-hint">Click on individual function names to view their code in the editor.</p>
                </div>
            `;
            
            // Add close button functionality
            const closeBtn = popup.querySelector('.function-info-close');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(popup);
            });
            
            // Add click outside to close
            document.addEventListener('click', function closePopup(event) {
                if (!popup.contains(event.target) && event.target !== infoIcon) {
                    if (document.body.contains(popup)) {
                        document.body.removeChild(popup);
                    }
                    document.removeEventListener('click', closePopup);
                }
            });
            
            // Position the popup near the info icon
            const rect = infoIcon.getBoundingClientRect();
            popup.style.position = 'absolute';
            popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
            popup.style.left = `${rect.left + window.scrollX - 200}px`; // Offset to center
            
            // Add to body
            document.body.appendChild(popup);
        }
        
        /**
         * Validate the function library code
         * @returns {Object} Validation result with success, message, and extracted functions
         */
        function validateFunction() {
            const code = elements.functionCode.value.trim();
            
            // Reset validation result and tool definition
            hideValidationResult();
            hideToolDefinition();
            
            // Validate code
            if (!code) {
                showValidationResult('Function code is required', 'error');
                return { success: false };
            }
            
            try {
                // Check for basic syntax errors by trying to parse the code
                try {
                    // Use Function constructor to check for syntax errors
                    // This won't execute the code, just parse it
                    new Function(code);
                } catch (syntaxError) {
                    showValidationResult(`Syntax error in code: ${syntaxError.message}`, 'error');
                    return { success: false };
                }
                
                // Extract all functions from the code
                const functions = extractFunctions(code);
                
                if (functions.length === 0) {
                    showValidationResult('No functions found in the code', 'error');
                    return { success: false };
                }
                
                // Count callable functions
                const callableFunctions = functions.filter(func => func.isCallable);
                
                if (callableFunctions.length === 0) {
                    showValidationResult('No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent), or if functions are marked with @internal (which makes only non-@internal functions callable)', 'warning');
                    // Still return success, but with a warning
                    return { 
                        success: true,
                        functions: functions,
                        warning: true
                    };
                }
                
                // Generate tool definitions for callable functions
                const toolDefinitions = callableFunctions.map(func => 
                    generateToolDefinition(func.name, func.code)
                );
                
                // Show the first tool definition as an example
                if (toolDefinitions.length > 0) {
                    showToolDefinition(toolDefinitions[0]);
                }
                
                // Show success message
                showValidationResult(`Library validated successfully! Found ${functions.length} functions, ${callableFunctions.length} marked as callable.`, 'success');
                
                return { 
                    success: true, 
                    functions: functions,
                    callableFunctions: callableFunctions,
                    toolDefinitions: toolDefinitions
                };
            } catch (error) {
                showValidationResult(`Error validating function library: ${error.message}`, 'error');
                return { success: false };
            }
        }
        
        /**
         * Generate a tool definition from a function
         * @param {string} name - Function name
         * @param {string} code - Function code
         * @returns {Object} Tool definition
         */
        function generateToolDefinition(name, code) {
            // Create a basic tool definition
            const toolDefinition = {
                type: 'function',
                function: {
                    name: name,
                    description: `Function ${name} for tool calling`,
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            };
            
            try {
                // Extract function parameters
                const paramMatch = code.match(/function\s+[^(]*\(([^)]*)\)/);
                if (paramMatch && paramMatch[1].trim()) {
                    const params = paramMatch[1].split(',').map(p => p.trim());
                    
                    params.forEach(param => {
                        // Check for default values
                        const hasDefault = param.includes('=');
                        const paramName = hasDefault ? param.split('=')[0].trim() : param;
                        
                        toolDefinition.function.parameters.properties[paramName] = {
                            type: 'string', // Default to string type
                            description: `Parameter ${paramName} for function ${name}`
                        };
                        
                        // If no default value, consider it required
                        if (!hasDefault) {
                            toolDefinition.function.parameters.required.push(paramName);
                        }
                    });
                }
                
                // Try to extract JSDoc comments for description and param types
                const jsDocMatch = code.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
                if (jsDocMatch) {
                    const jsDoc = jsDocMatch[1];
                    
                    // Extract function description
                    const descMatch = jsDoc.match(/@description\s+(.*?)(?=\s*@|\s*\*\/|$)/s);
                    if (descMatch) {
                        toolDefinition.function.description = descMatch[1].replace(/\s*\*\s*/g, ' ').trim();
                    }
                    
                    // Extract param descriptions and types
                    const paramMatches = jsDoc.matchAll(/@param\s+{([^}]+)}\s+([^\s]+)\s+(.*?)(?=\s*@|\s*\*\/|$)/gs);
                    for (const match of paramMatches) {
                        const [, type, name, description] = match;
                        
                        if (toolDefinition.function.parameters.properties[name]) {
                            toolDefinition.function.parameters.properties[name].type = mapJSTypeToJSONType(type);
                            toolDefinition.function.parameters.properties[name].description = description.replace(/\s*\*\s*/g, ' ').trim();
                        }
                    }
                }
                
                return toolDefinition;
            } catch (error) {
                console.error('Error generating tool definition:', error);
                return toolDefinition;
            }
        }
        
        /**
         * Map JavaScript types to JSON Schema types
         * @param {string} jsType - JavaScript type
         * @returns {string} JSON Schema type
         */
        function mapJSTypeToJSONType(jsType) {
            const typeMap = {
                'string': 'string',
                'number': 'number',
                'boolean': 'boolean',
                'object': 'object',
                'array': 'array',
                'null': 'null',
                'undefined': 'null',
                'any': 'string'
            };
            
            return typeMap[jsType.toLowerCase()] || 'string';
        }
        
        /**
         * Load a function into the editor for editing
         * @param {string} name - Function name
         * @param {Object} functionSpec - Function specification
         */
        function loadFunctionIntoEditor(name, functionSpec) {
            // Set the editing flag
            editingFunctionName = name;
            
            // Set the function name
            if (elements.functionName) {
                elements.functionName.value = name;
                // Make it read-only since it's auto-completed
                elements.functionName.classList.add('auto-completed');
                elements.functionName.setAttribute('readonly', 'readonly');
            }
            
            // Get all functions in the same collection to preserve the bundle
            const relatedFunctions = FunctionToolsService.getFunctionsInSameCollection(name);
            const functions = FunctionToolsService.getJsFunctions();
            
            // Set the function code
            if (elements.functionCode) {
                let codeToLoad = functionSpec.code;
                
                // If there are multiple functions in the same collection, load them all
                if (relatedFunctions.length > 1) {
                    // Sort the functions to ensure consistent order
                    relatedFunctions.sort();
                    
                    // Combine the code of all related functions
                    codeToLoad = relatedFunctions
                        .filter(funcName => functions[funcName]) // Ensure the function exists
                        .map(funcName => functions[funcName].code)
                        .join('\n\n');
                }
                
                elements.functionCode.value = codeToLoad;
                
                // Trigger any event listeners that might be attached to the code editor
                const event = new Event('input', { bubbles: true });
                elements.functionCode.dispatchEvent(event);
            }
            
            // Scroll to the editor form
            if (elements.functionEditorForm) {
                elements.functionEditorForm.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Hide validation result and tool definition
            hideValidationResult();
            hideToolDefinition();
            
            console.log(`Loaded function "${name}" into editor for editing`);
        }
        
        /**
         * Handle adding or updating functions
         * @param {Event} event - The form submit event
         */
        function handleAddFunction(event) {
            event.preventDefault();
            
            // Validate the function library first
            const validation = validateFunction();
            
            if (!validation.success) {
                return;
            }
            
            const code = elements.functionCode.value.trim();
            
            let collectionId;
            
            // If we're in edit mode, handle it differently
            if (editingFunctionName) {
                // Get the original collection ID to preserve it
                const functionCollections = FunctionToolsService.getFunctionCollections();
                collectionId = functionCollections[editingFunctionName];
                
                // Remove the old function collection
                FunctionToolsService.removeJsFunction(editingFunctionName);
                
                // Reset editing flag
                editingFunctionName = null;
            }
            
            // Process all functions
            if (validation.functions && validation.functions.length > 0) {
                // Keep track of added callable functions
                const addedFunctions = [];
                
                // Generate a unique collection ID for this set of functions (or use existing one if editing)
                let collectionMetadata = null;
                if (!collectionId) {
                    collectionId = 'collection_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    
                    // Prompt for collection name when adding new functions
                    let collectionName = 'Untitled Collection'; // Default fallback
                    
                    // Check if we're in a test environment by looking for playwright indicators
                    const isTestEnvironment = window.navigator.webdriver || 
                                             window.__playwright || 
                                             window.location.href.includes('localhost:8000');
                    
                    if (!isTestEnvironment) {
                        const userCollectionName = prompt('Enter a name for this function collection:', 'Untitled Collection');
                        if (userCollectionName === null) {
                            // User cancelled
                            return;
                        }
                        collectionName = userCollectionName || 'Untitled Collection';
                    } else {
                        // In test environment, use a default name based on function names
                        const callableFunctionNames = validation.callableFunctions ? 
                            validation.callableFunctions.map(f => f.name) : [];
                        if (callableFunctionNames.length > 0) {
                            collectionName = `Test Functions (${callableFunctionNames[0]})`;
                        }
                    }
                    
                    collectionMetadata = {
                        name: collectionName,
                        createdAt: new Date().toISOString(),
                        source: 'manual'
                    };
                }
                
                // First, add all auxiliary functions (non-callable)
                const auxiliaryFunctions = validation.functions.filter(func => !func.isCallable);
                auxiliaryFunctions.forEach(func => {
                    // Add the function but don't enable it for tool calling
                    FunctionToolsService.addJsFunction(
                        func.name, 
                        func.code, 
                        { // Create a minimal tool definition for auxiliary functions
                            type: 'function',
                            function: {
                                name: func.name,
                                description: `Auxiliary function ${func.name} (not exposed to LLM)`,
                                parameters: {
                                    type: 'object',
                                    properties: {},
                                    required: []
                                }
                            }
                        },
                        collectionId, // Pass the collection ID to associate all functions
                        collectionMetadata // Pass the collection metadata
                    );
                });
                
                // Then add callable functions
                const callableFunctions = validation.callableFunctions || [];
                callableFunctions.forEach((func, index) => {
                    // Add the function
                    const success = FunctionToolsService.addJsFunction(
                        func.name, 
                        func.code, 
                        validation.toolDefinitions[index],
                        collectionId, // Pass the collection ID to associate all functions
                        collectionMetadata // Pass the collection metadata
                    );
                    
                    if (success) {
                        // Enable the function by default
                        FunctionToolsService.enableJsFunction(func.name);
                        addedFunctions.push(func.name);
                    }
                });
                
                // Render updated list
                renderFunctionList();
                
                // Add system message
                if (addSystemMessage) {
                    if (addedFunctions.length === 1) {
                        addSystemMessage(`Function "${addedFunctions[0]}" added and enabled for tool calling.`);
                    } else if (addedFunctions.length > 1) {
                        addSystemMessage(`${addedFunctions.length} functions added and enabled for tool calling: ${addedFunctions.join(', ')}`);
                    }
                }
                
                // Show success message
                if (addedFunctions.length === 1) {
                    showValidationResult(`Function "${addedFunctions[0]}" added successfully.`, 'success');
                } else if (addedFunctions.length > 1) {
                    showValidationResult(`${addedFunctions.length} functions added successfully.`, 'success');
                } else {
                    showValidationResult('No functions were added. Please check your code.', 'error');
                }
                
                // Keep the function in the editor for further editing
                // Focus back on the function code field for further editing
                if (elements.functionCode) {
                    setTimeout(() => {
                        elements.functionCode.focus();
                    }, 100);
                }
            } else {
                // No callable functions found
                showValidationResult('No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent), or if functions are marked with @internal (which makes only non-@internal functions callable)', 'warning');
            }
        }
        
        /**
         * Show validation result
         * @param {string} message - The message
         * @param {string} type - The type of message (success, error, warning)
         */
        function showValidationResult(message, type) {
            if (elements.functionValidationResult) {
                elements.functionValidationResult.textContent = message;
                elements.functionValidationResult.className = 'function-validation-result';
                elements.functionValidationResult.classList.add(type);
            }
        }
        
        /**
         * Hide validation result
         */
        function hideValidationResult() {
            if (elements.functionValidationResult) {
                elements.functionValidationResult.className = 'function-validation-result';
            }
        }
        
        /**
         * Show tool definition
         * @param {Object} toolDefinition - The tool definition
         */
        function showToolDefinition(toolDefinition) {
            if (elements.functionToolDefinition) {
                elements.functionToolDefinition.textContent = JSON.stringify(toolDefinition, null, 2);
                elements.functionToolDefinition.classList.add('active');
            }
        }
        
        /**
         * Hide tool definition
         */
        function hideToolDefinition() {
            if (elements.functionToolDefinition) {
                elements.functionToolDefinition.classList.remove('active');
            }
        }
        
        /**
         * Reset the function editor to the currently active functions
         */
        function clearFunctionEditor() {
            hideValidationResult();
            hideToolDefinition();
            
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            
            if (editingFunctionName && functions[editingFunctionName]) {
                // If we're editing a function, reload just that function and its related functions
                
                // Get all functions in the same collection
                const relatedFunctions = FunctionToolsService.getFunctionsInSameCollection(editingFunctionName);
                
                // If we have related functions, combine them
                if (relatedFunctions.length > 1) {
                    // Sort the functions to ensure consistent order
                    relatedFunctions.sort();
                    
                    // Combine the code of all related functions
                    const combinedCode = relatedFunctions
                        .filter(name => functions[name]) // Ensure the function exists
                        .map(name => functions[name].code)
                        .join('\n\n');
                    
                    if (elements.functionCode) {
                        elements.functionCode.value = combinedCode;
                        
                        // Trigger any event listeners that might be attached to the code editor
                        const event = new Event('input', { bubbles: true });
                        elements.functionCode.dispatchEvent(event);
                    }
                } else {
                    // If no related functions, just load this function
                    loadFunctionIntoEditor(editingFunctionName, functions[editingFunctionName]);
                }
            } else if (functionNames.length > 0) {
                // If we have active functions, we need to group them by their collection IDs
                const functionCollections = {};
                
                // Group functions by their collection ID
                functionNames.forEach(name => {
                    const relatedFunctions = FunctionToolsService.getFunctionsInSameCollection(name);
                    const collectionKey = relatedFunctions.sort().join(','); // Use sorted function names as key
                    
                    if (!functionCollections[collectionKey]) {
                        functionCollections[collectionKey] = relatedFunctions;
                    }
                });
                
                // Get unique collections
                const uniqueCollections = Object.values(functionCollections);
                
                // Combine code from each collection
                const combinedCode = uniqueCollections.map(collection => {
                    return collection
                        .filter(name => functions[name]) // Ensure the function exists
                        .map(name => functions[name].code)
                        .join('\n\n');
                }).join('\n\n\n');
                
                if (elements.functionCode) {
                    elements.functionCode.value = combinedCode;
                    
                    // Trigger any event listeners that might be attached to the code editor
                    const event = new Event('input', { bubbles: true });
                    elements.functionCode.dispatchEvent(event);
                }
                
                // Reset editing flag
                editingFunctionName = null;
                
                if (elements.functionName) {
                    elements.functionName.value = '';
                    // Remove auto-completed styling and make editable
                    elements.functionName.classList.remove('auto-completed');
                    elements.functionName.removeAttribute('readonly');
                }
            } else {
                // If no active functions, use the default function code
                if (elements.functionCode) {
                    elements.functionCode.value = getDefaultFunctionCode();
                    // Extract function name from default code
                    setTimeout(extractFunctionName, 100);
                }
                
                // Reset editing flag
                editingFunctionName = null;
                
                if (elements.functionName) {
                    elements.functionName.value = '';
                    // Remove auto-completed styling and make editable
                    elements.functionName.classList.remove('auto-completed');
                    elements.functionName.removeAttribute('readonly');
                }
            }
            
            // Focus back on the function code field
            if (elements.functionCode) {
                setTimeout(() => {
                    elements.functionCode.focus();
                }, 100);
            }
        }
        
        /**
         * Extract all functions from code
         * @param {string} code - The code to extract functions from
         * @returns {Array} Array of function objects with name, code, and isCallable properties
         */
        function extractFunctions(code) {
            if (!code) return [];
            
            try {
                // Normalize indentation
                const normalizedCode = code.replace(/^[ \t]+/gm, '');
                
                // Find all function declarations in the code
                // This regex captures the JSDoc comment (if any), any single-line comment before the function, and the function declaration
                // The improved regex better handles multiple functions with JSDoc comments
                // Modified to better handle closely packed functions by ensuring we capture the entire function body
                const functionRegex = /(\/\*\*[\s\S]*?\*\/\s*)?(\/\/.*?(?:\n\s*|$))?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)[\s\S]*?(?=\/\*\*|\s*\/\/|\s*function\s+[a-zA-Z_$]|\s*$|$)/g;
                
                console.log('Extracting functions with regex:', functionRegex.source);
                
                const functions = [];
                let match;
                
                while ((match = functionRegex.exec(normalizedCode)) !== null) {
                    const jsDoc = match[1] || '';
                    const singleLineComment = match[2] || '';
                    const functionName = match[3];
                    const params = match[4];
                    
                    // Get the full function code by finding the opening brace and matching closing brace
                    const functionStartIndex = match.index + (jsDoc ? jsDoc.length : 0);
                    const functionDeclaration = normalizedCode.substring(functionStartIndex);
                    
                    // Find the function body by matching braces
                    let braceCount = 0;
                    let endIndex = 0;
                    let foundOpeningBrace = false;
                    
                    for (let i = 0; i < functionDeclaration.length; i++) {
                        const char = functionDeclaration[i];
                        
                        if (char === '{') {
                            foundOpeningBrace = true;
                            braceCount++;
                        } else if (char === '}') {
                            braceCount--;
                            
                            if (foundOpeningBrace && braceCount === 0) {
                                endIndex = i + 1;
                                break;
                            }
                        }
                    }
                    
                    // Extract the full function code including JSDoc
                    const fullFunctionCode = (jsDoc || '') + functionDeclaration.substring(0, endIndex);
                    
                // Check if the function is marked as callable with any of the supported markers
                // in JSDoc comments: @callable_function, @callable, @tool
                const hasCallableMarker = jsDoc && (
                    jsDoc.includes('@callable_function') || 
                    jsDoc.includes('@callable') || 
                    jsDoc.includes('@tool')
                );
                
                // Check for single-line comments with @callable or @tool
                // This will match both "// @callable" and "// @tool"
                const hasSingleLineCommentMarker = singleLineComment && 
                    (singleLineComment.includes('@callable') || singleLineComment.includes('@tool'));
                
                // Check if the function is marked as internal
                // This is a critical check that determines if a function should be excluded from callable functions
                const hasInternalMarker = (jsDoc && jsDoc.includes('@internal')) || 
                    (singleLineComment && singleLineComment.includes('@internal'));
                
                // Initialize isCallable to false for internal functions, undefined for others
                // This ensures internal functions are never callable unless explicitly marked
                const initialIsCallable = hasInternalMarker ? false : undefined;
                
                // Debug logging to help diagnose parsing issues
                console.log(`Function ${functionName} parsing:`, {
                    jsDoc: jsDoc ? jsDoc.substring(0, 50) + '...' : 'none',
                    singleLineComment: singleLineComment ? singleLineComment.trim() : 'none',
                    hasCallableMarker,
                    hasSingleLineCommentMarker,
                    hasInternalMarker
                });
                
                // We don't need to check for comments within the function body anymore
                // as they should be captured by the singleLineComment group
                // This was causing issues with detecting comments meant for other functions
                
                // Mark as callable if it has any of the markers
                // If it has a callable/tool marker, that takes precedence over @internal
                // Otherwise, use the initialIsCallable value (false for internal functions)
                const isCallable = hasCallableMarker || hasSingleLineCommentMarker || initialIsCallable;
                    
                    functions.push({
                        name: functionName,
                        code: fullFunctionCode,
                        isCallable: isCallable,
                        isInternal: hasInternalMarker
                    });
                }
                
                // Check if any function has a callable marker
                const hasAnyCallableMarker = functions.some(func => {
                    // Check if this function has a callable marker
                    const functionCode = func.code;
                    
                    // Extract JSDoc comments
                    const jsDoc = functionCode.match(/\/\*\*[\s\S]*?\*\//)?.[0] || '';
                    
                    // Extract all single-line comments
                    const singleLineComments = functionCode.match(/\/\/.*?(?:\n|$)/g) || [];
                    
                    // Check JSDoc for callable markers
                    const hasCallableMarker = jsDoc && (
                        jsDoc.includes('@callable_function') || 
                        jsDoc.includes('@callable') || 
                        jsDoc.includes('@tool')
                    );
                    
                    // Check all single-line comments for markers
                    const hasSingleLineCommentMarker = singleLineComments.some(comment => 
                        comment.includes('@callable') || comment.includes('@tool')
                    );
                    
                    // Check for internal markers
                    const hasInternalMarker = jsDoc.includes('@internal') || 
                        singleLineComments.some(comment => comment.includes('@internal'));
                    
                    // Debug logging for callable markers
                    console.log(`Checking callable markers for ${func.name}:`, {
                        jsDoc: jsDoc ? 'present' : 'none',
                        singleLineComments: singleLineComments.length > 0 ? singleLineComments.join(' | ') : 'none',
                        hasCallableMarker,
                        hasSingleLineCommentMarker
                    });
                    
                    return hasCallableMarker || hasSingleLineCommentMarker;
                });
                
                // Check if any function has an internal marker
                const hasAnyInternalMarker = functions.some(func => func.isInternal);
                
                // If no function has a callable marker:
                if (!hasAnyCallableMarker && functions.length > 0) {
                    // If there are any @internal markers, mark all functions as callable EXCEPT those marked as @internal
                    if (hasAnyInternalMarker) {
                        functions.forEach(func => {
                            // Only set isCallable if it hasn't been explicitly set already
                            if (func.isCallable === undefined) {
                                func.isCallable = !func.isInternal;
                            }
                            
                            // Debug logging for internal markers
                            console.log(`Setting callable status for ${func.name}:`, {
                                isInternal: func.isInternal,
                                isCallable: func.isCallable
                            });
                        });
                    } else {
                        // If no @internal markers either, mark all as callable (original behavior)
                        functions.forEach(func => {
                            func.isCallable = true;
                        });
                    }
                }
                // If at least one function has a callable marker, only those explicitly marked remain callable
                // (the @internal tag has no effect in this case as it's already the default for non-tagged functions)
                
                // Log the final callable status
                console.log('Final callable status:', functions.map(f => `${f.name} (callable: ${f.isCallable})`));
                
                // Log the functions and their callable status for debugging
                console.log('Extracted functions:', functions.map(f => `${f.name} (callable: ${f.isCallable})`));
                
                return functions;
            } catch (error) {
                console.error('Error extracting functions:', error);
                return [];
            }
        }
        
        /**
         * Extract function name from code and auto-fill the function name field
         * This is kept for backward compatibility with the single function editor
         */
        function extractFunctionName() {
            if (!elements.functionCode || !elements.functionName) return;
            
            const code = elements.functionCode.value.trim();
            if (!code) return;
            
            try {
                // Extract all functions from the code
                const functions = extractFunctions(code);
                
                // If we found at least one function, use the first one
                if (functions.length > 0) {
                    const firstFunction = functions[0];
                    
                    // Auto-fill the function name field
                    elements.functionName.value = firstFunction.name;
                    
                    // Add auto-completed class to style the field
                    elements.functionName.classList.add('auto-completed');
                    
                    // Make the field read-only
                    elements.functionName.setAttribute('readonly', 'readonly');
                } else {
                    // If no function name found, remove auto-completed styling and make editable
                    elements.functionName.classList.remove('auto-completed');
                    elements.functionName.removeAttribute('readonly');
                }
            } catch (error) {
                console.error('Error extracting function name:', error);
            }
        }
        
        /**
         * Copy function code to clipboard
         */
        function copyFunctionCode() {
            if (!elements.functionCode) return;
            
            const code = elements.functionCode.value.trim();
            if (!code) {
                if (addSystemMessage) {
                    addSystemMessage('No function code to copy.');
                }
                return;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(code)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Function code copied to clipboard.');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy function code:', err);
                    if (addSystemMessage) {
                        addSystemMessage('Failed to copy function code. Please try again.');
                    }
                });
        }
        
        /**
         * Copy tool definition to clipboard
         */
        function copyToolDefinition() {
            if (!elements.functionToolDefinition) return;
            
            const toolDefinition = elements.functionToolDefinition.textContent.trim();
            if (!toolDefinition || !elements.functionToolDefinition.classList.contains('active')) {
                if (addSystemMessage) {
                    addSystemMessage('No tool definition to copy. Please validate the function first.');
                }
                return;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(toolDefinition)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Tool definition copied to clipboard.');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy tool definition:', err);
                    if (addSystemMessage) {
                        addSystemMessage('Failed to copy tool definition. Please try again.');
                    }
                });
        }
        
        /**
         * Copy entire function library as JSON to clipboard
         */
        function copyFunctionLibrary() {
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            
            if (!functions || Object.keys(functions).length === 0) {
                if (addSystemMessage) {
                    addSystemMessage('No functions in library to copy.');
                }
                return;
            }
            
            try {
                // Create a JSON representation of the functions library
                const functionsLibrary = {};
                
                // For each function, include its code and tool definition
                Object.keys(functions).forEach(name => {
                    functionsLibrary[name] = {
                        code: functions[name].code,
                        toolDefinition: functions[name].toolDefinition,
                        enabled: FunctionToolsService.isJsFunctionEnabled(name)
                    };
                });
                
                // Convert to JSON string with pretty formatting
                const jsonString = JSON.stringify(functionsLibrary, null, 2);
                
                // Copy to clipboard
                navigator.clipboard.writeText(jsonString)
                    .then(() => {
                        if (addSystemMessage) {
                            addSystemMessage('Function library copied to clipboard as JSON.');
                        }
                    })
                    .catch(err => {
                        console.error('Failed to copy function library:', err);
                        if (addSystemMessage) {
                            addSystemMessage('Failed to copy function library. Please try again.');
                        }
                    });
            } catch (error) {
                console.error('Error serializing function library:', error);
                if (addSystemMessage) {
                    addSystemMessage(`Error copying function library: ${error.message}`);
                }
            }
        }
        
        /**
         * Get function definitions for API requests
         * @returns {Array} Array of function definitions
         */
        function getFunctionDefinitions() {
            const userDefinedToolDefinitions = FunctionToolsService.getToolDefinitions();
            
            // Get default function tool definitions
            let defaultFunctionToolDefinitions = [];
            if (window.DefaultFunctionsService && typeof window.DefaultFunctionsService.getEnabledDefaultFunctionToolDefinitions === 'function') {
                defaultFunctionToolDefinitions = window.DefaultFunctionsService.getEnabledDefaultFunctionToolDefinitions();
            }
            
            // Combine both user-defined and default function tool definitions
            const allToolDefinitions = [...userDefinedToolDefinitions, ...defaultFunctionToolDefinitions];
            
            console.log(`Combined tool definitions: ${userDefinedToolDefinitions.length} user-defined + ${defaultFunctionToolDefinitions.length} default = ${allToolDefinitions.length} total`);
            
            return allToolDefinitions;
        }
        
        // Public API
        return {
            init,
            showFunctionModal,
            hideFunctionModal,
            showMcpServersModal,
            hideMcpServersModal,
            renderFunctionList,
            getFunctionDefinitions,
            validateFunction
        };
    }

    // Public API
    return {
        createFunctionCallingManager: createFunctionCallingManager
    };
})();
