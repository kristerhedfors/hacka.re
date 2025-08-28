/**
 * Model information service
 * Contains utilities for model display
 */

// Create a namespace for model info
window.ModelInfoService = (function() {
    // Empty model information data - will be populated from API
    const modelInfo = {};

    // Default models for different providers
    const defaultModels = {
        'openai': 'gpt-4.1',
        'groq': 'moonshotai/kimi-k2-instruct',
        'berget': 'mistralai/Magistral-Small-2506'
        // For Ollama, we'll select the first model in the list
    };

    // Empty model lists - will be populated from API
    const productionModels = [];
    const previewModels = [];
    const systemModels = [];

    // Hardcoded context window sizes for models when not available from API
    const contextWindowSizes = {
        // Gemma models
        'gemma2-9b-it': 8192,
        
        // Meta models
        'llama-3.3-70b-versatile': 128 * 1024,
        'llama-3.1-8b-instant': 128 * 1024,
        'llama-guard-3-8b': 8192,
        'llama3-70b-8192': 8192,
        'llama3-8b-8192': 8192,
        'meta-llama/llama-4-maverick-17b-128e-instruct': 131072,
        'meta-llama/llama-4-scout-17b-16e-instruct': 131072,
        
        // Other models
        'allam-2-7b': 4096,
        'deepseek-r1-distill-llama-70b': 128 * 1024,
        
        // MAI DS models (DeepSeek R1 variants) - Using 64K based on DeepSeek R1 base model
        'mai-ds-r1-gguf': 64 * 1024,
        'mai ds r1 gguf': 64 * 1024,
        'MAI DS R1 GGUF': 64 * 1024,
        'mai-ds-r1': 64 * 1024,
        'mai ds r1': 64 * 1024,
        'unsloth/mai-ds-r1-gguf': 64 * 1024,
        
        'mistral-saba-24b': 32 * 1024,
        'playai-tts': 10 * 1024,
        'playai-tts-arabic': 10 * 1024,
        'qwen-qwq-32b': 128 * 1024,
        
        // Moonshot models
        'moonshotai/kimi-k2-instruct': 200 * 1024,
        
        // Groq models
        'compound-beta': 128 * 1024,
        'compound-beta-mini': 128 * 1024,
        
        // OpenAI models - Comprehensive list with accurate context window sizes
        'gpt-4.1': 1048576,
        'gpt-4.1-mini': 1048576,
        'gpt-4.1-nano': 1048576,
        'gpt-4.5': 128000,
        'gpt-4o': 128000,
        'gpt-4o-mini': 128000,
        'gpt-4': 8192,
        'gpt-4-32k': 32768,
        'gpt-4-turbo': 128000,
        'gpt-4-vision-preview': 128000,
        'gpt-3.5-turbo': 4096,
        'gpt-3.5-turbo-16k': 16384,
        'gpt-3.5-turbo-instruct': 4096,
        'o1': 200000,
        'o1-mini': 128000,
        'o1-pro': 200000,
        'o3': 128000,
        'o3-mini': 200000,
        'o4-mini': 200000,
        'text-embedding-ada-002': 8191,
        'text-embedding-3-small': 8192,
        'text-embedding-3-large': 8192,
        'dall-e-2': 4000,
        'dall-e-3': 4000,
        'whisper-1': 25 * 1024 * 1024, // 25MB audio input
        'gpt-4o-transcribe': 25 * 1024 * 1024, // audio input
        'gpt-4o-mini-transcribe': 25 * 1024 * 1024, // audio input
        'gpt-4o-mini-tts': 4096, // text input
        'tts-1': 4096, // text input
        'tts-1-hd': 4096 // text input
    };

    /**
     * Get the context window size for a model
     * @param {string} modelId - The model ID
     * @returns {number|null} The context window size in tokens, or null if unknown
     */
    function getContextSize(modelId) {
        // Handle null or undefined modelId
        if (modelId === null || modelId === undefined) {
            return null;
        }
        
        // Convert to string if it's not already
        const modelIdStr = String(modelId);
        
        // If we have model info from the API, use that
        if (modelInfo[modelIdStr] && modelInfo[modelIdStr].context_window) {
            console.log(`Found context window size from API: ${modelInfo[modelIdStr].context_window}`);
            return modelInfo[modelIdStr].context_window;
        }
        
        // Try to get context window from models.dev data
        if (window.ModelsDevData) {
            // First try to get the provider from the base URL
            const baseUrl = window.StorageService ? window.StorageService.getBaseUrl() : null;
            const provider = window.ModelsDevData.getProviderFromUrl(baseUrl);
            
            // Function to normalize model names by removing version suffixes
            const normalizeModelName = (name) => {
                // Remove provider prefix if present (e.g., "mistralai/" or "meta-llama/")
                let normalized = name.replace(/^[^\/]+\//, '');
                
                // Remove common version patterns:
                // - 4-digit years or dates (2024, 2506, etc.)
                // - Version numbers (v1, v2.1, etc.)
                // - Date stamps (20240101, 2024-01-01, etc.)
                // - Build numbers or hashes
                normalized = normalized
                    .replace(/-\d{4}$/, '')           // Remove -YYYY at end
                    .replace(/-\d{6,8}$/, '')         // Remove -YYYYMMDD at end
                    .replace(/-\d{4}-\d{2}-\d{2}$/, '') // Remove -YYYY-MM-DD at end
                    .replace(/-v\d+(\.\d+)*$/, '')    // Remove -v1.2.3 at end
                    .replace(/@\d+$/, '')             // Remove @timestamp at end
                    .replace(/-[a-f0-9]{6,}$/i, '');  // Remove hex hashes at end
                
                // Convert to lowercase for case-insensitive matching
                return normalized.toLowerCase();
            };
            
            if (provider) {
                // Try exact match first
                let contextWindow = window.ModelsDevData.getContextWindow(provider, modelIdStr);
                if (contextWindow) {
                    console.log(`Found context window from models.dev (${provider}): ${contextWindow}`);
                    return contextWindow;
                }
                
                // Try normalized model name
                const normalizedName = normalizeModelName(modelIdStr);
                contextWindow = window.ModelsDevData.getContextWindow(provider, normalizedName);
                if (contextWindow) {
                    console.log(`Found context window from models.dev with normalized name '${normalizedName}' (${provider}): ${contextWindow}`);
                    return contextWindow;
                }
                
                // Try searching for partial matches in the provider's models
                const providerModels = window.ModelsDevData.getProviderModels(provider);
                if (providerModels) {
                    for (const [modelKey, modelData] of Object.entries(providerModels)) {
                        if (normalizeModelName(modelKey) === normalizedName || 
                            modelKey.toLowerCase().includes(normalizedName) ||
                            normalizedName.includes(normalizeModelName(modelKey))) {
                            if (modelData && modelData.limit && modelData.limit.context) {
                                console.log(`Found context window from models.dev partial match '${modelKey}' (${provider}): ${modelData.limit.context}`);
                                return modelData.limit.context;
                            }
                        }
                    }
                }
            }
            
            // If no provider match or no model found, search across all providers
            const searchResult = window.ModelsDevData.searchModel(modelIdStr);
            if (searchResult && searchResult.model && searchResult.model.limit && searchResult.model.limit.context) {
                console.log(`Found context window from models.dev search (${searchResult.provider}): ${searchResult.model.limit.context}`);
                return searchResult.model.limit.context;
            }
            
            // Try normalized search across all providers
            const normalizedName = normalizeModelName(modelIdStr);
            const normalizedSearchResult = window.ModelsDevData.searchModel(normalizedName);
            if (normalizedSearchResult && normalizedSearchResult.model && normalizedSearchResult.model.limit && normalizedSearchResult.model.limit.context) {
                console.log(`Found context window from models.dev normalized search '${normalizedName}' (${normalizedSearchResult.provider}): ${normalizedSearchResult.model.limit.context}`);
                return normalizedSearchResult.model.limit.context;
            }
        }
        
        // Special handling for MAI DS models (DeepSeek R1 variants)
        if (modelIdStr.toLowerCase().includes('mai ds') || 
            modelIdStr.toLowerCase().includes('mai-ds') || 
            modelIdStr.toLowerCase().includes('mai_ds')) {
            console.log(`Detected MAI DS model (DeepSeek R1 variant), using 128K context window`);
            return 128 * 1024;
        }
        
        // Check if we have a hardcoded context window size for this model
        if (contextWindowSizes[modelIdStr]) {
            console.log(`Using hardcoded context window size for ${modelIdStr}: ${contextWindowSizes[modelIdStr]}`);
            return contextWindowSizes[modelIdStr];
        }
        
        // Try to extract context window from model ID
        // Many models include context size in their name, e.g., "mixtral-8x7b-32768", "llama-2-70b-4096"
        // Look for a number at the end - either specific 4-digit values or any 5+ digit number
        const contextMatch = modelIdStr.match(/[-_](\d+)$/);
        if (contextMatch) {
            const extractedContext = parseInt(contextMatch[1], 10);
            const validFourDigitContexts = [1024, 2048, 3072, 4096, 8192];
            
            // Check if it's a valid 4-digit context window or any 5+ digit number
            const isValidFourDigit = contextMatch[1].length === 4 && validFourDigitContexts.includes(extractedContext);
            const isFiveOrMoreDigits = contextMatch[1].length >= 5;
            
            if ((isValidFourDigit || isFiveOrMoreDigits) && extractedContext >= 1000 && extractedContext <= 2000000) {
                console.log(`Extracted context window from model ID ${modelIdStr}: ${extractedContext}`);
                return extractedContext;
            }
        }
        
        // Also check for patterns like "32k", "128k", "200k" in the model name
        const kMatch = modelIdStr.match(/[-_](\d+)k(?:[-_]|$)/i);
        if (kMatch) {
            const extractedContext = parseInt(kMatch[1], 10) * 1024;
            if (extractedContext >= 1000 && extractedContext <= 2000000) {
                console.log(`Extracted context window from model ID ${modelIdStr} (k notation): ${extractedContext}`);
                return extractedContext;
            }
        }
        
        // Return null if we don't know the context size
        console.log(`No context window size found for model: ${modelIdStr}`);
        return null;
    }

    /**
     * Get a simplified display name for a model
     * @param {string} modelId - The model ID
     * @returns {string} A user-friendly display name
     */
    function getDisplayName(modelId) {
        // Ensure modelId is a string
        if (modelId === null || modelId === undefined) {
            return 'Unknown Model';
        }
        
        // Convert to string if it's not already
        let displayName = String(modelId);
        
        // Common model name patterns
        if (displayName.includes('/')) {
            // Extract the model name from paths like 'meta-llama/llama-4-...'
            const parts = displayName.split('/');
            displayName = parts[parts.length - 1];
        }
        
        // Format model names based on common patterns
        if (displayName.includes('llama-')) {
            displayName = displayName
                .replace('llama-3.1-', 'Llama 3.1 ')
                .replace('llama-3.3-', 'Llama 3.3 ')
                .replace('llama-guard-', 'Llama Guard ')
                .replace('-versatile', ' Versatile')
                .replace('-instant', ' Instant');
        } else if (displayName.includes('llama3-')) {
            displayName = displayName.replace('llama3-', 'Llama 3 ');
        } else if (displayName.includes('gemma')) {
            displayName = displayName.replace('gemma', 'Gemma ').replace('-it', ' IT');
        } else if (displayName.includes('whisper')) {
            displayName = displayName
                .replace('whisper-', 'Whisper ')
                .replace('large-v', 'Large v')
                .replace('-turbo', ' Turbo')
                .replace('-en', ' (EN)');
        } else if (displayName.includes('distil-whisper')) {
            displayName = displayName
                .replace('distil-whisper-', 'Distil Whisper ')
                .replace('large-v', 'Large v')
                .replace('-en', ' (EN)');
        }
        
        // Capitalize first letter of each word
        displayName = displayName.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        return displayName;
    }

    // Public API
    return {
        modelInfo: modelInfo,
        productionModels: productionModels,
        previewModels: previewModels,
        systemModels: systemModels,
        defaultModels: defaultModels,
        contextWindowSizes: contextWindowSizes,  // Expose the contextWindowSizes object
        getDisplayName: getDisplayName,
        getContextSize: getContextSize
    };
})();
