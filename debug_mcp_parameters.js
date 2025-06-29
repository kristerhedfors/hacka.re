// Debug function to test MCP parameter passing
// Run this in the browser console after MCP functions are loaded

function debugMCPParameters() {
    console.log("=== MCP PARAMETER DEBUG ===");
    
    if (!window.FunctionToolsService) {
        console.error("FunctionToolsService not available");
        return;
    }
    
    // Get the list_directory function
    const functions = window.FunctionToolsService.getJsFunctions();
    const listDirFunction = functions['list_directory'];
    
    if (!listDirFunction) {
        console.error("list_directory function not found");
        console.log("Available functions:", Object.keys(functions));
        return;
    }
    
    console.log("✅ Found list_directory function");
    console.log("Function code (first 300 chars):", listDirFunction.code.substring(0, 300));
    
    // Test the regex patterns
    const code = listDirFunction.code;
    
    // Test simple regex
    const functionMatch = code.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
    const asyncMatch = code.match(/async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
    
    console.log("Function match:", functionMatch);
    console.log("Async match:", asyncMatch);
    
    const match = asyncMatch || functionMatch;
    if (match) {
        const isAsync = !!asyncMatch;
        const actualFunctionName = match[1];
        const paramsString = match[2];
        
        console.log("✅ Regex extraction successful:");
        console.log("  - Is async:", isAsync);
        console.log("  - Function name:", actualFunctionName);
        console.log("  - Parameters string:", paramsString);
        
        if (paramsString.trim()) {
            const params = paramsString.split(',').map(p => p.trim());
            console.log("  - Extracted params:", params);
            
            const paramExtractions = params.map(param => `args["${param}"]`).join(', ');
            console.log("  - Parameter extractions:", paramExtractions);
            
            const executionCode = `return ${isAsync ? 'await ' : ''}${actualFunctionName}(${paramExtractions});`;
            console.log("  - Generated execution code:", executionCode);
            
            console.log("✅ SUCCESS: Parameter extraction working correctly!");
        } else {
            console.log("❌ FAILED: No parameters extracted");
        }
    } else {
        console.log("❌ FAILED: Regex did not match function signature");
    }
    
    // Test actual function execution
    console.log("\n=== TESTING FUNCTION EXECUTION ===");
    
    const testArgs = { path: "/Users/user/test" };
    console.log("Testing with args:", testArgs);
    
    try {
        // This should trigger our new parameter extraction logic
        if (window.FunctionToolsService.executeJsFunction) {
            console.log("Calling executeJsFunction...");
            // Note: This will actually call the MCP server, so we'll see the real result
            window.FunctionToolsService.executeJsFunction('list_directory', testArgs)
                .then(result => {
                    console.log("Function execution result:", result);
                })
                .catch(error => {
                    console.log("Function execution error:", error);
                });
        }
    } catch (error) {
        console.log("Error during test execution:", error);
    }
}

// Also add this as a global function
window.debugMCPParameters = debugMCPParameters;

console.log("Debug function loaded. Run debugMCPParameters() to test parameter passing.");