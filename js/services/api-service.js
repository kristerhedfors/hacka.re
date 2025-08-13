/**
 * API Service
 * Handles API interactions with AI model providers
 * Refactored to use specialized modules for better maintainability
 */

window.ApiService = (function() {

    /**
     * Fetch available models from the API
     * @param {string} apiKey - The API key for authentication
     * @param {string} customBaseUrl - Optional custom base URL to use for this request
     * @returns {Promise<Array>} - Promise resolving to array of available models
     */
    async function fetchAvailableModels(apiKey, customBaseUrl = null) {
        const timer = ApiDebugger.createTimer('fetchAvailableModels');
        
        try {
            // Build request configuration
            const requestConfig = ApiRequestBuilder.buildModelsRequest({
                apiKey: apiKey,
                baseUrl: customBaseUrl
            });
            
            ApiDebugger.logRequest('Models API', requestConfig);
            
            // Make the request
            const response = await fetch(requestConfig.url, {
                method: requestConfig.method,
                headers: requestConfig.headers
            });
            
            // Parse response
            const parsedResponse = await ApiResponseParser.parseResponse(response);
            ApiDebugger.logResponse(response, parsedResponse.data);
            
            // Extract and validate models
            const models = ApiResponseParser.parseModelsResponse(parsedResponse.data);
            
            // Store model information in ModelInfoService
            if (window.ModelInfoService && models && Array.isArray(models)) {
                models.forEach(model => {
                    if (model.id) {
                        ModelInfoService.modelInfo[model.id] = model._original || model;
                    }
                });
            }
            
            timer.stop({ modelCount: models.length });
            return models.map(m => m._original || m); // Return original format for compatibility
            
        } catch (error) {
            ApiDebugger.logError('fetchAvailableModels', error, { customBaseUrl });
            timer.stop();
            throw error;
        }
    }

/**
 * Generate a chat completion from the API
 * @param {string} apiKey - The API key for authentication
 * @param {string} model - The model ID to use
 * @param {Array} messages - Array of chat messages
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @param {Function} onChunk - Callback function for handling streaming chunks
 * @param {string} systemPrompt - Optional system prompt to prepend to messages
 * @param {Object} apiToolsManager - Optional API tools manager for tool calling
 * @param {Function} addSystemMessage - Optional callback to add a system message
 * @returns {Promise<string>} - Promise resolving to the complete AI response
 */
async function generateChatCompletion(apiKey, model, messages, signal, onChunk, systemPrompt, apiToolsManager, addSystemMessage) {
    const timer = ApiDebugger.createTimer('generateChatCompletion');
    
    try {
        // Build initial request
        const requestConfig = ApiRequestBuilder.buildChatCompletionRequest({
            apiKey,
            model,
            messages,
            systemPrompt,
            apiToolsManager
        });
        
        ApiDebugger.logRequest('Chat Completion', requestConfig, requestConfig.requestBody);
        
        // Debug logging
        if (window.DebugService && window.DebugService.debugLog) {
            window.DebugService.debugLog('api', `🚀 Starting chat completion with model: ${model}`);
        }
        
        // Show debug information about tools if enabled
        if (apiToolsManager && addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
            showToolsDebugInfo(apiToolsManager, addSystemMessage);
        }
        
        // Make the initial request
        const response = await fetch(requestConfig.url, {
            method: requestConfig.method,
            headers: requestConfig.headers,
            body: requestConfig.body,
            signal: signal
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error connecting to API');
        }
        
        // Process the stream
        const { reader } = await ApiStreamProcessor.createReadableStream(response, signal);
        
        return await processStreamWithToolCalls(
            reader,
            apiToolsManager,
            addSystemMessage,
            onChunk,
            requestConfig,
            signal,
            timer
        );
        
    } catch (error) {
        // Don't log AbortError as an error - it's expected when user cancels generation
        if (error.name === 'AbortError') {
            ApiDebugger.logInfo('generateChatCompletion', 'Request cancelled by user');
        } else {
            ApiDebugger.logError('generateChatCompletion', error);
        }
        timer.stop();
        throw error;
    }
}
    
    
    /**
     * Process streaming response with tool call handling
     * @private
     */
    async function processStreamWithToolCalls(reader, apiToolsManager, addSystemMessage, onChunk, initialRequestConfig, signal, timer) {
        let completeResponse = '';
        
        // Process the initial stream
        const streamResult = await ApiStreamProcessor.processStream(
            reader,
            (content) => {
                completeResponse = content;
                if (onChunk) {
                    onChunk(content);
                }
            },
            (toolCalls) => {
                ApiDebugger.logToolCall('Tool calls received', { count: toolCalls.length });
            },
            signal
        );
        
        completeResponse = streamResult.content;
        const toolCalls = streamResult.toolCalls;
        
        // Process tool calls if any were received
        if (toolCalls.length > 0 && apiToolsManager) {
            ApiDebugger.logToolCall('Processing tool calls', { count: toolCalls.length });
            
            const toolResult = await ApiToolCallHandler.processToolCalls(
                toolCalls,
                apiToolsManager,
                addSystemMessage,
                onChunk,
                completeResponse
            );
            
            completeResponse = toolResult.content;
            const toolResults = toolResult.toolResults;
            
            // If we have tool results, make a follow-up request
            if (toolResults && toolResults.length > 0) {
                ApiDebugger.logToolCall('Making follow-up request', { resultsCount: toolResults.length });
                
                const followUpResult = await makeFollowUpRequest(
                    initialRequestConfig,
                    toolCalls,
                    toolResults,
                    completeResponse,
                    onChunk,
                    signal
                );
                
                completeResponse = followUpResult;
            }
        }
        
        timer.stop({ hasToolCalls: toolCalls.length > 0 });
        return completeResponse;
    }
    
    /**
     * Make follow-up request after tool calls
     * @private
     */
    async function makeFollowUpRequest(initialRequestConfig, toolCalls, toolResults, currentContent, onChunk, signal) {
        // Build messages array with tool calls and results
        const messages = JSON.parse(initialRequestConfig.body).messages;
        
        const followUpRequestConfig = ApiRequestBuilder.buildFollowUpRequest({
            apiKey: extractApiKeyFromHeaders(initialRequestConfig.headers),
            model: JSON.parse(initialRequestConfig.body).model,
            messages: messages,
            toolCalls: toolCalls,
            toolResults: toolResults
        });
        
        ApiDebugger.logRequest('Follow-up request', followUpRequestConfig);
        
        const response = await fetch(followUpRequestConfig.url, {
            method: followUpRequestConfig.method,
            headers: followUpRequestConfig.headers,
            body: followUpRequestConfig.body,
            signal: signal
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error connecting to API for follow-up');
        }
        
        // Process follow-up stream
        const { reader } = await ApiStreamProcessor.createReadableStream(response, signal);
        
        let followUpContent = '';
        await ApiStreamProcessor.processStream(
            reader,
            (content) => {
                followUpContent = content;
                if (onChunk) {
                    // Combine with current content and trim whitespace
                    onChunk(currentContent + content.trimStart());
                }
            },
            null, // No tool calls expected in follow-up
            signal
        );
        
        return currentContent + followUpContent.trimStart();
    }
    
    /**
     * Show debug information about available tools
     * @private
     */
    function showToolsDebugInfo(apiToolsManager, addSystemMessage) {
        const toolDefinitions = apiToolsManager.getEnabledToolDefinitions();
        if (!toolDefinitions || toolDefinitions.length === 0) {
            return;
        }
        
        addSystemMessage("Debug mode: Tools declared in this chat API invocation");
        
        // Log the sources of tool definitions
        console.log("Tool definitions sources:");
        console.log("- Built-in tools:", Object.keys(ApiToolsService.getBuiltInTools()).length);
        console.log("- User functions:", FunctionToolsService ? FunctionToolsService.getEnabledToolDefinitions().length : 0);
        
        // Add each tool as separate messages
        toolDefinitions.forEach((tool, index) => {
            let toolMessage = `Tool #${index + 1}: ${tool.function?.name || 'unnamed'}\n`;
            toolMessage += `Type: ${tool.type || 'unknown'}\n`;
            
            if (tool.function) {
                toolMessage += `Description: ${tool.function.description || 'No description'}\n`;
                
                if (tool.function.parameters) {
                    toolMessage += `Parameters:\n`;
                    
                    if (tool.function.parameters.properties) {
                        const properties = tool.function.parameters.properties;
                        Object.keys(properties).forEach(paramName => {
                            const param = properties[paramName];
                            toolMessage += `  - ${paramName} (${param.type || 'any'}): ${param.description || 'No description'}\n`;
                            if (param.enum) {
                                toolMessage += `    Allowed values: ${param.enum.join(', ')}\n`;
                            }
                        });
                    }
                    
                    if (tool.function.parameters.required && tool.function.parameters.required.length > 0) {
                        toolMessage += `Required parameters: ${tool.function.parameters.required.join(', ')}`;
                    }
                }
            }
            
            // Use the debug service function to display multiline debug message
            if (typeof DebugService.displayMultilineDebug === 'function') {
                DebugService.displayMultilineDebug(toolMessage, addSystemMessage);
            } else {
                addSystemMessage(toolMessage);
            }
        });
    }
    
    /**
     * Extract API key from request headers
     * @private
     */
    function extractApiKeyFromHeaders(headers) {
        const authHeader = headers['Authorization'] || headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }

    // Public API
    return {
        fetchAvailableModels: fetchAvailableModels,
        generateChatCompletion: generateChatCompletion
    };
})();
