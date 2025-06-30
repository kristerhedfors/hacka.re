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
    
    // Cache for models by provider (baseUrl + apiKey combination)
    let modelsCache = new Map();
    let isFirstLoad = true;

    function createModelSelectorModal(domElements) {
        elements = domElements;
        attachEventListeners();
        setupModelUpdateListener();
        return {
            show: showModal,
            hide: hideModal,
            setModels: setAvailableModels,
            clearCache: clearModelsCache
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

    async function showModal() {
        if (!elements.modelSelectorModal) return;

        // Reset search state
        searchQuery = '';
        highlightedIndex = -1;
        
        // Show modal immediately
        elements.modelSelectorModal.classList.add('active');
        
        // Focus search input
        if (elements.modelSearchInput) {
            elements.modelSearchInput.value = '';
            elements.modelSearchInput.focus();
        }
        
        // Show loading state
        if (elements.modelListContainer) {
            elements.modelListContainer.innerHTML = '<div class="model-item"><div class="model-name">Loading models...</div></div>';
        }

        try {
            // Clear cache to force fresh check of dropdown
            console.log('Clearing cache to check for fresh models');
            modelsCache.clear();
            
            // Load available models (fresh from dropdown or API)
            await loadAvailableModels();
            
            // Render all models
            filterAndRenderModels();
        } catch (error) {
            console.error('Error loading models:', error);
            if (elements.modelListContainer) {
                elements.modelListContainer.innerHTML = '<div class="model-item"><div class="model-name">Error loading models</div></div>';
            }
        }
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

    function getCacheKey() {
        const apiKey = window.StorageService?.getApiKey();
        const baseUrl = window.StorageService?.getBaseUrl();
        // Include timestamp to force cache refresh when models are updated
        const modelSelect = document.getElementById('model-select');
        const dropdownCount = modelSelect ? modelSelect.options.length : 0;
        return `${baseUrl || 'default'}:${apiKey ? apiKey.substring(0, 10) : 'no-key'}:${dropdownCount}`;
    }

    function loadAvailableModels() {
        const cacheKey = getCacheKey();
        
        // Check cache first
        if (modelsCache.has(cacheKey)) {
            console.log('Using cached models for provider');
            availableModels = modelsCache.get(cacheKey);
            return Promise.resolve();
        }

        // FIRST: Try to get models from the model select dropdown (most reliable)
        const modelSelect = document.getElementById('model-select');
        console.log('Debug dropdown:', modelSelect ? `${modelSelect.options.length} options` : 'not found');
        
        if (modelSelect && modelSelect.options.length > 1) {
            const models = [];
            console.log('Dropdown options:');
            for (let i = 0; i < modelSelect.options.length; i++) {
                const option = modelSelect.options[i];
                console.log(`  ${i}: "${option.value}" - "${option.textContent}" (disabled: ${option.disabled})`);
                
                if (option.value && option.value !== '' && 
                    !option.disabled && 
                    !option.textContent.includes('Loading') && 
                    !option.textContent.includes('Failed to fetch') &&
                    !option.textContent.includes('check API key')) {
                    models.push(option.value);
                }
            }
            
            console.log(`Found ${models.length} valid models in dropdown`);
            if (models.length > 2) { // Need more than a couple options to be sure it's populated
                availableModels = models;
                // Cache the models from dropdown
                modelsCache.set(cacheKey, models);
                console.log(`Using ${models.length} models from populated dropdown`);
                return Promise.resolve();
            }
        }

        // SECOND: Try API fetch if running from HTTP server and have API key
        return new Promise(async (resolve) => {
            try {
                const apiKey = window.StorageService?.getApiKey();
                const baseUrl = window.StorageService?.getBaseUrl();
                
                if (apiKey && window.ApiService?.fetchAvailableModels && window.location.protocol !== 'file:') {
                    console.log('Fetching models from API...');
                    const fetchedModels = await window.ApiService.fetchAvailableModels(apiKey, baseUrl);
                    
                    if (fetchedModels && Array.isArray(fetchedModels)) {
                        const models = fetchedModels.map(model => model.id || model);
                        availableModels = models;
                        modelsCache.set(cacheKey, models);
                        console.log(`Fetched and cached ${models.length} models from API`);
                        resolve();
                        return;
                    }
                }
            } catch (error) {
                console.log('API fetch failed, using fallback models');
            }

            // THIRD: Fallback to default models
            const hasApiKey = window.StorageService?.getApiKey();
            if (!hasApiKey) {
                availableModels = [
                    '⚠️ Set API key in Settings to see your models',
                    'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'
                ];
            } else {
                availableModels = [
                    '⚠️ Run from HTTP server for full model list',
                    'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'
                ];
            }
            modelsCache.set(cacheKey, availableModels);
            resolve();
        });
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

        // Click handler - only allow selection of actual models (not warnings)
        if (!model.includes('⚠️') && !model.includes('❌')) {
            modelDiv.addEventListener('click', () => selectModel(model));
        } else {
            modelDiv.style.cursor = 'default';
            modelDiv.style.opacity = '0.7';
        }

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
            const modelSelect = document.getElementById('model-select');
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

    function clearModelsCache() {
        modelsCache.clear();
        console.log('Model cache cleared');
    }

    // Listen for model updates from the settings system
    function setupModelUpdateListener() {
        // Clear cache when models are successfully fetched by settings
        document.addEventListener('models-updated', function() {
            console.log('Models updated event received, clearing cache');
            clearModelsCache();
        });
    }

    // Public API
    return {
        createModelSelectorModal
    };
})();