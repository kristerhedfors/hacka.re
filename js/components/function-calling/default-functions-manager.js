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
            
            // Add click event to expand/collapse
            let isExpanded = false;
            sectionHeader.addEventListener('click', () => {
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
            
            // Create collection name element
            const collectionName = document.createElement('div');
            collectionName.className = 'function-collection-name';
            collectionName.textContent = collection.name || 'Unnamed Function Collection';
            collectionName.style.cursor = 'pointer';
            collectionName.title = 'Click to expand/collapse';
            headerContainer.appendChild(collectionName);
            
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
                isExpanded = !isExpanded;
                expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                functionsList.style.display = isExpanded ? 'block' : 'none';
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
                
                // Toggle the individual function selection
                const wasSelected = DefaultFunctionsService.toggleIndividualFunctionSelection(functionId);
                
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
            showFunctionCollectionInfo
        };
    }

    // Public API
    return {
        createDefaultFunctionsManager: createDefaultFunctionsManager
    };
})();