/**
 * Model Compatibility Utilities
 * Handles differences in API parameters between model versions
 */

window.ModelCompatibility = (function() {
    
    // Models that require max_completion_tokens instead of max_tokens
    // Based on OpenAI's API changes for newer models
    const MODELS_REQUIRING_MAX_COMPLETION_TOKENS = [
        'gpt-5-nano',
        'gpt-5-nano-2025-08-07',
        'gpt-5-mini',
        'gpt-5-mini-2025-08-07',
        'gpt-5',
        'gpt-5-2025-08-07',
        'gpt-5-chat-latest',
        // Add future models here as they're discovered
    ];
    
    /**
     * Check if a model requires max_completion_tokens parameter
     * @param {string} model - Model name
     * @returns {boolean} True if model needs max_completion_tokens
     */
    function requiresMaxCompletionTokens(model) {
        if (!model) return false;
        
        // Check exact matches
        if (MODELS_REQUIRING_MAX_COMPLETION_TOKENS.includes(model)) {
            return true;
        }
        
        // Check for gpt-5 family models (future-proofing)
        if (model.startsWith('gpt-5')) {
            console.log(`ModelCompatibility: Detected gpt-5 family model '${model}', using max_completion_tokens`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Get the appropriate max tokens parameter name for a model
     * @param {string} model - Model name
     * @returns {string} Either 'max_completion_tokens' or 'max_tokens'
     */
    function getMaxTokensParamName(model) {
        return requiresMaxCompletionTokens(model) ? 'max_completion_tokens' : 'max_tokens';
    }
    
    /**
     * Build request body with correct max tokens parameter
     * @param {Object} baseBody - Base request body
     * @param {string} model - Model name
     * @param {number} maxTokens - Maximum tokens value
     * @returns {Object} Request body with correct parameter
     */
    function buildRequestBodyWithMaxTokens(baseBody, model, maxTokens) {
        if (!maxTokens) return baseBody;
        
        const paramName = getMaxTokensParamName(model);
        return {
            ...baseBody,
            [paramName]: maxTokens
        };
    }
    
    /**
     * Handle max_tokens error and rebuild request
     * @param {Object} error - API error response
     * @param {Object} originalBody - Original request body
     * @returns {Object|null} Updated request body or null if not a max_tokens error
     */
    function handleMaxTokensError(error, originalBody) {
        // Check if this is a max_tokens parameter error
        if (error?.error?.code === 'unsupported_parameter' && 
            error?.error?.param === 'max_tokens') {
            
            console.warn('ModelCompatibility: max_tokens not supported, switching to max_completion_tokens');
            
            // Remove max_tokens and add max_completion_tokens
            const { max_tokens, ...bodyWithoutMaxTokens } = originalBody;
            
            if (max_tokens) {
                return {
                    ...bodyWithoutMaxTokens,
                    max_completion_tokens: max_tokens
                };
            }
        }
        
        return null;
    }
    
    /**
     * Check if an error is due to incorrect max tokens parameter
     * @param {Object} error - Error object or response
     * @returns {boolean} True if error is due to max_tokens parameter
     */
    function isMaxTokensParameterError(error) {
        // Handle different error formats
        const errorObj = error?.error || error;
        
        return errorObj?.code === 'unsupported_parameter' && 
               errorObj?.param === 'max_tokens' &&
               errorObj?.message?.includes('max_completion_tokens');
    }
    
    // Public API
    return {
        requiresMaxCompletionTokens,
        getMaxTokensParamName,
        buildRequestBodyWithMaxTokens,
        handleMaxTokensError,
        isMaxTokensParameterError,
        // Export the list for reference
        MODELS_REQUIRING_MAX_COMPLETION_TOKENS
    };
})();