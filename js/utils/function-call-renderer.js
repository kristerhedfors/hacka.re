/**
 * Function Call Renderer
 * Refactored module for rendering function call and result indicators
 * 
 * This module is responsible for creating the visual indicators:
 * - "ƒ" symbol for function calls
 * - "→" arrow for function results
 * - Tooltips with function details
 */

window.FunctionCallRenderer = (function() {
    'use strict';
    
    // Configuration constants
    const CONFIG = {
        // Icon types
        ICON_TYPE_CALL: 'call',
        ICON_TYPE_RESULT: 'result',
        
        // CSS classes
        CLASS_CALL_ICON: 'function-call-icon',
        CLASS_RESULT_ICON: 'function-result-icon',
        CLASS_TOOLTIP: 'function-icon-tooltip',
        
        // Display symbols
        SYMBOL_CALL: '𝑓',  // Mathematical italic small f (U+1D453) - same as header
        SYMBOL_RESULT: '', // Arrow "→" created entirely via CSS
        
        // Color rotation for multiple calls
        MAX_COLOR_INDEX: 5
    };
    
    /**
     * Create a function call indicator element
     * @param {Object} options - Rendering options
     * @param {string} options.functionName - Name of the function
     * @param {Object} options.parameters - Function parameters
     * @param {string} options.colorClass - CSS color class
     * @returns {HTMLElement} - Function call indicator element
     */
    function createCallIndicator(options) {
        const { functionName, parameters = {}, colorClass } = options;
        
        // Create main icon container
        const iconElement = document.createElement('span');
        iconElement.className = `${CONFIG.CLASS_CALL_ICON} ${colorClass}`;
        
        // Add the "f" symbol (styled as "ƒ" via CSS)
        iconElement.textContent = CONFIG.SYMBOL_CALL;
        
        // Store function details as data attributes
        iconElement.setAttribute('data-function-name', functionName);
        iconElement.setAttribute('data-parameters', JSON.stringify(parameters));
        iconElement.setAttribute('data-type', 'call');
        
        // Debug: Log only once per function during development (limited logging)
        if (!window._functionCallDebugLog) window._functionCallDebugLog = new Set();
        if (!window._functionCallDebugLog.has(functionName)) {
            console.log('[FunctionCallRenderer] Call indicator created for:', functionName);
            window._functionCallDebugLog.add(functionName);
        }
        
        // Create tooltip
        const tooltip = createTooltip({
            type: CONFIG.ICON_TYPE_CALL,
            functionName,
            parameters
        });
        
        iconElement.appendChild(tooltip);
        
        // Add click handler to show detailed modal
        iconElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Hide tooltip immediately when clicked
            hideTooltip(iconElement);
            
            // Show detailed modal if available
            if (window.FunctionDetailsModal) {
                window.FunctionDetailsModal.showModal({
                    functionName,
                    parameters,
                    type: 'call'
                });
            }
        });
        
        // Add cursor pointer style
        iconElement.style.cursor = 'pointer';
        
        return iconElement;
    }
    
    /**
     * Create a function result indicator element
     * @param {Object} options - Rendering options
     * @param {string} options.functionName - Name of the function
     * @param {string} options.resultType - Type of the result
     * @param {*} options.resultValue - The result value
     * @param {number} options.executionTime - Execution time in ms
     * @param {string} options.colorClass - CSS color class
     * @returns {HTMLElement} - Function result indicator element
     */
    function createResultIndicator(options) {
        const { functionName, resultType, resultValue, executionTime, colorClass } = options;
        
        // Create main icon container
        const iconElement = document.createElement('span');
        iconElement.className = `${CONFIG.CLASS_RESULT_ICON} ${colorClass}`;
        
        // No text content - arrow is created via CSS ::before and ::after
        
        // Store function details as data attributes
        iconElement.setAttribute('data-function-name', functionName);
        iconElement.setAttribute('data-result-type', resultType || '');
        iconElement.setAttribute('data-result-value', JSON.stringify(resultValue));
        iconElement.setAttribute('data-execution-time', executionTime || 0);
        iconElement.setAttribute('data-type', 'result');
        
        // Debug: Log only once per function during development (limited logging)
        if (!window._functionResultDebugLog) window._functionResultDebugLog = new Set();
        const resultKey = `${functionName}_${resultType}`;
        if (!window._functionResultDebugLog.has(resultKey)) {
            console.log('[FunctionCallRenderer] Result indicator created for:', functionName, 'type:', resultType);
            window._functionResultDebugLog.add(resultKey);
        }
        
        // Create tooltip
        const tooltip = createTooltip({
            type: CONFIG.ICON_TYPE_RESULT,
            functionName,
            resultType,
            resultValue,
            executionTime
        });
        
        iconElement.appendChild(tooltip);
        
        // Add click handler to show detailed modal
        iconElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Hide tooltip immediately when clicked
            hideTooltip(iconElement);
            
            // Show detailed modal if available
            if (window.FunctionDetailsModal) {
                // Try to find the matching call indicator to get parameters
                const callParameters = findMatchingCallParameters(iconElement, functionName);
                
                window.FunctionDetailsModal.showModal({
                    functionName,
                    parameters: callParameters,
                    resultType,
                    resultValue,
                    executionTime,
                    type: 'result'
                });
            }
        });
        
        // Add cursor pointer style
        iconElement.style.cursor = 'pointer';
        
        return iconElement;
    }
    
    /**
     * Create a tooltip element with function details
     * @param {Object} options - Tooltip options
     * @returns {HTMLElement} - Tooltip element
     */
    function createTooltip(options) {
        const tooltip = document.createElement('span');
        tooltip.className = CONFIG.CLASS_TOOLTIP;
        
        if (options.type === CONFIG.ICON_TYPE_CALL) {
            tooltip.innerHTML = formatCallTooltip(options);
        } else {
            tooltip.innerHTML = formatResultTooltip(options);
        }
        
        return tooltip;
    }
    
    /**
     * Format tooltip content for function calls
     * @param {Object} options - Call details
     * @returns {string} - HTML content for tooltip
     */
    function formatCallTooltip(options) {
        const { functionName, parameters = {} } = options;
        const formattedParams = formatParameters(parameters);
        
        return `<strong>Function:</strong> ${escapeHTML(functionName)}
<strong>Parameters:</strong>
${escapeHTML(formattedParams)}`;
    }
    
    /**
     * Format tooltip content for function results
     * @param {Object} options - Result details
     * @returns {string} - HTML content for tooltip
     */
    function formatResultTooltip(options) {
        const { functionName, resultType, resultValue, executionTime } = options;
        const displayValue = formatResultValue(resultValue, resultType);
        const timeFormatted = formatExecutionTime(executionTime);
        
        return `<strong>Result:</strong> ${escapeHTML(functionName)}
<strong>Type:</strong> ${escapeHTML(resultType)}
<strong>Time:</strong> ${timeFormatted}
<strong>Value:</strong>
${escapeHTML(displayValue)}`;
    }
    
    /**
     * Format function parameters for display
     * @param {Object} parameters - Function parameters
     * @returns {string} - Formatted parameters
     */
    function formatParameters(parameters) {
        try {
            if (Object.keys(parameters).length === 0) {
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
            if (type === 'object' || type === 'array') {
                // Pretty-print JSON with proper indentation
                const formatted = JSON.stringify(value, null, 2);
                
                // If too long, show first part with better truncation
                if (formatted.length > 800) {
                    const lines = formatted.split('\n');
                    if (lines.length > 20) {
                        return lines.slice(0, 20).join('\n') + '\n... (truncated)';
                    }
                    return formatted.substring(0, 800) + '\n... (truncated)';
                }
                return formatted;
            }
            
            // For primitives, show the value directly
            return String(value);
        } catch (e) {
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
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Get color class based on call count
     * @param {number} count - Call count
     * @returns {string} - CSS color class
     */
    function getColorClass(count) {
        const colorIndex = (count % CONFIG.MAX_COLOR_INDEX) || CONFIG.MAX_COLOR_INDEX;
        return `color-${colorIndex}`;
    }
    
    /**
     * Hide tooltip for a given icon element
     * @param {HTMLElement} iconElement - Icon element containing tooltip
     */
    function hideTooltip(iconElement) {
        const tooltip = iconElement.querySelector(`.${CONFIG.CLASS_TOOLTIP}`);
        if (tooltip) {
            tooltip.style.opacity = '0';
            tooltip.style.pointerEvents = 'none';
        }
    }
    
    /**
     * Find matching call parameters for a result indicator
     * @param {HTMLElement} resultElement - The result indicator element
     * @param {string} functionName - Function name to match
     * @returns {Object|null} - Parameters object or null if not found
     */
    function findMatchingCallParameters(resultElement, functionName) {
        try {
            const messageContainer = resultElement.closest('.message');
            if (!messageContainer) {
                return null;
            }
            
            const callIndicators = messageContainer.querySelectorAll(`.${CONFIG.CLASS_CALL_ICON}`);
            
            for (const callIndicator of callIndicators) {
                const callFunctionName = callIndicator.dataset.functionName;
                if (callFunctionName === functionName) {
                    const parametersJson = callIndicator.dataset.parameters;
                    if (parametersJson) {
                        return JSON.parse(parametersJson);
                    }
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    // Public API
    return {
        createCallIndicator,
        createResultIndicator,
        getColorClass,
        hideTooltip,
        CONFIG // Expose config for testing/debugging
    };
})();