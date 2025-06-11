/**
 * Context Usage Display Module
 * Handles token counting and usage visualization
 */

window.ContextUsageDisplay = (function() {
    /**
     * Create a Context Usage Display instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Context Usage Display instance
     */
    function createContextUsageDisplay(elements) {
        /**
         * Update the context usage display
         * @param {number} percentage - Usage percentage (0-100)
         * @param {number} [estimatedTokens] - Estimated token count
         * @param {number} [contextSize] - Context window size
         */
        function updateContextUsage(percentage, estimatedTokens, contextSize) {
            console.log("ContextUsageDisplay.updateContextUsage called with percentage:", percentage);
            console.log("- estimatedTokens:", estimatedTokens);
            console.log("- contextSize:", contextSize);
            console.log("elements.usageFill:", elements.usageFill);
            console.log("elements.usageText:", elements.usageText);
            
            // Store the original model name before any updates to detect if it gets overwritten
            let originalModelName = null;
            if (elements.modelNameDisplay) {
                originalModelName = elements.modelNameDisplay.textContent;
            }
            
            // Update the usage bar and percentage text
            UIUtils.updateContextUsage(elements.usageFill, elements.usageText, percentage);
            
            // Update the context window display if we have a model context element
            if (elements.modelContextElement && estimatedTokens !== undefined) {
                // If we have a context size, show tokens out of context size
                if (contextSize) {
                    elements.modelContextElement.textContent = `${estimatedTokens.toLocaleString()} / ${contextSize.toLocaleString()} tokens`;
                } else {
                    // Otherwise just show the token count
                    elements.modelContextElement.textContent = `${estimatedTokens.toLocaleString()} tokens`;
                }
            }
            
            // Fix for model name display bug: ensure model name hasn't been overwritten by context updates
            if (elements.modelNameDisplay && originalModelName) {
                const currentText = elements.modelNameDisplay.textContent;
                
                // If the model name was overwritten with a number (like percentage), restore it
                if (/^\d+$/.test(currentText) || currentText !== originalModelName) {
                    console.log(`Model name was overwritten with "${currentText}", restoring to "${originalModelName}"`);
                    elements.modelNameDisplay.textContent = originalModelName;
                    
                    // If we have access to the stored model, use its display name instead
                    if (window.StorageService && window.ModelInfoService) {
                        const storedModel = window.StorageService.getModel();
                        if (storedModel) {
                            const expectedDisplayName = window.ModelInfoService.getDisplayName(storedModel);
                            elements.modelNameDisplay.textContent = expectedDisplayName;
                        }
                    }
                }
            }
        }
        
        /**
         * Clear the context usage display
         */
        function clearContextUsage() {
            updateContextUsage(0);
            
            if (elements.modelContextElement) {
                elements.modelContextElement.textContent = '';
            }
        }
        
        // Public API
        return {
            updateContextUsage,
            clearContextUsage
        };
    }
    
    // Public API
    return {
        createContextUsageDisplay: createContextUsageDisplay
    };
})();