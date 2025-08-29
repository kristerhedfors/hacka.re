/**
 * YOLO Mode Manager Module
 * Handles YOLO mode functionality for function calling
 * YOLO mode bypasses user confirmation for function executions
 * 
 * IMPORTANT: YOLO mode is NEVER shared through links for security reasons
 * It must be explicitly enabled by the user with a warning dialog
 */

window.YoloModeManager = (function() {
    const YOLO_MODE_KEY = 'yolo_mode_enabled';
    
    /**
     * Check if YOLO mode is enabled
     * @returns {boolean} Whether YOLO mode is enabled
     */
    function isYoloModeEnabled() {
        // YOLO mode is a security-sensitive setting that should never persist from shared links
        // Always check localStorage directly, not through any abstraction that might restore from links
        return CoreStorageService.getValue(YOLO_MODE_KEY) === true;
    }
    
    /**
     * Set YOLO mode enabled state
     * @param {boolean} enabled - Whether YOLO mode should be enabled
     */
    function setYoloModeEnabled(enabled) {
        CoreStorageService.setValue(YOLO_MODE_KEY, enabled);
    }
    
    /**
     * Create a YOLO Mode Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} YOLO Mode Manager instance
     */
    function createYoloModeManager(elements) {
        /**
         * Update YOLO mode status text
         * @param {HTMLElement} statusSpan - The status span element
         * @param {boolean} yoloEnabled - Whether YOLO mode is enabled
         */
        function updateYoloStatusText(statusSpan, yoloEnabled) {
            if (!statusSpan) return;
            
            if (yoloEnabled) {
                statusSpan.textContent = '(Enabled: User is NOT prompted for every function call!)';
                statusSpan.style.color = 'var(--text-color-secondary)'; // Normal color since we have warning icon
                statusSpan.style.fontWeight = 'normal';
            } else {
                statusSpan.textContent = '(Disabled: Prompt user for every function call)';
                statusSpan.style.color = 'var(--text-color-secondary)';
                statusSpan.style.fontWeight = 'normal';
            }
        }
        
        /**
         * Show warning dialog when enabling YOLO mode
         * @returns {Promise<boolean>} Whether user confirmed enabling YOLO mode
         */
        function showYoloWarningDialog() {
            return new Promise((resolve) => {
                const confirmed = confirm(
                    "⚠️ WARNING: YOLO Mode\n\n" +
                    "Functions will execute WITHOUT asking for your confirmation.\n" +
                    "Functions can:\n" +
                    "• Make network requests\n" +
                    "• Access browser storage\n" +
                    "• Interact with page content\n\n" +
                    "Continue?"
                );
                resolve(confirmed);
            });
        }
        
        /**
         * Initialize the YOLO mode manager
         */
        function init() {
            // Add YOLO mode controls before debug mode
            addYoloModeControls();
        }
        
        /**
         * Create the session lists management section
         */
        function createSessionListsSection() {
            const container = document.createElement('div');
            container.id = 'session-lists-container';
            container.style.marginTop = '20px';
            container.style.padding = '15px';
            container.style.backgroundColor = 'var(--bg-color-secondary)';
            container.style.borderRadius = '8px';
            container.style.border = '1px solid var(--border-color)';
            
            // Title
            const title = document.createElement('h4');
            title.textContent = 'Function Approval Memory';
            title.style.marginTop = '0';
            title.style.marginBottom = '15px';
            title.style.fontSize = '0.95em';
            title.style.color = 'var(--text-color)';
            container.appendChild(title);
            
            // Description
            const desc = document.createElement('p');
            desc.textContent = 'Functions remembered during this session:';
            desc.style.fontSize = '0.85em';
            desc.style.color = 'var(--text-color-secondary)';
            desc.style.marginBottom = '15px';
            container.appendChild(desc);
            
            // Auto-allowed functions section
            const allowedSection = document.createElement('div');
            allowedSection.style.marginBottom = '15px';
            
            const allowedLabel = document.createElement('strong');
            allowedLabel.textContent = '✅ Auto-Approved:';
            allowedLabel.style.display = 'block';
            allowedLabel.style.marginBottom = '8px';
            allowedLabel.style.fontSize = '0.9em';
            allowedLabel.style.color = '#4caf50';
            allowedSection.appendChild(allowedLabel);
            
            const allowedList = document.createElement('div');
            allowedList.id = 'session-allowed-list';
            allowedList.style.minHeight = '30px';
            allowedSection.appendChild(allowedList);
            
            container.appendChild(allowedSection);
            
            // Auto-blocked functions section
            const blockedSection = document.createElement('div');
            blockedSection.style.marginBottom = '15px';
            
            const blockedLabel = document.createElement('strong');
            blockedLabel.textContent = '🚫 Auto-Blocked:';
            blockedLabel.style.display = 'block';
            blockedLabel.style.marginBottom = '8px';
            blockedLabel.style.fontSize = '0.9em';
            blockedLabel.style.color = '#ff6b6b';
            blockedSection.appendChild(blockedLabel);
            
            const blockedList = document.createElement('div');
            blockedList.id = 'session-blocked-list';
            blockedList.style.minHeight = '30px';
            blockedSection.appendChild(blockedList);
            
            container.appendChild(blockedSection);
            
            // Clear all button
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'btn secondary-btn';
            clearButton.textContent = 'Clear All Memory';
            clearButton.style.fontSize = '0.85em';
            clearButton.style.marginTop = '10px';
            clearButton.addEventListener('click', () => {
                if (confirm('Clear all function approval memory for this session?')) {
                    if (window.FunctionExecutionModal) {
                        FunctionExecutionModal.clearSessionAllowed();
                        FunctionExecutionModal.clearSessionBlocked();
                        updateSessionLists();
                    }
                }
            });
            container.appendChild(clearButton);
            
            // Update lists initially and set up periodic updates
            updateSessionLists();
            setInterval(updateSessionLists, 2000); // Update every 2 seconds
            
            return container;
        }
        
        /**
         * Update the session lists display
         */
        function updateSessionLists() {
            if (!window.FunctionExecutionModal) return;
            
            const lists = FunctionExecutionModal.getSessionLists();
            
            // Update allowed list
            const allowedContainer = document.getElementById('session-allowed-list');
            if (allowedContainer) {
                allowedContainer.innerHTML = '';
                
                if (lists.allowed.length === 0) {
                    const emptyMsg = document.createElement('span');
                    emptyMsg.textContent = 'None';
                    emptyMsg.style.fontSize = '0.85em';
                    emptyMsg.style.color = 'var(--text-color-secondary)';
                    emptyMsg.style.fontStyle = 'italic';
                    allowedContainer.appendChild(emptyMsg);
                } else {
                    lists.allowed.forEach(funcName => {
                        const item = createSessionListItem(funcName, 'allowed');
                        allowedContainer.appendChild(item);
                    });
                }
            }
            
            // Update blocked list
            const blockedContainer = document.getElementById('session-blocked-list');
            if (blockedContainer) {
                blockedContainer.innerHTML = '';
                
                if (lists.blocked.length === 0) {
                    const emptyMsg = document.createElement('span');
                    emptyMsg.textContent = 'None';
                    emptyMsg.style.fontSize = '0.85em';
                    emptyMsg.style.color = 'var(--text-color-secondary)';
                    emptyMsg.style.fontStyle = 'italic';
                    blockedContainer.appendChild(emptyMsg);
                } else {
                    lists.blocked.forEach(funcName => {
                        const item = createSessionListItem(funcName, 'blocked');
                        blockedContainer.appendChild(item);
                    });
                }
            }
        }
        
        /**
         * Create a session list item with remove button
         */
        function createSessionListItem(funcName, type) {
            const item = document.createElement('div');
            item.style.display = 'inline-flex';
            item.style.alignItems = 'center';
            item.style.backgroundColor = 'var(--bg-color)';
            item.style.border = '1px solid var(--border-color)';
            item.style.borderRadius = '4px';
            item.style.padding = '4px 8px';
            item.style.marginRight = '8px';
            item.style.marginBottom = '8px';
            item.style.fontSize = '0.85em';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = funcName;
            nameSpan.style.fontFamily = 'monospace';
            nameSpan.style.marginRight = '8px';
            item.appendChild(nameSpan);
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.style.background = 'none';
            removeBtn.style.border = 'none';
            removeBtn.style.color = 'var(--text-color-secondary)';
            removeBtn.style.fontSize = '1.2em';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.padding = '0';
            removeBtn.style.marginLeft = '4px';
            removeBtn.style.lineHeight = '1';
            removeBtn.title = `Remove ${funcName} from ${type} list`;
            
            removeBtn.addEventListener('click', () => {
                if (window.FunctionExecutionModal) {
                    FunctionExecutionModal.removeFromSessionLists(funcName);
                    updateSessionLists();
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
         * Add YOLO mode controls to the settings form
         */
        function addYoloModeControls() {
            // Check if YOLO mode already exists (prevent duplicates)
            if (document.getElementById('yolo-mode')) {
                console.log('YOLO mode controls already exist, skipping addition');
                return;
            }
            
            // Create the YOLO mode container
            const yoloModeContainer = document.createElement('div');
            yoloModeContainer.className = 'form-group';
            yoloModeContainer.style.marginTop = '10px';
            
            // Create the checkbox group
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            // Create the YOLO mode checkbox input
            const yoloModeCheckbox = document.createElement('input');
            yoloModeCheckbox.type = 'checkbox';
            yoloModeCheckbox.id = 'yolo-mode';
            yoloModeCheckbox.checked = isYoloModeEnabled();
            
            // Create the YOLO mode label
            const yoloModeLabel = document.createElement('label');
            yoloModeLabel.htmlFor = 'yolo-mode';
            yoloModeLabel.textContent = 'YOLO mode';
            yoloModeLabel.style.fontWeight = 'bold';
            
            // Add warning icon (only visible when enabled)
            const warningIcon = document.createElement('span');
            warningIcon.id = 'yolo-warning-icon';
            warningIcon.innerHTML = ' ⚠️';
            warningIcon.style.color = '#ff6b6b';
            warningIcon.style.display = yoloModeCheckbox.checked ? 'inline' : 'none';
            yoloModeLabel.appendChild(warningIcon);
            
            // Add status text
            const statusSpan = document.createElement('span');
            statusSpan.className = 'settings-item-status';
            statusSpan.id = 'yolo-mode-status';
            statusSpan.style.marginLeft = '10px';
            statusSpan.style.fontSize = '0.85em';
            updateYoloStatusText(statusSpan, yoloModeCheckbox.checked);
            yoloModeLabel.appendChild(statusSpan);
            
            // Add event listener to the checkbox
            yoloModeCheckbox.addEventListener('change', async function() {
                if (this.checked) {
                    // Show warning dialog when enabling
                    const confirmed = await showYoloWarningDialog();
                    if (!confirmed) {
                        // User cancelled, revert checkbox
                        this.checked = false;
                        return;
                    }
                }
                
                setYoloModeEnabled(this.checked);
                updateYoloStatusText(statusSpan, this.checked);
                
                // Show/hide warning icon based on state
                warningIcon.style.display = this.checked ? 'inline' : 'none';
                
                if (window.DebugService) {
                    DebugService.log('YOLO mode ' + (this.checked ? 'enabled' : 'disabled'));
                }
            });
            
            // Append elements to the checkbox group
            checkboxGroup.appendChild(yoloModeCheckbox);
            checkboxGroup.appendChild(yoloModeLabel);
            yoloModeContainer.appendChild(checkboxGroup);
            
            // Add session lists management section
            const sessionListsSection = createSessionListsSection();
            yoloModeContainer.appendChild(sessionListsSection);
            
            // Find the system prompt section to insert after
            const systemPromptSection = elements.openPromptsConfigBtn?.closest('.form-group');
            if (systemPromptSection && systemPromptSection.parentNode) {
                // Insert the YOLO mode container after the system prompt section
                systemPromptSection.parentNode.insertBefore(yoloModeContainer, systemPromptSection.nextSibling);
            }
        }
        
        // Public API
        return {
            init,
            isYoloModeEnabled,
            setYoloModeEnabled
        };
    }
    
    // Static methods for global access
    return {
        createYoloModeManager,
        isYoloModeEnabled,
        setYoloModeEnabled
    };
})();