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
        anthropic: 'claude-3-5-haiku-latest',  // Default for Anthropic
        google: 'gemini-2.0-flash-exp',  // Default for Google
        mistral: 'ministral-3b-2410',  // Default for Mistral AI
        cohere: 'command-r-plus-08-2024',  // Default for Cohere
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
        anthropic: ['claude-opus-4-1', 'claude-opus-4-1-20250805', 'claude-opus-4-0', 'claude-opus-4-20250514', 'claude-sonnet-4-0', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-latest', 'claude-3-5-haiku-20241022'],
        google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
        mistral: ['ministral-3b-2410', 'ministral-8b-2410', 'mistral-large-2411', 'open-mistral-nemo-2407', 'open-codestral-mamba-2407'],
        cohere: ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r-plus', 'command-r', 'command'],
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
        anthropic: 'claude-3-5-haiku-latest',
        google: 'gemini-2.0-flash-exp',
        mistral: 'ministral-3b-2410',
        cohere: 'command-r-plus-08-2024',
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
        anthropic: 'claude-3-5-haiku-latest',  // Haiku for fast query expansion
        google: 'gemini-1.5-flash',  // Flash for quick query generation
        mistral: 'ministral-8b-2410',  // Ministral for query expansion
        cohere: 'command-r',  // Command-R for retrieval tasks
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