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
        
        // Reset setup flags when modal is loaded
        resetSetupFlags();
        
        // Setup drag and drop for the entire prompts list container
        setupDragAndDrop(elements);
        
        // Setup file upload button as alternative to drag-and-drop
        setupFileUploadButton();
        
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
        
        // Get MCP prompts from Default prompts that should appear in Custom section
        let mcpPrompts = [];
        if (window.DefaultPromptsService) {
            const defaultPrompts = DefaultPromptsService.getDefaultPrompts();
            mcpPrompts = defaultPrompts.filter(p => p.isMcpPrompt === true);
            
            // Convert MCP prompts to user prompt format but mark them as MCP
            mcpPrompts = mcpPrompts.map(p => ({
                ...p,
                isDefault: false,  // Show in custom section
                isMcpPrompt: true,  // Mark as MCP prompt
                isSelected: DefaultPromptsService.getSelectedDefaultPromptIds().includes(p.id)
            }));
        }
        
        // STEP 1: Create user prompts section FIRST
        const userPromptsSection = document.createElement('div');
        userPromptsSection.className = 'user-prompts-section';
        userPromptsSection.style.order = '1'; // Force CSS order
        
        // Add section header for user prompts with drag-drop hint
        const userSectionHeader = document.createElement('div');
        userSectionHeader.className = 'user-prompts-header';
        userSectionHeader.innerHTML = `
            <h4>Your Custom Prompts</h4>
            <span class="drag-drop-hint" style="font-size: 12px; color: var(--text-color-secondary); margin-left: 10px;">
                <i class="fas fa-info-circle" style="margin-right: 4px;"></i>
                Drag & drop text files here
            </span>
            <input type="file" id="file-upload-input" multiple accept=".md,.txt,.py,.html,.css,.js,.json,.conf,.cfg,.c,.cpp,.h,.hpp,.java,.rs,.go,.sh,.bash,.zsh,.fish,.yml,.yaml,.toml,.ini,.xml,.sql,.php,.rb,.swift,.kt,.ts,.tsx,.jsx,.vue,.svelte,.astro,.env,.gitignore,.dockerfile,.makefile,.cmake" style="display: none;">
            <button type="button" id="file-upload-btn" style="font-size: 11px; padding: 2px 6px; margin-left: 8px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">
                Browse Files
            </button>
        `;
        userPromptsSection.appendChild(userSectionHeader);
        
        // Combine user prompts with MCP prompts
        const allCustomPrompts = [...prompts, ...mcpPrompts];
        
        // Show "no prompts" message if needed
        if (allCustomPrompts.length === 0) {
            const noPromptsMessage = PromptsModalRenderer.renderNoPromptsMessage();
            userPromptsSection.appendChild(noPromptsMessage);
        }
        
        // Render each prompt item
        allCustomPrompts.forEach(prompt => {
            const isSelected = prompt.isMcpPrompt ? prompt.isSelected : selectedPromptIds.includes(prompt.id);
            const isActive = currentPrompt && prompt.id === currentPrompt.id;
            const promptItem = PromptsModalRenderer.renderPromptItem(prompt, isSelected, isActive);
            
            // Bind event handlers (different for MCP prompts)
            if (prompt.isMcpPrompt) {
                bindMcpPromptItemEvents(promptItem, prompt);
            } else {
                bindPromptItemEvents(promptItem, prompt);
            }
            
            userPromptsSection.appendChild(promptItem);
        });
        
        // STEP 2: Create default prompts section SECOND
        let defaultPromptsSection = null;
        if (window.DefaultPromptsService) {
            const defaultPrompts = DefaultPromptsService.getDefaultPrompts();
            // Filter out MCP prompts from default prompts since they appear in custom section
            const nonMcpDefaultPrompts = defaultPrompts.filter(p => !p.isMcpPrompt);
            const selectedDefaultIds = DefaultPromptsService.getSelectedDefaultPromptIds();
            defaultPromptsSection = PromptsModalRenderer.renderDefaultPromptsSection(nonMcpDefaultPrompts, selectedDefaultIds);
            defaultPromptsSection.style.order = '2'; // Force CSS order
            
            // Bind default prompts events inline
            bindDefaultPromptsEvents(defaultPromptsSection, nonMcpDefaultPrompts);
        }
        
        // STEP 3: Create new prompt form THIRD
        const newPromptForm = PromptsModalRenderer.renderNewPromptForm();
        newPromptForm.style.order = '3'; // Force CSS order
        bindFormEvents(newPromptForm);
        
        // STEP 4: Add all sections to DOM in explicit order
        elements.promptsList.appendChild(userPromptsSection);
        if (defaultPromptsSection) {
            elements.promptsList.appendChild(defaultPromptsSection);
        }
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
     * Bind event handlers to an MCP prompt item
     * @param {HTMLElement} promptItem - Prompt item element
     * @param {Object} prompt - MCP prompt object
     */
    function bindMcpPromptItemEvents(promptItem, prompt) {
        const checkbox = promptItem.querySelector('.prompt-item-checkbox');
        const deleteBtn = promptItem.querySelector('.prompt-item-delete');
        
        // Checkbox handler for MCP prompts (uses DefaultPromptsService)
        if (checkbox) {
            const checkboxHandler = PromptsEventHandlers.createCheckboxHandler(
                prompt.id,
                true, // isDefault = true for MCP prompts (uses DefaultPromptsService)
                () => updateAfterSelectionChange()
            );
            checkbox.addEventListener('change', checkboxHandler);
        }
        
        // No delete handler for MCP prompts - button is disabled
        
        // Click handler for viewing MCP prompt content (only on prompt name, not checkbox)
        const promptName = promptItem.querySelector('.prompt-item-name');
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
                        
                        // Make fields read-only when viewing MCP prompts
                        labelField.setAttribute('readonly', 'readonly');
                        contentField.setAttribute('readonly', 'readonly');
                        
                        // Scroll to the form fields so they're visible
                        contentField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            );
            promptName.addEventListener('click', viewHandler);
            promptName.style.cursor = 'pointer';
            promptName.title = 'Click to view prompt content';
        }
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
                () => reloadPromptsList(),
                prompt.isFilePrompt || false
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
     * Bind events for default prompts section
     * @param {HTMLElement} defaultPromptsSection - Default prompts section element
     * @param {Array} defaultPrompts - Array of default prompts
     */
    function bindDefaultPromptsEvents(defaultPromptsSection, defaultPrompts) {
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
    
    // Track if drag-and-drop has been set up to prevent duplicate listeners
    let dragDropSetup = false;
    let dragCounter = 0; // Track drag enter/leave to prevent flickering
    
    /**
     * Reset setup flags to allow fresh setup
     */
    function resetSetupFlags() {
        // Only reset if the modal doesn't exist anymore or has been cleared
        const promptsModal = document.getElementById('prompts-modal');
        if (!promptsModal || !promptsModal.hasAttribute('data-dragdrop-setup')) {
            dragDropSetup = false;
            fileUploadSetup = false;
            dragCounter = 0;
        }
    }
    
    /**
     * Setup drag and drop for file uploads
     * @param {Object} elements - DOM elements
     */
    function setupDragAndDrop(elements) {
        const promptsList = elements.promptsList;
        const promptsModal = elements.promptsModal;
        
        if (!promptsList || !promptsModal) {
            console.error('setupDragAndDrop: Missing required elements', { promptsList, promptsModal });
            return;
        }
        
        // Prevent duplicate setup
        if (dragDropSetup && promptsModal.hasAttribute('data-dragdrop-setup')) {
            return;
        }
        
        // Mark as set up
        dragDropSetup = true;
        promptsModal.setAttribute('data-dragdrop-setup', 'true');
        
        // Reset drag counter
        dragCounter = 0;
        
        // Supported file extensions
        const supportedExtensions = [
            '.md', '.txt', '.py', '.html', '.css', '.js', '.json',
            '.conf', '.cfg', '.c', '.cpp', '.h', '.hpp', '.java',
            '.rs', '.go', '.sh', '.bash', '.zsh', '.fish',
            '.yml', '.yaml', '.toml', '.ini', '.xml',
            '.sql', '.php', '.rb', '.swift', '.kt', '.ts', '.tsx', '.jsx',
            '.vue', '.svelte', '.astro', '.env', '.gitignore',
            '.dockerfile', '.makefile', '.cmake'
        ];
        
        // Prevent default drag behaviors on modal
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            promptsModal.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Handle drag enter - increment counter and highlight
        promptsModal.addEventListener('dragenter', handleDragEnter, false);
        
        function handleDragEnter(e) {
            e.preventDefault();
            e.stopPropagation();
            dragCounter++;
            
            if (dragCounter === 1) {
                promptsModal.classList.add('drag-highlight');
            }
        }
        
        // Handle drag over - just prevent default
        promptsModal.addEventListener('dragover', handleDragOver, false);
        
        function handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Handle drag leave - decrement counter and unhighlight when needed
        promptsModal.addEventListener('dragleave', handleDragLeave, false);
        
        function handleDragLeave(e) {
            e.preventDefault();
            e.stopPropagation();
            dragCounter--;
            
            if (dragCounter <= 0) {
                dragCounter = 0;
                promptsModal.classList.remove('drag-highlight');
            }
        }
        
        // Handle dropped files
        promptsModal.addEventListener('drop', handleDrop, false);
        
        async function handleDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Reset drag state
            dragCounter = 0;
            promptsModal.classList.remove('drag-highlight');
            
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                await handleFilesUpload(files);
            }
        }
    }
    
    // Track if file upload button has been set up to prevent duplicates
    let fileUploadSetup = false;
    
    /**
     * Setup file upload button as alternative to drag-and-drop
     */
    function setupFileUploadButton() {
        // Wait for the DOM to be updated
        setTimeout(() => {
            const fileInput = document.getElementById('file-upload-input');
            const browseBtn = document.getElementById('file-upload-btn');
            
            // Prevent duplicate setup
            if (fileUploadSetup || !fileInput || !browseBtn) {
                return;
            }
            
            // Mark as set up
            fileUploadSetup = true;
            
            browseBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', async (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    await handleFilesUpload(files);
                    // Clear the input so the same file can be selected again
                    fileInput.value = '';
                }
            });
        }, 100);
    }
    
    // Debounce file processing to prevent rapid duplicates
    let processingFiles = false;
    let processedFilesCache = new Set(); // Track recently processed files to prevent duplicates
    
    /**
     * Handle uploaded files (shared between drag-and-drop and browse button)
     * @param {FileList} files - Files to process
     */
    async function handleFilesUpload(files) {
        // Prevent rapid successive processing
        if (processingFiles) {
            console.log('File processing already in progress, skipping duplicate request');
            return;
        }
        
        processingFiles = true;
        
        try {
            // Supported file extensions
            const supportedExtensions = [
                '.md', '.txt', '.py', '.html', '.css', '.js', '.json',
                '.conf', '.cfg', '.c', '.cpp', '.h', '.hpp', '.java',
                '.rs', '.go', '.sh', '.bash', '.zsh', '.fish',
                '.yml', '.yaml', '.toml', '.ini', '.xml',
                '.sql', '.php', '.rb', '.swift', '.kt', '.ts', '.tsx', '.jsx',
                '.vue', '.svelte', '.astro', '.env', '.gitignore',
                '.dockerfile', '.makefile', '.cmake'
            ];
            
            const fileArray = [...files];
            const validFiles = fileArray.filter(file => {
                const extension = '.' + file.name.split('.').pop().toLowerCase();
                return supportedExtensions.includes(extension) || 
                       supportedExtensions.includes('.' + file.name.toLowerCase());
            });
            
            if (validFiles.length === 0) {
                alert('Please select supported plaintext files. Supported extensions: ' + 
                      supportedExtensions.join(', '));
                return;
            }
            
            // Check for existing files by name to prevent duplicates
            const existingPrompts = window.PromptsService ? window.PromptsService.getPrompts() : [];
            const existingFileNames = existingPrompts
                .filter(p => p.isFilePrompt)
                .map(p => p.fileName || p.name);
            
            let processedCount = 0;
            let duplicateCount = 0;
            
            for (const file of validFiles) {
                // Create a unique key for this file based on name and size
                const fileKey = `${file.name}_${file.size}`;
                
                // Check if file was recently processed
                if (processedFilesCache.has(fileKey)) {
                    console.log('Skipping duplicate file:', file.name);
                    duplicateCount++;
                    continue;
                }
                
                // Check if file already exists in prompts
                if (existingFileNames.includes(file.name)) {
                    const overwrite = confirm(`File "${file.name}" already exists in prompts. Overwrite it?`);
                    if (!overwrite) {
                        duplicateCount++;
                        continue;
                    }
                    
                    // Remove existing file prompt
                    const existingPrompt = existingPrompts.find(p => p.isFilePrompt && (p.fileName === file.name || p.name === file.name));
                    if (existingPrompt) {
                        window.PromptsService.deletePrompt(existingPrompt.id);
                    }
                }
                
                // Add to cache to prevent immediate duplicates
                processedFilesCache.add(fileKey);
                
                await processFileUpload(file);
                processedCount++;
            }
            
            // Clear cache after a delay to allow re-uploading the same file later
            setTimeout(() => {
                processedFilesCache.clear();
            }, 5000);
            
            // Show status if any files were processed or skipped
            if (processedCount > 0 || duplicateCount > 0) {
                let message = '';
                if (processedCount > 0) {
                    message += `Added ${processedCount} file${processedCount > 1 ? 's' : ''} as prompt${processedCount > 1 ? 's' : ''}`;
                }
                if (duplicateCount > 0) {
                    if (message) message += ', ';
                    message += `skipped ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''}`;
                }
                console.log(message);
            }
            
            // Reload the prompts list to show new files only if files were processed
            if (processedCount > 0 && reloadPromptsList) {
                reloadPromptsList();
                
                // Update context usage
                if (updateAfterSelectionChange) {
                    updateAfterSelectionChange();
                }
            }
        } finally {
            processingFiles = false;
        }
    }
    
    async function processFileUpload(file) {
        try {
            const content = await readFileContent(file);
            
            // Create a prompt object for the file
            const filePrompt = {
                id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: file.name,
                content: content,
                isDefault: false,
                isFilePrompt: true,  // Mark as file-based prompt
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type || 'text/plain'
            };
            
            // Save to prompts service
            if (window.PromptsService) {
                window.PromptsService.savePrompt(filePrompt);
                console.log('Added file as prompt:', file.name);
            }
        } catch (error) {
            console.error('Error processing file:', file.name, error);
            alert(`Error reading file ${file.name}: ${error.message}`);
        }
    }
    
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = e => {
                resolve(e.target.result);
            };
            
            reader.onerror = e => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    return {
        loadPromptsList,
        bindPromptItemEvents,
        bindMcpPromptItemEvents,
        bindFormEvents,
        bindDefaultPromptsEvents,
        setCallbacks,
        setupDragAndDrop,
        setupFileUploadButton
    };
}

window.PromptsListManager = createPromptsListManager();