/**
 * RAG Search Manager
 * Handles RAG search functionality, results display, and search interactions
 */

window.RAGSearchManager = (function() {
    
    let isInitialized = false;

    /**
     * Initialize the RAG Search Manager
     */
    function init() {
        if (isInitialized) {
            return;
        }

        setupEventListeners();
        isInitialized = true;
        console.log('RAGSearchManager: Initialized successfully');
    }

    /**
     * Set up event listeners for search functionality
     */
    function setupEventListeners() {
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
        
        // Multi-query toggle
        const multiQueryCheckbox = document.getElementById('rag-multi-query-enabled');
        const expansionModelGroup = document.getElementById('rag-expansion-model-group');
        if (multiQueryCheckbox && expansionModelGroup) {
            multiQueryCheckbox.addEventListener('change', (e) => {
                expansionModelGroup.style.display = e.target.checked ? 'block' : 'none';
            });
            
            // Set initial state
            expansionModelGroup.style.display = multiQueryCheckbox.checked ? 'block' : 'none';
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
        const tokenLimitInput = document.getElementById('rag-token-limit');
        const tokenLimit = parseInt(tokenLimitInput?.value || '5000');
        const multiQueryEnabled = document.getElementById('rag-multi-query-enabled')?.checked ?? true;
        const expansionModelSelect = document.getElementById('rag-expansion-model');
        let expansionModel = expansionModelSelect?.value || 
            (window.DefaultModelsConfig ? window.DefaultModelsConfig.DEFAULT_RAG_EXPANSION_MODEL : 'gpt-5-nano');
        
        // If "current" is selected, use the current chat model
        if (expansionModel === 'current') {
            expansionModel = StorageService.getSelectedModel() || 
                (window.DefaultModelsConfig ? window.DefaultModelsConfig.DEFAULT_RAG_EXPANSION_MODEL : 'gpt-5-nano');
        }
        
        const apiKey = StorageService.getApiKey();
        const baseUrl = StorageService.getBaseUrl();

        // Check if API key is available
        if (!apiKey) {
            // Show API key prompt
            if (confirm('RAG search requires an API key to generate embeddings.\n\nWould you like to configure your API key now?')) {
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

        // Check if we have any embeddings indexed
        const stats = VectorRAGService.getIndexStats();
        const hasEmbeddings = (stats.defaultPrompts.available && stats.defaultPrompts.chunks > 0) || 
                              (stats.userBundles.available && stats.userBundles.totalChunks > 0);
        
        if (!hasEmbeddings) {
            showError('No embeddings found in the knowledge base.\n\nPlease index some documents first by checking them in the RAG modal and clicking the refresh button.\n\nNote: Embeddings are stored in memory only and need to be re-indexed after page reload.');
            return;
        }

        try {
            showProgress('Searching knowledge base...', 50);
            
            const searchResults = await VectorRAGService.search(query, {
                maxResults: maxResults,
                tokenLimit: tokenLimit,
                threshold: 0.3,
                useTextFallback: false,  // Disable text fallback
                apiKey: apiKey,
                baseUrl: baseUrl,
                useMultiQuery: multiQueryEnabled,
                expansionModel: expansionModel
            });

            displaySearchResults(searchResults);
            
        } catch (error) {
            console.error('RAGSearchManager: Search error:', error);
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

        const gapFilledCount = searchResults.metadata.gapFilledChunks || 0;
        const resultsHTML = `
            <div class="rag-search-header">
                <div class="rag-search-summary">
                    Found ${searchResults.results.length} relevant chunks for "${searchResults.query}"
                    ${gapFilledCount > 0 ? `(includes ${gapFilledCount} gap-filler chunks for coherence)` : ''}
                    <br><small>Token limit: ${searchResults.metadata.tokenLimit}, Search type: ${searchResults.metadata.searchType}</small>
                </div>
            </div>
            <div class="rag-results-list">
                ${searchResults.results.map((result, index) => `
                    <div class="rag-result-item${result.isGapFiller ? ' gap-filler' : ''}">
                        <div class="rag-result-header">
                            <span class="rag-result-source">
                                ${result.promptName || result.fileName || result.bundleName || result.documentName || 'Unknown Source'}
                                ${result.isGapFiller ? ' [Gap-filler]' : ''}
                            </span>
                            <span class="rag-result-score">
                                ${(result.similarity * 100).toFixed(1)}% match
                            </span>
                        </div>
                        <div class="rag-result-content">
                            ${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}
                        </div>
                        <div class="rag-result-actions">
                            <button type="button" class="btn secondary-btn" onclick="RAGSearchManager.copyResultToClipboard(${index})">
                                Copy
                            </button>
                            <button type="button" class="btn secondary-btn" onclick="RAGSearchManager.useResultInChat(${index})">
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
                
                // Hide modal
                if (window.RAGModalManager) {
                    window.RAGModalManager.hideModal();
                }
            }
        }
    }

    /**
     * Show progress indicator
     * @param {string} message - Progress message
     * @param {number} progress - Progress percentage (0-100)
     */
    function showProgress(message, progress) {
        console.log(`Progress: ${progress}% - ${message}`);
    }

    /**
     * Hide progress indicator
     */
    function hideProgress() {
        console.log('Progress hidden');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        console.error('RAGSearchManager Error:', message);
        if (showError.lastMessage === message && Date.now() - showError.lastTime < 1000) {
            return;
        }
        showError.lastMessage = message;
        showError.lastTime = Date.now();
        alert(`Error: ${message}`);
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        console.log('RAGSearchManager Success:', message);
        if (showSuccess.lastMessage === message && Date.now() - showSuccess.lastTime < 1000) {
            return;
        }
        showSuccess.lastMessage = message;
        showSuccess.lastTime = Date.now();
        alert(`Success: ${message}`);
    }

    // Public API
    return {
        init,
        performSearch,
        clearSearch,
        displaySearchResults,
        copyResultToClipboard,
        useResultInChat,
        updateSearchButtonState
    };
})();