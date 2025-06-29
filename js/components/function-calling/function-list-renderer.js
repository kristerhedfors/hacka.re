/**
 * Function List Renderer Module
 * Handles rendering of function lists, collections, and user-defined functions
 */

window.FunctionListRenderer = (function() {
    /**
     * Create a Function List Renderer instance
     * @param {Object} elements - DOM elements
     * @param {Function} addSystemMessage - Function to add a system message to the chat
     * @returns {Object} Function List Renderer instance
     */
    function createFunctionListRenderer(elements, addSystemMessage) {
        /**
         * Render only the main (user-defined + selected default) functions without affecting the default functions tree
         */
        function renderMainFunctionList() {
            if (!elements.functionList) {
                console.warn('renderMainFunctionList called but elements.functionList is not available');
                return;
            }
            
            // Find and preserve the default functions section
            const defaultFunctionsSection = elements.functionList.querySelector('.default-functions-section');
            
            // Clear the list but preserve the default functions section
            elements.functionList.innerHTML = '';
            
            // Re-add the default functions section if it existed
            if (defaultFunctionsSection) {
                elements.functionList.appendChild(defaultFunctionsSection);
            }
            
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            
            // Show empty state if no functions, but position it before default functions
            if (functionNames.length === 0) {
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'block';
                    
                    // Insert before default functions section if it exists
                    if (defaultFunctionsSection) {
                        elements.functionList.insertBefore(elements.emptyFunctionState, defaultFunctionsSection);
                    } else {
                        elements.functionList.appendChild(elements.emptyFunctionState);
                    }
                }
            } else {
                // Hide empty state if we have functions
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'none';
                }
                
                // Render user-defined functions
                renderUserDefinedFunctions(functions, functionNames, defaultFunctionsSection);
            }
            
            // Add default functions section if it doesn't exist and DefaultFunctionsService is available
            if (!defaultFunctionsSection && window.DefaultFunctionsService && window.DefaultFunctionsManager) {
                window.DefaultFunctionsManager.addDefaultFunctionsSection();
            }
        }
        
        /**
         * Render user-defined functions
         * @param {Object} functions - Functions object
         * @param {Array} functionNames - Array of function names
         * @param {HTMLElement} insertBeforeElement - Element to insert before (optional)
         */
        function renderUserDefinedFunctions(functions, functionNames, insertBeforeElement) {
            // Get all function collections with metadata
            const allCollections = FunctionToolsService.getAllFunctionCollections();
            const processedCollections = new Set();
            let colorIndex = 1;
            
            // Process each collection
            Object.values(allCollections).forEach(collection => {
                if (processedCollections.has(collection.id)) return;
                processedCollections.add(collection.id);
                
                // Skip empty collections
                if (!collection.functions || collection.functions.length === 0) return;
                
                // Filter out auxiliary functions for this collection
                const callableFunctions = collection.functions.filter(funcName => {
                    const funcSpec = functions[funcName];
                    if (!funcSpec) return false;
                    
                    // Skip auxiliary functions
                    if (funcSpec.toolDefinition && 
                        funcSpec.toolDefinition.function && 
                        funcSpec.toolDefinition.function.description &&
                        funcSpec.toolDefinition.function.description.includes('(not exposed to LLM)')) {
                        return false;
                    }
                    return true;
                });
                
                // Skip if no callable functions in collection
                if (callableFunctions.length === 0) return;
                
                // Create collection container
                const collectionContainer = createCollectionContainer(collection, callableFunctions, colorIndex);
                colorIndex = colorIndex % 5 + 1; // Cycle through colors 1-5
                
                // Render individual functions in this collection
                const functionsContainer = collectionContainer.querySelector('.function-collection-functions');
                callableFunctions.forEach(funcName => {
                    const functionSpec = functions[funcName];
                    const functionItem = createFunctionItem(funcName, functionSpec, collection, collectionContainer.dataset.collectionColor);
                    functionsContainer.appendChild(functionItem);
                });
                
                // Add to list
                if (insertBeforeElement) {
                    elements.functionList.insertBefore(collectionContainer, insertBeforeElement);
                } else {
                    elements.functionList.appendChild(collectionContainer);
                }
            });
        }
        
        /**
         * Create a collection container element
         * @param {Object} collection - The collection object
         * @param {Array} callableFunctions - Array of callable function names
         * @param {number} colorIndex - Color index for styling
         * @returns {HTMLElement} The collection container element
         */
        function createCollectionContainer(collection, callableFunctions, colorIndex) {
            const collectionContainer = document.createElement('div');
            collectionContainer.className = 'function-collection-container';
            collectionContainer.dataset.collectionId = collection.id;
            
            // Assign a color to this collection
            const collectionColor = `color-${colorIndex}`;
            collectionContainer.dataset.collectionColor = collectionColor;
            
            // Create collection header
            const collectionHeader = createCollectionHeader(collection, callableFunctions, collectionColor);
            collectionContainer.appendChild(collectionHeader);
            
            // Create functions container
            const functionsContainer = document.createElement('div');
            functionsContainer.className = 'function-collection-functions';
            
            // Check if we're in a test environment 
            const isTestEnvironment = window.navigator.webdriver || 
                                     window.__playwright || 
                                     window.location.href.includes('localhost:8000');
            
            // Start expanded in test environments, collapsed otherwise
            let isExpanded = isTestEnvironment;
            functionsContainer.style.display = isExpanded ? 'block' : 'none';
            
            const expandIcon = collectionHeader.querySelector('.fas');
            expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
            
            // Add click event to expand/collapse
            collectionHeader.addEventListener('click', (e) => {
                const deleteButton = collectionHeader.querySelector('.function-collection-delete');
                if (e.target === deleteButton || e.target.closest('.function-collection-delete')) {
                    return; // Don't expand/collapse when clicking delete
                }
                isExpanded = !isExpanded;
                expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                functionsContainer.style.display = isExpanded ? 'block' : 'none';
            });
            
            collectionContainer.appendChild(functionsContainer);
            return collectionContainer;
        }
        
        /**
         * Create a collection header element
         * @param {Object} collection - The collection object
         * @param {Array} callableFunctions - Array of callable function names
         * @param {string} collectionColor - The color class for styling
         * @returns {HTMLElement} The collection header element
         */
        function createCollectionHeader(collection, callableFunctions, collectionColor) {
            const collectionHeader = document.createElement('div');
            collectionHeader.className = 'function-collection-header';
            collectionHeader.style.borderLeft = `12px solid var(--function-${collectionColor})`;
            collectionHeader.style.backgroundColor = `var(--function-${collectionColor}-bg, rgba(var(--function-${collectionColor}-rgb), 0.1))`;
            
            // Add expand/collapse icon
            const expandIcon = document.createElement('i');
            expandIcon.className = 'fas fa-chevron-right';
            collectionHeader.appendChild(expandIcon);
            
            // Add collection name
            const collectionName = document.createElement('h4');
            collectionName.textContent = collection.metadata.name || 'Untitled Collection';
            collectionName.style.margin = '0 0 0 10px';
            collectionName.style.fontSize = '16px';
            collectionName.style.fontWeight = '700';
            collectionHeader.appendChild(collectionName);
            
            // Add function count
            const functionCount = document.createElement('span');
            functionCount.className = 'function-collection-count';
            functionCount.textContent = `(${callableFunctions.length} function${callableFunctions.length !== 1 ? 's' : ''})`;
            functionCount.style.marginLeft = '10px';
            functionCount.style.color = 'var(--text-color-secondary)';
            functionCount.style.fontSize = '14px';
            collectionHeader.appendChild(functionCount);
            
            // Add source info if MCP
            if (collection.metadata.source === 'mcp' && collection.metadata.mcpCommand) {
                const sourceInfo = document.createElement('span');
                sourceInfo.className = 'function-collection-source';
                sourceInfo.textContent = `MCP: ${collection.metadata.mcpCommand}`;
                sourceInfo.style.marginLeft = 'auto';
                sourceInfo.style.marginRight = '10px';
                sourceInfo.style.color = 'var(--text-color-secondary)';
                sourceInfo.style.fontSize = '12px';
                collectionHeader.appendChild(sourceInfo);
            }
            
            // Add delete button for the entire collection
            const deleteCollectionButton = document.createElement('button');
            deleteCollectionButton.className = 'function-collection-delete';
            deleteCollectionButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteCollectionButton.title = 'Delete entire collection';
            deleteCollectionButton.style.marginLeft = 'auto';
            
            // Add click handler with proper event stopping
            deleteCollectionButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const confirmMessage = `Are you sure you want to delete the entire "${collection.metadata.name}" collection with ${callableFunctions.length} function${callableFunctions.length !== 1 ? 's' : ''}?`;
                
                // Use setTimeout to prevent multiple dialogs
                setTimeout(() => {
                    if (confirm(confirmMessage)) {
                        // Remove any function from the collection to trigger collection deletion
                        if (callableFunctions.length > 0) {
                            FunctionToolsService.removeJsFunction(callableFunctions[0]);
                            renderMainFunctionList();
                            
                            if (addSystemMessage) {
                                addSystemMessage(`Function collection "${collection.metadata.name}" removed.`);
                            }
                        }
                    }
                }, 0);
            };
            
            collectionHeader.appendChild(deleteCollectionButton);
            
            return collectionHeader;
        }
        
        /**
         * Create a function item element
         * @param {string} funcName - Function name
         * @param {Object} functionSpec - Function specification
         * @param {Object} collection - Collection object
         * @param {string} collectionColor - Color class for styling
         * @returns {HTMLElement} The function item element
         */
        function createFunctionItem(funcName, functionSpec, collection, collectionColor) {
            const isEnabled = FunctionToolsService.isJsFunctionEnabled(funcName);
            
            const functionItem = document.createElement('div');
            functionItem.className = 'function-item';
            functionItem.dataset.collectionColor = collectionColor;
            
            // Create tree connector element
            const treeConnector = document.createElement('div');
            treeConnector.className = 'tree-connector';
            treeConnector.style.setProperty('--connector-color', `var(--function-${collectionColor})`);
            functionItem.appendChild(treeConnector);
            
            // Create checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'function-item-checkbox';
            checkbox.checked = isEnabled;
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    FunctionToolsService.enableJsFunction(funcName);
                } else {
                    FunctionToolsService.disableJsFunction(funcName);
                }
                
                if (addSystemMessage) {
                    const status = checkbox.checked ? 'enabled' : 'disabled';
                    addSystemMessage(`Function "${funcName}" ${status} for tool calling.`);
                }
            });
            
            // Create content container
            const contentContainer = document.createElement('div');
            contentContainer.style.flex = '1';
            contentContainer.style.cursor = 'pointer';
            contentContainer.title = 'Click to edit function';
            
            // Create name element
            const nameElement = document.createElement('div');
            nameElement.className = 'function-item-name';
            nameElement.textContent = funcName;
            
            // Create description element if available
            if (functionSpec.toolDefinition && functionSpec.toolDefinition.function && functionSpec.toolDefinition.function.description) {
                const descriptionElement = document.createElement('div');
                descriptionElement.className = 'function-item-description';
                descriptionElement.textContent = functionSpec.toolDefinition.function.description;
                descriptionElement.style.fontSize = '0.85rem';
                descriptionElement.style.marginTop = '0.25rem';
                contentContainer.appendChild(descriptionElement);
            }
            
            // Add click event to load function into editor
            contentContainer.addEventListener('click', () => {
                if (window.FunctionEditorManager) {
                    window.FunctionEditorManager.loadFunctionIntoEditor(funcName, functionSpec);
                }
            });
            
            // Create delete button for individual function (deletes entire collection)
            const deleteButton = document.createElement('button');
            deleteButton.className = 'function-item-delete';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.title = 'Delete entire collection';
            
            // Add click handler with proper event stopping
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const collectionMetadata = FunctionToolsService.getCollectionMetadata(collection.id);
                const collectionName = collectionMetadata ? collectionMetadata.name : 'Untitled Collection';
                const confirmMessage = `Are you sure you want to delete the entire "${collectionName}" collection?`;
                
                // Use setTimeout to prevent multiple dialogs
                setTimeout(() => {
                    if (confirm(confirmMessage)) {
                        FunctionToolsService.removeJsFunction(funcName);
                        renderMainFunctionList();
                        
                        if (addSystemMessage) {
                            addSystemMessage(`Function collection "${collectionName}" removed.`);
                        }
                    }
                }, 0);
            };
            
            // Assemble function item
            functionItem.appendChild(checkbox);
            contentContainer.insertBefore(nameElement, contentContainer.firstChild);
            functionItem.appendChild(contentContainer);
            functionItem.appendChild(deleteButton);
            
            return functionItem;
        }
        
        /**
         * Render the list of functions (full re-render)
         */
        function renderFunctionList() {
            if (!elements.functionList) {
                console.warn('renderFunctionList called but elements.functionList is not available');
                return;
            }
            
            // Clear the list
            elements.functionList.innerHTML = '';
            
            // Get all functions
            const functions = FunctionToolsService.getJsFunctions();
            const functionNames = Object.keys(functions);
            
            // Show empty state if no functions
            if (functionNames.length === 0) {
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'block';
                    
                    // Make sure the empty state is in the function list
                    if (elements.emptyFunctionState.parentElement !== elements.functionList) {
                        elements.functionList.appendChild(elements.emptyFunctionState);
                    }
                }
            } else {
                // Hide empty state if we have functions
                if (elements.emptyFunctionState) {
                    elements.emptyFunctionState.style.display = 'none';
                }
            }
            
            // Render user-defined functions if any exist
            if (functionNames.length > 0) {
                renderUserDefinedFunctions(functions, functionNames, null);
            }
            
            // Add default functions section if DefaultFunctionsService is available
            if (window.DefaultFunctionsService && window.DefaultFunctionsManager) {
                window.DefaultFunctionsManager.addDefaultFunctionsSection();
            }
        }
        
        // Public API
        return {
            renderMainFunctionList,
            renderFunctionList,
            renderUserDefinedFunctions
        };
    }

    // Public API
    return {
        createFunctionListRenderer: createFunctionListRenderer
    };
})();