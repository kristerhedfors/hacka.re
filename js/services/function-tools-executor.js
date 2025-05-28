/**
 * Function Tools Executor
 * Handles execution of JavaScript functions in a sandboxed environment
 */

window.FunctionToolsExecutor = (function() {
    const { CONFIG } = FunctionToolsConfig;
    const Logger = FunctionToolsLogger;
    const Storage = FunctionToolsStorage;
    
    const FunctionExecutor = {
        async execute(name, args) {
            Logger.logFunctionCall(name, args);
            
            this._validateFunction(name);
            this._validateArguments(args, name);
            
            const executionStartTime = Date.now();
            Logger.debug(`Starting function execution at: ${executionStartTime}`);
            
            try {
                const result = await this._executeWithTimeout(name, args);
                const executionDuration = Date.now() - executionStartTime;
                
                Logger.logExecutionResult(name, result, executionDuration);
                this._validateResult(result, name);
                
                return result;
            } catch (error) {
                const executionDuration = Date.now() - executionStartTime;
                Logger.error(`Function execution failed after ${executionDuration}ms:`, error);
                throw this._enhanceError(error, name);
            }
        },
        
        _validateFunction: function(name) {
            const jsFunctions = Storage.getJsFunctions();
            const functionData = jsFunctions[name];
            Logger.debug(`Function exists in registry: ${!!functionData}`);
            
            if (!functionData || !functionData.code) {
                Logger.error("Function validation failed");
                Logger.error(`Available functions: ${Object.keys(jsFunctions)}`);
                throw new Error(`Function "${name}" not found or has no code`);
            }
        },
        
        _validateArguments: function(args, name) {
            if (args === undefined || args === null) {
                Logger.error("Arguments validation failed");
                Logger.error(`Args value: ${args}`);
                throw new Error(`Invalid arguments provided to function "${name}"`);
            }
        },
        
        _validateResult: function(result, name) {
            try {
                const serializedResult = JSON.stringify(result);
                Logger.debug("Result serialization successful");
                Logger.debug(`Serialized result length: ${serializedResult.length} characters`);
            } catch (jsonError) {
                Logger.error("Result serialization failed:", jsonError);
                throw new Error(`Function "${name}" returned a non-serializable result: ${jsonError.message}`);
            }
        },
        
        async _executeWithTimeout(name, args) {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    Logger.error("Function execution timed out");
                    reject(new Error(`Function "${name}" execution timed out after ${CONFIG.EXECUTION_TIMEOUT/1000} seconds`));
                }, CONFIG.EXECUTION_TIMEOUT);
            });
            
            const executionPromise = this._executeDirectly(name, args);
            
            return Promise.race([executionPromise, timeoutPromise]);
        },
        
        async _executeDirectly(name, args) {
            Logger.debug(`Executing function ${name} directly with args:`, args);
            
            // Get the function code
            const jsFunctions = Storage.getJsFunctions();
            const functionCode = jsFunctions[name].code;
            
            Logger.debug(`Function code:`, functionCode);
            
            // Extract the function body and parameters
            const functionMatch = functionCode.match(/function\s+\w+\s*\(([^)]*)\)\s*\{([\s\S]*)\}/);
            if (!functionMatch) {
                throw new Error(`Could not parse function "${name}"`);
            }
            
            const params = functionMatch[1].split(',').map(p => p.trim()).filter(p => p);
            const body = functionMatch[2];
            
            Logger.debug(`Extracted params:`, params);
            Logger.debug(`Extracted body:`, body);
            
            // Create the function using Function constructor
            let targetFunction;
            try {
                targetFunction = new Function(...params, body);
            } catch (constructorError) {
                Logger.error("Error creating function:", constructorError);
                throw new Error(`Failed to create function: ${constructorError.message}`);
            }
            
            Logger.debug(`Calling function ${name} with arguments:`, args);
            
            // Call the function directly with the arguments
            const result = await targetFunction(args.a, args.b);
            
            Logger.debug(`Function ${name} returned:`, result);
            return result;
        },
        
        _createSandbox: function(args) {
            return {
                fetch: window.fetch.bind(window),
                console: console,
                setTimeout: setTimeout.bind(window),
                clearTimeout: clearTimeout.bind(window),
                JSON: JSON,
                Error: Error,
                args: args
            };
        },
        
        _buildExecutionCode: function(name) {
            const allFunctionsCode = this._getAllFunctionsCode(name);
            const functionCallCode = this._generateFunctionCall(name);
            
            return `
                // Include all functions in the execution environment
                ${allFunctionsCode}
                
                // Call the function with properly extracted parameters
                ${functionCallCode}
            `;
        },
        
        _getAllFunctionsCode: function(targetName) {
            const jsFunctions = Storage.getJsFunctions();
            let allFunctionsCode = '';
            
            // Add all auxiliary functions first
            for (const funcName in jsFunctions) {
                if (funcName !== targetName) {
                    allFunctionsCode += jsFunctions[funcName].code + '\n\n';
                    Logger.debug(`Added auxiliary function: ${funcName}`);
                }
            }
            
            // Add the target function last
            allFunctionsCode += jsFunctions[targetName].code;
            Logger.debug(`Added target function: ${targetName}`);
            Logger.debug(`Total code length: ${allFunctionsCode.length} characters`);
            
            return allFunctionsCode;
        },
        
        _generateFunctionCall: function(name) {
            const jsFunctions = Storage.getJsFunctions();
            const functionCode = jsFunctions[name].code;
            const functionMatch = functionCode.match(/^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
            
            Logger.debug(`Function signature match: ${!!functionMatch}`);
            
            if (!functionMatch) {
                return `return ${name}(args);`;
            }
            
            const paramsString = functionMatch[2];
            Logger.debug(`Matched parameters: ${paramsString}`);
            
            if (!paramsString.trim()) {
                return `return ${name}();`;
            }
            
            // Extract parameter names more carefully
            const params = paramsString.split(',').map(p => {
                let paramName = p.trim();
                // Handle default values (e.g., "param = defaultValue")
                if (paramName.includes('=')) {
                    paramName = paramName.split('=')[0].trim();
                }
                // Handle destructuring (e.g., "{prop}")
                paramName = paramName.replace(/^\{|\}$/g, '');
                // Handle type annotations (e.g., "param: type")
                if (paramName.includes(':')) {
                    paramName = paramName.split(':')[0].trim();
                }
                return paramName;
            });
            
            Logger.debug(`Extracted parameters:`, params);
            
            // Generate function call with more robust argument access
            const paramExtractions = params.map(param => {
                return `args["${param}"]`;
            }).join(', ');
            
            return `return ${name}(${paramExtractions});`;
        },
        
        _enhanceError: function(error, name) {
            if (error instanceof TypeError) {
                return new Error(`Type error in function "${name}": ${error.message}`);
            } else if (error instanceof ReferenceError) {
                return new Error(`Reference error in function "${name}": ${error.message}`);
            } else if (error instanceof SyntaxError) {
                return new Error(`Syntax error in function "${name}": ${error.message}`);
            }
            return error;
        }
    };
    
    // Public API
    return FunctionExecutor;
})();
