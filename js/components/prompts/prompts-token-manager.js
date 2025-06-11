/**
 * PromptsTokenManager - Handles token usage calculations and display for prompts
 */
function createPromptsTokenManager() {
    // Cache for token usage calculations
    let tokenUsageCache = null;
    let cacheTimestamp = 0;
    const TOKEN_CACHE_TTL = 2000; // 2 seconds TTL for token calculations
    
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
     * Update the prompts token usage bar with caching
     * @param {HTMLElement} promptsUsageFill - Usage fill element
     * @param {HTMLElement} promptsUsageText - Usage text element
     */
    function updatePromptsTokenUsage(promptsUsageFill, promptsUsageText) {
        if (!promptsUsageFill || !promptsUsageText) return;
        
        const now = Date.now();
        const currentModel = StorageService.getModel();
        
        // Check if cache is valid for this model
        let usageInfo;
        if (tokenUsageCache && 
            tokenUsageCache.model === currentModel && 
            (now - cacheTimestamp) < TOKEN_CACHE_TTL) {
            usageInfo = tokenUsageCache.usageInfo;
        } else {
            // Cache miss - calculate token usage
            usageInfo = ContextUsageService.getCurrentPromptsUsage(currentModel);
            
            // Update cache
            tokenUsageCache = {
                model: currentModel,
                usageInfo: usageInfo
            };
            cacheTimestamp = now;
        }
        
        // Update the percentage display
        ContextUsageService.updateUsageDisplay(promptsUsageFill, promptsUsageText, usageInfo.percentage);
        
        // Update the token count display
        const promptsUsageTokens = document.querySelector('.prompts-usage-tokens');
        if (promptsUsageTokens) {
            promptsUsageTokens.textContent = `${usageInfo.tokens.toLocaleString()} / ${usageInfo.contextSize.toLocaleString()} tokens`;
        }
    }
    
    /**
     * Clear the token usage cache
     */
    function clearTokenCache() {
        tokenUsageCache = null;
        cacheTimestamp = 0;
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
                clearTokenCache(); // Invalidate cache when system prompt changes
                if (updateCallback) updateCallback();
            });
            
            window.UIUtils.EventBus.subscribe('promptSelectionChanged', () => {
                clearTokenCache(); // Invalidate cache when selection changes
                if (updateCallback) updateCallback();
            });
        }
    }
    
    return {
        estimatePromptsTokenUsage,
        updatePromptsTokenUsage,
        updateMainContextUsage,
        getCurrentPromptsUsage,
        initializeTokenMonitoring,
        clearTokenCache
    };
}

window.PromptsTokenManager = createPromptsTokenManager();