/**
 * Function Markers Processing
 * Handles processing of function call and result markers in text
 * 
 * Refactored to use FunctionCallRenderer for cleaner separation of concerns:
 * - This module: Parses markers and manages state
 * - FunctionCallRenderer: Creates visual elements
 */

window.FunctionMarkers = (function() {
    // Track function calls to assign different colors
    const functionCallCounts = {};
    // Track assigned colors to keep them stable during streaming
    const assignedColors = {};
    // Track function call instances for unique coloring
    let callInstanceCounter = 0;
    
    // Global storage for function results (used by copy buttons)
    if (!window.functionResults) {
        window.functionResults = {};
    }
    
    /**
     * Reset function call counts
     * Called when starting to process a new message
     */
    function resetCounts() {
        Object.keys(functionCallCounts).forEach(key => {
            delete functionCallCounts[key];
        });
        // Note: We don't reset assignedColors to keep colors stable across messages
        console.log('[Function Markers] Function call counts reset, keeping assigned colors');
    }
    
    /**
     * Get or increment function call count
     * @param {string} functionName - Name of the function
     * @returns {number} - Current count for this function
     */
    function getOrIncrementCount(functionName) {
        functionCallCounts[functionName] = (functionCallCounts[functionName] || 0) + 1;
        return functionCallCounts[functionName];
    }
    
    /**
     * Get color class based on function call count
     * @param {string} functionName - Name of the function
     * @returns {string} - CSS color class
     */
    function getColorClass(colorKey) {
        // If this color key already has a color assigned, return it
        if (assignedColors[colorKey]) {
            console.log(`[Function Markers] getColorClass(${colorKey}): using existing color ${assignedColors[colorKey]}`);
            return assignedColors[colorKey];
        }
        
        // Assign a new color based on the number of assigned colors so far
        const assignedCount = Object.keys(assignedColors).length;
        const colorIndex = (assignedCount % 5) + 1; // Use 1-5 instead of 0-4
        const colorClass = `color-${colorIndex}`;
        
        // Store this assignment permanently
        assignedColors[colorKey] = colorClass;
        console.log(`[Function Markers] getColorClass(${colorKey}): assigned new color ${colorClass} (assignedCount=${assignedCount})`);
        return colorClass;
    }
    
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - HTML-escaped text
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Process function call markers in text
     * @param {string} text - Text to process
     * @returns {string} - Text with function call markers replaced
     */
    function processFunctionCallMarkers(text) {
        // New format: [FUNCTION_CALL:functionName:encodedArgs:callId]
        // Legacy format: [FUNCTION_CALL:functionName:encodedArgs] or [FUNCTION_CALL:functionName]
        return text.replace(/\s*\[FUNCTION_CALL:([^:\]]+)(?::([^:\]]+))?(?::([^\]]+))?\]\s*/g, (match, functionName, encodedArgs, callId) => {
            const count = getOrIncrementCount(functionName);
            // Use call ID for unique coloring if available, otherwise use function name
            const colorKey = callId ? callId : `${functionName}_${count}`;
            const colorClass = getColorClass(colorKey);
            
            // Decode and parse the arguments
            let parameters = {};
            if (encodedArgs) {
                try {
                    const decodedArgs = decodeURIComponent(encodedArgs);
                    parameters = JSON.parse(decodedArgs);
                } catch (e) {
                    // If parsing fails, use the decoded string as-is
                    parameters = { raw: decodeURIComponent(encodedArgs) };
                }
            }
            
            // Use the new renderer if available, fallback to old method
            if (window.FunctionCallRenderer) {
                const element = window.FunctionCallRenderer.createCallIndicator({
                    functionName,
                    parameters,
                    colorClass
                });
                return element.outerHTML;
            }
            
            // Fallback for backward compatibility
            const formattedArgs = JSON.stringify(parameters, null, 2);
            return `<span class="function-call-icon ${colorClass}">𝑓<span class="function-icon-tooltip"><strong>Function:</strong> ${escapeHTML(functionName)}<br><strong>Parameters:</strong> ${escapeHTML(formattedArgs)}</span></span>`;
        });
    }
    
    /**
     * Format display value for function results
     * @param {string} decodedResult - Decoded result value
     * @param {string} resultType - Type of the result
     * @returns {Object} - Object with displayValue and displayValueHtml
     */
    function formatDisplayValue(decodedResult, resultType) {
        let displayValue = '';
        let displayValueHtml = '';
        
        try {
            const resultValue = JSON.parse(decodedResult);
            
            if (resultType === 'object' || resultType === 'array') {
                // For objects and arrays, show a compact JSON representation
                displayValue = JSON.stringify(resultValue);
                if (displayValue.length > 100) {
                    displayValue = displayValue.substring(0, 97) + '...';
                }
                
                // For HTML display, show more detailed preview
                const formattedJson = JSON.stringify(resultValue, null, 2);
                const truncatedJson = formattedJson.length > 300 
                    ? formattedJson.substring(0, 297) + '...' 
                    : formattedJson;
                displayValueHtml = `<pre style="max-height: 200px; overflow-y: auto; margin: 5px 0;">${escapeHTML(truncatedJson)}</pre>`;
            } else {
                // For primitives, show the value directly
                displayValue = String(resultValue);
                displayValueHtml = escapeHTML(displayValue);
            }
        } catch (e) {
            // If parsing fails, show the raw decoded result
            displayValue = decodedResult;
            if (displayValue.length > 100) {
                displayValue = displayValue.substring(0, 97) + '...';
            }
            displayValueHtml = escapeHTML(displayValue);
        }
        
        return { displayValue, displayValueHtml };
    }
    
    /**
     * Create copy button for function result
     * @param {string} decodedResult - Decoded result value
     * @param {string} resultType - Type of the result
     * @returns {string} - HTML for copy button
     */
    function createCopyButton(decodedResult, resultType) {
        // For the copy button, use properly formatted JSON string for objects and arrays
        let copyText = decodedResult;
        try {
            if (resultType === 'object' || resultType === 'array') {
                const resultValue = JSON.parse(decodedResult);
                copyText = JSON.stringify(resultValue, null, 2);
            }
        } catch (e) {
            console.error('Error formatting result for copy:', e);
            copyText = decodedResult;
        }
        
        // Create a unique ID for this result
        const resultId = `result_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Store the result in global object
        window.functionResults[resultId] = copyText;
        
        // Setup copy button event listener
        setTimeout(() => {
            const copyBtn = document.querySelector(`button[data-result-id="${resultId}"]`);
            if (copyBtn) {
                copyBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const textToCopy = window.functionResults[resultId];
                    if (textToCopy && window.UIUtils && window.UIUtils.copyToClipboardWithNotification) {
                        window.UIUtils.copyToClipboardWithNotification(textToCopy, "Function result value copied to clipboard", this);
                    }
                });
            }
        }, 100);
        
        return `<button class="tooltip-copy-btn" data-result-id="${resultId}" data-copy-message="Function result value copied to clipboard">Copy</button>`;
    }
    
    /**
     * Format execution time
     * @param {string} executionTime - Execution time in milliseconds
     * @returns {string} - Formatted execution time
     */
    function formatExecutionTime(executionTime) {
        if (!executionTime) {
            return 'N/A';
        }
        
        const executionTimeMs = parseInt(executionTime) || 0;
        return executionTimeMs < 1000 
            ? `${executionTimeMs}ms`
            : `${(executionTimeMs / 1000).toFixed(2)}s`;
    }
    
    /**
     * Process function result markers in text
     * @param {string} text - Text to process
     * @returns {string} - Text with function result markers replaced
     */
    function processFunctionResultMarkers(text) {
        // New format: [FUNCTION_RESULT:name:type:encodedValue:executionTime:callId]
        // Legacy format: [FUNCTION_RESULT:name:type:encodedValue:executionTime] or [FUNCTION_RESULT:name:type:encodedValue]
        return text.replace(/\[FUNCTION_RESULT:([^:]+):([^:]+):([^:]+)(?::([^:\]]+))?(?::([^\]]+))?\]/g, (match, functionName, resultType, encodedResult, executionTime, callId) => {
            // Use call ID for unique coloring if available, otherwise use function name
            const colorKey = callId ? callId : functionName;
            const colorClass = getColorClass(colorKey);
            
            // Decode and parse the result value
            const decodedResult = decodeURIComponent(encodedResult);
            let resultValue;
            try {
                resultValue = JSON.parse(decodedResult);
            } catch (e) {
                resultValue = decodedResult;
            }
            
            // Use the new renderer if available, fallback to old method
            if (window.FunctionCallRenderer) {
                const element = window.FunctionCallRenderer.createResultIndicator({
                    functionName,
                    resultType,
                    resultValue,
                    executionTime: parseInt(executionTime) || 0,
                    colorClass
                });
                return element.outerHTML;
            }
            
            // Fallback for backward compatibility
            const { displayValue } = formatDisplayValue(decodedResult, resultType);
            const executionTimeFormatted = formatExecutionTime(executionTime);
            
            return `<span class="function-result-icon ${colorClass}"><span class="function-icon-tooltip"><strong>Result:</strong> ${escapeHTML(functionName)}<br><strong>Type:</strong> ${escapeHTML(resultType)}<br><strong>Time:</strong> ${executionTimeFormatted}<br><strong>Value:</strong> ${escapeHTML(displayValue)}</span></span>`;
        });
    }
    
    /**
     * Process all function markers in text
     * @param {string} text - Text to process
     * @returns {string} - Text with markers replaced by HTML
     */
    function processMarkers(text) {
        // Skip processing if text already contains processed markers (HTML elements)
        if (text.includes('class="function-call-icon"') || text.includes('class="function-result-icon"')) {
            return text;
        }
        
        // Debug: log if we're processing any text with markers
        if (text.includes('[FUNCTION_CALL:') || text.includes('[FUNCTION_RESULT:')) {
            console.log('[Function Markers] Processing text with markers');
        }
        
        // Only reset counts when processing a completely new message
        // (not during streaming updates of the same message)
        
        // Process function call markers first
        text = processFunctionCallMarkers(text);
        
        // Then process function result markers
        text = processFunctionResultMarkers(text);
        
        return text;
    }
    
    /**
     * Clear all assigned colors (for complete reset)
     */
    function clearAssignedColors() {
        Object.keys(assignedColors).forEach(key => {
            delete assignedColors[key];
        });
        console.log('[Function Markers] All assigned colors cleared');
    }
    
    // Public API
    return {
        processMarkers,
        resetCounts,
        clearAssignedColors,
        getColorClass,
        escapeHTML: escapeHTML
    };
})();