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
            
            // Apply selected prompts as system prompt on initialization
            PromptsService.applySelectedPromptsAsSystem();
        }
        
        /**
         * Estimate token usage for selected prompts
         * @returns {number} - Percentage of context window used
         */
        function estimatePromptsTokenUsage() {
            const selectedPrompts = PromptsService.getSelectedPrompts();
            const selectedDefaultPrompts = window.DefaultPromptsService ? 
                window.DefaultPromptsService.getSelectedDefaultPrompts() : [];
            
            const allSelectedPrompts = [...selectedDefaultPrompts, ...selectedPrompts];
            
            // If no prompts selected, return 0
            if (allSelectedPrompts.length === 0) {
                return 0;
            }
            
            // Combine all selected prompts content
            const combinedContent = allSelectedPrompts
                .map(prompt => prompt.content)
                .join('\n\n---\n\n');
            
            // Estimate token count (4 chars per token is a rough approximation)
            const totalChars = combinedContent.length;
            const estimatedTokens = Math.ceil(totalChars / 4);
            
            // Get context window size for the current model
            const currentModel = StorageService.getModel();
            const modelInfo = window.ModelInfoService.modelInfo;
            let contextSize = 8192; // Default to 8K if not specified
            
            if (modelInfo[currentModel]) {
                // Get context_window property from model info
                if (modelInfo[currentModel].context_window) {
                    contextSize = modelInfo[currentModel].context_window;
                } else if (modelInfo[currentModel].contextWindow && modelInfo[currentModel].contextWindow !== '-') {
                    // Fallback to contextWindow property if available
                    // Parse context window size (e.g., "128K" -> 131072)
                    const sizeStr = String(modelInfo[currentModel].contextWindow);
                    if (sizeStr.toLowerCase && sizeStr.toLowerCase().endsWith('k')) {
                        contextSize = parseInt(sizeStr) * 1024;
                    } else {
                        contextSize = parseInt(String(sizeStr).replace(/,/g, ''));
                    }
                }
            }
            
            // Calculate percentage
            return Math.min(Math.round((estimatedTokens / contextSize) * 100), 100);
        }
        
        /**
         * Update the prompts token usage bar
         */
        function updatePromptsTokenUsage() {
            if (!promptsUsageFill || !promptsUsageText) return;
            
            const percentage = estimatePromptsTokenUsage();
            UIUtils.updateContextUsage(promptsUsageFill, promptsUsageText, percentage);
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
    
    // Add token usage bar
    const tokenUsageContainer = document.createElement('div');
    tokenUsageContainer.className = 'prompts-token-usage-container';
    tokenUsageContainer.innerHTML = `
        <div class="prompts-token-usage-label">
            Context usage: <span class="prompts-usage-text">0%</span>
        </div>
        <div class="prompts-usage-bar">
            <div class="prompts-usage-fill" style="width: 0%"></div>
        </div>
    `;
    elements.promptsList.appendChild(tokenUsageContainer);
    
    // Store references to the usage elements
    promptsUsageFill = tokenUsageContainer.querySelector('.prompts-usage-fill');
    promptsUsageText = tokenUsageContainer.querySelector('.prompts-usage-text');
    
    // Add default prompts section if DefaultPromptsService is available
    if (window.DefaultPromptsService) {
        addDefaultPromptsSection();
    }
    
    // Get all prompts
    let prompts = PromptsService.getPrompts();
    
    // Sort prompts alphabetically by name
    prompts.sort((a, b) => {
        const aName = a.name ? a.name.toLowerCase() : '';
        const bName = b.name ? b.name.toLowerCase() : '';
        return aName.localeCompare(bName);
    });
    
    // Get selected prompt IDs
    const selectedPromptIds = PromptsService.getSelectedPromptIds();
    
    if (prompts.length === 0) {
        // Show a message if no prompts
        const noPromptsMessage = document.createElement('div');
        noPromptsMessage.className = 'no-prompts-message';
        noPromptsMessage.textContent = 'No saved prompts. Create one below.';
        elements.promptsList.appendChild(noPromptsMessage);
        // Don't return early, continue to add the new prompt section
    }
    
    // Add each prompt to the list
    prompts.forEach(prompt => {
        const promptItem = document.createElement('div');
        promptItem.className = 'prompt-item';
        promptItem.dataset.id = prompt.id;
        
        // Add active class if this is the current prompt
        if (currentPrompt && prompt.id === currentPrompt.id) {
            promptItem.classList.add('active');
        }
        
        // Create checkbox for selecting the prompt
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'prompt-item-checkbox';
        checkbox.checked = selectedPromptIds.includes(prompt.id);
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the prompt item click
            console.log("Regular prompt checkbox clicked:", prompt.id);
            PromptsService.togglePromptSelection(prompt.id);
            PromptsService.applySelectedPromptsAsSystem();
            updatePromptsTokenUsage(); // Update token usage bar
            
            // Get all selected prompts
            const selectedDefaultPrompts = DefaultPromptsService.getSelectedDefaultPrompts();
            const selectedPrompts = PromptsService.getSelectedPrompts();
            const allSelectedPrompts = [...selectedDefaultPrompts, ...selectedPrompts];
            
            // Combine all selected prompts
            const combinedContent = allSelectedPrompts
                .map(prompt => prompt.content)
                .join('\n\n---\n\n');
            
            // Get current messages
            const messages = window.aiHackare && window.aiHackare.chatManager ? 
                window.aiHackare.chatManager.getMessages() || [] : [];
            
            // Get current model
            const currentModel = window.aiHackare && window.aiHackare.settingsManager ? 
                window.aiHackare.settingsManager.getCurrentModel() : '';
            
            // Calculate usage info directly
            const usageInfo = UIUtils.estimateContextUsage(
                messages, 
                ModelInfoService.modelInfo, 
                currentModel,
                combinedContent
            );
            
            console.log("Direct calculation - percentage:", usageInfo.percentage);
            
            // Update the UI directly
            const usageFill = document.querySelector('.usage-fill');
            const usageText = document.querySelector('.usage-text');
            
            if (usageFill && usageText) {
                console.log("Directly updating main UI elements from checkbox handler");
                UIUtils.updateContextUsage(usageFill, usageText, usageInfo.percentage);
            } else {
                console.log("Could not find main UI elements");
            }
        });
        promptItem.appendChild(checkbox);
        
        // Create prompt name element
        const promptName = document.createElement('div');
        promptName.className = 'prompt-item-name';
        promptName.textContent = prompt.name || 'Unnamed Prompt';
        promptItem.appendChild(promptName);
        
        // Add delete icon
        const deleteIcon = document.createElement('button');
        deleteIcon.className = 'prompt-item-delete';
        deleteIcon.innerHTML = '<i class="fas fa-trash"></i>';
        deleteIcon.title = 'Delete prompt';
        deleteIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the prompt item click
            if (confirm(`Are you sure you want to delete the prompt "${prompt.name}"?`)) {
                PromptsService.deletePrompt(prompt.id);
                
                // Clear current prompt if this was the selected one
                if (currentPrompt && currentPrompt.id === prompt.id) {
                    currentPrompt = null;
                }
                
                // Reload prompts list
                loadPromptsList();
            }
        });
        promptItem.appendChild(deleteIcon);
        
        // Add click event to highlight the prompt and load it into the editor
        promptItem.addEventListener('click', (e) => {
            // Don't trigger if clicking on the checkbox or delete icon
            if (e.target !== checkbox && !e.target.closest('.prompt-item-delete')) {
                // Toggle active class
                const isActive = promptItem.classList.contains('active');
                
                // Remove active class from all items
                const promptItems = elements.promptsList.querySelectorAll('.prompt-item');
                promptItems.forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active class to this item if it wasn't already active
                if (!isActive) {
                    promptItem.classList.add('active');
                    currentPrompt = prompt;
                    
                    // Load the prompt into the editor fields
                    const labelField = document.getElementById('new-prompt-label');
                    const contentField = document.getElementById('new-prompt-content');
                    
                    if (labelField && contentField) {
                        labelField.value = prompt.name || '';
                        contentField.value = prompt.content || '';
                    }
                } else {
                    currentPrompt = null;
                }
            }
        });
        
        elements.promptsList.appendChild(promptItem);
    });
            
    // Add new prompt input fields at the bottom
    const newPromptSection = document.createElement('div');
    newPromptSection.className = 'new-prompt-section';
            
            // Add label field
            const labelField = document.createElement('input');
            labelField.type = 'text';
            labelField.className = 'new-prompt-label';
            labelField.placeholder = 'New prompt label';
            labelField.id = 'new-prompt-label';
            
            // Add content field
            const contentField = document.createElement('textarea');
            contentField.className = 'new-prompt-content';
            contentField.placeholder = 'Enter new prompt content here';
            contentField.id = 'new-prompt-content';
            contentField.rows = 6;
            
            // Add button container for clear and save buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'new-prompt-buttons';
            
                // Add clear button
                const clearButton = document.createElement('button');
                clearButton.className = 'btn secondary-btn new-prompt-clear';
                clearButton.textContent = 'Clear';
                clearButton.addEventListener('click', () => {
                    // Clear without confirmation
                    labelField.value = '';
                    contentField.value = '';
                    
                    // Remove active class from all items
                    const promptItems = elements.promptsList.querySelectorAll('.prompt-item');
                    promptItems.forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    currentPrompt = null;
                });
            
            // Add save button
            const saveButton = document.createElement('button');
            saveButton.className = 'btn primary-btn new-prompt-save';
            saveButton.textContent = 'Save Prompt';
            saveButton.addEventListener('click', () => {
                const name = labelField.value.trim();
                const content = contentField.value.trim();
                
                if (!name || !content) {
                    alert('Please enter both a label and content for the prompt.');
                    return;
                }
                
                // Create or update prompt
                const promptToSave = {
                    id: currentPrompt ? currentPrompt.id : null,
                    name: name,
                    content: content
                };
                
                // Save the prompt
                const savedPrompt = PromptsService.savePrompt(promptToSave);
                
                // Update current prompt
                currentPrompt = savedPrompt;
                
                // Clear input fields
                labelField.value = '';
                contentField.value = '';
                
                // Remove active class from all items
                const promptItems = elements.promptsList.querySelectorAll('.prompt-item');
                promptItems.forEach(item => {
                    item.classList.remove('active');
                });
                
                // Reset current prompt
                currentPrompt = null;
                
                // Reload prompts list
                loadPromptsList();
                
            // Apply selected prompts as system prompt
            PromptsService.applySelectedPromptsAsSystem();
            
            // Update main context usage display if aiHackare is available
            if (window.aiHackare && window.aiHackare.chatManager) {
                window.aiHackare.chatManager.estimateContextUsage(
                    window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                    window.aiHackare.settingsManager.getCurrentModel()
                );
            }
            });
            
            // Add elements to the section
            newPromptSection.appendChild(labelField);
            newPromptSection.appendChild(contentField);
            buttonContainer.appendChild(clearButton);
            buttonContainer.appendChild(saveButton);
            newPromptSection.appendChild(buttonContainer);
            
            // Add the new prompt section to the list
            elements.promptsList.appendChild(newPromptSection);
            
    // Update the system prompt in the settings modal
    const systemPrompt = StorageService.getSystemPrompt();
    if (elements.systemPromptInput && systemPrompt) {
        elements.systemPromptInput.value = systemPrompt;
    }
    
    // Update token usage bar
    updatePromptsTokenUsage();
}

/**
 * Add the default prompts section to the prompts list
 */
function addDefaultPromptsSection() {
    // Create default prompts section
    const defaultPromptsSection = document.createElement('div');
    defaultPromptsSection.className = 'default-prompts-section';
    
    // Create header with expand/collapse functionality
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'default-prompts-header';
    
    // Add expand/collapse icon
    const expandIcon = document.createElement('i');
    expandIcon.className = 'fas fa-chevron-right';
    sectionHeader.appendChild(expandIcon);
    
    // Add section title
    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = 'Default Prompts';
    sectionHeader.appendChild(sectionTitle);
    
    // Add click event to expand/collapse
    let isExpanded = false;
    sectionHeader.addEventListener('click', () => {
        isExpanded = !isExpanded;
        expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
        defaultPromptsList.style.display = isExpanded ? 'block' : 'none';
    });
    
    defaultPromptsSection.appendChild(sectionHeader);
    
    // Create container for default prompts
    const defaultPromptsList = document.createElement('div');
    defaultPromptsList.className = 'default-prompts-list';
    defaultPromptsList.style.display = 'none'; // Initially collapsed
    
    // Get default prompts and selected IDs
    const defaultPrompts = DefaultPromptsService.getDefaultPrompts();
    const selectedDefaultPromptIds = DefaultPromptsService.getSelectedDefaultPromptIds();
    
    // Add each default prompt to the list
    defaultPrompts.forEach(prompt => {
        const promptItem = document.createElement('div');
        promptItem.className = 'prompt-item default-prompt-item';
        promptItem.dataset.id = prompt.id;
        
        // Create checkbox for selecting the prompt
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'prompt-item-checkbox';
        checkbox.checked = selectedDefaultPromptIds.includes(prompt.id);
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the prompt item click
            console.log("Default prompt checkbox clicked:", prompt.id);
            DefaultPromptsService.toggleDefaultPromptSelection(prompt.id);
            PromptsService.applySelectedPromptsAsSystem();
            updatePromptsTokenUsage(); // Update token usage bar
            
            // Get all selected prompts
            const selectedDefaultPrompts = DefaultPromptsService.getSelectedDefaultPrompts();
            const selectedPrompts = PromptsService.getSelectedPrompts();
            const allSelectedPrompts = [...selectedDefaultPrompts, ...selectedPrompts];
            
            // Combine all selected prompts
            const combinedContent = allSelectedPrompts
                .map(prompt => prompt.content)
                .join('\n\n---\n\n');
            
            // Get current messages
            const messages = window.aiHackare && window.aiHackare.chatManager ? 
                window.aiHackare.chatManager.getMessages() || [] : [];
            
            // Get current model
            const currentModel = window.aiHackare && window.aiHackare.settingsManager ? 
                window.aiHackare.settingsManager.getCurrentModel() : '';
            
            // Calculate usage info directly
            const usageInfo = UIUtils.estimateContextUsage(
                messages, 
                ModelInfoService.modelInfo, 
                currentModel,
                combinedContent
            );
            
            console.log("Direct calculation - percentage:", usageInfo.percentage);
            
            // Update the UI directly
            const usageFill = document.querySelector('.usage-fill');
            const usageText = document.querySelector('.usage-text');
            
            if (usageFill && usageText) {
                console.log("Directly updating main UI elements from checkbox handler");
                UIUtils.updateContextUsage(usageFill, usageText, usageInfo.percentage);
            } else {
                console.log("Could not find main UI elements");
            }
        });
        promptItem.appendChild(checkbox);
        
        // Create prompt name element
        const promptName = document.createElement('div');
        promptName.className = 'prompt-item-name';
        promptName.textContent = prompt.name || 'Unnamed Default Prompt';
        promptItem.appendChild(promptName);
        
        // Add info icon instead of delete (default prompts can't be deleted)
        const infoIcon = document.createElement('button');
        infoIcon.className = 'prompt-item-info';
        infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
        infoIcon.title = 'View default prompt content';
        infoIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the prompt item click
            
            // Show content in a read-only way (using the editor fields)
            const labelField = document.getElementById('new-prompt-label');
            const contentField = document.getElementById('new-prompt-content');
            
            if (labelField && contentField) {
                labelField.value = prompt.name || '';
                contentField.value = prompt.content || '';
                // Make it clear these are read-only for default prompts
                labelField.setAttribute('readonly', 'readonly');
                contentField.setAttribute('readonly', 'readonly');
                
                // Remove readonly after a short delay when clicking elsewhere
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
        });
        promptItem.appendChild(infoIcon);
        
        defaultPromptsList.appendChild(promptItem);
    });
    
    defaultPromptsSection.appendChild(defaultPromptsList);
    elements.promptsList.appendChild(defaultPromptsSection);
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
         * Update the system prompt input in settings
         * @param {string} systemPrompt - The system prompt to set
         */
        function updateSystemPromptInput(systemPrompt) {
            if (elements.systemPromptInput && systemPrompt) {
                elements.systemPromptInput.value = systemPrompt;
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
