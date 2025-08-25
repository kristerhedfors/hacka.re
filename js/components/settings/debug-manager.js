/**
 * Debug Manager Module
 * Handles debug-related functionality for the Settings modal
 * Provides hierarchical debug category controls
 */

window.DebugManager = (function() {
    /**
     * Create a Debug Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Debug Manager instance
     */
    function createDebugManager(elements) {
        /**
         * Update debug status text based on enabled categories
         * @param {HTMLElement} statusSpan - The status span element
         * @param {boolean} debugEnabled - Whether debug mode is enabled
         */
        function updateDebugStatusText(statusSpan, debugEnabled) {
            if (!statusSpan) return;
            
            if (!debugEnabled) {
                statusSpan.textContent = '(Disabled)';
                return;
            }
            
            // Get enabled categories
            const categories = DebugService.getCategories();
            const enabledCategories = Object.entries(categories)
                .filter(([key, cat]) => cat.enabled)
                .map(([key, cat]) => cat.name);
            
            if (enabledCategories.length === 0) {
                statusSpan.textContent = '(Enabled, no categories selected)';
            } else if (enabledCategories.length === Object.keys(categories).length) {
                statusSpan.textContent = '(Enabled for all categories)';
            } else if (enabledCategories.length <= 3) {
                statusSpan.textContent = `(Enabled for ${enabledCategories.join(', ')})`;
            } else {
                statusSpan.textContent = `(Enabled for ${enabledCategories.slice(0, 3).join(', ')}...)`;
            }
        }
        
        /**
         * Initialize the debug manager
         */
        function init() {
            // Add debug mode controls after system prompt section
            addDebugModeControls();
        }
        
        /**
         * Add debug mode controls to the settings form
         */
        function addDebugModeControls() {
            // Create the debug mode container
            const debugModeContainer = document.createElement('div');
            debugModeContainer.className = 'form-group';
            debugModeContainer.style.marginTop = '10px';
            
            // Create the main debug checkbox group
            const mainCheckboxGroup = document.createElement('div');
            mainCheckboxGroup.className = 'checkbox-group';
            
            // Create the main debug checkbox input
            const debugModeCheckbox = document.createElement('input');
            debugModeCheckbox.type = 'checkbox';
            debugModeCheckbox.id = 'debug-mode';
            debugModeCheckbox.checked = DebugService.getDebugMode();
            
            // Create the main debug label
            const debugModeLabel = document.createElement('label');
            debugModeLabel.htmlFor = 'debug-mode';
            debugModeLabel.textContent = 'Debug mode';
            
            // Add status text
            const statusSpan = document.createElement('span');
            statusSpan.className = 'settings-item-status';
            statusSpan.id = 'debug-mode-status';
            statusSpan.style.marginLeft = '10px';
            statusSpan.style.color = 'var(--text-color-secondary)';
            statusSpan.style.fontSize = '0.85em';
            statusSpan.style.fontWeight = 'normal';
            updateDebugStatusText(statusSpan, debugModeCheckbox.checked);
            debugModeLabel.appendChild(statusSpan);
            
            // Add event listener to the main checkbox
            debugModeCheckbox.addEventListener('change', function() {
                DebugService.setDebugMode(this.checked);
                DebugService.log('Debug mode ' + (this.checked ? 'enabled' : 'disabled'));
                
                // Update status text
                updateDebugStatusText(statusSpan, this.checked);
                
                // Show/hide the dropdown
                const dropdown = document.getElementById('debug-categories-dropdown');
                if (dropdown) {
                    dropdown.style.display = this.checked ? 'block' : 'none';
                }
                
                // Scroll to bottom of settings modal when debug is enabled
                if (this.checked) {
                    scrollToBottomOfModal();
                }
            });
            
            // Append elements to the main checkbox group
            mainCheckboxGroup.appendChild(debugModeCheckbox);
            mainCheckboxGroup.appendChild(debugModeLabel);
            debugModeContainer.appendChild(mainCheckboxGroup);
            
            // Create the debug categories dropdown
            const categoriesDropdown = createCategoriesDropdown();
            categoriesDropdown.style.display = debugModeCheckbox.checked ? 'block' : 'none';
            debugModeContainer.appendChild(categoriesDropdown);
            
            // Find the system prompt section to insert after
            const systemPromptSection = elements.openPromptsConfigBtn.closest('.form-group');
            if (systemPromptSection && systemPromptSection.parentNode) {
                // Insert the debug mode container after the system prompt section
                systemPromptSection.parentNode.insertBefore(debugModeContainer, systemPromptSection.nextSibling);
            }
        }
        
        /**
         * Create the debug categories dropdown
         * @returns {HTMLElement} The dropdown container
         */
        function createCategoriesDropdown() {
            const dropdown = document.createElement('div');
            dropdown.id = 'debug-categories-dropdown';
            dropdown.className = 'debug-categories-dropdown';
            dropdown.style.marginLeft = '20px';
            dropdown.style.marginTop = '10px';
            dropdown.style.padding = '10px';
            dropdown.style.backgroundColor = 'var(--bg-color-secondary)';
            dropdown.style.border = '1px solid var(--border-color)';
            dropdown.style.borderRadius = '5px';
            
            // Add header with master checkbox
            const header = document.createElement('div');
            header.className = 'debug-dropdown-header';
            header.style.marginBottom = '10px';
            header.style.fontWeight = 'bold';
            header.style.borderBottom = '1px solid var(--border-color)';
            header.style.paddingBottom = '5px';
            
            const masterCheckboxGroup = document.createElement('div');
            masterCheckboxGroup.className = 'checkbox-group';
            
            const masterCheckbox = document.createElement('input');
            masterCheckbox.type = 'checkbox';
            masterCheckbox.id = 'debug-master-categories';
            
            const masterLabel = document.createElement('label');
            masterLabel.htmlFor = 'debug-master-categories';
            masterLabel.textContent = 'All Categories';
            
            // Update master checkbox state based on categories
            updateMasterCheckboxState(masterCheckbox);
            
            // Master checkbox event listener
            masterCheckbox.addEventListener('change', function() {
                const categories = DebugService.getCategories();
                Object.keys(categories).forEach(key => {
                    DebugService.setCategoryEnabled(key, this.checked);
                    const categoryCheckbox = document.getElementById(`debug-category-${key}`);
                    if (categoryCheckbox) {
                        categoryCheckbox.checked = this.checked;
                    }
                });
                // Update main debug status text
                const mainStatusSpan = document.getElementById('debug-mode-status');
                if (mainStatusSpan) {
                    const debugEnabled = DebugService.getDebugMode();
                    updateDebugStatusText(mainStatusSpan, debugEnabled);
                }
            });
            
            masterCheckboxGroup.appendChild(masterCheckbox);
            masterCheckboxGroup.appendChild(masterLabel);
            header.appendChild(masterCheckboxGroup);
            dropdown.appendChild(header);
            
            // Add individual category checkboxes
            const categories = DebugService.getCategories();
            Object.keys(categories).forEach(key => {
                const category = categories[key];
                const categoryGroup = document.createElement('div');
                categoryGroup.className = 'checkbox-group debug-category-item';
                categoryGroup.style.marginBottom = '5px';
                categoryGroup.style.paddingLeft = '15px';
                
                const categoryCheckbox = document.createElement('input');
                categoryCheckbox.type = 'checkbox';
                categoryCheckbox.id = `debug-category-${key}`;
                categoryCheckbox.checked = category.enabled;
                
                const categoryLabel = document.createElement('label');
                categoryLabel.htmlFor = `debug-category-${key}`;
                categoryLabel.innerHTML = `${category.symbol} ${category.name}`;
                categoryLabel.style.fontSize = '0.9em';
                categoryLabel.title = category.description;
                
                // Category checkbox event listener
                categoryCheckbox.addEventListener('change', function() {
                    DebugService.setCategoryEnabled(key, this.checked);
                    updateMasterCheckboxState(masterCheckbox);
                    // Update main debug status text
                    const mainStatusSpan = document.getElementById('debug-mode-status');
                    if (mainStatusSpan) {
                        const debugEnabled = DebugService.getDebugMode();
                        updateDebugStatusText(mainStatusSpan, debugEnabled);
                    }
                });
                
                categoryGroup.appendChild(categoryCheckbox);
                categoryGroup.appendChild(categoryLabel);
                dropdown.appendChild(categoryGroup);
            });
            
            return dropdown;
        }
        
        /**
         * Update the master checkbox state based on individual categories
         * @param {HTMLElement} masterCheckbox - The master checkbox element
         */
        function updateMasterCheckboxState(masterCheckbox) {
            const categories = DebugService.getCategories();
            const enabledCount = Object.values(categories).filter(cat => cat.enabled).length;
            const totalCount = Object.keys(categories).length;
            
            if (enabledCount === 0) {
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = false;
            } else if (enabledCount === totalCount) {
                masterCheckbox.checked = true;
                masterCheckbox.indeterminate = false;
            } else {
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = true;
            }
        }
        
        /**
         * Scroll to the bottom of the settings modal
         */
        function scrollToBottomOfModal() {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                const modalContent = settingsModal.querySelector('.modal-content');
                if (modalContent) {
                    // Use a small timeout to ensure the dropdown is rendered before scrolling
                    setTimeout(() => {
                        modalContent.scrollTop = modalContent.scrollHeight;
                    }, 100);
                }
            }
        }
        
        // Public API
        return {
            init
        };
    }

    // Public API
    return {
        createDebugManager
    };
})();