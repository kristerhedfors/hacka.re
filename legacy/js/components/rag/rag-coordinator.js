/**
 * RAG Coordinator
 * Main coordinator for all RAG functionality, replacing the monolithic rag-manager
 * Orchestrates specialized RAG components
 */

window.RAGCoordinator = (function() {
    
    let isInitialized = false;
    let elements = {};
    
    // In-memory storage for vectors - avoids localStorage quota issues
    const vectorStore = {
        // Structure: { docId: { vectors: [...], metadata: {...} } }
        documents: {},
        
        // Store vectors for a document (alias for compatibility)
        storeVectors(docId, vectors, metadata) {
            this.setVectors(docId, vectors, metadata);
        },
        
        // Store vectors for a document
        setVectors(docId, vectors, metadata) {
            this.documents[docId] = {
                vectors: vectors,
                metadata: metadata,
                timestamp: new Date().toISOString()
            };
            console.log(`VectorStore: Stored ${vectors.length} vectors for ${docId} in memory`);
        },
        
        // Get vectors for a document
        getVectors(docId) {
            return this.documents[docId]?.vectors || null;
        },
        
        // Check if document has vectors
        hasVectors(docId) {
            return !!(this.documents[docId]?.vectors?.length);
        },
        
        // Get all document IDs with vectors
        getDocumentIds() {
            return Object.keys(this.documents);
        },
        
        // Clear vectors for a document
        clearDocument(docId) {
            delete this.documents[docId];
            console.log(`VectorStore: Cleared vectors for ${docId}`);
        },
        
        // Get metadata for a document
        getMetadata(docId) {
            return this.documents[docId]?.metadata || null;
        }
    };
    
    // Make vectorStore accessible globally for debugging
    window.ragVectorStore = vectorStore;

    /**
     * Initialize the RAG Coordinator and all sub-components
     * @param {Object} domElements - DOM elements object
     */
    function init(domElements) {
        if (isInitialized) {
            return;
        }

        elements = domElements;
        
        // Initialize all RAG sub-components
        initializeSubComponents();
        
        // Initialize RAG services
        VectorRAGService.initialize();
        
        // Initialize regulations service
        if (window.ragRegulationsService) {
            window.ragRegulationsService.initialize().catch(error => {
                console.warn('Failed to initialize regulations service:', error);
            });
        }
        
        // Migrate legacy localStorage settings to proper storage
        RAGStorageService.migrateLegacyRAGSettings();
        
        isInitialized = true;
        console.log('RAGCoordinator: Initialized successfully');
        
        // Load initial data
        updateAllComponents();
    }

    /**
     * Initialize all sub-components
     */
    function initializeSubComponents() {
        // Initialize modal manager
        if (window.RAGModalManager) {
            window.RAGModalManager.init(elements);
        }

        // Initialize search manager
        if (window.RAGSearchManager) {
            window.RAGSearchManager.init();
        }

        // Initialize index stats manager
        if (window.RAGIndexStatsManager) {
            window.RAGIndexStatsManager.init();
        }

        // Initialize file knowledge manager
        if (window.RAGFileKnowledgeManager) {
            window.RAGFileKnowledgeManager.init();
        }


        // Initialize user bundles manager
        if (window.RAGUserBundlesManager) {
            window.RAGUserBundlesManager.init();
        }

        console.log('RAGCoordinator: All sub-components initialized');
    }

    /**
     * Update all RAG components
     */
    function updateAllComponents() {
        // Update statistics
        if (window.RAGIndexStatsManager) {
            window.RAGIndexStatsManager.updateStats();
        }


        // Update file knowledge
        if (window.RAGFileKnowledgeManager) {
            window.RAGFileKnowledgeManager.loadFiles();
        }

        // Update user bundles
        if (window.RAGUserBundlesManager) {
            window.RAGUserBundlesManager.loadBundlesList();
        }

        // Update search button state
        if (window.RAGSearchManager) {
            window.RAGSearchManager.updateSearchButtonState();
        }
    }

    /**
     * Show the RAG modal
     */
    function showRAGModal() {
        if (window.RAGModalManager) {
            window.RAGModalManager.showModal();
        }
    }

    /**
     * Hide the RAG modal
     */
    function hideRAGModal() {
        if (window.RAGModalManager) {
            window.RAGModalManager.hideModal();
        }
    }

    /**
     * Check if RAG is currently enabled
     * @returns {boolean} Whether RAG is enabled
     */
    function isRAGEnabled() {
        if (window.RAGModalManager) {
            return window.RAGModalManager.isRAGEnabled();
        }
        return RAGStorageService.isRAGEnabled();
    }

    /**
     * Get RAG enabled state
     * @returns {boolean} Whether RAG is enabled
     */
    function getRAGEnabledState() {
        if (window.RAGModalManager) {
            return window.RAGModalManager.getRAGEnabledState();
        }
        return RAGStorageService.isRAGEnabled();
    }

    /**
     * Set RAG enabled state
     * @param {boolean} enabled - Whether RAG should be enabled
     */
    function setRAGEnabledState(enabled) {
        if (window.RAGModalManager) {
            window.RAGModalManager.setRAGEnabledState(enabled);
        } else {
            RAGStorageService.setRAGEnabled(enabled);
        }
    }

    /**
     * Get current RAG status
     * @returns {Object} Current status
     */
    function getStatus() {
        return {
            initialized: isInitialized,
            enabled: getRAGEnabledState(),
            stats: VectorRAGService.getIndexStats()
        };
    }

    /**
     * Refresh all RAG data
     */
    function refreshData() {
        VectorRAGService.reloadIndexes();
        updateAllComponents();
    }

    /**
     * Copy search result to clipboard (delegate to search manager)
     * @param {number} index - Result index
     */
    function copyResultToClipboard(index) {
        if (window.RAGSearchManager) {
            window.RAGSearchManager.copyResultToClipboard(index);
        }
    }

    /**
     * Use search result in chat (delegate to search manager)
     * @param {number} index - Result index
     */
    function useResultInChat(index) {
        if (window.RAGSearchManager) {
            window.RAGSearchManager.useResultInChat(index);
        }
    }

    /**
     * Remove user bundle (delegate to bundles manager)
     * @param {string} bundleName - Name of bundle to remove
     */
    function removeUserBundle(bundleName) {
        if (window.RAGUserBundlesManager) {
            window.RAGUserBundlesManager.removeBundle(bundleName);
        }
    }

    /**
     * Remove file (delegate to file knowledge manager)
     * @param {string} fileId - File ID to remove
     */
    function removeFile(fileId) {
        if (window.RAGFileKnowledgeManager) {
            window.RAGFileKnowledgeManager.removeFile(fileId);
        }
    }

    /**
     * Update UI (refresh all components)
     */
    function updateUI() {
        updateAllComponents();
    }


    /**
     * View document content in markdown viewer modal
     * @param {string} docId - Document ID (e.g., 'cra', 'aia', 'dora')
     */
    function viewDocument(docId) {
        const documentInfo = {
            'cra': {
                title: 'CRA (Cyber Resilience Act)',
                description: 'EU regulation for cybersecurity requirements of products with digital elements',
                content: getCRADocumentContent()
            },
            'aia': {
                title: 'AIA (AI Act)', 
                description: 'EU regulation on artificial intelligence systems',
                content: getAIADocumentContent()
            },
            'dora': {
                title: 'DORA (Digital Operational Resilience Act)',
                description: 'EU regulation for digital operational resilience in the financial sector',
                content: getDORADocumentContent()
            }
        };

        const modal = document.getElementById('rag-document-viewer-modal');
        const titleElement = document.getElementById('rag-viewer-title');
        const contentElement = document.getElementById('rag-document-content');
        const chunksElement = document.getElementById('rag-viewer-chunks');
        const chunkSizeElement = document.getElementById('rag-viewer-chunk-size');
        const overlapElement = document.getElementById('rag-viewer-overlap');

        if (modal && documentInfo[docId]) {
            const info = documentInfo[docId];
            
            // Set title
            if (titleElement) {
                titleElement.textContent = info.title;
            }
            
            // Set content with markdown rendering
            if (contentElement) {
                const isIndexed = checkDocumentIndexed(docId);
                if (isIndexed && info.content) {
                    // Show actual document content with chunk boundaries
                    contentElement.innerHTML = renderDocumentWithChunks(info.content, docId);
                } else {
                    contentElement.innerHTML = `
                        <div class="rag-viewer-empty">
                            <h3>${info.title}</h3>
                            <p>${info.description}</p>
                            <p class="rag-viewer-status">
                                Status: ${isIndexed ? 'Indexed' : 'Not indexed - Enable the document checkbox to index'}
                            </p>
                        </div>
                    `;
                }
            }
            
            // Update stats
            const settings = getDocumentSettings(docId);
            if (chunksElement) chunksElement.textContent = settings.chunks || '0';
            if (chunkSizeElement) chunkSizeElement.textContent = `${settings.chunkSize || 512} tokens`;
            if (overlapElement) overlapElement.textContent = `${settings.overlap || 10}%`;
            
            // Show modal
            modal.classList.add('active');
        } else if (window.RAGDocumentViewManager) {
            window.RAGDocumentViewManager.viewDocument(docId);
        } else {
            console.warn('RAGCoordinator: Document viewer modal not found');
        }
    }

    /**
     * Check if a document is indexed
     * @param {string} docId - Document ID
     * @returns {boolean} Whether the document is indexed with vectors
     */
    function checkDocumentIndexed(docId) {
        // Check if document has vectors in memory
        return vectorStore.hasVectors(docId);
    }

    /**
     * Refresh document embeddings - performs actual re-indexing
     * @param {string} docId - Document ID (e.g., 'cra', 'aia', 'dora')
     */
    async function refreshDocument(docId) {
        const documentNames = {
            'cra': 'CRA (Cyber Resilience Act)',
            'aia': 'AIA (AI Act)',
            'dora': 'DORA (Digital Operational Resilience Act)'
        };

        if (!documentNames[docId]) {
            console.warn('RAGCoordinator: Unknown document:', docId);
            return;
        }

        // Check if API key is available FIRST
        const apiKey = StorageService.getApiKey();
        if (!apiKey) {
            // Show API key prompt
            if (confirm(`Indexing ${documentNames[docId]} requires an API key to generate embeddings.\n\nWithout embeddings, RAG search will not work effectively.\n\nWould you like to configure your API key now?`)) {
                // Open settings modal
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal) {
                    settingsModal.classList.add('active');
                    // Focus on API key field
                    setTimeout(() => {
                        const apiKeyField = document.getElementById('api-key-update');
                        if (apiKeyField) {
                            apiKeyField.focus();
                        }
                    }, 100);
                }
            }
            return;
        }

        console.log(`RAGCoordinator: Refreshing ${documentNames[docId]}...`);
        
        // Clear existing vectors from memory before re-indexing
        if (vectorStore.hasVectors(docId)) {
            console.log(`Clearing existing vectors for ${docId} before refresh`);
            vectorStore.clearDocument(docId);
        }
        
        // Show loading state
        const statusElement = document.getElementById(`${docId}-status`);
        if (statusElement) {
            statusElement.textContent = 'Indexing...';
            statusElement.classList.add('indexing');
        }

        try {
            if (docId === 'cra' && window.ragRegulationsService) {
                // CRA has actual implementation via regulations service
                await window.ragRegulationsService.updateEncryptedStorage();
                const stats = window.ragRegulationsService.getStatistics();
                console.log(`CRA re-indexed: ${stats.regulationCount} regulations`);
            } else {
                // For AIA and DORA, store for text-based search
                const content = docId === 'aia' ? getAIADocumentContent() : getDORADocumentContent();
                const settings = getDocumentSettings(docId);
                
                if (content) {
                    // Chunk the document
                    const chunks = chunkDocument(content, settings.chunkSize, settings.overlap);
                    
                    // Get API key and base URL for embedding generation
                    const apiKey = StorageService.getApiKey();
                    const baseUrl = StorageService.getBaseUrl() || 'https://api.openai.com/v1';
                    
                    // Calculate character positions for each chunk (we don't store the chunks themselves)
                    const chunkPositions = calculateChunkPositions(content, settings.chunkSize, settings.overlap);
                    
                    // Generate embeddings for chunks in batches if API key is available
                    const vectorIndex = [];
                    
                    if (apiKey) {
                        console.log(`Generating embeddings for ${chunkPositions.length} text segments...`);
                        
                        // OpenAI allows up to 2048 inputs in a single embedding request
                        // But we'll use smaller batches for better performance and error handling
                        const BATCH_SIZE = 20; // Process 20 chunks at a time
                        
                        for (let batchStart = 0; batchStart < chunkPositions.length; batchStart += BATCH_SIZE) {
                            const batchEnd = Math.min(batchStart + BATCH_SIZE, chunkPositions.length);
                            const batchPositions = chunkPositions.slice(batchStart, batchEnd);
                            // Extract the actual text for these positions to send to embedding API
                            const batchTexts = batchPositions.map(pos => content.substring(pos.start, pos.end));
                            
                            try {
                                // Show progress
                                if (statusElement) {
                                    statusElement.textContent = `Indexing... (${batchEnd}/${chunkPositions.length})`;
                                }
                                
                                // Generate embeddings for the batch
                                const response = await fetch(`${baseUrl}/embeddings`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${apiKey}`
                                    },
                                    body: JSON.stringify({
                                        input: batchTexts,
                                        model: settings.embeddingModel || 'text-embedding-3-small'
                                    })
                                });
                                
                                if (!response.ok) {
                                    throw new Error(`Embedding API error: ${response.status}`);
                                }
                                
                                const data = await response.json();
                                
                                // Add each vector with position reference (no content stored)
                                for (let i = 0; i < batchPositions.length; i++) {
                                    const vecIdx = batchStart + i;
                                    const embedding = data.data[i].embedding;
                                    const position = batchPositions[i];
                                    
                                    vectorIndex.push({
                                        id: `${docId}_vec_${vecIdx}`,
                                        // NO content field - we'll retrieve from source when needed
                                        embedding: embedding,  // Store the actual embedding vector
                                        position: {
                                            start: position.start,
                                            end: position.end
                                        },
                                        metadata: {
                                            documentId: docId,
                                            documentName: documentNames[docId],
                                            vectorIndex: vecIdx,
                                            totalVectors: chunkPositions.length
                                        }
                                    });
                                }
                                
                                console.log(`Processed batch ${batchStart/BATCH_SIZE + 1}/${Math.ceil(chunkPositions.length/BATCH_SIZE)}`);
                                
                            } catch (embError) {
                                console.error(`Failed to generate embeddings for batch starting at ${batchStart}:`, embError);
                                
                                // Fallback: try individual embeddings for this batch
                                for (let i = 0; i < batchPositions.length; i++) {
                                    const vectorIdx = batchStart + i;
                                    const position = batchPositions[i];
                                    const text = content.substring(position.start, position.end);
                                    
                                    try {
                                        const embedding = await window.VectorRAGService.generateQueryEmbedding(
                                            text, 
                                            apiKey, 
                                            baseUrl, 
                                            settings.embeddingModel
                                        );
                                        
                                        vectorIndex.push({
                                            id: `${docId}_vec_${vectorIdx}`,
                                            embedding: embedding,
                                            position: {
                                                start: position.start,
                                                end: position.end
                                            },
                                            metadata: {
                                                documentId: docId,
                                                documentName: documentNames[docId],
                                                vectorIndex: vectorIdx,
                                                totalVectors: chunkPositions.length
                                            }
                                        });
                                    } catch (singleError) {
                                        // Skip this vector on error
                                        console.error(`Failed to generate embedding for position ${position.start}-${position.end}:`, singleError);
                                    }
                                }
                            }
                        }
                    } else {
                        // This should not happen since we check for API key at the beginning
                        console.error('No API key available - cannot create vector index');
                        throw new Error('API key is required for indexing');
                    }
                    
                    // Create index data structure with vectors only (no content)
                    const indexData = {
                        name: documentNames[docId],
                        documentId: docId,
                        title: documentNames[docId],
                        vectors: vectorIndex,  // Changed from chunks to vectors
                        // Store document reference for content retrieval
                        documentSource: `${docId}_content`,  // Reference to get content when needed
                        metadata: {
                            totalVectors: vectorIndex.length,
                            chunkSize: settings.chunkSize,
                            overlap: settings.overlap,
                            embeddingModel: settings.embeddingModel,
                            hasEmbeddings: apiKey ? true : false,
                            indexedAt: new Date().toISOString()
                        }
                    };
                    
                    // Store vectors in memory instead of localStorage
                    // This avoids all storage quota issues
                    vectorStore.setVectors(docId, vectorIndex, {
                        name: documentNames[docId],
                        documentId: docId,
                        title: documentNames[docId],
                        chunkSize: settings.chunkSize,
                        overlap: settings.overlap,
                        embeddingModel: settings.embeddingModel,
                        hasEmbeddings: apiKey ? true : false,
                        indexedAt: new Date().toISOString(),
                        totalVectors: vectorIndex.length
                    });
                    
                    console.log(`Stored ${vectorIndex.length} vectors for ${docId} in memory`);
                    
                    // Store only minimal metadata in localStorage (just for persistence indicator)
                    const euDocsKey = 'rag_eu_documents_index';
                    let existingDocs = {};
                    try {
                        const existing = CoreStorageService.getValue(euDocsKey);
                        if (existing && typeof existing === 'object') {
                            existingDocs = existing;
                        }
                    } catch (e) {
                        console.log('No existing EU docs index');
                    }
                    
                    // Store only a minimal reference in localStorage
                    existingDocs[docId] = {
                        name: documentNames[docId],
                        documentId: docId,
                        hasVectors: true,  // Vectors are in memory
                        enabled: true,     // Enable for search after indexing
                        vectorCount: vectorIndex.length,
                        indexedAt: new Date().toISOString()
                    };
                    CoreStorageService.setValue(euDocsKey, existingDocs);
                    
                    // Also update user bundles for compatibility (store reference only, not full data)
                    if (window.VectorRAGService) {
                        // Load existing bundles
                        let existingBundles = [];
                        const currentBundles = window.VectorRAGService.getUserBundlesIndex ? 
                            window.VectorRAGService.getUserBundlesIndex() : null;
                        if (currentBundles && currentBundles.bundles) {
                            existingBundles = currentBundles.bundles.filter(b => b.id !== docId);
                        }
                        
                        // Add this document with reference only (not full indexData to avoid quota issues)
                        existingBundles.push({
                            name: documentNames[docId],
                            id: docId,
                            type: 'regulation',
                            // Don't store the full indexData with vectors - just metadata
                            hasIndex: true,
                            indexReference: `rag_eu_documents_index.${docId}`, // Reference to where the actual data is
                            metadata: {
                                vectorCount: indexData.vectors ? indexData.vectors.length : 0,
                                chunkCount: indexData.metadata?.totalVectors || 0,
                                indexedAt: indexData.metadata?.indexedAt || new Date().toISOString(),
                                hasEmbeddings: indexData.metadata?.hasEmbeddings || false,
                                embeddingModel: indexData.metadata?.embeddingModel || 'text-embedding-3-small'
                            }
                        });
                        
                        window.VectorRAGService.setUserBundlesIndex({
                            bundles: existingBundles
                        });
                    }
                    
                    // Update settings with vector count
                    const updatedSettings = { 
                        ...settings, 
                        vectors: vectorIndex.length, 
                        chunks: chunkPositions.length,  // Keep for backward compatibility
                        lastIndexed: new Date().toLocaleString() 
                    };
                    const settingsKey = `rag_document_settings_${docId}`;
                    CoreStorageService.setValue(settingsKey, updatedSettings);
                    
                    console.log(`${documentNames[docId]} indexed: ${vectorIndex.length} vectors created`);
                }
            }
            
            // Update UI
            if (statusElement) {
                statusElement.textContent = 'Indexed';
                statusElement.classList.remove('indexing');
                statusElement.classList.add('indexed');
            }
            
            // Update checkbox state
            const checkbox = document.getElementById(`rag-doc-${docId}`);
            if (checkbox) checkbox.checked = true;
            
            // Update all components
            updateAllComponents();
            
            // Show success message
            if (window.RAGModalManager && window.RAGModalManager.showSuccess) {
                window.RAGModalManager.showSuccess(`${documentNames[docId]} has been re-indexed successfully`);
            }
            
        } catch (error) {
            console.error(`Failed to refresh ${documentNames[docId]}:`, error);
            
            // Reset status
            if (statusElement) {
                statusElement.textContent = 'Error';
                statusElement.classList.remove('indexing');
            }
            
            alert(`Failed to refresh ${documentNames[docId]}. Check console for details.`);
        }
    }

    /**
     * Open document settings modal
     * @param {string} docId - Document ID (e.g., 'cra', 'aia', 'dora')
     */
    function openDocumentSettings(docId) {
        const documentNames = {
            'cra': 'CRA (Cyber Resilience Act)',
            'aia': 'AIA (AI Act)',
            'dora': 'DORA (Digital Operational Resilience Act)'
        };

        const modal = document.getElementById('rag-document-settings-modal');
        const titleElement = document.getElementById('rag-settings-title');
        const docIdInput = document.getElementById('rag-settings-doc-id');
        const chunkSizeInput = document.getElementById('rag-chunk-size');
        const overlapInput = document.getElementById('rag-chunk-overlap');
        const embeddingModelSelect = document.getElementById('rag-embedding-model');
        const chunkCountElement = document.getElementById('rag-settings-chunk-count');
        const lastIndexedElement = document.getElementById('rag-settings-last-indexed');

        if (!modal || !documentNames[docId]) {
            console.warn('RAGCoordinator: Settings modal not found or unknown document:', docId);
            return;
        }

        // Set title
        if (titleElement) {
            titleElement.textContent = `${documentNames[docId]} Settings`;
        }

        // Store document ID
        if (docIdInput) {
            docIdInput.value = docId;
        }

        // Load current settings
        const settings = getDocumentSettings(docId);
        
        if (chunkSizeInput) {
            chunkSizeInput.value = settings.chunkSize || 512;
        }
        
        if (overlapInput) {
            overlapInput.value = settings.overlap || 10;
        }
        
        if (embeddingModelSelect) {
            embeddingModelSelect.value = settings.embeddingModel || 'text-embedding-3-small';
        }
        
        if (chunkCountElement) {
            chunkCountElement.textContent = settings.chunks || '0';
        }
        
        if (lastIndexedElement) {
            lastIndexedElement.textContent = settings.lastIndexed || 'Never';
        }

        // Show modal
        modal.classList.add('active');
    }

    /**
     * Close document settings modal
     */
    function closeDocumentSettings() {
        const modal = document.getElementById('rag-document-settings-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Save document settings from modal
     */
    function saveDocumentSettings() {
        const docIdInput = document.getElementById('rag-settings-doc-id');
        const chunkSizeInput = document.getElementById('rag-chunk-size');
        const overlapInput = document.getElementById('rag-chunk-overlap');
        const embeddingModelSelect = document.getElementById('rag-embedding-model');
        
        if (!docIdInput || !docIdInput.value) {
            console.error('RAGCoordinator: No document ID found');
            return;
        }
        
        const docId = docIdInput.value;
        const settings = {
            chunkSize: parseInt(chunkSizeInput?.value || 512),
            overlap: parseInt(overlapInput?.value || 10),
            embeddingModel: embeddingModelSelect?.value || 'text-embedding-3-small',
            lastUpdated: new Date().toISOString()
        };
        
        // Save settings to storage using CoreStorageService
        const storageKey = `rag_document_settings_${docId}`;
        CoreStorageService.setValue(storageKey, settings);
        
        console.log(`RAGCoordinator: Saved settings for ${docId}:`, settings);
        
        // Close modal
        closeDocumentSettings();
        
        // Show success message
        if (window.RAGModalManager && window.RAGModalManager.showSuccess) {
            window.RAGModalManager.showSuccess('Document settings saved successfully');
        }
    }

    /**
     * Close document viewer modal
     */
    function closeDocumentViewer() {
        const modal = document.getElementById('rag-document-viewer-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Get document settings
     * @param {string} docId - Document ID
     * @returns {Object} Document settings
     */
    function getDocumentSettings(docId) {
        const storageKey = `rag_document_settings_${docId}`;
        const settings = CoreStorageService.getValue(storageKey) || {};
        
        // Default settings
        return {
            chunkSize: settings.chunkSize || 512,
            overlap: settings.overlap || 10,
            embeddingModel: settings.embeddingModel || 'text-embedding-3-small',
            chunks: settings.chunks || 0,
            lastIndexed: settings.lastIndexed || 'Never',
            ...settings
        };
    }

    /**
     * Get CRA document content
     * @returns {string} Document content
     */
    function getCRADocumentContent() {
        // First try to get from the global variable
        if (window.euRegulationCraData) {
            return window.euRegulationCraData.content || window.euRegulationCraData.text || '';
        }
        
        // Fallback to regulations service
        if (window.ragRegulationsService) {
            const stats = window.ragRegulationsService.getStatistics();
            if (stats && stats.regulationCount > 0) {
                const regulations = window.ragRegulationsService.getAllRegulations ? 
                    window.ragRegulationsService.getAllRegulations() : [];
                return regulations.map(reg => `## ${reg.title || reg.id}\n\n${reg.content || reg.description}`).join('\n\n');
            }
        }
        return null;
    }

    /**
     * Get AIA document content
     * @returns {string} Document content
     */
    function getAIADocumentContent() {
        // Get from the global variable
        if (window.euRegulationAiActData) {
            return window.euRegulationAiActData.content || window.euRegulationAiActData.text || '';
        }
        return null;
    }

    /**
     * Get DORA document content
     * @returns {string} Document content
     */
    function getDORADocumentContent() {
        // Get from the global variable
        if (window.euRegulationDoraData) {
            return window.euRegulationDoraData.content || window.euRegulationDoraData.text || '';
        }
        return null;
    }

    /**
     * Render document with chunk boundaries
     * @param {string} content - Document content
     * @param {string} docId - Document ID
     * @returns {string} HTML with chunk boundaries
     */
    function renderDocumentWithChunks(content, docId) {
        const settings = getDocumentSettings(docId);
        const chunks = chunkDocument(content, settings.chunkSize, settings.overlap);
        
        // Store chunk count in settings
        const updatedSettings = { 
            ...settings, 
            chunks: chunks.length,
            lastViewed: new Date().toLocaleString()
        };
        const storageKey = `rag_document_settings_${docId}`;
        CoreStorageService.setValue(storageKey, updatedSettings);
        
        // Convert markdown to HTML with marked if available
        const renderMarkdown = (text) => {
            if (window.marked) {
                return marked.parse(text);
            }
            // Fallback: basic markdown conversion
            return text
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^\* (.*$)/gim, '<li>$1</li>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^/g, '<p>')
                .replace(/$/g, '</p>');
        };
        
        let html = '<div class="rag-document-chunks">';
        
        // Add document summary
        html += `
            <div class="rag-document-summary">
                <p><strong>Total chunks:</strong> ${chunks.length}</p>
                <p><strong>Chunk size:</strong> ${settings.chunkSize} tokens</p>
                <p><strong>Overlap:</strong> ${settings.overlap}%</p>
                <p><strong>Total characters:</strong> ${content.length.toLocaleString()}</p>
            </div>
        `;
        
        // Render all chunks with visual separation
        chunks.forEach((chunk, index) => {
            const isOverlapRegion = index > 0;
            html += `
                <div class="rag-chunk" data-chunk-index="${index}">
                    <div class="rag-chunk-header">
                        <span>Chunk ${index + 1} of ${chunks.length}</span>
                        <span class="rag-chunk-size">${chunk.length} chars</span>
                    </div>
                    ${isOverlapRegion ? '<div class="rag-chunk-overlap-indicator">↑ Overlap region ↑</div>' : ''}
                    <div class="rag-chunk-content">
                        ${renderMarkdown(chunk)}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        return html;
    }

    /**
     * Calculate chunk positions without storing the actual chunks
     * @param {string} content - Document content
     * @param {number} chunkSize - Size of each chunk in tokens (approx)
     * @param {number} overlapPercent - Percentage overlap between chunks
     * @returns {Array<{start: number, end: number}>} Array of position objects
     */
    function calculateChunkPositions(content, chunkSize = 512, overlapPercent = 10) {
        if (!content) return [];
        
        // Approximate tokens as characters/4
        const charsPerChunk = chunkSize * 4;
        const overlapChars = Math.floor(charsPerChunk * (overlapPercent / 100));
        
        const positions = [];
        let start = 0;
        
        while (start < content.length) {
            let end = start + charsPerChunk;
            
            // Try to break at sentence or paragraph boundary
            if (end < content.length) {
                const nextPeriod = content.indexOf('.', end);
                const nextNewline = content.indexOf('\n', end);
                
                if (nextPeriod > 0 && nextPeriod < end + 100) {
                    end = nextPeriod + 1;
                } else if (nextNewline > 0 && nextNewline < end + 100) {
                    end = nextNewline + 1;
                }
            }
            
            positions.push({
                start: start,
                end: Math.min(end, content.length)
            });
            start = end - overlapChars;
        }
        
        return positions;
    }

    /**
     * Chunk document into smaller pieces (legacy function for compatibility)
     * @param {string} content - Document content
     * @param {number} chunkSize - Size of each chunk in tokens (approximated)
     * @param {number} overlapPercent - Percentage of overlap between chunks
     * @returns {Array<string>} Array of document chunks
     */
    function chunkDocument(content, chunkSize = 512, overlapPercent = 10) {
        const positions = calculateChunkPositions(content, chunkSize, overlapPercent);
        return positions.map(pos => content.substring(pos.start, pos.end));
    }

    /**
     * Escape HTML for safe rendering
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Toggle advanced section visibility
     */
    function toggleAdvanced() {
        const content = document.getElementById('rag-advanced-content');
        const toggle = document.getElementById('rag-advanced-toggle');
        
        if (content && toggle) {
            if (content.style.display === 'none' || !content.style.display) {
                content.style.display = 'block';
                toggle.classList.remove('fa-chevron-right');
                toggle.classList.add('fa-chevron-down');
                console.log('RAGCoordinator: Advanced section expanded');
            } else {
                content.style.display = 'none';
                toggle.classList.remove('fa-chevron-down');
                toggle.classList.add('fa-chevron-right');
                console.log('RAGCoordinator: Advanced section collapsed');
            }
        }
    }

    // Public API - maintaining compatibility with existing code
    return {
        init,
        showRAGModal,
        hideRAGModal,
        getStatus,
        copyResultToClipboard,
        useResultInChat,
        updateUI,
        removeUserBundle,
        removeFile,
        isRAGEnabled,
        getRAGEnabledState,
        setRAGEnabledState,
        refreshData,
        viewDocument,
        refreshDocument,
        openDocumentSettings,
        closeDocumentSettings,
        saveDocumentSettings,
        closeDocumentViewer,
        toggleAdvanced,
        checkDocumentIndexed,
        getAIADocumentContent,
        getCRADocumentContent,
        getDORADocumentContent,
        
        // Additional methods for component coordination
        updateAllComponents,
        initializeSubComponents
    };
})();

// Maintain backward compatibility
window.RAGManager = window.RAGCoordinator;