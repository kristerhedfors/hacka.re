/**
 * API Service Fix
 * Fixes SSE parsing issues that cause function execution timeouts
 */

(function() {
    // Wait for the original API service to be loaded
    function applyApiServiceFix() {
        if (!window.ApiService) {
            return false;
        }
        
        // console.log("[API Fix] Applying API service fix for SSE parsing");
        
        // Store reference to original method
        const originalGenerateChatCompletion = window.ApiService.generateChatCompletion;
        
        // Override the generateChatCompletion method
        window.ApiService.generateChatCompletion = async function(apiKey, model, messages, signal, onChunk, systemPrompt, apiToolsManager, addSystemMessage) {
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
                }
            }
            
            // Get endpoint URL (use the original method)
            const getEndpointUrl = function(endpoint) {
                const baseUrl = window.StorageService.getBaseUrl();
                const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
                const ENDPOINT_PATHS = {
                    CHAT: 'chat/completions',
                    MODELS: 'models'
                };
                return `${normalizedBaseUrl}${ENDPOINT_PATHS[endpoint]}`;
            };
            
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
            
            // Set up streaming response processing with better error handling
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            
            // Process the stream with improved error handling
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
                                const jsonData = line.substring(6);
                                // console.log("[API Fix] Parsing SSE data:", jsonData);
                                
                                const data = JSON.parse(jsonData);
                                const delta = data.choices[0]?.delta || {};
                                
                                // Handle content updates
                                if (delta.content) {
                                    completeResponse += delta.content;
                                    if (onChunk) {
                                        window.requestAnimationFrame(() => {
                                            onChunk(completeResponse);
                                        });
                                    }
                                }
                                
                                // Handle tool calls with better error handling
                                if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                                    for (const toolCallDelta of delta.tool_calls) {
                                        if (!toolCallDelta) continue;
                                        
                                        const index = toolCallDelta.index;
                                        if (index === undefined) continue;
                                        
                                        // Initialize tool call if it doesn't exist
                                        if (!toolCalls[index]) {
                                            toolCalls[index] = {
                                                id: toolCallDelta.id || '',
                                                type: 'function',
                                                function: {
                                                    name: '',
                                                    arguments: ''
                                                }
                                            };
                                        }
                                        
                                        // Update tool call with delta information
                                        if (toolCallDelta.id) {
                                            toolCalls[index].id = toolCallDelta.id;
                                        }
                                        
                                        if (toolCallDelta.function) {
                                            if (toolCallDelta.function.name) {
                                                toolCalls[index].function.name += toolCallDelta.function.name;
                                            }
                                            
                                            if (toolCallDelta.function.arguments) {
                                                toolCalls[index].function.arguments += toolCallDelta.function.arguments;
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                                console.error('Problematic line:', line);
                                // Continue processing instead of breaking
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error reading SSE stream:', error);
                    break;
                }
            }
            
            // Process tool calls if any were received
            if (toolCalls.length > 0 && apiToolsManager) {
                // console.log("[API Fix] Processing tool calls:", toolCalls);
                
                try {
                    // Process the tool calls
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
                        
                        // Make a follow-up request with better error handling
                        const followUpRequestBody = {
                            messages: apiMessages,
                            stream: true,
                            model: model
                        };
                        
                        try {
                            const followUpResponse = await fetch(getEndpointUrl('CHAT'), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${apiKey}`
                                },
                                body: JSON.stringify(followUpRequestBody),
                                signal: signal
                            });
                            
                            if (followUpResponse.ok) {
                                // Process the follow-up stream with better error handling
                                const followUpReader = followUpResponse.body.getReader();
                                const followUpDecoder = new TextDecoder('utf-8');
                                let followUpBuffer = '';
                                let followUpCompleteResponse = '';
                                
                                while (true) {
                                    try {
                                        const { done, value } = await followUpReader.read();
                                        if (done) break;
                                        
                                        followUpBuffer += followUpDecoder.decode(value, { stream: true });
                                        
                                        let newlineIndex;
                                        while ((newlineIndex = followUpBuffer.indexOf('\n')) !== -1) {
                                            const line = followUpBuffer.slice(0, newlineIndex);
                                            followUpBuffer = followUpBuffer.slice(newlineIndex + 1);
                                            
                                            if (line.trim() === '') continue;
                                            
                                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                                try {
                                                    const jsonData = line.substring(6);
                                                    // console.log("[API Fix] Parsing follow-up SSE data:", jsonData);
                                                    
                                                    const data = JSON.parse(jsonData);
                                                    const content = data.choices[0]?.delta?.content || '';
                                                    if (content) {
                                                        followUpCompleteResponse += content;
                                                        if (onChunk) {
                                                            onChunk(completeResponse + followUpCompleteResponse);
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error('Error parsing follow-up SSE data:', e);
                                                    console.error('Problematic follow-up line:', line);
                                                    // Continue processing instead of breaking
                                                }
                                            }
                                        }
                                    } catch (error) {
                                        console.error('Error reading follow-up SSE stream:', error);
                                        break;
                                    }
                                }
                                
                                return completeResponse + followUpCompleteResponse;
                            }
                        } catch (error) {
                            console.error('Error in follow-up request:', error);
                            // Return the original response if follow-up fails
                            return completeResponse;
                        }
                    }
                } catch (error) {
                    console.error('Error processing tool calls:', error);
                    // Return the original response if tool processing fails
                    return completeResponse;
                }
            }
            
            return completeResponse;
        };
        
        // console.log("[API Fix] API service fix applied successfully");
        return true;
    }
    
    // Try to apply immediately
    if (!applyApiServiceFix()) {
        // If not ready, wait for DOM content loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyApiServiceFix);
        } else {
            // Try again after a short delay
            setTimeout(applyApiServiceFix, 100);
        }
    }
})();
