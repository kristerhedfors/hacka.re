/**
 * UI Manager Module
 * Legacy wrapper that delegates to UICoordinator for backward compatibility
 */

window.UIManager = (function() {
    /**
     * Create a UI Manager instance
     * @param {Object} elements - DOM elements
     * @param {Object} config - Configuration options
     * @returns {Object} UI Manager instance
     */
    function createUIManager(elements, config) {
        // Create the UI Coordinator to handle all UI functionality
        const uiCoordinator = UICoordinator.createUICoordinator(elements, config);
        
        // Return the coordinator's public API for backward compatibility
        return uiCoordinator;
    }

    // Public API
    return {
        createUIManager: createUIManager
    };
})();