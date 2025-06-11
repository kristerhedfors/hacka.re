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
                () => updateAfterSelectionChange()
            );
            checkbox.addEventListener('change', checkboxHandler);
        }
        
        // Delete button handler
        if (deleteBtn) {
            const deleteHandler = PromptsEventHandlers.createDeleteHandler(
                prompt,
                () => reloadPromptsList()
            );
            deleteBtn.addEventListener('click', deleteHandler);
        }
        
        // Click handler for item selection
        const clickHandler = PromptsEventHandlers.createItemClickHandler(
            prompt,
            (selectedPrompt) => setCurrentPrompt(selectedPrompt)
        );
        promptItem.addEventListener('click', clickHandler);
    }
    
    /**
     * Bind form events for new prompt creation
     * @param {HTMLElement} formElement - Form element
     */
    function bindFormEvents(formElement) {
        const form = formElement.querySelector('.new-prompt-form');
        if (form) {
            const submitHandler = PromptsEventHandlers.createFormSubmitHandler(
                () => reloadPromptsList()
            );
            form.addEventListener('submit', submitHandler);
        }
    }
    
    /**
     * Render default prompts section
     * @param {Object} elements - DOM elements
     */
    function renderDefaultPromptsSection(elements) {
        const defaultPromptsSection = PromptsModalRenderer.renderDefaultPromptsSection();
        elements.promptsList.appendChild(defaultPromptsSection);
        
        // Bind default prompts events
        const defaultPromptsContainer = defaultPromptsSection.querySelector('.default-prompts-container');
        if (defaultPromptsContainer) {
            const defaultPrompts = DefaultPromptsService.getDefaultPrompts();
            
            defaultPrompts.forEach(defaultPrompt => {
                const promptElement = defaultPromptsContainer.querySelector(`[data-prompt-id="${defaultPrompt.id}"]`);
                if (promptElement) {
                    const addHandler = PromptsEventHandlers.createDefaultPromptAddHandler(
                        defaultPrompt,
                        () => reloadPromptsList()
                    );
                    promptElement.addEventListener('click', addHandler);
                }
            });
        }
    }
    
    // Callback functions (to be set by parent manager)
    let updateAfterSelectionChange = () => {};
    let reloadPromptsList = () => {};
    let setCurrentPrompt = () => {};
    
    /**
     * Set callback functions
     * @param {Object} callbacks - Callback functions
     */
    function setCallbacks(callbacks) {
        updateAfterSelectionChange = callbacks.updateAfterSelectionChange || updateAfterSelectionChange;
        reloadPromptsList = callbacks.reloadPromptsList || reloadPromptsList;
        setCurrentPrompt = callbacks.setCurrentPrompt || setCurrentPrompt;
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