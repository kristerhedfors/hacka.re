/**
 * API Stream Processor
 * Handles SSE (Server-Sent Events) stream processing for API responses
 */

window.ApiStreamProcessor = (function() {
    /**
     * Process an SSE stream and extract content and tool calls
     * @param {ReadableStreamDefaultReader} reader - Stream reader
     * @param {Function} onContentUpdate - Callback for content updates
     * @param {Function} onToolCallUpdate - Callback for tool call updates
     * @param {AbortSignal} signal - Abort signal for cancellation
     * @returns {Promise<{content: string, toolCalls: Array}>}
     */
    async function processStream(reader, onContentUpdate, onToolCallUpdate, signal) {
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let content = '';
        let toolCalls = [];
        
        try {
            while (true) {
                // Check if aborted
                if (signal && signal.aborted) {
                    throw new DOMException('Stream processing aborted', 'AbortError');
                }
                
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
                    
                    if (line.startsWith('data: ')) {
                        const result = processSSELine(line, content, toolCalls);
                        
                        if (result.contentDelta) {
                            content += result.contentDelta;
                            if (onContentUpdate) {
                                // Use requestAnimationFrame for smooth updates
                                await new Promise(resolve => {
                                    window.requestAnimationFrame(() => {
                                        onContentUpdate(content);
                                        resolve();
                                    });
                                });
                            }
                        }
                        
                        if (result.toolCallsDelta && onToolCallUpdate) {
                            toolCalls = result.updatedToolCalls;
                            onToolCallUpdate(toolCalls);
                        }
                    }
                }
            }
        } finally {
            // Ensure reader is released
            try {
                await reader.cancel();
            } catch (e) {
                // Ignore cancellation errors
            }
        }
        
        return { content, toolCalls };
    }
    
    /**
     * Process a single SSE line
     * @private
     */
    function processSSELine(line, currentContent, currentToolCalls) {
        const result = {
            contentDelta: null,
            toolCallsDelta: false,
            updatedToolCalls: currentToolCalls
        };
        
        if (line === 'data: [DONE]') {
            return result;
        }
        
        try {
            const data = JSON.parse(line.substring(6));
            
            // Check for API errors in the response
            if (data.error) {
                throw new Error(data.error.message || 'API Error');
            }
            
            const delta = data.choices?.[0]?.delta || {};
            
            // Handle content updates
            if (delta.content) {
                result.contentDelta = delta.content;
            }
            
            // Handle tool calls
            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                result.toolCallsDelta = true;
                result.updatedToolCalls = processToolCallDeltas(
                    currentToolCalls,
                    delta.tool_calls
                );
            }
        } catch (e) {
            console.error('Error parsing SSE line:', e, 'Line:', line);
            // Re-throw API errors to be handled by the main error handler
            if (e.message && (e.message.includes('last message role must be') || e.message.includes('API Error'))) {
                throw e;
            }
        }
        
        return result;
    }
    
    /**
     * Process tool call deltas and update the tool calls array
     * @private
     */
    function processToolCallDeltas(toolCalls, toolCallDeltas) {
        const updatedToolCalls = [...toolCalls];
        
        for (const toolCallDelta of toolCallDeltas) {
            if (!toolCallDelta || toolCallDelta.index === undefined) continue;
            
            const index = toolCallDelta.index;
            
            // Initialize tool call if it doesn't exist
            if (!updatedToolCalls[index]) {
                updatedToolCalls[index] = {
                    id: toolCallDelta.id || '',
                    type: 'function',
                    function: {
                        name: '',
                        arguments: ''
                    }
                };
            }
            
            // Update tool call with delta information
            const toolCall = updatedToolCalls[index];
            
            if (toolCallDelta.id) {
                toolCall.id = toolCallDelta.id;
            }
            
            if (toolCallDelta.function) {
                const funcDelta = toolCallDelta.function;
                
                if (funcDelta.name !== undefined) {
                    toolCall.function.name += funcDelta.name;
                }
                
                if (funcDelta.arguments !== undefined) {
                    // Prevent specific Gmail-style argument duplication patterns
                    const existingArgs = toolCall.function.arguments;
                    const deltaArgs = funcDelta.arguments;
                    
                    // Basic argument accumulation - no special processing needed
                    // Higher-level fixes in tool definitions prevent malformed JSON
                    
                    toolCall.function.arguments += deltaArgs;
                }
            }
        }
        
        return updatedToolCalls;
    }
    
    /**
     * Create a readable stream from a response body
     * Provides better error handling and abort support
     */
    async function createReadableStream(response, signal) {
        if (!response.body) {
            throw new Error('Response body is not available');
        }
        
        const reader = response.body.getReader();
        
        // Return reader with abort handling
        return {
            reader,
            cleanup: async () => {
                try {
                    await reader.cancel();
                } catch (e) {
                    // Ignore cancellation errors
                }
            }
        };
    }
    
    // Public API
    return {
        processStream,
        createReadableStream
    };
})();