/**
 * RAG Modal Manager
 * Manages the RAG modal display, visibility, and basic interactions
 */

window.RAGModalManager = (function() {
    
    let isInitialized = false;
    let elements = {};

    /**
     * Initialize the RAG Modal Manager
     * @param {Object} domElements - DOM elements object
     */
    function init(domElements) {
        if (isInitialized) {
            return;
        }

        elements = domElements;
        setupEventListeners();
        isInitialized = true;
        console.log('RAGModalManager: Initialized successfully');
    }

    /**
     * Set up event listeners for modal functionality
     */
    function setupEventListeners() {
        // RAG button click to show modal
        if (elements.ragBtn) {
            elements.ragBtn.addEventListener('click', showModal);
        }

        // Close modal button
        const closeBtn = document.getElementById('close-rag-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideModal);
        }

        // Modal click outside to close
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideModal();
                }
            });
        }

        // RAG enable/disable checkbox
        const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
        if (ragEnabledCheckbox) {
            ragEnabledCheckbox.addEventListener('change', handleRAGEnabledChange);
            
            // Load initial state
            const isRAGEnabled = getRAGEnabledState();
            ragEnabledCheckbox.checked = isRAGEnabled;
        }
    }

    /**
     * Show the RAG modal
     */
    function showModal() {
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Trigger updates for all RAG components
            if (window.RAGIndexStatsManager) {
                window.RAGIndexStatsManager.updateStats();
            }
            if (window.RAGPromptsListManager) {
                window.RAGPromptsListManager.loadPromptsList();
            }
            if (window.RAGFileKnowledgeManager) {
                window.RAGFileKnowledgeManager.loadFiles();
            }
            if (window.RAGUserBundlesManager) {
                window.RAGUserBundlesManager.loadBundlesList();
            }
        }
    }

    /**
     * Hide the RAG modal
     */
    function hideModal() {
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Handle RAG enabled/disabled state change
     * @param {Event} event - Checkbox change event
     */
    function handleRAGEnabledChange(event) {
        const isEnabled = event.target.checked;
        setRAGEnabledState(isEnabled);
        
        console.log(`RAGModalManager: RAG ${isEnabled ? 'enabled' : 'disabled'}`);
        
        if (isEnabled) {
            showSuccess('RAG enabled - chat responses will be enhanced with relevant context');
        } else {
            showInfo('RAG disabled - chat responses will not include knowledge base context');
        }
    }

    /**
     * Get RAG enabled state
     * @returns {boolean} Whether RAG is enabled
     */
    function getRAGEnabledState() {
        return RAGStorageService.isRAGEnabled();
    }

    /**
     * Set RAG enabled state
     * @param {boolean} enabled - Whether RAG should be enabled
     */
    function setRAGEnabledState(enabled) {
        RAGStorageService.setRAGEnabled(enabled);
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        console.log('RAGModalManager Success:', message);
        if (showSuccess.lastMessage === message && Date.now() - showSuccess.lastTime < 1000) {
            return;
        }
        showSuccess.lastMessage = message;
        showSuccess.lastTime = Date.now();
        alert(`Success: ${message}`);
    }

    /**
     * Show info message
     * @param {string} message - Info message
     */
    function showInfo(message) {
        console.log('RAGModalManager Info:', message);
        alert(`Info: ${message}`);
    }

    /**
     * Check if RAG is currently enabled
     * @returns {boolean} Whether RAG is enabled
     */
    function isRAGEnabled() {
        return RAGStorageService.isRAGEnabled();
    }

    // Public API
    return {
        init,
        showModal,
        hideModal,
        isRAGEnabled,
        getRAGEnabledState,
        setRAGEnabledState
    };
})();