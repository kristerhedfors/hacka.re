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
 * Multiplies two numbers together
 * @description A simple function that multiplies two numbers and returns the result
 * @param {number} a - The first number to multiply
 * @param {number} b - The second number to multiply
 * @returns {Object} Object containing the result of the multiplication
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
  
  // Return the result
  return {
    result: result,
    success: true
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
            
            // Create function items
            functionNames.forEach(name => {
                const functionSpec = functions[name];
                const isEnabled = FunctionToolsService.isJsFunctionEnabled(name);
                
                const functionItem = document.createElement('div');
                functionItem.className = 'function-item';
                
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
                    descriptionElement.style.color = 'rgba(0, 0, 0, 0.6)';
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
                deleteButton.title = 'Delete function';
                deleteButton.addEventListener('click', () => {
                    if (confirm(`Are you sure you want to delete the function "${name}"?`)) {
                        FunctionToolsService.removeJsFunction(name);
                        renderFunctionList();
                        
                        // Add system message about the deletion
                        if (addSystemMessage) {
                            addSystemMessage(`Function "${name}" removed.`);
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
         * Validate the function code
         * @returns {Object} Validation result with success, message, and tool definition
         */
        function validateFunction() {
            const name = elements.functionName.value.trim();
            const code = elements.functionCode.value.trim();
            
            // Reset validation result and tool definition
            hideValidationResult();
            hideToolDefinition();
            
            // Validate name
            if (!name) {
                showValidationResult('Function name is required', 'error');
                return { success: false };
            }
            
            // Check if name follows JavaScript naming conventions
            if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
                showValidationResult('Invalid function name. Must start with a letter, underscore, or $ and contain only letters, numbers, underscores, or $', 'error');
                return { success: false };
            }
            
            // Validate code
            if (!code) {
                showValidationResult('Function code is required', 'error');
                return { success: false };
            }
            
            try {
                // Check if the code is a valid function - normalize indentation
                const normalizedCode = code.replace(/^[ \t]+/gm, '');
                // Allow comments and whitespace before the function declaration
                const functionMatch = normalizedCode.match(/(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/);
                if (!functionMatch) {
                    showValidationResult('Invalid function format. Must be a named function declaration like: function funcName(a, b) { ... }', 'error');
                    return { success: false };
                }
                
                const functionName = functionMatch[1];
                
                // Check if the function name matches the provided name
                if (functionName !== name) {
                    showValidationResult(`Function name in code (${functionName}) does not match the provided name (${name})`, 'error');
                    return { success: false };
                }
                
                // Check for basic syntax errors by trying to parse the function
                try {
                    // Use Function constructor to check for syntax errors
                    // This won't execute the code, just parse it
                    new Function(code);
                } catch (syntaxError) {
                    showValidationResult(`Syntax error in function: ${syntaxError.message}`, 'error');
                    return { success: false };
                }
                
                // Try to extract function parameters and description using Function.toString()
                const toolDefinition = generateToolDefinition(name, code);
                
                // Show the tool definition
                showToolDefinition(toolDefinition);
                
                // Show success message
                showValidationResult('Function validated successfully!', 'success');
                
                return { 
                    success: true, 
                    toolDefinition 
                };
            } catch (error) {
                showValidationResult(`Error validating function: ${error.message}`, 'error');
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
         * Handle adding or updating a function
         * @param {Event} event - The form submit event
         */
        function handleAddFunction(event) {
            event.preventDefault();
            
            // Validate the function first
            const validation = validateFunction();
            
            if (!validation.success) {
                return;
            }
            
            const name = elements.functionName.value.trim();
            const code = elements.functionCode.value.trim();
            
            let success;
            let message;
            
            // Check if we're editing an existing function or adding a new one
            if (editingFunctionName) {
                // If the name has changed (shouldn't happen due to readonly, but just in case)
                if (editingFunctionName !== name) {
                    // Remove the old function
                    FunctionToolsService.removeJsFunction(editingFunctionName);
                }
                
                // Update the function
                success = FunctionToolsService.addJsFunction(name, code, validation.toolDefinition);
                message = `Function "${name}" updated successfully.`;
                
                // Reset editing flag
                editingFunctionName = null;
            } else {
                // Add new function
                success = FunctionToolsService.addJsFunction(name, code, validation.toolDefinition);
                message = `Function "${name}" added successfully.`;
            }
            
            if (success) {
                // Enable the function by default
                FunctionToolsService.enableJsFunction(name);
                
                // Render updated list
                renderFunctionList();
                
                // Add system message
                if (addSystemMessage) {
                    addSystemMessage(`Function "${name}" ${editingFunctionName ? 'updated' : 'added'} and enabled for tool calling.`);
                }
                
                // Show success message
                showValidationResult(message, 'success');
                
                // Keep the function in the editor for further editing
                // Focus back on the function code field for further editing
                if (elements.functionCode) {
                    setTimeout(() => {
                        elements.functionCode.focus();
                    }, 100);
                }
            } else {
                showValidationResult(`Failed to ${editingFunctionName ? 'update' : 'add'} function. Please check the function code.`, 'error');
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
         * Clear the function editor
         */
        function clearFunctionEditor() {
            // Reset editing flag
            editingFunctionName = null;
            
            if (elements.functionName) {
                elements.functionName.value = '';
                // Remove auto-completed styling and make editable
                elements.functionName.classList.remove('auto-completed');
                elements.functionName.removeAttribute('readonly');
            }
            
            if (elements.functionCode) {
                elements.functionCode.value = getDefaultFunctionCode();
                // Extract function name from default code
                setTimeout(extractFunctionName, 100);
            }
            
            hideValidationResult();
            hideToolDefinition();
            
            // Focus back on the function name field
            if (elements.functionName) {
                setTimeout(() => {
                    elements.functionName.focus();
                }, 100);
            }
        }
        
        /**
         * Extract function name from code and auto-fill the function name field
         */
        function extractFunctionName() {
            if (!elements.functionCode || !elements.functionName) return;
            
            const code = elements.functionCode.value.trim();
            if (!code) return;
            
            try {
                // Normalize indentation
                const normalizedCode = code.replace(/^[ \t]+/gm, '');
                
                // First, try to find a function declaration anywhere in the code
                // This will work even if there are JSDoc comments or other code before the function
                const functionMatch = normalizedCode.match(/(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/);
                
                if (functionMatch) {
                    const functionName = functionMatch[1];
                    
                    // Auto-fill the function name field
                    elements.functionName.value = functionName;
                    
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
