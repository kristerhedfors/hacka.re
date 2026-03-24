/**
 * Model Country Mapping Service
 * Maps AI model providers and models to their country of origin
 */

window.ModelCountryMapping = (function() {
    /**
     * Comprehensive mapping of model providers/prefixes to country flags
     * Using pattern matching to handle variations in model names
     */
    const MODEL_COUNTRY_PATTERNS = {
        // OpenAI - USA
        'gpt': '🇺🇸',
        'o1': '🇺🇸',
        'o3': '🇺🇸',
        'o4': '🇺🇸',
        'dall-e': '🇺🇸',
        'whisper': '🇺🇸',
        'tts': '🇺🇸',
        'text-embedding': '🇺🇸',
        'openai': '🇺🇸',
        
        // Anthropic - USA
        'claude': '🇺🇸',
        'anthropic': '🇺🇸',
        
        // Google - USA
        'gemini': '🇺🇸',
        'gemma': '🇺🇸',
        'palm': '🇺🇸',
        'bard': '🇺🇸',
        'google': '🇺🇸',
        
        // Meta/Facebook - USA
        'llama': '🇺🇸',
        'meta': '🇺🇸',
        'facebook': '🇺🇸',
        
        // Mistral AI - France
        'mistral': '🇫🇷',
        'mixtral': '🇫🇷',
        'ministral': '🇫🇷',
        'codestral': '🇫🇷',
        'magistral': '🇫🇷',
        'pixtral': '🇫🇷',
        
        // Note: Berget AI is a Swedish API provider, not a model creator
        // Models hosted on Berget should use their actual creator's flag
        
        // Note: Groq is an API provider (hardware accelerator company)
        // Models hosted on Groq should use their actual creator's flag
        // Common Groq-hosted models:
        // - Llama models: Meta (USA)
        // - Mixtral/Mistral: Mistral AI (France)
        // - Gemma: Google (USA)
        
        // Groq-specific model naming (when Groq modifies/optimizes models)
        'compound': '🇺🇸', // Groq's compound models (USA-based company)
        
        // xAI (Elon Musk's company) - USA
        'grok': '🇺🇸',
        'xai': '🇺🇸',
        
        // DeepSeek - China
        'deepseek': '🇨🇳',
        
        // Alibaba/Qwen - China
        'qwen': '🇨🇳',
        'qwq': '🇨🇳',
        'alibaba': '🇨🇳',
        
        // Baidu - China
        'ernie': '🇨🇳',
        'baidu': '🇨🇳',
        
        // ByteDance - China
        'doubao': '🇨🇳',
        'bytedance': '🇨🇳',
        
        // Moonshot AI (Kimi) - China
        'moonshotai': '🇨🇳',
        'moonshot': '🇨🇳',
        'kimi': '🇨🇳',
        
        // 01.AI (Yi models) - China
        'yi-': '🇨🇳',
        '01-ai': '🇨🇳',
        
        // Zhipu AI (GLM models) - China
        'glm': '🇨🇳',
        'chatglm': '🇨🇳',
        'zhipu': '🇨🇳',
        
        // Cohere - Canada
        'cohere': '🇨🇦',
        'command': '🇨🇦',
        
        // AI21 Labs - Israel
        'j2-': '🇮🇱',
        'jurassic': '🇮🇱',
        'ai21': '🇮🇱',
        
        // Aleph Alpha - Germany
        'luminous': '🇩🇪',
        'aleph': '🇩🇪',
        
        // Stability AI - UK
        'stable': '🇬🇧',
        'stability': '🇬🇧',
        
        // Reka AI - USA/International
        'reka': '🇺🇸',
        
        // Inflection AI - USA
        'inflection': '🇺🇸',
        'pi-': '🇺🇸',
        
        // Nvidia - USA
        'nvidia': '🇺🇸',
        'nemotron': '🇺🇸',
        
        // Microsoft - USA
        'phi-': '🇺🇸',
        'orca': '🇺🇸',
        'microsoft': '🇺🇸',
        
        // Amazon - USA
        'titan': '🇺🇸',
        'amazon': '🇺🇸',
        'aws': '🇺🇸',
        
        // Cerebras - USA
        'cerebras': '🇺🇸',
        
        // Salesforce - USA
        'codegen': '🇺🇸',
        'salesforce': '🇺🇸',
        
        // EleutherAI - USA/International
        'gpt-j': '🇺🇸',
        'gpt-neo': '🇺🇸',
        'pythia': '🇺🇸',
        'eleuther': '🇺🇸',
        
        // Hugging Face - France/USA
        'bloom': '🇫🇷',
        'huggingface': '🇫🇷',
        
        // BigScience - International (led by France)
        'bigscience': '🇫🇷',
        
        // Technology Innovation Institute (UAE) - Falcon models
        'falcon': '🇦🇪',
        'tii': '🇦🇪',
        
        // NAVER - South Korea
        'hyperclova': '🇰🇷',
        'clova': '🇰🇷',
        'naver': '🇰🇷',
        
        // Kakao - South Korea
        'kogpt': '🇰🇷',
        'kakao': '🇰🇷',
        
        // Yandex - Russia
        'yandex': '🇷🇺',
        'yagpt': '🇷🇺',
        
        // Sber - Russia
        'rugpt': '🇷🇺',
        'sber': '🇷🇺',
        
        // BLOOM variants
        'bloomz': '🇫🇷',
        
        // WizardLM - USA (Microsoft research)
        'wizard': '🇺🇸',
        
        // Vicuna - USA (UC Berkeley)
        'vicuna': '🇺🇸',
        
        // Alpaca - USA (Stanford)
        'alpaca': '🇺🇸',
        
        // Dolly - USA (Databricks)
        'dolly': '🇺🇸',
        'databricks': '🇺🇸',
        
        // MPT - USA (MosaicML)
        'mpt-': '🇺🇸',
        'mosaic': '🇺🇸',
        
        // RedPajama - USA
        'redpajama': '🇺🇸',
        
        // StableLM - UK
        'stablelm': '🇬🇧',
        
        // Orca - USA (Microsoft)
        'orca': '🇺🇸',
        
        // Persimmon - USA (Adept)
        'persimmon': '🇺🇸',
        'adept': '🇺🇸',
        
        // Zephyr - USA (Hugging Face H4)
        'zephyr': '🇺🇸',
        
        // Saudi Arabia specific
        'allam': '🇸🇦',
        
        // Singapore
        'sea-lion': '🇸🇬',
        
        // Japan
        'rinna': '🇯🇵',
        'japanese-': '🇯🇵',
        'cyberagent': '🇯🇵',
        
        // India
        'bharat': '🇮🇳',
        'indic': '🇮🇳',
        
        // Indonesia
        'komodo': '🇮🇩',
        
        // Vietnam
        'vinai': '🇻🇳',
        'phobert': '🇻🇳',
        
        // Thailand
        'wangchan': '🇹🇭',
        'typhoon': '🇹🇭',
        
        // Australia
        'bilby': '🇦🇺',
        
        // PlayAI - USA
        'playai': '🇺🇸',
        
        // Together AI hosted models (use original creator's country)
        'together': '🇺🇸',
        
        // Replicate hosted models (use original creator's country)
        'replicate': '🇺🇸',
        
        // Perplexity - USA
        'perplexity': '🇺🇸',
        'pplx': '🇺🇸',
        
        // Writer - USA
        'palmyra': '🇺🇸',
        'writer': '🇺🇸',
        
        // Bittensor/Nous Research - International/USA
        'nous-': '🇺🇸',
        'hermes': '🇺🇸',
        'capybara': '🇺🇸',
        
        // OpenRouter models (meta-provider)
        'openrouter': '🇺🇸',
        
        // Compound models (typically Groq)
        'compound': '🇸🇦'
    };

    /**
     * Get country flag for a model based on its ID
     * @param {string} modelId - The model identifier
     * @returns {string} Country flag emoji or empty string if not found
     */
    function getModelFlag(modelId) {
        if (!modelId) return '';
        
        const lowerModelId = modelId.toLowerCase().trim();
        
        // Special case: MAI DS models get both Chinese and US flags
        // Check for various formats: "MAI DS", "MAI-DS", "MAI_DS", or just "MAI" followed by space/dash/underscore and "DS"
        // Also check if it contains the pattern anywhere in case there's a prefix
        if (lowerModelId.startsWith('mai ds') || 
            lowerModelId.startsWith('mai-ds') || 
            lowerModelId.startsWith('mai_ds') ||
            lowerModelId.includes('mai ds') ||
            lowerModelId.includes('mai-ds') ||
            lowerModelId.includes('mai_ds') ||
            lowerModelId.match(/mai[\s\-_]ds/i)) {
            return '🇨🇳🇺🇸';
        }
        
        // Check each pattern for a match
        for (const [pattern, flag] of Object.entries(MODEL_COUNTRY_PATTERNS)) {
            // Check if the model ID contains the pattern
            if (lowerModelId.includes(pattern.toLowerCase())) {
                return flag;
            }
        }
        
        // Special handling for models with organization prefix (e.g., "mistralai/Mixtral-8x7B")
        if (lowerModelId.includes('/')) {
            const parts = lowerModelId.split('/');
            const org = parts[0];
            const modelName = parts[1];
            
            // Check organization
            for (const [pattern, flag] of Object.entries(MODEL_COUNTRY_PATTERNS)) {
                if (org.includes(pattern.toLowerCase()) || modelName.includes(pattern.toLowerCase())) {
                    return flag;
                }
            }
        }
        
        // No match found
        return '';
    }

    /**
     * Get country code for a model (for text display instead of emoji)
     * @param {string} modelId - The model identifier
     * @returns {string} Country code or empty string if not found
     */
    function getModelCountryCode(modelId) {
        const flag = getModelFlag(modelId);
        
        // Map flags to country codes
        const flagToCode = {
            '🇺🇸': 'US',
            '🇫🇷': 'FR',
            '🇸🇪': 'SE',
            '🇸🇦': 'SA',
            '🇨🇳': 'CN',
            '🇨🇦': 'CA',
            '🇮🇱': 'IL',
            '🇩🇪': 'DE',
            '🇬🇧': 'GB',
            '🇦🇪': 'AE',
            '🇰🇷': 'KR',
            '🇷🇺': 'RU',
            '🇸🇬': 'SG',
            '🇯🇵': 'JP',
            '🇮🇳': 'IN',
            '🇮🇩': 'ID',
            '🇻🇳': 'VN',
            '🇹🇭': 'TH',
            '🇦🇺': 'AU'
        };
        
        return flagToCode[flag] || '';
    }

    /**
     * Format model name with country flag prefix
     * @param {string} modelId - The model identifier
     * @param {string} modelName - The display name of the model (optional)
     * @returns {string} Formatted model name with flag prefix
     */
    function formatModelWithFlag(modelId, modelName) {
        const displayName = modelName || modelId;
        
        // Check if the display name already has a flag (emoji at the beginning)
        // Flags are 4-byte Unicode sequences that appear as 2 characters
        // Updated pattern to handle both single flags and double flags (like 🇨🇳🇺🇸)
        const flagPattern = /^([\u{1F1E6}-\u{1F1FF}][\u{1F1E6}-\u{1F1FF}]){1,2}\s/u;
        if (flagPattern.test(displayName)) {
            // Already has a flag, return as-is
            return displayName;
        }
        
        // Try to get flag using model ID first
        let flag = getModelFlag(modelId);
        
        // If no flag found and display name is different from model ID, also try with display name
        // This handles cases where the display name might have the identifying pattern
        if (!flag && displayName && displayName !== modelId) {
            flag = getModelFlag(displayName);
        }
        
        if (flag) {
            return `${flag} ${displayName}`;
        }
        
        return displayName;
    }

    /**
     * Check if a model is from a specific country
     * @param {string} modelId - The model identifier
     * @param {string} countryCode - Two-letter country code (e.g., 'US', 'FR')
     * @returns {boolean} True if the model is from the specified country
     */
    function isModelFromCountry(modelId, countryCode) {
        return getModelCountryCode(modelId) === countryCode.toUpperCase();
    }

    // Public API
    return {
        getModelFlag: getModelFlag,
        getModelCountryCode: getModelCountryCode,
        formatModelWithFlag: formatModelWithFlag,
        isModelFromCountry: isModelFromCountry
    };
})();