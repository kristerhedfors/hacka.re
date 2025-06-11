/**
 * Prompts Event Handlers
 * Handles event binding and delegation for prompts modal interface
 * Separates event handling logic from DOM rendering
 */

window.PromptsEventHandlers = (function() {
    
    /**
     * Create checkbox handler for prompt selection
     * @param {string} promptId - Prompt ID
     * @param {boolean} isDefault - Whether this is a default prompt
     * @param {Function} onSelectionChange - Callback for selection changes
     * @returns {Function} Event handler function
     */
    function createCheckboxHandler(promptId, isDefault, onSelectionChange) {
        return function(e) {
            e.stopPropagation(); // Prevent triggering parent click events
            console.log(`${isDefault ? 'Default' : 'Regular'} prompt checkbox clicked:`, promptId);
            
            // Toggle the prompt selection in the appropriate service
            if (isDefault) {
                window.DefaultPromptsService.toggleDefaultPromptSelection(promptId);
            } else {
                window.PromptsService.togglePromptSelection(promptId);
            }
            
            // Apply selected prompts as system prompt
            window.PromptsService.applySelectedPromptsAsSystem();
            
            // Emit event for decoupled updates
            if (window.UIUtils && window.UIUtils.EventBus) {
                window.UIUtils.EventBus.emit('promptSelectionChanged', {
                    promptId: promptId,
                    isDefault: isDefault
                });
            }
            
            // Notify caller of selection change
            if (onSelectionChange) {
                onSelectionChange();
            }
        };
    }
    
    /**
     * Create delete handler for prompt deletion
     * @param {string} promptId - Prompt ID
     * @param {string} promptName - Prompt name for confirmation
     * @param {Function} onDelete - Callback for deletion
     * @returns {Function} Event handler function
     */
    function createDeleteHandler(promptId, promptName, onDelete) {
        return function(e) {
            e.stopPropagation(); // Prevent triggering parent click events
            
            if (confirm(`Are you sure you want to delete the prompt "${promptName}"?`)) {
                window.PromptsService.deletePrompt(promptId);
                
                // Notify caller of deletion
                if (onDelete) {
                    onDelete(promptId);
                }
            }
        };
    }
    
    /**
     * Create prompt item click handler for editing
     * @param {Object} prompt - Prompt object
     * @param {HTMLElement} promptItem - Prompt item element
     * @param {Function} onEdit - Callback for editing
     * @returns {Function} Event handler function
     */
    function createPromptEditHandler(prompt, promptItem, onEdit) {
        return function(e) {
            // Don't trigger if clicking on checkbox or delete icon
            if (e.target.type === 'checkbox' || e.target.closest('.prompt-item-delete')) {
                return;
            }
            
            // Toggle active state
            const isActive = promptItem.classList.contains('active');
            
            // Remove active class from all items
            const allPromptItems = document.querySelectorAll('.prompt-item');
            allPromptItems.forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to this item if it wasn't already active
            if (!isActive) {
                promptItem.classList.add('active');
                
                // Load prompt content into the form fields
                const labelField = document.getElementById('new-prompt-label');
                const contentField = document.getElementById('new-prompt-content');
                
                if (labelField && contentField) {
                    labelField.value = prompt.name || '';
                    contentField.value = prompt.content || '';
                    
                    // Remove readonly attributes for user prompts (they can be edited)
                    labelField.removeAttribute('readonly');
                    contentField.removeAttribute('readonly');
                    
                    // Scroll to the form fields so they're visible
                    contentField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                // Notify caller of edit action
                if (onEdit) {
                    onEdit(prompt);
                }
            } else {
                // Notify caller that editing was cancelled
                if (onEdit) {
                    onEdit(null);
                }
                
                // Clear the form fields when deselecting
                const labelField = document.getElementById('new-prompt-label');
                const contentField = document.getElementById('new-prompt-content');
                
                if (labelField && contentField) {
                    labelField.value = '';
                    contentField.value = '';
                    labelField.removeAttribute('readonly');
                    contentField.removeAttribute('readonly');
                }
            }
        };
    }
    
    /**
     * Create default prompt name click handler for viewing content
     * @param {Object} prompt - Default prompt object
     * @param {Function} onView - Callback for viewing
     * @returns {Function} Event handler function
     */
    function createDefaultPromptViewHandler(prompt, onView) {
        return function(e) {
            e.stopPropagation(); // Prevent triggering parent click events
            
            // Notify caller to show prompt content
            if (onView) {
                onView(prompt);
            }
        };
    }
    
    /**
     * Create info button handler for default prompts
     * @param {Object} prompt - Default prompt object
     * @param {HTMLElement} infoIcon - Info icon element
     * @returns {Function} Event handler function
     */
    function createInfoHandler(prompt, infoIcon) {
        return function(e) {
            e.stopPropagation(); // Prevent triggering parent click events
            
            // Create and show info popup
            const popup = PromptsModalRenderer.renderInfoPopup(prompt);
            
            // Position the popup near the info icon
            const rect = infoIcon.getBoundingClientRect();
            popup.style.position = 'absolute';
            popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
            popup.style.left = `${rect.left + window.scrollX - 200}px`; // Offset to center
            
            // Add to body
            document.body.appendChild(popup);
            
            // Set up close handlers
            setupInfoPopupHandlers(popup, infoIcon);
        };
    }
    
    /**
     * Setup handlers for info popup
     * @param {HTMLElement} popup - Popup element
     * @param {HTMLElement} infoIcon - Info icon element that triggered popup
     */
    function setupInfoPopupHandlers(popup, infoIcon) {
        // Close button handler
        const closeBtn = popup.querySelector('.prompt-info-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                }
            });
        }
        
        // Click outside to close
        function closePopup(event) {
            if (!popup.contains(event.target) && event.target !== infoIcon) {
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                }
                document.removeEventListener('click', closePopup);
            }
        }
        
        // Add close handler with slight delay to prevent immediate triggering
        setTimeout(() => {
            document.addEventListener('click', closePopup);
        }, 100);
        
        // Function Library link handler
        const functionLibraryLink = popup.querySelector('.function-library-link');
        if (functionLibraryLink) {
            functionLibraryLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Close the popup
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                }
                
                // Close the prompts modal and open function modal
                if (window.aiHackare && window.aiHackare.functionCallingManager) {
                    // Close prompts modal first
                    const promptsModal = document.getElementById('prompts-modal');
                    if (promptsModal) {
                        promptsModal.classList.remove('active');
                    }
                    
                    // Open function modal
                    window.aiHackare.functionCallingManager.showFunctionModal();
                } else {
                    // Fallback if the function calling manager is not available
                    const functionBtn = document.getElementById('function-btn');
                    if (functionBtn) {
                        functionBtn.click();
                    }
                }
            });
        }
    }
    
    /**
     * Create section header click handler for expand/collapse
     * @param {HTMLElement} header - Section header element
     * @param {HTMLElement} content - Content element to show/hide
     * @param {Function} onToggle - Optional callback for toggle events
     * @returns {Function} Event handler function
     */
    function createSectionToggleHandler(header, content, onToggle) {
        let isExpanded = false;
        
        return function() {
            isExpanded = !isExpanded;
            
            // Update icon
            const icon = header.querySelector('i');
            if (icon) {
                icon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
            }
            
            // Show/hide content
            content.style.display = isExpanded ? 'block' : 'none';
            
            // Notify caller of toggle
            if (onToggle) {
                onToggle(isExpanded);
            }
        };
    }
    
    /**
     * Create clear button handler for new prompt form
     * @param {Function} onClear - Callback for clear action
     * @returns {Function} Event handler function
     */
    function createClearHandler(onClear) {
        return function() {
            // Clear form fields
            const labelField = document.getElementById('new-prompt-label');
            const contentField = document.getElementById('new-prompt-content');
            
            if (labelField) labelField.value = '';
            if (contentField) contentField.value = '';
            
            // Remove active class from all items
            const promptItems = document.querySelectorAll('.prompt-item');
            promptItems.forEach(item => {
                item.classList.remove('active');
            });
            
            // Notify caller
            if (onClear) {
                onClear();
            }
        };
    }
    
    /**
     * Create save button handler for new prompt form
     * @param {Function} onSave - Callback for save action
     * @returns {Function} Event handler function
     */
    function createSaveHandler(onSave) {
        return function() {
            const labelField = document.getElementById('new-prompt-label');
            const contentField = document.getElementById('new-prompt-content');
            
            if (!labelField || !contentField) {
                console.error('Could not find prompt form fields');
                return;
            }
            
            const name = labelField.value.trim();
            const content = contentField.value.trim();
            
            // Enhanced validation
            if (!name || !content) {
                alert('Please enter both a label and content for the prompt.');
                return;
            }
            
            if (name.length > 100) {
                alert('Prompt label must be 100 characters or less.');
                return;
            }
            
            if (content.length > 50000) {
                alert('Prompt content must be 50,000 characters or less.');
                return;
            }
            
            // Notify caller with prompt data
            if (onSave) {
                onSave({ name, content });
            }
        };
    }
    
    // Public API
    return {
        createCheckboxHandler,
        createDeleteHandler,
        createPromptEditHandler,
        createDefaultPromptViewHandler,
        createInfoHandler,
        createSectionToggleHandler,
        createClearHandler,
        createSaveHandler,
        setupInfoPopupHandlers
    };
})();