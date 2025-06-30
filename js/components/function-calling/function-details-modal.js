/**
 * Function Details Modal Manager
 * Handles the modal that displays detailed function call information when clicking function indicators
 */

window.FunctionDetailsModal = (function() {
    'use strict';
    
    let modal = null;
    let elements = {};
    let currentData = {}; // Store current modal data for copying
    
    /**
     * Initialize the function details modal
     */
    function init() {
        // Get modal elements
        modal = document.getElementById('function-details-modal');
        
        elements = {
            modal: modal,
            title: document.getElementById('function-details-title'),
            functionName: document.getElementById('function-details-function-name'),
            parametersGroup: document.getElementById('function-details-parameters-group'),
            parameters: document.getElementById('function-details-parameters'),
            resultGroup: document.getElementById('function-details-result-group'),
            resultType: document.getElementById('function-details-result-type'),
            executionTime: document.getElementById('function-details-execution-time'),
            resultValue: document.getElementById('function-details-result-value'),
            copyParametersBtn: document.getElementById('copy-parameters-btn'),
            copyResultBtn: document.getElementById('copy-result-btn'),
            closeBtn: document.getElementById('close-function-details-modal')
        };
        
        // Set up event listeners
        if (elements.closeBtn) {
            elements.closeBtn.addEventListener('click', hideModal);
        }
        
        if (elements.copyParametersBtn) {
            elements.copyParametersBtn.addEventListener('click', () => {
                // Copy compact JSON instead of display text
                const compactJson = getCompactParametersJson();
                copyToClipboard(compactJson, elements.copyParametersBtn);
            });
        }
        
        if (elements.copyResultBtn) {
            elements.copyResultBtn.addEventListener('click', () => {
                // Copy compact JSON instead of display text
                const compactJson = getCompactResultJson();
                copyToClipboard(compactJson, elements.copyResultBtn);
            });
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideModal();
                }
            });
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                hideModal();
            }
        });
    }
    
    /**
     * Show the modal with function call details
     * @param {Object} data - Function call data
     * @param {string} data.functionName - Name of the function
     * @param {Object} data.parameters - Function parameters
     * @param {string} data.resultType - Type of result (if available)
     * @param {*} data.resultValue - Result value (if available)
     * @param {number} data.executionTime - Execution time in ms (if available)
     * @param {string} data.type - 'call' or 'result'
     */
    function showModal(data) {
        if (!modal || !elements.functionName) {
            console.error('Function details modal not properly initialized');
            return;
        }
        
        const { functionName, parameters, resultType, resultValue, executionTime, type } = data;
        
        // Store current data for copying
        currentData = { functionName, parameters, resultType, resultValue, executionTime, type };
        
        // Set title and function name
        if (type === 'result') {
            elements.title.textContent = 'Function Result Details';
            elements.functionName.textContent = `${functionName} (Result)`;
        } else {
            elements.title.textContent = 'Function Call Details';
            elements.functionName.textContent = functionName;
        }
        
        // Always show parameters if available (both for calls and results)
        if (parameters !== undefined && parameters !== null) {
            elements.parametersGroup.style.display = 'block';
            elements.parameters.textContent = formatParameters(parameters);
        } else {
            elements.parametersGroup.style.display = 'none';
        }
        
        // Show result section if we have result data (only for results or completed calls)
        if (resultValue !== undefined && resultValue !== null) {
            elements.resultGroup.style.display = 'block';
            elements.resultType.textContent = resultType || 'unknown';
            elements.executionTime.textContent = formatExecutionTime(executionTime);
            elements.resultValue.textContent = formatResultValue(resultValue, resultType);
        } else {
            elements.resultGroup.style.display = 'none';
        }
        
        // Show the modal
        modal.classList.add('active');
    }
    
    /**
     * Hide the modal
     */
    function hideModal() {
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    /**
     * Format function parameters for display
     * @param {Object} parameters - Function parameters
     * @returns {string} - Formatted parameters
     */
    function formatParameters(parameters) {
        try {
            if (!parameters || Object.keys(parameters).length === 0) {
                return '{}';
            }
            return JSON.stringify(parameters, null, 2);
        } catch (e) {
            return String(parameters);
        }
    }
    
    /**
     * Format result value for display
     * @param {*} value - Result value
     * @param {string} type - Result type
     * @returns {string} - Formatted value
     */
    function formatResultValue(value, type) {
        try {
            // Handle different value types properly
            if (value === null) {
                return 'null';
            }
            
            if (value === undefined) {
                return 'undefined';
            }
            
            // If it's already a string, check if it's a JSON string that was double-encoded
            if (typeof value === 'string') {
                // Handle <br> tags differently based on whether this is JSON or plain text
                let cleanValue = value;
                if (cleanValue.toLowerCase().includes('<br')) {
                    // First, try to parse as JSON with escaped newlines for <br> tags
                    const jsonCleanValue = cleanValue.replace(/<br\s*\/?>/gi, '\\n');
                    try {
                        const parsed = JSON.parse(jsonCleanValue);
                        // If parsing succeeds and type suggests object/array, pretty-print
                        if ((type === 'object' || type === 'array') && (typeof parsed === 'object' && parsed !== null)) {
                            console.log('[Modal] Converted <br> tags to escaped newlines and pretty-printed JSON');
                            return JSON.stringify(parsed, null, 2);
                        }
                        // For other JSON values, return the parsed and re-stringified version
                        console.log('[Modal] Converted <br> tags to escaped newlines in JSON');
                        return JSON.stringify(parsed);
                    } catch (e) {
                        // Not valid JSON, treat as plain text and convert <br> to actual newlines
                        cleanValue = cleanValue.replace(/<br\s*\/?>/gi, '\n');
                        console.log('[Modal] Converted <br> tags to newlines in plain text');
                        return cleanValue;
                    }
                }
                
                try {
                    // Try to parse the string to see if it's JSON (without <br> tags)
                    const parsed = JSON.parse(cleanValue);
                    // If it parses successfully and the type suggests it should be an object/array,
                    // display the parsed version with pretty formatting
                    if ((type === 'object' || type === 'array') && (typeof parsed === 'object' && parsed !== null)) {
                        return JSON.stringify(parsed, null, 2);
                    }
                    // Otherwise, if it's a simple JSON value, just return the cleaned string
                    return cleanValue;
                } catch (e) {
                    // Not a JSON string, return the cleaned string as-is
                    return cleanValue;
                }
            }
            
            // For actual objects/arrays, stringify with pretty formatting
            if (type === 'object' || type === 'array') {
                return JSON.stringify(value, null, 2);
            }
            
            // For other types, convert to string
            return String(value);
        } catch (e) {
            console.error('Error formatting result value:', e);
            return String(value);
        }
    }
    
    /**
     * Format execution time
     * @param {number} timeMs - Time in milliseconds
     * @returns {string} - Formatted time
     */
    function formatExecutionTime(timeMs) {
        if (!timeMs && timeMs !== 0) return 'N/A';
        
        const time = parseInt(timeMs) || 0;
        return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
    }
    
    /**
     * Get compact JSON representation of current parameters for copying
     * @returns {string} - Compact JSON string
     */
    function getCompactParametersJson() {
        try {
            if (!currentData.parameters || Object.keys(currentData.parameters).length === 0) {
                return '{}';
            }
            return JSON.stringify(currentData.parameters);
        } catch (e) {
            console.error('Error creating compact JSON:', e);
            return String(currentData.parameters);
        }
    }
    
    /**
     * Get compact JSON representation of current result for copying
     * @returns {string} - Compact JSON string
     */
    function getCompactResultJson() {
        try {
            if (currentData.resultValue === undefined || currentData.resultValue === null) {
                return '';
            }
            
            // If it's already a string, return it as-is (unless it's a JSON string that needs parsing)
            if (typeof currentData.resultValue === 'string') {
                // Handle <br> tags for copying
                let cleanValue = currentData.resultValue;
                if (cleanValue.toLowerCase().includes('<br')) {
                    // First, try to parse as JSON with escaped newlines for <br> tags
                    const jsonCleanValue = cleanValue.replace(/<br\s*\/?>/gi, '\\n');
                    try {
                        const parsed = JSON.parse(jsonCleanValue);
                        // If parsing succeeds, re-stringify compactly
                        console.log('[Modal] Converted <br> tags to escaped newlines for JSON copying');
                        return JSON.stringify(parsed);
                    } catch (e) {
                        // Not valid JSON, treat as plain text and convert <br> to actual newlines
                        cleanValue = cleanValue.replace(/<br\s*\/?>/gi, '\n');
                        console.log('[Modal] Converted <br> tags to newlines for plain text copying');
                        return cleanValue;
                    }
                }
                
                // Try to parse it to see if it's a JSON string (without <br> tags)
                try {
                    const parsed = JSON.parse(cleanValue);
                    // If parsing succeeds, re-stringify compactly
                    return JSON.stringify(parsed);
                } catch (e) {
                    // Not a JSON string, return the cleaned value as-is
                    return cleanValue;
                }
            }
            
            // For objects/arrays, stringify compactly
            return JSON.stringify(currentData.resultValue);
        } catch (e) {
            console.error('Error creating compact result JSON:', e);
            return String(currentData.resultValue);
        }
    }
    
    /**
     * Copy text to clipboard with visual feedback
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element for visual feedback
     */
    function copyToClipboard(text, button) {
        if (!text) {
            return;
        }
        
        navigator.clipboard.writeText(text).then(() => {
            // Show success feedback
            button.classList.add('copied');
            setTimeout(() => {
                button.classList.remove('copied');
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            
            // Fallback: try to select and copy the text
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                // Show success feedback
                button.classList.add('copied');
                setTimeout(() => {
                    button.classList.remove('copied');
                }, 1500);
            } catch (fallbackErr) {
                console.error('Fallback copy also failed: ', fallbackErr);
            }
        });
    }
    
    // Public API
    return {
        init,
        showModal,
        hideModal
    };
})();