/**
 * API Service
 * Handles API interactions with AI model providers
 */

window.ApiService = (function() {
    // Get base URL from settings
    function getBaseUrl() {
        // Debug logging for provider
        const provider = StorageService.getBaseUrlProvider();
        console.log('[API Debug] getBaseUrl called, provider:', provider);
        
        // For all providers, use the standard base URL
        const baseUrl = StorageService.getBaseUrl();
        console.log('[API Debug] Standard base URL from storage:', baseUrl);
        
        // Ensure we never return null or undefined
        if (!baseUrl || baseUrl === 'null' || baseUrl === 'undefined') {
            // Get the current provider and use its default URL
            const currentProvider = StorageService.getBaseUrlProvider();
            const defaultUrl = StorageService.getDefaultBaseUrlForProvider(currentProvider);
            console.log(`[API Debug] Using default URL for ${currentProvider}:`, defaultUrl);
            return defaultUrl;
        }
        
        console.log('[API Debug] Using base URL:', baseUrl);
        return baseUrl;
    }
    
    // API endpoint paths (relative to the base URL)
    const ENDPOINT_PATHS = {
        CHAT: 'chat/completions',
        MODELS: 'models'
    };
    
    
    // Get full endpoint URL
    function getEndpointUrl(endpoint) {
        // Standard OpenAI-compatible API
        const baseUrl = getBaseUrl();
        // Ensure the base URL ends with a slash and the endpoint path doesn't start with a slash
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        const url = `${normalizedBaseUrl}${ENDPOINT_PATHS[endpoint]}`;
        
        // Debug logging for standard API URL
        console.log(`[API Debug] Constructed ${endpoint} URL: ${url}`);
        
        return url;
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
        
        // Debug logging for input parameters
        console.log('[API Debug] fetchAvailableModels called with:', {
            apiKey: apiKey ? '***' : null, // Don't log the actual API key
            customBaseUrl: customBaseUrl,
            provider: StorageService.getBaseUrlProvider()
        });
        
        // Determine which base URL to use
        let endpointUrl;
        if (customBaseUrl && customBaseUrl !== 'null' && customBaseUrl !== 'undefined') {
            // For standard OpenAI-compatible API with custom base URL
            const normalizedBaseUrl = customBaseUrl.endsWith('/') ? customBaseUrl : `${customBaseUrl}/`;
            endpointUrl = `${normalizedBaseUrl}${ENDPOINT_PATHS.MODELS}`;
            console.log('[API Debug] Using custom base URL:', customBaseUrl);
        } else {
            // Otherwise use the default endpoint URL
            endpointUrl = getEndpointUrl('MODELS');
            console.log('[API Debug] Using default endpoint URL from getEndpointUrl');
        }
        
        // Debug logging for final endpoint URL
        console.log('[API Debug] Final models endpoint URL:', endpointUrl);
        
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
        
        // Standard OpenAI-compatible API returns models in data.data
        const models = data.data;
        
        // Store model information in ModelInfoService
        if (window.ModelInfoService && models && Array.isArray(models)) {
            models.forEach(model => {
                if (model.id) {
                    // Store the entire model object in modelInfo
                    ModelInfoService.modelInfo[model.id] = model;
                }
            });
        }
        
        return models;
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
    if (!apiKey) {
        throw new Error('API key is required');
    }
    
    // Initialize response variables
    let completeResponse = '';
    let toolCalls = [];
    
    // Create a copy of the messages array to avoid modifying the original
    let apiMessages = [...messages];
    
    // Add system prompt if provided
    if (systemPrompt && systemPrompt.trim()) {
        apiMessages.unshift({
            role: 'system',
            content: systemPrompt
        });
    }
    
    // Prepare request body
    const requestBody = {
        messages: apiMessages,
        stream: true,
        model: model
    };
    
    // Add tools if tool calling is enabled and apiToolsManager is provided
    if (apiToolsManager) {
        const toolDefinitions = apiToolsManager.getToolDefinitions();
        if (toolDefinitions && toolDefinitions.length > 0) {
            requestBody.tools = toolDefinitions;
            requestBody.tool_choice = "auto";
            
                // Debug mode: Print all tools declared in the chat API invocation
                if (addSystemMessage && toolDefinitions.length > 0 && window.DebugService && DebugService.getDebugMode()) {
                    let debugMessage = "Debug mode: Tools declared in this chat API invocation";
                    
                    // Add header as a separate message
                    addSystemMessage(debugMessage);
                    
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
                            // Fallback if displayMultilineDebug is not available
                            addSystemMessage(toolMessage);
                        }
                    });
                }
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
    
    // Set up streaming response processing
    // Use a more efficient approach that processes chunks immediately
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    
    // Process the stream directly without additional ReadableStream wrapper
    while (true) {
        try {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete SSE messages
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.substring(6));
                        const delta = data.choices[0]?.delta || {};
                        
                        // Handle content updates
                        if (delta.content) {
                            completeResponse += delta.content;
                            if (onChunk) {
                                // Use requestAnimationFrame to avoid blocking the main thread
                                // This ensures smoother token display
                                window.requestAnimationFrame(() => {
                                    onChunk(completeResponse);
                                });
                            }
                        }
                        
                        // Handle tool calls
                        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                            // Process each tool call delta
                            for (const toolCallDelta of delta.tool_calls) {
                                if (!toolCallDelta) continue;
                                
                                const index = toolCallDelta.index;
                                const id = toolCallDelta.id || '';
                                const funcDelta = toolCallDelta.function || {};
                                
                                // Skip if index is undefined
                                if (index === undefined) continue;
                                
                                // Initialize tool call if it doesn't exist
                                if (!toolCalls[index]) {
                                    toolCalls[index] = {
                                        id: id,
                                        type: 'function',
                                        function: {
                                            name: '',
                                            arguments: ''
                                        }
                                    };
                                }
                                
                                // Update tool call with delta information
                                if (id) toolCalls[index].id = id;
                                
                                if (funcDelta) {
                                    if (funcDelta.name) {
                                        toolCalls[index].function.name = 
                                            (toolCalls[index].function.name || '') + funcDelta.name;
                                        
                                        // If this is the first time we're seeing the name, insert a function call marker
                                        if (toolCalls[index].function.name === funcDelta.name) {
                                            // Insert a marker in the response to indicate a function call
                                            const functionCallMarker = `[FUNCTION_CALL:${funcDelta.name}]`;
                                            completeResponse += functionCallMarker;
                                            if (onChunk) {
                                                window.requestAnimationFrame(() => {
                                                    onChunk(completeResponse);
                                                });
                                            }
                                        }
                                    }
                                    
                                    if (funcDelta.arguments) {
                                        // Log the incoming arguments delta for debugging
                                        console.log(`Tool call delta arguments for index ${index}:`, funcDelta.arguments);
                                        
                                        // Concatenate the arguments
                                        toolCalls[index].function.arguments = 
                                            (toolCalls[index].function.arguments || '') + funcDelta.arguments;
                                        
                                        // Log the current state of the arguments
                                        console.log(`Current tool call arguments for index ${index}:`, toolCalls[index].function.arguments);
                                        
                                        // Try to parse the arguments as JSON to check if they're valid
                                        try {
                                            JSON.parse(toolCalls[index].function.arguments);
                                            console.log(`Valid JSON arguments for index ${index}`);
                                        } catch (e) {
                                            console.log(`Invalid JSON arguments for index ${index}, still receiving deltas`);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing SSE:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error reading SSE stream:', error);
            break;
        }
    }
    
    // Process tool calls if any were received and apiToolsManager is provided
    if (toolCalls.length > 0 && apiToolsManager) {
        console.log("[API Debug] Processing tool calls");
        console.log("[API Debug] - Tool calls count:", toolCalls.length);
        console.log("[API Debug] - Tool calls data:", toolCalls);
        console.log("[API Debug] - apiToolsManager available:", !!apiToolsManager);
        console.log("[API Debug] - addSystemMessage callback:", typeof addSystemMessage);
        
        try {
                // Only show function call information in debug mode
                if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                    console.log("[API Debug] - addSystemMessage callback available, checking debug mode");
                    console.log("[API Debug] - DebugService available:", !!window.DebugService);
                    console.log("[API Debug] - Debug mode enabled:", window.DebugService ? DebugService.getDebugMode() : false);
                    
                    console.log("[API Debug] - Adding debug system messages for tool calls");
                    
                    // Add header message
                    addSystemMessage(`Received ${toolCalls.length} tool call(s) from the AI`);
                    
                    addSystemMessage(`(Debug mode: Showing detailed tool call information)`);
                
                    // Add details for each tool call as separate messages
                    toolCalls.forEach((toolCall, index) => {
                        console.log(`[API Debug] - Processing tool call ${index + 1} for debug display:`, toolCall);
                        
                        let toolCallMessage = `Tool #${index + 1}:\n`;
                        toolCallMessage += `- Name: ${toolCall.function.name}\n`;
                        toolCallMessage += `- ID: ${toolCall.id}\n`;
                        
                        // Format the arguments as JSON on a single line
                        try {
                            const args = JSON.parse(toolCall.function.arguments);
                            const formattedArgs = JSON.stringify(args);
                            
                            console.log(`[API Debug] - Tool call ${index + 1} parsed arguments:`, args);
                            console.log(`[API Debug] - Tool call ${index + 1} formatted arguments:`, formattedArgs);
                            
                            // Add function call in the requested format
                            addSystemMessage(`Function call requested by model: ${toolCall.function.name}(${formattedArgs})`);
                        
                        // Add the tool info
                        if (typeof DebugService.displayMultilineDebug === 'function') {
                            console.log(`[API Debug] - Using DebugService.displayMultilineDebug for tool call ${index + 1}`);
                            DebugService.displayMultilineDebug(toolCallMessage, addSystemMessage);
                        } else {
                            console.log(`[API Debug] - Using fallback display for tool call ${index + 1}`);
                            // Fallback if displayMultilineDebug is not available
                            toolCallMessage += `- Arguments: ${formattedArgs}`;
                            addSystemMessage(toolCallMessage);
                        }
                    } catch (e) {
                        console.error(`[API Debug] - Error parsing tool call ${index + 1} arguments:`, e);
                        
                        // If parsing fails, just show the raw arguments
                        toolCallMessage += `- Arguments: ${toolCall.function.arguments}`;
                        
                        // Use the debug service
                        if (typeof DebugService.displayMultilineDebug === 'function') {
                            DebugService.displayMultilineDebug(toolCallMessage, addSystemMessage);
                        } else {
                            // Fallback if displayMultilineDebug is not available
                            addSystemMessage(toolCallMessage);
                        }
                    }
                });
            } else {
                console.log("[API Debug] - Not showing function call details (debug mode disabled or callback unavailable)");
            }
            
            console.log("[API Debug] - Starting tool call argument fixing");
            
            // Before processing, try to fix any issues with the tool call arguments
            for (let i = 0; i < toolCalls.length; i++) {
                const toolCall = toolCalls[i];
                console.log(`[API Debug] - Checking tool call ${i + 1} for argument fixes:`, toolCall);
                
                if (toolCall.function && toolCall.function.arguments) {
                    console.log(`[API Debug] - Tool call ${i + 1} has function and arguments`);
                    console.log(`[API Debug] - Tool call ${i + 1} function name:`, toolCall.function.name);
                    console.log(`[API Debug] - Tool call ${i + 1} raw arguments:`, toolCall.function.arguments);
                    
                    try {
                        // Try to parse the arguments as JSON
                        const args = JSON.parse(toolCall.function.arguments);
                        console.log(`[API Debug] - Tool call ${i + 1} parsed arguments:`, args);
                        
                        // Check if this is the math_addition_tool and if the arguments are strings
                        if (toolCall.function.name === 'math_addition_tool') {
                            console.log(`[API Debug] - Tool call ${i + 1} is math_addition_tool, checking for fixes`);
                            
                            // Save the original arguments for comparison
                            const originalArgs = JSON.parse(JSON.stringify(args));
                            console.log(`[API Debug] - Tool call ${i + 1} original arguments:`, originalArgs);
                            
                            // Convert string numbers to actual numbers
                            if (args.a && typeof args.a === 'string') {
                                console.log(`[API Debug] - Converting 'a' from string "${args.a}" to number`);
                                args.a = parseFloat(args.a);
                            }
                            if (args.b && typeof args.b === 'string') {
                                console.log(`[API Debug] - Converting 'b' from string "${args.b}" to number`);
                                args.b = parseFloat(args.b);
                            }
                            
                            // Remove any unexpected arguments (like 'c')
                            const validKeys = ['a', 'b'];
                            Object.keys(args).forEach(key => {
                                if (!validKeys.includes(key)) {
                                    console.log(`[API Debug] - Removing unexpected argument '${key}' from math_addition_tool`);
                                    delete args[key];
                                }
                            });
                            
                            // Update the tool call arguments with the fixed version
                            toolCall.function.arguments = JSON.stringify(args);
                            console.log(`[API Debug] - Fixed arguments for math_addition_tool:`, args);
                            console.log(`[API Debug] - Updated tool call arguments string:`, toolCall.function.arguments);
                            
                            // Add a system message to show that we've fixed the arguments
                            if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                                console.log(`[API Debug] - Adding debug messages for argument fixes`);
                                
                                // Add header message
                                addSystemMessage(`Fixed arguments for math_addition_tool:`);
                                
                                // Show the original arguments on a single line
                                const originalArgsFormatted = JSON.stringify(originalArgs);
                                addSystemMessage(`Original arguments: ${originalArgsFormatted}`);
                                
                                // Show the fixed arguments on a single line
                                const fixedArgsFormatted = JSON.stringify(args);
                                addSystemMessage(`Fixed arguments: ${fixedArgsFormatted}`);
                                
                                // Add explanation of what was fixed
                                const changes = [];
                                if (typeof originalArgs.a === 'string' && typeof args.a === 'number') {
                                    changes.push(`Converted 'a' from string "${originalArgs.a}" to number ${args.a}`);
                                }
                                if (typeof originalArgs.b === 'string' && typeof args.b === 'number') {
                                    changes.push(`Converted 'b' from string "${originalArgs.b}" to number ${args.b}`);
                                }
                                
                                // Check for removed arguments
                                Object.keys(originalArgs).forEach(key => {
                                    if (!args.hasOwnProperty(key)) {
                                        changes.push(`Removed unexpected argument '${key}'`);
                                    }
                                });
                                
                                if (changes.length > 0) {
                                    addSystemMessage(`Changes made:`);
                                    changes.forEach(change => {
                                        addSystemMessage(`- ${change}`);
                                    });
                                } else {
                                    addSystemMessage(`No changes were needed`);
                                }
                            }
                        } else {
                            console.log(`[API Debug] - Tool call ${i + 1} is not math_addition_tool, no fixes needed`);
                        }
                    } catch (e) {
                        console.error(`[API Debug] - Error fixing tool call arguments for index ${i}:`, e);
                    }
                } else {
                    console.log(`[API Debug] - Tool call ${i + 1} missing function or arguments`);
                }
            }
            
            console.log("[API Debug] - Starting tool call processing with apiToolsManager");
            console.log("[API Debug] - Final tool calls to process:", toolCalls);
            
            // Process the tool calls with the fixed arguments and system message callback
            const toolResults = await apiToolsManager.processToolCalls(toolCalls, addSystemMessage);
            
            console.log("[API Debug] - Tool call processing completed");
            console.log("[API Debug] - Tool results:", toolResults);
            console.log("[API Debug] - Tool results count:", toolResults ? toolResults.length : 0);
            
            if (toolResults && toolResults.length > 0) {
                // Add tool results to messages
                apiMessages.push({
                    role: 'assistant',
                    content: completeResponse,
                    tool_calls: toolCalls
                });
                
                // Add each tool result as a separate message
                for (const result of toolResults) {
                    apiMessages.push(result);
                    
                    // Insert a marker in the response to indicate a function result
                    // Include the function result value in the marker for tooltip display
                    // Trim any trailing whitespace from the complete response to prevent newlines
                    completeResponse = completeResponse.trimEnd();
                    
                    // Get the result content and determine its type
                    let resultContent = result.content;
                    let resultValue;
                    let resultType;
                    
                    try {
                        resultValue = JSON.parse(resultContent);
                        resultType = Array.isArray(resultValue) ? 'array' : typeof resultValue;
                    } catch (e) {
                        // If parsing fails, use the raw content
                        resultValue = resultContent;
                        resultType = 'string';
                    }
                    
                    // Create the marker with function name and encoded result
                    const encodedResult = encodeURIComponent(resultContent);
                    const functionResultMarker = `[FUNCTION_RESULT:${result.name}:${resultType}:${encodedResult}]`;
                    completeResponse += functionResultMarker;
                    if (onChunk) {
                        window.requestAnimationFrame(() => {
                            onChunk(completeResponse);
                        });
                    }
                }
                
                // Prepare follow-up request body
                const followUpRequestBody = {
                    messages: apiMessages,
                    stream: true,
                    model: model
                };
                
                // Make a follow-up request to get the final response
                const followUpResponse = await fetch(getEndpointUrl('CHAT'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(followUpRequestBody),
                    signal: signal
                });
                
                if (!followUpResponse.ok) {
                    const error = await followUpResponse.json();
                    throw new Error(error.error?.message || 'Error connecting to API for follow-up');
                }
                
                // Process the follow-up stream
                const followUpReader = followUpResponse.body.getReader();
                const followUpDecoder = new TextDecoder('utf-8');
                let followUpCompleteResponse = '';
                
                while (true) {
                    const { done, value } = await followUpReader.read();
                    if (done) break;
                    
                    // Decode chunk
                    const chunk = followUpDecoder.decode(value);
                    
                    // Process SSE format
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            try {
                                const data = JSON.parse(line.substring(6));
                                const content = data.choices[0]?.delta?.content || '';
                                if (content) {
                                    followUpCompleteResponse += content;
                                    if (onChunk) {
                                        // Append to the original response without a separator
                                        // Trim any leading whitespace from the follow-up response to prevent newlines
                                        onChunk(completeResponse + followUpCompleteResponse.trimStart());
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing follow-up SSE:', e);
                            }
                        }
                    }
                }
                
                // Return the combined response
                // Trim any leading whitespace from the follow-up response to prevent newlines
                return completeResponse + followUpCompleteResponse.trimStart();
            }
        } catch (error) {
            console.error('Error processing tool calls:', error);
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
