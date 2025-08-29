/**
 * Function Execution Confirmation Modal
 * Displays a modal to confirm function execution with arguments
 * Supports human-in-the-loop approval with editing capabilities
 */

window.FunctionExecutionModal = (function() {
    let modalElement = null;
    let currentResolve = null;
    let currentReject = null;
    let originalArguments = null;
    let currentFunctionName = null;
    
    /**
     * Initialize the modal by creating its DOM structure
     */
    function init() {
        // Create modal container
        modalElement = document.createElement('div');
        modalElement.id = 'function-execution-modal';
        modalElement.className = 'modal';
        modalElement.style.display = 'none';
        modalElement.style.zIndex = '10001'; // Higher than other modals
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '600px';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.overflow = 'auto';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'settings-header';
        header.style.marginBottom = '20px';
        
        const title = document.createElement('h2');
        title.textContent = 'Function Execution Request';
        title.style.display = 'inline-block';
        
        const warningIcon = document.createElement('span');
        warningIcon.innerHTML = ' ⚠️';
        warningIcon.style.color = '#ff6b6b';
        warningIcon.style.fontSize = '1.2em';
        title.appendChild(warningIcon);
        
        header.appendChild(title);
        
        // Create info section
        const infoSection = document.createElement('div');
        infoSection.className = 'function-execution-info';
        infoSection.style.backgroundColor = 'var(--bg-color-secondary)';
        infoSection.style.padding = '15px';
        infoSection.style.borderRadius = '8px';
        infoSection.style.marginBottom = '20px';
        
        const infoText = document.createElement('p');
        infoText.innerHTML = 'The AI model wants to execute a JavaScript function. Please review the function and arguments below.';
        infoText.style.margin = '0 0 10px 0';
        infoSection.appendChild(infoText);
        
        // Function name section
        const functionNameSection = document.createElement('div');
        functionNameSection.style.marginBottom = '10px';
        
        const functionNameLabel = document.createElement('strong');
        functionNameLabel.textContent = 'Function: ';
        functionNameSection.appendChild(functionNameLabel);
        
        const functionNameSpan = document.createElement('span');
        functionNameSpan.id = 'exec-function-name';
        functionNameSpan.style.fontFamily = 'monospace';
        functionNameSpan.style.fontSize = '1.1em';
        functionNameSpan.style.color = 'var(--accent-color)';
        functionNameSection.appendChild(functionNameSpan);
        
        infoSection.appendChild(functionNameSection);
        
        // Function description section
        const descriptionSection = document.createElement('div');
        descriptionSection.style.marginBottom = '15px';
        
        const descriptionLabel = document.createElement('strong');
        descriptionLabel.textContent = 'Description: ';
        descriptionSection.appendChild(descriptionLabel);
        
        const descriptionSpan = document.createElement('span');
        descriptionSpan.id = 'exec-function-description';
        descriptionSpan.style.fontSize = '0.95em';
        descriptionSpan.style.color = 'var(--text-color-secondary)';
        descriptionSpan.style.fontStyle = 'italic';
        descriptionSection.appendChild(descriptionSpan);
        
        infoSection.appendChild(descriptionSection);
        
        // Arguments section
        const argsSection = document.createElement('div');
        
        const argsLabel = document.createElement('strong');
        argsLabel.textContent = 'Arguments:';
        argsLabel.style.display = 'block';
        argsLabel.style.marginBottom = '10px';
        argsSection.appendChild(argsLabel);
        
        // Create editable textarea for arguments
        const argsTextarea = document.createElement('textarea');
        argsTextarea.id = 'exec-args-textarea';
        argsTextarea.style.backgroundColor = 'var(--bg-color)';
        argsTextarea.style.border = '1px solid var(--border-color)';
        argsTextarea.style.borderRadius = '4px';
        argsTextarea.style.padding = '10px';
        argsTextarea.style.fontFamily = 'monospace';
        argsTextarea.style.fontSize = '0.9em';
        argsTextarea.style.width = '100%';
        argsTextarea.style.minHeight = '100px';
        argsTextarea.style.maxHeight = '200px';
        argsTextarea.style.resize = 'vertical';
        argsTextarea.style.boxSizing = 'border-box';
        argsSection.appendChild(argsTextarea);
        
        // Restore original button
        const restoreButton = document.createElement('button');
        restoreButton.type = 'button';
        restoreButton.className = 'btn secondary-btn';
        restoreButton.textContent = 'Restore Original';
        restoreButton.style.marginTop = '10px';
        restoreButton.style.fontSize = '0.85em';
        restoreButton.addEventListener('click', () => {
            if (originalArguments !== null) {
                argsTextarea.value = JSON.stringify(originalArguments, null, 2);
            }
        });
        argsSection.appendChild(restoreButton);
        
        infoSection.appendChild(argsSection);
        
        // Checkbox for remembering choice
        const checkboxSection = document.createElement('div');
        checkboxSection.style.marginBottom = '20px';
        
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'exec-remember-choice';
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = 'exec-remember-choice';
        checkboxLabel.textContent = "Remember my choice for this function during this session";
        checkboxLabel.style.fontWeight = 'normal';
        
        checkboxGroup.appendChild(checkbox);
        checkboxGroup.appendChild(checkboxLabel);
        checkboxSection.appendChild(checkboxGroup);
        
        // Buttons section
        const buttonsSection = document.createElement('div');
        buttonsSection.className = 'form-actions';
        buttonsSection.style.marginTop = '20px';
        buttonsSection.style.display = 'flex';
        buttonsSection.style.justifyContent = 'flex-end';
        buttonsSection.style.gap = '10px';
        
        const blockButton = document.createElement('button');
        blockButton.type = 'button';
        blockButton.className = 'btn secondary-btn';
        blockButton.textContent = 'Block';
        blockButton.addEventListener('click', () => handleResponse('block'));
        
        const approveEditButton = document.createElement('button');
        approveEditButton.type = 'button';
        approveEditButton.className = 'btn secondary-btn';
        approveEditButton.textContent = 'Approve + Intercept Result';
        approveEditButton.addEventListener('click', () => handleResponse('approve-intercept'));
        
        const approveButton = document.createElement('button');
        approveButton.type = 'button';
        approveButton.className = 'btn primary-btn';
        approveButton.textContent = 'Approve';
        approveButton.addEventListener('click', () => handleResponse('approve'));
        
        buttonsSection.appendChild(blockButton);
        buttonsSection.appendChild(approveEditButton);
        buttonsSection.appendChild(approveButton);
        
        // Assemble modal content
        modalContent.appendChild(header);
        modalContent.appendChild(infoSection);
        modalContent.appendChild(checkboxSection);
        modalContent.appendChild(buttonsSection);
        
        modalElement.appendChild(modalContent);
        document.body.appendChild(modalElement);
        
        // Add escape key handler
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    /**
     * Handle escape key to close modal (block execution)
     */
    function handleEscapeKey(event) {
        if (event.key === 'Escape' && modalElement && modalElement.style.display === 'block') {
            handleResponse('block');
        }
    }
    
    /**
     * Handle user response
     * @param {string} action - The action chosen: 'approve', 'approve-intercept', or 'block'
     */
    function handleResponse(action) {
        // Get the edited arguments
        const argsTextarea = document.getElementById('exec-args-textarea');
        let editedArgs = null;
        
        if (argsTextarea && action !== 'block') {
            try {
                editedArgs = JSON.parse(argsTextarea.value);
            } catch (e) {
                // If parsing fails, show error and don't close modal
                alert('Invalid JSON in arguments. Please fix the syntax and try again.');
                return;
            }
        }
        
        // Check if "remember choice" is checked
        const rememberCheckbox = document.getElementById('exec-remember-choice');
        const rememberChoice = rememberCheckbox && rememberCheckbox.checked;
        
        // Hide modal
        if (modalElement) {
            modalElement.style.display = 'none';
        }
        
        // Reset checkbox and textarea for next time
        if (rememberCheckbox) {
            rememberCheckbox.checked = false;
        }
        if (argsTextarea) {
            argsTextarea.value = '';
        }
        originalArguments = null;
        
        // Resolve promise with result
        if (currentResolve) {
            const result = {
                action: action,
                allowed: action !== 'block',
                interceptResult: action === 'approve-intercept',
                editedArguments: editedArgs,
                rememberChoice: rememberChoice,
                functionName: currentFunctionName
            };
            
            // Add to session lists if remember is checked
            if (rememberChoice && currentFunctionName) {
                if (action === 'block') {
                    addSessionBlocked(currentFunctionName);
                } else if (action === 'approve') {
                    addSessionAllowed(currentFunctionName);
                }
                // Note: approve-intercept doesn't auto-remember since it needs result editing
            }
            
            currentResolve(result);
            currentResolve = null;
            currentReject = null;
            currentFunctionName = null;
        }
    }
    
    /**
     * Show the confirmation modal
     * @param {string} functionName - Name of the function to execute
     * @param {Object} args - Arguments to pass to the function
     * @returns {Promise<Object>} Promise resolving to response object
     */
    function showConfirmation(functionName, args) {
        return new Promise((resolve, reject) => {
            // Initialize if not already done
            if (!modalElement) {
                init();
            }
            
            // Store resolve/reject and function info for later
            currentResolve = resolve;
            currentReject = reject;
            currentFunctionName = functionName;
            originalArguments = args;
            
            // Update function name
            const functionNameSpan = document.getElementById('exec-function-name');
            if (functionNameSpan) {
                functionNameSpan.textContent = functionName;
            }
            
            // Update function description
            const descriptionSpan = document.getElementById('exec-function-description');
            if (descriptionSpan) {
                let description = 'No description available';
                
                // Try to get description from function registry
                if (window.FunctionToolsService && typeof FunctionToolsService.getJsFunctions === 'function') {
                    const jsFunctions = FunctionToolsService.getJsFunctions();
                    if (jsFunctions[functionName] && jsFunctions[functionName].toolDefinition) {
                        const toolDef = jsFunctions[functionName].toolDefinition;
                        if (toolDef.function && toolDef.function.description) {
                            description = toolDef.function.description;
                        }
                    }
                }
                
                // Check default functions if not found
                if (description === 'No description available' && window.DefaultFunctionsService) {
                    const enabledDefaultFunctions = DefaultFunctionsService.getEnabledDefaultFunctions();
                    if (enabledDefaultFunctions[functionName]) {
                        const defaultFunc = enabledDefaultFunctions[functionName];
                        if (defaultFunc.toolDefinition && defaultFunc.toolDefinition.function && defaultFunc.toolDefinition.function.description) {
                            description = defaultFunc.toolDefinition.function.description;
                        }
                    }
                }
                
                descriptionSpan.textContent = description;
            }
            
            // Update arguments in textarea
            const argsTextarea = document.getElementById('exec-args-textarea');
            if (argsTextarea) {
                try {
                    // Pretty print the arguments
                    const formattedArgs = JSON.stringify(args, null, 2);
                    argsTextarea.value = formattedArgs;
                } catch (e) {
                    argsTextarea.value = String(args);
                }
            }
            
            // Show modal
            if (modalElement) {
                modalElement.style.display = 'block';
                
                // Focus on the block button for safety
                const blockButton = modalElement.querySelector('.secondary-btn');
                if (blockButton) {
                    blockButton.focus();
                }
            }
        });
    }
    
    // Storage keys for persistent session management
    const SESSION_ALLOWED_KEY = 'function_session_allowed';
    const SESSION_BLOCKED_KEY = 'function_session_blocked';
    
    // Session storage for functions - initialized from localStorage
    let sessionAllowedFunctions = new Set();
    let sessionBlockedFunctions = new Set();
    
    /**
     * Initialize session lists from storage
     */
    function initSessionLists() {
        try {
            const allowed = CoreStorageService.getValue(SESSION_ALLOWED_KEY);
            if (Array.isArray(allowed)) {
                sessionAllowedFunctions = new Set(allowed);
            }
            
            const blocked = CoreStorageService.getValue(SESSION_BLOCKED_KEY);
            if (Array.isArray(blocked)) {
                sessionBlockedFunctions = new Set(blocked);
            }
        } catch (e) {
            console.error('Error loading session lists:', e);
        }
    }
    
    /**
     * Save session lists to storage
     */
    function saveSessionLists() {
        try {
            CoreStorageService.setValue(SESSION_ALLOWED_KEY, Array.from(sessionAllowedFunctions));
            CoreStorageService.setValue(SESSION_BLOCKED_KEY, Array.from(sessionBlockedFunctions));
        } catch (e) {
            console.error('Error saving session lists:', e);
        }
    }
    
    /**
     * Check if a function should be auto-allowed for this session
     * @param {string} functionName - Name of the function
     * @returns {boolean}
     */
    function isSessionAllowed(functionName) {
        return sessionAllowedFunctions.has(functionName);
    }
    
    /**
     * Check if a function should be auto-blocked for this session
     * @param {string} functionName - Name of the function
     * @returns {boolean}
     */
    function isSessionBlocked(functionName) {
        return sessionBlockedFunctions.has(functionName);
    }
    
    /**
     * Add a function to session auto-allow list
     * @param {string} functionName - Name of the function
     */
    function addSessionAllowed(functionName) {
        sessionAllowedFunctions.add(functionName);
        // Remove from blocked if it was there
        sessionBlockedFunctions.delete(functionName);
        saveSessionLists();
    }
    
    /**
     * Add a function to session auto-block list
     * @param {string} functionName - Name of the function
     */
    function addSessionBlocked(functionName) {
        sessionBlockedFunctions.add(functionName);
        // Remove from allowed if it was there
        sessionAllowedFunctions.delete(functionName);
        saveSessionLists();
    }
    
    /**
     * Remove a function from session lists
     * @param {string} functionName - Name of the function
     */
    function removeFromSessionLists(functionName) {
        sessionAllowedFunctions.delete(functionName);
        sessionBlockedFunctions.delete(functionName);
        saveSessionLists();
    }
    
    /**
     * Clear all session auto-allowed functions
     */
    function clearSessionAllowed() {
        sessionAllowedFunctions.clear();
        saveSessionLists();
    }
    
    /**
     * Clear all session auto-blocked functions
     */
    function clearSessionBlocked() {
        sessionBlockedFunctions.clear();
        saveSessionLists();
    }
    
    /**
     * Get all session lists for UI display
     * @returns {Object} Object with allowed and blocked arrays
     */
    function getSessionLists() {
        return {
            allowed: Array.from(sessionAllowedFunctions),
            blocked: Array.from(sessionBlockedFunctions)
        };
    }
    
    /**
     * Show modal for intercepting and editing function results
     * @param {string} functionName - Name of the function that was executed
     * @param {*} result - The result returned from the function
     * @returns {Promise<*>} Promise resolving to the edited result
     */
    function showResultInterceptor(functionName, result) {
        return new Promise((resolve, reject) => {
            // Create a simple modal for result editing
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.style.zIndex = '10002';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '600px';
            
            const header = document.createElement('h2');
            header.textContent = `Function Result: ${functionName}`;
            header.style.marginBottom = '20px';
            
            const info = document.createElement('p');
            info.textContent = 'The function has been executed. You can edit the result below before it\'s returned to the AI:';
            info.style.marginBottom = '15px';
            
            const textarea = document.createElement('textarea');
            textarea.style.width = '100%';
            textarea.style.minHeight = '200px';
            textarea.style.fontFamily = 'monospace';
            textarea.style.fontSize = '0.9em';
            textarea.style.padding = '10px';
            textarea.style.border = '1px solid var(--border-color)';
            textarea.style.borderRadius = '4px';
            textarea.style.backgroundColor = 'var(--bg-color)';
            
            try {
                textarea.value = JSON.stringify(result, null, 2);
            } catch (e) {
                textarea.value = String(result);
            }
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.marginTop = '20px';
            buttonsDiv.style.display = 'flex';
            buttonsDiv.style.justifyContent = 'flex-end';
            buttonsDiv.style.gap = '10px';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn secondary-btn';
            cancelBtn.textContent = 'Use Original';
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(result);
            });
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn primary-btn';
            saveBtn.textContent = 'Use Edited Result';
            saveBtn.addEventListener('click', () => {
                try {
                    const editedResult = JSON.parse(textarea.value);
                    document.body.removeChild(modal);
                    resolve(editedResult);
                } catch (e) {
                    alert('Invalid JSON. Please fix the syntax and try again.');
                }
            });
            
            buttonsDiv.appendChild(cancelBtn);
            buttonsDiv.appendChild(saveBtn);
            
            modalContent.appendChild(header);
            modalContent.appendChild(info);
            modalContent.appendChild(textarea);
            modalContent.appendChild(buttonsDiv);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Focus on textarea
            textarea.focus();
            textarea.select();
        });
    }
    
    // Initialize on load
    initSessionLists();
    
    // Public API
    return {
        showConfirmation,
        showResultInterceptor,
        isSessionAllowed,
        isSessionBlocked,
        addSessionAllowed,
        addSessionBlocked,
        removeFromSessionLists,
        clearSessionAllowed,
        clearSessionBlocked,
        getSessionLists
    };
})();