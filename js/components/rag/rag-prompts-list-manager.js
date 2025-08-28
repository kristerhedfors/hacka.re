/**
 * RAG Prompts List Manager
 * Manages the display and selection of prompts for RAG indexing with tree structure
 */

window.RAGPromptsListManager = (function() {
    
    let isInitialized = false;

    /**
     * Initialize the RAG Prompts List Manager
     */
    function init() {
        if (isInitialized) {
            return;
        }

        isInitialized = true;
        console.log('RAGPromptsListManager: Initialized successfully');
    }

    /**
     * Load and display default prompts list with tree structure
     */
    function loadPromptsList() {
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
            console.error('RAGPromptsListManager: Error loading prompts list:', error);
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
            html += createDefaultPromptsSection(defaultPrompts, indexedPrompts);
        }
        
        // Add EU Regulations section
        if (window.ragRegulationsService && window.ragRegulationsService.isReady()) {
            html += createEURegulationsSection(indexedPrompts);
        }
        
        // Add User-Defined Prompts section
        html += createUserPromptsSection(userPrompts, indexedPrompts);
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Create Default Prompts section HTML
     */
    function createDefaultPromptsSection(defaultPrompts, indexedPrompts) {
        let html = `
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
        
        return html;
    }

    /**
     * Create EU Regulations section HTML
     */
    function createEURegulationsSection(indexedPrompts) {
        const regulations = window.ragRegulationsService.getAvailableRegulations();
        
        if (!regulations || regulations.length === 0) {
            return '';
        }

        let html = `
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
                                onclick="RAGPromptsListManager.viewDocument('regulation_${regulation.id}')"
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
        
        return html;
    }

    /**
     * Create User-Defined Prompts section HTML
     */
    function createUserPromptsSection(userPrompts, indexedPrompts) {
        let html = `
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
            console.log(`RAGPromptsListManager: EU regulation ${regulationId} ${isSelected ? 'selected' : 'deselected'} for indexing`);
        } else if (promptId) {
            // Handle prompt selection
            RAGStorageService.toggleRAGPromptSelection(promptId);
            console.log(`RAGPromptsListManager: RAG prompt ${promptId} ${isSelected ? 'selected' : 'deselected'} for indexing`);
        }
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
            console.warn('RAGPromptsListManager: Error getting indexed prompts status:', error);
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
     * View document (delegate to other managers/components)
     * @param {string} docId - Document ID
     */
    function viewDocument(docId) {
        if (window.RAGDocumentViewManager) {
            window.RAGDocumentViewManager.viewDocument(docId);
        } else {
            console.warn('RAGPromptsListManager: Document view manager not found');
        }
    }

    // Public API
    return {
        init,
        loadPromptsList,
        viewDocument,
        getIndexedPromptsStatus
    };
})();