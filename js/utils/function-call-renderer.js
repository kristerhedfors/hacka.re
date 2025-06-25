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
        
        // Create tooltip
        const tooltip = createTooltip({
            type: CONFIG.ICON_TYPE_CALL,
            functionName,
            parameters
        });
        
        iconElement.appendChild(tooltip);
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
        
        // Create tooltip
        const tooltip = createTooltip({
            type: CONFIG.ICON_TYPE_RESULT,
            functionName,
            resultType,
            resultValue,
            executionTime
        });
        
        iconElement.appendChild(tooltip);
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
        
        return `
            <strong>Function:</strong> ${escapeHTML(functionName)}<br>
            <strong>Parameters:</strong> ${escapeHTML(formattedParams)}
        `.trim();
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
        
        return `
            <strong>Result:</strong> ${escapeHTML(functionName)}<br>
            <strong>Type:</strong> ${escapeHTML(resultType)}<br>
            <strong>Time:</strong> ${timeFormatted}<br>
            <strong>Value:</strong> ${escapeHTML(displayValue)}
        `.trim();
    }
    
    /**
     * Format function parameters for display
     * @param {Object} parameters - Function parameters
     * @returns {string} - Formatted parameters
     */
    function formatParameters(parameters) {
        try {
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
        if (type === 'object' || type === 'array') {
            const stringified = JSON.stringify(value);
            if (stringified.length > 100) {
                return stringified.substring(0, 97) + '...';
            }
            return stringified;
        }
        return String(value);
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
    
    // Public API
    return {
        createCallIndicator,
        createResultIndicator,
        getColorClass,
        CONFIG // Expose config for testing/debugging
    };
})();