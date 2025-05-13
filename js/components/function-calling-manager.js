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
            
            // Set initial function code example
            if (elements.functionCode && !elements.functionCode.value) {
                elements.functionCode.value = getDefaultFunctionCode();
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
            return `async function getCurrentTimeInBerlin() {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/Europe/Berlin');
    if (!response.ok) {
      throw new Error(\`API request failed with status \${response.status}\`);
    }
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
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
                
                const contentContainer = document.createElement('div');
                contentContainer.style.flex = '1';
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
                const functionMatch = normalizedCode.match(/^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/);
                if (!functionMatch) {
                    showValidationResult('Invalid function format. Must be a named function declaration.', 'error');
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
         * Handle adding a new function
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
            
            // Store both the function code and the tool definition
            const functionData = {
                code: code,
                toolDefinition: validation.toolDefinition
            };
            
            // Add function
            const success = FunctionToolsService.addJsFunction(name, code, validation.toolDefinition);
            
            if (success) {
                // Enable the function by default
                FunctionToolsService.enableJsFunction(name);
                
                // Clear form
                clearFunctionEditor();
                
                // Render updated list
                renderFunctionList();
                
                // Add system message
                if (addSystemMessage) {
                    addSystemMessage(`Function "${name}" added and enabled for tool calling.`);
                }
                
                // Focus back on the function name field for the next entry
                if (elements.functionName) {
                    setTimeout(() => {
                        elements.functionName.focus();
                    }, 100);
                }
            } else {
                showValidationResult('Failed to add function. Please check the function code.', 'error');
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
            if (elements.functionName) {
                elements.functionName.value = '';
            }
            
            if (elements.functionCode) {
                elements.functionCode.value = getDefaultFunctionCode();
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
