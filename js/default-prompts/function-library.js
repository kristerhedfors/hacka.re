/**
 * Function Library Default Prompt
 * Provides all JavaScript functions in the Function Library as a default prompt
 */

window.FunctionLibraryPrompt = {
    id: 'function_library',
    name: 'Function library',
    content: function() {
        // Get all functions from the Function Tools Service
        const allFunctions = window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {};
        
        // If no functions, return a message
        if (!allFunctions || Object.keys(allFunctions).length === 0) {
            return 'No JavaScript functions are currently defined in the Function Library.';
        }
        
        // Combine all function code
        const combinedCode = Object.values(allFunctions)
            .map(func => func.code)
            .join('\n\n');
        
        return `# Function Library

The following JavaScript functions are available in the Function Library:

\`\`\`javascript
${combinedCode}
\`\`\``;
    }
};
