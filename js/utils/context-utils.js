/**
 * Context Usage Utilities
 * Handles context window estimation and usage calculations
 */

window.ContextUtils = (function() {
    
    // Cache for context size by model
    const contextSizeCache = new Map();
    
    // Cache for token estimates by content hash
    const tokenEstimateCache = new Map();
    const MAX_CACHE_SIZE = 1000;
    
    // Track the last model used to detect model changes
    let lastModelUsed = null;
    
    /**
     * Simple hash function for cache keys
     * @param {string} str - String to hash
     * @returns {number} - Hash value
     */
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
    
    /**
     * Get context window size for a model
     * @param {string} currentModel - Current model ID
     * @returns {number} - Context window size
     */
    function getContextSize(currentModel) {
        // Check cache first
        if (contextSizeCache.has(currentModel)) {
            return contextSizeCache.get(currentModel);
        }
        
        let contextSize = null;
        
        // Try to get context size from ModelInfoService
        if (window.ModelInfoService && typeof ModelInfoService.getContextSize === 'function') {
            contextSize = ModelInfoService.getContextSize(currentModel);
        }
        
        // If we couldn't get a context size from ModelInfoService.getContextSize,
        // try to get it directly from the contextWindowSizes object in ModelInfoService
        if (!contextSize && window.ModelInfoService && ModelInfoService.contextWindowSizes) {
            contextSize = ModelInfoService.contextWindowSizes[currentModel];
        }
        
        // If we still don't have a context size, default to 8192
        if (!contextSize) {
            contextSize = 8192;
        }
        
        // Cache the context size for this model
        contextSizeCache.set(currentModel, contextSize);
        
        return contextSize;
    }
    
    /**
     * Clear caches when model changes
     * @param {string} currentModel - Current model ID
     */
    function handleModelChange(currentModel) {
        if (lastModelUsed !== currentModel) {
            contextSizeCache.clear();
            lastModelUsed = currentModel;
        }
    }
    
    /**
     * Estimate token count based on character count
     * @param {Array} messages - Array of chat messages
     * @param {string} systemPrompt - System prompt content
     * @returns {Object} - Object containing character count and estimated tokens
     */
    function estimateTokens(messages, systemPrompt = '') {
        let totalChars = 0;
        
        // Add system prompt characters if provided
        if (systemPrompt) {
            totalChars += systemPrompt.length;
        }
        
        // Add message characters
        if (messages && messages.length > 0) {
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                if (message && message.content) {
                    totalChars += message.content.length;
                }
            }
        }
        
        // Create cache key from content hash
        const contentHash = simpleHash(systemPrompt + JSON.stringify(messages));
        
        // Check cache first
        if (tokenEstimateCache.has(contentHash)) {
            const cached = tokenEstimateCache.get(contentHash);
            return { totalChars, estimatedTokens: cached };
        }
        
        // Estimate tokens (4 chars per token is a rough approximation)
        const estimatedTokens = Math.ceil(totalChars / 4);
        
        // Cache the token estimate if cache isn't too large
        if (tokenEstimateCache.size < MAX_CACHE_SIZE) {
            tokenEstimateCache.set(contentHash, estimatedTokens);
        } else {
            // If cache is full, clear oldest entries
            const firstKey = tokenEstimateCache.keys().next().value;
            tokenEstimateCache.delete(firstKey);
            tokenEstimateCache.set(contentHash, estimatedTokens);
        }
        
        return { totalChars, estimatedTokens };
    }
    
    /**
     * Estimate context usage percentage
     * @param {Array} messages - Array of chat messages
     * @param {Object} modelInfo - Information about the current model (not currently used)
     * @param {string} currentModel - Current model ID
     * @param {string} systemPrompt - System prompt content
     * @returns {Object} - Object containing estimated tokens, context size, and usage percentage
     */
    function estimateContextUsage(messages, modelInfo, currentModel, systemPrompt = '') {
        // Handle model changes
        handleModelChange(currentModel);
        
        // Get context window size for the current model
        const contextSize = getContextSize(currentModel);
        
        // Estimate token count
        const { totalChars, estimatedTokens } = estimateTokens(messages, systemPrompt);
        
        // Calculate percentage
        const percentage = Math.min(Math.round((estimatedTokens / contextSize) * 100), 100);
        
        return {
            estimatedTokens,
            contextSize,
            percentage,
            totalChars
        };
    }
    
    /**
     * Update the context usage display
     * @param {HTMLElement} fillElement - Element for the usage fill bar
     * @param {HTMLElement} textElement - Element for the usage text
     * @param {number} percentage - Usage percentage (0-100)
     */
    function updateContextUsage(fillElement, textElement, percentage) {
        if (!fillElement || !textElement) {
            return;
        }
        
        // Update the fill width
        fillElement.style.width = `${percentage}%`;
        
        // Update the text
        textElement.textContent = `${percentage}%`;
        
        // Update color based on usage percentage (heatmap)
        let color;
        if (percentage < 30) {
            // Green for low usage
            color = '#10b981';
        } else if (percentage < 60) {
            // Yellow for medium usage
            color = '#f59e0b';
        } else if (percentage < 80) {
            // Orange for high usage
            color = '#f97316';
        } else {
            // Red for very high usage
            color = '#ef4444';
        }
        
        fillElement.style.backgroundColor = color;
    }
    
    /**
     * Clear all caches (useful for testing or memory management)
     */
    function clearCaches() {
        contextSizeCache.clear();
        tokenEstimateCache.clear();
        lastModelUsed = null;
    }
    
    /**
     * Get cache statistics (useful for debugging)
     * @returns {Object} - Cache statistics
     */
    function getCacheStats() {
        return {
            contextSizeCacheSize: contextSizeCache.size,
            tokenEstimateCacheSize: tokenEstimateCache.size,
            lastModelUsed
        };
    }
    
    // Public API
    return {
        estimateContextUsage,
        updateContextUsage,
        clearCaches,
        getCacheStats
    };
})();