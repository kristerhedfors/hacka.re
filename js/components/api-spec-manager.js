/**
 * API Specification Manager Module
 * Handles API specification management UI for the AIHackare application
 */

window.ApiSpecManager = (function() {
    /**
     * Create an API Specification Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} API Specification Manager instance
     */
    function createApiSpecManager(elements) {
        // State
        let currentSpecInfo = null;
        let currentToolInfo = null;
        let currentEndpointIndex = 0;
        
        /**
         * Initialize the API specification manager
         */
        function init() {
            // Create API specification UI elements if they don't exist
            createApiSpecUI();
            
            // Set up event listeners
            setupEventListeners();
        }
        
        /**
         * Create API specification UI elements
         */
        function createApiSpecUI() {
            // Check if the API spec tab already exists in settings
            if (document.getElementById('api-spec-tab')) {
                return;
            }
            
            // Create API spec tab in settings
            const settingsForm = document.getElementById('settings-form');
            if (!settingsForm) {
                console.error('Settings form not found');
                return;
            }
            
            // Create tabs container if it doesn't exist
            let tabsContainer = document.querySelector('.settings-tabs');
            if (!tabsContainer) {
                console.error('Settings tabs container not found');
                return;
            }
            
            // Create API Spec tab
            const apiSpecTab = document.createElement('button');
            apiSpecTab.className = 'tab-button';
            apiSpecTab.textContent = 'API Spec';
            apiSpecTab.id = 'api-spec-tab';
            apiSpecTab.dataset.tab = 'api-spec-settings';
            tabsContainer.appendChild(apiSpecTab);
            
            // Create API Spec content
            const apiSpecContent = document.createElement('div');
            apiSpecContent.className = 'tab-content';
            apiSpecContent.id = 'api-spec-settings';
            
            // Create API Spec UI
            apiSpecContent.innerHTML = `
                <div class="form-group">
                    <label>API Specification Generator</label>
                    <div class="form-help">Create OpenAPI specifications and save them as tools for AI models.</div>
                    
                    <div class="api-spec-container">
                        <div class="api-spec-steps">
                            <div class="api-spec-step active" id="step-basic-info">
                                <h3>Step 1: Basic Information</h3>
                                <div class="form-group">
                                    <label for="spec-title">API Title</label>
                                    <input type="text" id="spec-title" placeholder="Weather API">
                                </div>
                                <div class="form-group">
                                    <label for="spec-description">Description</label>
                                    <textarea id="spec-description" placeholder="API for retrieving weather information" rows="2"></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="spec-version">Version</label>
                                    <input type="text" id="spec-version" placeholder="1.0.0" value="1.0.0">
                                </div>
                                <div class="form-actions">
                                    <button type="button" id="next-to-endpoint" class="btn primary-btn">Next: Endpoint</button>
                                </div>
                            </div>
                            
                            <div class="api-spec-step" id="step-endpoint">
                                <h3>Step 2: Endpoint Definition</h3>
                                <div class="form-group">
                                    <label for="endpoint-path">Path</label>
                                    <input type="text" id="endpoint-path" placeholder="/weather">
                                </div>
                                <div class="form-group">
                                    <label for="endpoint-method">HTTP Method</label>
                                    <select id="endpoint-method">
                                        <option value="get">GET</option>
                                        <option value="post">POST</option>
                                        <option value="put">PUT</option>
                                        <option value="delete">DELETE</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="endpoint-summary">Summary</label>
                                    <input type="text" id="endpoint-summary" placeholder="Get weather information">
                                </div>
                                <div class="form-group">
                                    <label for="endpoint-description">Description</label>
                                    <textarea id="endpoint-description" placeholder="Returns current weather for a location" rows="2"></textarea>
                                </div>
                                <div class="form-actions">
                                    <button type="button" id="back-to-basic" class="btn secondary-btn">Back</button>
                                    <button type="button" id="next-to-parameters" class="btn primary-btn">Next: Parameters</button>
                                </div>
                            </div>
                            
                            <div class="api-spec-step" id="step-parameters">
                                <h3>Step 3: Parameters</h3>
                                <div id="parameters-container">
                                    <div class="empty-state">No parameters defined. Click "Add Parameter" to create one.</div>
                                </div>
                                <button type="button" id="add-parameter" class="btn secondary-btn">
                                    <i class="fas fa-plus"></i> Add Parameter
                                </button>
                                
                                <div id="parameter-form" style="display: none; margin-top: 15px; padding: 10px; border: 1px solid var(--border-color); border-radius: var(--border-radius);">
                                    <h4>Parameter Details</h4>
                                    <div class="form-group">
                                        <label for="param-name">Name</label>
                                        <input type="text" id="param-name" placeholder="location">
                                    </div>
                                    <div class="form-group">
                                        <label for="param-in">Location</label>
                                        <select id="param-in">
                                            <option value="query">Query</option>
                                            <option value="path">Path</option>
                                            <option value="header">Header</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="param-type">Data Type</label>
                                        <select id="param-type">
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="integer">Integer</option>
                                            <option value="boolean">Boolean</option>
                                            <option value="array">Array</option>
                                            <option value="object">Object</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="param-description">Description</label>
                                        <input type="text" id="param-description" placeholder="City name or zip code">
                                    </div>
                                    <div class="form-group">
                                        <label for="param-required">Required</label>
                                        <input type="checkbox" id="param-required">
                                    </div>
                                    <div class="form-actions">
                                        <button type="button" id="cancel-parameter" class="btn secondary-btn">Cancel</button>
                                        <button type="button" id="save-parameter" class="btn primary-btn">Save Parameter</button>
                                    </div>
                                </div>
                                
                                <div class="form-actions" style="margin-top: 15px;">
                                    <button type="button" id="back-to-endpoint" class="btn secondary-btn">Back</button>
                                    <button type="button" id="next-to-tool" class="btn primary-btn">Next: Tool Info</button>
                                </div>
                            </div>
                            
                            <div class="api-spec-step" id="step-tool-info">
                                <h3>Step 4: Tool Information</h3>
                                <div class="form-group">
                                    <label for="tool-name">Tool Name</label>
                                    <div class="form-help">Alphanumeric characters and underscores only, no spaces.</div>
                                    <input type="text" id="tool-name" placeholder="weather_lookup" pattern="^[a-zA-Z0-9_]+$">
                                </div>
                                <div class="form-group">
                                    <label for="tool-description">Tool Description</label>
                                    <textarea id="tool-description" placeholder="Get current weather information for a location" rows="2"></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="tool-endpoint">API Endpoint URL</label>
                                    <input type="url" id="tool-endpoint" placeholder="https://api.example.com/weather">
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
                                <div class="form-actions">
                                    <button type="button" id="back-to-parameters" class="btn secondary-btn">Back</button>
                                    <button type="button" id="next-to-review" class="btn primary-btn">Next: Review</button>
                                </div>
                            </div>
                            
                            <div class="api-spec-step" id="step-review">
                                <h3>Step 5: Review and Save</h3>
                                <div class="form-group">
                                    <label>OpenAPI Specification</label>
                                    <div class="code-preview">
                                        <pre id="openapi-preview"></pre>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Tool Definition</label>
                                    <div class="code-preview">
                                        <pre id="tool-preview"></pre>
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button type="button" id="back-to-tool" class="btn secondary-btn">Back</button>
                                    <button type="button" id="save-api-spec" class="btn primary-btn">Save Tool</button>
                                </div>
                            </div>
                            
                            <div class="api-spec-step" id="step-success">
                                <h3>Success!</h3>
                                <div class="success-message">
                                    <i class="fas fa-check-circle"></i>
                                    <p>Your API specification has been saved as a tool.</p>
                                </div>
                                <div class="form-actions">
                                    <button type="button" id="create-new-spec" class="btn secondary-btn">Create Another</button>
                                    <button type="button" id="view-tools" class="btn primary-btn">View Tools</button>
                                </div>
                            </div>
                            
                            <div class="api-spec-step" id="step-ai-generate">
                                <h3>Generate from Description</h3>
                                <div class="form-group">
                                    <label for="ai-description">Describe the API</label>
                                    <div class="form-help">Provide a detailed description of the API you want to create.</div>
                                    <textarea id="ai-description" placeholder="An API that provides current weather information for a given location..." rows="4"></textarea>
                                </div>
                                <div class="form-actions">
                                    <button type="button" id="back-to-start" class="btn secondary-btn">Back</button>
                                    <button type="button" id="generate-from-description" class="btn primary-btn">Generate</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="api-spec-actions">
                            <button type="button" id="start-from-scratch" class="btn secondary-btn">Create from Scratch</button>
                            <button type="button" id="start-from-description" class="btn secondary-btn">Generate from Description</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add API Spec content to settings form
            settingsForm.appendChild(apiSpecContent);
            
            // Add CSS for API spec UI
            const style = document.createElement('style');
            style.textContent = `
                .api-spec-container {
                    margin-top: 10px;
                }
                
                .api-spec-steps {
                    background-color: var(--input-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    padding: 15px;
                    margin-bottom: 10px;
                }
                
                .api-spec-step {
                    display: none;
                }
                
                .api-spec-step.active {
                    display: block;
                }
                
                .api-spec-step h3 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    font-size: 18px;
                    color: var(--primary-color);
                }
                
                .api-spec-step h4 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                
                .form-actions {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 20px;
                }
                
                .code-preview {
                    background-color: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .code-preview pre {
                    margin: 0;
                    white-space: pre-wrap;
                    font-family: monospace;
                    font-size: 12px;
                }
                
                .parameter-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .parameter-item:last-child {
                    border-bottom: none;
                }
                
                .parameter-info {
                    flex-grow: 1;
                }
                
                .parameter-name {
                    font-weight: bold;
                }
                
                .parameter-details {
                    font-size: 0.9em;
                    opacity: 0.8;
                    margin-top: 3px;
                }
                
                .parameter-actions {
                    display: flex;
                    gap: 5px;
                }
                
                .success-message {
                    text-align: center;
                    padding: 20px;
                }
                
                .success-message i {
                    font-size: 48px;
                    color: var(--secondary-color);
                    margin-bottom: 10px;
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
         * Set up event listeners for API spec UI
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
            
            // Start from scratch button
            const startFromScratchButton = document.getElementById('start-from-scratch');
            if (startFromScratchButton) {
                startFromScratchButton.addEventListener('click', () => {
                    resetForm();
                    showStep('step-basic-info');
                });
            }
            
            // Start from description button
            const startFromDescriptionButton = document.getElementById('start-from-description');
            if (startFromDescriptionButton) {
                startFromDescriptionButton.addEventListener('click', () => {
                    resetForm();
                    showStep('step-ai-generate');
                });
            }
            
            // Navigation buttons
            setupNavigationButtons();
            
            // Parameter form buttons
            setupParameterFormButtons();
            
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
            
            // Save API spec button
            const saveApiSpecButton = document.getElementById('save-api-spec');
            if (saveApiSpecButton) {
                saveApiSpecButton.addEventListener('click', saveApiSpecification);
            }
            
            // Generate from description button
            const generateFromDescriptionButton = document.getElementById('generate-from-description');
            if (generateFromDescriptionButton) {
                generateFromDescriptionButton.addEventListener('click', generateFromDescription);
            }
            
            // Create new spec button
            const createNewSpecButton = document.getElementById('create-new-spec');
            if (createNewSpecButton) {
                createNewSpecButton.addEventListener('click', () => {
                    resetForm();
                    showStep('step-basic-info');
                });
            }
            
            // View tools button
            const viewToolsButton = document.getElementById('view-tools');
            if (viewToolsButton) {
                viewToolsButton.addEventListener('click', () => {
                    // Switch to API Tools tab
                    const apiToolsTab = document.getElementById('api-tools-tab');
                    if (apiToolsTab) {
                        apiToolsTab.click();
                    }
                });
            }
        }
        
        /**
         * Set up navigation buttons
         */
        function setupNavigationButtons() {
            // Step 1 to Step 2
            const nextToEndpointButton = document.getElementById('next-to-endpoint');
            if (nextToEndpointButton) {
                nextToEndpointButton.addEventListener('click', () => {
                    if (validateBasicInfo()) {
                        saveBasicInfo();
                        showStep('step-endpoint');
                    }
                });
            }
            
            // Step 2 to Step 1
            const backToBasicButton = document.getElementById('back-to-basic');
            if (backToBasicButton) {
                backToBasicButton.addEventListener('click', () => {
                    showStep('step-basic-info');
                });
            }
            
            // Step 2 to Step 3
            const nextToParametersButton = document.getElementById('next-to-parameters');
            if (nextToParametersButton) {
                nextToParametersButton.addEventListener('click', () => {
                    if (validateEndpoint()) {
                        saveEndpoint();
                        showStep('step-parameters');
                    }
                });
            }
            
            // Step 3 to Step 2
            const backToEndpointButton = document.getElementById('back-to-endpoint');
            if (backToEndpointButton) {
                backToEndpointButton.addEventListener('click', () => {
                    showStep('step-endpoint');
                });
            }
            
            // Step 3 to Step 4
            const nextToToolButton = document.getElementById('next-to-tool');
            if (nextToToolButton) {
                nextToToolButton.addEventListener('click', () => {
                    showStep('step-tool-info');
                });
            }
            
            // Step 4 to Step 3
            const backToParametersButton = document.getElementById('back-to-parameters');
            if (backToParametersButton) {
                backToParametersButton.addEventListener('click', () => {
                    showStep('step-parameters');
                });
            }
            
            // Step 4 to Step 5
            const nextToReviewButton = document.getElementById('next-to-review');
            if (nextToReviewButton) {
                nextToReviewButton.addEventListener('click', () => {
                    if (validateToolInfo()) {
                        saveToolInfo();
                        generatePreview();
                        showStep('step-review');
                    }
                });
            }
            
            // Step 5 to Step 4
            const backToToolButton = document.getElementById('back-to-tool');
            if (backToToolButton) {
                backToToolButton.addEventListener('click', () => {
                    showStep('step-tool-info');
                });
            }
            
            // AI Generate to Start
            const backToStartButton = document.getElementById('back-to-start');
            if (backToStartButton) {
                backToStartButton.addEventListener('click', () => {
                    resetForm();
                    hideAllSteps();
                });
            }
        }
        
        /**
         * Set up parameter form buttons
         */
        function setupParameterFormButtons() {
            // Add parameter button
            const addParameterButton = document.getElementById('add-parameter');
            if (addParameterButton) {
                addParameterButton.addEventListener('click', () => {
                    showParameterForm();
                });
            }
            
            // Cancel parameter button
            const cancelParameterButton = document.getElementById('cancel-parameter');
            if (cancelParameterButton) {
                cancelParameterButton.addEventListener('click', () => {
                    hideParameterForm();
                });
            }
            
            // Save parameter button
            const saveParameterButton = document.getElementById('save-parameter');
            if (saveParameterButton) {
                saveParameterButton.addEventListener('click', () => {
                    saveParameter();
                });
            }
        }
        
        /**
         * Show a specific step
         * @param {string} stepId - ID of the step to show
         */
        function showStep(stepId) {
            // Hide all steps
            const steps = document.querySelectorAll('.api-spec-step');
            steps.forEach(step => {
                step.classList.remove('active');
            });
            
            // Show the specified step
            const step = document.getElementById(stepId);
            if (step) {
                step.classList.add('active');
            }
            
            // Hide the action buttons when in a step
            const actionsContainer = document.querySelector('.api-spec-actions');
            if (actionsContainer) {
                actionsContainer.style.display = 'none';
            }
        }
        
        /**
         * Hide all steps and show action buttons
         */
        function hideAllSteps() {
            // Hide all steps
            const steps = document.querySelectorAll('.api-spec-step');
            steps.forEach(step => {
                step.classList.remove('active');
            });
            
            // Show the action buttons
            const actionsContainer = document.querySelector('.api-spec-actions');
            if (actionsContainer) {
                actionsContainer.style.display = 'flex';
                actionsContainer.style.justifyContent = 'space-between';
            }
        }
        
        /**
         * Reset the form
         */
        function resetForm() {
            // Reset state
            currentSpecInfo = null;
            currentToolInfo = null;
            currentEndpointIndex = 0;
            
            // Reset form fields
            document.getElementById('spec-title').value = '';
            document.getElementById('spec-description').value = '';
            document.getElementById('spec-version').value = '1.0.0';
            
            document.getElementById('endpoint-path').value = '';
            document.getElementById('endpoint-method').value = 'get';
            document.getElementById('endpoint-summary').value = '';
            document.getElementById('endpoint-description').value = '';
            
            document.getElementById('tool-name').value = '';
            document.getElementById('tool-description').value = '';
            document.getElementById('tool-endpoint').value = '';
            document.getElementById('tool-auth-type').value = 'bearer';
            document.getElementById('tool-auth-header').value = '';
            document.getElementById('custom-auth-header-group').style.display = 'none';
            
            document.getElementById('ai-description').value = '';
            
            // Reset parameters container
            const parametersContainer = document.getElementById('parameters-container');
            if (parametersContainer) {
                parametersContainer.innerHTML = '<div class="empty-state">No parameters defined. Click "Add Parameter" to create one.</div>';
            }
            
            // Reset preview
            document.getElementById('openapi-preview').textContent = '';
            document.getElementById('tool-preview').textContent = '';
        }
        
        /**
         * Validate basic information
         * @returns {boolean} Whether the basic information is valid
         */
        function validateBasicInfo() {
            const title = document.getElementById('spec-title').value.trim();
            
            if (!title) {
                alert('API title is required.');
                return false;
            }
            
            return true;
        }
        
        /**
         * Save basic information
         */
        function saveBasicInfo() {
            const title = document.getElementById('spec-title').value.trim();
            const description = document.getElementById('spec-description').value.trim();
            const version = document.getElementById('spec-version').value.trim();
            
            currentSpecInfo = {
                title: title,
                description: description,
                version: version,
                endpoints: []
            };
        }
        
        /**
         * Validate endpoint information
         * @returns {boolean} Whether the endpoint information is valid
         */
        function validateEndpoint() {
            const path = document.getElementById('endpoint-path').value.trim();
            
            if (!path) {
                alert('Endpoint path is required.');
                return false;
            }
            
            return true;
        }
        
        /**
         * Save endpoint information
         */
        function saveEndpoint() {
            const path = document.getElementById('endpoint-path').value.trim();
            const method = document.getElementById('endpoint-method').value;
            const summary = document.getElementById('endpoint-summary').value.trim();
            const description = document.getElementById('endpoint-description').value.trim();
            
            // Create endpoint object
            const endpoint = {
                path: path,
                method: method,
                summary: summary,
                description: description,
                parameters: []
            };
            
            // Add or update endpoint in the spec info
            if (currentSpecInfo.endpoints.length > currentEndpointIndex) {
                currentSpecInfo.endpoints[currentEndpointIndex] = endpoint;
            } else {
                currentSpecInfo.endpoints.push(endpoint);
            }
        }
        
        /**
         * Show parameter form
         * @param {number} index - Index of the parameter to edit, or -1 for a new parameter
         */
        function showParameterForm(index = -1) {
            const paramForm = document.getElementById('parameter-form');
            if (paramForm) {
                paramForm.style.display = 'block';
                
                // Reset form fields
                document.getElementById('param-name').value = '';
                document.getElementById('param-in').value = 'query';
                document.getElementById('param-type').value = 'string';
                document.getElementById('param-description').value = '';
                document.getElementById('param-required').checked = false;
                
                // If editing an existing parameter, fill the form
                if (index >= 0 && currentSpecInfo.endpoints[currentEndpointIndex].parameters[index]) {
                    const param = currentSpecInfo.endpoints[currentEndpointIndex].parameters[index];
                    
                    document.getElementById('param-name').value = param.name;
                    document.getElementById('param-in').value = param.in;
                    document.getElementById('param-type').value = param.schema.type;
                    document.getElementById('param-description').value = param.description;
                    document.getElementById('param-required').checked = param.required;
                    
                    // Store the index for updating
                    paramForm.dataset.index = index;
                } else {
                    // New parameter
                    paramForm.dataset.index = -1;
                }
            }
        }
        
        /**
         * Hide parameter form
         */
        function hideParameterForm() {
            const paramForm = document.getElementById('parameter-form');
            if (paramForm) {
                paramForm.style.display = 'none';
            }
        }
        
        /**
         * Save parameter
         */
        function saveParameter() {
            const paramForm = document.getElementById('parameter-form');
            const index = parseInt(paramForm.dataset.index);
            
            const name = document.getElementById('param-name').value.trim();
            const inValue = document.getElementById('param-in').value;
            const type = document.getElementById('param-type').value;
            const description = document.getElementById('param-description').value.trim();
            const required = document.getElementById('param-required').checked;
            
            if (!name) {
                alert('Parameter name is required.');
                return;
            }
            
            // Create parameter object
            const parameter = {
                name: name,
                in: inValue,
                description: description,
                required: required,
                schema: {
                    type: type
                }
            };
            
            // Add or update parameter
            if (index >= 0) {
                currentSpecInfo.endpoints[currentEndpointIndex].parameters[index] = parameter;
            } else {
                currentSpecInfo.endpoints[currentEndpointIndex].parameters.push(parameter);
            }
            
            // Hide the form
            hideParameterForm();
            
            // Render parameters
            renderParameters();
        }
        
        /**
         * Render parameters
         */
        function renderParameters() {
            const parametersContainer = document.getElementById('parameters-container');
            if (!parametersContainer) return;
            
            const parameters = currentSpecInfo.endpoints[currentEndpointIndex].parameters;
            
            if (parameters.length === 0) {
                parametersContainer.innerHTML = '<div class="empty-state">No parameters defined. Click "Add Parameter" to create one.</div>';
                return;
            }
            
            // Clear container
            parametersContainer.innerHTML = '';
            
            // Add each parameter
            parameters.forEach((param, index) => {
                const paramItem = document.createElement('div');
                paramItem.className = 'parameter-item';
                
                paramItem.innerHTML = `
                    <div class="parameter-info">
                        <div class="parameter-name">${param.name}</div>
                        <div class="parameter-details">
                            ${param.in} | ${param.schema.type} | ${param.required ? 'Required' : 'Optional'}
                            ${param.description ? `<br>${param.description}` : ''}
                        </div>
                    </div>
                    <div class="parameter-actions">
                        <button type="button" class="btn icon-btn edit-param" title="Edit parameter" data-index="${index}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn icon-btn delete-param" title="Delete parameter" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                parametersContainer.appendChild(paramItem);
            });
            
            // Add event listeners for edit and delete buttons
            parametersContainer.querySelectorAll('.edit-param').forEach(button => {
                button.addEventListener('click', () => {
                    const index = parseInt(button.dataset.index);
                    showParameterForm(index);
                });
            });
            
            parametersContainer.querySelectorAll('.delete-param').forEach(button => {
                button.addEventListener('click', () => {
                    const index = parseInt(button.dataset.index);
                    deleteParameter(index);
                });
            });
        }
        
        /**
         * Delete a parameter
         * @param {number} index - Index of the parameter to delete
         */
        function deleteParameter(index) {
            if (confirm('Are you sure you want to delete this parameter?')) {
                currentSpecInfo.endpoints[currentEndpointIndex].parameters.splice(index, 1);
                renderParameters();
            }
        }
        
        /**
         * Validate tool information
         * @returns {boolean} Whether the tool information is valid
         */
        function validateToolInfo() {
            const name = document.getElementById('tool-name').value.trim();
            const endpoint = document.getElementById('tool-endpoint').value.trim();
            
            if (!name) {
                alert('Tool name is required.');
                return false;
            }
            
            if (!/^[a-zA-Z0-9_]+$/.test(name)) {
                alert('Tool name must contain only alphanumeric characters and underscores.');
                return false;
            }
            
            if (!endpoint) {
                alert('API endpoint URL is required.');
                return false;
            }
            
            return true;
        }
        
        /**
         * Save tool information
         */
        function saveToolInfo() {
            const name = document.getElementById('tool-name').value.trim();
            const description = document.getElementById('tool-description').value.trim();
            const endpoint = document.getElementById('tool-endpoint').value.trim();
            const authType = document.getElementById('tool-auth-type').value;
            const authHeader = document.getElementById('tool-auth-header').value.trim();
            
            currentToolInfo = {
                name: name,
                description: description,
                endpoint: endpoint,
                authType: authType
            };
            
            if (authType === 'custom' && authHeader) {
                currentToolInfo.authHeader = authHeader;
            }
        }
        
        /**
         * Generate preview of OpenAPI spec and tool definition
         */
        function generatePreview() {
            if (!currentSpecInfo || !currentToolInfo) {
                return;
            }
            
            try {
                // Create API spec
                const apiSpec = window.ApiSpecService.createApiSpec(currentSpecInfo);
                
                // Convert to tool definition
                const toolDefinition = window.ApiSpecService.convertSpecToTool(apiSpec, currentToolInfo);
                
                // Update previews
                document.getElementById('openapi-preview').textContent = JSON.stringify(apiSpec, null, 2);
                document.getElementById('tool-preview').textContent = JSON.stringify(toolDefinition, null, 2);
            } catch (error) {
                console.error('Error generating preview:', error);
                alert(`Error generating preview: ${error.message}`);
            }
        }
        
        /**
         * Save API specification as a tool
         */
        function saveApiSpecification() {
            if (!currentSpecInfo || !currentToolInfo) {
                alert('Missing specification or tool information.');
                return;
            }
            
            try {
                // Create and save the tool
                const result = window.ApiSpecService.createAndSaveTool(currentSpecInfo, currentToolInfo);
                
                console.log('API specification saved as tool:', result);
                
                // Show success step
                showStep('step-success');
                
                // If ApiToolsManager exists, refresh the tools list
                if (window.ApiToolsManager) {
                    const apiToolsManager = document.querySelector('.api-tools-container');
                    if (apiToolsManager && apiToolsManager.renderApiToolsList) {
                        apiToolsManager.renderApiToolsList();
                    }
                }
            } catch (error) {
                console.error('Error saving API specification:', error);
                alert(`Error saving API specification: ${error.message}`);
            }
        }
        
        /**
         * Generate API specification from description
         */
        function generateFromDescription() {
            const description = document.getElementById('ai-description').value.trim();
            
            if (!description) {
                alert('Please provide a description of the API.');
                return;
            }
            
            try {
                // Generate tool definition from description
                const toolDefinition = window.ApiSpecService.generateToolFromDescription(description);
                
                // Fill the form with generated data
                document.getElementById('spec-title').value = toolDefinition.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                document.getElementById('spec-description').value = toolDefinition.description;
                
                document.getElementById('endpoint-path').value = '/api/' + toolDefinition.name.replace(/_/g, '/');
                document.getElementById('endpoint-method').value = toolDefinition.method.toLowerCase();
                document.getElementById('endpoint-summary').value = toolDefinition.description;
                
                document.getElementById('tool-name').value = toolDefinition.name;
                document.getElementById('tool-description').value = toolDefinition.description;
                document.getElementById('tool-endpoint').value = toolDefinition.endpoint;
                document.getElementById('tool-auth-type').value = toolDefinition.authType;
                
                if (toolDefinition.authType === 'custom' && toolDefinition.authHeader) {
                    document.getElementById('tool-auth-header').value = toolDefinition.authHeader;
                    document.getElementById('custom-auth-header-group').style.display = 'block';
                }
                
                // Create spec info and tool info
                saveBasicInfo();
                saveEndpoint();
                
                // Add parameters
                if (toolDefinition.parameters && toolDefinition.parameters.properties) {
                    const properties = toolDefinition.parameters.properties;
                    const required = toolDefinition.parameters.required || [];
                    
                    currentSpecInfo.endpoints[currentEndpointIndex].parameters = [];
                    
                    Object.keys(properties).forEach(propName => {
                        const prop = properties[propName];
                        
                        currentSpecInfo.endpoints[currentEndpointIndex].parameters.push({
                            name: propName,
                            in: 'query',
                            description: prop.description || '',
                            required: required.includes(propName),
                            schema: {
                                type: prop.type || 'string'
                            }
                        });
                    });
                }
                
                // Show the basic info step
                showStep('step-basic-info');
                
                console.log('Generated API specification from description:', {
                    specInfo: currentSpecInfo,
                    toolInfo: currentToolInfo
                });
            } catch (error) {
                console.error('Error generating API specification:', error);
                alert(`Error generating API specification: ${error.message}`);
            }
        }
        
        // Public API
        return {
            init,
            showStep,
            hideAllSteps
        };
    }
    
    // Public API
    return {
        createApiSpecManager: createApiSpecManager
    };
})();
