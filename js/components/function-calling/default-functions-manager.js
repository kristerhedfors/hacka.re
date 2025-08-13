/**
 * Default Functions Manager Module
 * Handles default function collections UI and interactions
 */

window.DefaultFunctionsManager = (function() {
    /**
     * Create a Default Functions Manager instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Default Functions Manager instance
     */
    function createDefaultFunctionsManager(elements, addSystemMessage) {
        /**
         * Add the default functions section to the function list
         */
        function addDefaultFunctionsSection() {
            console.log('addDefaultFunctionsSection called');
            // Create default functions section
            const defaultFunctionsSection = document.createElement('div');
            defaultFunctionsSection.className = 'default-functions-section';
            
            // Create header with expand/collapse functionality
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'default-functions-header';
            
            // Add expand/collapse icon
            const expandIcon = document.createElement('i');
            expandIcon.className = 'fas fa-chevron-right';
            sectionHeader.appendChild(expandIcon);
            
            // Add section title
            const sectionTitle = document.createElement('h4');
            sectionTitle.textContent = 'Default Functions';
            sectionHeader.appendChild(sectionTitle);
            
            // Add section count with enabled/total format
            const sectionCount = document.createElement('span');
            sectionCount.className = 'function-collection-count';
            sectionCount.id = 'default-functions-section-count';
            sectionCount.style.marginLeft = '10px';
            sectionCount.style.color = 'var(--text-color-secondary)';
            sectionCount.style.fontSize = '14px';
            sectionCount.style.display = 'none'; // Initially hidden
            updateDefaultFunctionsSectionCount();
            sectionHeader.appendChild(sectionCount);
            
            // Add copy button for enabled functions
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.id = 'copy-enabled-functions-btn'; // Changed ID to avoid conflicts
            copyButton.className = 'icon-btn';
            copyButton.title = 'Copy enabled functions to clipboard';
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.style.marginLeft = 'auto'; // Push to the right
            copyButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't trigger expand/collapse
                // Trigger the copy function directly
                if (window.functionCopyManager && window.functionCopyManager.copyFunctionLibrary) {
                    window.functionCopyManager.copyFunctionLibrary();
                } else if (window.FunctionCopyManager) {
                    // Get the manager instance and call copy function
                    const copyManager = window.FunctionCopyManager.createFunctionCopyManager({}, addSystemMessage);
                    copyManager.copyFunctionLibrary();
                }
            });
            sectionHeader.appendChild(copyButton);
            
            // Add click event to expand/collapse
            let isExpanded = false;
            sectionHeader.addEventListener('click', (e) => {
                // Don't expand/collapse when clicking the copy button
                if (e.target === copyButton || e.target.closest('#copy-enabled-functions-btn')) {
                    return;
                }
                isExpanded = !isExpanded;
                expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                defaultFunctionsList.style.display = isExpanded ? 'block' : 'none';
            });
            
            defaultFunctionsSection.appendChild(sectionHeader);
            
            // Create container for default functions
            const defaultFunctionsList = document.createElement('div');
            defaultFunctionsList.className = 'default-functions-list';
            defaultFunctionsList.style.display = 'none'; // Initially collapsed
            
            // Get default function collections
            const defaultFunctionCollections = DefaultFunctionsService.getDefaultFunctionCollections();
            
            // Add each default function collection to the list
            defaultFunctionCollections.forEach(collection => {
                const collectionItem = createDefaultFunctionCollectionItem(collection, []);
                defaultFunctionsList.appendChild(collectionItem);
            });
            
            defaultFunctionsSection.appendChild(defaultFunctionsList);
            console.log('About to append default functions section to function list');
            console.log('elements.functionList:', !!elements.functionList);
            console.log('defaultFunctionsSection:', !!defaultFunctionsSection);
            elements.functionList.appendChild(defaultFunctionsSection);
            console.log('Default functions section appended successfully');
        }
        
        /**
         * Create a default function collection item element
         * @param {Object} collection - The function collection object
         * @param {Array} selectedIds - Array of selected function collection IDs
         * @returns {HTMLElement} The created function collection item element
         */
        function createDefaultFunctionCollectionItem(collection, selectedIds) {
            const collectionItem = document.createElement('div');
            collectionItem.className = 'function-collection-item default-function-collection-item';
            collectionItem.dataset.id = collection.id;
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.className = 'function-collection-header';
            
            // Add expand/collapse icon
            const expandIcon = document.createElement('i');
            expandIcon.className = 'fas fa-chevron-right';
            headerContainer.appendChild(expandIcon);
            
            // Create collection checkbox for checking all functions in the collection
            const collectionCheckbox = document.createElement('input');
            collectionCheckbox.type = 'checkbox';
            collectionCheckbox.className = 'collection-master-checkbox';
            collectionCheckbox.id = `collection-checkbox-${collection.id}`;
            collectionCheckbox.title = 'Check/uncheck all functions in this collection';
            
            // Set initial state based on how many functions are selected
            updateCollectionCheckboxState(collectionCheckbox, collection);
            
            // Add event listener for collection checkbox
            collectionCheckbox.addEventListener('change', function(e) {
                e.stopPropagation();
                
                const isChecked = this.checked;
                
                // Update individual checkboxes immediately for responsive UI
                const collectionContainer = document.querySelector(`[data-id="${collection.id}"]`);
                if (collectionContainer) {
                    const individualCheckboxes = collectionContainer.querySelectorAll('.function-item-checkbox');
                    individualCheckboxes.forEach(checkbox => {
                        checkbox.checked = isChecked;
                    });
                }
                
                // Add system message immediately
                if (addSystemMessage) {
                    const actionText = isChecked ? 'enabled' : 'disabled';
                    addSystemMessage(`All functions in "${collection.name}" ${actionText}.`);
                }
                
                // Defer backend operations
                setTimeout(() => {
                    toggleAllFunctionsInCollectionBackend(collection, isChecked);
                    // Count updates are handled in toggleAllFunctionsInCollectionBackend
                }, 0);
            });
            headerContainer.appendChild(collectionCheckbox);
            
            // Create collection name element
            const collectionName = document.createElement('div');
            collectionName.className = 'function-collection-name';
            collectionName.textContent = collection.name || 'Unnamed Function Collection';
            collectionName.style.cursor = 'pointer';
            collectionName.title = 'Click to expand/collapse';
            headerContainer.appendChild(collectionName);
            
            // Add function count with enabled/total format
            const functionCount = document.createElement('span');
            functionCount.className = 'function-collection-count';
            functionCount.id = `default-collection-count-${collection.id}`;
            functionCount.style.marginLeft = '10px';
            functionCount.style.color = 'var(--text-color-secondary)';
            functionCount.style.fontSize = '14px';
            functionCount.style.display = 'none'; // Initially hidden
            updateDefaultCollectionCount(collection);
            headerContainer.appendChild(functionCount);
            
            // Add info icon
            const infoIcon = document.createElement('button');
            infoIcon.className = 'function-collection-info';
            infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
            infoIcon.title = 'About this function collection';
            infoIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                showFunctionCollectionInfo(collection, infoIcon);
            });
            headerContainer.appendChild(infoIcon);
            
            collectionItem.appendChild(headerContainer);
            
            // Create container for individual functions
            const functionsList = document.createElement('div');
            functionsList.className = 'collection-functions-list';
            functionsList.style.display = 'none'; // Initially collapsed
            
            // Add individual functions
            if (collection.functions && collection.functions.length > 0) {
                collection.functions.forEach(func => {
                    const functionItem = createIndividualFunctionItem(collection, func);
                    functionsList.appendChild(functionItem);
                });
            }
            
            // Add click event to expand/collapse
            let isExpanded = false;
            headerContainer.addEventListener('click', (e) => {
                if (e.target === infoIcon || e.target.closest('.function-collection-info')) {
                    return; // Don't expand/collapse when clicking info icon
                }
                if (e.target === collectionCheckbox || e.target.closest('.collection-master-checkbox')) {
                    return; // Don't expand/collapse when clicking collection checkbox
                }
                isExpanded = !isExpanded;
                expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                functionsList.style.display = isExpanded ? 'block' : 'none';
            });
            
            // Add separate click handler for checkbox to prevent overlap
            collectionCheckbox.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering expand/collapse
            });
            
            collectionItem.appendChild(functionsList);
            
            return collectionItem;
        }
        
        /**
         * Create an individual function item element
         * @param {Object} collection - The function collection object
         * @param {Object} func - The function object
         * @returns {HTMLElement} The created function item element
         */
        function createIndividualFunctionItem(collection, func) {
            const functionItem = document.createElement('div');
            functionItem.className = 'individual-function-item';
            
            // Create checkbox for selecting the individual function
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'function-item-checkbox';
            const functionId = `${collection.id}:${func.name}`;
            checkbox.checked = DefaultFunctionsService.isIndividualFunctionSelected(functionId);
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log("Individual function checkbox clicked:", functionId);
                
                // Use setTimeout to make UI responsive
                setTimeout(() => {
                    // Toggle the individual function selection
                    const wasSelected = DefaultFunctionsService.toggleIndividualFunctionSelection(functionId);
                    
                    // Update the collection checkbox state
                    const collectionCheckbox = document.getElementById(`collection-checkbox-${collection.id}`);
                    if (collectionCheckbox) {
                        updateCollectionCheckboxState(collectionCheckbox, collection);
                    }
                    
                    // Update collection count display
                    updateDefaultCollectionCount(collection);
                    
                    // Update section count display
                    updateDefaultFunctionsSectionCount();
                    
                    // Update only the main function list without affecting the default functions tree
                    if (window.functionListRenderer) {
                        window.functionListRenderer.renderMainFunctionList();
                    }
                    
                    // Add system message
                    if (addSystemMessage) {
                        if (wasSelected) {
                            addSystemMessage(`Default function "${func.name}" enabled.`);
                        } else {
                            addSystemMessage(`Default function "${func.name}" disabled.`);
                        }
                    }
                }, 0);
            });
            functionItem.appendChild(checkbox);
            
            // Create content container (to match user-defined functions structure)
            const contentContainer = document.createElement('div');
            contentContainer.style.flex = '1';
            contentContainer.style.cursor = 'pointer';
            contentContainer.title = 'Click to view function code';
            
            // Create function name element
            const functionName = document.createElement('div');
            functionName.className = 'function-item-name';
            functionName.textContent = func.name;
            
            // Add function name to content container first
            contentContainer.appendChild(functionName);
            
            // Add function description if available
            // First try to get description from func.description, then extract from JSDoc in code
            let description = func.description;
            
            if (!description && func.code) {
                // Try to extract @description from JSDoc comments in the code
                const descriptionMatch = func.code.match(/@description\s+(.+?)(?:\n|\*\/)/);
                if (descriptionMatch && descriptionMatch[1]) {
                    description = descriptionMatch[1].trim();
                }
            }
            
            if (description) {
                const functionDesc = document.createElement('div');
                functionDesc.className = 'function-item-description';
                functionDesc.textContent = description;
                contentContainer.appendChild(functionDesc);
            }
            
            // Add click event to content container to show function code
            contentContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Show function code in the editor (read-only)
                if (elements.functionCode) {
                    elements.functionCode.value = func.code;
                    elements.functionCode.setAttribute('readonly', 'readonly');
                    
                    // Clear the readonly attribute after a short delay when clicking elsewhere
                    setTimeout(() => {
                        document.addEventListener('click', function removeReadonly(e) {
                            if (!e.target.closest('.function-editor')) {
                                elements.functionCode.removeAttribute('readonly');
                                document.removeEventListener('click', removeReadonly);
                            }
                        });
                    }, 100);
                }
                
                // Scroll to the editor form (same behavior as user-defined functions)
                if (elements.functionEditorForm) {
                    elements.functionEditorForm.scrollIntoView({ behavior: 'smooth' });
                }
            });
            
            functionItem.appendChild(contentContainer);
            
            return functionItem;
        }
        
        /**
         * Update the collection checkbox state based on individual function selections
         * @param {HTMLElement} collectionCheckbox - The collection checkbox element
         * @param {Object} collection - The function collection object
         */
        function updateCollectionCheckboxState(collectionCheckbox, collection) {
            if (!collection.functions || collection.functions.length === 0) {
                collectionCheckbox.checked = false;
                collectionCheckbox.indeterminate = false;
                return;
            }
            
            // Count how many functions in this collection are selected
            let selectedCount = 0;
            collection.functions.forEach(func => {
                const functionId = `${collection.id}:${func.name}`;
                if (DefaultFunctionsService.isIndividualFunctionSelected(functionId)) {
                    selectedCount++;
                }
            });
            
            const totalCount = collection.functions.length;
            
            if (selectedCount === 0) {
                collectionCheckbox.checked = false;
                collectionCheckbox.indeterminate = false;
            } else if (selectedCount === totalCount) {
                collectionCheckbox.checked = true;
                collectionCheckbox.indeterminate = false;
            } else {
                collectionCheckbox.checked = false;
                collectionCheckbox.indeterminate = true;
            }
        }
        
        /**
         * Toggle all functions in a collection (backend operations only)
         * @param {Object} collection - The function collection object
         * @param {boolean} checked - Whether to check or uncheck all functions
         */
        function toggleAllFunctionsInCollectionBackend(collection, checked) {
            if (!collection.functions || collection.functions.length === 0) {
                return;
            }
            
            // Use batch operation for better performance - UI already updated
            const allFunctionIds = collection.functions.map(func => `${collection.id}:${func.name}`);
            const results = DefaultFunctionsService.batchToggleIndividualFunctions(allFunctionIds, checked);
            
            // Update the main function list
            if (window.functionListRenderer && results.length > 0) {
                window.functionListRenderer.renderMainFunctionList();
            }
            
            // Update collection count display
            updateDefaultCollectionCount(collection);
            
            // Update section count display
            updateDefaultFunctionsSectionCount();
        }
        
        /**
         * Update the default collection count display to show enabled/total format
         * Only show if at least 1 function is enabled, otherwise hide
         * @param {Object} collection - The function collection object
         */
        function updateDefaultCollectionCount(collection) {
            const countElement = document.getElementById(`default-collection-count-${collection.id}`);
            if (!countElement || !collection.functions) return;
            
            // Count enabled functions in this collection
            let enabledCount = 0;
            collection.functions.forEach(func => {
                const functionId = `${collection.id}:${func.name}`;
                if (DefaultFunctionsService.isIndividualFunctionSelected(functionId)) {
                    enabledCount++;
                }
            });
            
            const totalCount = collection.functions.length;
            
            // Only show count if at least 1 function is enabled
            if (enabledCount > 0) {
                const pluralText = totalCount !== 1 ? 's' : '';
                countElement.textContent = `(${enabledCount}/${totalCount} function${pluralText} enabled)`;
                countElement.style.display = 'inline';
            } else {
                countElement.style.display = 'none';
            }
        }
        
        /**
         * Update the default functions section count display to show total enabled/total format
         * Only show if at least 1 function is enabled, otherwise hide
         */
        function updateDefaultFunctionsSectionCount() {
            const sectionCountElement = document.getElementById('default-functions-section-count');
            if (!sectionCountElement) return;
            
            const defaultFunctionCollections = DefaultFunctionsService.getDefaultFunctionCollections();
            let totalEnabled = 0;
            let totalFunctions = 0;
            
            defaultFunctionCollections.forEach(collection => {
                if (collection.functions) {
                    totalFunctions += collection.functions.length;
                    collection.functions.forEach(func => {
                        const functionId = `${collection.id}:${func.name}`;
                        if (DefaultFunctionsService.isIndividualFunctionSelected(functionId)) {
                            totalEnabled++;
                        }
                    });
                }
            });
            
            // Only show count if at least 1 function is enabled
            if (totalEnabled > 0) {
                const pluralText = totalFunctions !== 1 ? 's' : '';
                sectionCountElement.textContent = `(${totalEnabled}/${totalFunctions} function${pluralText} enabled)`;
                sectionCountElement.style.display = 'inline';
            } else {
                sectionCountElement.style.display = 'none';
            }
        }
        
        /**
         * Show function collection info popup
         * @param {Object} collection - The function collection object
         * @param {HTMLElement} infoIcon - The info icon element
         */
        function showFunctionCollectionInfo(collection, infoIcon) {
            // Create and show a popup with information about the function collection
            const popup = document.createElement('div');
            popup.className = 'function-info-popup';
            
            // Get function names
            const functionNames = collection.functions ? 
                collection.functions.map(f => f.name).join(', ') : 
                'No functions';
            
            // Create popup content
            popup.innerHTML = `
                <div class="function-info-header">
                    <h3>${collection.name}</h3>
                    <button class="function-info-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="function-info-content">
                    <p>${collection.description || 'A collection of default functions for the hacka.re function calling system.'}</p>
                    <p class="function-info-details"><strong>Functions:</strong> ${functionNames}</p>
                    <p class="function-info-hint">Click on individual function names to view their code in the editor.</p>
                </div>
            `;
            
            // Add close button functionality
            const closeBtn = popup.querySelector('.function-info-close');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(popup);
            });
            
            // Add click outside to close
            document.addEventListener('click', function closePopup(event) {
                if (!popup.contains(event.target) && event.target !== infoIcon) {
                    if (document.body.contains(popup)) {
                        document.body.removeChild(popup);
                    }
                    document.removeEventListener('click', closePopup);
                }
            });
            
            // Position the popup near the info icon
            const rect = infoIcon.getBoundingClientRect();
            popup.style.position = 'absolute';
            popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
            popup.style.left = `${rect.left + window.scrollX - 200}px`; // Offset to center
            
            // Add to body
            document.body.appendChild(popup);
        }
        
        // Public API
        return {
            addDefaultFunctionsSection,
            createDefaultFunctionCollectionItem,
            createIndividualFunctionItem,
            showFunctionCollectionInfo,
            updateCollectionCheckboxState,
            toggleAllFunctionsInCollectionBackend,
            updateDefaultCollectionCount,
            updateDefaultFunctionsSectionCount
        };
    }

    // Public API
    return {
        createDefaultFunctionsManager: createDefaultFunctionsManager
    };
})();