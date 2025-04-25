/**
 * API Service
 * Handles API interactions with AI model providers
 */

window.ApiService = (function() {
    // Flag to track if tool calling is enabled
    let toolCallingEnabled = false;
    // Get base URL from settings
    function getBaseUrl() {
        const baseUrl = StorageService.getBaseUrl();
        // Ensure we never return null or undefined
        if (!baseUrl || baseUrl === 'null' || baseUrl === 'undefined') {
            return StorageService.getDefaultBaseUrlForProvider('groq'); // Default to Groq if no base URL is set
        }
        return baseUrl;
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
        if (customBaseUrl && customBaseUrl !== 'null' && customBaseUrl !== 'undefined') {
            // Use the custom base URL if provided and valid
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
     * @param {boolean} enableToolCalling - Whether to enable tool calling
     * @returns {Promise<string>} - Promise resolving to the complete AI response
     */
    async function generateChatCompletion(apiKey, model, messages, signal, onChunk, systemPrompt, enableToolCalling = false) {
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
        
        // Set the tool calling flag
        toolCallingEnabled = enableToolCalling;
        
        // Prepare request body
        const requestBody = {
            model: model,
            messages: apiMessages,
            stream: true
        };
        
        // Add tools if tool calling is enabled and tools are available
        if (enableToolCalling && window.ApiToolsService) {
            const tools = ApiToolsService.formatToolsForOpenAI();
            if (tools && tools.length > 0) {
                requestBody.tools = tools;
                requestBody.tool_choice = "auto";
            }
        }
        
        const response = await fetch(getEndpointUrl('CHAT'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
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
        let toolCalls = [];
        let currentToolCall = null;
        
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
                        const delta = data.choices[0]?.delta || {};
                        
                        // Handle content
                        if (delta.content) {
                            completeResponse += delta.content;
                            if (onChunk) {
                                onChunk(completeResponse);
                            }
                        }
                        
                        // Handle tool calls
                        if (delta.tool_calls && delta.tool_calls.length > 0) {
                            const toolCallDelta = delta.tool_calls[0];
                            
                            // Initialize a new tool call if we get an index
                            if (toolCallDelta.index !== undefined) {
                                if (!toolCalls[toolCallDelta.index]) {
                                    toolCalls[toolCallDelta.index] = {
                                        id: toolCallDelta.id || "",
                                        type: "function",
                                        function: {
                                            name: "",
                                            arguments: ""
                                        }
                                    };
                                }
                                currentToolCall = toolCalls[toolCallDelta.index];
                            }
                            
                            // Update the current tool call with new data
                            if (currentToolCall) {
                                if (toolCallDelta.id) {
                                    currentToolCall.id = toolCallDelta.id;
                                }
                                
                                if (toolCallDelta.function) {
                                    if (toolCallDelta.function.name) {
                                        currentToolCall.function.name += toolCallDelta.function.name;
                                    }
                                    if (toolCallDelta.function.arguments) {
                                        currentToolCall.function.arguments += toolCallDelta.function.arguments;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing SSE:', e);
                    }
                }
            }
        }
        
        // Process tool calls if any were received
        if (toolCallingEnabled && toolCalls.length > 0 && window.ApiToolsService) {
            // Add a system message indicating tool usage
            completeResponse += "\n\n_Using tools to process your request..._\n\n";
            if (onChunk) {
                onChunk(completeResponse);
            }
            
            try {
                // Process the tool calls
                const toolResults = await ApiToolsService.processToolCalls(toolCalls, apiKey);
                
                if (toolResults.length > 0) {
                    // Create a new messages array with the original messages plus tool results
                    const messagesWithToolResults = [...apiMessages];
                    
                    // Add the assistant's response with tool calls
                    messagesWithToolResults.push({
                        role: "assistant",
                        content: null,
                        tool_calls: toolCalls
                    });
                    
                    // Add the tool results
                    messagesWithToolResults.push(...toolResults);
                    
                    // Make a second request to get the final response
                    const finalResponse = await fetch(getEndpointUrl('CHAT'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: messagesWithToolResults,
                            stream: true
                        }),
                        signal: signal
                    });
                    
                    if (!finalResponse.ok) {
                        throw new Error('Failed to get final response after tool calls');
                    }
                    
                    // Process the final response stream
                    const finalReader = finalResponse.body.getReader();
                    let finalCompleteResponse = completeResponse;
                    
                    while (true) {
                        const { done, value } = await finalReader.read();
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
                                        finalCompleteResponse += content;
                                        if (onChunk) {
                                            onChunk(finalCompleteResponse);
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error parsing SSE in final response:', e);
                                }
                            }
                        }
                    }
                    
                    return finalCompleteResponse;
                }
            } catch (error) {
                console.error('Error processing tool calls:', error);
                completeResponse += `\n\nError processing tool calls: ${error.message}`;
                if (onChunk) {
                    onChunk(completeResponse);
                }
            }
        }
        
        return completeResponse;
    }

    /**
     * Check if a model supports tool calling
     * @param {string} modelId - The model ID to check
     * @returns {boolean} Whether the model supports tool calling
     */
    function modelSupportsToolCalling(modelId) {
        // List of models known to support tool calling
        const toolCallingModels = [
            // OpenAI models
            'gpt-4', 'gpt-4-turbo', 'gpt-4-1106-preview', 'gpt-4-0125-preview', 'gpt-4-0613',
            'gpt-3.5-turbo', 'gpt-3.5-turbo-1106', 'gpt-3.5-turbo-0125',
            
            // Claude models
            'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
            
            // Llama models that support tool calling
            'llama-3', 'llama-3-70b', 'llama-3-8b',
            
            // Mistral models
            'mistral-large', 'mistral-medium'
        ];
        
        // Check if the model ID contains any of the tool calling model names
        return toolCallingModels.some(model => 
            modelId.toLowerCase().includes(model.toLowerCase())
        );
    }
    
    // Public API
    return {
        fetchAvailableModels: fetchAvailableModels,
        generateChatCompletion: generateChatCompletion,
        modelSupportsToolCalling: modelSupportsToolCalling
    };
})();
