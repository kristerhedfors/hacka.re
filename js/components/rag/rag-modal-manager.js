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
            
            // Update document checkboxes based on their enabled state (not indexed state)
            const documentIds = ['cra', 'aia', 'dora'];
            const enabledDocs = window.RAGStorageService ? window.RAGStorageService.getEnabledEUDocuments() : [];
            
            documentIds.forEach(docId => {
                const checkbox = document.getElementById(`rag-doc-${docId}`);
                if (checkbox) {
                    // Set checkbox based on whether it's enabled (user preference)
                    const isEnabled = enabledDocs.includes(docId);
                    checkbox.checked = isEnabled;
                    
                    // Check if document is actually indexed
                    const isIndexed = window.RAGCoordinator && window.RAGCoordinator.checkDocumentIndexed ? 
                        window.RAGCoordinator.checkDocumentIndexed(docId) : false;
                    
                    // Update status display based on indexed state
                    updateDocumentStatus(docId, isIndexed);
                }
            });
            
            // Trigger updates for all RAG components
            if (window.RAGIndexStatsManager) {
                window.RAGIndexStatsManager.updateStats();
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
        
        // No popup messages - just silently update the state
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
            // Enable document for RAG search
            console.log(`RAGModalManager: Enabling ${documentNames[docId]} for RAG search...`);
            
            // Check if already indexed
            const isIndexed = window.RAGCoordinator && window.RAGCoordinator.checkDocumentIndexed ?
                window.RAGCoordinator.checkDocumentIndexed(docId) : false;
            
            if (isIndexed) {
                // Already indexed, just enable it for search
                console.log(`${documentNames[docId]} already indexed, enabling for search`);
                
                // Mark as enabled in localStorage
                try {
                    const euDocsKey = 'rag_eu_documents_index';
                    let existingDocs = {};
                    const existing = CoreStorageService.getValue(euDocsKey);
                    if (existing && typeof existing === 'object') {
                        existingDocs = existing;
                    }
                    
                    if (!existingDocs[docId]) {
                        existingDocs[docId] = {
                            name: documentNames[docId],
                            documentId: docId,
                            enabled: true,
                            hasVectors: true
                        };
                    } else {
                        existingDocs[docId].enabled = true;
                    }
                    
                    CoreStorageService.setValue(euDocsKey, existingDocs);
                } catch (e) {
                    console.log('Could not update EU docs index');
                }
                
                updateDocumentStatus(docId, true);
                // Silent update - no alert message
                console.log(`${documentNames[docId]} enabled for RAG search`);
            } else {
                // Not indexed yet, need to index first
                console.log(`${documentNames[docId]} not indexed, indexing now...`);
                
                if (window.RAGCoordinator && window.RAGCoordinator.refreshDocument) {
                    // This will perform the actual indexing with embeddings
                    window.RAGCoordinator.refreshDocument(docId).then(() => {
                        console.log(`${documentNames[docId]} indexing completed`);
                        updateDocumentStatus(docId, true);
                    }).catch(error => {
                        console.error(`Failed to index ${documentNames[docId]}:`, error);
                        event.target.checked = false;
                        updateDocumentStatus(docId, false);
                        alert(`Failed to index ${documentNames[docId]}. Check console for details.`);
                    });
                } else {
                    console.error('RAGCoordinator not available');
                    event.target.checked = false;
                    alert('RAG system not available');
                }
            }
            
            // Update stats if available
            if (window.RAGIndexStatsManager) {
                window.RAGIndexStatsManager.updateStats();
            }
        } else {
            // Disable document for RAG search (but keep index in memory)
            console.log(`RAGModalManager: Disabling ${documentNames[docId]} from RAG search (keeping index)...`);
            
            // Just mark as disabled in localStorage, don't clear vectors
            try {
                const euDocsKey = 'rag_eu_documents_index';
                const existingDocs = CoreStorageService.getValue(euDocsKey);
                if (existingDocs && existingDocs[docId]) {
                    existingDocs[docId].enabled = false;
                    CoreStorageService.setValue(euDocsKey, existingDocs);
                }
            } catch (e) {
                console.log('Could not update EU docs index');
            }
            
            // Update UI to show it's disabled but still indexed
            const statusElement = document.getElementById(`${docId}-status`);
            if (statusElement) {
                const isIndexed = window.RAGCoordinator && window.RAGCoordinator.checkDocumentIndexed ?
                    window.RAGCoordinator.checkDocumentIndexed(docId) : false;
                
                if (isIndexed) {
                    // Get chunk count
                    let chunkCount = 0;
                    if (window.ragVectorStore && window.ragVectorStore.hasVectors(docId)) {
                        const vectors = window.ragVectorStore.getVectors(docId);
                        chunkCount = vectors ? vectors.length : 0;
                    }
                    
                    // If no chunks from memory, check precached data
                    if (chunkCount === 0 && window.precachedEmbeddings) {
                        const doc = window.precachedEmbeddings.documents?.find(d => d.documentId === docId);
                        chunkCount = doc ? doc.vectors.length : 0;
                    }
                    
                    if (chunkCount > 0) {
                        statusElement.textContent = `Indexed (disabled, ${chunkCount} chunks)`;
                    } else {
                        statusElement.textContent = 'Indexed (disabled)';
                    }
                    statusElement.classList.add('indexed');
                    statusElement.classList.add('disabled');
                } else {
                    statusElement.textContent = 'Not indexed';
                    statusElement.classList.remove('indexed');
                    statusElement.classList.remove('disabled');
                }
            }
            
            // Silent update - no alert message
            console.log(`${documentNames[docId]} disabled for search (index kept in memory)`);
            
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
                // Get chunk count from the indexed documents
                let chunkCount = 0;
                if (window.ragVectorStore && window.ragVectorStore.hasVectors(docId)) {
                    const vectors = window.ragVectorStore.getVectors(docId);
                    chunkCount = vectors ? vectors.length : 0;
                }
                
                // If no chunks from memory, check precached data
                if (chunkCount === 0 && window.precachedEmbeddings) {
                    const doc = window.precachedEmbeddings.documents?.find(d => d.documentId === docId);
                    chunkCount = doc ? doc.vectors.length : 0;
                }
                
                if (chunkCount > 0) {
                    statusElement.textContent = `Indexed (${chunkCount} chunks @ ~200 tokens)`;
                } else {
                    statusElement.textContent = 'Indexed (in memory)';
                }
                statusElement.classList.add('indexed');
                statusElement.classList.remove('not-indexed');
                statusElement.title = `Document is indexed with ${chunkCount > 0 ? chunkCount + ' chunks of ~200 tokens each' : 'embeddings'}. Note: Embeddings are stored in memory only and will need to be re-indexed after page reload.`;
            } else {
                statusElement.textContent = 'Not indexed';
                statusElement.classList.remove('indexed');
                statusElement.classList.add('not-indexed');
                statusElement.title = 'Document needs to be indexed. Check the checkbox or click refresh to generate embeddings.';
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