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
        
        // Removed session list functions as they're now handled by the modal and link is inline
        
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
            
            // Add function approval memory link inline
            const memoryLink = document.createElement('a');
            memoryLink.href = '#';
            memoryLink.className = 'function-library-link';
            memoryLink.textContent = '   Manage function approval memory';
            memoryLink.style.fontSize = '0.85em';
            memoryLink.style.marginLeft = '8px';
            memoryLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.FunctionApprovalMemoryModal) {
                    FunctionApprovalMemoryModal.open();
                }
            });
            yoloModeLabel.appendChild(memoryLink);
            
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