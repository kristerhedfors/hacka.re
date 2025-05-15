/**
 * API Service
 * Handles API interactions with AI model providers
 */

window.ApiService = (function() {
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
        model: model,
        messages: apiMessages,
        stream: true
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
                    console.log("- ApiToolsService:", ApiToolsService.getToolDefinitions().length);
                    console.log("- FunctionToolsService:", FunctionToolsService ? FunctionToolsService.getToolDefinitions().length : 0);
                    
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
        try {
            // Notify user that tool calls were received with detailed information
            if (addSystemMessage) {
                // Add header message
                addSystemMessage(`Received ${toolCalls.length} tool call(s) from the AI`);
                
                // Only show detailed information in debug mode
                if (window.DebugService && DebugService.getDebugMode()) {
                    addSystemMessage(`(Debug mode: Showing detailed tool call information)`);
                
                    // Add details for each tool call as separate messages
                    toolCalls.forEach((toolCall, index) => {
                        let toolCallMessage = `Tool #${index + 1}:\n`;
                        toolCallMessage += `- Name: ${toolCall.function.name}\n`;
                        toolCallMessage += `- ID: ${toolCall.id}\n`;
                        
                        // Format the arguments as JSON on a single line
                        try {
                            const args = JSON.parse(toolCall.function.arguments);
                            const formattedArgs = JSON.stringify(args);
                            
                            // Add function call in the requested format
                            addSystemMessage(`Function call requested by model: ${toolCall.function.name}(${formattedArgs})`);
                            
                            // Add the tool info
                            if (typeof DebugService.displayMultilineDebug === 'function') {
                                DebugService.displayMultilineDebug(toolCallMessage, addSystemMessage);
                            } else {
                                // Fallback if displayMultilineDebug is not available
                                toolCallMessage += `- Arguments: ${formattedArgs}`;
                                addSystemMessage(toolCallMessage);
                            }
                        } catch (e) {
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
                }
            }
            
            // Before processing, try to fix any issues with the tool call arguments
            for (let i = 0; i < toolCalls.length; i++) {
                const toolCall = toolCalls[i];
                if (toolCall.function && toolCall.function.arguments) {
                    try {
                        // Try to parse the arguments as JSON
                        const args = JSON.parse(toolCall.function.arguments);
                        
                        // Check if this is the math_addition_tool and if the arguments are strings
                        if (toolCall.function.name === 'math_addition_tool') {
                            // Save the original arguments for comparison
                            const originalArgs = JSON.parse(JSON.stringify(args));
                            
                            // Convert string numbers to actual numbers
                            if (args.a && typeof args.a === 'string') {
                                args.a = parseFloat(args.a);
                            }
                            if (args.b && typeof args.b === 'string') {
                                args.b = parseFloat(args.b);
                            }
                            
                            // Remove any unexpected arguments (like 'c')
                            const validKeys = ['a', 'b'];
                            Object.keys(args).forEach(key => {
                                if (!validKeys.includes(key)) {
                                    console.log(`Removing unexpected argument '${key}' from math_addition_tool`);
                                    delete args[key];
                                }
                            });
                            
                            // Update the tool call arguments with the fixed version
                            toolCall.function.arguments = JSON.stringify(args);
                            console.log(`Fixed arguments for math_addition_tool:`, args);
                            
                            // Add a system message to show that we've fixed the arguments
                            if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
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
                        }
                    } catch (e) {
                        console.error(`Error fixing tool call arguments for index ${i}:`, e);
                    }
                }
            }
            
            // Process the tool calls with the fixed arguments and system message callback
            const toolResults = await apiToolsManager.processToolCalls(toolCalls, addSystemMessage);
            
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
                }
                
                // Make a follow-up request to get the final response
                const followUpResponse = await fetch(getEndpointUrl('CHAT'), {
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
                                        // Append to the original response with a separator
                                        onChunk(completeResponse + "\n\n" + followUpCompleteResponse);
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing follow-up SSE:', e);
                            }
                        }
                    }
                }
                
                // Return the combined response
                return completeResponse + "\n\n" + followUpCompleteResponse;
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
