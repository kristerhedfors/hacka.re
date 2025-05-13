/**
 * Tool Calling Manager Module
 * Handles tool calling settings for the AIHackare application
 */

window.ToolCallingManager = (function() {
    /**
     * Create a Tool Calling Manager instance
     * @returns {Object} Tool Calling Manager instance
     */
    function createToolCallingManager() {
        /**
         * Add tool calling settings to settings form
         * @param {HTMLElement} settingsForm - The settings form element
         * @param {Function} addSystemMessage - Function to add a system message to the chat
         */
        function addToolCallingSetting(settingsForm, addSystemMessage) {
            if (!settingsForm) return;
            
            // Create tool calling checkbox group
            const toolCallingGroup = document.createElement('div');
            toolCallingGroup.className = 'form-group';
            
            // Add heading
            const heading = document.createElement('h3');
            heading.textContent = 'Tool Calling';
            toolCallingGroup.appendChild(heading);
            
            // Create API tools checkbox
            const apiToolsCheckbox = document.createElement('div');
            apiToolsCheckbox.className = 'checkbox-group';
            
            const apiCheckbox = document.createElement('input');
            apiCheckbox.type = 'checkbox';
            apiCheckbox.id = 'enable-tool-calling';
            apiCheckbox.checked = ApiToolsService.isToolCallingEnabled();
            
            const apiLabel = document.createElement('label');
            apiLabel.htmlFor = 'enable-tool-calling';
            apiLabel.textContent = 'Enable API tool calling';
            
            // Add tooltip for API tools
            const apiTooltip = document.createElement('span');
            apiTooltip.className = 'info-icon';
            apiTooltip.innerHTML = '<i class="fas fa-info-circle"></i>';
            
            const apiTooltipText = document.createElement('span');
            apiTooltipText.className = 'tooltip';
            apiTooltipText.textContent = 'Enable built-in API tool calling for models that support it. This allows the AI to call predefined tools to perform actions.';
            
            apiTooltip.appendChild(apiTooltipText);
            apiLabel.appendChild(apiTooltip);
            
            // Add event listener for API tools
            apiCheckbox.addEventListener('change', () => {
                ApiToolsService.setToolCallingEnabled(apiCheckbox.checked, addSystemMessage);
            });
            
            // Assemble API checkbox group
            apiToolsCheckbox.appendChild(apiCheckbox);
            apiToolsCheckbox.appendChild(apiLabel);
            
            // Create function tools checkbox
            const functionToolsCheckbox = document.createElement('div');
            functionToolsCheckbox.className = 'checkbox-group';
            
            const functionCheckbox = document.createElement('input');
            functionCheckbox.type = 'checkbox';
            functionCheckbox.id = 'enable-function-tools';
            functionCheckbox.checked = FunctionToolsService.isFunctionToolsEnabled();
            
            const functionLabel = document.createElement('label');
            functionLabel.htmlFor = 'enable-function-tools';
            functionLabel.textContent = 'Enable JavaScript function calling';
            
            // Add tooltip for function tools
            const functionTooltip = document.createElement('span');
            functionTooltip.className = 'info-icon';
            functionTooltip.innerHTML = '<i class="fas fa-info-circle"></i>';
            
            const functionTooltipText = document.createElement('span');
            functionTooltipText.className = 'tooltip';
            functionTooltipText.textContent = 'Enable JavaScript function calling for models that support it. This allows the AI to call your custom JavaScript functions.';
            
            functionTooltip.appendChild(functionTooltipText);
            functionLabel.appendChild(functionTooltip);
            
            // Add event listener for function tools
            functionCheckbox.addEventListener('change', () => {
                FunctionToolsService.setFunctionToolsEnabled(functionCheckbox.checked, addSystemMessage);
            });
            
            // Assemble function checkbox group
            functionToolsCheckbox.appendChild(functionCheckbox);
            functionToolsCheckbox.appendChild(functionLabel);
            
            // Add to form group
            toolCallingGroup.appendChild(apiToolsCheckbox);
            toolCallingGroup.appendChild(functionToolsCheckbox);
            
            // Add to settings form
            settingsForm.insertBefore(toolCallingGroup, settingsForm.querySelector('.form-actions'));
        }
        
        // Public API
        return {
            addToolCallingSetting
        };
    }

    // Public API
    return {
        createToolCallingManager
    };
})();
