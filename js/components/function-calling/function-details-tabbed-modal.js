/**
 * Function Details Tabbed Modal
 * A unified two-tab modal for displaying function call and result details
 * Replaces the old separate modals with a cleaner tabbed interface
 */

window.FunctionDetailsTabbedModal = (function() {
    'use strict';
    
    let modalElement = null;
    let currentTab = 'call'; // 'call' or 'result'
    let currentData = null;
    
    /**
     * Initialize the modal by creating its DOM structure
     */
    function init() {
        createModal();
    }
    
    /**
     * Create the modal DOM structure
     */
    function createModal() {
        // Check if modal already exists
        if (document.getElementById('function-details-tabbed-modal')) {
            modalElement = document.getElementById('function-details-tabbed-modal');
            return;
        }
        
        // Create modal container
        modalElement = document.createElement('div');
        modalElement.id = 'function-details-tabbed-modal';
        modalElement.className = 'modal';
        modalElement.style.zIndex = '10001';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '700px';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.display = 'flex';
        modalContent.style.flexDirection = 'column';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'settings-header';
        header.style.padding = '20px';
        header.style.borderBottom = '1px solid var(--border-color)';
        
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.style.justifyContent = 'space-between';
        
        const title = document.createElement('h2');
        title.id = 'function-details-tabbed-title';
        title.style.margin = '0';
        title.style.fontSize = '1.5em';
        titleContainer.appendChild(title);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'icon-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.fontSize = '28px';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'var(--text-color)';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.padding = '0';
        closeBtn.style.width = '30px';
        closeBtn.style.height = '30px';
        closeBtn.addEventListener('click', hideModal);
        
        titleContainer.appendChild(closeBtn);
        header.appendChild(titleContainer);
        
        // Add a line break/spacing
        const spacer = document.createElement('div');
        spacer.style.height = '8px';
        header.appendChild(spacer);
        
        // Function name with eye icon
        const functionNameContainer = document.createElement('div');
        functionNameContainer.style.display = 'flex';
        functionNameContainer.style.alignItems = 'center';
        functionNameContainer.style.marginTop = '4px';
        
        const functionNameH3 = document.createElement('h3');
        functionNameH3.id = 'function-details-name';
        functionNameH3.style.color = 'var(--accent-color)';
        functionNameH3.style.margin = '0';
        functionNameH3.style.marginRight = '10px';
        functionNameContainer.appendChild(functionNameH3);
        
        // Add eye icon to view source
        const viewSourceBtn = document.createElement('button');
        viewSourceBtn.type = 'button';
        viewSourceBtn.className = 'view-source-btn';
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
        
        viewSourceBtn.addEventListener('mouseenter', () => {
            viewSourceBtn.style.backgroundColor = 'var(--hover-bg, rgba(0, 0, 0, 0.05))';
        });
        viewSourceBtn.addEventListener('mouseleave', () => {
            viewSourceBtn.style.backgroundColor = 'transparent';
        });
        viewSourceBtn.addEventListener('click', () => {
            if (currentData && currentData.functionName) {
                viewFunctionSource(currentData.functionName);
            }
        });
        
        functionNameContainer.appendChild(viewSourceBtn);
        header.appendChild(functionNameContainer);
        
        // Create tabs
        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';
        tabContainer.style.flex = '1';
        tabContainer.style.display = 'flex';
        tabContainer.style.flexDirection = 'column';
        tabContainer.style.minHeight = '0';
        
        const tabButtons = document.createElement('div');
        tabButtons.className = 'tab-buttons';
        tabButtons.style.borderBottom = '2px solid var(--border-color)';
        tabButtons.style.padding = '0 20px';
        
        const callTab = document.createElement('button');
        callTab.type = 'button';
        callTab.className = 'tab-btn active';
        callTab.id = 'details-call-tab';
        callTab.innerHTML = '<i class="fas fa-phone-alt" style="margin-right: 6px;"></i><span>Function Call Details</span>';
        callTab.style.cssText = 'min-width: 180px !important; padding: 10px 16px !important; font-size: 14px !important; font-weight: 500 !important;';
        callTab.addEventListener('click', () => switchTab('call'));
        
        const resultTab = document.createElement('button');
        resultTab.type = 'button';
        resultTab.className = 'tab-btn';
        resultTab.id = 'details-result-tab';
        resultTab.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 6px; color: var(--success-color, #4CAF50);"></i><span>Function Result Details</span>';
        resultTab.style.cssText = 'min-width: 180px !important; padding: 10px 16px !important; font-size: 14px !important; font-weight: 500 !important;';
        resultTab.addEventListener('click', () => switchTab('result'));
        
        tabButtons.appendChild(callTab);
        tabButtons.appendChild(resultTab);
        tabContainer.appendChild(tabButtons);
        
        // Create tab content
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.style.flex = '1';
        tabContent.style.overflow = 'auto';
        tabContent.style.padding = '20px';
        tabContent.style.minHeight = '0';
        
        // Call tab pane
        const callPane = createCallPane();
        callPane.id = 'details-call-pane';
        callPane.className = 'tab-pane active';
        callPane.style.display = 'block';
        
        // Result tab pane
        const resultPane = createResultPane();
        resultPane.id = 'details-result-pane';
        resultPane.className = 'tab-pane';
        resultPane.style.display = 'none';
        
        tabContent.appendChild(callPane);
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
                hideModal();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalElement && modalElement.classList.contains('active')) {
                hideModal();
            }
        });
    }
    
    /**
     * Create the call tab pane
     */
    function createCallPane() {
        const container = document.createElement('div');
        
        // Parameters section
        const parametersSection = document.createElement('div');
        parametersSection.className = 'form-group';
        
        const parametersLabel = document.createElement('label');
        parametersLabel.textContent = 'Parameters:';
        parametersLabel.style.fontWeight = 'bold';
        parametersLabel.style.marginBottom = '8px';
        parametersLabel.style.display = 'block';
        parametersSection.appendChild(parametersLabel);
        
        const parametersArea = document.createElement('pre');
        parametersArea.id = 'details-call-parameters';
        parametersArea.style.backgroundColor = 'var(--bg-color-secondary)';
        parametersArea.style.padding = '12px';
        parametersArea.style.borderRadius = '4px';
        parametersArea.style.border = '1px solid var(--border-color)';
        parametersArea.style.fontFamily = 'monospace';
        parametersArea.style.fontSize = '13px';
        parametersArea.style.whiteSpace = 'pre-wrap';
        parametersArea.style.wordBreak = 'break-word';
        parametersArea.style.margin = '0';
        parametersArea.style.maxHeight = '400px';
        parametersArea.style.overflow = 'auto';
        parametersSection.appendChild(parametersArea);
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn secondary-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy" style="margin-right: 6px;"></i>Copy Parameters';
        copyBtn.style.marginTop = '12px';
        copyBtn.addEventListener('click', () => {
            if (currentData && currentData.parameters) {
                copyToClipboard(JSON.stringify(currentData.parameters, null, 2));
            }
        });
        parametersSection.appendChild(copyBtn);
        
        container.appendChild(parametersSection);
        return container;
    }
    
    /**
     * Create the result tab pane
     */
    function createResultPane() {
        const container = document.createElement('div');
        
        // Result info section
        const infoSection = document.createElement('div');
        infoSection.className = 'form-group';
        infoSection.style.marginBottom = '16px';
        
        const infoGrid = document.createElement('div');
        infoGrid.style.display = 'grid';
        infoGrid.style.gridTemplateColumns = '120px 1fr';
        infoGrid.style.gap = '8px';
        infoGrid.style.fontSize = '14px';
        
        // Type row
        const typeLabel = document.createElement('span');
        typeLabel.textContent = 'Result Type:';
        typeLabel.style.fontWeight = 'bold';
        typeLabel.style.color = 'var(--text-color-secondary)';
        infoGrid.appendChild(typeLabel);
        
        const typeValue = document.createElement('span');
        typeValue.id = 'details-result-type';
        typeValue.style.color = 'var(--accent-color)';
        infoGrid.appendChild(typeValue);
        
        // Time row
        const timeLabel = document.createElement('span');
        timeLabel.textContent = 'Execution Time:';
        timeLabel.style.fontWeight = 'bold';
        timeLabel.style.color = 'var(--text-color-secondary)';
        infoGrid.appendChild(timeLabel);
        
        const timeValue = document.createElement('span');
        timeValue.id = 'details-result-time';
        infoGrid.appendChild(timeValue);
        
        infoSection.appendChild(infoGrid);
        container.appendChild(infoSection);
        
        // Result value section
        const resultSection = document.createElement('div');
        resultSection.className = 'form-group';
        
        const resultLabel = document.createElement('label');
        resultLabel.textContent = 'Result Value:';
        resultLabel.style.fontWeight = 'bold';
        resultLabel.style.marginBottom = '8px';
        resultLabel.style.display = 'block';
        resultSection.appendChild(resultLabel);
        
        const resultArea = document.createElement('pre');
        resultArea.id = 'details-result-value';
        resultArea.style.backgroundColor = 'var(--bg-color-secondary)';
        resultArea.style.padding = '12px';
        resultArea.style.borderRadius = '4px';
        resultArea.style.border = '1px solid var(--border-color)';
        resultArea.style.fontFamily = 'monospace';
        resultArea.style.fontSize = '13px';
        resultArea.style.whiteSpace = 'pre-wrap';
        resultArea.style.wordBreak = 'break-word';
        resultArea.style.margin = '0';
        resultArea.style.maxHeight = '400px';
        resultArea.style.overflow = 'auto';
        resultSection.appendChild(resultArea);
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn secondary-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy" style="margin-right: 6px;"></i>Copy Result';
        copyBtn.style.marginTop = '12px';
        copyBtn.addEventListener('click', () => {
            if (currentData && currentData.resultValue !== undefined) {
                const value = typeof currentData.resultValue === 'string' 
                    ? currentData.resultValue 
                    : JSON.stringify(currentData.resultValue, null, 2);
                copyToClipboard(value);
            }
        });
        resultSection.appendChild(copyBtn);
        
        container.appendChild(resultSection);
        return container;
    }
    
    /**
     * Switch between tabs
     */
    function switchTab(tab) {
        currentTab = tab;
        
        const callTab = document.getElementById('details-call-tab');
        const resultTab = document.getElementById('details-result-tab');
        const callPane = document.getElementById('details-call-pane');
        const resultPane = document.getElementById('details-result-pane');
        
        if (tab === 'call') {
            callTab.classList.add('active');
            resultTab.classList.remove('active');
            callPane.style.display = 'block';
            resultPane.style.display = 'none';
        } else {
            callTab.classList.remove('active');
            resultTab.classList.add('active');
            callPane.style.display = 'none';
            resultPane.style.display = 'block';
        }
    }
    
    /**
     * Show the modal with function details
     * @param {Object} data - Function data
     */
    function showModal(data) {
        if (!modalElement) {
            init();
        }
        
        currentData = data;
        const { functionName, parameters, resultType, resultValue, executionTime, type } = data;
        
        // Update title based on which icon was clicked
        const title = document.getElementById('function-details-tabbed-title');
        if (title) {
            title.textContent = 'Function Details';
        }
        
        // Update function name
        const nameElement = document.getElementById('function-details-name');
        if (nameElement) {
            nameElement.textContent = functionName || 'Unknown Function';
        }
        
        // Update call tab content
        const parametersArea = document.getElementById('details-call-parameters');
        if (parametersArea) {
            if (parameters) {
                parametersArea.textContent = JSON.stringify(parameters, null, 2);
            } else {
                parametersArea.textContent = 'No parameters available';
                parametersArea.style.color = 'var(--text-color-secondary)';
            }
        }
        
        // Update result tab content
        const resultTypeElement = document.getElementById('details-result-type');
        if (resultTypeElement) {
            resultTypeElement.textContent = resultType || 'unknown';
        }
        
        const resultTimeElement = document.getElementById('details-result-time');
        if (resultTimeElement) {
            resultTimeElement.textContent = executionTime !== undefined ? `${executionTime}ms` : 'N/A';
        }
        
        const resultValueArea = document.getElementById('details-result-value');
        if (resultValueArea) {
            if (resultValue !== undefined) {
                const displayValue = typeof resultValue === 'string' 
                    ? resultValue 
                    : JSON.stringify(resultValue, null, 2);
                resultValueArea.textContent = displayValue;
            } else {
                resultValueArea.textContent = 'No result available';
                resultValueArea.style.color = 'var(--text-color-secondary)';
            }
        }
        
        // Switch to appropriate tab based on what was clicked
        if (type === 'result') {
            switchTab('result');
        } else {
            switchTab('call');
        }
        
        // Show modal
        modalElement.classList.add('active');
    }
    
    /**
     * Hide the modal
     */
    function hideModal() {
        if (modalElement) {
            modalElement.classList.remove('active');
        }
    }
    
    /**
     * View function source (reuse from function-execution-modal)
     */
    function viewFunctionSource(functionName) {
        if (!functionName || functionName === 'Unknown Function' || functionName === 'Function Result') {
            console.warn('Cannot view source for unknown function');
            return;
        }
        
        // This will use the same source viewer from function-execution-modal
        if (window.FunctionExecutionModal && window.FunctionExecutionModal.viewFunctionSource) {
            window.FunctionExecutionModal.viewFunctionSource(functionName);
        } else {
            // Fallback: try to create the source viewer directly
            console.warn('Function source viewer not available from FunctionExecutionModal, trying direct approach');
            
            // Get the function details
            let functionSpec = null;
            if (window.FunctionToolsService) {
                const functions = window.FunctionToolsService.getJsFunctions();
                if (functions && functions[functionName]) {
                    functionSpec = functions[functionName];
                }
            }
            
            if (!functionSpec && window.DefaultFunctionsService) {
                const enabledDefaultFunctions = window.DefaultFunctionsService.getEnabledDefaultFunctions();
                if (enabledDefaultFunctions && enabledDefaultFunctions[functionName]) {
                    functionSpec = enabledDefaultFunctions[functionName];
                }
            }
            
            if (functionSpec && functionSpec.code) {
                // Show a simple alert with the code (fallback)
                const code = functionSpec.code;
                console.log(`Function ${functionName} source:`, code);
                alert(`Function ${functionName} source code:\n\n${code}`);
            } else {
                console.warn(`Function ${functionName} not found or has no code`);
            }
        }
    }
    
    /**
     * Copy text to clipboard
     */
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                // Show brief success feedback
                console.log('Copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }
    
    // Public API
    return {
        init,
        showModal,
        hideModal
    };
})();

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', FunctionDetailsTabbedModal.init);
} else {
    FunctionDetailsTabbedModal.init();
}