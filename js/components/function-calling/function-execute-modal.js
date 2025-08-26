/**
 * Function Execute Modal Module
 * Handles function execution testing modal display and functionality
 */

window.FunctionExecuteModal = (function() {
    
    let currentExecutionController = null;
    let executionStartTime = null;
    let currentFunctionName = null;
    
    /**
     * Create a Function Execute Modal instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add system messages
     * @returns {Object} Function Execute Modal instance
     */
    function createFunctionExecuteModal(elements, addSystemMessage) {
        
        /**
         * Initialize the execute modal
         */
        function init() {
            // Get modal elements
            const modal = document.getElementById('function-execute-modal');
            const closeBtn = document.getElementById('close-function-execute-modal');
            const executeBtn = document.getElementById('function-execute-run-btn');
            const outputToggle = document.getElementById('function-execute-output-toggle');
            const copyOutputBtn = document.getElementById('function-execute-copy-output-btn');
            const copyErrorBtn = document.getElementById('function-execute-copy-error-btn');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', hideExecuteModal);
            }
            
            if (executeBtn) {
                executeBtn.addEventListener('click', handleExecuteFunction);
            }
            
            if (outputToggle) {
                outputToggle.addEventListener('click', toggleOutputFormat);
            }
            
            if (copyOutputBtn) {
                copyOutputBtn.addEventListener('click', copyOutput);
            }
            
            if (copyErrorBtn) {
                copyErrorBtn.addEventListener('click', copyError);
            }
            
            // Close modal when clicking outside
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        hideExecuteModal();
                    }
                });
            }
            
            console.log('Function Execute Modal initialized');
        }
        
        /**
         * Show the execute modal for a specific function
         * @param {string} functionName - The function to execute
         * @param {string} functionCode - The function code
         */
        function showExecuteModal(functionName, functionCode) {
            const modal = document.getElementById('function-execute-modal');
            if (!modal) return;
            
            currentFunctionName = functionName;
            
            // Reset modal state
            resetModal();
            
            // Parse function to get metadata
            const functionInfo = parseFunctionInfo(functionName, functionCode);
            
            // Set function name and description
            const nameElement = document.getElementById('function-execute-function-name');
            const descElement = document.getElementById('function-execute-function-description');
            
            if (nameElement) {
                nameElement.textContent = functionName;
            }
            
            if (descElement) {
                descElement.textContent = functionInfo.description || 'No description available';
            }
            
            // Generate parameter inputs
            generateParameterInputs(functionInfo.parameters);
            
            // Show modal
            modal.classList.add('active');
        }
        
        /**
         * Hide the execute modal
         */
        function hideExecuteModal() {
            const modal = document.getElementById('function-execute-modal');
            if (modal) {
                modal.classList.remove('active');
            }
            
            // Cancel any running execution
            if (currentExecutionController) {
                currentExecutionController.abort();
                currentExecutionController = null;
            }
            
            resetExecuteButton();
            currentFunctionName = null;
        }
        
        /**
         * Reset the modal to initial state
         */
        function resetModal() {
            // Hide output/error sections
            const outputSection = document.getElementById('function-execute-output-section');
            const errorSection = document.getElementById('function-execute-error-section');
            
            if (outputSection) outputSection.style.display = 'none';
            if (errorSection) errorSection.style.display = 'none';
            
            // Clear timing
            const timingElement = document.getElementById('function-execute-timing');
            if (timingElement) {
                timingElement.textContent = '';
            }
            
            // Reset button state
            resetExecuteButton();
        }
        
        /**
         * Parse function info from code
         * @param {string} functionName - Function name
         * @param {string} functionCode - Function code
         * @returns {Object} Function info with parameters and description
         */
        function parseFunctionInfo(functionName, functionCode) {
            const info = {
                name: functionName,
                description: '',
                parameters: []
            };
            
            // Extract JSDoc description
            const descMatch = functionCode.match(/@description\s+(.+?)(?:\n|\*\/)/);
            if (descMatch) {
                info.description = descMatch[1].trim();
            } else {
                // Try to get description from JSDoc comment block
                const docMatch = functionCode.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/);
                if (docMatch) {
                    info.description = docMatch[1].trim();
                }
            }
            
            // Extract parameters from JSDoc
            const paramMatches = functionCode.matchAll(/@param\s+\{([^}]+)\}\s+(\w+)(?:\s*-\s*(.+?))?(?:\n|$)/gm);
            
            for (const match of paramMatches) {
                const [, type, name, description] = match;
                info.parameters.push({
                    name: name,
                    type: type,
                    description: description ? description.trim() : '',
                    required: !type.includes('?') && !functionCode.includes(`${name} =`) // Check if optional
                });
            }
            
            return info;
        }
        
        /**
         * Generate parameter input fields
         * @param {Array} parameters - Array of parameter objects
         */
        function generateParameterInputs(parameters) {
            const container = document.getElementById('function-execute-parameters-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (!parameters || parameters.length === 0) {
                container.innerHTML = '<div class="function-execute-no-params">This function has no parameters</div>';
                return;
            }
            
            parameters.forEach(param => {
                const paramDiv = document.createElement('div');
                paramDiv.className = 'function-parameter-input';
                
                const label = document.createElement('div');
                label.className = 'function-parameter-label';
                label.textContent = param.name + (param.required ? ' *' : '');
                
                const typeInfo = document.createElement('div');
                typeInfo.className = 'function-parameter-type';
                typeInfo.textContent = `Type: ${param.type}`;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'function-parameter-field';
                input.id = `param-${param.name}`;
                input.setAttribute('data-param-name', param.name);
                input.setAttribute('data-param-type', param.type);
                
                // Set placeholder with example values
                input.placeholder = getParameterPlaceholder(param);
                
                paramDiv.appendChild(label);
                paramDiv.appendChild(typeInfo);
                if (param.description) {
                    const desc = document.createElement('div');
                    desc.className = 'function-parameter-description';
                    desc.style.fontSize = '12px';
                    desc.style.color = 'var(--text-color-secondary)';
                    desc.style.marginBottom = '5px';
                    desc.textContent = param.description;
                    paramDiv.appendChild(desc);
                }
                paramDiv.appendChild(input);
                
                container.appendChild(paramDiv);
            });
        }
        
        /**
         * Get placeholder text for parameter based on type
         * @param {Object} param - Parameter object
         * @returns {string} Placeholder text
         */
        function getParameterPlaceholder(param) {
            const type = param.type.toLowerCase();
            const name = param.name.toLowerCase();
            
            if (type.includes('string')) {
                if (name.includes('name')) return 'Enter a name...';
                if (name.includes('email')) return 'user@example.com';
                if (name.includes('url')) return 'https://example.com';
                if (name.includes('location')) return 'San Francisco';
                return 'Enter text...';
            }
            
            if (type.includes('number')) {
                if (name.includes('age')) return '25';
                if (name.includes('price') || name.includes('cost')) return '99.99';
                if (name.includes('count') || name.includes('quantity')) return '5';
                return '42';
            }
            
            if (type.includes('boolean')) {
                return 'true or false';
            }
            
            if (type.includes('array')) {
                return '[1, 2, 3] or ["a", "b", "c"]';
            }
            
            if (type.includes('object')) {
                return '{"key": "value"}';
            }
            
            return `Enter ${type}...`;
        }
        
        /**
         * Handle function execution
         */
        async function handleExecuteFunction() {
            if (!currentFunctionName) return;
            
            const executeBtn = document.getElementById('function-execute-run-btn');
            const runIcon = document.getElementById('function-execute-run-icon');
            const runText = document.getElementById('function-execute-run-text');
            
            // Check if we're currently executing (stop button clicked)
            if (currentExecutionController) {
                currentExecutionController.abort();
                currentExecutionController = null;
                resetExecuteButton();
                updateTiming('Execution cancelled');
                return;
            }
            
            // Collect parameters
            const parameters = collectParameters();
            if (parameters === null) return; // Validation failed
            
            // Set executing state
            currentExecutionController = new AbortController();
            executeBtn.classList.add('executing');
            executeBtn.disabled = false; // Keep enabled to allow stopping
            
            if (runIcon) {
                runIcon.className = 'fas fa-stop';
            }
            if (runText) {
                runText.textContent = 'Stop';
            }
            
            // Start timing
            executionStartTime = performance.now();
            updateTiming('Executing...');
            
            // Hide previous results
            const outputSection = document.getElementById('function-execute-output-section');
            const errorSection = document.getElementById('function-execute-error-section');
            if (outputSection) outputSection.style.display = 'none';
            if (errorSection) errorSection.style.display = 'none';
            
            try {
                // Execute the function
                const result = await executeFunction(currentFunctionName, parameters, currentExecutionController.signal);
                
                const executionTime = performance.now() - executionStartTime;
                updateTiming(`Completed in ${executionTime.toFixed(2)}ms`);
                
                // Show result
                showOutput(result);
                
            } catch (error) {
                const executionTime = performance.now() - executionStartTime;
                
                if (error.name === 'AbortError') {
                    updateTiming('Execution cancelled');
                } else {
                    updateTiming(`Error after ${executionTime.toFixed(2)}ms`);
                    showError(error);
                }
            } finally {
                resetExecuteButton();
                currentExecutionController = null;
            }
        }
        
        /**
         * Collect parameter values from inputs
         * @returns {Array|null} Parameters array in correct order or null if validation fails
         */
        function collectParameters() {
            const paramInputs = document.querySelectorAll('[data-param-name]');
            const parametersMap = {};
            const parameterOrder = [];
            
            // First pass: collect all parameters and remember their order
            for (const input of paramInputs) {
                const paramName = input.getAttribute('data-param-name');
                const paramType = input.getAttribute('data-param-type');
                const value = input.value.trim();
                
                // Remember parameter order
                if (!parameterOrder.includes(paramName)) {
                    parameterOrder.push(paramName);
                }
                
                if (value === '') {
                    // Check if required (has * in label)
                    const label = input.parentElement.querySelector('.function-parameter-label');
                    if (label && label.textContent.includes('*')) {
                        showError(new Error(`Parameter "${paramName}" is required`));
                        input.focus();
                        return null;
                    }
                    // For optional parameters, use undefined
                    parametersMap[paramName] = undefined;
                    continue;
                }
                
                // Type conversion
                try {
                    parametersMap[paramName] = convertParameterValue(value, paramType);
                } catch (error) {
                    showError(new Error(`Invalid value for parameter "${paramName}": ${error.message}`));
                    input.focus();
                    return null;
                }
            }
            
            // Return parameters in correct order as an array
            return parameterOrder.map(paramName => parametersMap[paramName]);
        }
        
        /**
         * Convert parameter value to appropriate type
         * @param {string} value - Input value
         * @param {string} type - Parameter type
         * @returns {*} Converted value
         */
        function convertParameterValue(value, type) {
            const lowerType = type.toLowerCase();
            
            if (lowerType.includes('number')) {
                const num = Number(value);
                if (isNaN(num)) {
                    throw new Error('Must be a valid number');
                }
                return num;
            }
            
            if (lowerType.includes('boolean')) {
                const lower = value.toLowerCase();
                if (lower === 'true' || lower === '1') return true;
                if (lower === 'false' || lower === '0') return false;
                throw new Error('Must be true or false');
            }
            
            if (lowerType.includes('array') || lowerType.includes('object')) {
                try {
                    return JSON.parse(value);
                } catch (e) {
                    throw new Error('Must be valid JSON');
                }
            }
            
            // Default to string
            return value;
        }
        
        /**
         * Execute the function with given parameters
         * @param {string} functionName - Function name to execute
         * @param {Object} parameters - Parameters to pass
         * @param {AbortSignal} signal - Abort signal
         * @returns {Promise} Execution result
         */
        async function executeFunction(functionName, parameters, signal) {
            return new Promise((resolve, reject) => {
                // Check if aborted before starting
                if (signal.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'));
                    return;
                }
                
                // Set up abort listener
                const abortListener = () => {
                    reject(new DOMException('Aborted', 'AbortError'));
                };
                signal.addEventListener('abort', abortListener);
                
                // Use FunctionToolsService to execute the function
                try {
                    const functions = FunctionToolsService.getJsFunctions();
                    console.log(`[Execute] Available functions:`, Object.keys(functions));
                    
                    const functionSpec = functions[functionName];
                    
                    if (!functionSpec) {
                        console.error(`[Execute] Function "${functionName}" not found. Available functions:`, Object.keys(functions));
                        
                        // Also check default functions
                        if (window.DefaultFunctionsService) {
                            const defaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                            console.log(`[Execute] Available default functions:`, Object.keys(defaultFunctions));
                            
                            if (defaultFunctions[functionName]) {
                                console.log(`[Execute] Found function in default functions, using that instead`);
                                const defaultFunctionSpec = defaultFunctions[functionName];
                                
                                // Execute default function
                                const wrappedCode = `
                                    ${defaultFunctionSpec.code}
                                    
                                    if (typeof ${functionName} === 'function') {
                                        console.log('Default function ${functionName} found and is callable');
                                        return ${functionName};
                                    } else {
                                        throw new Error('Default function "${functionName}" is not defined in the code');
                                    }
                                `;
                                
                                const func = new Function(wrappedCode)();
                                const result = func(...parameters);
                                
                                signal.removeEventListener('abort', abortListener);
                                resolve(result);
                                return;
                            }
                        }
                        
                        reject(new Error(`Function "${functionName}" not found in user-defined or default functions`));
                        return;
                    }
                    
                    // Execute in a setTimeout to make it cancellable and avoid blocking
                    const timeoutId = setTimeout(() => {
                        try {
                            console.log(`[Execute] Attempting to execute function: ${functionName}`);
                            console.log(`[Execute] Function code length: ${functionSpec.code.length}`);
                            console.log(`[Execute] Parameters:`, parameters);
                            
                            // Execute the function code in a controlled scope to define all functions
                            const wrappedCode = `
                                ${functionSpec.code}
                                
                                // Check if the function exists and return it
                                if (typeof ${functionName} === 'function') {
                                    console.log('Function ${functionName} found and is callable');
                                    return ${functionName};
                                } else {
                                    console.error('Function ${functionName} not found. Available functions:', Object.keys(this).filter(k => typeof this[k] === 'function'));
                                    throw new Error('Function "${functionName}" is not defined in the code');
                                }
                            `;
                            
                            const func = new Function(wrappedCode)();
                            
                            if (typeof func !== 'function') {
                                throw new Error(`Function "${functionName}" is not defined or is not callable`);
                            }
                            
                            console.log(`[Execute] Calling function with ${parameters.length} parameters`);
                            
                            // Call with parameters as an array (ordered by parameter definition)
                            const result = func(...parameters);
                            
                            console.log(`[Execute] Function executed successfully, result:`, result);
                            
                            signal.removeEventListener('abort', abortListener);
                            resolve(result);
                        } catch (error) {
                            console.error(`[Execute] Function execution failed:`, error);
                            signal.removeEventListener('abort', abortListener);
                            reject(error);
                        }
                    }, 0);
                    
                    // Handle abort
                    signal.addEventListener('abort', () => {
                        clearTimeout(timeoutId);
                        signal.removeEventListener('abort', abortListener);
                        reject(new DOMException('Aborted', 'AbortError'));
                    });
                    
                } catch (error) {
                    signal.removeEventListener('abort', abortListener);
                    reject(error);
                }
            });
        }
        
        /**
         * Show execution output
         * @param {*} result - Execution result
         */
        function showOutput(result) {
            const outputSection = document.getElementById('function-execute-output-section');
            const outputContent = document.getElementById('function-execute-output-content');
            
            if (!outputSection || !outputContent) return;
            
            // Store the raw result for format toggling
            outputContent._rawResult = result;
            
            // Show as JSON by default
            displayOutputAsJson(result);
            
            outputSection.style.display = 'block';
        }
        
        /**
         * Show execution error
         * @param {Error} error - Error object
         */
        function showError(error) {
            const errorSection = document.getElementById('function-execute-error-section');
            const errorContent = document.getElementById('function-execute-error-message');
            
            if (!errorSection || !errorContent) return;
            
            errorContent.textContent = error.message || error.toString();
            errorSection.style.display = 'block';
        }
        
        /**
         * Toggle between Raw and JSON output formats
         */
        function toggleOutputFormat() {
            const outputToggle = document.getElementById('function-execute-output-toggle');
            const outputContent = document.getElementById('function-execute-output-content');
            
            if (!outputToggle || !outputContent || !outputContent._rawResult) return;
            
            const currentFormat = outputToggle.textContent;
            
            if (currentFormat === 'JSON') {
                // Switch to Raw
                displayOutputAsRaw(outputContent._rawResult);
                outputToggle.textContent = 'Raw';
            } else {
                // Switch to JSON
                displayOutputAsJson(outputContent._rawResult);
                outputToggle.textContent = 'JSON';
            }
        }
        
        /**
         * Display output as formatted JSON
         * @param {*} result - Result to display
         */
        function displayOutputAsJson(result) {
            const outputContent = document.getElementById('function-execute-output-content');
            if (!outputContent) return;
            
            try {
                outputContent.textContent = JSON.stringify(result, null, 2);
            } catch (e) {
                outputContent.textContent = String(result);
            }
        }
        
        /**
         * Display output as raw string
         * @param {*} result - Result to display
         */
        function displayOutputAsRaw(result) {
            const outputContent = document.getElementById('function-execute-output-content');
            if (!outputContent) return;
            
            outputContent.textContent = String(result);
        }
        
        /**
         * Copy output to clipboard
         */
        function copyOutput() {
            const outputContent = document.getElementById('function-execute-output-content');
            if (!outputContent) return;
            
            navigator.clipboard.writeText(outputContent.textContent)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Output copied to clipboard');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy output:', err);
                });
        }
        
        /**
         * Copy error to clipboard
         */
        function copyError() {
            const errorContent = document.getElementById('function-execute-error-message');
            if (!errorContent) return;
            
            navigator.clipboard.writeText(errorContent.textContent)
                .then(() => {
                    if (addSystemMessage) {
                        addSystemMessage('Error message copied to clipboard');
                    }
                })
                .catch(err => {
                    console.error('Failed to copy error:', err);
                });
        }
        
        /**
         * Reset execute button to initial state
         */
        function resetExecuteButton() {
            const executeBtn = document.getElementById('function-execute-run-btn');
            const runIcon = document.getElementById('function-execute-run-icon');
            const runText = document.getElementById('function-execute-run-text');
            
            if (executeBtn) {
                executeBtn.classList.remove('executing');
                executeBtn.disabled = false;
            }
            
            if (runIcon) {
                runIcon.className = 'fas fa-play';
            }
            
            if (runText) {
                runText.textContent = 'Execute';
            }
        }
        
        /**
         * Update timing display
         * @param {string} message - Timing message
         */
        function updateTiming(message) {
            const timingElement = document.getElementById('function-execute-timing');
            if (timingElement) {
                timingElement.textContent = message;
            }
        }
        
        // Public API
        return {
            init,
            showExecuteModal,
            hideExecuteModal
        };
    }

    // Public API
    return {
        createFunctionExecuteModal: createFunctionExecuteModal
    };
})();