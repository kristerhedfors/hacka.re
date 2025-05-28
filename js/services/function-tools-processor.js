/**
 * Function Tools Processor
 * Handles processing of tool calls from API responses
 */

window.FunctionToolsProcessor = (function() {
    const Logger = FunctionToolsLogger;
    const Storage = FunctionToolsStorage;
    const Registry = FunctionToolsRegistry;
    const Executor = FunctionToolsExecutor;
    const { ArgumentParser } = FunctionToolsParser;
    
    const ToolCallProcessor = {
        async process(toolCalls, addSystemMessage) {
            Logger.debug("processToolCalls called");
            Logger.debug(`Tool calls input:`, toolCalls);
            Logger.debug(`Tool calls length: ${toolCalls ? toolCalls.length : "N/A"}`);
            
            if (!toolCalls || toolCalls.length === 0) {
                Logger.debug("No tool calls to process, returning empty array");
                return [];
            }
            
            const toolResults = [];
            Logger.debug(`Processing ${toolCalls.length} tool calls`);
            
            for (let i = 0; i < toolCalls.length; i++) {
                const result = await this._processSingleToolCall(toolCalls[i], i + 1, toolCalls.length, addSystemMessage);
                toolResults.push(result);
            }
            
            Logger.debug("Finished processing all tool calls");
            Logger.debug(`Total results: ${toolResults.length}`);
            
            return toolResults;
        },
        
        async _processSingleToolCall(toolCall, index, total, addSystemMessage) {
            Logger.debug(`Processing tool call ${index}/${total}`);
            Logger.debug(`Tool call ${index} data:`, toolCall);
            
            try {
                this._validateToolCall(toolCall, index);
                
                const { name, arguments: argsString } = toolCall.function;
                Logger.debug(`Tool call ${index} function name: ${name}`);
                Logger.debug(`Tool call ${index} arguments string: ${argsString}`);
                
                this._validateFunctionAvailability(name, addSystemMessage);
                
                const args = ArgumentParser.parse(argsString, name);
                
                this._logFunctionExecution(name, argsString, addSystemMessage);
                
                const result = await Executor.execute(name, args);
                
                this._logSuccessfulExecution(name, addSystemMessage);
                
                return this._createSuccessResult(toolCall, name, result);
                
            } catch (error) {
                Logger.error(`Error processing tool call ${index}:`, error);
                this._logExecutionError(error, addSystemMessage);
                return this._createErrorResult(toolCall, error);
            }
        },
        
        _validateToolCall: function(toolCall, index) {
            if (!toolCall.function) {
                throw new Error('Invalid tool call format: missing function property');
            }
            
            if (!toolCall.function.name) {
                throw new Error('Invalid tool call format: missing function name');
            }
        },
        
        _validateFunctionAvailability: function(name, addSystemMessage) {
            const jsFunctions = Storage.getJsFunctions();
            const enabledFunctions = Storage.getEnabledFunctions();
            
            Logger.debug(`Checking if function "${name}" exists in registry`);
            Logger.debug(`Available functions: ${Object.keys(jsFunctions)}`);
            
            if (!jsFunctions[name]) {
                const errorMsg = `Function "${name}" not found`;
                Logger.error(errorMsg);
                if (addSystemMessage) {
                    addSystemMessage(`Error: ${errorMsg}`);
                }
                throw new Error(errorMsg);
            }
            
            Logger.debug(`Checking if function "${name}" is enabled`);
            Logger.debug(`Enabled functions: ${enabledFunctions}`);
            
            if (!enabledFunctions.includes(name)) {
                const errorMsg = `Function "${name}" is disabled`;
                Logger.error(errorMsg);
                if (addSystemMessage) {
                    addSystemMessage(`Error: ${errorMsg}`);
                }
                throw new Error(errorMsg);
            }
        },
        
        _logFunctionExecution: function(name, argsString, addSystemMessage) {
            Logger.debug(`About to execute function "${name}"`);
            
            if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                try {
                    const parsedArgs = JSON.parse(argsString);
                    const formattedArgs = JSON.stringify(parsedArgs);
                    addSystemMessage(`Function call requested by model: ${name}(${formattedArgs})`);
                } catch (e) {
                    addSystemMessage(`Function call requested by model: ${name}(${argsString})`);
                }
                addSystemMessage(`Executing function "${name}"`);
            }
        },
        
        _logSuccessfulExecution: function(name, addSystemMessage) {
            if (addSystemMessage && window.DebugService && DebugService.getDebugMode()) {
                addSystemMessage(`Function "${name}" executed successfully`);
            }
        },
        
        _logExecutionError: function(error, addSystemMessage) {
            if (addSystemMessage) {
                addSystemMessage(`Error executing function:`);
                
                if (window.DebugService && typeof DebugService.displayMultilineDebug === 'function') {
                    DebugService.displayMultilineDebug(error.message, addSystemMessage);
                } else {
                    addSystemMessage(`  ${error.message}`);
                }
            }
        },
        
        _createSuccessResult: function(toolCall, name, result) {
            const toolResult = {
                tool_call_id: toolCall.id,
                role: "tool",
                name: name,
                content: JSON.stringify(result)
            };
            
            Logger.debug(`Created tool result for "${name}":`, toolResult);
            return toolResult;
        },
        
        _createErrorResult: function(toolCall, error) {
            const errorResult = {
                tool_call_id: toolCall.id,
                role: "tool",
                name: toolCall.function?.name || 'unknown',
                content: JSON.stringify({ 
                    error: error.message,
                    status: 'error',
                    timestamp: new Date().toISOString()
                })
            };
            
            Logger.debug("Created error result:", errorResult);
            return errorResult;
        }
    };
    
    // Public API
    return ToolCallProcessor;
})();
