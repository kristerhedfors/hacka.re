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
        'groq': 'llama-3.1-8b-instant'
        // For Ollama, we'll select the first model in the list
    };

    // Empty model lists - will be populated from API
    const productionModels = [];
    const previewModels = [];
    const systemModels = [];

    /**
     * Get the context window size for a model
     * @param {string} modelId - The model ID
     * @returns {number|null} The context window size in tokens, or null if unknown
     */
    function getContextSize(modelId) {
        // Handle null or undefined modelId
        if (modelId === null || modelId === undefined) {
            console.log('Getting context size for undefined or null model');
            return null;
        }
        
        // Convert to string if it's not already
        const modelIdStr = String(modelId);
        
        console.log(`Getting context size for model: ${modelIdStr}`);
        console.log(`Model info for ${modelIdStr}:`, modelInfo[modelIdStr]);
        
        // If we have model info from the API, use that
        if (modelInfo[modelIdStr] && modelInfo[modelIdStr].context_window) {
            console.log(`Found context window size: ${modelInfo[modelIdStr].context_window}`);
            return modelInfo[modelIdStr].context_window;
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
        getDisplayName: getDisplayName,
        getContextSize: getContextSize
    };
})();
