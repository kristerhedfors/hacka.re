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