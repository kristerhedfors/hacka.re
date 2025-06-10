/**
 * Function Code Editor Module
 * Handles pure code editing functionality, default code, and editor state management
 */

window.FunctionCodeEditor = (function() {
    
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
     * Initialize the code editor with default content if empty
     * @param {Object} elements - DOM elements
     */
    function initializeEditor(elements) {
        if (elements.functionCode && !elements.functionCode.value) {
            elements.functionCode.value = getDefaultFunctionCode();
        }
    }
    
    /**
     * Set up auto-extraction of function name from code
     * @param {Object} elements - DOM elements
     * @param {Function} onNameExtracted - Callback when function name is extracted
     */
    function setupAutoExtraction(elements, onNameExtracted) {
        if (elements.functionCode) {
            elements.functionCode.addEventListener('input', () => {
                if (window.FunctionParser && window.FunctionParser.extractFunctionName) {
                    const functionName = window.FunctionParser.extractFunctionName(elements.functionCode.value);
                    if (onNameExtracted) {
                        onNameExtracted(functionName);
                    }
                }
            });
        }
    }
    
    /**
     * Update function name field based on extracted name
     * @param {Object} elements - DOM elements
     * @param {string|null} functionName - Extracted function name
     */
    function updateFunctionNameField(elements, functionName) {
        if (!elements.functionName) return;
        
        if (functionName) {
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
    }
    
    /**
     * Clear the editor content and reset to default
     * @param {Object} elements - DOM elements
     */
    function clearEditor(elements) {
        if (elements.functionCode) {
            elements.functionCode.value = getDefaultFunctionCode();
            
            // Trigger any event listeners that might be attached to the code editor
            const event = new Event('input', { bubbles: true });
            elements.functionCode.dispatchEvent(event);
        }
        
        if (elements.functionName) {
            elements.functionName.value = '';
            // Remove auto-completed styling and make editable
            elements.functionName.classList.remove('auto-completed');
            elements.functionName.removeAttribute('readonly');
        }
    }
    
    /**
     * Set editor content
     * @param {Object} elements - DOM elements
     * @param {string} code - Code to set
     */
    function setEditorContent(elements, code) {
        if (elements.functionCode) {
            elements.functionCode.value = code;
            
            // Trigger any event listeners that might be attached to the code editor
            const event = new Event('input', { bubbles: true });
            elements.functionCode.dispatchEvent(event);
        }
    }
    
    /**
     * Get current editor content
     * @param {Object} elements - DOM elements
     * @returns {string} Current code content
     */
    function getEditorContent(elements) {
        return elements.functionCode ? elements.functionCode.value.trim() : '';
    }
    
    /**
     * Focus the code editor
     * @param {Object} elements - DOM elements
     */
    function focusEditor(elements) {
        if (elements.functionCode) {
            setTimeout(() => {
                elements.functionCode.focus();
            }, 100);
        }
    }
    
    // Public API
    return {
        getDefaultFunctionCode,
        initializeEditor,
        setupAutoExtraction,
        updateFunctionNameField,
        clearEditor,
        setEditorContent,
        getEditorContent,
        focusEditor
    };
})();