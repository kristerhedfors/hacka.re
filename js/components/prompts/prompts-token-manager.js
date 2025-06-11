/**
 * PromptsTokenManager - Handles token usage calculations and display for prompts
 */
function createPromptsTokenManager() {
    
    /**
     * Estimate token usage for selected prompts
     * @returns {number} - Percentage of context window used
     */
    function estimatePromptsTokenUsage() {
        const currentModel = StorageService.getModel();
        const usageInfo = ContextUsageService.getCurrentPromptsUsage(currentModel);
        return usageInfo.percentage;
    }
    
    /**
     * Update the prompts token usage bar
     * @param {HTMLElement} promptsUsageFill - Usage fill element
     * @param {HTMLElement} promptsUsageText - Usage text element
     */
    function updatePromptsTokenUsage(promptsUsageFill, promptsUsageText) {
        if (!promptsUsageFill || !promptsUsageText) return;
        
        // Get token usage information from ContextUsageService
        const currentModel = StorageService.getModel();
        const usageInfo = ContextUsageService.getCurrentPromptsUsage(currentModel);
        
        // Update the percentage display
        ContextUsageService.updateUsageDisplay(promptsUsageFill, promptsUsageText, usageInfo.percentage);
        
        // Update the token count display
        const promptsUsageTokens = document.querySelector('.prompts-usage-tokens');
        if (promptsUsageTokens) {
            promptsUsageTokens.textContent = `${usageInfo.tokens}/${usageInfo.contextSize} tokens`;
        }
    }
    
    /**
     * Update main context usage display
     */
    function updateMainContextUsage() {
        if (window.UIUtils && window.UIUtils.EventBus) {
            window.UIUtils.EventBus.emit('requestContextUpdate', {});
        }
    }
    
    /**
     * Get current prompts usage information
     * @returns {Object} Usage information object
     */
    function getCurrentPromptsUsage() {
        const currentModel = StorageService.getModel();
        return ContextUsageService.getCurrentPromptsUsage(currentModel);
    }
    
    /**
     * Initialize token usage monitoring
     * @param {Function} updateCallback - Callback for when updates occur
     */
    function initializeTokenMonitoring(updateCallback) {
        // Subscribe to system prompt updates for context usage updates
        if (window.UIUtils && window.UIUtils.EventBus) {
            window.UIUtils.EventBus.subscribe('systemPromptUpdated', (data) => {
                if (updateCallback) updateCallback();
            });
            
            window.UIUtils.EventBus.subscribe('promptSelectionChanged', () => {
                if (updateCallback) updateCallback();
            });
        }
    }
    
    return {
        estimatePromptsTokenUsage,
        updatePromptsTokenUsage,
        updateMainContextUsage,
        getCurrentPromptsUsage,
        initializeTokenMonitoring
    };
}

window.PromptsTokenManager = createPromptsTokenManager();