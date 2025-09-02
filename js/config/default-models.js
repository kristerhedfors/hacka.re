/**
 * Default Models Configuration
 * Central configuration for default model selections across providers
 */

(function() {
    'use strict';

    /**
     * Default models for each provider
     * These are used when initializing the application or when a provider is selected
     */
    const DEFAULT_MODELS = {
        openai: 'gpt-5-nano',  // Primary default model for OpenAI
        groq: 'moonshotai/kimi-k2-instruct',  // Default for Groq Cloud
        berget: 'mistralai/Magistral-Small-2506',  // Default for Berget
        ollama: 'llama3.2',  // Default for Ollama
        custom: null  // No default for custom endpoints
    };

    /**
     * Fallback models for each provider when API fetch fails
     * Listed in order of preference
     */
    const FALLBACK_MODELS = {
        openai: ['gpt-5-nano', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        groq: ['moonshotai/kimi-k2-instruct', 'llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
        berget: ['mistralai/Magistral-Small-2506', 'llama-3.3-70b', 'gpt-5-nano', 'claude-3-opus-20240229'],
        ollama: ['llama3.2', 'llama3.1', 'llama3', 'mistral'],
        custom: []
    };

    /**
     * Compatible models for sharing across providers
     * Used when importing shared links with different providers
     */
    const COMPATIBLE_MODELS = {
        openai: 'gpt-5-nano',
        groq: 'llama-3.3-70b-versatile',
        ollama: 'llama3.2',
        berget: 'mistralai/Magistral-Small-2506'
    };

    /**
     * Default model for RAG query expansion
     * Using gpt-4.1-mini as it's more capable for generating diverse search terms
     * gpt-5-nano appears to be too weak for this specific task
     */
    const DEFAULT_RAG_EXPANSION_MODEL = 'gpt-4.1-mini';

    /**
     * Test model for development and testing
     * Used in test suites and development environments
     */
    const DEFAULT_TEST_MODEL = 'gpt-5-nano';

    // Export to global scope
    window.DefaultModelsConfig = {
        DEFAULT_MODELS,
        FALLBACK_MODELS,
        COMPATIBLE_MODELS,
        DEFAULT_RAG_EXPANSION_MODEL,
        DEFAULT_TEST_MODEL,
        
        /**
         * Get default model for a provider
         * @param {string} provider - Provider name
         * @returns {string|null} Default model ID or null
         */
        getDefaultModel: function(provider) {
            return DEFAULT_MODELS[provider] || null;
        },
        
        /**
         * Get fallback models for a provider
         * @param {string} provider - Provider name
         * @returns {Array} Array of fallback model IDs
         */
        getFallbackModels: function(provider) {
            return FALLBACK_MODELS[provider] || [];
        },
        
        /**
         * Get compatible model for a provider
         * @param {string} provider - Provider name
         * @returns {string|null} Compatible model ID or null
         */
        getCompatibleModel: function(provider) {
            return COMPATIBLE_MODELS[provider] || null;
        }
    };

    // Log initialization
    console.log('Default Models Configuration initialized', {
        defaultOpenAIModel: DEFAULT_MODELS.openai,
        ragExpansionModel: DEFAULT_RAG_EXPANSION_MODEL
    });

})();