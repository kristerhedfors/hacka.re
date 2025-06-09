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
                
                // Return both result and execution time
                return {
                    result: result,
                    executionTime: executionDuration
                };
            } catch (error) {
                const executionDuration = Date.now() - executionStartTime;
                Logger.error(`Function execution failed after ${executionDuration}ms:`, error);
                throw this._enhanceError(error, name);
            }
        },
        
        _validateFunction: function(name) {
            const jsFunctions = Storage.getJsFunctions();
            let functionData = jsFunctions[name];
            let isUserDefinedFunction = !!functionData;
            
            // If not found in user-defined functions, check default functions
            if (!isUserDefinedFunction && window.DefaultFunctionsService) {
                const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                functionData = enabledDefaultFunctions[name];
            }
            
            Logger.debug(`Function exists in ${isUserDefinedFunction ? 'user-defined' : 'default'} functions: ${!!functionData}`);
            
            if (!functionData || !functionData.code) {
                Logger.error("Function validation failed");
                Logger.error(`Available user-defined functions: ${Object.keys(jsFunctions)}`);
                if (window.DefaultFunctionsService) {
                    const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                    Logger.error(`Available default functions: ${Object.keys(enabledDefaultFunctions)}`);
                }
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
            
            // Build execution code that includes all functions
            const executionCode = this._buildExecutionCode(name);
            // Commented out verbose logging - use for deep debugging only
            // Logger.debug(`Execution code:`, executionCode);
            
            // Create sandbox environment
            const sandbox = this._createSandbox(args);
            
            // Create the function using Function constructor with all functions included
            let executionFunction;
            try {
                // Sanitize sandbox keys to ensure valid JavaScript identifiers
                const sandboxKeys = Object.keys(sandbox).map(key => key.replace(/[^a-zA-Z0-9_$]/g, '_'));
                const sandboxValues = Object.values(sandbox);
                
                // Debug: Log the execution code that's causing issues
                Logger.debug("Generated execution code (first 500 chars):", executionCode.substring(0, 500));
                Logger.debug("Generated execution code (last 200 chars):", executionCode.substring(Math.max(0, executionCode.length - 200)));
                Logger.debug("Sandbox keys:", sandboxKeys);
                
                // Check for problematic patterns in the code
                const dashPattern = /[a-zA-Z0-9_$]*-[a-zA-Z0-9_$]*/g;
                const dashMatches = executionCode.match(dashPattern);
                if (dashMatches) {
                    Logger.error("Found potential problematic identifiers with dashes:", dashMatches);
                }
                
                // Sanitize execution code to replace any remaining dashes in identifiers
                // This is a safety net to prevent syntax errors from function/variable names with dashes
                // BUT we must be careful not to change string literals!
                let sanitizedExecutionCode = executionCode;
                // Only replace identifier patterns with dashes, but NOT inside strings
                // This regex avoids strings by using negative lookbehind/lookahead for quotes
                sanitizedExecutionCode = sanitizedExecutionCode.replace(/(?<!['"])\b([a-zA-Z_$][a-zA-Z0-9_$]*)-([a-zA-Z0-9_$]+)\b(?!['"]*)/g, '$1_$2');
                
                executionFunction = new Function(...sandboxKeys, sanitizedExecutionCode);
            } catch (constructorError) {
                Logger.error("Error creating execution function:", constructorError);
                Logger.error("Problematic execution code:", executionCode);
                throw new Error(`Failed to create execution function: ${constructorError.message}`);
            }
            
            Logger.debug(`Calling function ${name} with arguments:`, args);
            
            // Execute the function with sandbox
            const result = await executionFunction(...Object.values(sandbox));
            
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
            
            // Get default functions if available
            let enabledDefaultFunctions = {};
            if (window.DefaultFunctionsService) {
                enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
            }
            
            // Add all auxiliary user-defined functions first
            for (const funcName in jsFunctions) {
                if (funcName !== targetName) {
                    allFunctionsCode += jsFunctions[funcName].code + '\n\n';
                    // Logger.debug(`Added auxiliary user-defined function: ${funcName}`);
                }
            }
            
            // Add all auxiliary default functions
            for (const funcName in enabledDefaultFunctions) {
                if (funcName !== targetName) {
                    allFunctionsCode += enabledDefaultFunctions[funcName].code + '\n\n';
                    // Logger.debug(`Added auxiliary default function: ${funcName}`);
                }
            }
            
            // Add the target function last (check both sources)
            if (jsFunctions[targetName]) {
                allFunctionsCode += jsFunctions[targetName].code;
                // Logger.debug(`Added target user-defined function: ${targetName}`);
            } else if (enabledDefaultFunctions[targetName]) {
                allFunctionsCode += enabledDefaultFunctions[targetName].code;
                // Logger.debug(`Added target default function: ${targetName}`);
            }
            
            // Logger.debug(`Total code length: ${allFunctionsCode.length} characters`);
            
            return allFunctionsCode;
        },
        
        _generateFunctionCall: function(name) {
            const jsFunctions = Storage.getJsFunctions();
            let functionCode = jsFunctions[name] ? jsFunctions[name].code : null;
            
            // If not found in user-defined functions, check default functions
            if (!functionCode && window.DefaultFunctionsService) {
                const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                functionCode = enabledDefaultFunctions[name] ? enabledDefaultFunctions[name].code : null;
            }
            const functionMatch = functionCode.match(/(?:^|\s|\/\*\*[\s\S]*?\*\/\s*)(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
            
            Logger.debug(`Function signature match: ${!!functionMatch}`);
            
            // Use the actual function name from the code, not the original name which might have dashes
            const actualFunctionName = functionMatch ? functionMatch[1] : name.replace(/[^a-zA-Z0-9_$]/g, '_');
            
            if (!functionMatch) {
                return `return ${actualFunctionName}(args);`;
            }
            
            const paramsString = functionMatch[2];
            Logger.debug(`Matched parameters: ${paramsString}`);
            
            if (!paramsString.trim()) {
                return `return ${actualFunctionName}();`;
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
            
            return `return ${actualFunctionName}(${paramExtractions});`;
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
