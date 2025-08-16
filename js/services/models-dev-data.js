/**
 * Models.dev data service
 * Auto-generated from models.dev metadata
 * Provides comprehensive model information including context windows
 */

window.ModelsDevData = (function() {
    // This is a JavaScript conversion of the models.json data from models.dev
    // We'll populate this with the actual data
    const modelsData = {};
    
    // Load the data asynchronously
    async function loadModelsData() {
        try {
            const response = await fetch('/models_dev/models.json');
            if (response.ok) {
                const data = await response.json();
                Object.assign(modelsData, data);
                console.log('Models.dev data loaded successfully');
            } else {
                console.warn('Could not load models.dev data, using fallback');
            }
        } catch (error) {
            console.warn('Error loading models.dev data:', error);
        }
    }
    
    /**
     * Get model information by provider and model ID
     * @param {string} provider - Provider name (e.g., 'openai', 'groq', 'anthropic')
     * @param {string} modelId - Model ID
     * @returns {Object|null} Model information or null if not found
     */
    function getModelInfo(provider, modelId) {
        if (!modelsData[provider] || !modelsData[provider].models) {
            return null;
        }
        return modelsData[provider].models[modelId] || null;
    }
    
    /**
     * Get context window size for a model
     * @param {string} provider - Provider name
     * @param {string} modelId - Model ID
     * @returns {number|null} Context window size in tokens or null if not found
     */
    function getContextWindow(provider, modelId) {
        const modelInfo = getModelInfo(provider, modelId);
        if (modelInfo && modelInfo.limit && modelInfo.limit.context) {
            return modelInfo.limit.context;
        }
        return null;
    }
    
    /**
     * Get all models for a provider
     * @param {string} provider - Provider name
     * @returns {Object} Object containing all models for the provider
     */
    function getProviderModels(provider) {
        if (!modelsData[provider] || !modelsData[provider].models) {
            return {};
        }
        return modelsData[provider].models;
    }
    
    /**
     * Search for a model across all providers
     * @param {string} modelId - Model ID to search for
     * @returns {Object|null} Object with provider and model info, or null if not found
     */
    function searchModel(modelId) {
        for (const provider in modelsData) {
            if (modelsData[provider].models && modelsData[provider].models[modelId]) {
                return {
                    provider: provider,
                    model: modelsData[provider].models[modelId]
                };
            }
        }
        
        // Try partial matching
        for (const provider in modelsData) {
            if (!modelsData[provider].models) continue;
            
            for (const id in modelsData[provider].models) {
                // Check if the model ID contains the search term or vice versa
                if (id.includes(modelId) || modelId.includes(id)) {
                    return {
                        provider: provider,
                        model: modelsData[provider].models[id]
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Map provider name from base URL to models.dev provider key
     * @param {string} baseUrl - Base URL of the API
     * @returns {string|null} Provider key or null if not found
     */
    function getProviderFromUrl(baseUrl) {
        if (!baseUrl) return null;
        
        if (baseUrl.includes('openai.com')) return 'openai';
        if (baseUrl.includes('groq.com')) return 'groq';
        if (baseUrl.includes('anthropic.com')) return 'anthropic';
        if (baseUrl.includes('deepinfra.com')) return 'deepinfra';
        if (baseUrl.includes('deepseek.com')) return 'deepseek';
        if (baseUrl.includes('fireworks.ai')) return 'fireworks-ai';
        if (baseUrl.includes('together.ai')) return 'together-ai';
        if (baseUrl.includes('sambanova.ai')) return 'sambanova';
        if (baseUrl.includes('hyperbolic.xyz')) return 'hyperbolic';
        if (baseUrl.includes('mistral.ai')) return 'mistral';
        if (baseUrl.includes('perplexity.ai')) return 'perplexity';
        if (baseUrl.includes('berget.ai')) return 'inference';  // Berget.AI uses inference provider
        if (baseUrl.includes('localhost:11434')) return 'ollama';
        
        return null;
    }
    
    // Initialize by loading the data
    loadModelsData();
    
    // Public API
    return {
        getModelInfo: getModelInfo,
        getContextWindow: getContextWindow,
        getProviderModels: getProviderModels,
        searchModel: searchModel,
        getProviderFromUrl: getProviderFromUrl,
        modelsData: modelsData  // Expose raw data for debugging
    };
})();