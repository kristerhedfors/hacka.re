/**
 * Models.dev data service
 * Auto-generated from models.dev metadata
 * Provides comprehensive model information including context windows
 */

window.ModelsDevData = (function() {
    // This is a JavaScript conversion of the models.json data from models.dev
    // We'll populate this with the actual data
    const modelsData = {};
    
    // Load the data asynchronously with support for both HTTP and file:// protocols
    async function loadModelsData() {
        try {
            // Try multiple paths to handle different environments
            const paths = [
                '/models_dev/models.json',
                './models_dev/models.json',
                'models_dev/models.json'
            ];
            
            let data = null;
            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        data = await response.json();
                        console.log(`Models.dev data loaded successfully from ${path}`);
                        break;
                    }
                } catch (err) {
                    console.debug(`Failed to load from ${path}:`, err.message);
                }
            }
            
            if (data) {
                Object.assign(modelsData, data);
            } else {
                // Fallback: Use minimal embedded data for file:// protocol
                console.warn('Could not load models.dev data from any path, using embedded fallback');
                loadEmbeddedFallback();
            }
        } catch (error) {
            console.warn('Error loading models.dev data:', error);
            loadEmbeddedFallback();
        }
    }
    
    // Embedded fallback data for file:// protocol or when fetch fails
    function loadEmbeddedFallback() {
        const embeddedData = {
            "openai": {
                "models": {
                    "gpt-4o": { "limit": { "context": 128000 } },
                    "gpt-4o-mini": { "limit": { "context": 128000 } },
                    "gpt-4": { "limit": { "context": 8192 } },
                    "gpt-3.5-turbo": { "limit": { "context": 16385 } },
                    "o1-preview": { "limit": { "context": 128000 } },
                    "o1-mini": { "limit": { "context": 128000 } }
                }
            },
            "anthropic": {
                "models": {
                    "claude-3-5-sonnet-20241022": { "limit": { "context": 200000 } },
                    "claude-3-5-haiku-20241022": { "limit": { "context": 200000 } },
                    "claude-3-opus-20240229": { "limit": { "context": 200000 } },
                    "claude-3-sonnet-20240229": { "limit": { "context": 200000 } },
                    "claude-3-haiku-20240307": { "limit": { "context": 200000 } }
                }
            },
            "groq": {
                "models": {
                    "llama-3.1-405b-reasoning": { "limit": { "context": 32768 } },
                    "llama-3.1-70b-versatile": { "limit": { "context": 131072 } },
                    "llama-3.1-8b-instant": { "limit": { "context": 131072 } },
                    "mixtral-8x7b-32768": { "limit": { "context": 32768 } }
                }
            },
            "mistral": {
                "models": {
                    "mistral-large-latest": { "limit": { "context": 128000 } },
                    "mistral-medium": { "limit": { "context": 32000 } },
                    "mistral-small": { "limit": { "context": 32000 } }
                }
            }
        };
        
        Object.assign(modelsData, embeddedData);
        console.log('Using embedded fallback models.dev data');
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