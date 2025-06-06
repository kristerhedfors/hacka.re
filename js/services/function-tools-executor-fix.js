/**
 * Function Tools Executor Fix
 * Enhanced version that handles various argument passing scenarios
 */

window.FunctionToolsExecutorFix = (function() {
    const originalExecutor = window.FunctionToolsExecutor;
    
    // Override the _generateFunctionCall method to handle arguments better
    originalExecutor._generateFunctionCall = function(name) {
        const jsFunctions = FunctionToolsStorage.getJsFunctions();
        const functionCode = jsFunctions[name].code;
        const functionMatch = functionCode.match(/^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
        
        console.log(`[Executor Fix] Function signature match: ${!!functionMatch}`);
        
        if (!functionMatch) {
            return `return ${name}(args);`;
        }
        
        const paramsString = functionMatch[2];
        console.log(`[Executor Fix] Matched parameters: ${paramsString}`);
        
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
        
        console.log(`[Executor Fix] Extracted parameters:`, params);
        console.log(`[Executor Fix] Arguments object:`, 'args');
        
        // Generate function call with extensive logging and fallback handling
        const paramExtractions = params.map((param, index) => {
            return `(function() {
                const value = args["${param}"] !== undefined ? args["${param}"] : 
                             args[${index}] !== undefined ? args[${index}] : 
                             args.${param} !== undefined ? args.${param} : 
                             undefined;
                console.log("[Executor Fix] Parameter '${param}' resolved to:", value);
                return value;
            })()`;
        }).join(', ');
        
        return `
            console.log("[Executor Fix] Calling ${name} with args object:", args);
            console.log("[Executor Fix] Args type:", typeof args);
            console.log("[Executor Fix] Args keys:", Object.keys(args));
            
            // If args is an array, convert to object based on parameter names
            let processedArgs = args;
            if (Array.isArray(args)) {
                console.log("[Executor Fix] Converting array args to object");
                processedArgs = {};
                ${params.map((param, index) => `processedArgs["${param}"] = args[${index}];`).join('\n                ')}
                args = processedArgs;
            }
            
            // If args has nested structure, try to flatten it
            if (args && typeof args === 'object' && !Array.isArray(args)) {
                // Check if all values are objects that might need flattening
                const needsFlattening = Object.values(args).some(v => 
                    v && typeof v === 'object' && !Array.isArray(v) && !v.constructor || v.constructor === Object
                );
                
                if (needsFlattening) {
                    console.log("[Executor Fix] Attempting to flatten nested args");
                    const flattened = {};
                    for (const [key, value] of Object.entries(args)) {
                        if (value && typeof value === 'object' && !Array.isArray(value)) {
                            // Try to extract a string representation
                            flattened[key] = value.toString !== Object.prototype.toString ? 
                                           value.toString() : 
                                           JSON.stringify(value);
                        } else {
                            flattened[key] = value;
                        }
                    }
                    args = flattened;
                    console.log("[Executor Fix] Flattened args:", args);
                }
            }
            
            const result = ${name}(${paramExtractions});
            console.log("[Executor Fix] Function ${name} returned:", result);
            return result;
        `;
    };
    
    return originalExecutor;
})();

// Apply the fix when DOM is ready or immediately if already ready
function applyExecutorFix() {
    if (window.FunctionToolsExecutor) {
        console.log("[Executor Fix] Applying function executor fix");
        
        // Store reference to original method
        const originalGenerateFunctionCall = window.FunctionToolsExecutor._generateFunctionCall;
        
        // Override the method
        window.FunctionToolsExecutor._generateFunctionCall = function(name) {
            const jsFunctions = FunctionToolsStorage.getJsFunctions();
            let functionCode = jsFunctions[name] ? jsFunctions[name].code : null;
            
            // If not found in user-defined functions, check default functions
            if (!functionCode && window.DefaultFunctionsService) {
                const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                functionCode = enabledDefaultFunctions[name] ? enabledDefaultFunctions[name].code : null;
            }
            const functionMatch = functionCode.match(/(?:^|\s|\/\*\*[\s\S]*?\*\/\s*)(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
            
            console.log(`[Executor Fix] Function signature match: ${!!functionMatch}`);
            
            if (!functionMatch) {
                return `return ${name}(args);`;
            }
            
            const paramsString = functionMatch[2];
            console.log(`[Executor Fix] Matched parameters: ${paramsString}`);
            
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
            
            console.log(`[Executor Fix] Extracted parameters:`, params);
            
            return `
                console.log("[Executor Fix] Calling ${name} with args object:", args);
                console.log("[Executor Fix] Args type:", typeof args);
                console.log("[Executor Fix] Args keys:", args ? Object.keys(args) : 'null/undefined');
                
                // If args is an array, convert to object based on parameter names
                let processedArgs = args;
                if (Array.isArray(args)) {
                    console.log("[Executor Fix] Converting array args to object");
                    processedArgs = {};
                    ${params.map((param, index) => `processedArgs["${param}"] = args[${index}];`).join('\n                    ')}
                    args = processedArgs;
                    console.log("[Executor Fix] Converted args:", args);
                }
                
                // If args has nested structure, try to flatten it
                if (args && typeof args === 'object' && !Array.isArray(args)) {
                    const needsFlattening = Object.values(args).some(v => 
                        v && typeof v === 'object' && !Array.isArray(v) && (!v.constructor || v.constructor === Object)
                    );
                    
                    if (needsFlattening) {
                        console.log("[Executor Fix] Attempting to flatten nested args");
                        const flattened = {};
                        for (const [key, value] of Object.entries(args)) {
                            if (value && typeof value === 'object' && !Array.isArray(value)) {
                                // Try to extract a string representation
                                flattened[key] = value.toString !== Object.prototype.toString ? 
                                               value.toString() : 
                                               JSON.stringify(value);
                            } else {
                                flattened[key] = value;
                            }
                        }
                        args = flattened;
                        console.log("[Executor Fix] Flattened args:", args);
                    }
                }
                
                // Extract parameters with multiple fallback strategies
                ${params.map((param, index) => `
                const ${param} = (function() {
                    let value = args ? args["${param}"] : undefined;
                    if (value === undefined && args) value = args[${index}];
                    if (value === undefined && args) value = args.${param};
                    console.log("[Executor Fix] Parameter '${param}' resolved to:", value);
                    return value;
                })();`).join('')}
                
                const result = ${name}(${params.join(', ')});
                console.log("[Executor Fix] Function ${name} returned:", result);
                return result;
            `;
        };
        
        console.log("[Executor Fix] Function executor fix applied successfully");
        return true;
    }
    return false;
}

// Try to apply immediately
if (!applyExecutorFix()) {
    // If not ready, wait for DOM content loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyExecutorFix);
    } else {
        // Try again after a short delay
        setTimeout(applyExecutorFix, 100);
    }
}
