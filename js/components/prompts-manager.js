/**
 * Prompts Manager Module
 * Handles prompt configurator functionality and system prompt management for the AIHackare application
 */

window.PromptsManager = (function() {
    /**
     * Create a Prompts Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Prompts Manager instance
     */
    function createPromptsManager(elements) {
        // Current prompt being edited
        let currentPrompt = null;
        
        // Elements for prompt token usage bar
        let promptsUsageFill;
        let promptsUsageText;
        
        /**
         * Initialize the prompts manager
         */
        function init() {
            // Set up event listeners
            if (elements.promptsBtn) {
                elements.promptsBtn.addEventListener('click', showPromptsModal);
            }
            
            if (elements.closePromptsModal) {
                elements.closePromptsModal.addEventListener('click', hidePromptsModal);
            }
            
            if (elements.copySystemPromptBtn) {
                elements.copySystemPromptBtn.addEventListener('click', copySystemPromptToClipboard);
            }
            
            // Initialize token monitoring
            PromptsTokenManager.initializeTokenMonitoring(() => {
                updatePromptsTokenUsage();
            });
            
            // Apply selected prompts as system prompt on initialization
            PromptsService.applySelectedPromptsAsSystem();
            
            // Set up list manager callbacks
            PromptsListManager.setCallbacks({
                updateAfterSelectionChange: updateAfterSelectionChange,
                reloadPromptsList: loadPromptsList,
                setCurrentPrompt: setCurrentPrompt
            });
        }
        
        /**
         * Estimate token usage for selected prompts
         * @returns {number} - Percentage of context window used
         */
        function estimatePromptsTokenUsage() {
            return PromptsTokenManager.estimatePromptsTokenUsage();
        }
        
        /**
         * Update the prompts token usage bar
         */
        function updatePromptsTokenUsage() {
            PromptsTokenManager.updatePromptsTokenUsage(promptsUsageFill, promptsUsageText);
        }
        
        /**
         * Update main context usage display
         */
        function updateMainContextUsage() {
            PromptsTokenManager.updateMainContextUsage();
        }
        
        /**
         * Show the prompts modal
         */
        function showPromptsModal() {
            // Load prompts
            loadPromptsList();
            
            // Reset current prompt
            currentPrompt = null;
            
            // Show the modal
            if (elements.promptsModal) {
                elements.promptsModal.classList.add('active');
                
                // Update the main context usage display
                updateMainContextUsage();
            }
        }
        
        /**
         * Hide the prompts modal
         */
        function hidePromptsModal() {
            if (elements.promptsModal) {
                elements.promptsModal.classList.remove('active');
            }
            
            // Clear current prompt
            currentPrompt = null;
        }
        
        /**
         * Load the prompts list
         */
        function loadPromptsList() {
            const usageElements = PromptsListManager.loadPromptsList(elements, currentPrompt);
            promptsUsageFill = usageElements.promptsUsageFill;
            promptsUsageText = usageElements.promptsUsageText;
            
            // Update system prompt in settings
            const systemPrompt = StorageService.getSystemPrompt();
            if (elements.systemPromptInput && systemPrompt) {
                elements.systemPromptInput.value = systemPrompt;
            }
            
            // Update token usage
            updatePromptsTokenUsage();
        }
        
        /**
         * Set the current prompt being edited
         * @param {Object} prompt - Prompt object
         */
        function setCurrentPrompt(prompt) {
            currentPrompt = prompt;
            loadPromptsList(); // Reload to update active state
        }
        
        /**
         * Update after selection change
         */
        function updateAfterSelectionChange() {
            // Apply selected prompts as system prompt
            PromptsService.applySelectedPromptsAsSystem();
            
            // Update token usage
            updatePromptsTokenUsage();
            
            // Update system prompt in settings
            const systemPrompt = StorageService.getSystemPrompt();
            if (elements.systemPromptInput && systemPrompt) {
                elements.systemPromptInput.value = systemPrompt;
            }
            
            // Publish event for other components
            if (window.UIUtils && window.UIUtils.EventBus) {
                window.UIUtils.EventBus.publish('promptSelectionChanged', {});
            }
        }
        
        /**
         * Copy system prompt to clipboard
         */
        function copySystemPromptToClipboard() {
            const systemPrompt = StorageService.getSystemPrompt();
            if (systemPrompt) {
                if (window.ClipboardUtils) {
                    window.ClipboardUtils.copyToClipboard(systemPrompt, 'System prompt copied to clipboard!');
                } else {
                    // Fallback method
                    navigator.clipboard.writeText(systemPrompt).then(() => {
                        // Show success message
                        if (window.UIUtils && window.UIUtils.showToast) {
                            window.UIUtils.showToast('System prompt copied to clipboard!', 'success');
                        }
                    }).catch(err => {
                        console.error('Failed to copy system prompt: ', err);
                        if (window.UIUtils && window.UIUtils.showToast) {
                            window.UIUtils.showToast('Failed to copy system prompt', 'error');
                        }
                    });
                }
            } else {
                if (window.UIUtils && window.UIUtils.showToast) {
                    window.UIUtils.showToast('No system prompt to copy', 'warning');
                }
            }
        }
        
        /**
         * Get the currently selected prompts
         * @returns {Array} Array of selected prompt objects
         */
        function getSelectedPrompts() {
            const selectedIds = PromptsService.getSelectedPromptIds();
            const allPrompts = PromptsService.getPrompts();
            return allPrompts.filter(prompt => selectedIds.includes(prompt.id));
        }
        
        /**
         * Get current prompt token usage information
         * @returns {Object} Usage information
         */
        function getCurrentTokenUsage() {
            return PromptsTokenManager.getCurrentPromptsUsage();
        }
        
        /**
         * Refresh prompts display
         */
        function refresh() {
            if (elements.promptsModal && elements.promptsModal.classList.contains('active')) {
                loadPromptsList();
            }
        }
        
        // Public API
        return {
            init,
            estimatePromptsTokenUsage,
            updatePromptsTokenUsage,
            updateMainContextUsage,
            showPromptsModal,
            hidePromptsModal,
            loadPromptsList,
            setCurrentPrompt,
            updateAfterSelectionChange,
            copySystemPromptToClipboard,
            getSelectedPrompts,
            getCurrentTokenUsage,
            refresh
        };
    }
    
    // Public API
    return {
        createPromptsManager
    };
})();