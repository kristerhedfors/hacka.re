/**
 * Function Parser Module
 * Handles JSDoc parsing, function extraction, and code structure analysis
 */

window.FunctionParser = (function() {
    
    /**
     * Extract all functions from code
     * @param {string} code - The code to extract functions from
     * @returns {Array} Array of function objects with name, code, and isCallable properties
     */
    function extractFunctions(code) {
        if (!code) return [];
        
        try {
            // Normalize indentation
            const normalizedCode = code.replace(/^[ \t]+/gm, '');
            
            // Find all function declarations in the code
            const functionRegex = /(\/\*\*[\s\S]*?\*\/\s*)?(\/\/.*?(?:\n\s*|$))?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)[\s\S]*?(?=\/\*\*|\s*\/\/|\s*function\s+[a-zA-Z_$]|\s*$|$)/g;
            
            console.log('Extracting functions with regex:', functionRegex.source);
            
            const functions = [];
            let match;
            
            while ((match = functionRegex.exec(normalizedCode)) !== null) {
                const jsDoc = match[1] || '';
                const singleLineComment = match[2] || '';
                const functionName = match[3];
                const params = match[4];
                
                // Get the full function code by finding the opening brace and matching closing brace
                const functionStartIndex = match.index + (jsDoc ? jsDoc.length : 0);
                const functionDeclaration = normalizedCode.substring(functionStartIndex);
                
                // Find the function body by matching braces
                let braceCount = 0;
                let endIndex = 0;
                let foundOpeningBrace = false;
                
                for (let i = 0; i < functionDeclaration.length; i++) {
                    const char = functionDeclaration[i];
                    
                    if (char === '{') {
                        foundOpeningBrace = true;
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                        
                        if (foundOpeningBrace && braceCount === 0) {
                            endIndex = i + 1;
                            break;
                        }
                    }
                }
                
                // Extract the full function code including JSDoc
                const fullFunctionCode = (jsDoc || '') + functionDeclaration.substring(0, endIndex);
                
                // Check if the function is marked as callable with any of the supported markers
                const hasCallableMarker = jsDoc && (
                    jsDoc.includes('@callable_function') || 
                    jsDoc.includes('@callable') || 
                    jsDoc.includes('@tool')
                );
                
                // Check for single-line comments with @callable or @tool
                const hasSingleLineCommentMarker = singleLineComment && 
                    (singleLineComment.includes('@callable') || singleLineComment.includes('@tool'));
                
                // Check if the function is marked as internal
                const hasInternalMarker = (jsDoc && jsDoc.includes('@internal')) || 
                    (singleLineComment && singleLineComment.includes('@internal'));
                
                // Initialize isCallable to false for internal functions, undefined for others
                const initialIsCallable = hasInternalMarker ? false : undefined;
                
                // Mark as callable if it has any of the markers
                const isCallable = hasCallableMarker || hasSingleLineCommentMarker || initialIsCallable;
                    
                functions.push({
                    name: functionName,
                    code: fullFunctionCode,
                    isCallable: isCallable,
                    isInternal: hasInternalMarker
                });
            }
            
            // Check if any function has a callable marker
            const hasAnyCallableMarker = functions.some(func => {
                const functionCode = func.code;
                const jsDoc = functionCode.match(/\/\*\*[\s\S]*?\*\//)?.[0] || '';
                const singleLineComments = functionCode.match(/\/\/.*?(?:\n|$)/g) || [];
                
                const hasCallableMarker = jsDoc && (
                    jsDoc.includes('@callable_function') || 
                    jsDoc.includes('@callable') || 
                    jsDoc.includes('@tool')
                );
                
                const hasSingleLineCommentMarker = singleLineComments.some(comment => 
                    comment.includes('@callable') || comment.includes('@tool')
                );
                
                return hasCallableMarker || hasSingleLineCommentMarker;
            });
            
            // Check if any function has an internal marker
            const hasAnyInternalMarker = functions.some(func => func.isInternal);
            
            // If no function has a callable marker:
            if (!hasAnyCallableMarker && functions.length > 0) {
                // If there are any @internal markers, mark all functions as callable EXCEPT those marked as @internal
                if (hasAnyInternalMarker) {
                    functions.forEach(func => {
                        // Only set isCallable if it hasn't been explicitly set already
                        if (func.isCallable === undefined) {
                            func.isCallable = !func.isInternal;
                        }
                    });
                } else {
                    // If no @internal markers either, mark all as callable (original behavior)
                    functions.forEach(func => {
                        func.isCallable = true;
                    });
                }
            }
            
            return functions;
        } catch (error) {
            console.error('Error extracting functions:', error);
            return [];
        }
    }
    
    /**
     * Map JavaScript types to JSON Schema types
     * @param {string} jsType - JavaScript type
     * @returns {string} JSON Schema type
     */
    function mapJSTypeToJSONType(jsType) {
        const typeMap = {
            'string': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'object': 'object',
            'array': 'array',
            'null': 'null',
            'undefined': 'null',
            'any': 'string'
        };
        
        return typeMap[jsType.toLowerCase()] || 'string';
    }
    
    /**
     * Extract function name from the first function in code
     * @param {string} code - The code to extract function name from
     * @returns {string|null} Function name or null if not found
     */
    function extractFunctionName(code) {
        if (!code) return null;
        
        try {
            const functions = extractFunctions(code);
            return functions.length > 0 ? functions[0].name : null;
        } catch (error) {
            console.error('Error extracting function name:', error);
            return null;
        }
    }
    
    // Public API
    return {
        extractFunctions,
        mapJSTypeToJSONType,
        extractFunctionName
    };
})();