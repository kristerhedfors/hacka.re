/**
 * API Service
 * Handles API interactions with AI model providers
 */

window.ApiService = (function() {
    // Get base URL from settings
    function getBaseUrl() {
        return StorageService.getBaseUrl();
    }
    
    // API endpoint paths (relative to the base URL)
    const ENDPOINT_PATHS = {
        CHAT: 'chat/completions',
        MODELS: 'models'
    };
    
    // Get full endpoint URL
    function getEndpointUrl(endpoint) {
        const baseUrl = getBaseUrl();
        // Ensure the base URL ends with a slash and the endpoint path doesn't start with a slash
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        return `${normalizedBaseUrl}${ENDPOINT_PATHS[endpoint]}`;
    }

    /**
     * Fetch available models from the API
     * @param {string} apiKey - The API key for authentication
     * @param {string} customBaseUrl - Optional custom base URL to use for this request
     * @returns {Promise<Array>} - Promise resolving to array of available models
     */
    async function fetchAvailableModels(apiKey, customBaseUrl = null) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        // Determine which base URL to use
        let endpointUrl;
        if (customBaseUrl) {
            // Use the custom base URL if provided
            const normalizedBaseUrl = customBaseUrl.endsWith('/') ? customBaseUrl : `${customBaseUrl}/`;
            endpointUrl = `${normalizedBaseUrl}${ENDPOINT_PATHS.MODELS}`;
        } else {
            // Otherwise use the default endpoint URL
            endpointUrl = getEndpointUrl('MODELS');
        }
        
        const response = await fetch(endpointUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        
        const data = await response.json();
        return data.data;
    }

    /**
     * Generate a chat completion from the API
     * @param {string} apiKey - The API key for authentication
     * @param {string} model - The model ID to use
     * @param {Array} messages - Array of chat messages
     * @param {AbortSignal} signal - AbortController signal for cancellation
     * @param {Function} onChunk - Callback function for handling streaming chunks
     * @param {string} systemPrompt - Optional system prompt to prepend to messages
     * @returns {Promise<string>} - Promise resolving to the complete AI response
     */
    async function generateChatCompletion(apiKey, model, messages, signal, onChunk, systemPrompt) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        // Create a copy of the messages array to avoid modifying the original
        let apiMessages = [...messages];
        
        // Add system prompt if provided
        if (systemPrompt && systemPrompt.trim()) {
            apiMessages.unshift({
                role: 'system',
                content: systemPrompt
            });
        }
        
        const response = await fetch(getEndpointUrl('CHAT'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: apiMessages,
                stream: true
            }),
            signal: signal
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error connecting to API');
        }
        
        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let completeResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Decode chunk
            const chunk = decoder.decode(value);
            
            // Process SSE format
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.substring(6));
                        const content = data.choices[0]?.delta?.content || '';
                        if (content) {
                            completeResponse += content;
                            if (onChunk) {
                                onChunk(completeResponse);
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing SSE:', e);
                    }
                }
            }
        }
        
        return completeResponse;
    }

    // Public API
    return {
        fetchAvailableModels: fetchAvailableModels,
        generateChatCompletion: generateChatCompletion
    };
})();
