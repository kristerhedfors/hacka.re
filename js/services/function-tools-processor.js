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
                
                const executionResult = await Executor.execute(name, args);
                
                this._logSuccessfulExecution(name, executionResult.result, addSystemMessage);
                
                return this._createSuccessResult(toolCall, name, executionResult.result, executionResult.executionTime);
                
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
            Logger.debug(`Available user-defined functions: ${Object.keys(jsFunctions)}`);
            
            // Check if it's a user-defined function
            let isUserDefinedFunction = !!jsFunctions[name];
            
            // Check if it's a default function
            let isDefaultFunction = false;
            let defaultFunctionData = null;
            if (window.DefaultFunctionsService && typeof window.DefaultFunctionsService.getEnabledDefaultFunctions === 'function') {
                const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                isDefaultFunction = !!enabledDefaultFunctions[name];
                defaultFunctionData = enabledDefaultFunctions[name];
                Logger.debug(`Available default functions: ${Object.keys(enabledDefaultFunctions)}`);
            }
            
            if (!isUserDefinedFunction && !isDefaultFunction) {
                const errorMsg = `Function "${name}" not found in user-defined or default functions`;
                Logger.error(errorMsg);
                if (addSystemMessage) {
                    addSystemMessage(`Error: ${errorMsg}`);
                }
                throw new Error(errorMsg);
            }
            
            Logger.debug(`Function "${name}" found as ${isUserDefinedFunction ? 'user-defined' : 'default'} function`);
            
            Logger.debug(`Checking if function "${name}" is enabled`);
            Logger.debug(`Enabled user-defined functions: ${enabledFunctions}`);
            
            // For user-defined functions, check if they're in the enabled list
            // For default functions, they're enabled by virtue of being in the enabled default functions storage
            const isEnabled = isUserDefinedFunction ? enabledFunctions.includes(name) : isDefaultFunction;
            
            if (!isEnabled) {
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
            
            if (addSystemMessage && window.DebugService && DebugService.isCategoryEnabled('functions')) {
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
        
        _logSuccessfulExecution: function(name, result, addSystemMessage) {
            if (addSystemMessage && window.DebugService && DebugService.isCategoryEnabled('functions')) {
                let resultText = '';
                try {
                    // Pretty-print the result
                    if (typeof result === 'object' && result !== null) {
                        resultText = '\n\nResult:\n' + JSON.stringify(result, null, 2);
                    } else {
                        resultText = '\n\nResult: ' + String(result);
                    }
                } catch (e) {
                    resultText = '\n\nResult: ' + String(result);
                }
                
                addSystemMessage(`Function "${name}" executed successfully${resultText}`);
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
        
        _createSuccessResult: function(toolCall, name, result, executionTime) {
            const toolResult = {
                tool_call_id: toolCall.id,
                role: "tool",
                content: JSON.stringify(result)
            };
            
            Logger.debug(`Created tool result for "${name}" (${executionTime}ms):`, toolResult);
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
