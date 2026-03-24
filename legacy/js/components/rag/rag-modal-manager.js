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

        // Info icon click handler
        const ragInfoIcon = document.getElementById('rag-info-icon');
        if (ragInfoIcon) {
            ragInfoIcon.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.SettingsInfoModalService) {
                    window.SettingsInfoModalService.showRagInfoModal(ragInfoIcon);
                }
            });
        }

        // RAG enable/disable checkbox
        const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
        const ragHelpText = document.getElementById('rag-help-text');
        const ragDisabledMessage = document.getElementById('rag-disabled-message');
        
        if (ragEnabledCheckbox) {
            ragEnabledCheckbox.addEventListener('change', handleRAGEnabledChange);
            
            // Check provider and disable RAG if not OpenAI
            const provider = window.DataService?.getBaseUrlProvider?.() || 'openai';
            if (provider !== 'openai') {
                ragEnabledCheckbox.disabled = true;
                ragEnabledCheckbox.checked = false;
                ragEnabledCheckbox.title = 'RAG is only available with OpenAI provider';
                // Show disabled message, hide normal help
                if (ragHelpText) ragHelpText.style.display = 'none';
                if (ragDisabledMessage) ragDisabledMessage.style.display = 'block';
                // Save disabled state
                if (window.RAGStorageService) {
                    window.RAGStorageService.setRAGEnabled(false);
                }
            } else {
                ragEnabledCheckbox.disabled = false;
                ragEnabledCheckbox.title = '';
                // Show normal help, hide disabled message
                if (ragHelpText) ragHelpText.style.display = 'block';
                if (ragDisabledMessage) ragDisabledMessage.style.display = 'none';
                // Load initial state only for OpenAI
                const isRAGEnabled = getRAGEnabledState();
                ragEnabledCheckbox.checked = isRAGEnabled;
            }
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
            
            // Check provider and update RAG checkbox state
            const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
            const ragHelpText = document.getElementById('rag-help-text');
            const ragDisabledMessage = document.getElementById('rag-disabled-message');
            
            if (ragEnabledCheckbox) {
                const provider = window.DataService?.getBaseUrlProvider?.() || 'openai';
                if (provider !== 'openai') {
                    ragEnabledCheckbox.disabled = true;
                    ragEnabledCheckbox.checked = false;
                    ragEnabledCheckbox.title = 'RAG is only available with OpenAI provider';
                    // Show disabled message, hide normal help
                    if (ragHelpText) ragHelpText.style.display = 'none';
                    if (ragDisabledMessage) ragDisabledMessage.style.display = 'block';
                } else {
                    ragEnabledCheckbox.disabled = false;
                    ragEnabledCheckbox.title = '';
                    // Show normal help, hide disabled message
                    if (ragHelpText) ragHelpText.style.display = 'block';
                    if (ragDisabledMessage) ragDisabledMessage.style.display = 'none';
                }
            }
            
            // Populate the query expansion model selector
            populateExpansionModelSelector();
            
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
     * Populate the query expansion model selector with models from current provider
     */
    function populateExpansionModelSelector() {
        const expansionModelSelect = document.getElementById('rag-expansion-model');
        if (!expansionModelSelect) return;
        
        // Get the current provider
        const provider = window.DataService?.getBaseUrlProvider?.() || 'openai';
        
        // Get the default expansion model for this provider
        const defaultExpansionModel = window.DefaultModelsConfig?.getRagExpansionModel?.(provider) || 'gpt-4.1-mini';
        
        // Get the currently selected expansion model from storage or use default
        const storedExpansionModel = window.RAGStorageService?.getExpansionModel?.() || defaultExpansionModel;
        
        // Get models from the main model selector dropdown
        const modelSelect = document.getElementById('model-select');
        const availableModels = [];
        
        if (modelSelect && modelSelect.options.length > 0) {
            // Extract models from the main model selector
            Array.from(modelSelect.options).forEach(option => {
                if (!option.disabled && option.value) {
                    availableModels.push({
                        id: option.value,
                        name: option.textContent
                    });
                }
            });
        }
        
        // Clear existing options
        expansionModelSelect.innerHTML = '';
        
        // If we have models, populate the selector
        if (availableModels.length > 0) {
            // Add available models
            availableModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                
                // Select the appropriate model
                if (model.id === storedExpansionModel) {
                    option.selected = true;
                } else if (!storedExpansionModel && model.id === defaultExpansionModel) {
                    option.selected = true;
                }
                
                expansionModelSelect.appendChild(option);
            });
            
            // Add "Use Current Chat Model" option at the end
            const currentOption = document.createElement('option');
            currentOption.value = 'current';
            currentOption.textContent = 'Use Current Chat Model';
            expansionModelSelect.appendChild(currentOption);
            
            // If nothing was selected yet, select the default model
            if (!expansionModelSelect.value) {
                // Try to select the default expansion model
                for (let i = 0; i < expansionModelSelect.options.length; i++) {
                    if (expansionModelSelect.options[i].value === defaultExpansionModel) {
                        expansionModelSelect.value = defaultExpansionModel;
                        break;
                    }
                }
                
                // If default model not found, select the first available model
                if (!expansionModelSelect.value && expansionModelSelect.options.length > 0) {
                    expansionModelSelect.value = expansionModelSelect.options[0].value;
                }
            }
        } else {
            // No models available, add default options
            const defaultOptions = [
                { value: 'gpt-4.1-mini', text: 'GPT-4.1 Mini (Recommended)' },
                { value: 'gpt-5-nano', text: 'GPT-5 Nano (Fast & Efficient)' },
                { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' },
                { value: 'gpt-4o', text: 'GPT-4o (Most Accurate)' },
                { value: 'current', text: 'Use Current Chat Model' }
            ];
            
            defaultOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                
                // Select the default expansion model
                if (opt.value === defaultExpansionModel) {
                    option.selected = true;
                }
                
                expansionModelSelect.appendChild(option);
            });
        }
        
        // Remove existing change listener to avoid duplicates
        const oldListener = expansionModelSelect._ragChangeListener;
        if (oldListener) {
            expansionModelSelect.removeEventListener('change', oldListener);
        }
        
        // Create and store new listener
        const changeListener = (e) => {
            const selectedModel = e.target.value;
            if (window.RAGStorageService?.setExpansionModel) {
                window.RAGStorageService.setExpansionModel(selectedModel);
            }
        };
        
        // Save reference to listener for later removal
        expansionModelSelect._ragChangeListener = changeListener;
        
        // Add the change listener
        expansionModelSelect.addEventListener('change', changeListener);
        
        console.log(`RAGModalManager: Populated expansion model selector with ${expansionModelSelect.options.length} models, selected: ${expansionModelSelect.value}`);
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
                    statusElement.textContent = `Indexed (${chunkCount} chunks @ ~512 tokens)`;
                } else {
                    statusElement.textContent = 'Indexed (in memory)';
                }
                statusElement.classList.add('indexed');
                statusElement.classList.remove('not-indexed');
                statusElement.title = `Document is indexed with ${chunkCount > 0 ? chunkCount + ' chunks of ~512 tokens each' : 'embeddings'}. Note: Embeddings are stored in memory only and will need to be re-indexed after page reload.`;
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