/**
 * Prompts Manager Module
 * Handles prompt configurator functionality for the AIHackare application
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
                noPromptsMessage.textContent = 'No saved prompts. Click "Add New Prompt" to create one.';
                elements.promptsList.appendChild(noPromptsMessage);
                return;
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
                    PromptsService.togglePromptSelection(prompt.id);
                    PromptsService.applySelectedPromptsAsSystem();
                    loadPromptsList(); // Refresh the list
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
                
                // Show success message
                alert('Prompt saved successfully!');
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
