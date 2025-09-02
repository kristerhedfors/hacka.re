/**
 * Models.dev data service
 * Auto-generated from models.dev metadata
 * Provides comprehensive model information including context windows
 */

window.ModelsDevData = (function() {
    // Embedded models data - no dynamic imports needed
    // This data is extracted from models.dev for essential providers
    const modelsData = {
        "openai": {
            "models": {
                "gpt-4": { "limit": { "context": 8192 } },
                "gpt-5": { "limit": { "context": 400000 } },
                "gpt-5-mini": { "limit": { "context": 400000 } },
                "o1-preview": { "limit": { "context": 128000 } },
                "gpt-4-turbo": { "limit": { "context": 128000 } },
                "codex-mini-latest": { "limit": { "context": 200000 } },
                "gpt-5-nano": { "limit": { "context": 400000 } },
                "gpt-4.1-nano": { "limit": { "context": 1047576 } },
                "gpt-5-nano": { "limit": { "context": 128000 } },
                "gpt-3.5-turbo": { "limit": { "context": 16385 } },
                "gpt-3.5-turbo-16k": { "limit": { "context": 16385 } },
                "gpt-4o": { "limit": { "context": 128000 } },
                "gpt-4.1": { "limit": { "context": 1047576 } },
                "o1-mini": { "limit": { "context": 128000 } },
                "gpt-4.1-mini": { "limit": { "context": 1047576 } },
                "o3": { "limit": { "context": 200000 } },
                "gpt-3.5-turbo-0125": { "limit": { "context": 16385 } },
                "o1": { "limit": { "context": 200000 } },
                "gpt-4o-2024-05-13": { "limit": { "context": 128000 } },
                "o3-mini": { "limit": { "context": 200000 } },
                "o4": { "limit": { "context": 400000 } },
                "gpt-4o-2024-08-06": { "limit": { "context": 128000 } },
                "gpt-5-nano-2024-07-18": { "limit": { "context": 128000 } },
                "o4-mini": { "limit": { "context": 400000 } },
                "gpt-3.5-turbo-1106": { "limit": { "context": 16385 } },
                "o1-2024-12-17": { "limit": { "context": 200000 } },
                "o1-mini-2024-09-12": { "limit": { "context": 128000 } },
                "o1-preview-2024-09-12": { "limit": { "context": 128000 } },
                "gpt-oss-120b": { "limit": { "context": 131072 } },
                "gpt-oss-20b": { "limit": { "context": 131072 } }
            }
        },
        "anthropic": {
            "models": {
                "claude-opus-4": { "limit": { "context": 200000 } },
                "claude-sonnet-4": { "limit": { "context": 200000 } },
                "claude-instant-1.2": { "limit": { "context": 100000 } },
                "claude-2.1": { "limit": { "context": 200000 } },
                "claude-3-5-haiku-20241022": { "limit": { "context": 200000 } },
                "claude-3-7-sonnet-20250219": { "limit": { "context": 200000 } },
                "claude-2.0": { "limit": { "context": 100000 } },
                "claude-3-opus-20240229": { "limit": { "context": 200000 } },
                "claude-opus-4-1": { "limit": { "context": 200000 } },
                "claude-3-sonnet-20240229": { "limit": { "context": 200000 } },
                "claude-3-haiku-20240307": { "limit": { "context": 200000 } },
                "claude-3-5-sonnet-20241022": { "limit": { "context": 200000 } },
                "claude-3-5-sonnet-20240620": { "limit": { "context": 200000 } }
            }
        },
        "groq": {
            "models": {
                "llama-3.3-70b-versatile": { "limit": { "context": 128000 } },
                "llama-3.3-70b-specdec": { "limit": { "context": 8192 } },
                "llama-3.3-8b-specdec": { "limit": { "context": 8192 } },
                "llama-3.2-11b-vision-preview": { "limit": { "context": 8192 } },
                "llama-3.2-3b-preview": { "limit": { "context": 8192 } },
                "llama-3.2-1b-preview": { "limit": { "context": 8192 } },
                "llama-4-scout-17b-16e-preview-fp8": { "limit": { "context": 128000 } },
                "llama-3.1-405b-reasoning": { "limit": { "context": 32768 } },
                "llama-3.1-70b-versatile": { "limit": { "context": 131072 } },
                "llama-3.1-8b-instant": { "limit": { "context": 131072 } },
                "llama-3.2-90b-vision-preview": { "limit": { "context": 8192 } },
                "llama-4-maverick-17b-128e-preview-fp8": { "limit": { "context": 128000 } },
                "mixtral-8x7b-32768": { "limit": { "context": 32768 } }
            }
        },
        "mistral": {
            "models": {
                "mistral-small-2503": { "limit": { "context": 128000 } },
                "mistral-large-2411": { "limit": { "context": 128000 } },
                "ministral-3b-2410": { "limit": { "context": 128000 } },
                "mistral-medium-2505": { "limit": { "context": 128000 } },
                "mistral-large-latest": { "limit": { "context": 128000 } },
                "ministral-8b-2410": { "limit": { "context": 128000 } },
                "mistral-nemo": { "limit": { "context": 128000 } },
                "codestral-2501": { "limit": { "context": 256000 } },
                "open-mistral-7b": { "limit": { "context": 32000 } },
                "mistral-small-2409": { "limit": { "context": 128000 } },
                "mistral-large": { "limit": { "context": 128000 } },
                "mistral-small": { "limit": { "context": 32000 } },
                "mistral-medium": { "limit": { "context": 32000 } },
                "mistral-tiny": { "limit": { "context": 32000 } },
                "magistral-small": { "limit": { "context": 128000 } },
                "magistral-medium": { "limit": { "context": 128000 } },
                "magistral-medium-latest": { "limit": { "context": 128000 } },
                "devstral-small-2505": { "limit": { "context": 128000 } },
                "devstral-small-2507": { "limit": { "context": 128000 } },
                "devstral-medium-2507": { "limit": { "context": 128000 } },
                "devstral-small": { "limit": { "context": 128000 } },
                "devstral-medium": { "limit": { "context": 128000 } }
            }
        },
        "deepseek": {
            "models": {
                "deepseek-chat": { "limit": { "context": 128000 } },
                "deepseek-coder": { "limit": { "context": 128000 } },
                "deepseek-reasoner": { "limit": { "context": 65536 } },
                "deepseek-r1": { "limit": { "context": 65536 } },
                "deepseek-r1-0528": { "limit": { "context": 65536 } },
                "deepseek-r1-distill-llama-70b": { "limit": { "context": 131072 } },
                "deepseek-r1-distill-qwen-14b": { "limit": { "context": 64000 } }
            }
        },
        "microsoft": {
            "models": {
                "mai-ds-r1": { "limit": { "context": 65536 } },
                "mai-ds-r1-gguf": { "limit": { "context": 65536 } }
            }
        },
        "deepinfra": {
            "models": {
                "meta-llama/Llama-3.3-70B-Instruct": { "limit": { "context": 128000 } },
                "microsoft/Phi-4": { "limit": { "context": 128000 } },
                "meta-llama/Meta-Llama-3.1-405B-Instruct": { "limit": { "context": 32000 } },
                "meta-llama/Meta-Llama-3.1-70B-Instruct": { "limit": { "context": 128000 } },
                "meta-llama/Meta-Llama-3.1-8B-Instruct": { "limit": { "context": 128000 } },
                "meta-llama/Meta-Llama-3-70B-Instruct": { "limit": { "context": 8192 } },
                "meta-llama/Meta-Llama-3-8B-Instruct": { "limit": { "context": 8192 } },
                "mistralai/Mistral-7B-Instruct-v0.3": { "limit": { "context": 32768 } },
                "mistralai/Mixtral-8x22B-Instruct-v0.1": { "limit": { "context": 65536 } },
                "mistralai/Mixtral-8x7B-Instruct-v0.1": { "limit": { "context": 32768 } },
                "Qwen/QwQ-32B-Preview": { "limit": { "context": 32768 } },
                "Qwen/Qwen2.5-72B-Instruct": { "limit": { "context": 128000 } }
            }
        },
        "perplexity": {
            "models": {
                "llama-3.1-sonar-small-128k-online": { "limit": { "context": 127072 } },
                "llama-3.1-sonar-large-128k-online": { "limit": { "context": 127072 } },
                "llama-3.1-sonar-huge-128k-online": { "limit": { "context": 127072 } },
                "llama-3.1-sonar-small-128k-chat": { "limit": { "context": 127072 } },
                "llama-3.1-sonar-large-128k-chat": { "limit": { "context": 127072 } },
                "llama-3.1-8b-instruct": { "limit": { "context": 131072 } },
                "llama-3.1-70b-instruct": { "limit": { "context": 131072 } }
            }
        }
    };
    
    // Additional fallback data for common models not in the extracted set
    const fallbackData = {
        "ollama": {
            "models": {
                "llama2": { "limit": { "context": 4096 } },
                "codellama": { "limit": { "context": 16384 } },
                "mistral": { "limit": { "context": 8192 } },
                "phi": { "limit": { "context": 2048 } }
            }
        },
        "together-ai": {
            "models": {
                "meta-llama/Llama-3-70b-chat-hf": { "limit": { "context": 8192 } },
                "meta-llama/Llama-3-8b-chat-hf": { "limit": { "context": 8192 } },
                "mistralai/Mixtral-8x7B-Instruct-v0.1": { "limit": { "context": 32768 } }
            }
        },
        "fireworks-ai": {
            "models": {
                "accounts/fireworks/models/llama-v3-70b-instruct": { "limit": { "context": 8192 } },
                "accounts/fireworks/models/mixtral-8x7b-instruct": { "limit": { "context": 32768 } }
            }
        },
        "sambanova": {
            "models": {
                "Meta-Llama-3.1-405B-Instruct": { "limit": { "context": 8192 } },
                "Meta-Llama-3.1-70B-Instruct": { "limit": { "context": 8192 } },
                "Meta-Llama-3.1-8B-Instruct": { "limit": { "context": 8192 } }
            }
        },
        "hyperbolic": {
            "models": {
                "meta-llama/Meta-Llama-3.1-405B-Instruct": { "limit": { "context": 8192 } },
                "meta-llama/Meta-Llama-3.1-70B-Instruct": { "limit": { "context": 8192 } }
            }
        },
        "meta": {
            "models": {
                // Llama 4 models
                "llama-4-maverick": { "limit": { "context": 128000 } },
                "llama-4-maverick-17b-128e-instruct": { "limit": { "context": 131072 } },
                "llama-4-maverick-17b-128e-instruct-fp8": { "limit": { "context": 128000 } },
                "llama-4-scout": { "limit": { "context": 128000 } },
                "llama-4-scout-17b-16e-instruct": { "limit": { "context": 128000 } },
                "llama-4-scout-17b-16e-instruct-fp8": { "limit": { "context": 128000 } },
                
                // Llama 3.3 models
                "llama-3.3-70b": { "limit": { "context": 65536 } },
                "llama-3.3-70b-instruct": { "limit": { "context": 128000 } },
                "llama-3.3-70b-versatile": { "limit": { "context": 131072 } },
                "llama-3.3-8b-instruct": { "limit": { "context": 128000 } },
                
                // Llama 3.2 models
                "llama-3.2-90b-vision-instruct": { "limit": { "context": 128000 } },
                "llama-3.2-11b-vision-instruct": { "limit": { "context": 128000 } },
                "llama-3.2-3b": { "limit": { "context": 131072 } },
                "llama-3.2-3b-instruct": { "limit": { "context": 16000 } },
                "llama-3.2-1b-instruct": { "limit": { "context": 16000 } },
                
                // Llama 3.1 models
                "llama-3.1-405b": { "limit": { "context": 65536 } },
                "llama-3.1-405b-instruct": { "limit": { "context": 128000 } },
                "llama-3.1-70b-instruct": { "limit": { "context": 128000 } },
                "llama-3.1-8b-instruct": { "limit": { "context": 128000 } },
                "llama-3.1-8b-instant": { "limit": { "context": 131072 } },
                
                // Llama 3 models
                "llama3-70b-8192": { "limit": { "context": 8192 } },
                "llama3-8b-8192": { "limit": { "context": 8192 } },
                "meta-llama-3-70b-instruct": { "limit": { "context": 8192 } },
                "meta-llama-3-8b-instruct": { "limit": { "context": 8192 } },
                
                // Llama Guard models
                "llama-guard-3-8b": { "limit": { "context": 8192 } },
                "llama-guard-4-12b": { "limit": { "context": 131072 } },
                
                // DeepSeek Llama variants
                "deepseek-r1-distill-llama-70b": { "limit": { "context": 131072 } }
            }
        },
        "qwen": {
            "models": {
                // Qwen 3 models
                "qwen3-235b": { "limit": { "context": 131072 } },
                "qwen3-235b-a22b": { "limit": { "context": 128000 } },
                "qwen3-235b-a22b-instruct-2507": { "limit": { "context": 262144 } },
                "qwen3-235b-a22b-thinking-2507": { "limit": { "context": 262144 } },
                "qwen3-30b-a3b": { "limit": { "context": 40960 } },
                "qwen3-30b-a3b-instruct-2507": { "limit": { "context": 262144 } },
                "qwen3-30b-a3b-thinking-2507": { "limit": { "context": 262144 } },
                
                // Qwen 3 Coder models
                "qwen3-coder-30b-a3b-instruct": { "limit": { "context": 262144 } },
                "qwen3-coder-480b-a35b-instruct": { "limit": { "context": 262144 } },
                "qwen3-coder-480b-a35b-instruct-fp8": { "limit": { "context": 262144 } },
                "qwen3-coder-480b-a35b-instruct-turbo": { "limit": { "context": 262144 } },
                "qwen-3-coder-480b": { "limit": { "context": 131000 } },
                
                // Qwen 2.5 models
                "qwen-2.5-7b-vision-instruct": { "limit": { "context": 125000 } },
                "qwen-2.5-coder-32b": { "limit": { "context": 32768 } },
                "qwen-2.5-coder-32b-instruct": { "limit": { "context": 32768 } },
                "qwen-2.5-qwq-32b": { "limit": { "context": 32768 } },
                "qwen-2.5-vl": { "limit": { "context": 32768 } },
                "qwen2.5-vl-32b-instruct": { "limit": { "context": 8192 } },
                "qwen2.5-vl-72b-instruct": { "limit": { "context": 32768 } },
                "qwen2.5-72b-instruct": { "limit": { "context": 128000 } },
                
                // QwQ models
                "qwen-qwq-32b": { "limit": { "context": 131072 } },
                "qwq-32b-preview": { "limit": { "context": 32768 } },
                
                // DeepSeek Qwen variants
                "deepseek-r1-0528-qwen3-8b": { "limit": { "context": 131072 } },
                "deepseek-r1-distill-qwen-14b": { "limit": { "context": 64000 } }
            }
        }
    };
    
    // Merge fallback data into main models data
    for (const provider in fallbackData) {
        if (!modelsData[provider]) {
            modelsData[provider] = fallbackData[provider];
        } else {
            Object.assign(modelsData[provider].models, fallbackData[provider].models);
        }
    }
    
    console.log('Models.dev data loaded successfully (embedded)');
    
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
        if (baseUrl.includes('together.ai') || baseUrl.includes('together.xyz')) return 'together-ai';
        if (baseUrl.includes('sambanova.ai')) return 'sambanova';
        if (baseUrl.includes('hyperbolic.xyz')) return 'hyperbolic';
        if (baseUrl.includes('mistral.ai')) return 'mistral';
        if (baseUrl.includes('perplexity.ai')) return 'perplexity';
        if (baseUrl.includes('berget.ai')) return 'inference';  // Berget.AI uses inference provider
        if (baseUrl.includes('localhost:11434')) return 'ollama';
        
        return null;
    }
    
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