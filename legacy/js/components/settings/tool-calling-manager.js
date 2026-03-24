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
            
            // Create tool calling info group
            const toolCallingGroup = document.createElement('div');
            toolCallingGroup.className = 'form-group';
            
            // Add heading
            const heading = document.createElement('h3');
            heading.textContent = 'Function Calling';
            toolCallingGroup.appendChild(heading);
            
            // Create info text
            const infoText = document.createElement('p');
            infoText.textContent = 'Function calling is controlled through the function calling modal. Functions that are enabled in the function modal will be available for the AI to use.';
            infoText.style.marginBottom = '10px';
            toolCallingGroup.appendChild(infoText);
            
            // Create button to open function modal
            const openFunctionModalBtn = document.createElement('button');
            openFunctionModalBtn.type = 'button';
            openFunctionModalBtn.className = 'btn';
            openFunctionModalBtn.textContent = 'Manage Functions';
            openFunctionModalBtn.addEventListener('click', () => {
                // Close settings modal
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal) {
                    settingsModal.classList.remove('active');
                }
                
                // Open function modal
                const functionModal = document.getElementById('function-modal');
                if (functionModal) {
                    functionModal.classList.add('active');
                }
            });
            toolCallingGroup.appendChild(openFunctionModalBtn);
            
            // Add to settings form
            settingsForm.insertBefore(toolCallingGroup, settingsForm.querySelector('.form-actions'));
            
            // Ensure tool calling is enabled by default
            ApiToolsService.setToolCallingEnabled(true);
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
