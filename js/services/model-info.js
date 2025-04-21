/**
 * Model information service
 * Contains data about available AI models and utilities for model display
 */

// Create a namespace for model info
window.ModelInfoService = (function() {
    // Model information data
    const modelInfo = {
        // Standard Models
        'gemma2-9b-it': { developer: 'Google', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
        'llama-3.3-70b-versatile': { developer: 'Meta', contextWindow: '128K', maxCompletionTokens: '32,768', maxFileSize: '-' },
        'llama-3.1-8b-instant': { developer: 'Meta', contextWindow: '128K', maxCompletionTokens: '8,192', maxFileSize: '-' },
        'llama-guard-3-8b': { developer: 'Meta', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
        'llama3-70b-8192': { developer: 'Meta', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
        'llama3-8b-8192': { developer: 'Meta', contextWindow: '8,192', maxCompletionTokens: '-', maxFileSize: '-' },
        'whisper-large-v3': { developer: 'OpenAI', contextWindow: '-', maxCompletionTokens: '-', maxFileSize: '25 MB' },
        'whisper-large-v3-turbo': { developer: 'OpenAI', contextWindow: '-', maxCompletionTokens: '-', maxFileSize: '25 MB' },
        'distil-whisper-large-v3-en': { developer: 'HuggingFace', contextWindow: '-', maxCompletionTokens: '-', maxFileSize: '25 MB' },
        
        // Preview Models
        'allam-2-7b': { developer: 'Saudi Data and AI Authority (SDAIA)', contextWindow: '4,096', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
        'deepseek-r1-distill-llama-70b': { developer: 'DeepSeek', contextWindow: '128K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
        'meta-llama/llama-4-maverick-17b-128e-instruct': { developer: 'Meta', contextWindow: '131,072', maxCompletionTokens: '8192', maxFileSize: '-', preview: true },
        'meta-llama/llama-4-scout-17b-16e-instruct': { developer: 'Meta', contextWindow: '131,072', maxCompletionTokens: '8192', maxFileSize: '-', preview: true },
        'mistral-saba-24b': { developer: 'Mistral', contextWindow: '32K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
        'playai-tts': { developer: 'Playht, Inc', contextWindow: '10K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
        'playai-tts-arabic': { developer: 'Playht, Inc', contextWindow: '10K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
        'qwen-qwq-32b': { developer: 'Alibaba Cloud', contextWindow: '128K', maxCompletionTokens: '-', maxFileSize: '-', preview: true },
        
        // Preview Systems
        'compound-beta': { developer: 'Groq', contextWindow: '128K', maxCompletionTokens: '8192', maxFileSize: '-', system: true },
        'compound-beta-mini': { developer: 'Groq', contextWindow: '128K', maxCompletionTokens: '8192', maxFileSize: '-', system: true }
    };

    // Production Models list
    const productionModels = [
        'gemma2-9b-it',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'llama-guard-3-8b',
        'llama3-70b-8192',
        'llama3-8b-8192',
        'whisper-large-v3',
        'whisper-large-v3-turbo',
        'distil-whisper-large-v3-en'
    ];

    // Preview Models list
    const previewModels = [
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'allam-2-7b',
        'deepseek-r1-distill-llama-70b',
        'mistral-saba-24b',
        'playai-tts',
        'playai-tts-arabic',
        'qwen-qwq-32b'
    ];

    // Preview Systems list
    const systemModels = [
        'compound-beta',
        'compound-beta-mini'
    ];

    /**
     * Get a simplified display name for a model
     * @param {string} modelId - The model ID
     * @returns {string} A user-friendly display name
     */
    function getDisplayName(modelId) {
        let displayName = modelId;
        
        // Simplify model names for better readability
        if (modelId === 'meta-llama/llama-4-maverick-17b-128e-instruct') {
            displayName = 'Llama 4 Maverick 17B';
        } else if (modelId === 'meta-llama/llama-4-scout-17b-16e-instruct') {
            displayName = 'Llama 4 Scout 17B';
        } else if (modelId.includes('llama-3.1')) {
            displayName = modelId.replace('llama-3.1-', 'Llama 3.1 ').replace('-versatile', ' Versatile').replace('-instant', ' Instant');
        } else if (modelId.includes('llama-3.3')) {
            displayName = modelId.replace('llama-3.3-', 'Llama 3.3 ').replace('-versatile', ' Versatile');
        } else if (modelId.includes('llama3-')) {
            displayName = modelId.replace('llama3-', 'Llama 3 ');
        } else if (modelId === 'llama-guard-3-8b') {
            displayName = 'Llama Guard 3 8B';
        } else if (modelId === 'gemma2-9b-it') {
            displayName = 'Gemma 2 9B IT';
        } else if (modelId === 'mixtral-8x7b-32768') {
            displayName = 'Mixtral 8x7B 32K';
        } else if (modelId === 'whisper-large-v3') {
            displayName = 'Whisper Large v3';
        } else if (modelId === 'whisper-large-v3-turbo') {
            displayName = 'Whisper Large v3 Turbo';
        } else if (modelId === 'distil-whisper-large-v3-en') {
            displayName = 'Distil Whisper Large v3 (EN)';
        } else if (modelId === 'allam-2-7b') {
            displayName = 'Allam 2 7B';
        } else if (modelId === 'deepseek-r1-distill-llama-70b') {
            displayName = 'DeepSeek R1 Distill Llama 70B';
        } else if (modelId === 'mistral-saba-24b') {
            displayName = 'Mistral Saba 24B';
        } else if (modelId === 'playai-tts') {
            displayName = 'PlayAI TTS';
        } else if (modelId === 'playai-tts-arabic') {
            displayName = 'PlayAI TTS Arabic';
        } else if (modelId === 'qwen-qwq-32b') {
            displayName = 'Qwen QWQ 32B';
        } else if (modelId === 'compound-beta') {
            displayName = 'Compound Beta';
        } else if (modelId === 'compound-beta-mini') {
            displayName = 'Compound Beta Mini';
        }
        
        return displayName;
    }

    // Public API
    return {
        modelInfo: modelInfo,
        productionModels: productionModels,
        previewModels: previewModels,
        systemModels: systemModels,
        getDisplayName: getDisplayName
    };
})();
