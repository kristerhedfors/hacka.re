/**
 * Function Details Modal Manager
 * Handles the modal that displays detailed function call information when clicking function indicators
 */

window.FunctionDetailsModal = (function() {
    'use strict';
    
    let modal = null;
    let elements = {};
    
    /**
     * Initialize the function details modal
     */
    function init() {
        console.log('Initializing FunctionDetailsModal...');
        
        // Get modal elements
        modal = document.getElementById('function-details-modal');
        console.log('Modal element found:', !!modal);
        
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
            elements.copyParametersBtn.addEventListener('click', () => copyToClipboard(elements.parameters.textContent, elements.copyParametersBtn));
        }
        
        if (elements.copyResultBtn) {
            elements.copyResultBtn.addEventListener('click', () => copyToClipboard(elements.resultValue.textContent, elements.copyResultBtn));
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
        
        console.log('Function Details Modal initialized');
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
        console.log('showModal called with data:', data);
        
        if (!modal || !elements.functionName) {
            console.error('Function details modal not properly initialized');
            console.error('Modal:', !!modal, 'Elements.functionName:', !!elements.functionName);
            return;
        }
        
        const { functionName, parameters, resultType, resultValue, executionTime, type } = data;
        
        // Set title and function name
        if (type === 'result') {
            elements.title.textContent = 'Function Result Details';
            elements.functionName.textContent = `${functionName} (Result)`;
        } else {
            elements.title.textContent = 'Function Call Details';
            elements.functionName.textContent = functionName;
        }
        
        // Always show parameters if available
        if (parameters !== undefined) {
            elements.parametersGroup.style.display = 'block';
            elements.parameters.textContent = formatParameters(parameters);
        } else {
            elements.parametersGroup.style.display = 'none';
        }
        
        // Show result section only if we have result data
        if (type === 'result' && resultValue !== undefined) {
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
            if (type === 'object' || type === 'array') {
                return JSON.stringify(value, null, 2);
            }
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
     * Copy text to clipboard with visual feedback
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element for visual feedback
     */
    function copyToClipboard(text, button) {
        if (!text) {
            console.warn('No text to copy');
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