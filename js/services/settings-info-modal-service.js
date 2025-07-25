/**
 * Settings Info Modal Service
 * Handles click-based info modals for Agent and MCP modal info icons
 * Similar functionality to the Function Calling modal info icon
 */

const SettingsInfoModalService = (() => {
    let agentInfoModal = null;
    let mcpInfoModal = null;
    let sharePasswordInfoModal = null;
    let shareLinkInfoModal = null;
    
    /**
     * Initialize and show the Agent info modal
     * @param {HTMLElement} infoIcon - The info icon that was clicked
     */
    function showAgentInfoModal(infoIcon) {
        if (!agentInfoModal) {
            agentInfoModal = createInfoModal(
                'agent-info-modal',
                'About AI Agent Configuration',
                infoIcon
            );
        }
        agentInfoModal.classList.add('active');
    }
    
    /**
     * Initialize and show the MCP info modal
     * @param {HTMLElement} infoIcon - The info icon that was clicked
     */
    function showMcpInfoModal(infoIcon) {
        if (!mcpInfoModal) {
            mcpInfoModal = createInfoModal(
                'mcp-info-modal',
                'About Model Context Protocol (MCP)',
                infoIcon
            );
        }
        mcpInfoModal.classList.add('active');
    }
    
    /**
     * Initialize and show the Share Password info modal
     * @param {HTMLElement} infoIcon - The info icon that was clicked
     */
    function showSharePasswordInfoModal(infoIcon) {
        if (!sharePasswordInfoModal) {
            sharePasswordInfoModal = createInfoModal(
                'share-password-info-modal',
                'About Password / Session Key',
                infoIcon
            );
        }
        sharePasswordInfoModal.classList.add('active');
    }
    
    /**
     * Initialize and show the Share Link info modal
     * @param {HTMLElement} infoIcon - The info icon that was clicked
     */
    function showShareLinkInfoModal(infoIcon) {
        if (!shareLinkInfoModal) {
            shareLinkInfoModal = createInfoModal(
                'share-link-info-modal',
                'About Share Link',
                infoIcon
            );
        }
        shareLinkInfoModal.classList.add('active');
    }
    
    /**
     * Create an info modal element (similar to function-tooltip.js)
     * @param {string} id - Modal ID
     * @param {string} title - Modal title
     * @param {HTMLElement} infoIcon - Original info icon element
     * @returns {HTMLElement} Modal element
     */
    function createInfoModal(id, title, infoIcon) {
        // Create modal element
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        
        // Get the tooltip content from the original icon
        const tooltipContent = infoIcon.querySelector('.tooltip .tooltip-content');
        if (!tooltipContent) {
            console.error('No tooltip content found for info modal');
            return modal;
        }
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Add header
        const header = document.createElement('div');
        header.className = 'settings-header';
        
        const heading = document.createElement('h2');
        heading.textContent = title;
        
        header.appendChild(heading);
        modalContent.appendChild(header);
        
        // Clone the tooltip content
        const contentClone = tooltipContent.cloneNode(true);
        modalContent.appendChild(contentClone);
        
        // Add close button
        const closeButtonContainer = document.createElement('div');
        closeButtonContainer.className = 'form-actions';
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn secondary-btn';
        closeButton.textContent = 'Close';
        closeButton.id = `close-${id}`;
        
        closeButtonContainer.appendChild(closeButton);
        modalContent.appendChild(closeButtonContainer);
        
        // Add modal to document
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Set up event handlers
        setupModalHandlers(modal, closeButton);
        
        return modal;
    }
    
    /**
     * Setup event handlers for modal
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} closeButton - Close button element
     */
    function setupModalHandlers(modal, closeButton) {
        // Close modal when close button is clicked
        closeButton.addEventListener('click', function() {
            modal.classList.remove('active');
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // Close modal when pressing Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
    }
    
    // Public API
    return {
        showAgentInfoModal,
        showMcpInfoModal,
        showSharePasswordInfoModal,
        showShareLinkInfoModal
    };
})();

// Make available globally
window.SettingsInfoModalService = SettingsInfoModalService;