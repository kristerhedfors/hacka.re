/**
 * Context Usage Service
 * Centralized service for token estimation and context window management
 * Eliminates duplicate token calculation logic across components
 */

window.ContextUsageService = (function() {
    // Cache for context size by model
    const contextSizeCache = {};
    
    // Track the last model used to detect model changes
    let lastModelUsed = null;
    
    // Cache for token estimates by content length
    const tokenEstimateCache = {};
    
    /**
     * Estimate token count based on character count
     * Uses the standard approximation of 4 characters per token
     * @param {string} content - Content to estimate tokens for
     * @returns {number} Estimated token count
     */
    function estimateTokenCount(content) {
        if (!content) return 0;
        
        const contentLength = content.length;
        
        // Check cache first
        if (tokenEstimateCache[contentLength]) {
            return tokenEstimateCache[contentLength];
        }
        
        // Estimate tokens (4 chars per token is a rough approximation)
        const estimatedTokens = Math.ceil(contentLength / 4);
        
        // Cache the result
        tokenEstimateCache[contentLength] = estimatedTokens;
        
        return estimatedTokens;
    }
    
    /**
     * Get context window size for a model
     * @param {string} model - Model identifier
     * @returns {number} Context window size in tokens
     */
    function getContextWindowSize(model) {
        // Check if the model has changed since last call
        if (lastModelUsed !== model) {
            console.log(`Model changed from ${lastModelUsed} to ${model}, clearing context size cache`);
            // Clear the cache when the model changes
            Object.keys(contextSizeCache).forEach(key => {
                delete contextSizeCache[key];
            });
            // Update the last model used
            lastModelUsed = model;
        }
        
        // Get context window size for the current model (use cache if available)
        let contextSize = contextSizeCache[model];
        
        if (!contextSize) {
            // Try to get context size from ModelInfoService
            if (window.ModelInfoService && typeof ModelInfoService.getContextSize === 'function') {
                contextSize = ModelInfoService.getContextSize(model);
                console.log(`Got context size ${contextSize} for model ${model} from ModelInfoService.getContextSize`);
            }
            
            // Default to 8K if not specified
            if (!contextSize) {
                contextSize = 8192;
                console.log(`No context size found for model ${model}, defaulting to ${contextSize}`);
            }
            
            // Cache the context size
            contextSizeCache[model] = contextSize;
        }
        
        return contextSize;
    }
    
    /**
     * Calculate context usage for prompts
     * @param {Array} selectedPrompts - Array of selected prompt objects
     * @param {string} currentModel - Current model identifier
     * @returns {Object} Usage information with tokens, contextSize, and percentage
     */
    function calculatePromptsUsage(selectedPrompts, currentModel) {
        if (!selectedPrompts || selectedPrompts.length === 0) {
            return {
                tokens: 0,
                contextSize: getContextWindowSize(currentModel),
                percentage: 0
            };
        }
        
        // Combine all selected prompts content
        const combinedContent = selectedPrompts
            .map(prompt => {
                // For Function Library prompt, ensure we get the latest content
                if (prompt.id === 'function-library' && 
                    window.FunctionLibraryPrompt && 
                    typeof window.FunctionLibraryPrompt.content === 'function') {
                    return window.FunctionLibraryPrompt.content();
                }
                return prompt.content || '';
            })
            .join('\n\n---\n\n');
        
        const tokens = estimateTokenCount(combinedContent);
        const contextSize = getContextWindowSize(currentModel);
        const percentage = Math.min(Math.round((tokens / contextSize) * 100), 100);
        
        return {
            tokens,
            contextSize,
            percentage,
            content: combinedContent
        };
    }
    
    /**
     * Calculate complete context usage including messages and system prompt
     * @param {Array} messages - Array of chat messages
     * @param {string} systemPrompt - System prompt content
     * @param {string} currentModel - Current model identifier
     * @returns {Object} Complete usage information
     */
    function calculateCompleteUsage(messages, systemPrompt, currentModel) {
        // Calculate system prompt tokens
        const systemTokens = estimateTokenCount(systemPrompt);
        
        // Calculate message tokens
        let messageTokens = 0;
        if (messages && messages.length > 0) {
            const messageContent = messages
                .map(msg => msg.content || '')
                .join('\n');
            messageTokens = estimateTokenCount(messageContent);
        }
        
        const totalTokens = systemTokens + messageTokens;
        const contextSize = getContextWindowSize(currentModel);
        const percentage = Math.min(Math.round((totalTokens / contextSize) * 100), 100);
        
        return {
            totalTokens,
            systemTokens,
            messageTokens,
            contextSize,
            percentage
        };
    }
    
    /**
     * Get all selected prompts from both services
     * @returns {Array} Combined array of selected prompts
     */
    function getAllSelectedPrompts() {
        const selectedPrompts = window.PromptsService ? 
            window.PromptsService.getSelectedPrompts() : [];
        const selectedDefaultPrompts = window.DefaultPromptsService ? 
            window.DefaultPromptsService.getSelectedDefaultPrompts() : [];
        
        return [...selectedDefaultPrompts, ...selectedPrompts];
    }
    
    /**
     * Calculate current prompts usage with all selected prompts
     * @param {string} currentModel - Current model identifier  
     * @returns {Object} Current prompts usage information
     */
    function getCurrentPromptsUsage(currentModel) {
        const allSelectedPrompts = getAllSelectedPrompts();
        return calculatePromptsUsage(allSelectedPrompts, currentModel);
    }
    
    /**
     * Update UI elements with context usage information
     * @param {HTMLElement} fillElement - Progress bar fill element
     * @param {HTMLElement} textElement - Percentage text element
     * @param {number} percentage - Usage percentage
     */
    function updateUsageDisplay(fillElement, textElement, percentage) {
        if (!fillElement || !textElement) return;
        
        // Update the percentage display
        if (window.UIUtils && typeof UIUtils.updateContextUsage === 'function') {
            UIUtils.updateContextUsage(fillElement, textElement, percentage);
        } else {
            // Fallback implementation
            fillElement.style.width = `${percentage}%`;
            textElement.textContent = `${percentage}%`;
            
            // Set color based on usage
            let color;
            if (percentage < 70) {
                color = '#22c55e'; // Green for low usage
            } else if (percentage < 85) {
                color = '#f59e0b'; // Yellow for medium usage
            } else {
                color = '#ef4444'; // Red for high usage
            }
            fillElement.style.backgroundColor = color;
        }
    }
    
    /**
     * Clear all caches (useful for testing or memory management)
     */
    function clearCaches() {
        Object.keys(contextSizeCache).forEach(key => {
            delete contextSizeCache[key];
        });
        Object.keys(tokenEstimateCache).forEach(key => {
            delete tokenEstimateCache[key];
        });
        lastModelUsed = null;
        console.log('ContextUsageService caches cleared');
    }
    
    // Public API
    return {
        estimateTokenCount,
        getContextWindowSize,
        calculatePromptsUsage,
        calculateCompleteUsage,
        getAllSelectedPrompts,
        getCurrentPromptsUsage,
        updateUsageDisplay,
        clearCaches
    };
})();