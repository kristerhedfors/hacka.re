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
     * @param {boolean} isFilePrompt - Whether this is a file-based prompt
     * @returns {Function} Event handler function
     */
    function createDeleteHandler(promptId, promptName, onDelete, isFilePrompt = false) {
        return function(e) {
            e.stopPropagation(); // Prevent triggering parent click events
            
            const confirmMessage = isFilePrompt ? 
                `Are you sure you want to remove the file "${promptName}" from prompts?` :
                `Are you sure you want to delete the prompt "${promptName}"?`;
            
            if (confirm(confirmMessage)) {
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
                
                // Notify caller of edit action (this will trigger setCurrentPrompt and reload the list)
                if (onEdit) {
                    onEdit(prompt);
                }
            } else {
                // Notify caller that editing was cancelled
                if (onEdit) {
                    onEdit(null);
                }
            }
        };
    }
    
    /**
     * Create default prompt name click handler for viewing content in modal
     * @param {Object} prompt - Default prompt object
     * @returns {Function} Event handler function
     */
    function createDefaultPromptViewHandler(prompt) {
        return function(e) {
            e.stopPropagation(); // Prevent triggering parent click events

            // Show the prompt viewer modal
            showPromptViewerModal(prompt);
        };
    }

    /**
     * Show the prompt viewer modal for a default prompt
     * @param {Object} prompt - Prompt object to display
     */
    function showPromptViewerModal(prompt) {
        // Remove any existing viewer modal
        const existingModal = document.getElementById('default-prompt-viewer-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create and add the modal
        const modal = window.PromptsModalRenderer.renderPromptViewerModal(prompt);
        document.body.appendChild(modal);

        // Evaluate content if it's a function
        const contentText = typeof prompt.content === 'function'
            ? prompt.content()
            : prompt.content;

        // Populate content
        const rawContent = modal.querySelector('#prompt-viewer-raw-content');
        const renderedContent = modal.querySelector('#prompt-viewer-rendered-content');

        if (rawContent) {
            rawContent.textContent = contentText;
        }

        if (renderedContent && window.marked) {
            try {
                const html = window.marked.parse(contentText);
                if (window.DOMPurify) {
                    renderedContent.innerHTML = window.DOMPurify.sanitize(html);
                } else {
                    renderedContent.innerHTML = html;
                }
            } catch (error) {
                console.error('Error rendering markdown:', error);
                renderedContent.textContent = contentText;
            }
        } else if (renderedContent) {
            renderedContent.textContent = contentText;
        }

        // Set up tab switching
        const tabButtons = modal.querySelectorAll('.tab-btn');
        const tabPanes = modal.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Update button states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update pane visibility
                tabPanes.forEach(pane => {
                    if (pane.id === `prompt-viewer-${targetTab}-tab`) {
                        pane.classList.add('active');
                    } else {
                        pane.classList.remove('active');
                    }
                });
            });
        });

        // Set up action buttons
        const copyBtn = modal.querySelector('#prompt-viewer-copy-btn');
        const populateBtn = modal.querySelector('#prompt-viewer-populate-btn');

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(prompt.content).then(() => {
                        // Show success feedback
                        const originalHTML = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            copyBtn.innerHTML = originalHTML;
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy:', err);
                    });
                }
            });
        }

        if (populateBtn) {
            populateBtn.addEventListener('click', () => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.value = prompt.content;
                    messageInput.focus();

                    // Close the modal
                    modal.classList.remove('active');
                    setTimeout(() => modal.remove(), 300);
                }
            });
        }

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });

        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * Show the simple prompt viewer modal
     * @param {Object} prompt - Prompt object to display
     */
    function showSimplePromptViewerModal(prompt) {
        // Remove any existing viewer modal
        const existingModal = document.getElementById('simple-prompt-viewer-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create and add the modal
        const modal = window.PromptsModalRenderer.renderSimplePromptViewerModal(prompt);
        document.body.appendChild(modal);

        // Populate content (plain text only, no markdown)
        const content = modal.querySelector('#simple-prompt-viewer-content');
        if (content) {
            // Handle both string content and function content
            const contentText = typeof prompt.content === 'function'
                ? prompt.content()
                : prompt.content;
            content.textContent = contentText;
        }

        // Set up close button
        const closeBtn = modal.querySelector('#close-simple-prompt-viewer');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            });
        }

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });

        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
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

            // Show simple prompt viewer modal
            showSimplePromptViewerModal(prompt);
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
        setupInfoPopupHandlers,
        showPromptViewerModal,
        showSimplePromptViewerModal
    };
})();