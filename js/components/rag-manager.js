/**
 * RAG Manager Component
 * Orchestrates the RAG modal and coordinates with RAG services
 */

window.RAGManager = (function() {
    
    let isInitialized = false;
    let elements = {};

    /**
     * Initialize the RAG Manager
     * @param {Object} domElements - DOM elements object
     */
    function init(domElements) {
        if (isInitialized) {
            return;
        }

        elements = domElements;
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize RAG services
        VectorRAGService.initialize();
        
        isInitialized = true;
        console.log('RAGManager: Initialized successfully');
        
        // Load initial data
        updateUI();
    }

    /**
     * Set up event listeners for RAG functionality
     */
    function setupEventListeners() {
        // RAG button click
        if (elements.ragBtn) {
            elements.ragBtn.addEventListener('click', showRAGModal);
        }

        // Close modal
        const closeBtn = document.getElementById('close-rag-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideRAGModal);
        }

        // Generate embeddings button
        const generateBtn = document.getElementById('rag-index-defaults-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateDefaultPromptsEmbeddings);
        }

        // Search functionality
        const searchBtn = document.getElementById('rag-search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }

        const clearSearchBtn = document.getElementById('rag-clear-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', clearSearch);
        }

        const searchInput = document.getElementById('rag-search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
            
            searchInput.addEventListener('input', updateSearchButtonState);
        }

        // Upload bundle button
        const uploadBtn = document.getElementById('rag-upload-bundle-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', uploadBundle);
        }

        // RAG enable/disable checkbox
        const ragEnabledCheckbox = document.getElementById('rag-enabled-checkbox');
        if (ragEnabledCheckbox) {
            ragEnabledCheckbox.addEventListener('change', handleRAGEnabledChange);
            
            // Load initial state
            const isRAGEnabled = getRAGEnabledState();
            ragEnabledCheckbox.checked = isRAGEnabled;
        }

        // Modal click outside to close
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideRAGModal();
                }
            });
        }
    }

    /**
     * Show the RAG modal
     */
    function showRAGModal() {
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.classList.add('active');
            updateUI();
            loadDefaultPromptsList();
        }
    }

    /**
     * Hide the RAG modal
     */
    function hideRAGModal() {
        const modal = document.getElementById('rag-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Update the UI with current state
     */
    function updateUI() {
        updateIndexStats();
        updateButtonStates();
        updateSearchButtonState();
        loadUserBundlesList();
    }

    /**
     * Update index statistics display
     */
    function updateIndexStats() {
        const stats = VectorRAGService.getIndexStats();
        
        // Update default prompts stats
        const defaultChunksEl = document.getElementById('rag-default-chunks');
        const defaultModelEl = document.getElementById('rag-default-model');
        
        if (defaultChunksEl) {
            defaultChunksEl.textContent = `${stats.defaultPrompts.chunks} chunks indexed`;
        }
        
        if (defaultModelEl) {
            defaultModelEl.textContent = stats.defaultPrompts.available 
                ? `Model: ${stats.settings.embeddingModel}`
                : 'No embeddings model';
        }

        // Update user bundles stats
        const userChunksEl = document.getElementById('rag-user-chunks');
        const userFilesEl = document.getElementById('rag-user-files');
        
        if (userChunksEl) {
            userChunksEl.textContent = `${stats.userBundles.totalChunks} chunks available`;
        }
        
        if (userFilesEl) {
            userFilesEl.textContent = `${stats.userBundles.bundles} bundles`;
        }
    }

    /**
     * Update button states based on current conditions
     */
    function updateButtonStates() {
        const apiKey = StorageService.getApiKey();
        const generateBtn = document.getElementById('rag-index-defaults-btn');
        
        if (generateBtn) {
            generateBtn.disabled = !apiKey;
            generateBtn.title = apiKey 
                ? 'Generate embeddings for selected default prompts'
                : 'API key required for embedding generation';
        }
    }

    /**
     * Update search button state
     */
    function updateSearchButtonState() {
        const searchInput = document.getElementById('rag-search-input');
        const searchBtn = document.getElementById('rag-search-btn');
        const stats = VectorRAGService.getIndexStats();
        
        if (searchBtn && searchInput) {
            const hasQuery = searchInput.value.trim().length > 0;
            const hasIndex = stats.defaultPrompts.available || stats.userBundles.available;
            
            searchBtn.disabled = !hasQuery || !hasIndex;
            searchBtn.title = !hasQuery 
                ? 'Enter a search query'
                : !hasIndex 
                    ? 'No knowledge base available - index some prompts first'
                    : 'Search the knowledge base';
        }
    }

    /**
     * Load and display default prompts list
     */
    function loadDefaultPromptsList() {
        const listContainer = document.getElementById('rag-default-prompts-list');
        if (!listContainer) return;

        try {
            const defaultPrompts = DefaultPromptsService.getDefaultPrompts();
            
            if (!defaultPrompts || defaultPrompts.length === 0) {
                listContainer.innerHTML = '<p class="form-help">No default prompts available.</p>';
                return;
            }

            // Get indexed prompts information
            const indexedPrompts = getIndexedPromptsStatus();
            
            const promptsHTML = defaultPrompts.map(prompt => {
                const isSection = prompt.isSection && prompt.items && prompt.items.length > 0;
                const prompts = isSection ? prompt.items : [prompt];
                
                return prompts.map(p => {
                    const indexStatus = indexedPrompts[p.id] || 'not-indexed';
                    const statusBadge = getIndexingStatusBadge(indexStatus);
                    const itemClass = indexStatus === 'indexed' ? 'rag-prompt-item indexed' : 'rag-prompt-item';
                    
                    return `
                        <div class="${itemClass}">
                            <input type="checkbox" 
                                   id="rag-prompt-${p.id}" 
                                   data-prompt-id="${p.id}"
                                   ${DefaultPromptsService.isDefaultPromptSelected(p.id) ? 'checked' : ''}>
                            <label for="rag-prompt-${p.id}">${p.name || p.id}</label>
                            <span class="rag-prompt-meta">
                                ${p.content ? `${Math.round(p.content.length / 4)} tokens` : 'No content'}
                            </span>
                            <div class="rag-indexing-status">
                                ${statusBadge}
                            </div>
                        </div>
                    `;
                }).join('');
            }).join('');

            listContainer.innerHTML = promptsHTML;

            // Add event listeners to checkboxes
            const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', handlePromptSelectionChange);
            });

        } catch (error) {
            console.error('RAGManager: Error loading default prompts list:', error);
            listContainer.innerHTML = '<p class="rag-error">Error loading default prompts.</p>';
        }
    }

    /**
     * Handle prompt selection change
     * @param {Event} e - Change event
     */
    function handlePromptSelectionChange(e) {
        const promptId = e.target.dataset.promptId;
        const isSelected = e.target.checked;
        
        // Update the default prompts service
        DefaultPromptsService.toggleDefaultPromptSelection(promptId);
        
        console.log(`RAGManager: Prompt ${promptId} ${isSelected ? 'selected' : 'deselected'}`);
    }

    /**
     * Load and display user bundles list
     */
    function loadUserBundlesList() {
        const listContainer = document.getElementById('rag-user-bundles-list');
        if (!listContainer) return;

        try {
            const bundleStats = RAGUserBundles.getBundleStats();
            
            if (bundleStats.bundleCount === 0) {
                listContainer.innerHTML = `
                    <div class="empty-bundles-state">
                        <p>No knowledge base bundles loaded. Use the hackare tool to create custom bundles.</p>
                    </div>
                `;
                return;
            }

            // Create bundle display elements
            const bundlesHTML = bundleStats.bundles.map(bundle => {
                return `
                    <div class="rag-bundle-item">
                        <div class="rag-bundle-info">
                            <div class="rag-bundle-name">${bundle.name}</div>
                            <div class="rag-bundle-stats">
                                ${bundle.chunks} chunks from ${bundle.files} files • Model: ${bundle.model}
                            </div>
                        </div>
                        <div class="rag-bundle-actions">
                            <button type="button" class="btn secondary-btn" onclick="RAGManager.removeUserBundle('${bundle.name}')" title="Remove bundle">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            listContainer.innerHTML = bundlesHTML;

        } catch (error) {
            console.error('RAGManager: Error loading user bundles list:', error);
            listContainer.innerHTML = '<p class="rag-error">Error loading user bundles.</p>';
        }
    }

    /**
     * Remove user bundle
     * @param {string} bundleName - Name of bundle to remove
     */
    function removeUserBundle(bundleName) {
        if (!confirm(`Remove bundle "${bundleName}"? This cannot be undone.`)) {
            return;
        }

        try {
            if (RAGUserBundles.removeBundle(bundleName)) {
                showSuccess(`Bundle "${bundleName}" removed successfully`);
                VectorRAGService.reloadIndexes();
                updateUI();
            } else {
                showError('Failed to remove bundle');
            }
        } catch (error) {
            showError(`Failed to remove bundle: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for selected default prompts
     */
    async function generateDefaultPromptsEmbeddings() {
        const generateBtn = document.getElementById('rag-index-defaults-btn');
        const apiKey = StorageService.getApiKey();
        const baseUrl = StorageService.getBaseUrl();
        
        if (!apiKey) {
            showError('API key is required for embedding generation. Please configure your API key in Settings.');
            return;
        }

        // Get selected prompts
        const selectedPrompts = DefaultPromptsService.getSelectedDefaultPrompts();
        if (selectedPrompts.length === 0) {
            showError('Please select at least one default prompt to index.');
            return;
        }

        try {
            // Disable button and show progress
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'Generating...';
            }

            showProgress('Preparing to generate embeddings...', 0);

            // Index the prompts
            const indexData = await RAGIndexingService.indexDefaultPrompts(
                selectedPrompts,
                apiKey,
                baseUrl,
                {
                    chunkSize: 512,
                    chunkOverlap: 50,
                    embeddingModel: 'text-embedding-3-small'
                },
                (progress, message) => {
                    showProgress(message, progress);
                }
            );

            // Save the index
            VectorRAGService.setDefaultPromptsIndex(indexData);
            
            showSuccess(`Successfully generated embeddings for ${selectedPrompts.length} prompts (${indexData.chunks.length} chunks)`);
            updateUI();

        } catch (error) {
            console.error('RAGManager: Error generating embeddings:', error);
            showError(`Failed to generate embeddings: ${error.message}`);
        } finally {
            hideProgress();
            
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Embeddings';
            }
        }
    }

    /**
     * Perform search in knowledge base
     */
    async function performSearch() {
        const searchInput = document.getElementById('rag-search-input');
        const searchLimitSelect = document.getElementById('rag-search-limit');
        
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        if (!query) {
            showError('Please enter a search query.');
            return;
        }

        const maxResults = parseInt(searchLimitSelect?.value || '5');
        const apiKey = StorageService.getApiKey();
        const baseUrl = StorageService.getBaseUrl();

        try {
            showProgress('Searching knowledge base...', 50);
            
            const searchResults = await VectorRAGService.search(query, {
                maxResults: maxResults,
                threshold: 0.3,
                useTextFallback: true,
                apiKey: apiKey,
                baseUrl: baseUrl
            });

            displaySearchResults(searchResults);
            
        } catch (error) {
            console.error('RAGManager: Search error:', error);
            showError(`Search failed: ${error.message}`);
        } finally {
            hideProgress();
        }
    }

    /**
     * Display search results
     * @param {Object} searchResults - Results from VectorRAGService.search
     */
    function displaySearchResults(searchResults) {
        const resultsContainer = document.getElementById('rag-search-results');
        if (!resultsContainer) return;

        if (!searchResults.results || searchResults.results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="rag-search-header">
                    <div class="rag-search-summary">No relevant results found for "${searchResults.query}"</div>
                </div>
            `;
            resultsContainer.style.display = 'block';
            return;
        }

        const resultsHTML = `
            <div class="rag-search-header">
                <div class="rag-search-summary">
                    Found ${searchResults.results.length} relevant results for "${searchResults.query}"
                    (Search type: ${searchResults.metadata.searchType})
                </div>
            </div>
            <div class="rag-results-list">
                ${searchResults.results.map((result, index) => `
                    <div class="rag-result-item">
                        <div class="rag-result-header">
                            <span class="rag-result-source">
                                ${result.promptName || result.fileName || result.bundleName || 'Unknown Source'}
                            </span>
                            <span class="rag-result-score">
                                ${(result.similarity * 100).toFixed(1)}% match
                            </span>
                        </div>
                        <div class="rag-result-content">
                            ${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}
                        </div>
                        <div class="rag-result-actions">
                            <button type="button" class="btn secondary-btn" onclick="RAGManager.copyResultToClipboard(${index})">
                                Copy
                            </button>
                            <button type="button" class="btn secondary-btn" onclick="RAGManager.useResultInChat(${index})">
                                Use in Chat
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.style.display = 'block';
        
        // Store results for action buttons
        resultsContainer._currentResults = searchResults.results;
    }

    /**
     * Clear search results and input
     */
    function clearSearch() {
        const searchInput = document.getElementById('rag-search-input');
        const resultsContainer = document.getElementById('rag-search-results');
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
            delete resultsContainer._currentResults;
        }
        
        updateSearchButtonState();
    }

    /**
     * Copy search result to clipboard
     * @param {number} index - Result index
     */
    function copyResultToClipboard(index) {
        const resultsContainer = document.getElementById('rag-search-results');
        const results = resultsContainer?._currentResults;
        
        if (results && results[index]) {
            navigator.clipboard.writeText(results[index].content).then(() => {
                showSuccess('Content copied to clipboard');
            }).catch(err => {
                showError('Failed to copy to clipboard');
            });
        }
    }

    /**
     * Use search result in chat
     * @param {number} index - Result index
     */
    function useResultInChat(index) {
        const resultsContainer = document.getElementById('rag-search-results');
        const results = resultsContainer?._currentResults;
        
        if (results && results[index]) {
            const result = results[index];
            const messageInput = document.getElementById('message-input');
            
            if (messageInput) {
                const contextText = `Based on this information: "${result.content.substring(0, 200)}..." `;
                messageInput.value = contextText + messageInput.value;
                messageInput.focus();
                hideRAGModal();
            }
        }
    }

    /**
     * Upload bundle functionality
     */
    function uploadBundle() {
        // Create file input for bundle upload
        const fileInput = RAGUserBundles.createBundleFileInput(
            (bundleData) => {
                // Successfully loaded bundle
                try {
                    if (RAGUserBundles.addBundle(bundleData)) {
                        showSuccess(`Successfully loaded bundle "${bundleData.name}" with ${bundleData.chunks.length} chunks`);
                        VectorRAGService.reloadIndexes();
                        updateUI();
                        loadUserBundlesList();
                    } else {
                        showError('Failed to save bundle to storage');
                    }
                } catch (error) {
                    showError(`Failed to add bundle: ${error.message}`);
                }
            },
            (error) => {
                // Error loading bundle
                showError(`Failed to load bundle: ${error.message}`);
            }
        );
        
        // Trigger file selection
        fileInput.click();
    }

    /**
     * Show progress indicator
     * @param {string} message - Progress message
     * @param {number} progress - Progress percentage (0-100)
     */
    function showProgress(message, progress) {
        // Implementation depends on UI design
        console.log(`Progress: ${progress}% - ${message}`);
    }

    /**
     * Hide progress indicator
     */
    function hideProgress() {
        // Implementation depends on UI design
        console.log('Progress hidden');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        console.error('RAGManager Error:', message);
        // You could show a toast notification or modal here
        alert(`Error: ${message}`);
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        console.log('RAGManager Success:', message);
        // You could show a toast notification here
        alert(`Success: ${message}`);
    }

    /**
     * Show warning message
     * @param {string} message - Warning message
     */
    function showWarning(message) {
        console.warn('RAGManager Warning:', message);
        alert(`Warning: ${message}`);
    }

    /**
     * Handle RAG enabled/disabled state change
     * @param {Event} event - Checkbox change event
     */
    function handleRAGEnabledChange(event) {
        const isEnabled = event.target.checked;
        setRAGEnabledState(isEnabled);
        updateUI();
        
        console.log(`RAGManager: RAG ${isEnabled ? 'enabled' : 'disabled'}`);
        
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
        try {
            const stored = localStorage.getItem('rag_enabled');
            return stored !== null ? JSON.parse(stored) : true; // Default to enabled
        } catch (error) {
            console.warn('RAGManager: Error reading RAG enabled state:', error);
            return true;
        }
    }

    /**
     * Set RAG enabled state
     * @param {boolean} enabled - Whether RAG should be enabled
     */
    function setRAGEnabledState(enabled) {
        try {
            localStorage.setItem('rag_enabled', JSON.stringify(enabled));
        } catch (error) {
            console.error('RAGManager: Error saving RAG enabled state:', error);
        }
    }

    /**
     * Check if RAG is currently enabled
     * @returns {boolean} Whether RAG is enabled
     */
    function isRAGEnabled() {
        return getRAGEnabledState();
    }

    /**
     * Get indexing status for all default prompts
     * @returns {Object} Map of prompt IDs to their indexing status
     */
    function getIndexedPromptsStatus() {
        const indexedPrompts = {};
        
        try {
            // Get stored index data
            const storedIndex = RAGStorageService.loadDefaultPromptsIndex();
            
            if (storedIndex && storedIndex.chunks) {
                // Create a map of which prompts are indexed
                storedIndex.chunks.forEach(chunk => {
                    if (chunk.metadata && chunk.metadata.promptId) {
                        indexedPrompts[chunk.metadata.promptId] = 'indexed';
                    }
                });
            }
            
            return indexedPrompts;
        } catch (error) {
            console.warn('RAGManager: Error getting indexed prompts status:', error);
            return {};
        }
    }

    /**
     * Get status badge HTML for indexing status
     * @param {string} status - Indexing status ('indexed', 'not-indexed', 'indexing')
     * @returns {string} Badge HTML
     */
    function getIndexingStatusBadge(status) {
        switch (status) {
            case 'indexed':
                return '<span class="rag-status-badge indexed">✓ Indexed</span>';
            case 'indexing':
                return '<span class="rag-status-badge indexing">⏳ Indexing...</span>';
            case 'not-indexed':
            default:
                return '<span class="rag-status-badge not-indexed">○ Not Indexed</span>';
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

    // Public API
    return {
        init,
        showRAGModal,
        hideRAGModal,
        getStatus,
        copyResultToClipboard,
        useResultInChat,
        updateUI,
        removeUserBundle,
        isRAGEnabled,
        getRAGEnabledState,
        setRAGEnabledState
    };
})();