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
                
                // Skip dash checking and sanitization for now - it's causing issues with valid code
                // The function names should already be sanitized by the parser/registry
                executionFunction = new Function(...sandboxKeys, executionCode);
            } catch (constructorError) {
                Logger.error("Error creating execution function:", constructorError);
                Logger.error("Problematic execution code:", executionCode);
                throw new Error(`Failed to create execution function: ${constructorError.message}`);
            }
            
            Logger.debug(`Calling function ${name} with arguments:`, args);
            
            // Execute the function with sandbox and ensure proper async handling
            try {
                const result = await executionFunction(...Object.values(sandbox));
                
                Logger.debug(`Function ${name} returned:`, result);
                
                // If the result is a Promise, wait for it to resolve
                if (result && typeof result.then === 'function') {
                    Logger.debug(`Function ${name} returned a Promise, awaiting resolution...`);
                    const resolvedResult = await result;
                    Logger.debug(`Promise from ${name} resolved to:`, resolvedResult);
                    return resolvedResult;
                }
                
                return result;
            } catch (executionError) {
                Logger.error(`Error during function execution for ${name}:`, executionError);
                // Check if this is a timeout or async handling issue
                if (executionError.message && executionError.message.includes('timeout')) {
                    Logger.error(`Function ${name} execution timed out - this may be due to unresolved promises`);
                }
                throw executionError;
            }
        },
        
        _createSandbox: function(args) {
            // Create a more complete sandbox that includes necessary browser APIs
            // for MCP functions and other advanced functions
            return {
                window: window,
                document: document,
                fetch: window.fetch ? window.fetch.bind(window) : undefined,
                console: console,
                setTimeout: setTimeout.bind(window),
                clearTimeout: clearTimeout.bind(window),
                setInterval: setInterval.bind(window),
                clearInterval: clearInterval.bind(window),
                Promise: Promise,
                JSON: JSON,
                Error: Error,
                Array: Array,
                Object: Object,
                String: String,
                Number: Number,
                Boolean: Boolean,
                Date: Date,
                Math: Math,
                RegExp: RegExp,
                // Include any MCP-related globals that functions might need
                MCPClientService: window.MCPClientService,
                MCPManager: window.MCPManager,
                MCPIntrospectionService: window.MCPIntrospectionService,
                // Include function tools globals
                FunctionToolsService: window.FunctionToolsService,
                args: args
            };
        },
        
        _buildExecutionCode: function(name) {
            const allFunctionsCode = this._getAllFunctionsCode(name);
            const functionCallCode = this._generateFunctionCall(name);
            
            // Check if the function call uses await (indicating an async function)
            const needsAsync = functionCallCode.includes('await ');
            
            if (needsAsync) {
                return `
                    // Include all functions in the execution environment
                    ${allFunctionsCode}
                    
                    // Wrap in async function to handle await
                    return (async () => {
                        ${functionCallCode}
                    })();
                `;
            } else {
                return `
                    // Include all functions in the execution environment
                    ${allFunctionsCode}
                    
                    // Call the function with properly extracted parameters
                    ${functionCallCode}
                `;
            }
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
            let functionData = jsFunctions[name] || null;
            
            // If not found in user-defined functions, check default functions
            if (!functionCode && window.DefaultFunctionsService) {
                const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                functionCode = enabledDefaultFunctions[name] ? enabledDefaultFunctions[name].code : null;
                functionData = enabledDefaultFunctions[name] || null;
            }
            
            // Check if this is an MCP function by looking up the collection ID
            let isMcpFunction = false;
            if (functionData && window.FunctionToolsStorage) {
                try {
                    const functionCollections = window.FunctionToolsStorage.getFunctionCollections();
                    const collectionId = functionCollections[name];
                    // MCP functions have collection IDs starting with 'mcp_' or equal to 'mcp_tools_collection'
                    isMcpFunction = collectionId && (collectionId.startsWith('mcp_') || collectionId === 'mcp_tools_collection');
                } catch (error) {
                    Logger.debug(`Error checking MCP function collection for ${name}:`, error);
                }
            }
            Logger.debug(`Function ${name} is MCP function: ${isMcpFunction}`);
            // More flexible regex to handle multiline function signatures
            // Look for function name and parameters, handling newlines and spaces
            const functionMatch = functionCode.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*([^)]*?)\s*\)/s);
            const asyncMatch = functionCode.match(/async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*([^)]*?)\s*\)/s);
            
            Logger.debug(`Function signature match: ${!!functionMatch}`);
            Logger.debug(`Async function match: ${!!asyncMatch}`);
            Logger.debug(`Function match details:`, functionMatch);
            Logger.debug(`Async match details:`, asyncMatch);
            
            // Use async match if available, otherwise regular match
            const match = asyncMatch || functionMatch;
            
            if (!match) {
                const actualFunctionName = name.replace(/[^a-zA-Z0-9_$]/g, '_');
                return `return ${actualFunctionName}(args);`;
            }
            
            const isAsync = !!asyncMatch;
            const actualFunctionName = match[1];
            const paramsString = match[2];
            
            Logger.debug(`Function is async: ${isAsync}`);
            Logger.debug(`Actual function name: ${actualFunctionName}`);
            Logger.debug(`Matched parameters: ${paramsString}`);
            
            if (!paramsString.trim()) {
                return `return ${isAsync ? 'await ' : ''}${actualFunctionName}();`;
            }
            
            // For MCP functions, spread the args object to match function parameters
            if (isMcpFunction) {
                Logger.debug(`Generating MCP function call - spreading args to match parameters`);
                Logger.debug(`Raw parameter string: "${paramsString}"`);
                // Extract parameter names from the function signature
                const params = paramsString.split(',').map(p => p.trim()).filter(p => p);
                Logger.debug(`Extracted params from signature:`, params);
                // Generate code that extracts each parameter from args
                const paramValues = params.map(param => `args['${param}']`).join(', ');
                Logger.debug(`Generated param values code: ${paramValues}`);
                const callCode = `return ${isAsync ? 'await ' : ''}${actualFunctionName}(${paramValues});`;
                Logger.debug(`Final call code: ${callCode}`);
                return callCode;
            }
            
            // For non-MCP functions, extract individual parameters (existing behavior)
            // Extract parameter names more carefully
            // First clean the string of any newlines and extra spaces
            const cleanParamsString = paramsString.replace(/\s+/g, ' ').trim();
            const params = cleanParamsString.split(',').map(p => {
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
            }).filter(param => param.length > 0); // Filter out empty params
            
            Logger.debug(`Extracted parameters:`, params);
            
            // Generate function call with more robust argument access
            const paramExtractions = params.map(param => {
                return `args["${param}"]`;
            }).join(', ');
            
            Logger.debug(`Generated parameter extractions: ${paramExtractions}`);
            const executionCode = `return ${isAsync ? 'await ' : ''}${actualFunctionName}(${paramExtractions});`;
            Logger.debug(`Generated execution code: ${executionCode}`);
            
            return executionCode;
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
