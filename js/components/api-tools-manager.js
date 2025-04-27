/**
 * API Tools Manager Module
 * Handles tool-related functionality for the AIHackare application
 */

window.ApiToolsManager = (function() {
    /**
     * Create an API Tools Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} API Tools Manager instance
     */
    function createApiToolsManager(elements) {
        /**
         * Initialize the API tools manager
         */
        function init() {
            // Nothing to initialize at this point
            console.log('API Tools Manager initialized');
        }
        
        /**
         * Add tool calling setting to the settings form
         * @param {HTMLElement} settingsForm - The settings form element
         * @param {Function} addSystemMessage - Optional callback to add a system message
         */
        function addToolCallingSetting(settingsForm, addSystemMessage) {
            // Create a new form group for the tool calling setting
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            // Create a label for the experimental features section
            const sectionLabel = document.createElement('label');
            sectionLabel.textContent = 'Experimental Features';
            formGroup.appendChild(sectionLabel);
            
            // Create a container for the checkbox
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            // Create the checkbox input
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'enable-tool-calling';
            checkbox.checked = ApiToolsService.isToolCallingEnabled();
            
            // Create the label for the checkbox
            const checkboxLabel = document.createElement('label');
            checkboxLabel.htmlFor = 'enable-tool-calling';
            checkboxLabel.textContent = 'Enable tool calling (experimental)';
            
            // Add info icon with tooltip
            const infoIcon = document.createElement('span');
            infoIcon.className = 'info-icon';
            infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
            
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip';
            tooltip.textContent = 'Enables the API to call tools like math_addition_tool. This is an experimental feature and may not work with all models.';
            
            infoIcon.appendChild(tooltip);
            checkboxLabel.appendChild(infoIcon);
            
            // Assemble the checkbox group
            checkboxGroup.appendChild(checkbox);
            checkboxGroup.appendChild(checkboxLabel);
            
            // Add the checkbox group to the form group
            formGroup.appendChild(checkboxGroup);
            
            // Insert the form group before the form actions (save/cancel buttons)
            const formActions = settingsForm.querySelector('.form-actions');
            settingsForm.insertBefore(formGroup, formActions);
            
            // Add event listener to save the setting when the form is submitted
            settingsForm.addEventListener('submit', function() {
                ApiToolsService.setToolCallingEnabled(checkbox.checked, addSystemMessage);
            });
            
            // Also add a change event listener to show status message immediately when toggled
            checkbox.addEventListener('change', function() {
                // We don't save the setting here, just show the status message
                // The actual saving happens when the form is submitted
                if (addSystemMessage) {
                    if (checkbox.checked !== ApiToolsService.isToolCallingEnabled()) {
                        if (checkbox.checked) {
                            const tools = Object.keys(ApiToolsService.getRegisteredTools());
                            const toolsMessage = tools.length > 0 
                                ? `Available tools: ${tools.join(', ')}`
                                : 'No tools currently registered';
                            
                            addSystemMessage(`Tool calling will be activated when settings are saved. ${toolsMessage}`);
                        } else {
                            addSystemMessage('Tool calling will be deactivated when settings are saved.');
                        }
                    }
                }
            });
        }
        
        /**
         * Get tool definitions for API requests
         * @returns {Array} Array of tool definitions in OpenAI format
         */
        function getToolDefinitions() {
            return ApiToolsService.getToolDefinitions();
        }
        
        /**
         * Process tool calls from the API response
         * @param {Array} toolCalls - Array of tool calls from the API
         * @returns {Promise<Array>} Array of tool results
         */
        async function processToolCalls(toolCalls) {
            return ApiToolsService.processToolCalls(toolCalls);
        }
        
        // Public API
        return {
            init,
            addToolCallingSetting,
            getToolDefinitions,
            processToolCalls
        };
    }

    // Public API
    return {
        createApiToolsManager: createApiToolsManager
    };
})();
