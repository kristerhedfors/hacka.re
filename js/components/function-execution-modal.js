/**
 * Function Execution Confirmation Modal
 * Displays a modal to confirm function execution with arguments
 * Supports human-in-the-loop approval with editing capabilities
 */

window.FunctionExecutionModal = (function() {
    let modalElement = null;
    let currentResolve = null;
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
        modalContent.style.maxWidth = '700px';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'settings-header';
        
        const title = document.createElement('h2');
        title.id = 'function-execution-title';
        title.textContent = 'Function Execution Request';
        header.appendChild(title);
        
        // Create container
        const container = document.createElement('div');
        container.className = 'function-details-container';
        
        // Create section
        const section = document.createElement('div');
        section.className = 'function-details-section';
        
        // Function name
        const functionNameH3 = document.createElement('h3');
        functionNameH3.id = 'exec-function-name';
        functionNameH3.style.marginBottom = '0.5rem';
        functionNameH3.style.color = 'var(--accent-color)';
        section.appendChild(functionNameH3);
        
        // Function description
        const descriptionDiv = document.createElement('div');
        descriptionDiv.id = 'exec-function-description';
        descriptionDiv.style.fontSize = '0.95em';
        descriptionDiv.style.color = 'var(--text-color-secondary)';
        descriptionDiv.style.fontStyle = 'italic';
        descriptionDiv.style.marginBottom = '1rem';
        section.appendChild(descriptionDiv);
        
        // Create content div
        const content = document.createElement('div');
        content.className = 'function-details-content';
        
        // Parameters group
        const parametersGroup = document.createElement('div');
        parametersGroup.className = 'function-details-group';
        parametersGroup.id = 'exec-parameters-group';
        
        const parametersHeader = document.createElement('h4');
        parametersHeader.textContent = 'Parameters';
        parametersGroup.appendChild(parametersHeader);
        
        const parametersValue = document.createElement('div');
        parametersValue.className = 'function-details-value';
        parametersValue.style.position = 'relative';
        
        const argsTextarea = document.createElement('textarea');
        argsTextarea.id = 'exec-args-textarea';
        argsTextarea.style.flex = '1';
        argsTextarea.style.margin = '0';
        argsTextarea.style.padding = '16px';
        argsTextarea.style.fontFamily = "'Courier New', Courier, monospace";
        argsTextarea.style.fontSize = '13px';
        argsTextarea.style.lineHeight = '1.4';
        argsTextarea.style.backgroundColor = 'var(--bg-color)';
        argsTextarea.style.color = 'var(--text-color)';
        argsTextarea.style.border = 'none';
        argsTextarea.style.resize = 'vertical';
        argsTextarea.style.minHeight = '100px';
        argsTextarea.style.maxHeight = '300px';
        argsTextarea.style.width = '100%';
        argsTextarea.style.boxSizing = 'border-box';
        parametersValue.appendChild(argsTextarea);
        
        // Restore button (positioned like copy button)
        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'copy-btn';
        restoreBtn.title = 'Restore original parameters';
        restoreBtn.style.position = 'absolute';
        restoreBtn.style.top = '12px';
        restoreBtn.style.right = '12px';
        restoreBtn.innerHTML = '<i class="fas fa-undo"></i>';
        restoreBtn.addEventListener('click', () => {
            if (originalArguments !== null) {
                argsTextarea.value = JSON.stringify(originalArguments, null, 2);
            }
        });
        parametersValue.appendChild(restoreBtn);
        
        parametersGroup.appendChild(parametersValue);
        content.appendChild(parametersGroup);
        
        // Warning message
        const warningDiv = document.createElement('div');
        warningDiv.style.padding = '12px 16px';
        warningDiv.style.backgroundColor = 'var(--warning-bg, #fff3cd)';
        warningDiv.style.color = 'var(--warning-text, #856404)';
        warningDiv.style.borderRadius = '8px';
        warningDiv.style.border = '1px solid var(--warning-border, #ffeaa7)';
        warningDiv.style.fontSize = '0.9em';
        warningDiv.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>The AI model wants to execute this JavaScript function. Review the parameters before approving.';
        content.appendChild(warningDiv);
        
        section.appendChild(content);
        container.appendChild(section);
        
        // Remember choice checkbox
        const checkboxDiv = document.createElement('div');
        checkboxDiv.style.padding = '12px 0';
        checkboxDiv.style.borderTop = '1px solid var(--border-color)';
        checkboxDiv.style.marginTop = '1rem';
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.style.display = 'flex';
        checkboxLabel.style.alignItems = 'center';
        checkboxLabel.style.cursor = 'pointer';
        checkboxLabel.style.fontSize = '0.9em';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'exec-remember-choice';
        checkbox.style.marginRight = '8px';
        
        checkboxLabel.appendChild(checkbox);
        checkboxLabel.appendChild(document.createTextNode('Remember my choice for this function during this session'));
        checkboxDiv.appendChild(checkboxLabel);
        container.appendChild(checkboxDiv);
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'form-actions';
        actions.style.display = 'flex';
        actions.style.justifyContent = 'space-between';
        actions.style.alignItems = 'center';
        actions.style.marginTop = '1.5rem';
        
        // Left side - Block button
        const leftActions = document.createElement('div');
        
        const blockBtn = document.createElement('button');
        blockBtn.type = 'button';
        blockBtn.className = 'btn secondary-btn';
        blockBtn.innerHTML = '<i class="fas fa-ban" style="margin-right: 6px;"></i>Block';
        blockBtn.addEventListener('click', () => handleResponse('block'));
        leftActions.appendChild(blockBtn);
        
        // Right side - Approve buttons
        const rightActions = document.createElement('div');
        rightActions.style.display = 'flex';
        rightActions.style.gap = '10px';
        
        const approveInterceptBtn = document.createElement('button');
        approveInterceptBtn.type = 'button';
        approveInterceptBtn.className = 'btn secondary-btn';
        approveInterceptBtn.innerHTML = '<i class="fas fa-edit" style="margin-right: 6px;"></i>Approve + Intercept Result';
        approveInterceptBtn.addEventListener('click', () => handleResponse('approve-intercept'));
        
        const approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'btn primary-btn';
        approveBtn.innerHTML = '<i class="fas fa-check" style="margin-right: 6px;"></i>Approve';
        approveBtn.addEventListener('click', () => handleResponse('approve'));
        
        rightActions.appendChild(approveInterceptBtn);
        rightActions.appendChild(approveBtn);
        
        actions.appendChild(leftActions);
        actions.appendChild(rightActions);
        container.appendChild(actions);
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(container);
        modalElement.appendChild(modalContent);
        document.body.appendChild(modalElement);
        
        // Add event listeners
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                handleResponse('block'); // Clicking outside blocks
            }
        });
        
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
        return new Promise((resolve) => {
            // Initialize if not already done
            if (!modalElement) {
                init();
            }
            
            // Store resolve and function info for later
            currentResolve = resolve;
            currentFunctionName = functionName;
            originalArguments = args;
            
            // Update function name
            const functionNameElement = document.getElementById('exec-function-name');
            if (functionNameElement) {
                functionNameElement.textContent = functionName;
            }
            
            // Update function description
            const descriptionElement = document.getElementById('exec-function-description');
            if (descriptionElement) {
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
                
                descriptionElement.textContent = description;
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
                const blockButton = modalElement.querySelector('.btn.secondary-btn');
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
     * @returns {Promise<{blocked: boolean, result: *}>} Promise resolving to object with blocked flag and result
     */
    function showResultInterceptor(functionName, result) {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.style.zIndex = '10002';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '700px';
            
            // Header
            const header = document.createElement('div');
            header.className = 'settings-header';
            
            const title = document.createElement('h2');
            title.textContent = 'Function Result Interceptor';
            header.appendChild(title);
            
            // Container
            const container = document.createElement('div');
            container.className = 'function-details-container';
            
            // Section
            const section = document.createElement('div');
            section.className = 'function-details-section';
            
            // Function name
            const functionNameH3 = document.createElement('h3');
            functionNameH3.textContent = `${functionName} (Result)`;
            functionNameH3.style.marginBottom = '1rem';
            functionNameH3.style.color = 'var(--accent-color)';
            section.appendChild(functionNameH3);
            
            // Content
            const content = document.createElement('div');
            content.className = 'function-details-content';
            
            // Result group
            const resultGroup = document.createElement('div');
            resultGroup.className = 'function-details-group';
            
            const resultHeader = document.createElement('h4');
            resultHeader.textContent = 'Result';
            resultGroup.appendChild(resultHeader);
            
            const resultValue = document.createElement('div');
            resultValue.className = 'function-details-value';
            resultValue.style.position = 'relative';
            
            const textarea = document.createElement('textarea');
            textarea.style.flex = '1';
            textarea.style.margin = '0';
            textarea.style.padding = '16px';
            textarea.style.fontFamily = "'Courier New', Courier, monospace";
            textarea.style.fontSize = '13px';
            textarea.style.lineHeight = '1.4';
            textarea.style.backgroundColor = 'var(--bg-color)';
            textarea.style.color = 'var(--text-color)';
            textarea.style.border = 'none';
            textarea.style.resize = 'vertical';
            textarea.style.minHeight = '200px';
            textarea.style.maxHeight = '400px';
            textarea.style.width = '100%';
            textarea.style.boxSizing = 'border-box';
            
            let originalResultString;
            try {
                originalResultString = JSON.stringify(result, null, 2);
                textarea.value = originalResultString;
            } catch (e) {
                originalResultString = String(result);
                textarea.value = originalResultString;
            }
            
            resultValue.appendChild(textarea);
            
            // Restore button
            const restoreBtn = document.createElement('button');
            restoreBtn.type = 'button';
            restoreBtn.className = 'copy-btn';
            restoreBtn.title = 'Restore original result';
            restoreBtn.innerHTML = '<i class="fas fa-undo"></i>';
            restoreBtn.style.position = 'absolute';
            restoreBtn.style.top = '12px';
            restoreBtn.style.right = '12px';
            restoreBtn.addEventListener('click', () => {
                textarea.value = originalResultString;
            });
            resultValue.appendChild(restoreBtn);
            
            resultGroup.appendChild(resultValue);
            content.appendChild(resultGroup);
            
            // Info message
            const infoDiv = document.createElement('div');
            infoDiv.style.padding = '12px 16px';
            infoDiv.style.backgroundColor = 'var(--info-bg, #d1ecf1)';
            infoDiv.style.color = 'var(--info-text, #0c5460)';
            infoDiv.style.borderRadius = '8px';
            infoDiv.style.border = '1px solid var(--info-border, #bee5eb)';
            infoDiv.style.fontSize = '0.9em';
            infoDiv.innerHTML = '<i class="fas fa-info-circle" style="margin-right: 8px;"></i>The function has been executed. You can edit the result before it\'s returned to the AI.';
            content.appendChild(infoDiv);
            
            section.appendChild(content);
            container.appendChild(section);
            
            // Actions
            const actions = document.createElement('div');
            actions.className = 'form-actions';
            actions.style.display = 'flex';
            actions.style.justifyContent = 'space-between';
            actions.style.alignItems = 'center';
            actions.style.marginTop = '1.5rem';
            
            // Left side - Block button
            const leftActions = document.createElement('div');
            
            const blockBtn = document.createElement('button');
            blockBtn.type = 'button';
            blockBtn.className = 'btn secondary-btn';
            blockBtn.innerHTML = '<i class="fas fa-ban" style="margin-right: 6px;"></i>Block Result';
            blockBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve({ blocked: true, result: null });
            });
            leftActions.appendChild(blockBtn);
            
            // Right side - Return button
            const rightActions = document.createElement('div');
            
            const returnBtn = document.createElement('button');
            returnBtn.type = 'button';
            returnBtn.className = 'btn primary-btn';
            returnBtn.innerHTML = '<i class="fas fa-check" style="margin-right: 6px;"></i>Return';
            returnBtn.addEventListener('click', () => {
                try {
                    const editedResult = JSON.parse(textarea.value);
                    document.body.removeChild(modal);
                    resolve({ blocked: false, result: editedResult });
                } catch (e) {
                    alert('Invalid JSON. Please fix the syntax and try again.');
                }
            });
            
            rightActions.appendChild(returnBtn);
            
            actions.appendChild(leftActions);
            actions.appendChild(rightActions);
            container.appendChild(actions);
            
            // Assemble modal
            modalContent.appendChild(header);
            modalContent.appendChild(container);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Event handlers
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    // Return current value (edited or not) on outside click
                    try {
                        const currentResult = JSON.parse(textarea.value);
                        document.body.removeChild(modal);
                        resolve({ blocked: false, result: currentResult });
                    } catch (err) {
                        // If invalid JSON, use original
                        document.body.removeChild(modal);
                        resolve({ blocked: false, result: result });
                    }
                }
            });
            
            const handleEscape = (event) => {
                if (event.key === 'Escape') {
                    document.removeEventListener('keydown', handleEscape);
                    // Return current value (edited or not) on escape
                    try {
                        const currentResult = JSON.parse(textarea.value);
                        document.body.removeChild(modal);
                        resolve({ blocked: false, result: currentResult });
                    } catch (err) {
                        // If invalid JSON, use original
                        document.body.removeChild(modal);
                        resolve({ blocked: false, result: result });
                    }
                }
            };
            document.addEventListener('keydown', handleEscape);
            
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