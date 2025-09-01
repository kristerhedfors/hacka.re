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

        // Document checkboxes for regulatory documents
        const documentIds = ['cra', 'aia', 'dora'];
        documentIds.forEach(docId => {
            const checkbox = document.getElementById(`rag-doc-${docId}`);
            if (checkbox) {
                checkbox.addEventListener('change', (event) => handleDocumentToggle(event, docId));
                
                // Load initial state
                if (docId === 'cra' && window.ragRegulationsService) {
                    // CRA has special handling with regulations service
                    const stats = window.ragRegulationsService.getStatistics();
                    checkbox.checked = stats && stats.regulationCount > 0;
                    updateDocumentStatus(docId, checkbox.checked);
                } else {
                    // For other documents, start unchecked
                    updateDocumentStatus(docId, checkbox.checked);
                }
            }
        });
    }

    /**
     * Show the RAG modal
     */
    function showModal() {
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Update document statuses based on actual index state
            const documentIds = ['cra', 'aia', 'dora'];
            documentIds.forEach(docId => {
                const checkbox = document.getElementById(`rag-doc-${docId}`);
                if (checkbox) {
                    // Check if document is actually indexed with vectors
                    const isIndexed = window.RAGCoordinator && window.RAGCoordinator.checkDocumentIndexed ? 
                        window.RAGCoordinator.checkDocumentIndexed(docId) : false;
                    
                    // Update checkbox to match indexed state
                    checkbox.checked = isIndexed;
                    updateDocumentStatus(docId, isIndexed);
                }
            });
            
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

    /**
     * Handle document checkbox toggle
     * @param {Event} event - Checkbox change event
     * @param {string} docId - Document ID ('cra', 'aia', 'dora')
     */
    function handleDocumentToggle(event, docId) {
        const isChecked = event.target.checked;
        const documentNames = {
            'cra': 'CRA (Cyber Resilience Act)',
            'aia': 'AIA (AI Act)',
            'dora': 'DORA (Digital Operational Resilience Act)'
        };
        
        if (isChecked) {
            // Enable document indexing
            if (docId === 'cra' && window.ragRegulationsService) {
                // Special handling for CRA with actual implementation
                console.log('RAGModalManager: Enabling CRA regulations...');
                window.ragRegulationsService.initialize().then(() => {
                    const stats = window.ragRegulationsService.getStatistics();
                    if (stats && stats.regulationCount > 0) {
                        updateDocumentStatus(docId, true);
                        showSuccess(`CRA regulations indexed: ${stats.regulationCount} regulations loaded`);
                        
                        // Update stats if available
                        if (window.RAGIndexStatsManager) {
                            window.RAGIndexStatsManager.updateStats();
                        }
                    }
                }).catch(error => {
                    console.error('Failed to enable CRA regulations:', error);
                    event.target.checked = false;
                    updateDocumentStatus(docId, false);
                    alert('Failed to enable CRA regulations. Check console for details.');
                });
            } else {
                // Placeholder for other documents
                console.log(`RAGModalManager: Enabling ${documentNames[docId]}...`);
                updateDocumentStatus(docId, true);
                showSuccess(`${documentNames[docId]} enabled for indexing (simulated)`);
                
                // Update stats if available
                if (window.RAGIndexStatsManager) {
                    window.RAGIndexStatsManager.updateStats();
                }
            }
        } else {
            // Disable document indexing
            if (docId === 'cra' && window.ragRegulationsService) {
                console.log('RAGModalManager: Disabling CRA regulations...');
                window.ragRegulationsService.clearEncryptedStorage();
                updateDocumentStatus(docId, false);
                showInfo('CRA regulations disabled and removed from index');
            } else {
                console.log(`RAGModalManager: Disabling ${documentNames[docId]}...`);
                updateDocumentStatus(docId, false);
                showInfo(`${documentNames[docId]} disabled (simulated)`);
            }
            
            // Update stats if available
            if (window.RAGIndexStatsManager) {
                window.RAGIndexStatsManager.updateStats();
            }
        }
    }

    /**
     * Update document status indicator
     * @param {string} docId - Document ID
     * @param {boolean} isIndexed - Whether the document is indexed
     */
    function updateDocumentStatus(docId, isIndexed) {
        const statusElement = document.getElementById(`${docId}-status`);
        if (statusElement) {
            if (isIndexed) {
                statusElement.textContent = 'Indexed';
                statusElement.classList.add('indexed');
                statusElement.classList.remove('not-indexed');
            } else {
                statusElement.textContent = 'Not indexed';
                statusElement.classList.remove('indexed');
                statusElement.classList.add('not-indexed');
            }
        }
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