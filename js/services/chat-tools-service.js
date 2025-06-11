/**
 * Chat Tools Service
 * Handles tool calling logic and coordination between different tool providers
 */

window.ChatToolsService = (function() {
    'use strict';

    /**
     * Create a combined tools manager that handles both API tools and function calling tools
     * @param {Object} apiToolsManager - API tools manager instance
     * @param {Object} functionCallingManager - Function calling manager instance
     * @returns {Object} Combined tools manager interface
     */
    function createCombinedToolsManager(apiToolsManager, functionCallingManager) {
        return {
            /**
             * Get all available tool definitions
             * @returns {Array} Array of tool definitions
             */
            getToolDefinitions() {
                const apiTools = apiToolsManager ? apiToolsManager.getEnabledToolDefinitions() : [];
                const functionCallingTools = functionCallingManager ? functionCallingManager.getFunctionDefinitions() : [];
                
                console.log("ChatToolsService.getToolDefinitions called");
                console.log("- apiTools:", apiTools.length, apiTools.map(t => t.function?.name));
                console.log("- functionCallingTools:", functionCallingTools.length, functionCallingTools.map(t => t.function?.name));
                console.log("- FunctionToolsService enabled:", FunctionToolsService ? FunctionToolsService.isFunctionToolsEnabled() : false);
                console.log("- FunctionToolsService enabled functions:", FunctionToolsService ? FunctionToolsService.getEnabledFunctionNames() : []);
                
                const allTools = [...apiTools, ...functionCallingTools];
                console.log("- Combined tools:", allTools.length, allTools.map(t => t.function?.name));
                
                return allTools;
            },

            /**
             * Get enabled tool definitions (alias for getToolDefinitions)
             * @returns {Array} Array of enabled tool definitions
             */
            getEnabledToolDefinitions() {
                return this.getToolDefinitions();
            },

            /**
             * Process tool calls by routing them to appropriate handlers
             * @param {Array} toolCalls - Array of tool calls to process
             * @param {Function} addSystemMessage - Function to add system messages
             * @returns {Array} Array of tool call results
             */
            async processToolCalls(toolCalls, addSystemMessage) {
                console.log("[ChatToolsService] processToolCalls called");
                console.log("[ChatToolsService] - Tool calls input:", toolCalls);
                console.log("[ChatToolsService] - Tool calls type:", typeof toolCalls);
                console.log("[ChatToolsService] - Tool calls length:", toolCalls ? toolCalls.length : "N/A");
                console.log("[ChatToolsService] - addSystemMessage callback:", typeof addSystemMessage);
                
                // Validate toolCalls is an array
                if (!Array.isArray(toolCalls)) {
                    console.error('[ChatToolsService] Invalid tool calls format: not an array', toolCalls);
                    if (addSystemMessage) {
                        addSystemMessage('Error: Invalid tool calls format received from API');
                    }
                    return [];
                }

                // Separate tool calls by type
                const { apiToolCalls, functionToolCalls } = separateToolCallsByType(toolCalls, addSystemMessage);

                // Process each type of tool calls
                console.log("[ChatToolsService] - Starting API tool calls processing");
                const apiResults = apiToolCalls.length > 0 && apiToolsManager 
                    ? await apiToolsManager.processToolCalls(apiToolCalls, addSystemMessage) 
                    : [];
                console.log("[ChatToolsService] - API tool calls results:", apiResults.length, apiResults);
                
                console.log("[ChatToolsService] - Starting function tool calls processing");
                const functionResults = functionToolCalls.length > 0 && FunctionToolsService
                    ? await FunctionToolsService.processToolCalls(functionToolCalls, addSystemMessage)
                    : [];
                console.log("[ChatToolsService] - Function tool calls results:", functionResults.length, functionResults);
                
                // Combine results
                const combinedResults = [...apiResults, ...functionResults];
                console.log("[ChatToolsService] - Combined tool call results:", combinedResults.length, combinedResults);
                
                return combinedResults;
            }
        };
    }

    /**
     * Separate tool calls into API tools and function tools
     * @param {Array} toolCalls - Array of tool calls to separate
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Object} Object with apiToolCalls and functionToolCalls arrays
     */
    function separateToolCallsByType(toolCalls, addSystemMessage) {
        const apiToolCalls = [];
        const functionToolCalls = [];
        
        console.log("[ChatToolsService] - Starting tool call separation");
        
        for (let i = 0; i < toolCalls.length; i++) {
            const toolCall = toolCalls[i];
            console.log(`[ChatToolsService] - Processing tool call ${i + 1}/${toolCalls.length}:`, toolCall);
            
            try {
                // Validate toolCall has the expected structure
                if (!toolCall || !toolCall.function || typeof toolCall.function.name !== 'string') {
                    console.error(`[ChatToolsService] - Invalid tool call ${i + 1} format:`, toolCall);
                    continue;
                }
                
                const toolName = toolCall.function.name;
                console.log(`[ChatToolsService] - Tool call ${i + 1} name:`, toolName);
                
                // Check if it's a function tool
                const isFunctionTool = checkIfFunctionTool(toolName);
                
                console.log(`[ChatToolsService] - Tool "${toolName}" is function tool:`, isFunctionTool);
                
                if (isFunctionTool) {
                    functionToolCalls.push(toolCall);
                    console.log(`[ChatToolsService] - Added tool "${toolName}" to function tool calls`);
                } else {
                    apiToolCalls.push(toolCall);
                    console.log(`[ChatToolsService] - Added tool "${toolName}" to API tool calls`);
                }
            } catch (error) {
                console.error(`[ChatToolsService] - Error processing tool call ${i + 1}:`, error, toolCall);
                if (addSystemMessage) {
                    addSystemMessage(`Error processing tool call: ${error.message}`);
                }
            }
        }
        
        console.log("[ChatToolsService] - Tool call separation complete");
        console.log("[ChatToolsService] - API tool calls:", apiToolCalls.length, apiToolCalls.map(tc => tc.function?.name));
        console.log("[ChatToolsService] - Function tool calls:", functionToolCalls.length, functionToolCalls.map(tc => tc.function?.name));
        
        return { apiToolCalls, functionToolCalls };
    }

    /**
     * Check if a tool name corresponds to a function tool
     * @param {string} toolName - Name of the tool to check
     * @returns {boolean} True if it's a function tool
     */
    function checkIfFunctionTool(toolName) {
        // Check if it's a user-defined function tool
        const isUserDefinedFunctionTool = FunctionToolsService && 
            FunctionToolsService.getJsFunctions()[toolName] && 
            FunctionToolsService.isJsFunctionEnabled(toolName);
        
        // Check if it's a default function tool
        let isDefaultFunctionTool = false;
        if (window.DefaultFunctionsService && typeof window.DefaultFunctionsService.getEnabledDefaultFunctions === 'function') {
            const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
            isDefaultFunctionTool = !!enabledDefaultFunctions[toolName];
        }
        
        const isFunctionTool = isUserDefinedFunctionTool || isDefaultFunctionTool;
        
        console.log(`[ChatToolsService] - Tool "${toolName}" is user-defined function tool:`, isUserDefinedFunctionTool);
        console.log(`[ChatToolsService] - Tool "${toolName}" is default function tool:`, isDefaultFunctionTool);
        console.log(`[ChatToolsService] - FunctionToolsService available:`, !!FunctionToolsService);
        
        if (FunctionToolsService) {
            console.log(`[ChatToolsService] - Available JS functions:`, Object.keys(FunctionToolsService.getJsFunctions()));
            console.log(`[ChatToolsService] - Enabled JS functions:`, FunctionToolsService.getEnabledFunctionNames());
            console.log(`[ChatToolsService] - Tool "${toolName}" exists in registry:`, !!FunctionToolsService.getJsFunctions()[toolName]);
            console.log(`[ChatToolsService] - Tool "${toolName}" is enabled:`, FunctionToolsService.isJsFunctionEnabled(toolName));
        }
        
        if (window.DefaultFunctionsService) {
            const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
            console.log(`[ChatToolsService] - Available default functions:`, Object.keys(enabledDefaultFunctions));
            console.log(`[ChatToolsService] - Tool "${toolName}" exists in default functions:`, !!enabledDefaultFunctions[toolName]);
        }
        
        return isFunctionTool;
    }

    /**
     * Add function markers to AI response content
     * @param {string} content - Original AI response content
     * @param {Array} functionToolCalls - Array of function tool calls
     * @param {Array} functionResults - Array of function results
     * @returns {string} Content with function markers added
     */
    function addFunctionMarkersToContent(content, functionToolCalls, functionResults) {
        if (functionToolCalls.length === 0 || functionResults.length === 0) {
            return content;
        }

        console.log('[ChatToolsService] Adding function markers to AI response');
        console.log('[ChatToolsService] Original AI response:', content);
        
        let finalContent = content;
        
        // For each function call, add markers inline with the response
        for (let i = 0; i < functionToolCalls.length && i < functionResults.length; i++) {
            const toolCall = functionToolCalls[i];
            const result = functionResults[i];
            
            if (toolCall.function && toolCall.function.name && result && result.name) {
                const functionName = toolCall.function.name;
                const encodedArgs = encodeURIComponent(toolCall.function.arguments || '{}');
                const functionCallMarker = `[FUNCTION_CALL:${functionName}:${encodedArgs}]`;
                
                // Get the result content and determine its type
                let resultContent = result.content;
                let resultType;
                
                try {
                    const resultValue = JSON.parse(resultContent);
                    resultType = Array.isArray(resultValue) ? 'array' : typeof resultValue;
                } catch (e) {
                    // If parsing fails, use the raw content
                    resultType = 'string';
                }
                
                // Create the result marker
                const encodedResult = encodeURIComponent(resultContent);
                const executionTime = result.executionTime || 0;
                const functionResultMarker = `[FUNCTION_RESULT:${result.name}:${resultType}:${encodedResult}:${executionTime}]`;
                
                // Add both markers together at the end (for now - can be improved to insert inline)
                finalContent += functionCallMarker + functionResultMarker;
            }
        }
        
        console.log('[ChatToolsService] Final content with markers:', finalContent);
        return finalContent;
    }

    // Public API
    return {
        createCombinedToolsManager,
        separateToolCallsByType,
        checkIfFunctionTool,
        addFunctionMarkersToContent
    };
})();