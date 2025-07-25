/**
 * Settings Info Popup Service
 * Handles click-based info popups for Agent and MCP modal info icons
 * Similar functionality to the System Prompts modal info popups
 */

const SettingsInfoPopupService = (() => {
    
    /**
     * Create and show an info popup for Agent modal
     * @param {HTMLElement} infoIcon - The info icon that was clicked
     */
    function showAgentInfoPopup(infoIcon) {
        const popup = createInfoPopup(
            'AI Agent Configuration',
            'Configure AI agents for specialized tasks. Agents can be created with specific roles, instructions, and capabilities to help with research, coding, analysis, and other specialized workflows.'
        );
        showPopup(popup, infoIcon);
    }
    
    /**
     * Create and show an info popup for MCP modal
     * @param {HTMLElement} infoIcon - The info icon that was clicked
     */
    function showMcpInfoPopup(infoIcon) {
        const popup = createInfoPopup(
            'Model Context Protocol (MCP)',
            'MCP enables AI models to securely connect to external tools, data sources, and services. Configure MCP servers to extend your AI assistant\'s capabilities with file access, databases, APIs, and more.'
        );
        showPopup(popup, infoIcon);
    }
    
    /**
     * Create an info popup element
     * @param {string} title - Popup title
     * @param {string} description - Popup description
     * @returns {HTMLElement} Popup element
     */
    function createInfoPopup(title, description) {
        const popup = document.createElement('div');
        popup.className = 'settings-info-popup';
        
        popup.innerHTML = `
            <div class="settings-info-header">
                <h3>${title}</h3>
                <button class="settings-info-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="settings-info-content">
                <p>${description}</p>
            </div>
        `;
        
        return popup;
    }
    
    /**
     * Show popup and set up positioning and event handlers
     * @param {HTMLElement} popup - Popup element
     * @param {HTMLElement} infoIcon - Info icon that triggered the popup
     */
    function showPopup(popup, infoIcon) {
        // Position the popup near the info icon, but ensure it's visible on screen
        const rect = infoIcon.getBoundingClientRect();
        popup.style.position = 'fixed';
        
        // Calculate position to keep popup on screen
        let top = rect.bottom + 10;
        let left = rect.left - 200; // Offset to center roughly on icon
        
        // Adjust if popup would go off-screen
        const popupWidth = 300;
        const popupHeight = 120; // Approximate height
        
        if (left < 10) left = 10;
        if (left + popupWidth > window.innerWidth - 10) {
            left = window.innerWidth - popupWidth - 10;
        }
        
        if (top + popupHeight > window.innerHeight - 10) {
            top = rect.top - popupHeight - 10;
        }
        
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        
        // Add to body
        document.body.appendChild(popup);
        
        // Set up event handlers
        setupPopupHandlers(popup, infoIcon);
    }
    
    /**
     * Setup event handlers for popup
     * @param {HTMLElement} popup - Popup element
     * @param {HTMLElement} infoIcon - Info icon that triggered popup
     */
    function setupPopupHandlers(popup, infoIcon) {
        // Close button handler
        const closeBtn = popup.querySelector('.settings-info-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closePopup(popup);
            });
        }
        
        // Click outside to close (add slight delay to prevent immediate close)
        setTimeout(() => {
            function handleOutsideClick(event) {
                if (!popup.contains(event.target) && event.target !== infoIcon) {
                    closePopup(popup);
                    document.removeEventListener('click', handleOutsideClick);
                }
            }
            document.addEventListener('click', handleOutsideClick);
        }, 100);
        
        // Escape key to close
        function handleEscapeKey(event) {
            if (event.key === 'Escape') {
                closePopup(popup);
                document.removeEventListener('keydown', handleEscapeKey);
            }
        }
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    /**
     * Close and remove popup
     * @param {HTMLElement} popup - Popup element to close
     */
    function closePopup(popup) {
        if (document.body.contains(popup)) {
            document.body.removeChild(popup);
        }
    }
    
    // Public API
    return {
        showAgentInfoPopup,
        showMcpInfoPopup
    };
})();

// Make available globally
window.SettingsInfoPopupService = SettingsInfoPopupService;