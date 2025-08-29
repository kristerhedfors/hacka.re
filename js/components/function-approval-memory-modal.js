/**
 * Function Approval Memory Modal
 * Manages the display and interaction with function approval memory settings
 */

window.FunctionApprovalMemoryModal = (function() {
    let modalElement = null;
    let updateInterval = null;
    
    /**
     * Initialize the modal by creating its DOM structure
     */
    function init() {
        // Create modal container
        modalElement = document.createElement('div');
        modalElement.id = 'function-approval-memory-modal';
        modalElement.className = 'modal';
        modalElement.style.zIndex = '10000001'; // Higher than Settings modal (999999)
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '600px';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.overflow = 'auto';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'settings-header';
        
        const title = document.createElement('h2');
        title.textContent = 'Function Approval Memory';
        header.appendChild(title);
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '15px';
        closeBtn.style.top = '15px';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.color = 'var(--text-color-secondary)';
        closeBtn.addEventListener('click', close);
        header.appendChild(closeBtn);
        
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.style.padding = '20px';
        
        // Description
        const desc = document.createElement('p');
        desc.textContent = 'Manage function approval preferences for the current session. Functions you approve or block with "Remember my choice" enabled will be automatically handled in future calls.';
        desc.style.fontSize = '0.9em';
        desc.style.color = 'var(--text-color-secondary)';
        desc.style.marginBottom = '20px';
        contentContainer.appendChild(desc);
        
        // Auto-approved functions section
        const approvedSection = createSection(
            '✅ Auto-Approved Functions',
            'Functions that will be automatically executed without confirmation',
            'approved-functions-list',
            '#4caf50'
        );
        contentContainer.appendChild(approvedSection);
        
        // Auto-blocked functions section
        const blockedSection = createSection(
            '🚫 Auto-Blocked Functions',
            'Functions that will be automatically denied execution',
            'blocked-functions-list',
            '#ff6b6b'
        );
        contentContainer.appendChild(blockedSection);
        
        // Actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.style.marginTop = '30px';
        actionsContainer.style.padding = '20px 0';
        actionsContainer.style.borderTop = '1px solid var(--border-color)';
        actionsContainer.style.display = 'flex';
        actionsContainer.style.justifyContent = 'space-between';
        actionsContainer.style.alignItems = 'center';
        
        // Clear all button
        const clearAllBtn = document.createElement('button');
        clearAllBtn.type = 'button';
        clearAllBtn.className = 'btn secondary-btn';
        clearAllBtn.innerHTML = '<i class="fas fa-trash" style="margin-right: 6px;"></i>Clear All Memory';
        clearAllBtn.addEventListener('click', handleClearAll);
        actionsContainer.appendChild(clearAllBtn);
        
        // Close button
        const closeActionBtn = document.createElement('button');
        closeActionBtn.type = 'button';
        closeActionBtn.className = 'btn primary-btn';
        closeActionBtn.textContent = 'Close';
        closeActionBtn.addEventListener('click', close);
        actionsContainer.appendChild(closeActionBtn);
        
        contentContainer.appendChild(actionsContainer);
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(contentContainer);
        modalElement.appendChild(modalContent);
        document.body.appendChild(modalElement);
        
        // Add event listeners
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                close();
            }
        });
        
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    /**
     * Create a section for approved or blocked functions
     */
    function createSection(title, description, listId, color) {
        const section = document.createElement('div');
        section.style.marginBottom = '25px';
        section.style.padding = '15px';
        section.style.backgroundColor = 'var(--bg-color-secondary)';
        section.style.borderRadius = '8px';
        section.style.border = '1px solid var(--border-color)';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.marginTop = '0';
        titleElement.style.marginBottom = '10px';
        titleElement.style.fontSize = '1em';
        titleElement.style.color = color;
        section.appendChild(titleElement);
        
        const descElement = document.createElement('p');
        descElement.textContent = description;
        descElement.style.fontSize = '0.85em';
        descElement.style.color = 'var(--text-color-secondary)';
        descElement.style.marginBottom = '15px';
        section.appendChild(descElement);
        
        const listContainer = document.createElement('div');
        listContainer.id = listId;
        listContainer.style.minHeight = '40px';
        listContainer.style.display = 'flex';
        listContainer.style.flexWrap = 'wrap';
        listContainer.style.gap = '8px';
        section.appendChild(listContainer);
        
        return section;
    }
    
    /**
     * Create a function item with remove button
     */
    function createFunctionItem(funcName, type) {
        const item = document.createElement('div');
        item.style.display = 'inline-flex';
        item.style.alignItems = 'center';
        item.style.backgroundColor = 'var(--bg-color)';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = '6px';
        item.style.padding = '6px 10px';
        item.style.fontSize = '0.9em';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = funcName;
        nameSpan.style.fontFamily = "'Courier New', Courier, monospace";
        nameSpan.style.marginRight = '10px';
        nameSpan.style.color = 'var(--text-color)';
        item.appendChild(nameSpan);
        
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.style.background = 'none';
        removeBtn.style.border = 'none';
        removeBtn.style.color = 'var(--text-color-secondary)';
        removeBtn.style.fontSize = '0.9em';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.padding = '2px 4px';
        removeBtn.style.lineHeight = '1';
        removeBtn.title = `Remove ${funcName} from ${type} list`;
        
        removeBtn.addEventListener('click', () => {
            if (window.FunctionExecutionModal) {
                FunctionExecutionModal.removeFromSessionLists(funcName);
                updateLists();
            }
        });
        
        removeBtn.addEventListener('mouseenter', () => {
            removeBtn.style.color = '#ff6b6b';
        });
        
        removeBtn.addEventListener('mouseleave', () => {
            removeBtn.style.color = 'var(--text-color-secondary)';
        });
        
        item.appendChild(removeBtn);
        
        return item;
    }
    
    /**
     * Update the lists display
     */
    function updateLists() {
        if (!window.FunctionExecutionModal) return;
        
        const lists = FunctionExecutionModal.getSessionLists();
        
        // Update approved list
        const approvedContainer = document.getElementById('approved-functions-list');
        if (approvedContainer) {
            approvedContainer.innerHTML = '';
            
            if (lists.allowed.length === 0) {
                const emptyMsg = document.createElement('span');
                emptyMsg.textContent = 'No functions have been auto-approved yet';
                emptyMsg.style.fontSize = '0.85em';
                emptyMsg.style.color = 'var(--text-color-secondary)';
                emptyMsg.style.fontStyle = 'italic';
                approvedContainer.appendChild(emptyMsg);
            } else {
                lists.allowed.forEach(funcName => {
                    const item = createFunctionItem(funcName, 'approved');
                    approvedContainer.appendChild(item);
                });
            }
        }
        
        // Update blocked list
        const blockedContainer = document.getElementById('blocked-functions-list');
        if (blockedContainer) {
            blockedContainer.innerHTML = '';
            
            if (lists.blocked.length === 0) {
                const emptyMsg = document.createElement('span');
                emptyMsg.textContent = 'No functions have been auto-blocked yet';
                emptyMsg.style.fontSize = '0.85em';
                emptyMsg.style.color = 'var(--text-color-secondary)';
                emptyMsg.style.fontStyle = 'italic';
                blockedContainer.appendChild(emptyMsg);
            } else {
                lists.blocked.forEach(funcName => {
                    const item = createFunctionItem(funcName, 'blocked');
                    blockedContainer.appendChild(item);
                });
            }
        }
    }
    
    /**
     * Handle clearing all memory
     */
    function handleClearAll() {
        const lists = FunctionExecutionModal.getSessionLists();
        const totalCount = lists.allowed.length + lists.blocked.length;
        
        if (totalCount === 0) {
            alert('No function approval memory to clear.');
            return;
        }
        
        const message = `Clear all ${totalCount} function approval preference${totalCount !== 1 ? 's' : ''}?\n\n` +
                       `This will remove:\n` +
                       `• ${lists.allowed.length} auto-approved function${lists.allowed.length !== 1 ? 's' : ''}\n` +
                       `• ${lists.blocked.length} auto-blocked function${lists.blocked.length !== 1 ? 's' : ''}`;
        
        if (confirm(message)) {
            if (window.FunctionExecutionModal) {
                FunctionExecutionModal.clearSessionAllowed();
                FunctionExecutionModal.clearSessionBlocked();
                updateLists();
            }
        }
    }
    
    /**
     * Handle escape key to close modal
     */
    function handleEscapeKey(event) {
        if (event.key === 'Escape' && modalElement && modalElement.classList.contains('active')) {
            close();
        }
    }
    
    /**
     * Open the modal
     */
    function open() {
        // Initialize if not already done
        if (!modalElement) {
            init();
        }
        
        // Show modal
        modalElement.classList.add('active');
        
        // Update lists and start periodic updates
        updateLists();
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        updateInterval = setInterval(updateLists, 2000); // Update every 2 seconds
        
        // Focus on close button for accessibility
        const closeBtn = modalElement.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.focus();
        }
    }
    
    /**
     * Close the modal
     */
    function close() {
        if (modalElement) {
            modalElement.classList.remove('active');
        }
        
        // Stop periodic updates
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }
    
    // Public API
    return {
        open,
        close
    };
})();