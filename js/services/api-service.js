/**
 * API Service
 * Handles API interactions with GroqCloud
 */

window.ApiService = (function() {
    // API endpoints
    const ENDPOINTS = {
        CHAT: 'https://api.groq.com/openai/v1/chat/completions',
        MODELS: 'https://api.groq.com/openai/v1/models'
    };

    /**
     * Fetch available models from the API
     * @param {string} apiKey - The API key for authentication
     * @returns {Promise<Array>} - Promise resolving to array of available models
     */
    async function fetchAvailableModels(apiKey) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        const response = await fetch(ENDPOINTS.MODELS, {
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
     * @returns {Promise<string>} - Promise resolving to the complete AI response
     */
    async function generateChatCompletion(apiKey, model, messages, signal, onChunk) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        const response = await fetch(ENDPOINTS.CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true
            }),
            signal: signal
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error connecting to GroqCloud API');
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
