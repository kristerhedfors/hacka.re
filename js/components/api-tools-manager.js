/**
 * API Tools Manager Module
 * Handles API tools management UI for the AIHackare application
 */

window.ApiToolsManager = (function() {
    /**
     * Create an API Tools Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} API Tools Manager instance
     */
    function createApiToolsManager(elements) {
        // State
        let apiTools = [];
        let editingToolIndex = -1;
        
        /**
         * Initialize the API tools manager
         */
        function init() {
            // Create API tools UI elements if they don't exist
            createApiToolsUI();
            
            // Initialize the API tools service
            if (window.ApiToolsService) {
                ApiToolsService.init();
                apiTools = ApiToolsService.getApiTools();
                renderApiToolsList();
            }
            
            // Set up event listeners
            setupEventListeners();
        }
        
        /**
         * Create API tools UI elements
         */
        function createApiToolsUI() {
            // Check if the API tools tab already exists in settings
            if (document.getElementById('api-tools-tab')) {
                return;
            }
            
            // Create API tools tab in settings
            const settingsForm = document.getElementById('settings-form');
            if (!settingsForm) {
                console.error('Settings form not found');
                return;
            }
            
            // Create tabs container if it doesn't exist
            let tabsContainer = document.querySelector('.settings-tabs');
            if (!tabsContainer) {
                tabsContainer = document.createElement('div');
                tabsContainer.className = 'settings-tabs';
                settingsForm.parentNode.insertBefore(tabsContainer, settingsForm);
                
                // Create General tab
                const generalTab = document.createElement('button');
                generalTab.className = 'tab-button active';
                generalTab.textContent = 'General';
                generalTab.id = 'general-tab';
                generalTab.dataset.tab = 'general-settings';
                tabsContainer.appendChild(generalTab);
                
                // Wrap existing settings in a tab content div
                const generalContent = document.createElement('div');
                generalContent.className = 'tab-content active';
                generalContent.id = 'general-settings';
                
                // Move all form children to the general content
                while (settingsForm.firstChild) {
                    generalContent.appendChild(settingsForm.firstChild);
                }
                
                settingsForm.appendChild(generalContent);
            }
            
            // Create API Tools tab
            const apiToolsTab = document.createElement('button');
            apiToolsTab.className = 'tab-button';
            apiToolsTab.textContent = 'API Tools';
            apiToolsTab.id = 'api-tools-tab';
            apiToolsTab.dataset.tab = 'api-tools-settings';
            tabsContainer.appendChild(apiToolsTab);
            
            // Create API Tools content
            const apiToolsContent = document.createElement('div');
            apiToolsContent.className = 'tab-content';
            apiToolsContent.id = 'api-tools-settings';
            
            // Create API Tools UI
            apiToolsContent.innerHTML = `
                <div class="form-group">
                    <label>API Tools</label>
                    <div class="form-help">Define API tools that can be used by AI models supporting OpenAI's tool calling interface.</div>
                    
                    <div class="api-tools-container">
                        <div class="api-tools-list" id="api-tools-list">
                            <div class="empty-state">No API tools defined. Click "Add Tool" to create one.</div>
                        </div>
                        
                        <button type="button" id="add-api-tool" class="btn secondary-btn">
                            <i class="fas fa-plus"></i> Add Tool
                        </button>
                    </div>
                </div>
                
                <div id="api-tool-form-container" class="api-tool-form-container" style="display: none;">
                    <h3 id="api-tool-form-title">Add API Tool</h3>
                    
                    <form id="api-tool-form">
                        <div class="form-group">
                            <label for="tool-name">Tool Name</label>
                            <div class="form-help">Alphanumeric characters and underscores only, no spaces.</div>
                            <input type="text" id="tool-name" placeholder="weather_lookup" pattern="^[a-zA-Z0-9_]+$" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="tool-description">Description</label>
                            <div class="form-help">Describe what this tool does and when it should be used.</div>
                            <textarea id="tool-description" placeholder="Get current weather information for a location" rows="2" required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="tool-endpoint">API Endpoint</label>
                            <div class="form-help">The full URL of the API endpoint.</div>
                            <input type="url" id="tool-endpoint" placeholder="https://api.example.com/weather" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="tool-method">HTTP Method</label>
                            <select id="tool-method">
                                <option value="GET">GET</option>
                                <option value="POST" selected>POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="tool-auth-type">Authentication</label>
                            <select id="tool-auth-type">
                                <option value="none">None</option>
                                <option value="bearer" selected>Bearer Token (uses API key)</option>
                                <option value="custom">Custom Header</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="custom-auth-header-group" style="display: none;">
                            <label for="tool-auth-header">Auth Header Name</label>
                            <input type="text" id="tool-auth-header" placeholder="X-API-Key">
                        </div>
                        
                        <div class="form-group">
                            <label for="tool-parameters">Parameters Schema (JSON)</label>
                            <div class="form-help">Define the parameters in OpenAPI JSON Schema format.</div>
                            <textarea id="tool-parameters" rows="8" placeholder='{
  "type": "object",
  "properties": {
    "location": {
      "type": "string",
      "description": "City name or zip code"
    },
    "units": {
      "type": "string",
      "enum": ["metric", "imperial"],
      "description": "Temperature units"
    }
  },
  "required": ["location"]
}'></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" id="cancel-api-tool" class="btn secondary-btn">Cancel</button>
                            <button type="submit" id="save-api-tool" class="btn primary-btn">Save Tool</button>
                        </div>
                    </form>
                </div>
            `;
            
            // Add API Tools content to settings form
            settingsForm.appendChild(apiToolsContent);
            
            // Add CSS for tabs and API tools
            const style = document.createElement('style');
            style.textContent = `
                .settings-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 20px;
                }
                
                .tab-button {
                    background: none;
                    border: none;
                    padding: 10px 15px;
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--text-color);
                    opacity: 0.7;
                    border-bottom: 2px solid transparent;
                }
                
                .tab-button.active {
                    opacity: 1;
                    border-bottom: 2px solid var(--primary-color);
                    font-weight: bold;
                }
                
                .tab-content {
                    display: none;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                .api-tools-container {
                    margin-top: 10px;
                }
                
                .api-tools-list {
                    background-color: var(--input-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    padding: 10px;
                    margin-bottom: 10px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .api-tool-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .api-tool-item:last-child {
                    border-bottom: none;
                }
                
                .api-tool-info {
                    flex-grow: 1;
                }
                
                .api-tool-name {
                    font-weight: bold;
                }
                
                .api-tool-description {
                    font-size: 0.9em;
                    opacity: 0.8;
                    margin-top: 3px;
                }
                
                .api-tool-actions {
                    display: flex;
                    gap: 5px;
                }
                
                .api-tool-form-container {
                    background-color: var(--input-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    padding: 15px;
                    margin-top: 15px;
                }
                
                .empty-state {
                    padding: 20px;
                    text-align: center;
                    color: var(--text-color);
                    opacity: 0.7;
                }
            `;
            
            document.head.appendChild(style);
        }
        
        /**
         * Set up event listeners for API tools UI
         */
        function setupEventListeners() {
            // Tab switching
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Deactivate all tabs
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                    
                    // Activate selected tab
                    button.classList.add('active');
                    const tabId = button.dataset.tab;
                    document.getElementById(tabId).classList.add('active');
                });
            });
            
            // Add tool button
            const addToolButton = document.getElementById('add-api-tool');
            if (addToolButton) {
                addToolButton.addEventListener('click', () => {
                    showApiToolForm();
                });
            }
            
            // Cancel button
            const cancelButton = document.getElementById('cancel-api-tool');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    hideApiToolForm();
                });
            }
            
            // Auth type change
            const authTypeSelect = document.getElementById('tool-auth-type');
            if (authTypeSelect) {
                authTypeSelect.addEventListener('change', () => {
                    const customAuthHeaderGroup = document.getElementById('custom-auth-header-group');
                    if (authTypeSelect.value === 'custom') {
                        customAuthHeaderGroup.style.display = 'block';
                    } else {
                        customAuthHeaderGroup.style.display = 'none';
                    }
                });
            }
            
            // Tool form submission
            const toolForm = document.getElementById('api-tool-form');
            if (toolForm) {
                toolForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    saveApiTool();
                });
            }
        }
        
        /**
         * Show the API tool form
         * @param {number} index - Index of the tool to edit, or -1 for a new tool
         */
        function showApiToolForm(index = -1) {
            editingToolIndex = index;
            
            const formContainer = document.getElementById('api-tool-form-container');
            const formTitle = document.getElementById('api-tool-form-title');
            
            if (index >= 0 && index < apiTools.length) {
                // Editing existing tool
                const tool = apiTools[index];
                formTitle.textContent = 'Edit API Tool';
                
                // Fill form with tool data
                document.getElementById('tool-name').value = tool.name;
                document.getElementById('tool-description').value = tool.description;
                document.getElementById('tool-endpoint').value = tool.endpoint;
                document.getElementById('tool-method').value = tool.method || 'POST';
                document.getElementById('tool-auth-type').value = tool.authType || 'bearer';
                
                if (tool.authType === 'custom' && tool.authHeader) {
                    document.getElementById('custom-auth-header-group').style.display = 'block';
                    document.getElementById('tool-auth-header').value = tool.authHeader;
                } else {
                    document.getElementById('custom-auth-header-group').style.display = 'none';
                    document.getElementById('tool-auth-header').value = '';
                }
                
                // Format parameters as JSON string if it exists
                if (tool.parameters) {
                    document.getElementById('tool-parameters').value = JSON.stringify(tool.parameters, null, 2);
                } else {
                    document.getElementById('tool-parameters').value = '';
                }
            } else {
                // Adding new tool
                formTitle.textContent = 'Add API Tool';
                
                // Reset form
                document.getElementById('tool-name').value = '';
                document.getElementById('tool-description').value = '';
                document.getElementById('tool-endpoint').value = '';
                document.getElementById('tool-method').value = 'POST';
                document.getElementById('tool-auth-type').value = 'bearer';
                document.getElementById('custom-auth-header-group').style.display = 'none';
                document.getElementById('tool-auth-header').value = '';
                document.getElementById('tool-parameters').value = '';
            }
            
            formContainer.style.display = 'block';
        }
        
        /**
         * Hide the API tool form
         */
        function hideApiToolForm() {
            const formContainer = document.getElementById('api-tool-form-container');
            formContainer.style.display = 'none';
            editingToolIndex = -1;
        }
        
        /**
         * Save the API tool from form data
         */
        function saveApiTool() {
            // Get form values
            const name = document.getElementById('tool-name').value.trim();
            const description = document.getElementById('tool-description').value.trim();
            const endpoint = document.getElementById('tool-endpoint').value.trim();
            const method = document.getElementById('tool-method').value;
            const authType = document.getElementById('tool-auth-type').value;
            const authHeader = document.getElementById('tool-auth-header').value.trim();
            const parametersStr = document.getElementById('tool-parameters').value.trim();
            
            // Validate required fields
            if (!name || !description || !endpoint) {
                alert('Name, description, and endpoint are required.');
                return;
            }
            
            // Parse parameters JSON if provided
            let parameters = null;
            if (parametersStr) {
                try {
                    parameters = JSON.parse(parametersStr);
                } catch (error) {
                    alert('Invalid JSON in parameters field.');
                    return;
                }
            }
            
            // Create tool definition
            const toolDefinition = {
                name: name,
                description: description,
                endpoint: endpoint,
                method: method,
                authType: authType
            };
            
            // Add auth header if using custom auth
            if (authType === 'custom' && authHeader) {
                toolDefinition.authHeader = authHeader;
            }
            
            // Add parameters if provided
            if (parameters) {
                toolDefinition.parameters = parameters;
            }
            
            // Save the tool
            if (window.ApiToolsService) {
                const success = ApiToolsService.addApiTool(toolDefinition);
                
                if (success) {
                    // Update local tools array
                    apiTools = ApiToolsService.getApiTools();
                    
                    // Render the updated list
                    renderApiToolsList();
                    
                    // Hide the form
                    hideApiToolForm();
                } else {
                    alert('Failed to save API tool. Please check your inputs.');
                }
            } else {
                alert('API Tools Service is not available.');
            }
        }
        
        /**
         * Delete an API tool
         * @param {number} index - Index of the tool to delete
         */
        function deleteApiTool(index) {
            if (index >= 0 && index < apiTools.length && window.ApiToolsService) {
                const tool = apiTools[index];
                
                if (confirm(`Are you sure you want to delete the tool "${tool.name}"?`)) {
                    const success = ApiToolsService.removeApiTool(tool.name);
                    
                    if (success) {
                        // Update local tools array
                        apiTools = ApiToolsService.getApiTools();
                        
                        // Render the updated list
                        renderApiToolsList();
                    } else {
                        alert('Failed to delete API tool.');
                    }
                }
            }
        }
        
        /**
         * Render the list of API tools
         */
        function renderApiToolsList() {
            const listContainer = document.getElementById('api-tools-list');
            
            if (!listContainer) {
                return;
            }
            
            // Clear the list
            listContainer.innerHTML = '';
            
            if (apiTools.length === 0) {
                // Show empty state
                listContainer.innerHTML = '<div class="empty-state">No API tools defined. Click "Add Tool" to create one.</div>';
                return;
            }
            
            // Add each tool to the list
            apiTools.forEach((tool, index) => {
                const toolItem = document.createElement('div');
                toolItem.className = 'api-tool-item';
                
                toolItem.innerHTML = `
                    <div class="api-tool-info">
                        <div class="api-tool-name">${tool.name}</div>
                        <div class="api-tool-description">${tool.description}</div>
                    </div>
                    <div class="api-tool-actions">
                        <button type="button" class="btn icon-btn edit-tool" title="Edit tool" data-index="${index}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn icon-btn delete-tool" title="Delete tool" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                listContainer.appendChild(toolItem);
            });
            
            // Add event listeners for edit and delete buttons
            listContainer.querySelectorAll('.edit-tool').forEach(button => {
                button.addEventListener('click', () => {
                    const index = parseInt(button.dataset.index);
                    showApiToolForm(index);
                });
            });
            
            listContainer.querySelectorAll('.delete-tool').forEach(button => {
                button.addEventListener('click', () => {
                    const index = parseInt(button.dataset.index);
                    deleteApiTool(index);
                });
            });
        }
        
        // Public API
        return {
            init,
            renderApiToolsList
        };
    }
    
    // Public API
    return {
        createApiToolsManager: createApiToolsManager
    };
})();
