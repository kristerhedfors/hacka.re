/**
 * PromptsListManager - Handles prompt list rendering and management
 */
function createPromptsListManager() {
    
    /**
     * Load and render the prompts list
     * @param {Object} elements - DOM elements
     * @param {Object|null} currentPrompt - Currently active prompt
     * @returns {Object} References to usage elements
     */
    function loadPromptsList(elements, currentPrompt = null) {
        if (!elements.promptsList) return {};
        
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
        const promptsUsageFill = tokenUsageContainer.querySelector('.prompts-usage-fill');
        const promptsUsageText = tokenUsageContainer.querySelector('.prompts-usage-text');
        
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
            renderDefaultPromptsSection(elements);
        }
        
        // Add new prompt form
        const newPromptForm = PromptsModalRenderer.renderNewPromptForm();
        bindFormEvents(newPromptForm);
        elements.promptsList.appendChild(newPromptForm);
        
        // If there's a current prompt being edited, populate the form fields
        if (currentPrompt && !currentPrompt.isDefault) {
            setTimeout(() => {
                const labelField = document.getElementById('new-prompt-label');
                const contentField = document.getElementById('new-prompt-content');
                
                if (labelField && contentField) {
                    labelField.value = currentPrompt.name || '';
                    contentField.value = currentPrompt.content || '';
                    
                    // Remove readonly attributes for user prompts
                    labelField.removeAttribute('readonly');
                    contentField.removeAttribute('readonly');
                    
                    // Scroll to the form fields
                    contentField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100); // Small delay to ensure the form is fully rendered
        }
        
        return { promptsUsageFill, promptsUsageText };
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
                false, // isDefault = false for user prompts
                () => updateAfterSelectionChange()
            );
            checkbox.addEventListener('change', checkboxHandler);
        }
        
        // Delete button handler
        if (deleteBtn) {
            const deleteHandler = PromptsEventHandlers.createDeleteHandler(
                prompt.id,
                prompt.name,
                () => reloadPromptsList()
            );
            deleteBtn.addEventListener('click', deleteHandler);
        }
        
        // Click handler for editing prompt
        const editHandler = PromptsEventHandlers.createPromptEditHandler(
            prompt,
            promptItem,
            (editedPrompt) => {
                if (editedPrompt) {
                    setCurrentPrompt(editedPrompt);
                } else {
                    // Edit was cancelled
                    setCurrentPrompt(null);
                }
            }
        );
        promptItem.addEventListener('click', editHandler);
    }
    
    /**
     * Bind form events for new prompt creation
     * @param {HTMLElement} formElement - Form element
     */
    function bindFormEvents(formElement) {
        // Bind save button
        const saveButton = formElement.querySelector('.new-prompt-save');
        if (saveButton) {
            const saveHandler = PromptsEventHandlers.createSaveHandler(() => {
                // Get form values
                const labelField = formElement.querySelector('#new-prompt-label');
                const contentField = formElement.querySelector('#new-prompt-content');
                
                if (labelField && contentField && labelField.value.trim() && contentField.value.trim()) {
                    // Check if we're editing an existing prompt
                    const editingPrompt = getCurrentPrompt();
                    
                    if (editingPrompt && !editingPrompt.isDefault) {
                        // Update existing prompt
                        editingPrompt.name = labelField.value.trim();
                        editingPrompt.content = contentField.value.trim();
                        
                        // Update in prompts service
                        window.PromptsService.savePrompt(editingPrompt);
                        
                        // Clear current prompt
                        setCurrentPrompt(null);
                    } else {
                        // Create new prompt object
                        const newPrompt = {
                            id: 'user_' + Date.now(),
                            name: labelField.value.trim(),
                            content: contentField.value.trim(),
                            isDefault: false
                        };
                        
                        // Add to prompts service
                        window.PromptsService.savePrompt(newPrompt);
                    }
                    
                    // Clear form
                    labelField.value = '';
                    contentField.value = '';
                    labelField.removeAttribute('readonly');
                    contentField.removeAttribute('readonly');
                    
                    // Reload prompts list
                    if (reloadPromptsList) {
                        reloadPromptsList();
                    }
                    
                    // Update context usage
                    if (updateAfterSelectionChange) {
                        updateAfterSelectionChange();
                    }
                }
            });
            saveButton.addEventListener('click', saveHandler);
        }
        
        // Bind clear button
        const clearButton = formElement.querySelector('.new-prompt-clear');
        if (clearButton) {
            const clearHandler = PromptsEventHandlers.createClearHandler(() => {
                const labelField = formElement.querySelector('#new-prompt-label');
                const contentField = formElement.querySelector('#new-prompt-content');
                
                if (labelField) labelField.value = '';
                if (contentField) contentField.value = '';
            });
            clearButton.addEventListener('click', clearHandler);
        }
    }
    
    /**
     * Render default prompts section
     * @param {Object} elements - DOM elements
     */
    function renderDefaultPromptsSection(elements) {
        // Get default prompts and selected IDs first
        const defaultPrompts = DefaultPromptsService.getDefaultPrompts();
        const selectedIds = PromptsService.getSelectedPromptIds();
        
        const defaultPromptsSection = PromptsModalRenderer.renderDefaultPromptsSection(defaultPrompts, selectedIds);
        elements.promptsList.appendChild(defaultPromptsSection);
        
        // Bind default prompts events
        const defaultPromptsContainer = defaultPromptsSection.querySelector('.default-prompts-list');
        if (defaultPromptsContainer) {
            
            // Function to bind events for a prompt item
            const bindPromptEvents = (prompt) => {
                const promptElement = defaultPromptsSection.querySelector(`[data-prompt-id="${prompt.id}"]`);
                if (promptElement) {
                    // Bind checkbox handler for selection
                    const checkbox = promptElement.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        const checkboxHandler = PromptsEventHandlers.createCheckboxHandler(
                            prompt.id,
                            true, // isDefault = true for default prompts
                            () => {
                                // Update context usage after selection change
                                if (updateAfterSelectionChange) {
                                    updateAfterSelectionChange();
                                }
                            }
                        );
                        checkbox.addEventListener('change', checkboxHandler);
                    }
                    
                    // Bind prompt name click handler for viewing content
                    const promptName = promptElement.querySelector('.prompt-item-name');
                    if (promptName) {
                        const viewHandler = PromptsEventHandlers.createDefaultPromptViewHandler(
                            prompt,
                            (viewedPrompt) => {
                                // Load prompt content into the new prompt form editor
                                const labelField = document.getElementById('new-prompt-label');
                                const contentField = document.getElementById('new-prompt-content');
                                
                                if (labelField && contentField) {
                                    labelField.value = viewedPrompt.name || '';
                                    contentField.value = viewedPrompt.content || '';
                                    
                                    // Make fields read-only when viewing default prompts
                                    labelField.setAttribute('readonly', 'readonly');
                                    contentField.setAttribute('readonly', 'readonly');
                                    
                                    // Scroll to the form fields so they're visible
                                    contentField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }
                        );
                        promptName.addEventListener('click', viewHandler);
                    }
                    
                    // Bind info button handler
                    const infoButton = promptElement.querySelector('.prompt-item-info');
                    if (infoButton) {
                        const infoHandler = PromptsEventHandlers.createInfoHandler(prompt, infoButton);
                        infoButton.addEventListener('click', infoHandler);
                    }
                }
            };
            
            // Bind events for all prompts (including nested ones)
            defaultPrompts.forEach(defaultPrompt => {
                if (defaultPrompt.isSection && defaultPrompt.items) {
                    // Bind events for items in nested sections
                    defaultPrompt.items.forEach(bindPromptEvents);
                } else {
                    // Bind events for top-level prompts
                    bindPromptEvents(defaultPrompt);
                }
            });
        }
        
        // Bind expand/collapse events for section headers
        const sectionHeaders = defaultPromptsSection.querySelectorAll('.default-prompts-header, .nested-section-header');
        sectionHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Find the corresponding list container
                let listContainer;
                if (header.classList.contains('default-prompts-header')) {
                    listContainer = defaultPromptsSection.querySelector('.default-prompts-list');
                } else {
                    // For nested sections, find the next sibling list
                    listContainer = header.nextElementSibling;
                    while (listContainer && !listContainer.classList.contains('nested-section-list')) {
                        listContainer = listContainer.nextElementSibling;
                    }
                }
                
                if (listContainer) {
                    const isExpanded = listContainer.style.display !== 'none';
                    listContainer.style.display = isExpanded ? 'none' : 'block';
                    
                    // Update icon
                    const icon = header.querySelector('i');
                    if (icon) {
                        icon.className = isExpanded ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
                    }
                }
            });
        });
    }
    
    // Callback functions (to be set by parent manager)
    let updateAfterSelectionChange = () => {};
    let reloadPromptsList = () => {};
    let setCurrentPrompt = () => {};
    let getCurrentPrompt = () => null;
    
    /**
     * Set callback functions
     * @param {Object} callbacks - Callback functions
     */
    function setCallbacks(callbacks) {
        updateAfterSelectionChange = callbacks.updateAfterSelectionChange || updateAfterSelectionChange;
        reloadPromptsList = callbacks.reloadPromptsList || reloadPromptsList;
        setCurrentPrompt = callbacks.setCurrentPrompt || setCurrentPrompt;
        getCurrentPrompt = callbacks.getCurrentPrompt || getCurrentPrompt;
    }
    
    return {
        loadPromptsList,
        bindPromptItemEvents,
        bindFormEvents,
        renderDefaultPromptsSection,
        setCallbacks
    };
}

window.PromptsListManager = createPromptsListManager();