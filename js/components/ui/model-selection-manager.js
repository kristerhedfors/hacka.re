/**
 * Model Selection Manager
 * Handles sophisticated model selector modal with live search and keyboard shortcuts
 */

window.ModelSelectionManager = (function() {
    
    let elements;
    let availableModels = [];
    let selectedModel = null;
    let currentSearchTerm = '';
    let highlightedIndex = -1;
    
    /**
     * Initialize the model selection manager
     * @param {Object} domElements - DOM elements object
     */
    function init(domElements) {
        elements = domElements;
        setupEventListeners();
        console.log('🚀 ModelSelectionManager initialized');
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Modal close events
        if (elements.closeModelSelectionModal) {
            elements.closeModelSelectionModal.addEventListener('click', hideModal);
        }
        
        if (elements.modelSelectionCancel) {
            elements.modelSelectionCancel.addEventListener('click', hideModal);
        }
        
        // Model selection events
        if (elements.modelSelectionSelect) {
            elements.modelSelectionSelect.addEventListener('click', selectModel);
        }
        
        // Search input events
        if (elements.modelSearchInput) {
            elements.modelSearchInput.addEventListener('input', handleSearchInput);
            elements.modelSearchInput.addEventListener('keydown', handleSearchKeydown);
        }
        
        // Click header to open modal
        const modelNameDisplay = document.querySelector('.model-name-display');
        const modelContext = document.querySelector('.model-context');
        const modelStats = document.querySelector('.model-stats');
        
        if (modelNameDisplay) {
            modelNameDisplay.addEventListener('click', showModal);
        }
        if (modelContext) {
            modelContext.addEventListener('click', showModal);
        }
        if (modelStats) {
            modelStats.addEventListener('click', showModal);
        }
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', handleGlobalKeydown);
        
        // Click outside to close
        if (elements.modelSelectionModal) {
            elements.modelSelectionModal.addEventListener('click', (e) => {
                if (e.target === elements.modelSelectionModal) {
                    hideModal();
                }
            });
        }
    }
    
    /**
     * Handle global keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleGlobalKeydown(e) {
        // Cmd+M on Mac or Ctrl+M on Windows/Linux
        if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
            e.preventDefault();
            if (isModalVisible()) {
                hideModal();
            } else {
                showModal();
            }
            return;
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && isModalVisible()) {
            e.preventDefault();
            hideModal();
            return;
        }
        
        // Handle navigation in modal
        if (isModalVisible()) {
            handleModalKeyboard(e);
        }
    }
    
    /**
     * Handle keyboard navigation in modal
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleModalKeyboard(e) {
        const visibleModels = getVisibleModels();
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, visibleModels.length - 1);
            updateHighlight();
            scrollToHighlighted();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, -1);
            updateHighlight();
            scrollToHighlighted();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < visibleModels.length) {
                selectModelAtIndex(highlightedIndex);
            }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Focus search input and add character
            if (elements.modelSearchInput && document.activeElement !== elements.modelSearchInput) {
                elements.modelSearchInput.focus();
                // Let the input handle the character
            }
        }
    }
    
    /**
     * Handle search input changes
     * @param {Event} e - Input event
     */
    function handleSearchInput(e) {
        currentSearchTerm = e.target.value.toLowerCase();
        filterModels();
        highlightedIndex = currentSearchTerm ? 0 : -1; // Auto-highlight first result
        updateHighlight();
        updateModelInfo();
    }
    
    /**
     * Handle search input keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleSearchKeydown(e) {
        // Don't let these bubble up to modal keyboard handler
        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
            handleModalKeyboard(e);
        }
    }
    
    /**
     * Show the model selection modal
     */
    function showModal() {
        console.log('🔧 Opening model selection modal');
        
        if (!elements.modelSelectionModal) {
            console.error('❌ Model selection modal not found');
            return;
        }
        
        // Load models and show modal
        loadAvailableModels().then(() => {
            elements.modelSelectionModal.classList.add('active');
            resetModalState();
            
            // Focus search input
            if (elements.modelSearchInput) {
                setTimeout(() => {
                    elements.modelSearchInput.focus();
                }, 100);
            }
        }).catch(error => {
            console.error('❌ Error loading models:', error);
            // Show modal anyway with error message
            elements.modelSelectionModal.classList.add('active');
            showError('Failed to load models. Please check your API configuration.');
        });
    }
    
    /**
     * Hide the model selection modal
     */
    function hideModal() {
        console.log('🔧 Closing model selection modal');
        
        if (elements.modelSelectionModal) {
            elements.modelSelectionModal.classList.remove('active');
        }
        
        resetModalState();
    }
    
    /**
     * Check if modal is visible
     * @returns {boolean} True if modal is visible
     */
    function isModalVisible() {
        return elements.modelSelectionModal && elements.modelSelectionModal.classList.contains('active');
    }
    
    /**
     * Reset modal state
     */
    function resetModalState() {
        currentSearchTerm = '';
        highlightedIndex = -1;
        selectedModel = null;
        
        if (elements.modelSearchInput) {
            elements.modelSearchInput.value = '';
        }
    }
    
    /**
     * Load available models from API
     * @returns {Promise} Promise that resolves when models are loaded
     */
    async function loadAvailableModels() {
        console.log('🔧 Loading available models...');
        
        // Show loading state
        if (elements.modelListContainer) {
            elements.modelListContainer.innerHTML = '<div class="loading-models">Loading models...</div>';
        }
        
        // Get current settings
        const apiKey = window.aiHackare?.settingsManager?.getApiKey();
        const baseUrl = window.aiHackare?.settingsManager?.getBaseUrl();
        
        if (!apiKey || !baseUrl) {
            throw new Error('API key or base URL not configured');
        }
        
        try {
            // Use the settings manager to fetch models
            const settingsManager = window.aiHackare?.settingsManager;
            if (settingsManager && settingsManager.fetchAvailableModels) {
                await settingsManager.fetchAvailableModels(apiKey, baseUrl, false);
                
                // Get models from the model select dropdown
                const modelSelect = document.getElementById('model-select');
                if (modelSelect) {
                    availableModels = Array.from(modelSelect.options)
                        .filter(option => !option.disabled && option.value)
                        .map(option => ({
                            id: option.value,
                            name: option.textContent,
                            provider: getProviderFromBaseUrl(baseUrl)
                        }));
                }
            }
            
            if (availableModels.length === 0) {
                throw new Error('No models available');
            }
            
            console.log(`✅ Loaded ${availableModels.length} models`);
            renderModels();
            updateModelInfo();
            
        } catch (error) {
            console.error('❌ Error fetching models:', error);
            throw error;
        }
    }
    
    /**
     * Get provider name from base URL
     * @param {string} baseUrl - API base URL
     * @returns {string} Provider name
     */
    function getProviderFromBaseUrl(baseUrl) {
        if (baseUrl.includes('openai.com')) return 'OpenAI';
        if (baseUrl.includes('groq.com')) return 'Groq';
        if (baseUrl.includes('localhost:11434')) return 'Ollama';
        return 'Custom';
    }
    
    /**
     * Render models in the list
     */
    function renderModels() {
        if (!elements.modelListContainer) return;
        
        const currentModel = window.aiHackare?.settingsManager?.getCurrentModel();
        
        if (availableModels.length === 0) {
            elements.modelListContainer.innerHTML = '<div class="no-models-found">No models found</div>';
            return;
        }
        
        let html = '';
        availableModels.forEach((model, index) => {
            const isSelected = model.id === currentModel;
            const classes = ['model-item'];
            if (isSelected) classes.push('selected');
            
            html += `
                <div class="${classes.join(' ')}" data-model-id="${model.id}" data-index="${index}">
                    <div>
                        <div class="model-name">${escapeHtml(model.name)}</div>
                        <div class="model-provider">${escapeHtml(model.provider)}</div>
                    </div>
                </div>
            `;
        });
        
        elements.modelListContainer.innerHTML = html;
        
        // Add click listeners to model items
        elements.modelListContainer.querySelectorAll('.model-item').forEach(item => {
            item.addEventListener('click', () => {
                const modelId = item.dataset.modelId;
                const index = parseInt(item.dataset.index);
                highlightedIndex = index;
                updateHighlight();
                selectModelAtIndex(index);
            });
        });
    }
    
    /**
     * Filter models based on search term
     */
    function filterModels() {
        if (!elements.modelListContainer) return;
        
        const modelItems = elements.modelListContainer.querySelectorAll('.model-item');
        let visibleCount = 0;
        
        modelItems.forEach((item, index) => {
            const modelName = availableModels[index]?.name?.toLowerCase() || '';
            const modelProvider = availableModels[index]?.provider?.toLowerCase() || '';
            const searchText = currentSearchTerm.toLowerCase();
            
            const matches = !searchText || 
                           modelName.includes(searchText) || 
                           modelProvider.includes(searchText);
            
            if (matches) {
                item.classList.remove('filtered-out');
                item.style.display = '';
                
                // Highlight matching text
                highlightMatchingText(item, searchText);
                visibleCount++;
            } else {
                item.classList.add('filtered-out');
                item.style.display = 'none';
            }
        });
        
        // Show "no results" if no matches
        if (visibleCount === 0 && currentSearchTerm) {
            if (!elements.modelListContainer.querySelector('.no-models-found')) {
                const noResults = document.createElement('div');
                noResults.className = 'no-models-found';
                noResults.textContent = `No models found matching "${currentSearchTerm}"`;
                elements.modelListContainer.appendChild(noResults);
            }
        } else {
            const noResults = elements.modelListContainer.querySelector('.no-models-found');
            if (noResults) {
                noResults.remove();
            }
        }
    }
    
    /**
     * Highlight matching text in model items
     * @param {HTMLElement} item - Model item element
     * @param {string} searchText - Search term
     */
    function highlightMatchingText(item, searchText) {
        if (!searchText) return;
        
        const modelNameEl = item.querySelector('.model-name');
        if (modelNameEl) {
            const originalText = modelNameEl.textContent;
            const regex = new RegExp(`(${escapeRegExp(searchText)})`, 'gi');
            const highlightedText = originalText.replace(regex, '<span class="highlight">$1</span>');
            modelNameEl.innerHTML = highlightedText;
        }
    }
    
    /**
     * Get visible (non-filtered) models
     * @returns {Array} Array of visible model objects
     */
    function getVisibleModels() {
        if (!elements.modelListContainer) return [];
        
        const visibleItems = elements.modelListContainer.querySelectorAll('.model-item:not(.filtered-out)');
        return Array.from(visibleItems).map(item => {
            const index = parseInt(item.dataset.index);
            return availableModels[index];
        }).filter(Boolean);
    }
    
    /**
     * Update highlight for current selection
     */
    function updateHighlight() {
        if (!elements.modelListContainer) return;
        
        const visibleItems = elements.modelListContainer.querySelectorAll('.model-item:not(.filtered-out)');
        
        // Remove previous highlight
        visibleItems.forEach(item => item.classList.remove('highlighted'));
        
        // Add highlight to current item
        if (highlightedIndex >= 0 && highlightedIndex < visibleItems.length) {
            visibleItems[highlightedIndex].classList.add('highlighted');
            selectedModel = availableModels[parseInt(visibleItems[highlightedIndex].dataset.index)];
        } else {
            selectedModel = null;
        }
    }
    
    /**
     * Scroll to highlighted item
     */
    function scrollToHighlighted() {
        if (!elements.modelListContainer || highlightedIndex < 0) return;
        
        const visibleItems = elements.modelListContainer.querySelectorAll('.model-item:not(.filtered-out)');
        if (highlightedIndex < visibleItems.length) {
            const item = visibleItems[highlightedIndex];
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
    
    /**
     * Select model at specific index
     * @param {number} index - Index in visible models list
     */
    function selectModelAtIndex(index) {
        const visibleItems = elements.modelListContainer.querySelectorAll('.model-item:not(.filtered-out)');
        if (index >= 0 && index < visibleItems.length) {
            const item = visibleItems[index];
            const modelId = item.dataset.modelId;
            const model = availableModels.find(m => m.id === modelId);
            
            if (model) {
                selectedModel = model;
                selectModel();
            }
        }
    }
    
    /**
     * Select the current model and close modal
     */
    function selectModel() {
        if (!selectedModel) {
            console.log('❌ No model selected');
            return;
        }
        
        console.log('🔧 Selecting model:', selectedModel.id);
        
        try {
            // Update the main model select dropdown
            const modelSelect = document.getElementById('model-select');
            if (modelSelect) {
                modelSelect.value = selectedModel.id;
                
                // Trigger change event to update the application
                const changeEvent = new Event('change', { bubbles: true });
                modelSelect.dispatchEvent(changeEvent);
            }
            
            // Save to storage
            if (window.StorageService && window.StorageService.saveModel) {
                window.StorageService.saveModel(selectedModel.id);
            }
            
            // Update UI display
            if (window.aiHackare && window.aiHackare.uiManager && window.aiHackare.uiManager.updateModelInfoDisplay) {
                window.aiHackare.uiManager.updateModelInfoDisplay(selectedModel.id);
            }
            
            // Add system message
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                const displayName = window.ModelInfoService?.getDisplayName?.(selectedModel.id) || selectedModel.name;
                window.aiHackare.chatManager.addSystemMessage(`Model changed to ${displayName}`);
            }
            
            console.log('✅ Model selection complete');
            hideModal();
            
        } catch (error) {
            console.error('❌ Error selecting model:', error);
            showError('Failed to select model. Please try again.');
        }
    }
    
    /**
     * Update model info display
     */
    function updateModelInfo() {
        if (!elements.modelCardInfo) return;
        
        const currentModel = window.aiHackare?.settingsManager?.getCurrentModel();
        const model = selectedModel || availableModels.find(m => m.id === currentModel) || availableModels[0];
        
        if (!model) {
            elements.modelCardInfo.innerHTML = '<div class="no-models-found">No model information available</div>';
            return;
        }
        
        const baseUrl = window.aiHackare?.settingsManager?.getBaseUrl() || '';
        const displayName = window.ModelInfoService?.getDisplayName?.(model.id) || model.name;
        
        let html = `
            <div class="model-property">
                <div class="property-name">Model ID:</div>
                <div class="property-value">${escapeHtml(model.id)}</div>
            </div>
        `;
        
        if (displayName !== model.id) {
            html += `
                <div class="model-property">
                    <div class="property-name">Display Name:</div>
                    <div class="property-value">${escapeHtml(displayName)}</div>
                </div>
            `;
        }
        
        html += `
            <div class="model-property">
                <div class="property-name">Provider:</div>
                <div class="property-value">${escapeHtml(model.provider)}</div>
            </div>
            <div class="model-property">
                <div class="property-name">API Endpoint:</div>
                <div class="property-value">${escapeHtml(baseUrl)}</div>
            </div>
        `;
        
        elements.modelCardInfo.innerHTML = html;
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        if (elements.modelListContainer) {
            elements.modelListContainer.innerHTML = `<div class="no-models-found">${escapeHtml(message)}</div>`;
        }
        
        if (elements.modelCardInfo) {
            elements.modelCardInfo.innerHTML = `<div class="model-property"><div class="property-name">Error:</div><div class="property-value">${escapeHtml(message)}</div></div>`;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Escape regex special characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Public API
    return {
        init: init,
        showModal: showModal,
        hideModal: hideModal,
        isModalVisible: isModalVisible
    };
})();