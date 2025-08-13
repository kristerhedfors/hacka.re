/**
 * System Prompt Manager Module
 * Handles system prompt-related functionality for the AIHackare application
 * Works with the Prompts Manager to display and manage the system prompt
 */

window.SystemPromptManager = (function() {
    /**
     * Create a System Prompt Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} System Prompt Manager instance
     */
    function createSystemPromptManager(elements) {
        // System prompt state
        let systemPrompt = null;
        
        /**
         * Initialize the system prompt manager
         */
        function init() {
            // Load saved system prompt or use default
            systemPrompt = StorageService.getSystemPrompt();
            
            // If no system prompt is set, use the default one
            if (!systemPrompt) {
                loadDefaultSystemPrompt();
            } else {
                // Update main context usage display if aiHackare is available
                if (window.aiHackare && window.aiHackare.chatManager) {
                    window.aiHackare.chatManager.estimateContextUsage(
                        window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                        window.aiHackare.settingsManager.getCurrentModel()
                    );
                }
            }
            
            // Set up event listener for open prompts config button (prompt library link)
            if (elements.openPromptsConfigBtn) {
                elements.openPromptsConfigBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openPromptsConfigurator();
                });
            }
            
            // Initialize debug manager with hierarchical controls
            if (window.DebugManager) {
                const debugManager = DebugManager.createDebugManager(elements);
                debugManager.init();
            } else {
                // Fallback to simple debug checkbox if DebugManager is not available
                addDebugModeCheckbox();
            }
        }
        
        /**
         * Add debug mode checkbox to the settings form
         */
        function addDebugModeCheckbox() {
            // Create the debug mode checkbox container
            const debugModeContainer = document.createElement('div');
            debugModeContainer.className = 'form-group';
            debugModeContainer.style.marginTop = '10px';
            
            // Create the checkbox group div to keep checkbox and label on same line
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            // Create the checkbox input
            const debugModeCheckbox = document.createElement('input');
            debugModeCheckbox.type = 'checkbox';
            debugModeCheckbox.id = 'debug-mode';
            debugModeCheckbox.checked = DebugService.getDebugMode();
            
            // Create the label
            const debugModeLabel = document.createElement('label');
            debugModeLabel.htmlFor = 'debug-mode';
            debugModeLabel.textContent = 'Debug mode';
            
            // Add event listener to the checkbox
            debugModeCheckbox.addEventListener('change', function() {
                DebugService.setDebugMode(this.checked);
                DebugService.log('Debug mode ' + (this.checked ? 'enabled' : 'disabled'));
            });
            
            // Append elements to the checkbox group
            checkboxGroup.appendChild(debugModeCheckbox);
            checkboxGroup.appendChild(debugModeLabel);
            
            // Append checkbox group to the container
            debugModeContainer.appendChild(checkboxGroup);
            
            // Find the system prompt section to insert after
            const systemPromptSection = elements.openPromptsConfigBtn.closest('.form-group');
            if (systemPromptSection && systemPromptSection.parentNode) {
                // Insert the debug mode container after the system prompt section
                systemPromptSection.parentNode.insertBefore(debugModeContainer, systemPromptSection.nextSibling);
            }
        }
        
        
        /**
         * Open the prompts configurator
         */
        function openPromptsConfigurator() {
            // Hide the settings modal
            if (elements.settingsModal) {
                elements.settingsModal.classList.remove('active');
            }
            
            // Show the prompts modal
            if (elements.promptsModal) {
                elements.promptsModal.classList.add('active');
            }
        }
        
        /**
         * Load the default system prompt
         */
        function loadDefaultSystemPrompt() {
            // Set empty default prompt
            const defaultPrompt = '';

            // Set the system prompt
            systemPrompt = defaultPrompt;
            
            // Save it to storage so it persists
            StorageService.saveSystemPrompt(defaultPrompt);
            
            // Update the system prompt input if it exists
            if (elements.systemPromptInput) {
                elements.systemPromptInput.value = defaultPrompt;
            }
            
            // Update main context usage display if aiHackare is available
            if (window.aiHackare && window.aiHackare.chatManager) {
                window.aiHackare.chatManager.estimateContextUsage(
                    window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                    window.aiHackare.settingsManager.getCurrentModel()
                );
            }
            
            console.log('Empty default system prompt loaded successfully');
        }
        
        /**
         * Get the current system prompt
         * @returns {string} Current system prompt
         */
        function getSystemPrompt() {
            // Always get the system prompt from storage to ensure we have the latest value
            // This is especially important when the namespace changes due to title/subtitle changes
            return StorageService.getSystemPrompt();
        }
        
        /**
         * Save the system prompt
         * @param {string} prompt - The system prompt to save
         */
        function saveSystemPrompt(prompt) {
            StorageService.saveSystemPrompt(prompt);
            systemPrompt = prompt;
            
            // Update main context usage display if aiHackare is available
            if (window.aiHackare && window.aiHackare.chatManager) {
                window.aiHackare.chatManager.estimateContextUsage(
                    window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                    window.aiHackare.settingsManager.getCurrentModel()
                );
            }
        }
        
        // Public API
        return {
            init,
            loadDefaultSystemPrompt,
            getSystemPrompt,
            saveSystemPrompt
        };
    }

    // Public API
    return {
        createSystemPromptManager
    };
})();
