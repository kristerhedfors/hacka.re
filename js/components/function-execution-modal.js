/**
 * Function Execution Confirmation Modal
 * Displays a modal to confirm function execution with arguments
 * Similar to the existing function call modals but for execution confirmation
 */

window.FunctionExecutionModal = (function() {
    let modalElement = null;
    let currentResolve = null;
    let currentReject = null;
    
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
        
        // Arguments section
        const argsSection = document.createElement('div');
        
        const argsLabel = document.createElement('strong');
        argsLabel.textContent = 'Arguments:';
        argsLabel.style.display = 'block';
        argsLabel.style.marginBottom = '10px';
        argsSection.appendChild(argsLabel);
        
        const argsContainer = document.createElement('div');
        argsContainer.id = 'exec-args-container';
        argsContainer.style.backgroundColor = 'var(--bg-color)';
        argsContainer.style.border = '1px solid var(--border-color)';
        argsContainer.style.borderRadius = '4px';
        argsContainer.style.padding = '10px';
        argsContainer.style.fontFamily = 'monospace';
        argsContainer.style.fontSize = '0.9em';
        argsContainer.style.whiteSpace = 'pre-wrap';
        argsContainer.style.wordBreak = 'break-word';
        argsContainer.style.maxHeight = '200px';
        argsContainer.style.overflowY = 'auto';
        argsSection.appendChild(argsContainer);
        
        infoSection.appendChild(argsSection);
        
        // Checkbox for "Don't ask again this session"
        const checkboxSection = document.createElement('div');
        checkboxSection.style.marginBottom = '20px';
        
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'exec-dont-ask-session';
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = 'exec-dont-ask-session';
        checkboxLabel.textContent = "Don't ask again for this function during this session";
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
        
        const denyButton = document.createElement('button');
        denyButton.type = 'button';
        denyButton.className = 'btn secondary-btn';
        denyButton.textContent = 'Deny Execution';
        denyButton.style.backgroundColor = '#ff6b6b';
        denyButton.style.color = 'white';
        denyButton.addEventListener('click', () => handleResponse(false));
        
        const allowButton = document.createElement('button');
        allowButton.type = 'button';
        allowButton.className = 'btn primary-btn';
        allowButton.textContent = 'Allow Execution';
        allowButton.addEventListener('click', () => handleResponse(true));
        
        buttonsSection.appendChild(denyButton);
        buttonsSection.appendChild(allowButton);
        
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
     * Handle escape key to close modal (deny execution)
     */
    function handleEscapeKey(event) {
        if (event.key === 'Escape' && modalElement && modalElement.style.display === 'block') {
            handleResponse(false);
        }
    }
    
    /**
     * Handle user response
     * @param {boolean} allowed - Whether execution is allowed
     */
    function handleResponse(allowed) {
        // Check if "don't ask again" is checked - but only apply it if user allowed execution
        const dontAskCheckbox = document.getElementById('exec-dont-ask-session');
        const dontAskAgain = allowed && dontAskCheckbox && dontAskCheckbox.checked;
        
        // Hide modal
        if (modalElement) {
            modalElement.style.display = 'none';
        }
        
        // Reset checkbox for next time
        if (dontAskCheckbox) {
            dontAskCheckbox.checked = false;
        }
        
        // Resolve promise with result
        if (currentResolve) {
            currentResolve({
                allowed: allowed,
                dontAskAgain: dontAskAgain
            });
            currentResolve = null;
            currentReject = null;
        }
    }
    
    /**
     * Show the confirmation modal
     * @param {string} functionName - Name of the function to execute
     * @param {Object} args - Arguments to pass to the function
     * @returns {Promise<{allowed: boolean, dontAskAgain: boolean}>}
     */
    function showConfirmation(functionName, args) {
        return new Promise((resolve, reject) => {
            // Initialize if not already done
            if (!modalElement) {
                init();
            }
            
            // Store resolve/reject for later
            currentResolve = resolve;
            currentReject = reject;
            
            // Update function name
            const functionNameSpan = document.getElementById('exec-function-name');
            if (functionNameSpan) {
                functionNameSpan.textContent = functionName;
            }
            
            // Update arguments display
            const argsContainer = document.getElementById('exec-args-container');
            if (argsContainer) {
                try {
                    // Pretty print the arguments
                    const formattedArgs = JSON.stringify(args, null, 2);
                    argsContainer.textContent = formattedArgs;
                } catch (e) {
                    argsContainer.textContent = String(args);
                }
            }
            
            // Show modal
            if (modalElement) {
                modalElement.style.display = 'block';
                
                // Focus on the deny button for safety
                const denyButton = modalElement.querySelector('.secondary-btn');
                if (denyButton) {
                    denyButton.focus();
                }
            }
        });
    }
    
    // Session storage for functions that user said "don't ask again"
    const sessionAllowedFunctions = new Set();
    
    /**
     * Check if a function should be auto-allowed for this session
     * @param {string} functionName - Name of the function
     * @returns {boolean}
     */
    function isSessionAllowed(functionName) {
        return sessionAllowedFunctions.has(functionName);
    }
    
    /**
     * Add a function to session auto-allow list
     * @param {string} functionName - Name of the function
     */
    function addSessionAllowed(functionName) {
        sessionAllowedFunctions.add(functionName);
    }
    
    /**
     * Clear all session auto-allowed functions
     */
    function clearSessionAllowed() {
        sessionAllowedFunctions.clear();
    }
    
    // Public API
    return {
        showConfirmation,
        isSessionAllowed,
        addSessionAllowed,
        clearSessionAllowed
    };
})();