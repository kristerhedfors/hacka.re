/**
 * API Key Detector Utility
 * Detects the provider type based on API key patterns
 */

window.ApiKeyDetector = (function() {
    /**
     * API key patterns for different providers
     */
    var API_KEY_PATTERNS = {
        openai: {
            pattern: /^sk-proj-[A-Za-z0-9\-_]{50,}$/,
            providerValue: 'openai',
            providerName: 'OpenAI',
            defaultModel: 'gpt-4.1-mini'
        },
        groqcloud: {
            pattern: /^gsk_[A-Za-z0-9]{32,}$/,
            providerValue: 'groq',
            providerName: 'GroqCloud',
            defaultModel: 'moonshotai/kimi-k2-instruct'
        },
        berget: {
            pattern: /^sk_ber_[A-Za-z0-9\-_]{30,}$/,
            providerValue: 'berget',
            providerName: 'Berget.AI',
            defaultModel: 'mistralai/Magistral-Small-2506'
        }
    };

    /**
     * Detect the provider type from an API key
     * @param {string} apiKey - The API key to analyze
     * @returns {Object|null} Provider information or null if not detected
     */
    function detectProvider(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return null;
        }

        // Trim whitespace
        var trimmedKey = apiKey.trim();

        // Check each provider pattern
        for (var providerKey in API_KEY_PATTERNS) {
            if (API_KEY_PATTERNS.hasOwnProperty(providerKey)) {
                var config = API_KEY_PATTERNS[providerKey];
                if (config.pattern.test(trimmedKey)) {
                    return {
                        provider: config.providerValue,
                        providerName: config.providerName,
                        defaultModel: config.defaultModel,
                        detected: true
                    };
                }
            }
        }

        return null;
    }

    /**
     * Check if an API key matches a specific provider
     * @param {string} apiKey - The API key to check
     * @param {string} provider - The provider to check against
     * @returns {boolean} True if the key matches the provider pattern
     */
    function isProviderKey(apiKey, provider) {
        var detection = detectProvider(apiKey);
        return detection && detection.provider === provider;
    }

    /**
     * Get all supported providers
     * @returns {Array} Array of provider information
     */
    function getSupportedProviders() {
        var providers = [];
        for (var key in API_KEY_PATTERNS) {
            if (API_KEY_PATTERNS.hasOwnProperty(key)) {
                var config = API_KEY_PATTERNS[key];
                providers.push({
                    key: key,
                    value: config.providerValue,
                    name: config.providerName
                });
            }
        }
        return providers;
    }

    // Public API
    return {
        detectProvider: detectProvider,
        isProviderKey: isProviderKey,
        getSupportedProviders: getSupportedProviders
    };
})();