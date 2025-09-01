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
    let currentFunctionResult = null;
    let isExecuting = false;
    
    /**
     * View function source in a nice modal view (like debug messages)
     * @param {string} functionName - Name of the function to view
     */
    function viewFunctionSource(functionName) {
        if (!functionName) return;
        
        // Get the function details - check both user-defined and default functions
        let functionSpec = null;
        let functions = window.FunctionToolsService?.getJsFunctions();
        
        if (functions && functions[functionName]) {
            functionSpec = functions[functionName];
        } else if (window.DefaultFunctionsService) {
            // Check default functions
            const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
            if (enabledDefaultFunctions && enabledDefaultFunctions[functionName]) {
                functionSpec = enabledDefaultFunctions[functionName];
            }
        }
        
        if (!functionSpec || !functionSpec.code) {
            console.warn(`Function ${functionName} not found or has no code`);
            return;
        }
        
        // Show the function source in a nice modal view
        showFunctionSourceModal(functionName, functionSpec.code);
    }
    
    /**
     * Show function source in a modal similar to debug code tooltip
     * @param {string} functionName - Name of the function
     * @param {string} code - Function source code
     */
    function showFunctionSourceModal(functionName, code) {
        // Create or get the source view modal
        let sourceModal = document.getElementById('function-source-modal');
        if (!sourceModal) {
            sourceModal = createFunctionSourceModal();
        }
        
        // Update the modal header
        const fileElement = sourceModal.querySelector('.function-source-file');
        const locationElement = sourceModal.querySelector('.function-source-location');
        const lines = code.split('\n').length;
        
        if (fileElement) {
            fileElement.textContent = `Function: ${functionName}`;
        }
        if (locationElement) {
            locationElement.textContent = `(${lines} lines)`;
        }
        
        // Adjust modal height based on content
        // Header is roughly 50px, add padding and margin (~40px), each line ~24px
        const contentHeight = (lines * 24) + 90; // line height + header + padding
        const minHeight = 200; // Minimum height for very short functions
        const maxHeight = 600; // Maximum height from original
        const adaptiveHeight = Math.min(maxHeight, Math.max(minHeight, contentHeight));
        
        sourceModal.style.height = adaptiveHeight + 'px';
        sourceModal.style.minHeight = minHeight + 'px';
        
        // Format and display the code with syntax highlighting
        const contentElement = sourceModal.querySelector('.function-source-content');
        if (contentElement) {
            const formattedCode = formatFunctionCode(code, functionName);
            contentElement.innerHTML = formattedCode;
        }
        
        // Show the modal with flex display
        sourceModal.style.display = 'flex';
        sourceModal.classList.add('visible');
        
        // Focus on the modal for keyboard navigation
        sourceModal.focus();
    }
    
    /**
     * Create the function source modal element
     * @returns {HTMLElement} The modal element
     */
    function createFunctionSourceModal() {
        // Add styles for scrollbar if not already present
        if (!document.getElementById('function-source-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'function-source-modal-styles';
            style.textContent = `
                #function-source-modal .function-source-content::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                }
                #function-source-modal .function-source-content::-webkit-scrollbar-track {
                    background: var(--bg-color-secondary, #2a2a2a);
                    border-radius: 6px;
                }
                #function-source-modal .function-source-content::-webkit-scrollbar-thumb {
                    background: var(--text-color-secondary, #666);
                    border-radius: 6px;
                }
                #function-source-modal .function-source-content::-webkit-scrollbar-thumb:hover {
                    background: var(--text-color, #888);
                }
            `;
            document.head.appendChild(style);
        }
        
        const modal = document.createElement('div');
        modal.id = 'function-source-modal';
        modal.className = 'function-source-modal';
        modal.tabIndex = -1; // Make focusable
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.width = '80%';
        modal.style.maxWidth = '900px';
        modal.style.height = 'auto'; // Will be set dynamically
        modal.style.maxHeight = '600px';
        modal.style.minHeight = '200px'; // Reduced minimum for short functions
        modal.style.zIndex = '10002'; // Higher than execution modal
        modal.style.backgroundColor = 'var(--bg-color, #1a1a1a)';
        modal.style.border = '1px solid var(--border-color, #333)';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        modal.style.display = 'none';
        modal.style.flexDirection = 'column';
        modal.style.overflow = 'hidden';
        
        modal.innerHTML = `
            <div class="function-source-header" style="
                padding: 12px 16px;
                background: var(--bg-color-secondary, #2a2a2a);
                border-bottom: 1px solid var(--border-color, #333);
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-radius: 8px 8px 0 0;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="function-source-file" style="
                        font-weight: bold;
                        color: var(--accent-color, #4CAF50);
                    "></span>
                    <span class="function-source-location" style="
                        color: var(--text-color-secondary, #888);
                        font-size: 0.9em;
                    "></span>
                </div>
                <button class="function-source-close" style="
                    background: none;
                    border: none;
                    color: var(--text-color-secondary, #888);
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='var(--hover-bg, rgba(255,255,255,0.1))'" 
                   onmouseout="this.style.backgroundColor='transparent'">&times;</button>
            </div>
            <div class="function-source-content" style="
                flex: 1;
                overflow-y: auto;
                overflow-x: auto;
                padding: 16px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 13px;
                line-height: 1.5;
                min-height: 0;
                background: var(--bg-color, #1a1a1a);
            "></div>
        `;
        
        // Add event listeners
        const closeBtn = modal.querySelector('.function-source-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        });
        
        // Close on escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.classList.remove('visible');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 200);
            }
        });
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 200);
            }
        });
        
        document.body.appendChild(modal);
        return modal;
    }
    
    /**
     * Format function code with syntax highlighting
     * @param {string} code - The function code
     * @param {string} functionName - The function name
     * @returns {string} Formatted HTML
     */
    function formatFunctionCode(code, functionName) {
        // Apply syntax highlighting if highlight.js is available
        let highlightedCode = code;
        if (window.hljs) {
            try {
                const result = window.hljs.highlight(code, { language: 'javascript' });
                highlightedCode = result.value;
            } catch (e) {
                console.warn('Failed to highlight code:', e);
                highlightedCode = escapeHtml(code);
            }
        } else {
            highlightedCode = escapeHtml(code);
        }
        
        // Split into lines and add line numbers
        const lines = highlightedCode.split('\n');
        // Calculate the width needed for the line number column
        const maxLineNumber = lines.length;
        const lineNumberWidth = Math.max(50, (maxLineNumber.toString().length * 10) + 20);
        
        let html = '<pre style="margin: 0; background: transparent; white-space: pre; overflow-x: auto;"><code class="language-javascript" style="display: block;">';
        
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            const isDefinitionLine = line.includes(`function ${functionName}`);
            
            html += `<div style="
                display: flex;
                ${isDefinitionLine ? 'background-color: var(--highlight-bg, rgba(255, 255, 0, 0.1));' : ''}
            ">`;
            html += `<span style="
                display: inline-block;
                min-width: ${lineNumberWidth}px;
                width: ${lineNumberWidth}px;
                padding-right: 16px;
                text-align: right;
                color: var(--text-color-secondary, #666);
                user-select: none;
                flex-shrink: 0;
            ">${lineNum}</span>`;
            html += `<span style="flex: 1; min-width: 0;">${line || ' '}</span>`;
            html += '</div>';
        });
        
        html += '</code></pre>';
        return html;
    }
    
    /**
     * Escape HTML characters
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    /**
     * Initialize the modal by creating its DOM structure
     */
    function init() {
        // Create modal container
        modalElement = document.createElement('div');
        modalElement.id = 'function-execution-modal';
        modalElement.className = 'modal';
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
        title.textContent = 'Function Execution';
        header.appendChild(title);
        
        // Create tabs
        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';
        tabContainer.style.marginTop = '20px'; // Add spacing from header
        
        const tabButtons = document.createElement('div');
        tabButtons.className = 'tab-buttons';
        tabButtons.style.borderBottom = '2px solid var(--border-color)'; // Add visual separator
        tabButtons.style.marginBottom = '20px'; // Space before content
        tabButtons.style.display = 'flex';
        tabButtons.style.gap = '4px';
        
        const requestTab = document.createElement('button');
        requestTab.type = 'button';
        requestTab.className = 'tab-btn active';
        requestTab.id = 'exec-request-tab';
        requestTab.innerHTML = '<i class="fas fa-phone-alt" style="margin-right: 6px;"></i><span>Function Call<br />Details</span>';
        requestTab.style.cssText = 'flex: 1 !important; min-width: 0 !important; padding: 12px 8px !important; font-size: 14px !important; font-weight: 600 !important;';
        requestTab.addEventListener('click', () => switchTab('request'));
        
        const resultTab = document.createElement('button');
        resultTab.type = 'button';
        resultTab.className = 'tab-btn';
        resultTab.id = 'exec-result-tab';
        resultTab.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 6px; color: var(--success-color, #4CAF50);"></i><span>Function Result<br />Details</span>';
        resultTab.style.cssText = 'flex: 1 !important; min-width: 0 !important; padding: 12px 8px !important; font-size: 14px !important; font-weight: 600 !important;';
        resultTab.style.display = 'none'; // Set display separately so it can be toggled
        resultTab.addEventListener('click', () => switchTab('result'));
        
        tabButtons.appendChild(requestTab);
        tabButtons.appendChild(resultTab);
        tabContainer.appendChild(tabButtons);
        
        // Create tab content
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        
        // Request tab pane
        const requestPane = createRequestPane();
        requestPane.id = 'exec-request-pane';
        requestPane.className = 'tab-pane active';
        requestPane.style.display = 'block';
        
        // Result tab pane
        const resultPane = createResultPane();
        resultPane.id = 'exec-result-pane';
        resultPane.className = 'tab-pane';
        resultPane.style.display = 'none';
        
        tabContent.appendChild(requestPane);
        tabContent.appendChild(resultPane);
        tabContainer.appendChild(tabContent);
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(tabContainer);
        modalElement.appendChild(modalContent);
        document.body.appendChild(modalElement);
        
        // Add event listeners
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                // Don't allow closing during execution
                if (!isExecuting) {
                    handleClose('cancel');
                }
            }
        });
        
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    /**
     * Create the request tab pane
     */
    function createRequestPane() {
        const container = document.createElement('div');
        container.className = 'function-details-container';
        
        // Create section
        const section = document.createElement('div');
        section.className = 'function-details-section';
        
        // Function name with view source icon
        const functionNameContainer = document.createElement('div');
        functionNameContainer.style.display = 'flex';
        functionNameContainer.style.alignItems = 'center';
        functionNameContainer.style.marginBottom = '0.5rem';
        
        const functionNameH3 = document.createElement('h3');
        functionNameH3.id = 'exec-function-name';
        functionNameH3.style.color = 'var(--accent-color)';
        functionNameH3.style.marginRight = '10px';
        functionNameH3.style.marginBottom = '0';
        functionNameContainer.appendChild(functionNameH3);
        
        // Add eye icon to view source
        const viewSourceBtn = document.createElement('button');
        viewSourceBtn.type = 'button';
        viewSourceBtn.className = 'view-source-btn';
        viewSourceBtn.id = 'exec-view-source-btn';
        viewSourceBtn.innerHTML = '<i class="fas fa-eye"></i>';
        viewSourceBtn.title = 'View function source code';
        viewSourceBtn.style.background = 'none';
        viewSourceBtn.style.border = 'none';
        viewSourceBtn.style.color = 'var(--text-color-secondary)';
        viewSourceBtn.style.cursor = 'pointer';
        viewSourceBtn.style.fontSize = '16px';
        viewSourceBtn.style.padding = '4px 8px';
        viewSourceBtn.style.borderRadius = '4px';
        viewSourceBtn.style.transition = 'background-color 0.2s';
        
        // Add hover effect
        viewSourceBtn.addEventListener('mouseenter', () => {
            viewSourceBtn.style.backgroundColor = 'var(--hover-bg, rgba(0, 0, 0, 0.05))';
        });
        viewSourceBtn.addEventListener('mouseleave', () => {
            viewSourceBtn.style.backgroundColor = 'transparent';
        });
        
        // Add click handler to view function source
        viewSourceBtn.addEventListener('click', () => {
            viewFunctionSource(currentFunctionName);
        });
        
        functionNameContainer.appendChild(viewSourceBtn);
        section.appendChild(functionNameContainer);
        
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
        
        // Remember choice checkbox with memory link
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
        
        // Add link to manage approval memory on a new line
        const memoryLink = document.createElement('a');
        memoryLink.href = '#';
        memoryLink.className = 'function-library-link';
        memoryLink.textContent = 'Manage function approval memory';
        memoryLink.style.fontSize = '0.85em';
        memoryLink.style.marginTop = '8px';
        memoryLink.style.marginLeft = '26px'; // Align with checkbox text
        memoryLink.style.display = 'block';
        memoryLink.style.color = 'var(--accent-color)';
        memoryLink.style.textDecoration = 'none';
        memoryLink.style.transition = 'opacity 0.2s';
        
        // Add hover effect
        memoryLink.addEventListener('mouseenter', () => {
            memoryLink.style.opacity = '0.8';
            memoryLink.style.textDecoration = 'underline';
        });
        memoryLink.addEventListener('mouseleave', () => {
            memoryLink.style.opacity = '1';
            memoryLink.style.textDecoration = 'none';
        });
        
        memoryLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.FunctionApprovalMemoryModal) {
                FunctionApprovalMemoryModal.open();
            }
        });
        checkboxDiv.appendChild(memoryLink);
        
        container.appendChild(checkboxDiv);
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'form-actions';
        actions.style.display = 'flex';
        actions.style.flexWrap = 'wrap';
        actions.style.gap = '10px';
        actions.style.justifyContent = 'space-between';
        actions.style.alignItems = 'center';
        actions.style.marginTop = '1.5rem';
        
        // First row - Block button alone
        const blockBtn = document.createElement('button');
        blockBtn.type = 'button';
        blockBtn.id = 'exec-block-btn';
        blockBtn.className = 'btn secondary-btn';
        blockBtn.innerHTML = '<i class="fas fa-ban" style="margin-right: 6px;"></i>Block';
        blockBtn.style.marginRight = 'auto';
        blockBtn.addEventListener('click', () => handleRequestAction('block'));
        
        // Second row container - Execute buttons
        const executeActions = document.createElement('div');
        executeActions.style.display = 'flex';
        executeActions.style.gap = '10px';
        executeActions.style.width = '100%';
        executeActions.style.justifyContent = 'flex-end';
        
        const executeInterceptBtn = document.createElement('button');
        executeInterceptBtn.type = 'button';
        executeInterceptBtn.id = 'exec-intercept-btn';
        executeInterceptBtn.className = 'btn secondary-btn';
        executeInterceptBtn.innerHTML = '<i class="fas fa-play" style="margin-right: 6px;"></i>Execute and Intercept';
        executeInterceptBtn.addEventListener('click', () => handleRequestAction('execute-intercept'));
        
        const executeBtn = document.createElement('button');
        executeBtn.type = 'button';
        executeBtn.id = 'exec-execute-btn';
        executeBtn.className = 'btn primary-btn';
        executeBtn.innerHTML = '<i class="fas fa-play" style="margin-right: 6px;"></i>Execute';
        executeBtn.addEventListener('click', () => handleRequestAction('execute'));
        
        executeActions.appendChild(executeInterceptBtn);
        executeActions.appendChild(executeBtn);
        
        actions.appendChild(blockBtn);
        actions.appendChild(executeActions);
        container.appendChild(actions);
        
        return container;
    }
    
    /**
     * Create the result tab pane
     */
    function createResultPane() {
        const container = document.createElement('div');
        container.className = 'function-details-container';
        
        // Section
        const section = document.createElement('div');
        section.className = 'function-details-section';
        
        // Execution status
        const statusDiv = document.createElement('div');
        statusDiv.id = 'exec-status';
        statusDiv.style.marginBottom = '1rem';
        statusDiv.style.padding = '12px 16px';
        statusDiv.style.borderRadius = '8px';
        statusDiv.style.fontSize = '0.9em';
        statusDiv.style.display = 'none';
        section.appendChild(statusDiv);
        
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
        
        const resultTextarea = document.createElement('textarea');
        resultTextarea.id = 'exec-result-textarea';
        resultTextarea.style.flex = '1';
        resultTextarea.style.margin = '0';
        resultTextarea.style.padding = '16px';
        resultTextarea.style.fontFamily = "'Courier New', Courier, monospace";
        resultTextarea.style.fontSize = '13px';
        resultTextarea.style.lineHeight = '1.4';
        resultTextarea.style.backgroundColor = 'var(--bg-color)';
        resultTextarea.style.color = 'var(--text-color)';
        resultTextarea.style.border = 'none';
        resultTextarea.style.resize = 'vertical';
        resultTextarea.style.minHeight = '200px';
        resultTextarea.style.maxHeight = '400px';
        resultTextarea.style.width = '100%';
        resultTextarea.style.boxSizing = 'border-box';
        resultValue.appendChild(resultTextarea);
        
        // Restore button
        const restoreResultBtn = document.createElement('button');
        restoreResultBtn.type = 'button';
        restoreResultBtn.className = 'copy-btn';
        restoreResultBtn.title = 'Restore original result';
        restoreResultBtn.innerHTML = '<i class="fas fa-undo"></i>';
        restoreResultBtn.addEventListener('click', () => {
            if (currentFunctionResult !== null) {
                try {
                    resultTextarea.value = JSON.stringify(currentFunctionResult, null, 2);
                } catch (e) {
                    resultTextarea.value = String(currentFunctionResult);
                }
            }
        });
        resultValue.appendChild(restoreResultBtn);
        
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
        infoDiv.innerHTML = '<i class="fas fa-info-circle" style="margin-right: 8px;"></i>You can edit the result before returning it to the AI, or go back to the Request tab to re-execute with different parameters.';
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
        
        const blockResultBtn = document.createElement('button');
        blockResultBtn.type = 'button';
        blockResultBtn.id = 'exec-block-result-btn';
        blockResultBtn.className = 'btn secondary-btn';
        blockResultBtn.innerHTML = '<i class="fas fa-ban" style="margin-right: 6px;"></i>Block Result';
        blockResultBtn.addEventListener('click', () => handleResultAction('block'));
        leftActions.appendChild(blockResultBtn);
        
        // Right side - Return button
        const rightActions = document.createElement('div');
        
        const returnBtn = document.createElement('button');
        returnBtn.type = 'button';
        returnBtn.id = 'exec-return-btn';
        returnBtn.className = 'btn primary-btn';
        returnBtn.innerHTML = '<i class="fas fa-check" style="margin-right: 6px;"></i>Return';
        returnBtn.addEventListener('click', () => handleResultAction('return'));
        
        rightActions.appendChild(returnBtn);
        
        actions.appendChild(leftActions);
        actions.appendChild(rightActions);
        container.appendChild(actions);
        
        return container;
    }
    
    /**
     * Switch between tabs
     */
    function switchTab(tab) {
        currentTab = tab;
        
        const requestTab = document.getElementById('exec-request-tab');
        const resultTab = document.getElementById('exec-result-tab');
        const requestPane = document.getElementById('exec-request-pane');
        const resultPane = document.getElementById('exec-result-pane');
        
        if (tab === 'request') {
            requestTab.classList.add('active');
            resultTab.classList.remove('active');
            requestPane.style.display = 'block';
            resultPane.style.display = 'none';
        } else {
            requestTab.classList.remove('active');
            resultTab.classList.add('active');
            requestPane.style.display = 'none';
            resultPane.style.display = 'block';
        }
    }
    
    /**
     * Handle escape key to close modal
     */
    function handleEscapeKey(event) {
        if (event.key === 'Escape' && modalElement && modalElement.classList.contains('active')) {
            if (!isExecuting) {
                handleClose('cancel');
            }
        }
    }
    
    /**
     * Handle request tab actions
     */
    async function handleRequestAction(action) {
        // Get the edited arguments
        const argsTextarea = document.getElementById('exec-args-textarea');
        let editedArgs = null;
        
        if (argsTextarea && action !== 'block') {
            try {
                editedArgs = JSON.parse(argsTextarea.value);
            } catch (e) {
                alert('Invalid JSON in arguments. Please fix the syntax and try again.');
                return;
            }
            // Update the stored original arguments for re-execution
            originalArguments = editedArgs;
        }
        
        // Check if "remember choice" is checked
        const rememberCheckbox = document.getElementById('exec-remember-choice');
        const rememberChoice = rememberCheckbox && rememberCheckbox.checked;
        
        if (action === 'block') {
            if (rememberChoice && currentFunctionName) {
                addSessionBlocked(currentFunctionName);
            }
            handleClose({
                action: 'block',
                allowed: false,
                interceptResult: false,
                editedArguments: null,
                rememberChoice: rememberChoice,
                functionName: currentFunctionName
            });
        } else if (action === 'execute-intercept') {
            // Execute with intercept
            isExecuting = true;
            updateExecutionStatus('executing');
            
            // Check if we're already in an intercept session (currentResolve exists and modal is active)
            // We're in re-execution if we have a resolver and the modal is showing (regardless of tab)
            const isReExecution = currentResolve && modalElement && modalElement.classList.contains('active') && currentFunctionResult !== null;
            
            if (isReExecution) {
                // We're re-executing within an existing intercept session
                // Mark that we need fresh execution and switch to result tab with loading state
                needsFreshExecution = true;
                originalArguments = editedArgs; // Update arguments for the new execution
                
                // Show result tab with executing status
                const resultTab = document.getElementById('exec-result-tab');
                if (resultTab) {
                    resultTab.style.display = 'flex';
                }
                
                // Clear the result textarea and show executing status
                const resultTextarea = document.getElementById('exec-result-textarea');
                if (resultTextarea) {
                    resultTextarea.value = 'Executing function...';
                }
                
                switchTab('result');
                updateExecutionStatus('executing');
                
                // Execute the function
                try {
                    if (window.FunctionToolsExecutor) {
                        const startTime = performance.now();
                        const result = await FunctionToolsExecutor.execute(currentFunctionName, editedArgs);
                        const endTime = performance.now();
                        const executionTime = ((endTime - startTime) / 1000).toFixed(2);
                        
                        // Update the result in our state
                        currentFunctionResult = result?.result;
                        
                        // Update the result textarea
                        if (resultTextarea) {
                            try {
                                resultTextarea.value = JSON.stringify(currentFunctionResult, null, 2);
                            } catch (e) {
                                resultTextarea.value = String(currentFunctionResult);
                            }
                        }
                        
                        updateExecutionStatus('success', executionTime);
                        isExecuting = false;
                        
                        // Focus on result textarea
                        if (resultTextarea) {
                            resultTextarea.focus();
                            resultTextarea.select();
                        }
                    } else {
                        throw new Error('FunctionToolsExecutor not available');
                    }
                } catch (error) {
                    console.error('Error executing function:', error);
                    updateExecutionStatus('error');
                    isExecuting = false;
                    
                    // Show error in result textarea but mark it as an execution error
                    // Don't show timeout errors as results - show user-friendly message
                    if (resultTextarea) {
                        if (error.message && error.message.includes('timed out')) {
                            resultTextarea.value = '// Function execution timed out\n// Please try with simpler parameters or check the function code\n// You can still edit this result before returning';
                            // Set a null result to avoid returning the error as a successful result
                            currentFunctionResult = null;
                        } else {
                            resultTextarea.value = JSON.stringify({
                                error: error.message,
                                status: 'error',
                                note: 'Execution failed - you can edit this before returning'
                            }, null, 2);
                            // Set the error as the result so user can decide what to do
                            currentFunctionResult = { error: error.message, status: 'error' };
                        }
                    }
                }
            } else {
                // First time intercept - close modal and let parent handle
                handleClose({
                    action: 'approve-intercept',
                    allowed: true,
                    interceptResult: true,
                    editedArguments: editedArgs,
                    rememberChoice: false, // Don't remember for intercept
                    functionName: currentFunctionName
                });
            }
        } else {
            // Direct execution without interception
            isExecuting = true;
            updateExecutionStatus('executing');
            
            if (rememberChoice && currentFunctionName) {
                addSessionAllowed(currentFunctionName);
            }
            handleClose({
                action: 'approve',
                allowed: true,
                interceptResult: false,
                editedArguments: editedArgs,
                rememberChoice: rememberChoice,
                functionName: currentFunctionName
            });
        }
    }
    
    /**
     * Handle result tab actions
     */
    function handleResultAction(action) {
        const resultTextarea = document.getElementById('exec-result-textarea');
        
        if (action === 'block') {
            handleClose({ blocked: true, result: null });
        } else {
            // Return the edited result
            try {
                const editedResult = JSON.parse(resultTextarea.value);
                handleClose({ blocked: false, result: editedResult });
            } catch (e) {
                alert('Invalid JSON in result. Please fix the syntax and try again.');
            }
        }
    }
    
    /**
     * Update execution status display
     */
    function updateExecutionStatus(status, executionTime) {
        const statusDiv = document.getElementById('exec-status');
        if (!statusDiv) return;
        
        if (status === 'executing') {
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = 'var(--info-bg, #d1ecf1)';
            statusDiv.style.color = 'var(--info-text, #0c5460)';
            statusDiv.style.border = '1px solid var(--info-border, #bee5eb)';
            statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>Executing function...';
        } else if (status === 'success') {
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = 'var(--success-bg, #d4edda)';
            statusDiv.style.color = 'var(--success-text, #155724)';
            statusDiv.style.border = '1px solid var(--success-border, #c3e6cb)';
            const timeText = executionTime ? ` (${executionTime}s)` : '';
            statusDiv.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>Function executed successfully${timeText}`;
        } else if (status === 'error') {
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = 'var(--error-bg, #f8d7da)';
            statusDiv.style.color = 'var(--error-text, #721c24)';
            statusDiv.style.border = '1px solid var(--error-border, #f5c6cb)';
            statusDiv.innerHTML = '<i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>Function execution failed';
        } else {
            statusDiv.style.display = 'none';
        }
    }
    
    /**
     * Handle modal close
     */
    function handleClose(result) {
        if (modalElement) {
            modalElement.classList.remove('active');
        }
        
        // Reset state
        isExecuting = false;
        
        // Only reset these if we're truly done (not just closing for intercept)
        const isInterceptClose = result && result.action === 'approve-intercept';
        
        if (!isInterceptClose) {
            // Full reset - we're completely done
            currentTab = 'request';
            currentFunctionResult = null;
            originalArguments = null;
            currentFunctionName = null;
            needsFreshExecution = false;
            
            // Reset UI
            const rememberCheckbox = document.getElementById('exec-remember-choice');
            if (rememberCheckbox) {
                rememberCheckbox.checked = false;
            }
            
            const argsTextarea = document.getElementById('exec-args-textarea');
            if (argsTextarea) {
                argsTextarea.value = '';
            }
            
            const resultTextarea = document.getElementById('exec-result-textarea');
            if (resultTextarea) {
                resultTextarea.value = '';
            }
            
            const resultTab = document.getElementById('exec-result-tab');
            if (resultTab) {
                resultTab.style.display = 'none';
            }
            
            switchTab('request');
            updateExecutionStatus('none');
        }
        
        // Resolve promise with result
        if (currentResolve) {
            if (result === 'cancel') {
                // User cancelled via escape or outside click
                currentResolve({
                    action: 'block',
                    allowed: false,
                    interceptResult: false,
                    editedArguments: null,
                    rememberChoice: false,
                    functionName: currentFunctionName
                });
            } else {
                currentResolve(result);
            }
            currentResolve = null;
            // Don't clear currentFunctionName if intercepting
            if (!isInterceptClose) {
                currentFunctionName = null;
            }
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
            currentFunctionResult = null;
            
            // Reset to request tab
            switchTab('request');
            const resultTab = document.getElementById('exec-result-tab');
            if (resultTab) {
                resultTab.style.display = 'none';
            }
            
            // Update function name
            const functionNameElement = document.getElementById('exec-function-name');
            if (functionNameElement) {
                functionNameElement.textContent = functionName;
            }
            
            // Update view source button visibility
            const viewSourceBtn = document.getElementById('exec-view-source-btn');
            if (viewSourceBtn) {
                viewSourceBtn.style.display = functionName ? 'inline-block' : 'none';
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
                    const formattedArgs = JSON.stringify(args, null, 2);
                    argsTextarea.value = formattedArgs;
                } catch (e) {
                    argsTextarea.value = String(args);
                }
            }
            
            // Show modal
            if (modalElement) {
                modalElement.classList.add('active');
                
                // Focus on the block button for safety
                const blockButton = document.getElementById('exec-block-btn');
                if (blockButton) {
                    blockButton.focus();
                }
            }
        });
    }
    
    /**
     * Show modal for intercepting and editing function results
     * @param {string} functionName - Name of the function that was executed
     * @param {*} result - The result returned from the function
     * @param {string} executionTime - The execution time in seconds with 2 decimal places
     * @returns {Promise<{blocked: boolean, result: *}>} Promise resolving to object with blocked flag and result
     */
    function showResultInterceptor(functionName, result, executionTime) {
        return new Promise((resolve) => {
            // Initialize if not already done
            if (!modalElement) {
                init();
            }
            
            // Store resolve and result
            currentResolve = resolve;
            currentFunctionResult = result;
            isExecuting = false;
            needsFreshExecution = false; // Reset this flag when showing interceptor
            
            // If we don't have the function name stored, use the provided one
            // This preserves the context when coming back from execution
            if (!currentFunctionName) {
                currentFunctionName = functionName;
            }
            
            // Ensure parameters are still displayed in Request tab
            // (they should already be there from the initial showConfirmation)
            const argsTextarea = document.getElementById('exec-args-textarea');
            if (argsTextarea && !argsTextarea.value && originalArguments) {
                try {
                    argsTextarea.value = JSON.stringify(originalArguments, null, 2);
                } catch (e) {
                    argsTextarea.value = String(originalArguments);
                }
            }
            
            // Update result textarea
            const resultTextarea = document.getElementById('exec-result-textarea');
            if (resultTextarea) {
                try {
                    resultTextarea.value = JSON.stringify(result, null, 2);
                } catch (e) {
                    resultTextarea.value = String(result);
                }
            }
            
            // Show result tab
            const resultTab = document.getElementById('exec-result-tab');
            if (resultTab) {
                resultTab.style.display = 'flex';
            }
            
            // Switch to result tab
            switchTab('result');
            updateExecutionStatus('success', executionTime);
            
            // Show modal if not already visible
            if (!modalElement.classList.contains('active')) {
                modalElement.classList.add('active');
            }
            
            // Focus on result textarea
            if (resultTextarea) {
                resultTextarea.focus();
                resultTextarea.select();
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
    
    // Initialize on load
    initSessionLists();
    
    // Public API
    return {
        showConfirmation,
        showResultInterceptor,
        isSessionAllowed,
        isSessionBlocked,
        addSessionAllowed,
        viewFunctionSource,  // Expose for use by other modals
        addSessionBlocked,
        removeFromSessionLists,
        clearSessionAllowed,
        clearSessionBlocked,
        getSessionLists
    };
})();