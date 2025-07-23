/**
 * Agent Manager Component
 * Provides utility functions for agent management (integrated with existing modal)
 */

window.AgentManager = (function() {
    
    /**
     * Initialize the agent manager
     */
    function init() {
        console.log('Agent Manager utilities initialized');
    }
    
    /**
     * Show modal using the existing agent config modal
     */
    function showModal() {
        if (window.aiHackare) {
            window.aiHackare.showAgentConfigModal();
        }
    }
    
    /**
     * Hide modal using the existing agent config modal
     */
    function hideModal() {
        if (window.aiHackare) {
            window.aiHackare.hideAgentConfigModal();
        }
    }
    
    // Public API
    return {
        init: init,
        showModal: showModal,
        hideModal: hideModal
    };
})();

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    AgentManager.init();
});