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
     * Provider-specific models for RAG query expansion
     * These models are optimized for generating diverse search terms
     */
    const RAG_EXPANSION_MODELS = {
        openai: 'gpt-4.1-mini',  // More capable for generating diverse search terms
        groq: 'openai/gpt-oss-20b',  // 20B model for query expansion on Groq
        berget: 'mistralai/Devstral-Small-2505',  // Devstral for Berget
        ollama: 'llama3.2',  // Default Ollama model
        custom: 'gpt-4.1-mini'  // Default to OpenAI's model for custom
    };
    
    /**
     * Default model for RAG query expansion (fallback)
     * Used when provider-specific model is not available
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
        RAG_EXPANSION_MODELS,
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
        },
        
        /**
         * Get RAG expansion model for a provider
         * @param {string} provider - Provider name
         * @returns {string} RAG expansion model ID (falls back to default)
         */
        getRagExpansionModel: function(provider) {
            return RAG_EXPANSION_MODELS[provider] || DEFAULT_RAG_EXPANSION_MODEL;
        }
    };

    // Log initialization
    console.log('Default Models Configuration initialized', {
        defaultOpenAIModel: DEFAULT_MODELS.openai,
        ragExpansionModel: DEFAULT_RAG_EXPANSION_MODEL
    });

})();