/**
 * Prompts Manager Module
 * Handles prompt configurator functionality and system prompt management for the AIHackare application
 */

window.PromptsManager = (function() {
    /**
     * Create a Prompts Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Prompts Manager instance
     */
    function createPromptsManager(elements) {
        // Current prompt being edited
        let currentPrompt = null;
        
        // Elements for prompt token usage bar
        let promptsUsageFill;
        let promptsUsageText;
        
        /**
         * Initialize the prompts manager
         */
        function init() {
            // Set up event listeners
            if (elements.promptsBtn) {
                elements.promptsBtn.addEventListener('click', showPromptsModal);
            }
            
            if (elements.closePromptsModal) {
                elements.closePromptsModal.addEventListener('click', hidePromptsModal);
            }
            
            if (elements.copySystemPromptBtn) {
                elements.copySystemPromptBtn.addEventListener('click', copySystemPromptToClipboard);
            }
            
            // Subscribe to system prompt updates for context usage updates
            if (window.UIUtils && window.UIUtils.EventBus) {
                window.UIUtils.EventBus.subscribe('systemPromptUpdated', (data) => {
                    updatePromptsTokenUsage();
                });
                
                window.UIUtils.EventBus.subscribe('promptSelectionChanged', () => {
                    updatePromptsTokenUsage();
                });
            }
            
            // Apply selected prompts as system prompt on initialization
            PromptsService.applySelectedPromptsAsSystem();
        }
        
        /**
         * Estimate token usage for selected prompts
         * @returns {number} - Percentage of context window used
         */
        function estimatePromptsTokenUsage() {
            const currentModel = StorageService.getModel();
            const usageInfo = ContextUsageService.getCurrentPromptsUsage(currentModel);
            return usageInfo.percentage;
        }
        
        /**
         * Update the prompts token usage bar
         */
        function updatePromptsTokenUsage() {
            if (!promptsUsageFill || !promptsUsageText) return;
            
            // Get token usage information from ContextUsageService
            const currentModel = StorageService.getModel();
            const usageInfo = ContextUsageService.getCurrentPromptsUsage(currentModel);
            
            // Update the percentage display
            ContextUsageService.updateUsageDisplay(promptsUsageFill, promptsUsageText, usageInfo.percentage);
            
            // Update the token count display
            const promptsUsageTokens = document.querySelector('.prompts-usage-tokens');
            if (promptsUsageTokens) {
                promptsUsageTokens.textContent = `${usageInfo.tokens}/${usageInfo.contextSize} tokens`;
            }
        }
        
        /**
         * Show the prompts modal
         */
        function showPromptsModal() {
            // Load prompts
            loadPromptsList();
            
            // Reset current prompt
            currentPrompt = null;
            
            // Show the modal
            if (elements.promptsModal) {
                elements.promptsModal.classList.add('active');
                
                // Update the main context usage display
                updateMainContextUsage();
            }
        }
        
        /**
         * Hide the prompts modal
         */
        function hidePromptsModal() {
            if (elements.promptsModal) {
                elements.promptsModal.classList.remove('active');
            }
            
            // Clear current prompt
            currentPrompt = null;
        }
        
/**
 * Load the prompts list
 */
function loadPromptsList() {
    if (!elements.promptsList) return;
    
    // Clear the list
    elements.promptsList.innerHTML = '';
    
    // Remove any existing token usage container
    const existingTokenUsageContainer = elements.promptsModal.querySelector('.prompts-token-usage-container');
    if (existingTokenUsageContainer) {
        existingTokenUsageContainer.remove();
    }
    
    // Create and insert token usage container
    const tokenUsageContainer = PromptsModalRenderer.renderTokenUsageContainer();
    const formHelpElement = elements.promptsModal.querySelector('.form-help');
    if (formHelpElement) {
        formHelpElement.insertAdjacentElement('afterend', tokenUsageContainer);
    }
    
    // Store references to the usage elements
    promptsUsageFill = tokenUsageContainer.querySelector('.prompts-usage-fill');
    promptsUsageText = tokenUsageContainer.querySelector('.prompts-usage-text');
    
    // Get and sort prompts
    let prompts = PromptsService.getPrompts();
    prompts.sort((a, b) => {
        const aName = a.name ? a.name.toLowerCase() : '';
        const bName = b.name ? b.name.toLowerCase() : '';
        return aName.localeCompare(bName);
    });
    
    const selectedPromptIds = PromptsService.getSelectedPromptIds();
    
    // Show "no prompts" message if needed
    if (prompts.length === 0) {
        const noPromptsMessage = PromptsModalRenderer.renderNoPromptsMessage();
        elements.promptsList.appendChild(noPromptsMessage);
    }
    
    // Render each prompt item
    prompts.forEach(prompt => {
        const isSelected = selectedPromptIds.includes(prompt.id);
        const isActive = currentPrompt && prompt.id === currentPrompt.id;
        const promptItem = PromptsModalRenderer.renderPromptItem(prompt, isSelected, isActive);
        
        // Bind event handlers
        bindPromptItemEvents(promptItem, prompt);
        
        elements.promptsList.appendChild(promptItem);
    });
    
    // Add default prompts section
    if (window.DefaultPromptsService) {
        renderDefaultPromptsSection();
    }
    
    // Add new prompt form
    const newPromptForm = PromptsModalRenderer.renderNewPromptForm();
    bindFormEvents(newPromptForm);
    elements.promptsList.appendChild(newPromptForm);
    
    // Update system prompt in settings
    const systemPrompt = StorageService.getSystemPrompt();
    if (elements.systemPromptInput && systemPrompt) {
        elements.systemPromptInput.value = systemPrompt;
    }
    
    // Update token usage
    updatePromptsTokenUsage();
}

/**
 * Bind event handlers to a prompt item
 * @param {HTMLElement} promptItem - Prompt item element
 * @param {Object} prompt - Prompt object
 */
function bindPromptItemEvents(promptItem, prompt) {
    const checkbox = promptItem.querySelector('.prompt-item-checkbox');
    const deleteBtn = promptItem.querySelector('.prompt-item-delete');
    
    // Checkbox handler
    if (checkbox) {
        const checkboxHandler = PromptsEventHandlers.createCheckboxHandler(
            prompt.id, 
            false, 
            () => {
                updatePromptsTokenUsage();
                updateMainContextUsage();
            }
        );
        checkbox.addEventListener('click', checkboxHandler);
    }
    
    // Delete handler
    if (deleteBtn) {
        const deleteHandler = PromptsEventHandlers.createDeleteHandler(
            prompt.id,
            prompt.name,
            (deletedId) => {
                if (currentPrompt && currentPrompt.id === deletedId) {
                    currentPrompt = null;
                }
                loadPromptsList();
            }
        );
        deleteBtn.addEventListener('click', deleteHandler);
    }
    
    // Edit handler
    const editHandler = PromptsEventHandlers.createPromptEditHandler(
        prompt,
        promptItem,
        (selectedPrompt) => {
            currentPrompt = selectedPrompt;
            if (selectedPrompt) {
                // Load prompt into editor
                const labelField = document.getElementById('new-prompt-label');
                const contentField = document.getElementById('new-prompt-content');
                
                if (labelField && contentField) {
                    labelField.value = selectedPrompt.name || '';
                    contentField.value = selectedPrompt.content || '';
                }
            }
        }
    );
    promptItem.addEventListener('click', editHandler);
}

/**
 * Render the default prompts section
 */
function renderDefaultPromptsSection() {
    const defaultPrompts = window.DefaultPromptsService.getDefaultPrompts();
    const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
    
    const defaultPromptsSection = PromptsModalRenderer.renderDefaultPromptsSection(defaultPrompts, selectedIds);
    
    // Bind event handlers for the main section
    const sectionHeader = defaultPromptsSection.querySelector('.default-prompts-header');
    const sectionContent = defaultPromptsSection.querySelector('.default-prompts-list');
    
    if (sectionHeader && sectionContent) {
        const toggleHandler = PromptsEventHandlers.createSectionToggleHandler(
            sectionHeader,
            sectionContent,
            (isExpanded) => {
                if (isExpanded) {
                    updateMainContextUsage();
                }
            }
        );
        sectionHeader.addEventListener('click', toggleHandler);
    }
    
    // Bind events for default prompt items
    bindDefaultPromptEvents(defaultPromptsSection);
    
    elements.promptsList.appendChild(defaultPromptsSection);
}

/**
 * Bind events for default prompt items
 * @param {HTMLElement} container - Container element
 */
function bindDefaultPromptEvents(container) {
    const defaultPromptItems = container.querySelectorAll('.default-prompt-item');
    
    defaultPromptItems.forEach(item => {
        const promptId = item.dataset.id;
        const checkbox = item.querySelector('.prompt-item-checkbox');
        const nameElement = item.querySelector('.prompt-item-name');
        const infoBtn = item.querySelector('.prompt-item-info');
        
        // Find prompt object
        const allDefaultPrompts = getAllFlatDefaultPrompts();
        const prompt = allDefaultPrompts.find(p => p.id === promptId);
        
        if (!prompt) return;
        
        // Checkbox handler
        if (checkbox) {
            const checkboxHandler = PromptsEventHandlers.createCheckboxHandler(
                promptId,
                true,
                () => {
                    updatePromptsTokenUsage();
                    updateMainContextUsage();
                }
            );
            checkbox.addEventListener('click', checkboxHandler);
        }
        
        // Name click handler for viewing content
        if (nameElement) {
            const viewHandler = PromptsEventHandlers.createDefaultPromptViewHandler(
                prompt,
                (selectedPrompt) => {
                    // Load prompt content into editor fields (read-only)
                    const labelField = document.getElementById('new-prompt-label');
                    const contentField = document.getElementById('new-prompt-content');
                    
                    if (labelField && contentField) {
                        labelField.value = selectedPrompt.name || '';
                        
                        // Handle dynamic content for Function Library
                        let contentValue = '';
                        if (selectedPrompt.id === 'function-library' && 
                            window.FunctionLibraryPrompt && 
                            typeof window.FunctionLibraryPrompt.content === 'function') {
                            contentValue = window.FunctionLibraryPrompt.content();
                        } else {
                            contentValue = selectedPrompt.content || '';
                        }
                        
                        contentField.value = contentValue;
                        
                        // Make fields temporarily read-only
                        labelField.setAttribute('readonly', 'readonly');
                        contentField.setAttribute('readonly', 'readonly');
                        
                        updateMainContextUsage();
                        
                        // Remove readonly after click elsewhere
                        setTimeout(() => {
                            document.addEventListener('click', function removeReadonly(e) {
                                if (!e.target.closest('.new-prompt-section')) {
                                    labelField.removeAttribute('readonly');
                                    contentField.removeAttribute('readonly');
                                    document.removeEventListener('click', removeReadonly);
                                }
                            });
                        }, 100);
                    }
                }
            );
            nameElement.addEventListener('click', viewHandler);
        }
        
        // Info button handler
        if (infoBtn) {
            const infoHandler = PromptsEventHandlers.createInfoHandler(prompt, infoBtn);
            infoBtn.addEventListener('click', infoHandler);
        }
    });
    
    // Bind nested section toggle handlers
    const nestedSections = container.querySelectorAll('.nested-section');
    nestedSections.forEach(section => {
        const header = section.querySelector('.nested-section-header');
        const content = section.querySelector('.nested-section-list');
        
        if (header && content) {
            const toggleHandler = PromptsEventHandlers.createSectionToggleHandler(
                header,
                content,
                (isExpanded) => {
                    // Special handling for Code section
                    const titleElement = header.querySelector('h4');
                    if (isExpanded && titleElement && titleElement.textContent === 'Code') {
                        updateMainContextUsage();
                    }
                }
            );
            header.addEventListener('click', toggleHandler);
        }
    });
}

/**
 * Get all default prompts flattened (including nested items)
 * @returns {Array} Flattened array of default prompts
 */
function getAllFlatDefaultPrompts() {
    const defaultPrompts = window.DefaultPromptsService.getDefaultPrompts();
    const flatPrompts = [];
    
    defaultPrompts.forEach(prompt => {
        if (prompt.isSection && prompt.items) {
            flatPrompts.push(...prompt.items);
        } else {
            flatPrompts.push(prompt);
        }
    });
    
    return flatPrompts;
}

/**
 * Bind events for the new prompt form
 * @param {HTMLElement} form - Form element
 */
function bindFormEvents(form) {
    const clearBtn = form.querySelector('.new-prompt-clear');
    const saveBtn = form.querySelector('.new-prompt-save');
    
    if (clearBtn) {
        const clearHandler = PromptsEventHandlers.createClearHandler(() => {
            currentPrompt = null;
        });
        clearBtn.addEventListener('click', clearHandler);
    }
    
    if (saveBtn) {
        const saveHandler = PromptsEventHandlers.createSaveHandler((promptData) => {
            // Create or update prompt
            const promptToSave = {
                id: currentPrompt ? currentPrompt.id : null,
                name: promptData.name,
                content: promptData.content
            };
            
            // Save the prompt
            const savedPrompt = PromptsService.savePrompt(promptToSave);
            currentPrompt = null;
            
            // Clear form and reload
            const labelField = document.getElementById('new-prompt-label');
            const contentField = document.getElementById('new-prompt-content');
            if (labelField) labelField.value = '';
            if (contentField) contentField.value = '';
            
            loadPromptsList();
            
            // Apply selected prompts as system prompt
            PromptsService.applySelectedPromptsAsSystem();
            updateMainContextUsage();
        });
        saveBtn.addEventListener('click', saveHandler);
    }
}


        
        /**
         * Create a new prompt
         */
        function createNewPrompt() {
            // Focus the new prompt label field
            const labelField = document.getElementById('new-prompt-label');
            if (labelField) {
                labelField.focus();
            }
        }
        
        /**
         * Update the main context usage display in the header
         * Emits event for other components to handle
         */
        function updateMainContextUsage() {
            // Emit event for other components to handle context updates
            if (window.UIUtils && window.UIUtils.EventBus) {
                window.UIUtils.EventBus.emit('contextUsageUpdateRequested', {
                    source: 'prompts-manager'
                });
            }
        }
        
        /**
         * Copy the current system prompt to clipboard
         */
        function copySystemPromptToClipboard() {
            try {
                // Get system prompt from SystemPromptCoordinator
                const systemPrompt = window.SystemPromptCoordinator ? 
                    window.SystemPromptCoordinator.assembleSystemPrompt() : '';
                
                if (!systemPrompt || systemPrompt.trim() === '') {
                    alert('No prompts are currently selected. Select some prompts to copy the system prompt.');
                    return;
                }
                
                // Copy to clipboard
                navigator.clipboard.writeText(systemPrompt).then(() => {
                    // Show success feedback
                    const btn = elements.copySystemPromptBtn;
                    if (btn) {
                        const originalIcon = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i>';
                        btn.classList.add('success');
                        
                        setTimeout(() => {
                            btn.innerHTML = originalIcon;
                            btn.classList.remove('success');
                        }, 2000);
                    }
                    
                    console.log('System prompt copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy system prompt to clipboard:', err);
                    alert('Failed to copy to clipboard. Please try again.');
                });
            } catch (error) {
                console.error('Error copying system prompt:', error);
                alert('Failed to copy to clipboard. Please try again.');
            }
        }
        
        /**
         * Update the system prompt input in settings
         * @param {string} systemPrompt - The system prompt to set
         */
        function updateSystemPromptInput(systemPrompt) {
            if (elements.systemPromptInput) {
                const promptContent = systemPrompt || (window.SystemPromptCoordinator ? 
                    window.SystemPromptCoordinator.assembleSystemPrompt() : '');
                elements.systemPromptInput.value = promptContent;
            }
        }
        
        // Public API
        return {
            init,
            showPromptsModal,
            hidePromptsModal,
            loadPromptsList,
            updateSystemPromptInput
        };
    }
    
    // Public API
    return {
        createPromptsManager
    };
})();
