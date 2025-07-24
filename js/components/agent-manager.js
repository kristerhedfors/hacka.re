/**
 * Agent Manager Component
 * Provides utility functions for agent management (integrated with existing modal)
 */

// Legacy Agent Manager Component - deprecated in favor of settings/agent-manager.js
// This file is kept for compatibility but the main functionality has moved

window.LegacyAgentManager = (function() {
    
    /**
     * Initialize the legacy agent manager
     */
    function init() {
        console.log('Legacy Agent Manager utilities initialized (deprecated)');
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
    if (window.LegacyAgentManager) {
        window.LegacyAgentManager.init();
    }
});