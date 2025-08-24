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
        
        // Initialize regulations service
        if (window.ragRegulationsService) {
            window.ragRegulationsService.initialize().catch(error => {
                console.warn('Failed to initialize regulations service:', error);
            });
        }
        
        // Migrate legacy localStorage settings to proper storage
        RAGStorageService.migrateLegacyRAGSettings();
        
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
        
        // File upload for Files as Knowledge
        const fileUploadBtn = document.getElementById('rag-file-upload-btn');
        if (fileUploadBtn) {
            fileUploadBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('rag-file-input');
                if (fileInput) fileInput.click();
            });
        }
        
        const fileInput = document.getElementById('rag-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
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
            loadEUDocuments();
            loadDefaultPromptsList();
            loadFilesAsKnowledge();
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
     * Load and display default prompts list with tree structure
     */
    function loadDefaultPromptsList() {
        const listContainer = document.getElementById('rag-default-prompts-list');
        if (!listContainer) return;

        try {
            // Get default prompts
            const defaultPrompts = DefaultPromptsService.getDefaultPrompts();
            
            // Get user prompts (including file-originated ones)
            const userPrompts = window.PromptsService ? window.PromptsService.getPrompts() : [];
            
            // Get indexed prompts information
            const indexedPrompts = getIndexedPromptsStatus();
            
            // Create tree structure HTML
            const treeHTML = createTreeStructure(defaultPrompts, userPrompts, indexedPrompts);
            
            listContainer.innerHTML = treeHTML;

            // Setup tree event handlers
            setupTreeHandlers();
            
            // Add event listeners to checkboxes
            const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', handlePromptSelectionChange);
            });

        } catch (error) {
            console.error('RAGManager: Error loading prompts list:', error);
            listContainer.innerHTML = '<p class="rag-error">Error loading prompts.</p>';
        }
    }

    /**
     * Create tree structure HTML for prompts
     */
    function createTreeStructure(defaultPrompts, userPrompts, indexedPrompts) {
        let html = '';
        
        // Create root node "Prompts as Knowledge"
        html += `
            <div class="rag-tree-root">
                <div class="rag-tree-header" data-section="prompts-root">
                    <span class="rag-tree-toggle expanded">▼</span>
                    <span class="rag-tree-title">Prompts as Knowledge</span>
                </div>
                <div class="rag-tree-content expanded">
        `;
        
        // Add Default Prompts section
        if (defaultPrompts && defaultPrompts.length > 0) {
            html += `
                <div class="rag-tree-section">
                    <div class="rag-tree-header rag-tree-subsection" data-section="default-prompts">
                        <span class="rag-tree-toggle expanded">▼</span>
                        <span class="rag-tree-title">Default Prompts</span>
                    </div>
                    <div class="rag-tree-content expanded">
            `;
            
            // Group prompts by category
            const promptsByCategory = {};
            defaultPrompts.forEach(prompt => {
                const category = prompt.category || 'Other';
                if (!promptsByCategory[category]) {
                    promptsByCategory[category] = [];
                }
                
                // Handle sections with nested items
                if (prompt.isSection && prompt.items) {
                    promptsByCategory[category].push(...prompt.items);
                } else {
                    promptsByCategory[category].push(prompt);
                }
            });
            
            // Create category sections
            Object.keys(promptsByCategory).sort().forEach(category => {
                html += `
                    <div class="rag-tree-category">
                        <div class="rag-tree-header rag-tree-category-header" data-section="category-${category}">
                            <span class="rag-tree-toggle">▶</span>
                            <span class="rag-tree-title">${category}</span>
                        </div>
                        <div class="rag-tree-content">
                `;
                
                promptsByCategory[category].forEach(prompt => {
                    const indexStatus = indexedPrompts[prompt.id] || 'not-indexed';
                    const statusBadge = getIndexingStatusBadge(indexStatus);
                    const itemClass = indexStatus === 'indexed' ? 'rag-prompt-item indexed' : 'rag-prompt-item';
                    
                    html += `
                        <div class="${itemClass}">
                            <input type="checkbox" 
                                   id="rag-prompt-${prompt.id}" 
                                   data-prompt-id="${prompt.id}"
                                   data-prompt-type="default"
                                   ${RAGStorageService.isRAGPromptSelected(prompt.id) ? 'checked' : ''}>
                            <label for="rag-prompt-${prompt.id}">
                                ${getFileIcon(prompt.name)} ${prompt.name || prompt.id}
                            </label>
                            <span class="rag-prompt-meta">
                                ${prompt.content ? `${Math.round(prompt.content.length / 4)} tokens` : 'No content'}
                            </span>
                            <div class="rag-indexing-status">
                                ${statusBadge}
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add EU Regulations section
        if (window.ragRegulationsService && window.ragRegulationsService.isReady()) {
            const regulations = window.ragRegulationsService.getAvailableRegulations();
            
            if (regulations && regulations.length > 0) {
                html += `
                    <div class="rag-tree-section">
                        <div class="rag-tree-header rag-tree-subsection" data-section="regulations">
                            <span class="rag-tree-toggle expanded">▼</span>
                            <span class="rag-tree-title">EU Regulations</span>
                        </div>
                        <div class="rag-tree-content expanded">
                `;
                
                regulations.forEach(regulation => {
                    const indexStatus = indexedPrompts[`regulation_${regulation.id}`] || 'not-indexed';
                    const statusBadge = getIndexingStatusBadge(indexStatus);
                    const itemClass = indexStatus === 'indexed' ? 'rag-prompt-item indexed' : 'rag-prompt-item';
                    
                    html += `
                        <div class="${itemClass}">
                            <input type="checkbox" 
                                   id="rag-regulation-${regulation.id}" 
                                   data-regulation-id="${regulation.id}"
                                   data-prompt-type="regulation"
                                   ${RAGStorageService.isRAGPromptSelected(`regulation_${regulation.id}`) ? 'checked' : ''}>
                            <label for="rag-regulation-${regulation.id}">
                                📋 ${regulation.name}
                            </label>
                            <span class="rag-prompt-meta">
                                ${regulation.regulationNumber} • ${Math.round(regulation.contentLength / 4)} tokens
                            </span>
                            <div class="rag-indexing-status">
                                ${statusBadge}
                            </div>
                            <div class="rag-item-actions">
                                <button type="button" class="btn icon-btn" 
                                        onclick="RAGManager.viewDocument('regulation_${regulation.id}')"
                                        title="View full regulation document">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        }
        
        // Add User-Defined Prompts section
        html += `
                <div class="rag-tree-section">
                    <div class="rag-tree-header rag-tree-subsection" data-section="user-prompts">
                        <span class="rag-tree-toggle expanded">▼</span>
                        <span class="rag-tree-title">User-Defined Prompts</span>
                    </div>
                    <div class="rag-tree-content expanded">
        `;
        
        if (userPrompts && userPrompts.length > 0) {
            userPrompts.forEach(prompt => {
                const indexStatus = indexedPrompts[prompt.id] || 'not-indexed';
                const statusBadge = getIndexingStatusBadge(indexStatus);
                const itemClass = indexStatus === 'indexed' ? 'rag-prompt-item indexed' : 'rag-prompt-item';
                const isFilePrompt = prompt.isFilePrompt;
                
                html += `
                    <div class="${itemClass}${isFilePrompt ? ' file-prompt-item' : ''}">
                        <input type="checkbox" 
                               id="rag-prompt-${prompt.id}" 
                               data-prompt-id="${prompt.id}"
                               data-prompt-type="user"
                               ${RAGStorageService.isRAGPromptSelected(prompt.id) ? 'checked' : ''}>
                        <label for="rag-prompt-${prompt.id}">
                            ${getFileIcon(isFilePrompt ? prompt.fileName : prompt.name)} ${prompt.name}
                        </label>
                        <span class="rag-prompt-meta">
                            ${prompt.content ? `${Math.round(prompt.content.length / 4)} tokens` : 'No content'}
                            ${isFilePrompt ? ` • ${Math.round(prompt.fileSize / 1024)}KB file` : ''}
                        </span>
                        <div class="rag-indexing-status">
                            ${statusBadge}
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div class="rag-empty-message">No user-defined prompts</div>';
        }
        
        html += `
                    </div>
                </div>
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Get file icon for a filename
     */
    function getFileIcon(filename) {
        if (!filename) return '';
        
        // Check if we can use the PromptsModalRenderer function
        if (window.PromptsModalRenderer && typeof window.PromptsModalRenderer.getFileIcon === 'function') {
            const iconClass = window.PromptsModalRenderer.getFileIcon(filename);
            return `<i class="${iconClass}" style="margin-right: 6px; opacity: 0.7;"></i>`;
        }
        
        // Fallback to emoji icons
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'txt': '📄',
            'md': '📝',
            'pdf': '📑',
            'doc': '📃',
            'docx': '📃',
            'json': '📊',
            'xml': '📋',
            'csv': '📊',
            'html': '🌐',
            'js': '📜',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'sh': '🖥️',
            'sql': '🗄️'
        };
        return icons[ext] || '';
    }

    /**
     * Setup tree expand/collapse handlers
     */
    function setupTreeHandlers() {
        const headers = document.querySelectorAll('.rag-tree-header');
        
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking on checkbox or label
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
                    return;
                }
                
                const toggle = header.querySelector('.rag-tree-toggle');
                const content = header.nextElementSibling;
                
                if (toggle && content && content.classList.contains('rag-tree-content')) {
                    const isExpanded = content.classList.contains('expanded');
                    
                    if (isExpanded) {
                        content.classList.remove('expanded');
                        toggle.textContent = '▶';
                        toggle.classList.remove('expanded');
                    } else {
                        content.classList.add('expanded');
                        toggle.textContent = '▼';
                        toggle.classList.add('expanded');
                    }
                }
            });
        });
    }

    /**
     * Handle prompt selection change
     * @param {Event} e - Change event
     */
    function handlePromptSelectionChange(e) {
        const promptId = e.target.dataset.promptId;
        const regulationId = e.target.dataset.regulationId;
        const isSelected = e.target.checked;
        
        if (regulationId) {
            // Handle regulation selection
            const regulationItemId = `regulation_${regulationId}`;
            RAGStorageService.toggleRAGPromptSelection(regulationItemId);
            console.log(`RAGManager: EU regulation ${regulationId} ${isSelected ? 'selected' : 'deselected'} for indexing`);
        } else if (promptId) {
            // Handle prompt selection
            RAGStorageService.toggleRAGPromptSelection(promptId);
            console.log(`RAGManager: RAG prompt ${promptId} ${isSelected ? 'selected' : 'deselected'} for indexing`);
        }
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
     * Generate embeddings for selected prompts (default and user prompts)
     */
    async function generateDefaultPromptsEmbeddings() {
        const generateBtn = document.getElementById('rag-index-defaults-btn');
        const apiKey = StorageService.getApiKey();
        const baseUrl = StorageService.getBaseUrl();
        
        if (!apiKey) {
            showError('API key is required for embedding generation. Please configure your API key in Settings.');
            return;
        }

        // Get selected prompts for RAG indexing (separate from default prompts modal)
        const selectedRAGPromptIds = RAGStorageService.getSelectedRAGPrompts();
        if (selectedRAGPromptIds.length === 0) {
            showError('Please select at least one prompt to index for RAG.');
            return;
        }

        // Get the actual prompt objects from both default and user prompts services
        const allDefaultPrompts = DefaultPromptsService.getDefaultPrompts();
        const allUserPrompts = window.PromptsService ? window.PromptsService.getPrompts() : [];
        const selectedPrompts = [];
        
        // Collect default prompts that match the selected IDs (including nested ones)
        allDefaultPrompts.forEach(prompt => {
            if (selectedRAGPromptIds.includes(prompt.id)) {
                selectedPrompts.push(prompt);
            }
            
            // Check nested items in sections
            if (prompt.isSection && prompt.items && prompt.items.length > 0) {
                prompt.items.forEach(nestedPrompt => {
                    if (selectedRAGPromptIds.includes(nestedPrompt.id)) {
                        // If the content is a function, evaluate it
                        if (nestedPrompt.id === 'function-library' && 
                            window.FunctionLibraryPrompt && 
                            typeof window.FunctionLibraryPrompt.content === 'function') {
                            selectedPrompts.push({
                                ...nestedPrompt,
                                content: window.FunctionLibraryPrompt.content()
                            });
                        } else {
                            selectedPrompts.push(nestedPrompt);
                        }
                    }
                });
            }
        });
        
        // Collect user prompts (including file-originated ones) that match the selected IDs
        allUserPrompts.forEach(prompt => {
            if (selectedRAGPromptIds.includes(prompt.id)) {
                selectedPrompts.push(prompt);
            }
        });

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
        // Prevent multiple alerts by debouncing
        if (showError.lastMessage === message && Date.now() - showError.lastTime < 1000) {
            return; // Skip if same message shown within 1 second
        }
        showError.lastMessage = message;
        showError.lastTime = Date.now();
        
        // You could show a toast notification or modal here
        alert(`Error: ${message}`);
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        console.log('RAGManager Success:', message);
        // Prevent multiple alerts by debouncing
        if (showSuccess.lastMessage === message && Date.now() - showSuccess.lastTime < 1000) {
            return; // Skip if same message shown within 1 second
        }
        showSuccess.lastMessage = message;
        showSuccess.lastTime = Date.now();
        
        // You could show a toast notification here instead of alert
        alert(`Success: ${message}`);
    }

    /**
     * Show warning message
     * @param {string} message - Warning message
     */
    function showWarning(message) {
        console.warn('RAGManager Warning:', message);
        // Prevent multiple alerts by debouncing
        if (showWarning.lastMessage === message && Date.now() - showWarning.lastTime < 1000) {
            return; // Skip if same message shown within 1 second
        }
        showWarning.lastMessage = message;
        showWarning.lastTime = Date.now();
        
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
     * Check if RAG is currently enabled
     * @returns {boolean} Whether RAG is enabled
     */
    function isRAGEnabled() {
        return RAGStorageService.isRAGEnabled();
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
    
    /**
     * Handle file upload for Files as Knowledge
     * @param {Event} event - File input change event
     */
    async function handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        for (const file of files) {
            try {
                showProgress(`Processing ${file.name}...`, 0);
                
                // Read file content
                const content = await readFileContent(file);
                
                // Process content based on file type
                const processedContent = await processFileContent(file, content);
                
                // Store as RAG file knowledge
                storeFileAsKnowledge(file.name, processedContent, file.size);
                
                showSuccess(`Added ${file.name} to knowledge base`);
            } catch (error) {
                console.error('RAGManager: Error processing file:', error);
                showError(`Failed to process ${file.name}: ${error.message}`);
            }
        }
        
        // Clear the input
        event.target.value = '';
        
        // Reload the files list
        loadFilesAsKnowledge();
        hideProgress();
    }
    
    /**
     * Read file content
     * @param {File} file - File to read
     * @returns {Promise<string>} File content
     */
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = (e) => {
                reject(new Error('Failed to read file'));
            };
            
            // Read as text for most files
            if (file.type === 'application/pdf') {
                // For PDFs, we'd need to use a PDF library to extract text
                // For now, we'll just read as text and show a warning
                reader.readAsText(file);
                showWarning('PDF text extraction is basic - consider using plain text files for better results');
            } else {
                reader.readAsText(file);
            }
        });
    }
    
    /**
     * Process file content based on type
     * @param {File} file - Original file
     * @param {string} content - Raw file content
     * @returns {Promise<string>} Processed content
     */
    async function processFileContent(file, content) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        // For PDFs, we'd ideally use a proper PDF parser
        // For now, just return the raw text
        if (extension === 'pdf') {
            // Basic PDF text extraction (very limited)
            // In production, use a library like pdf.js
            return content.replace(/[^\x20-\x7E\n]/g, ' ').trim();
        }
        
        // For other text files, return as-is
        return content;
    }
    
    /**
     * Store file as knowledge in RAG storage
     * @param {string} filename - File name
     * @param {string} content - Processed content
     * @param {number} fileSize - Original file size
     */
    function storeFileAsKnowledge(filename, content, fileSize) {
        const files = getStoredFiles();
        
        // Create unique ID for the file
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        files.push({
            id: fileId,
            name: filename,
            content: content,
            size: fileSize,
            addedAt: new Date().toISOString(),
            tokens: Math.round(content.length / 4)
        });
        
        localStorage.setItem('ragFileKnowledge', JSON.stringify(files));
    }
    
    /**
     * Get stored files from localStorage
     * @returns {Array} Stored files
     */
    function getStoredFiles() {
        const stored = localStorage.getItem('ragFileKnowledge');
        return stored ? JSON.parse(stored) : [];
    }
    
    /**
     * Load and display Files as Knowledge
     */
    function loadFilesAsKnowledge() {
        const container = document.getElementById('rag-files-list');
        if (!container) return;
        
        const files = getStoredFiles();
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="rag-empty-message">
                    No files uploaded yet. Click "Browse Files" to add documents to the knowledge base.
                </div>
            `;
            return;
        }
        
        const filesHTML = files.map(file => {
            const indexStatus = getFileIndexStatus(file.id);
            const statusBadge = getIndexingStatusBadge(indexStatus);
            
            return `
                <div class="rag-file-item ${indexStatus === 'indexed' ? 'indexed' : ''}">
                    <input type="checkbox" 
                           id="rag-file-${file.id}" 
                           data-file-id="${file.id}"
                           data-file-type="knowledge"
                           ${isFileSelected(file.id) ? 'checked' : ''}>
                    <label for="rag-file-${file.id}">
                        ${getFileIcon(file.name)} ${file.name}
                    </label>
                    <span class="rag-file-meta">
                        ${file.tokens} tokens • ${Math.round(file.size / 1024)}KB
                    </span>
                    <div class="rag-file-actions">
                        <button type="button" class="btn icon-btn" onclick="RAGManager.removeFile('${file.id}')" title="Remove file">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="rag-indexing-status">
                        ${statusBadge}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = filesHTML;
        
        // Add event listeners to checkboxes
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleFileSelectionChange);
        });
    }
    
    /**
     * Handle file selection change
     * @param {Event} event - Change event
     */
    function handleFileSelectionChange(event) {
        const fileId = event.target.dataset.fileId;
        const isSelected = event.target.checked;
        
        const selectedFiles = getSelectedFiles();
        
        if (isSelected) {
            if (!selectedFiles.includes(fileId)) {
                selectedFiles.push(fileId);
            }
        } else {
            const index = selectedFiles.indexOf(fileId);
            if (index > -1) {
                selectedFiles.splice(index, 1);
            }
        }
        
        localStorage.setItem('ragSelectedFiles', JSON.stringify(selectedFiles));
        console.log(`RAGManager: File ${fileId} ${isSelected ? 'selected' : 'deselected'} for indexing`);
    }
    
    /**
     * Get selected files for indexing
     * @returns {Array} Selected file IDs
     */
    function getSelectedFiles() {
        const stored = localStorage.getItem('ragSelectedFiles');
        return stored ? JSON.parse(stored) : [];
    }
    
    /**
     * Check if file is selected
     * @param {string} fileId - File ID
     * @returns {boolean} Whether file is selected
     */
    function isFileSelected(fileId) {
        return getSelectedFiles().includes(fileId);
    }
    
    /**
     * Get file index status
     * @param {string} fileId - File ID
     * @returns {string} Index status
     */
    function getFileIndexStatus(fileId) {
        // Check if file has been indexed
        const indexedFiles = JSON.parse(localStorage.getItem('ragIndexedFiles') || '{}');
        return indexedFiles[fileId] ? 'indexed' : 'not-indexed';
    }
    
    /**
     * Remove file from knowledge base
     * @param {string} fileId - File ID to remove
     */
    function removeFile(fileId) {
        if (!confirm('Remove this file from the knowledge base? This cannot be undone.')) {
            return;
        }
        
        const files = getStoredFiles();
        const updatedFiles = files.filter(f => f.id !== fileId);
        
        localStorage.setItem('ragFileKnowledge', JSON.stringify(updatedFiles));
        
        // Also remove from selected files
        const selectedFiles = getSelectedFiles();
        const updatedSelected = selectedFiles.filter(id => id !== fileId);
        localStorage.setItem('ragSelectedFiles', JSON.stringify(updatedSelected));
        
        // Remove from indexed files
        const indexedFiles = JSON.parse(localStorage.getItem('ragIndexedFiles') || '{}');
        delete indexedFiles[fileId];
        localStorage.setItem('ragIndexedFiles', JSON.stringify(indexedFiles));
        
        showSuccess('File removed from knowledge base');
        loadFilesAsKnowledge();
    }
    
    /**
     * Show info message
     * @param {string} message - Info message
     */
    function showInfo(message) {
        console.log('RAGManager Info:', message);
        // Could show a toast notification
        alert(`Info: ${message}`);
    }
    
    /**
     * EU Documents data and management
     */
    const EU_DOCUMENTS = {
        'aia': {
            name: 'AIA - EU\'s AI Act',
            url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689',
            description: 'Regulation on Artificial Intelligence (AI Act)',
            defaultSettings: { chunkSize: 512, chunkOverlap: 10, embeddingModel: 'text-embedding-3-small' }
        },
        'cra': {
            name: 'CRA - EU\'s Cyber Resilience Act',
            url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R2847',
            description: 'Regulation on Cybersecurity Requirements for Digital Products',
            defaultSettings: { chunkSize: 512, chunkOverlap: 10, embeddingModel: 'text-embedding-3-small' }
        },
        'dora': {
            name: 'DORA - EU\'s Digital Operational Resilience Act',
            url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554',
            description: 'Regulation on Digital Operational Resilience for the Financial Sector',
            defaultSettings: { chunkSize: 512, chunkOverlap: 10, embeddingModel: 'text-embedding-3-small' }
        }
    };
    
    /**
     * Load EU documents status
     */
    function loadEUDocuments() {
        Object.keys(EU_DOCUMENTS).forEach(docId => {
            updateDocumentStatus(docId);
        });
    }
    
    /**
     * Update document status display
     * @param {string} docId - Document ID
     */
    function updateDocumentStatus(docId) {
        const statusEl = document.getElementById(`${docId}-status`);
        if (!statusEl) return;
        
        const isIndexed = getDocumentIndexStatus(docId);
        if (isIndexed) {
            statusEl.textContent = 'Indexed';
            statusEl.className = 'rag-document-status indexed';
        } else {
            statusEl.textContent = 'Not indexed';
            statusEl.className = 'rag-document-status';
        }
    }
    
    /**
     * Get document index status from storage
     * @param {string} docId - Document ID
     * @returns {boolean} Whether document is indexed
     */
    function getDocumentIndexStatus(docId) {
        const indexed = JSON.parse(localStorage.getItem('ragEUDocuments') || '{}');
        return indexed[docId] && indexed[docId].chunks && indexed[docId].chunks.length > 0;
    }
    
    /**
     * Refresh document embeddings
     * @param {string} docId - Document ID
     */
    async function refreshDocument(docId) {
        const refreshBtn = document.querySelector(`[onclick="RAGManager.refreshDocument('${docId}')"]`);
        const icon = refreshBtn?.querySelector('i');
        
        if (!EU_DOCUMENTS[docId]) {
            showError(`Unknown document: ${docId}`);
            return;
        }
        
        try {
            // Add spinning animation
            if (icon) icon.classList.add('spinning');
            
            // Get document settings
            const settings = getDocumentSettings(docId);
            
            // For demo purposes, simulate document processing
            // In real implementation, you would fetch and process the actual document
            showProgress(`Processing ${EU_DOCUMENTS[docId].name}...`, 25);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            showProgress('Generating embeddings...', 75);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Store mock indexed data
            const indexed = JSON.parse(localStorage.getItem('ragEUDocuments') || '{}');
            indexed[docId] = {
                chunks: Array.from({ length: Math.floor(Math.random() * 50) + 10 }, (_, i) => ({
                    id: `${docId}_chunk_${i}`,
                    content: `Sample chunk ${i + 1} from ${EU_DOCUMENTS[docId].name}`,
                    embedding: new Array(1536).fill(0).map(() => Math.random())
                })),
                settings: settings,
                lastIndexed: new Date().toISOString()
            };
            localStorage.setItem('ragEUDocuments', JSON.stringify(indexed));
            
            updateDocumentStatus(docId);
            showSuccess(`Successfully indexed ${EU_DOCUMENTS[docId].name}`);
            
        } catch (error) {
            showError(`Failed to refresh ${EU_DOCUMENTS[docId].name}: ${error.message}`);
        } finally {
            // Remove spinning animation
            if (icon) icon.classList.remove('spinning');
            hideProgress();
        }
    }
    
    /**
     * Open document settings modal
     * @param {string} docId - Document ID
     */
    function openDocumentSettings(docId) {
        if (!EU_DOCUMENTS[docId]) return;
        
        const modal = document.getElementById('rag-document-settings-modal');
        const titleEl = document.getElementById('rag-settings-title');
        const docIdInput = document.getElementById('rag-settings-doc-id');
        const chunkSizeInput = document.getElementById('rag-chunk-size');
        const chunkOverlapInput = document.getElementById('rag-chunk-overlap');
        const embeddingModelSelect = document.getElementById('rag-embedding-model');
        const chunkCountEl = document.getElementById('rag-settings-chunk-count');
        const lastIndexedEl = document.getElementById('rag-settings-last-indexed');
        
        if (!modal) return;
        
        // Set title and document ID
        titleEl.textContent = `${EU_DOCUMENTS[docId].name} Settings`;
        docIdInput.value = docId;
        
        // Load current settings
        const settings = getDocumentSettings(docId);
        chunkSizeInput.value = settings.chunkSize;
        chunkOverlapInput.value = settings.chunkOverlap;
        embeddingModelSelect.value = settings.embeddingModel;
        
        // Load document info
        const indexed = JSON.parse(localStorage.getItem('ragEUDocuments') || '{}');
        const docData = indexed[docId];
        
        chunkCountEl.textContent = docData?.chunks?.length || 0;
        lastIndexedEl.textContent = docData?.lastIndexed 
            ? new Date(docData.lastIndexed).toLocaleString()
            : 'Never';
        
        modal.classList.add('active');
    }
    
    /**
     * Close document settings modal
     */
    function closeDocumentSettings() {
        const modal = document.getElementById('rag-document-settings-modal');
        if (modal) modal.classList.remove('active');
    }
    
    /**
     * Save document settings
     */
    function saveDocumentSettings() {
        const docId = document.getElementById('rag-settings-doc-id').value;
        const chunkSize = parseInt(document.getElementById('rag-chunk-size').value);
        const chunkOverlap = parseInt(document.getElementById('rag-chunk-overlap').value);
        const embeddingModel = document.getElementById('rag-embedding-model').value;
        
        if (!EU_DOCUMENTS[docId]) return;
        
        // Validate settings
        if (chunkSize < 100 || chunkSize > 2000) {
            showError('Chunk size must be between 100 and 2000 tokens');
            return;
        }
        
        if (chunkOverlap < 0 || chunkOverlap > 50) {
            showError('Chunk overlap must be between 0 and 50 percent');
            return;
        }
        
        // Save settings
        setDocumentSettings(docId, { chunkSize, chunkOverlap, embeddingModel });
        
        showSuccess('Settings saved successfully');
        closeDocumentSettings();
    }
    
    /**
     * Get document settings
     * @param {string} docId - Document ID
     * @returns {Object} Settings object
     */
    function getDocumentSettings(docId) {
        const settings = JSON.parse(localStorage.getItem('ragDocumentSettings') || '{}');
        return settings[docId] || EU_DOCUMENTS[docId]?.defaultSettings || {
            chunkSize: 512,
            chunkOverlap: 10,
            embeddingModel: 'text-embedding-3-small'
        };
    }
    
    /**
     * Set document settings
     * @param {string} docId - Document ID
     * @param {Object} settings - Settings object
     */
    function setDocumentSettings(docId, settings) {
        const allSettings = JSON.parse(localStorage.getItem('ragDocumentSettings') || '{}');
        allSettings[docId] = settings;
        localStorage.setItem('ragDocumentSettings', JSON.stringify(allSettings));
    }
    
    /**
     * Toggle advanced section
     */
    function toggleAdvanced() {
        const content = document.getElementById('rag-advanced-content');
        const toggle = document.getElementById('rag-advanced-toggle');
        
        if (!content || !toggle) return;
        
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            toggle.textContent = '▼';
            toggle.classList.add('expanded');
        } else {
            content.style.display = 'none';
            toggle.textContent = '▶';
            toggle.classList.remove('expanded');
        }
    }
    
    /**
     * Generate chunks from content on-the-fly
     * @param {string} content - Document content
     * @param {Object} settings - Chunk settings
     * @returns {Array} Array of chunks
     */
    function generateChunksFromContent(content, settings) {
        const chunkSize = settings.chunkSize * 4; // Convert tokens to characters (approx)
        const overlapSize = Math.floor(chunkSize * settings.chunkOverlap / 100);
        
        const chunks = [];
        let currentPos = 0;
        let chunkNumber = 1;
        
        while (currentPos < content.length) {
            const chunkEnd = Math.min(currentPos + chunkSize, content.length);
            const chunkContent = content.substring(currentPos, chunkEnd);
            
            chunks.push({
                id: `chunk_${chunkNumber}`,
                content: chunkContent,
                start: currentPos,
                end: chunkEnd,
                number: chunkNumber
            });
            
            currentPos += chunkSize - overlapSize;
            chunkNumber++;
        }
        
        return chunks;
    }

    /**
     * Generate document HTML with chunk visualization for regulations
     * @param {string} content - Document content
     * @param {Array} chunks - Array of chunks
     * @param {Object} settings - Settings object
     * @returns {string} HTML with chunks visualized
     */
    function generateRegulationWithChunks(content, chunks, settings) {
        const overlapSize = Math.floor(settings.chunkSize * 4 * settings.chunkOverlap / 100);
        
        let html = '';
        
        chunks.forEach((chunk, index) => {
            // Add chunk boundary marker (uses existing CSS .chunk-boundary)
            html += `<div class="chunk-boundary" data-chunk-number="${chunk.number}"></div>`;
            
            // Show overlap region if this isn't the first chunk and there is overlap
            if (index > 0 && overlapSize > 0) {
                const overlapStart = Math.max(0, chunk.start - overlapSize);
                const overlapContent = content.substring(overlapStart, chunk.start);
                if (overlapContent.trim()) {
                    // Format overlap content with proper paragraph breaks
                    const formattedOverlap = overlapContent
                        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/^\*(.+)\*$/gm, '<em>$1</em>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/^(.+)$/gm, '<p>$1</p>')
                        .replace(/(<\/p><p>)+/g, '</p><p>')
                        .replace(/^<p><\/p>/g, '')
                        .replace(/<\/p><p>$/g, '');
                    
                    html += `<div class="chunk-overlap">${formattedOverlap}</div>`;
                }
            }
            
            // Add chunk content with proper markdown formatting
            const chunkContent = chunk.content
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/^\*(.+)\*$/gm, '<em>$1</em>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^(.+)$/gm, '<p>$1</p>')
                .replace(/(<\/p><p>)+/g, '</p><p>')
                .replace(/^<p><\/p>/g, '')
                .replace(/<\/p><p>$/g, '');
            
            html += chunkContent;
        });
        
        return html;
    }

    /**
     * View document with chunk boundaries
     * @param {string} docId - Document ID
     */
    function viewDocument(docId) {
        console.log(`🔍 DEBUG: viewDocument called with docId: "${docId}"`);
        let documentInfo = null;
        let documentContent = null;
        
        // Map HTML docIds to regulation IDs
        const regulationIdMap = {
            'aia': 'ai_act',
            'dora': 'dora', 
            'cra': 'cra'
        };
        
        // Check if it's a regulation (either regulation_ prefix or mapped docId)
        let regulationId = null;
        if (docId.startsWith('regulation_')) {
            regulationId = docId.replace('regulation_', '');
        } else if (regulationIdMap[docId]) {
            regulationId = regulationIdMap[docId];
        }
        
        if (regulationId && window.ragRegulationsService) {
            console.log(`🔍 DEBUG: Regulation path - mapped "${docId}" to regulationId "${regulationId}"`);
            const regulation = window.ragRegulationsService.getAvailableRegulations()
                .find(reg => reg.id === regulationId);
            
            if (regulation) {
                documentInfo = {
                    name: regulation.name,
                    description: `${regulation.regulationNumber} - Official Date: ${regulation.officialDate}`
                };
                documentContent = window.ragRegulationsService.getRegulationContent(regulationId);
                console.log(`🔍 DEBUG: Found regulation "${regulation.name}", content length: ${documentContent?.length || 'NULL'}`);
                
                // Get settings for this regulation
                const settings = getDocumentSettings(docId);
                console.log(`🔍 DEBUG: Settings:`, settings);
                
                // Generate chunks on-the-fly
                const chunks = generateChunksFromContent(documentContent, settings);
                console.log(`🔍 DEBUG: Generated ${chunks.length} chunks`);
                
                // Show regulation with chunk visualization
                const modal = document.getElementById('rag-document-viewer-modal');
                const titleEl = document.getElementById('rag-viewer-title');
                const chunksEl = document.getElementById('rag-viewer-chunks');
                const chunkSizeEl = document.getElementById('rag-viewer-chunk-size');
                const overlapEl = document.getElementById('rag-viewer-overlap');
                const contentEl = document.getElementById('rag-document-content');
                
                if (!modal) return;
                
                titleEl.textContent = `${documentInfo.name} - Document with Chunks`;
                chunksEl.textContent = chunks.length;
                chunkSizeEl.textContent = `${settings.chunkSize} tokens`;
                overlapEl.textContent = `${settings.chunkOverlap}%`;
                
                const documentHTML = generateRegulationWithChunks(documentContent, chunks, settings);
                console.log(`🔍 DEBUG: Generated HTML length: ${documentHTML.length}`);
                contentEl.innerHTML = documentHTML;
                contentEl.className = 'rag-document-content';
                
                modal.classList.add('active');
                return;
            }
        } 
        // Check if it's an old EU document
        else if (EU_DOCUMENTS[docId]) {
            console.log(`🔍 DEBUG: EU_DOCUMENTS path - found docId "${docId}"`);
            console.log(`🔍 DEBUG: EU_DOCUMENTS[docId]:`, EU_DOCUMENTS[docId]);
            documentInfo = EU_DOCUMENTS[docId];
            const indexed = JSON.parse(localStorage.getItem('ragEUDocuments') || '{}');
            const docData = indexed[docId];
            
            if (docData && docData.chunks && docData.chunks.length > 0) {
                // For old documents, use existing logic
                const modal = document.getElementById('rag-document-viewer-modal');
                const titleEl = document.getElementById('rag-viewer-title');
                const chunksEl = document.getElementById('rag-viewer-chunks');
                const chunkSizeEl = document.getElementById('rag-viewer-chunk-size');
                const overlapEl = document.getElementById('rag-viewer-overlap');
                const contentEl = document.getElementById('rag-document-content');
                
                if (!modal) return;
                
                titleEl.textContent = `${EU_DOCUMENTS[docId].name} - Document Viewer`;
                const settings = docData.settings || getDocumentSettings(docId);
                chunksEl.textContent = docData.chunks.length;
                chunkSizeEl.textContent = `${settings.chunkSize} tokens`;
                overlapEl.textContent = `${settings.chunkOverlap}%`;
                
                const documentHTML = generateDocumentWithChunks(docId, docData, settings);
                contentEl.innerHTML = documentHTML;
                modal.classList.add('active');
                return;
            } else {
                showError(`Document ${EU_DOCUMENTS[docId].name} is not indexed yet. Please refresh it first.`);
                return;
            }
        }
        
        if (!documentInfo) {
            showError(`Unknown document: ${docId}`);
            return;
        }
        
        showError(`Document ${documentInfo.name} content not available. Please check if it's properly loaded.`);
    }
    
    /**
     * Close document viewer modal
     */
    function closeDocumentViewer() {
        const modal = document.getElementById('rag-document-viewer-modal');
        if (modal) modal.classList.remove('active');
    }
    
    /**
     * Generate document HTML with chunk boundaries
     * @param {string} docId - Document ID
     * @param {Object} docData - Document data
     * @param {Object} settings - Chunk settings
     * @returns {string} HTML content
     */
    function generateDocumentWithChunks(docId, docData, settings) {
        // Generate sample document content based on EU document
        const sampleContent = generateSampleDocumentContent(docId);
        
        // Calculate chunk boundaries based on settings
        const chunkSize = settings.chunkSize * 4; // Convert tokens to characters (approx)
        const overlapSize = Math.floor(chunkSize * settings.chunkOverlap / 100);
        
        let html = '';
        let currentPos = 0;
        let chunkNumber = 1;
        
        while (currentPos < sampleContent.length) {
            // Add chunk boundary marker
            if (chunkNumber > 1) {
                // Show overlap region if there is one
                if (overlapSize > 0) {
                    const overlapStart = Math.max(0, currentPos - overlapSize);
                    const overlapContent = sampleContent.substring(overlapStart, currentPos);
                    html += `<div class="chunk-overlap">${escapeHtml(overlapContent)}</div>`;
                }
            }
            
            html += `<div class="chunk-boundary" data-chunk-number="${chunkNumber}"></div>`;
            
            // Add chunk content
            const chunkEnd = Math.min(currentPos + chunkSize, sampleContent.length);
            const chunkContent = sampleContent.substring(currentPos, chunkEnd);
            
            // Split into paragraphs for better readability
            const paragraphs = chunkContent.split(/\n\n+/).filter(p => p.trim());
            paragraphs.forEach(paragraph => {
                if (paragraph.trim()) {
                    html += `<p>${escapeHtml(paragraph.trim())}</p>`;
                }
            });
            
            currentPos += chunkSize - overlapSize;
            chunkNumber++;
            
            if (chunkNumber > docData.chunks.length) break;
        }
        
        return html;
    }
    
    /**
     * Generate sample document content for EU documents
     * @param {string} docId - Document ID
     * @returns {string} Sample content
     */
    function generateSampleDocumentContent(docId) {
        const contents = {
            'aia': `REGULATION (EU) 2024/1689 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL

laying down harmonised rules on artificial intelligence and amending Regulations (EC) No 300/2008, (EU) No 167/2013, (EU) No 168/2013, (EU) 2018/858, (EU) 2018/1139 and (EU) 2019/2144 and Directives 2014/90/EU, (EU) 2016/797 and (EU) 2020/1828 (Artificial Intelligence Act)

Article 1 - Subject matter and scope

This Regulation lays down harmonised rules for the placing on the market, the putting into service, and the use of artificial intelligence systems in the Union. This Regulation aims to improve the functioning of the internal market and promote the uptake of human-centric and trustworthy artificial intelligence, while ensuring a high level of protection of health, safety and fundamental rights enshrined in the Charter, including democracy, rule of law and environmental protection, against the harmful effects of artificial intelligence systems in the Union, and supporting innovation.

Article 3 - Definitions

For the purposes of this Regulation, the following definitions apply:

(1) 'artificial intelligence system' (AI system) means a machine-based system designed to operate with varying levels of autonomy, that may exhibit adaptiveness after deployment, and that, for explicit or implicit objectives, infers, from the input it receives, how to generate outputs such as predictions, content, recommendations, or decisions that can influence physical or virtual environments;

(2) 'algorithm' means a finite sequence of well-defined instructions, rules or operations for the solution of a problem;

(3) 'model' means a set of elements, including algorithms, data and weights derived from training, designed to generate outputs when given inputs;

Article 4 - Prohibited AI practices

AI systems that deploy subliminal techniques beyond a person's consciousness or exploit vulnerabilities of specific groups of persons due to their age, disability or specific social or economic situation in order to materially distort their behaviour are prohibited.

Article 5 - High-risk AI systems

AI systems identified as high-risk are subject to the requirements set out in this Chapter before they can be placed on the market or put into service. High-risk AI systems include those intended to be used as safety components of products covered by Union harmonisation legislation listed in Annex I.`,

            'cra': `REGULATION (EU) 2024/2847 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL

on cybersecurity requirements for digital products and ancillary services

Article 1 - Subject matter and scope

This Regulation lays down essential cybersecurity requirements for digital products with digital elements that are placed on the Union market, in order to ensure that products with digital elements are cyber secure. This Regulation aims to create incentives for manufacturers to improve the cybersecurity of products with digital elements throughout their life cycle.

Article 2 - Definitions

For the purposes of this Regulation, the following definitions apply:

(1) 'digital product' means any software or hardware product and its remote data processing solutions, including software or hardware components to be integrated into or interconnected with other products;

(2) 'cybersecurity risk' means any reasonably identifiable circumstance or event having a potential adverse effect on the cybersecurity of digital products;

(3) 'vulnerability' means a weakness, susceptibility or flaw of a digital product or of its deployment that can be exploited by a threat;

Article 10 - Essential cybersecurity requirements

Digital products shall be designed, developed and produced in such a way that they ensure an appropriate level of cybersecurity based on the risks. Manufacturers shall ensure that digital products meet the essential cybersecurity requirements set out in Annex I.

Article 11 - Cybersecurity risk assessment

Before placing digital products on the market, manufacturers shall carry out a cybersecurity risk assessment in accordance with the methodology set out in Annex II. The risk assessment shall identify and analyse cybersecurity risks that the digital product may pose to itself or to other digital products.`,

            'dora': `REGULATION (EU) 2022/2554 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL

on digital operational resilience for the financial sector and amending Regulations (EC) No 1060/2009, (EU) No 648/2012, (EU) No 600/2014, (EU) No 909/2014 and (EU) 2016/1011

Article 1 - Subject matter and scope

This Regulation lays down uniform requirements concerning the digital operational resilience for financial entities. It aims to consolidate and upgrade the information and communication technology (ICT) risk management, reporting of major ICT-related incidents, operational resilience testing, and management of third-party ICT risk.

Article 2 - Definitions

For the purposes of this Regulation, the following definitions apply:

(1) 'digital operational resilience' means the ability of a financial entity to build, assure and review its operational integrity and reliability by ensuring, either directly or indirectly through the use of services provided by ICT third-party service providers, the full range of ICT-related capabilities needed to address the security, availability, integrity, reliability and resilience of ICT systems, and to maintain high standards of availability, reliability, safety and security of ICT systems;

(2) 'ICT risk' means any reasonably identifiable circumstance in relation to the use of information and communication technology that, if materialised, may compromise the security, availability, integrity or reliability of ICT systems and any data stored therein;

Article 8 - ICT risk management framework

Financial entities shall have in place a sound, comprehensive and well-documented ICT risk management framework as part of their overall risk management system, which enables them to address ICT risk quickly, efficiently and comprehensively, and to ensure high standards of availability, authenticity, integrity and reliability of ICT systems.

Article 17 - Classification of ICT-related incidents

Financial entities shall classify ICT-related incidents and shall determine their impact based on the criteria set out in the regulatory technical standards referred to in paragraph 2. Major ICT-related incidents shall be classified as such where they have a high adverse impact on the network and information systems.`
        };
        
        return contents[docId] || 'Sample document content not available.';
    }
    
    /**
     * Escape HTML entities
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        removeFile,
        isRAGEnabled,
        getRAGEnabledState,
        setRAGEnabledState,
        refreshPromptsList: loadDefaultPromptsList, // Alias for external use
        refreshDocument,
        openDocumentSettings,
        closeDocumentSettings,
        saveDocumentSettings,
        toggleAdvanced,
        viewDocument,
        closeDocumentViewer
    };
})();