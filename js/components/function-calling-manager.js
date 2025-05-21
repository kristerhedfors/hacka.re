/**
 * Function Calling Manager Module
 * Handles function calling UI and functionality for the AIHackare application
 */

window.FunctionCallingManager = (function() {
    /**
     * Create a Function Calling Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Function Calling Manager instance
     */
    function createFunctionCallingManager(elements, addSystemMessage) {
        // Track if we're editing an existing function
        let editingFunctionName = null;
        /**
         * Initialize the function calling manager
         */
        function init() {
            // Set up event listeners
            if (elements.functionBtn) {
                elements.functionBtn.addEventListener('click', showFunctionModal);
            }
            
            if (elements.closeFunctionModal) {
                elements.closeFunctionModal.addEventListener('click', hideFunctionModal);
            }
            
            if (elements.functionEditorForm) {
                elements.functionEditorForm.addEventListener('submit', handleAddFunction);
            }
            
            if (elements.functionValidateBtn) {
                elements.functionValidateBtn.addEventListener('click', validateFunction);
            }
            
            if (elements.functionClearBtn) {
                elements.functionClearBtn.addEventListener('click', clearFunctionEditor);
            }
            
            // Add event listeners for copy buttons
            if (elements.copyFunctionCodeBtn) {
                elements.copyFunctionCodeBtn.addEventListener('click', copyFunctionCode);
            }
            
            if (elements.copyToolDefinitionBtn) {
                elements.copyToolDefinitionBtn.addEventListener('click', copyToolDefinition);
            }
            
            // Add event listener for copying function library
            if (elements.copyFunctionLibraryBtn) {
                elements.copyFunctionLibraryBtn.addEventListener('click', copyFunctionLibrary);
            }
            
            // Add event listener for function code changes to auto-extract function name
            if (elements.functionCode) {
                elements.functionCode.addEventListener('input', extractFunctionName);
            }
            
            // Set initial function code example
            if (elements.functionCode && !elements.functionCode.value) {
                elements.functionCode.value = getDefaultFunctionCode();
                // Extract function name from default code
                setTimeout(extractFunctionName, 100);
            }
            
            // Load functions from storage and render them
            renderFunctionList();
            
            console.log('Function Calling Manager initialized');
        }
        
        /**
         * Get default function code example
         * @returns {string} Default function code
         */
        function getDefaultFunctionCode() {
            return `/**
 * Formats a number with commas as thousands separators
 * This is an auxiliary function that won't be exposed to the LLM
 * @param {number} num - The number to format
 * @returns {string} The formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
}

/**
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} IMPORTANT: Always return an object, not a primitive value.
 * @tool This function will be exposed to the LLM for tool calling
 */
function multiply_numbers(a, b) {
  // Validate inputs are numbers
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { 
      error: "Both inputs must be numbers",
      success: false
    };
  }
  
  // Perform the multiplication
  const result = a * b;
  
  // Format the result using the auxiliary function
  const formattedResult = formatNumber(result);
  
  // IMPORTANT: Always return an object, not a primitive value like 'return result'
  // Returning a primitive value may cause issues with tool calling
  return {
    result: result,
    formattedResult: formattedResult,
    success: true
  };
}

/**
 * Gets the current weather for a location
 * @description Fetches current weather data for the specified location
 * @param {string} location - The location to get weather for
 * @param {string} units - The units to use (metric or imperial)
 * @returns {Object} Weather information
 * @callable This function will be exposed to the LLM for tool calling
 */
function get_weather(location, units = "metric") {
  // This is just a mock implementation
  return {
    location: location,
    temperature: 22,
    units: units,
    condition: "Sunny",
    humidity: "45%",
    formatted_temp: formatNumber(22) + (units === "metric" ? "°C" : "°F")
  };
}`;
        }
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.add('active');
                renderFunctionList();
                
                // Focus on the function name field
                if (elements.functionName) {
                    setTimeout(() => {
                        elements.functionName.focus();
                    }, 100);
                }
            }
        }
        
        /**
         * Hide the function modal
         */
        function hideFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.remove('active');
            }
        }
        
        /**
         * Render the list of functions
         */
        function renderFunctionList() {
            if (!elements.functionList) return;
            
            // Clear the list
            elements.functionList.innerHTML = '';
            
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            
            // Show empty state if no functions
            if (functionNames.length === 0) {
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'block';
                    
                    // Make sure the empty state is in the function list
                    if (elements.emptyFunctionState.parentElement !== elements.functionList) {
                        elements.functionList.appendChild(elements.emptyFunctionState);
                    }
                }
                return;
            }
            
            // Hide empty state
            if (elements.emptyFunctionState) {
                elements.emptyFunctionState.style.display = 'none';
            }
            
            // Group functions by their group ID
            const groupedFunctions = {};
            const groupColors = {};
            let colorIndex = 1;
            
            // First pass: group functions and assign colors to groups
            functionNames.forEach(name => {
                const relatedFunctions = FunctionToolsService.getFunctionsInSameGroup(name);
                const groupKey = relatedFunctions.sort().join(','); // Use sorted function names as key
                
                if (!groupedFunctions[groupKey]) {
                    groupedFunctions[groupKey] = relatedFunctions;
                    // Assign a color to this group (cycle through 5 colors)
                    groupColors[groupKey] = `color-${colorIndex}`;
                    colorIndex = colorIndex % 5 + 1; // Cycle through colors 1-5
                }
            });
            
            // Create function items - only show callable functions
            functionNames.forEach(name => {
                const functionSpec = functions[name];
                
                // Skip auxiliary functions (those with description indicating they're not exposed to LLM)
                if (functionSpec.toolDefinition && 
                    functionSpec.toolDefinition.function && 
                    functionSpec.toolDefinition.function.description &&
                    functionSpec.toolDefinition.function.description.includes('(not exposed to LLM)')) {
                    return;
                }
                
                const isEnabled = FunctionToolsService.isJsFunctionEnabled(name);
                
                // Get the group this function belongs to
                const relatedFunctions = FunctionToolsService.getFunctionsInSameGroup(name);
                const groupKey = relatedFunctions.sort().join(',');
                const groupColor = groupColors[groupKey] || 'color-1';
                
                const functionItem = document.createElement('div');
                functionItem.className = 'function-item';
                functionItem.dataset.groupColor = groupColor;
                functionItem.dataset.groupKey = groupKey;
                
                // Add a color indicator based on the group
                functionItem.style.borderLeft = `4px solid var(--function-${groupColor})`;
                
                // Create checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'function-item-checkbox';
                checkbox.checked = isEnabled;
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        FunctionToolsService.enableJsFunction(name);
                    } else {
                        FunctionToolsService.disableJsFunction(name);
                    }
                    
                    // Add system message about the change
                    if (addSystemMessage) {
                        const status = checkbox.checked ? 'enabled' : 'disabled';
                        addSystemMessage(`Function "${name}" ${status} for tool calling.`);
                    }
                });
                
                // Create content container (will be clickable)
                const contentContainer = document.createElement('div');
                contentContainer.style.flex = '1';
                contentContainer.style.cursor = 'pointer';
                contentContainer.title = 'Click to edit function';
                
                // Create name element
                const nameElement = document.createElement('div');
                nameElement.className = 'function-item-name';
                nameElement.textContent = name;
                
                // Create description element if available
                let descriptionElement = null;
                if (functionSpec.toolDefinition && functionSpec.toolDefinition.function && functionSpec.toolDefinition.function.description) {
                    descriptionElement = document.createElement('div');
                    descriptionElement.className = 'function-item-description';
                    descriptionElement.textContent = functionSpec.toolDefinition.function.description;
                    descriptionElement.style.fontSize = '0.85rem';
                    descriptionElement.style.marginTop = '0.25rem';
                }
                
                // Add click event to load function into editor
                contentContainer.addEventListener('click', () => {
                    loadFunctionIntoEditor(name, functionSpec);
                });
                
                // Create delete button
                const deleteButton = document.createElement('button');
                deleteButton.className = 'function-item-delete';
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.title = 'Delete function and its related functions';
                deleteButton.addEventListener('click', () => {
                    // Get all functions in the same group
                    const relatedFunctions = FunctionToolsService.getFunctionsInSameGroup(name);
                    
                    // Create confirmation message based on group size
                    let confirmMessage;
                    if (relatedFunctions.length > 1) {
                        // Format the list of functions for display
                        const functionsList = relatedFunctions
                            .filter(f => f !== name) // Exclude the current function
                            .map(f => `"${f}"`)
                            .join(', ');
                        
                        confirmMessage = `Are you sure you want to delete the function "${name}" and its related ${relatedFunctions.length - 1} function(s): ${functionsList}?`;
                        confirmMessage += `\n\nAll functions in this ${groupColor} group will be deleted.`;
                    } else {
                        confirmMessage = `Are you sure you want to delete the function "${name}"?`;
                    }
                    
                    if (confirm(confirmMessage)) {
                        FunctionToolsService.removeJsFunction(name);
                        renderFunctionList();
                        
                        // Add system message about the deletion
                        if (addSystemMessage) {
                            if (relatedFunctions.length > 1) {
                                addSystemMessage(`Function "${name}" and ${relatedFunctions.length - 1} related functions removed.`);
                            } else {
                                addSystemMessage(`Function "${name}" removed.`);
                            }
                        }
                    }
                });
                
                // Assemble function item
                functionItem.appendChild(checkbox);
                
                contentContainer.appendChild(nameElement);
                if (descriptionElement) {
                    contentContainer.appendChild(descriptionElement);
                }
                functionItem.appendChild(contentContainer);
                
                functionItem.appendChild(deleteButton);
                
                // Add to list
                elements.functionList.appendChild(functionItem);
            });
        }
        
        /**
         * Validate the function library code
         * @returns {Object} Validation result with success, message, and extracted functions
         */
        function validateFunction() {
            const code = elements.functionCode.value.trim();
            
            // Reset validation result and tool definition
            hideValidationResult();
            hideToolDefinition();
            
            // Validate code
            if (!code) {
                showValidationResult('Function code is required', 'error');
                return { success: false };
            }
            
            try {
                // Check for basic syntax errors by trying to parse the code
                try {
                    // Use Function constructor to check for syntax errors
                    // This won't execute the code, just parse it
                    new Function(code);
                } catch (syntaxError) {
                    showValidationResult(`Syntax error in code: ${syntaxError.message}`, 'error');
                    return { success: false };
                }
                
                // Extract all functions from the code
                const functions = extractFunctions(code);
                
                if (functions.length === 0) {
                    showValidationResult('No functions found in the code', 'error');
                    return { success: false };
                }
                
                // Count callable functions
                const callableFunctions = functions.filter(func => func.isCallable);
                
                if (callableFunctions.length === 0) {
                    showValidationResult('No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent), or if functions are marked with @internal (which makes only non-@internal functions callable)', 'warning');
                    // Still return success, but with a warning
                    return { 
                        success: true,
                        functions: functions,
                        warning: true
                    };
                }
                
                // Generate tool definitions for callable functions
                const toolDefinitions = callableFunctions.map(func => 
                    generateToolDefinition(func.name, func.code)
                );
                
                // Show the first tool definition as an example
                if (toolDefinitions.length > 0) {
                    showToolDefinition(toolDefinitions[0]);
                }
                
                // Show success message
                showValidationResult(`Library validated successfully! Found ${functions.length} functions, ${callableFunctions.length} marked as callable.`, 'success');
                
                return { 
                    success: true, 
                    functions: functions,
                    callableFunctions: callableFunctions,
                    toolDefinitions: toolDefinitions
                };
            } catch (error) {
                showValidationResult(`Error validating function library: ${error.message}`, 'error');
                return { success: false };
            }
        }
        
        /**
         * Generate a tool definition from a function
         * @param {string} name - Function name
         * @param {string} code - Function code
         * @returns {Object} Tool definition
         */
        function generateToolDefinition(name, code) {
            // Create a basic tool definition
            const toolDefinition = {
                type: 'function',
                function: {
                    name: name,
                    description: `Function ${name} for tool calling`,
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            };
            
            try {
                // Extract function parameters
                const paramMatch = code.match(/function\s+[^(]*\(([^)]*)\)/);
                if (paramMatch && paramMatch[1].trim()) {
                    const params = paramMatch[1].split(',').map(p => p.trim());
                    
                    params.forEach(param => {
                        // Check for default values
                        const hasDefault = param.includes('=');
                        const paramName = hasDefault ? param.split('=')[0].trim() : param;
                        
                        toolDefinition.function.parameters.properties[paramName] = {
                            type: 'string', // Default to string type
                            description: `Parameter ${paramName} for function ${name}`
                        };
                        
                        // If no default value, consider it required
                        if (!hasDefault) {
                            toolDefinition.function.parameters.required.push(paramName);
                        }
                    });
                }
                
                // Try to extract JSDoc comments for description and param types
                const jsDocMatch = code.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
                if (jsDocMatch) {
                    const jsDoc = jsDocMatch[1];
                    
                    // Extract function description
                    const descMatch = jsDoc.match(/@description\s+(.*?)(?=\s*@|\s*\*\/|$)/s);
                    if (descMatch) {
                        toolDefinition.function.description = descMatch[1].replace(/\s*\*\s*/g, ' ').trim();
                    }
                    
                    // Extract param descriptions and types
                    const paramMatches = jsDoc.matchAll(/@param\s+{([^}]+)}\s+([^\s]+)\s+(.*?)(?=\s*@|\s*\*\/|$)/gs);
                    for (const match of paramMatches) {
                        const [, type, name, description] = match;
                        
                        if (toolDefinition.function.parameters.properties[name]) {
                            toolDefinition.function.parameters.properties[name].type = mapJSTypeToJSONType(type);
                            toolDefinition.function.parameters.properties[name].description = description.replace(/\s*\*\s*/g, ' ').trim();
                        }
                    }
                }
                
                return toolDefinition;
            } catch (error) {
                console.error('Error generating tool definition:', error);
                return toolDefinition;
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
         * Load a function into the editor for editing
         * @param {string} name - Function name
         * @param {Object} functionSpec - Function specification
         */
        function loadFunctionIntoEditor(name, functionSpec) {
            // Set the editing flag
            editingFunctionName = name;
            
            // Set the function name
            if (elements.functionName) {
                elements.functionName.value = name;
                // Make it read-only since it's auto-completed
                elements.functionName.classList.add('auto-completed');
                elements.functionName.setAttribute('readonly', 'readonly');
            }
            
            // Set the function code
            if (elements.functionCode && functionSpec.code) {
                elements.functionCode.value = functionSpec.code;
                
                // Trigger any event listeners that might be attached to the code editor
                const event = new Event('input', { bubbles: true });
                elements.functionCode.dispatchEvent(event);
            }
            
            // Scroll to the editor form
            if (elements.functionEditorForm) {
                elements.functionEditorForm.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Hide validation result and tool definition
            hideValidationResult();
            hideToolDefinition();
            
            console.log(`Loaded function "${name}" into editor for editing`);
        }
        
        /**
         * Handle adding or updating functions
         * @param {Event} event - The form submit event
         */
        function handleAddFunction(event) {
            event.preventDefault();
            
            // Validate the function library first
            const validation = validateFunction();
            
            if (!validation.success) {
                return;
            }
            
            const code = elements.functionCode.value.trim();
            
            // If we're in edit mode, handle it differently
            if (editingFunctionName) {
                // Remove the old function
                FunctionToolsService.removeJsFunction(editingFunctionName);
                
                // Reset editing flag
                editingFunctionName = null;
            }
            
            // Process all functions
            if (validation.functions && validation.functions.length > 0) {
                // Keep track of added callable functions
                const addedFunctions = [];
                
                // Generate a unique group ID for this set of functions
                const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                // First, add all auxiliary functions (non-callable)
                const auxiliaryFunctions = validation.functions.filter(func => !func.isCallable);
                auxiliaryFunctions.forEach(func => {
                    // Add the function but don't enable it for tool calling
                    FunctionToolsService.addJsFunction(
                        func.name, 
                        func.code, 
                        { // Create a minimal tool definition for auxiliary functions
                            type: 'function',
                            function: {
                                name: func.name,
                                description: `Auxiliary function ${func.name} (not exposed to LLM)`,
                                parameters: {
                                    type: 'object',
                                    properties: {},
                                    required: []
                                }
                            }
                        },
                        groupId // Pass the group ID to associate all functions
                    );
                });
                
                // Then add callable functions
                const callableFunctions = validation.callableFunctions || [];
                callableFunctions.forEach((func, index) => {
                    // Add the function
                    const success = FunctionToolsService.addJsFunction(
                        func.name, 
                        func.code, 
                        validation.toolDefinitions[index],
                        groupId // Pass the group ID to associate all functions
                    );
                    
                    if (success) {
                        // Enable the function by default
                        FunctionToolsService.enableJsFunction(func.name);
                        addedFunctions.push(func.name);
                    }
                });
                
                // Render updated list
                renderFunctionList();
                
                // Add system message
                if (addSystemMessage) {
                    if (addedFunctions.length === 1) {
                        addSystemMessage(`Function "${addedFunctions[0]}" added and enabled for tool calling.`);
                    } else if (addedFunctions.length > 1) {
                        addSystemMessage(`${addedFunctions.length} functions added and enabled for tool calling: ${addedFunctions.join(', ')}`);
                    }
                }
                
                // Show success message
                if (addedFunctions.length === 1) {
                    showValidationResult(`Function "${addedFunctions[0]}" added successfully.`, 'success');
                } else if (addedFunctions.length > 1) {
                    showValidationResult(`${addedFunctions.length} functions added successfully.`, 'success');
                } else {
                    showValidationResult('No functions were added. Please check your code.', 'error');
                }
                
                // Keep the function in the editor for further editing
                // Focus back on the function code field for further editing
                if (elements.functionCode) {
                    setTimeout(() => {
                        elements.functionCode.focus();
                    }, 100);
                }
            } else {
                // No callable functions found
                showValidationResult('No callable functions found. By default, all functions are callable unless at least one function is tagged with @callable or @tool (equivalent), or if functions are marked with @internal (which makes only non-@internal functions callable)', 'warning');
            }
        }
        
        /**
         * Show validation result
         * @param {string} message - The message
         * @param {string} type - The type of message (success, error, warning)
         */
        function showValidationResult(message, type) {
            if (elements.functionValidationResult) {
                elements.functionValidationResult.textContent = message;
                elements.functionValidationResult.className = 'function-validation-result';
                elements.functionValidationResult.classList.add(type);
            }
        }
        
        /**
         * Hide validation result
         */
        function hideValidationResult() {
            if (elements.functionValidationResult) {
                elements.functionValidationResult.className = 'function-validation-result';
            }
        }
        
        /**
         * Show tool definition
         * @param {Object} toolDefinition - The tool definition
         */
        function showToolDefinition(toolDefinition) {
            if (elements.functionToolDefinition) {
                elements.functionToolDefinition.textContent = JSON.stringify(toolDefinition, null, 2);
                elements.functionToolDefinition.classList.add('active');
            }
        }
        
        /**
         * Hide tool definition
         */
        function hideToolDefinition() {
            if (elements.functionToolDefinition) {
                elements.functionToolDefinition.classList.remove('active');
            }
        }
        
        /**
         * Reset the function editor to the currently active functions
         */
        function clearFunctionEditor() {
            hideValidationResult();
            hideToolDefinition();
            
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            
            if (editingFunctionName && functions[editingFunctionName]) {
                // If we're editing a function, reload just that function and its related functions
                
                // Get all functions in the same group
                const relatedFunctions = FunctionToolsService.getFunctionsInSameGroup(editingFunctionName);
                
                // If we have related functions, combine them
                if (relatedFunctions.length > 1) {
                    // Sort the functions to ensure consistent order
                    relatedFunctions.sort();
                    
                    // Combine the code of all related functions
                    const combinedCode = relatedFunctions
                        .filter(name => functions[name]) // Ensure the function exists
                        .map(name => functions[name].code)
                        .join('\n\n');
                    
                    if (elements.functionCode) {
                        elements.functionCode.value = combinedCode;
                        
                        // Trigger any event listeners that might be attached to the code editor
                        const event = new Event('input', { bubbles: true });
                        elements.functionCode.dispatchEvent(event);
                    }
                } else {
                    // If no related functions, just load this function
                    loadFunctionIntoEditor(editingFunctionName, functions[editingFunctionName]);
                }
            } else if (functionNames.length > 0) {
                // If we have active functions, we need to group them by their group IDs
                const functionGroups = {};
                
                // Group functions by their group ID
                functionNames.forEach(name => {
                    const relatedFunctions = FunctionToolsService.getFunctionsInSameGroup(name);
                    const groupKey = relatedFunctions.sort().join(','); // Use sorted function names as key
                    
                    if (!functionGroups[groupKey]) {
                        functionGroups[groupKey] = relatedFunctions;
                    }
                });
                
                // Get unique groups
                const uniqueGroups = Object.values(functionGroups);
                
                // Combine code from each group
                const combinedCode = uniqueGroups.map(group => {
                    return group
                        .filter(name => functions[name]) // Ensure the function exists
                        .map(name => functions[name].code)
                        .join('\n\n');
                }).join('\n\n\n');
                
                if (elements.functionCode) {
                    elements.functionCode.value = combinedCode;
                    
                    // Trigger any event listeners that might be attached to the code editor
                    const event = new Event('input', { bubbles: true });
                    elements.functionCode.dispatchEvent(event);
                }
                
                // Reset editing flag
                editingFunctionName = null;
                
                if (elements.functionName) {
                    elements.functionName.value = '';
                    // Remove auto-completed styling and make editable
                    elements.functionName.classList.remove('auto-completed');
                    elements.functionName.removeAttribute('readonly');
                }
            } else {
                // If no active functions, use the default function code
                if (elements.functionCode) {
                    elements.functionCode.value = getDefaultFunctionCode();
                    // Extract function name from default code
                    setTimeout(extractFunctionName, 100);
                }
                
                // Reset editing flag
                editingFunctionName = null;
                
                if (elements.functionName) {
                    elements.functionName.value = '';
                    // Remove auto-completed styling and make editable
                    elements.functionName.classList.remove('auto-completed');
                    elements.functionName.removeAttribute('readonly');
                }
            }
            
            // Focus back on the function code field
            if (elements.functionCode) {
                setTimeout(() => {
                    elements.functionCode.focus();
                }, 100);
            }
        }
        
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
                // This regex captures the JSDoc comment (if any), any single-line comment before the function, and the function declaration
                // The improved regex better handles multiple functions with JSDoc comments
                // Modified to better handle closely packed functions by ensuring we capture the entire function body
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
                // in JSDoc comments: @callable_function, @callable, @tool
                const hasCallableMarker = jsDoc && (
                    jsDoc.includes('@callable_function') || 
                    jsDoc.includes('@callable') || 
                    jsDoc.includes('@tool')
                );
                
                // Check for single-line comments with @callable or @tool
                // This will match both "// @callable" and "// @tool"
                const hasSingleLineCommentMarker = singleLineComment && 
                    (singleLineComment.includes('@callable') || singleLineComment.includes('@tool'));
                
                // Check if the function is marked as internal
                // This is a critical check that determines if a function should be excluded from callable functions
                const hasInternalMarker = (jsDoc && jsDoc.includes('@internal')) || 
                    (singleLineComment && singleLineComment.includes('@internal'));
                
                // Initialize isCallable to false for internal functions, undefined for others
                // This ensures internal functions are never callable unless explicitly marked
                const initialIsCallable = hasInternalMarker ? false : undefined;
                
                // Debug logging to help diagnose parsing issues
                console.log(`Function ${functionName} parsing:`, {
                    jsDoc: jsDoc ? jsDoc.substring(0, 50) + '...' : 'none',
                    singleLineComment: singleLineComment ? singleLineComment.trim() : 'none',
                    hasCallableMarker,
                    hasSingleLineCommentMarker,
                    hasInternalMarker
                });
                
                // We don't need to check for comments within the function body anymore
                // as they should be captured by the singleLineComment group
                // This was causing issues with detecting comments meant for other functions
                
                // Mark as callable if it has any of the markers
                // If it has a callable/tool marker, that takes precedence over @internal
                // Otherwise, use the initialIsCallable value (false for internal functions)
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
                    // Check if this function has a callable marker
                    const functionCode = func.code;
                    
                    // Extract JSDoc comments
                    const jsDoc = functionCode.match(/\/\*\*[\s\S]*?\*\//)?.[0] || '';
                    
                    // Extract all single-line comments
                    const singleLineComments = functionCode.match(/\/\/.*?(?:\n|$)/g) || [];
                    
                    // Check JSDoc for callable markers
                    const hasCallableMarker = jsDoc && (
                        jsDoc.includes('@callable_function') || 
                        jsDoc.includes('@callable') || 
                        jsDoc.includes('@tool')
                    );
                    
                    // Check all single-line comments for markers
                    const hasSingleLineCommentMarker = singleLineComments.some(comment => 
                        comment.includes('@callable') || comment.includes('@tool')
                    );
                    
                    // Check for internal markers
                    const hasInternalMarker = jsDoc.includes('@internal') || 
                        singleLineComments.some(comment => comment.includes('@internal'));
                    
                    // Debug logging for callable markers
                    console.log(`Checking callable markers for ${func.name}:`, {
                        jsDoc: jsDoc ? 'present' : 'none',
                        singleLineComments: singleLineComments.length > 0 ? singleLineComments.join(' | ') : 'none',
                        hasCallableMarker,
                        hasSingleLineCommentMarker
                    });
                    
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
                            
                            // Debug logging for internal markers
                            console.log(`Setting callable status for ${func.name}:`, {
                                isInternal: func.isInternal,
                                isCallable: func.isCallable
                            });
                        });
                    } else {
                        // If no @internal markers either, mark all as callable (original behavior)
                        functions.forEach(func => {
                            func.isCallable = true;
                        });
                    }
                }
                // If at least one function has a callable marker, only those explicitly marked remain callable
                // (the @internal tag has no effect in this case as it's already the default for non-tagged functions)
                
                // Log the final callable status
                console.log('Final callable status:', functions.map(f => `${f.name} (callable: ${f.isCallable})`));
                
                // Log the functions and their callable status for debugging
                console.log('Extracted functions:', functions.map(f => `${f.name} (callable: ${f.isCallable})`));
                
                return functions;
            } catch (error) {
                console.error('Error extracting functions:', error);
                return [];
            }
        }
        
        /**
         * Extract function name from code and auto-fill the function name field
         * This is kept for backward compatibility with the single function editor
         */
        function extractFunctionName() {
            if (!elements.functionCode || !elements.functionName) return;
            
            const code = elements.functionCode.value.trim();
            if (!code) return;
            
            try {
                // Extract all functions from the code
                const functions = extractFunctions(code);
                
                // If we found at least one function, use the first one
                if (functions.length > 0) {
                    const firstFunction = functions[0];
                    
                    // Auto-fill the function name field
                    elements.functionName.value = firstFunction.name;
                    
                    // Add auto-completed class to style the field
                    elements.functionName.classList.add('auto-completed');
                    
                    // Make the field read-only
                    elements.functionName.setAttribute('readonly', 'readonly');
                } else {
                    // If no function name found, remove auto-completed styling and make editable
                    elements.functionName.classList.remove('auto-completed');
                    elements.functionName.removeAttribute('readonly');
                }
            } catch (error) {
                console.error('Error extracting function name:', error);
            }
        }
        
        /**
         * Copy function code to clipboard
         */
        function copyFunctionCode() {
            if (!elements.functionCode) return;
            
            const code = elements.functionCode.value.trim();
            if (!code) {
                if (addSystemMessage) {
                    addSystemMessage('No function code to copy.');
                }
                return;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(code)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Function code copied to clipboard.');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy function code:', err);
                    if (addSystemMessage) {
                        addSystemMessage('Failed to copy function code. Please try again.');
                    }
                });
        }
        
        /**
         * Copy tool definition to clipboard
         */
        function copyToolDefinition() {
            if (!elements.functionToolDefinition) return;
            
            const toolDefinition = elements.functionToolDefinition.textContent.trim();
            if (!toolDefinition || !elements.functionToolDefinition.classList.contains('active')) {
                if (addSystemMessage) {
                    addSystemMessage('No tool definition to copy. Please validate the function first.');
                }
                return;
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(toolDefinition)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Tool definition copied to clipboard.');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy tool definition:', err);
                    if (addSystemMessage) {
                        addSystemMessage('Failed to copy tool definition. Please try again.');
                    }
                });
        }
        
        /**
         * Copy entire function library as JSON to clipboard
         */
        function copyFunctionLibrary() {
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            
            if (!functions || Object.keys(functions).length === 0) {
                if (addSystemMessage) {
                    addSystemMessage('No functions in library to copy.');
                }
                return;
            }
            
            try {
                // Create a JSON representation of the functions library
                const functionsLibrary = {};
                
                // For each function, include its code and tool definition
                Object.keys(functions).forEach(name => {
                    functionsLibrary[name] = {
                        code: functions[name].code,
                        toolDefinition: functions[name].toolDefinition,
                        enabled: FunctionToolsService.isJsFunctionEnabled(name)
                    };
                });
                
                // Convert to JSON string with pretty formatting
                const jsonString = JSON.stringify(functionsLibrary, null, 2);
                
                // Copy to clipboard
                navigator.clipboard.writeText(jsonString)
                    .then(() => {
                        if (addSystemMessage) {
                            addSystemMessage('Function library copied to clipboard as JSON.');
                        }
                    })
                    .catch(err => {
                        console.error('Failed to copy function library:', err);
                        if (addSystemMessage) {
                            addSystemMessage('Failed to copy function library. Please try again.');
                        }
                    });
            } catch (error) {
                console.error('Error serializing function library:', error);
                if (addSystemMessage) {
                    addSystemMessage(`Error copying function library: ${error.message}`);
                }
            }
        }
        
        /**
         * Get function definitions for API requests
         * @returns {Array} Array of function definitions
         */
        function getFunctionDefinitions() {
            return FunctionToolsService.getToolDefinitions();
        }
        
        // Public API
        return {
            init,
            showFunctionModal,
            hideFunctionModal,
            renderFunctionList,
            getFunctionDefinitions,
            validateFunction
        };
    }

    // Public API
    return {
        createFunctionCallingManager: createFunctionCallingManager
    };
})();
