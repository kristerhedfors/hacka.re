/**
 * RAG File Knowledge Manager
 * Manages file upload, storage, and display for Files as Knowledge feature
 */

window.RAGFileKnowledgeManager = (function() {
    
    let isInitialized = false;

    /**
     * Initialize the RAG File Knowledge Manager
     */
    function init() {
        if (isInitialized) {
            return;
        }

        setupEventListeners();
        isInitialized = true;
        console.log('RAGFileKnowledgeManager: Initialized successfully');
    }

    /**
     * Set up event listeners for file functionality
     */
    function setupEventListeners() {
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
                console.error('RAGFileKnowledgeManager: Error processing file:', error);
                showError(`Failed to process ${file.name}: ${error.message}`);
            }
        }
        
        // Clear the input
        event.target.value = '';
        
        // Reload the files list
        loadFiles();
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
    function loadFiles() {
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
                        <button type="button" class="btn icon-btn" onclick="RAGFileKnowledgeManager.removeFile('${file.id}')" title="Remove file">
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
        console.log(`RAGFileKnowledgeManager: File ${fileId} ${isSelected ? 'selected' : 'deselected'} for indexing`);
    }

    /**
     * Get selected files for indexing
     * @returns {Array} Selected file IDs
     */
    function getSelectedFiles() {
        // Use CoreStorageService for encrypted storage
        if (window.CoreStorageService) {
            return window.CoreStorageService.getValue('rag_selected_files') || [];
        }
        return [];
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
        // Use CoreStorageService for encrypted storage
        const indexedFiles = window.CoreStorageService ? 
            window.CoreStorageService.getValue('rag_indexed_files') || {} : {};
        return indexedFiles[fileId] ? 'indexed' : 'not-indexed';
    }

    /**
     * Get file icon for a filename
     */
    function getFileIcon(filename) {
        if (!filename) return '';
        
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
        
        // Remove from indexed files using CoreStorageService
        const indexedFiles = window.CoreStorageService ? 
            window.CoreStorageService.getValue('rag_indexed_files') || {} : {};
        delete indexedFiles[fileId];
        if (window.CoreStorageService) {
            window.CoreStorageService.setValue('rag_indexed_files', indexedFiles);
        }
        
        showSuccess('File removed from knowledge base');
        loadFiles();
    }

    /**
     * Show progress indicator
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
     * Show warning message
     */
    function showWarning(message) {
        console.warn('RAGFileKnowledgeManager Warning:', message);
        if (showWarning.lastMessage === message && Date.now() - showWarning.lastTime < 1000) {
            return;
        }
        showWarning.lastMessage = message;
        showWarning.lastTime = Date.now();
        alert(`Warning: ${message}`);
    }

    /**
     * Show error message
     */
    function showError(message) {
        console.error('RAGFileKnowledgeManager Error:', message);
        if (showError.lastMessage === message && Date.now() - showError.lastTime < 1000) {
            return;
        }
        showError.lastMessage = message;
        showError.lastTime = Date.now();
        alert(`Error: ${message}`);
    }

    /**
     * Show success message
     */
    function showSuccess(message) {
        console.log('RAGFileKnowledgeManager Success:', message);
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
        loadFiles,
        removeFile,
        getStoredFiles,
        getSelectedFiles
    };
})();