/**
 * Model Selector Modal Component
 * Handles the model selection modal with search and keyboard navigation
 */
window.ModelSelectorModal = (function() {
    'use strict';

    let elements;
    let availableModels = [];
    let filteredModels = [];
    let highlightedIndex = -1;
    let searchQuery = '';

    function createModelSelectorModal(domElements) {
        elements = domElements;
        attachEventListeners();
        return {
            show: showModal,
            hide: hideModal,
            setModels: setAvailableModels
        };
    }

    function attachEventListeners() {
        // Click to open modal on model name display
        if (elements.modelNameDisplay) {
            elements.modelNameDisplay.addEventListener('click', showModal);
        }

        // Global keyboard shortcut (Cmd/Ctrl + M)
        document.addEventListener('keydown', handleGlobalKeydown);

        // Modal search input events
        if (elements.modelSearchInput) {
            elements.modelSearchInput.addEventListener('input', handleSearchInput);
            elements.modelSearchInput.addEventListener('keydown', handleSearchKeydown);
        }

        // Click outside modal to close
        if (elements.modelSelectorModal) {
            elements.modelSelectorModal.addEventListener('click', handleModalClick);
        }
    }

    function handleGlobalKeydown(event) {
        // Cmd/Ctrl + M to open modal
        if ((event.metaKey || event.ctrlKey) && event.key === 'm') {
            event.preventDefault();
            showModal();
        }
    }

    function handleModalClick(event) {
        // Close modal if clicking outside the modal content
        if (event.target === elements.modelSelectorModal) {
            hideModal();
        }
    }

    function handleSearchInput(event) {
        searchQuery = event.target.value.toLowerCase();
        filterAndRenderModels();
        highlightedIndex = filteredModels.length > 0 ? 0 : -1;
        updateHighlight();
    }

    function handleSearchKeydown(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (highlightedIndex < filteredModels.length - 1) {
                    highlightedIndex++;
                    updateHighlight();
                    scrollToHighlighted();
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (highlightedIndex > 0) {
                    highlightedIndex--;
                    updateHighlight();
                    scrollToHighlighted();
                }
                break;
            case 'Enter':
                event.preventDefault();
                if (highlightedIndex >= 0 && filteredModels[highlightedIndex]) {
                    selectModel(filteredModels[highlightedIndex]);
                }
                break;
            case 'Escape':
                event.preventDefault();
                hideModal();
                break;
            case 'Backspace':
                // Allow backspace to work normally for search
                break;
            default:
                // For character input, just let it happen naturally
                break;
        }
    }

    function showModal() {
        if (!elements.modelSelectorModal) return;

        // Load available models
        loadAvailableModels().then(() => {
            // Reset search state
            searchQuery = '';
            highlightedIndex = -1;
            
            // Show modal
            elements.modelSelectorModal.classList.add('active');
            
            // Focus search input
            if (elements.modelSearchInput) {
                elements.modelSearchInput.value = '';
                elements.modelSearchInput.focus();
            }
            
            // Render all models initially
            filterAndRenderModels();
        });
    }

    function hideModal() {
        if (!elements.modelSelectorModal) return;
        elements.modelSelectorModal.classList.remove('active');
        
        // Clear search
        if (elements.modelSearchInput) {
            elements.modelSearchInput.value = '';
        }
        searchQuery = '';
        highlightedIndex = -1;
    }

    function setAvailableModels(models) {
        availableModels = models || [];
        if (elements.modelSelectorModal && elements.modelSelectorModal.classList.contains('active')) {
            filterAndRenderModels();
        }
    }

    async function loadAvailableModels() {
        try {
            // Get models from the model select dropdown if available (populated by ModelManager)
            const modelSelect = document.getElementById('model');
            if (modelSelect && modelSelect.options.length > 0) {
                const models = [];
                for (let i = 0; i < modelSelect.options.length; i++) {
                    const option = modelSelect.options[i];
                    if (option.value && option.value !== '') {
                        models.push(option.value);
                    }
                }
                availableModels = models;
            } else {
                // Fallback: try to fetch models using existing API
                const apiKey = window.StorageService?.getApiKey();
                const baseUrl = window.StorageService?.getBaseUrl();
                
                if (apiKey && window.ApiService?.fetchAvailableModels) {
                    const fetchedModels = await window.ApiService.fetchAvailableModels(apiKey, baseUrl);
                    availableModels = fetchedModels.map(model => model.id || model);
                } else {
                    // Last resort: use hardcoded models from ModelInfoService
                    availableModels = [
                        'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo',
                        'llama-3.1-8b-instant', 'llama-3.3-70b-versatile',
                        'claude-3-sonnet-20240229', 'claude-3-opus-20240229'
                    ];
                }
            }
        } catch (error) {
            console.error('Error loading available models:', error);
            // Use fallback models
            availableModels = [
                'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo',
                'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'
            ];
        }
    }

    function filterAndRenderModels() {
        // Filter models based on search query
        if (!searchQuery) {
            filteredModels = [...availableModels];
        } else {
            filteredModels = availableModels.filter(model => 
                model.toLowerCase().includes(searchQuery)
            );
        }

        // Sort by relevance (exact matches first, then prefix matches, then contains)
        if (searchQuery) {
            filteredModels.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                
                // Exact match
                if (aLower === searchQuery && bLower !== searchQuery) return -1;
                if (bLower === searchQuery && aLower !== searchQuery) return 1;
                
                // Prefix match
                const aStartsWith = aLower.startsWith(searchQuery);
                const bStartsWith = bLower.startsWith(searchQuery);
                if (aStartsWith && !bStartsWith) return -1;
                if (bStartsWith && !aStartsWith) return 1;
                
                // Length (shorter models first for similar matches)
                return a.length - b.length;
            });
        }

        renderModelList();
    }

    function renderModelList() {
        if (!elements.modelListContainer) return;

        elements.modelListContainer.innerHTML = '';

        if (filteredModels.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'model-item';
            noResults.innerHTML = '<div class="model-name">No models found</div>';
            elements.modelListContainer.appendChild(noResults);
            return;
        }

        filteredModels.forEach((model, index) => {
            const modelElement = createModelElement(model, index);
            elements.modelListContainer.appendChild(modelElement);
        });
    }

    function createModelElement(model, index) {
        const modelDiv = document.createElement('div');
        modelDiv.className = 'model-item';
        modelDiv.setAttribute('data-model', model);
        modelDiv.setAttribute('data-index', index);

        // Get context window info if available
        let contextInfo = '';
        if (window.ModelInfoService && window.ModelInfoService.getContextSize) {
            const contextSize = window.ModelInfoService.getContextSize(model);
            if (contextSize && contextSize > 0) {
                contextInfo = `${contextSize.toLocaleString()} tokens`;
            }
        }

        modelDiv.innerHTML = `
            <div class="model-name">${highlightMatch(model, searchQuery)}</div>
            ${contextInfo ? `<div class="model-context">${contextInfo}</div>` : ''}
        `;

        // Click handler
        modelDiv.addEventListener('click', () => selectModel(model));

        return modelDiv;
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function updateHighlight() {
        const modelItems = elements.modelListContainer.querySelectorAll('.model-item');
        
        modelItems.forEach((item, index) => {
            if (index === highlightedIndex) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    function scrollToHighlighted() {
        if (highlightedIndex < 0) return;
        
        const highlightedItem = elements.modelListContainer.querySelector('.model-item.highlighted');
        if (highlightedItem) {
            highlightedItem.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }

    function selectModel(model) {
        try {
            // Save the selected model using StorageService (which ModelManager uses)
            if (window.StorageService && window.StorageService.saveModel) {
                window.StorageService.saveModel(model);
            }

            // Update the model select dropdown if it exists
            const modelSelect = document.getElementById('model');
            if (modelSelect) {
                modelSelect.value = model;
                // Trigger change event to notify other components
                const changeEvent = new Event('change', { bubbles: true });
                modelSelect.dispatchEvent(changeEvent);
            }

            // Update the UI using ModelInfoDisplay
            if (window.ModelInfoDisplay && window.ModelInfoDisplay.updateModelInfoDisplay) {
                window.ModelInfoDisplay.updateModelInfoDisplay();
            }

            // Update context usage if chat manager is available
            if (window.aiHackare?.chatManager && window.aiHackare?.uiManager) {
                window.aiHackare.chatManager.estimateContextUsage(
                    window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                    model
                );
            }

            console.log('Model selected:', model);
        } catch (error) {
            console.error('Error selecting model:', error);
        }

        // Hide modal
        hideModal();
    }

    // Public API
    return {
        createModelSelectorModal
    };
})();