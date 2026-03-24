/**
 * RAG Embedding Generator
 * Handles the generation of embeddings for selected prompts and content
 */

window.RAGEmbeddingGenerator = (function() {
    
    let isInitialized = false;

    /**
     * Initialize the RAG Embedding Generator
     */
    function init() {
        if (isInitialized) {
            return;
        }

        setupEventListeners();
        isInitialized = true;
        console.log('RAGEmbeddingGenerator: Initialized successfully');
    }

    /**
     * Set up event listeners for embedding generation
     */
    function setupEventListeners() {
        // Generate embeddings button
        const generateBtn = document.getElementById('rag-index-defaults-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateEmbeddings);
        }
    }

    /**
     * Generate embeddings for selected prompts (default and user prompts)
     */
    async function generateEmbeddings() {
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
        const selectedPrompts = await collectSelectedPrompts(selectedRAGPromptIds);

        if (selectedPrompts.length === 0) {
            showError('No valid prompts found for the selected items.');
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
            
            // Update UI components
            if (window.RAGIndexStatsManager) {
                window.RAGIndexStatsManager.updateStats();
            }
            if (window.RAGPromptsListManager) {
                window.RAGPromptsListManager.loadPromptsList();
            }

        } catch (error) {
            console.error('RAGEmbeddingGenerator: Error generating embeddings:', error);
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
     * Collect selected prompts from various sources
     * @param {Array} selectedRAGPromptIds - Array of selected prompt IDs
     * @returns {Promise<Array>} Array of prompt objects
     */
    async function collectSelectedPrompts(selectedRAGPromptIds) {
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

        // Handle regulation prompts
        for (const promptId of selectedRAGPromptIds) {
            if (promptId.startsWith('regulation_') && window.ragRegulationsService) {
                const regulationId = promptId.replace('regulation_', '');
                const regulation = window.ragRegulationsService.getAvailableRegulations()
                    .find(reg => reg.id === regulationId);
                
                if (regulation) {
                    const content = window.ragRegulationsService.getRegulationContent(regulationId);
                    if (content) {
                        selectedPrompts.push({
                            id: promptId,
                            name: regulation.name,
                            content: content,
                            type: 'regulation',
                            metadata: window.ragRegulationsService.getRegulationMetadata(regulationId)
                        });
                    }
                }
            }
        }

        return selectedPrompts;
    }

    /**
     * Show progress indicator
     * @param {string} message - Progress message
     * @param {number} progress - Progress percentage (0-100)
     */
    function showProgress(message, progress) {
        console.log(`Progress: ${progress}% - ${message}`);
        // Could integrate with a progress bar UI component here
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
        console.error('RAGEmbeddingGenerator Error:', message);
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
        console.log('RAGEmbeddingGenerator Success:', message);
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
        generateEmbeddings,
        collectSelectedPrompts
    };
})();