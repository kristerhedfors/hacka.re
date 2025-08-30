/**
 * Function Modal Manager Module
 * Handles function modal display, initialization, and basic modal functionality
 */

window.FunctionModalManager = (function() {
    /**
     * Create a Function Modal Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Function Modal Manager instance
     */
    function createFunctionModalManager(elements, addSystemMessage) {
        /**
         * Initialize the function modal manager
         */
        function init() {
            // Set up event listeners
            if (elements.functionBtn) {
                elements.functionBtn.addEventListener('click', showFunctionModal);
            }
            
            if (elements.closeFunctionModal) {
                elements.closeFunctionModal.addEventListener('click', hideFunctionModal);
            }
            
            console.log('Function Modal Manager initialized');
        }
        
        /**
         * Show the function modal
         */
        function showFunctionModal() {
            if (elements.functionModal) {
                elements.functionModal.classList.add('active');
                
                // Only update counts if the default functions section exists
                if (window.DefaultFunctionsManager && window.DefaultFunctionsManager.updateAllCounts) {
                    window.DefaultFunctionsManager.updateAllCounts();
                }
                
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
        
        // Public API
        return {
            init,
            showFunctionModal,
            hideFunctionModal
        };
    }

    // Public API
    return {
        createFunctionModalManager: createFunctionModalManager
    };
})();