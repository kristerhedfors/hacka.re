/**
 * API Tool Call Handler
 * Manages tool call processing, validation, and execution
 */

window.ApiToolCallHandler = (function() {
    /**
     * Process tool calls and generate function markers and results
     * @param {Array} toolCalls - Array of tool call objects
     * @param {Object} apiToolsManager - API tools manager instance
     * @param {Function} addSystemMessage - Callback for adding system messages
     * @param {Function} onContentUpdate - Callback for content updates
     * @param {string} currentContent - Current response content
     * @returns {Promise<{content: string, toolResults: Array}>}
     */
    async function processToolCalls(toolCalls, apiToolsManager, addSystemMessage, onContentUpdate, currentContent) {
        if (!toolCalls || toolCalls.length === 0 || !apiToolsManager) {
            return { content: currentContent, toolResults: [] };
        }
        
        console.log("[ToolCallHandler] Processing tool calls:", toolCalls.length);
        
        let updatedContent = currentContent;
        
        try {
            // Show debug information if enabled
            displayDebugInformation(toolCalls, addSystemMessage);
            
            // Fix and validate tool call arguments
            const fixedToolCalls = fixToolCallArguments(toolCalls, addSystemMessage);
            
            // Insert function call markers
            updatedContent = await insertFunctionCallMarkers(
                fixedToolCalls, 
                updatedContent, 
                onContentUpdate
            );
            
            // Execute tool calls
            const toolResults = await apiToolsManager.processToolCalls(fixedToolCalls, addSystemMessage);
            
            console.log("[ToolCallHandler] Tool execution completed, results:", toolResults?.length || 0);
            
            // Insert function result markers
            if (toolResults && toolResults.length > 0) {
                updatedContent = await insertFunctionResultMarkers(
                    toolResults, 
                    updatedContent, 
                    onContentUpdate
                );
            }
            
            return { content: updatedContent, toolResults: toolResults || [] };
            
        } catch (error) {
            console.error('[ToolCallHandler] Error processing tool calls:', error);
            throw error;
        }
    }
    
    /**
     * Display debug information about tool calls
     * @private
     */
    function displayDebugInformation(toolCalls, addSystemMessage) {
        if (!addSystemMessage || !window.DebugService || !DebugService.getDebugMode()) {
            return;
        }
        
        console.log("[ToolCallHandler] Adding debug system messages for tool calls");
        
        // Add header message
        addSystemMessage(`Received ${toolCalls.length} tool call(s) from the AI`);
        addSystemMessage(`(Debug mode: Showing detailed tool call information)`);
        
        // Add details for each tool call
        toolCalls.forEach((toolCall, index) => {
            let toolCallMessage = `Tool #${index + 1}:\n`;
            toolCallMessage += `- Name: ${toolCall.function.name}\n`;
            toolCallMessage += `- ID: ${toolCall.id}\n`;
            
            // Format the arguments as JSON
            try {
                const args = JSON.parse(toolCall.function.arguments);
                const formattedArgs = JSON.stringify(args);
                
                // Add function call in the requested format
                addSystemMessage(`Function call requested by model: ${toolCall.function.name}(${formattedArgs})`);
                
                // Add detailed tool info
                if (typeof DebugService.displayMultilineDebug === 'function') {
                    DebugService.displayMultilineDebug(toolCallMessage, addSystemMessage);
                } else {
                    toolCallMessage += `- Arguments: ${formattedArgs}`;
                    addSystemMessage(toolCallMessage);
                }
            } catch (e) {
                console.error(`[ToolCallHandler] Error parsing tool call arguments:`, e);
                toolCallMessage += `- Arguments: ${toolCall.function.arguments}`;
                
                if (typeof DebugService.displayMultilineDebug === 'function') {
                    DebugService.displayMultilineDebug(toolCallMessage, addSystemMessage);
                } else {
                    addSystemMessage(toolCallMessage);
                }
            }
        });
    }
    
    /**
     * Fix known issues with tool call arguments
     * @private
     */
    function fixToolCallArguments(toolCalls, addSystemMessage) {
        const fixedToolCalls = toolCalls.map((toolCall, index) => {
            if (!toolCall.function || !toolCall.function.arguments) {
                return toolCall;
            }
            
            try {
                const args = JSON.parse(toolCall.function.arguments);
                const originalArgs = JSON.parse(JSON.stringify(args));
                
                // Apply fixes for specific tools
                if (toolCall.function.name === 'math_addition_tool') {
                    const fixes = fixMathAdditionTool(args);
                    
                    if (fixes.hasChanges) {
                        const fixedToolCall = {
                            ...toolCall,
                            function: {
                                ...toolCall.function,
                                arguments: JSON.stringify(args)
                            }
                        };
                        
                        // Show debug information about fixes
                        showArgumentFixes(
                            toolCall.function.name, 
                            originalArgs, 
                            args, 
                            fixes.changes, 
                            addSystemMessage
                        );
                        
                        return fixedToolCall;
                    }
                }
                
                return toolCall;
            } catch (e) {
                console.error(`[ToolCallHandler] Error fixing tool call arguments:`, e);
                return toolCall;
            }
        });
        
        return fixedToolCalls;
    }
    
    /**
     * Fix arguments for math_addition_tool
     * @private
     */
    function fixMathAdditionTool(args) {
        const changes = [];
        let hasChanges = false;
        
        // Convert string numbers to actual numbers
        if (args.a && typeof args.a === 'string') {
            args.a = parseFloat(args.a);
            changes.push(`Converted 'a' from string to number`);
            hasChanges = true;
        }
        
        if (args.b && typeof args.b === 'string') {
            args.b = parseFloat(args.b);
            changes.push(`Converted 'b' from string to number`);
            hasChanges = true;
        }
        
        // Remove unexpected arguments
        const validKeys = ['a', 'b'];
        Object.keys(args).forEach(key => {
            if (!validKeys.includes(key)) {
                delete args[key];
                changes.push(`Removed unexpected argument '${key}'`);
                hasChanges = true;
            }
        });
        
        return { hasChanges, changes };
    }
    
    /**
     * Show debug information about argument fixes
     * @private
     */
    function showArgumentFixes(functionName, originalArgs, fixedArgs, changes, addSystemMessage) {
        if (!addSystemMessage || !window.DebugService || !DebugService.getDebugMode()) {
            return;
        }
        
        addSystemMessage(`Fixed arguments for ${functionName}:`);
        addSystemMessage(`Original arguments: ${JSON.stringify(originalArgs)}`);
        addSystemMessage(`Fixed arguments: ${JSON.stringify(fixedArgs)}`);
        
        if (changes.length > 0) {
            addSystemMessage(`Changes made:`);
            changes.forEach(change => {
                addSystemMessage(`- ${change}`);
            });
        } else {
            addSystemMessage(`No changes were needed`);
        }
    }
    
    /**
     * Insert function call markers into content
     * @private
     */
    async function insertFunctionCallMarkers(toolCalls, content, onContentUpdate) {
        let updatedContent = content;
        
        for (const toolCall of toolCalls) {
            if (toolCall.function && toolCall.function.name) {
                const functionName = toolCall.function.name;
                const encodedArgs = encodeURIComponent(toolCall.function.arguments || '{}');
                const functionCallMarker = `[FUNCTION_CALL:${functionName}:${encodedArgs}]`;
                
                updatedContent += functionCallMarker;
                
                // Update UI with the marker
                if (onContentUpdate) {
                    await new Promise(resolve => {
                        window.requestAnimationFrame(() => {
                            onContentUpdate(updatedContent);
                            resolve();
                        });
                    });
                }
            }
        }
        
        return updatedContent;
    }
    
    /**
     * Insert function result markers into content
     * @private
     */
    async function insertFunctionResultMarkers(toolResults, content, onContentUpdate) {
        let updatedContent = content.trimEnd();
        
        for (const result of toolResults) {
            // Determine result type and value
            let resultValue;
            let resultType;
            
            try {
                resultValue = JSON.parse(result.content);
                resultType = Array.isArray(resultValue) ? 'array' : typeof resultValue;
            } catch (e) {
                resultValue = result.content;
                resultType = 'string';
            }
            
            // Create the marker with function name, encoded result, and execution time
            const encodedResult = encodeURIComponent(result.content);
            const executionTime = result.executionTime || 0;
            const functionResultMarker = `[FUNCTION_RESULT:${result.name}:${resultType}:${encodedResult}:${executionTime}]`;
            
            updatedContent += functionResultMarker;
            
            if (onContentUpdate) {
                await new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        onContentUpdate(updatedContent);
                        resolve();
                    });
                });
            }
        }
        
        return updatedContent;
    }
    
    /**
     * Validate tool calls for completeness and correctness
     */
    function validateToolCalls(toolCalls) {
        const validationResults = [];
        
        for (let i = 0; i < toolCalls.length; i++) {
            const toolCall = toolCalls[i];
            const result = {
                index: i,
                isValid: true,
                errors: []
            };
            
            if (!toolCall.id) {
                result.errors.push('Missing tool call ID');
                result.isValid = false;
            }
            
            if (!toolCall.function) {
                result.errors.push('Missing function object');
                result.isValid = false;
            } else {
                if (!toolCall.function.name) {
                    result.errors.push('Missing function name');
                    result.isValid = false;
                }
                
                if (!toolCall.function.arguments) {
                    result.errors.push('Missing function arguments');
                    result.isValid = false;
                } else {
                    try {
                        JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        result.errors.push('Invalid JSON in function arguments');
                        result.isValid = false;
                    }
                }
            }
            
            validationResults.push(result);
        }
        
        return validationResults;
    }
    
    // Public API
    return {
        processToolCalls,
        validateToolCalls
    };
})();