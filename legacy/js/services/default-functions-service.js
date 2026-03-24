/**
 * Default Functions Service
 * Handles storage and management of default functions for the function calling system
 */

window.DefaultFunctionsService = (function() {
    // Storage key for selected default functions
    const SELECTED_DEFAULT_FUNCTIONS_KEY = 'selected_default_functions';
    // Storage key for individual function selections
    const SELECTED_INDIVIDUAL_FUNCTIONS_KEY = 'selected_individual_functions';
    // Storage key for enabled default functions
    const ENABLED_DEFAULT_FUNCTIONS_KEY = 'enabled_default_functions';
    
    // Default functions data - these are loaded from individual files
    let DEFAULT_FUNCTIONS = [];
    
    /**
     * Initialize the default functions
     * This function loads all registered default functions
     */
    function initializeDefaultFunctions() {
        // Clear the array first
        DEFAULT_FUNCTIONS = [];
        
        // Add RC4 encryption functions if they exist
        if (window.RC4EncryptionFunctions) {
            DEFAULT_FUNCTIONS.push(window.RC4EncryptionFunctions);
        }
        
        // Add Math utilities functions if they exist
        if (window.MathUtilitiesFunctions) {
            DEFAULT_FUNCTIONS.push(window.MathUtilitiesFunctions);
        }
        
        // Add MCP example functions if they exist
        if (window.MCPExampleFunctions) {
            DEFAULT_FUNCTIONS.push(window.MCPExampleFunctions);
        }
        
        // Add GitHub functions if they exist
        if (window.GitHubFunctions) {
            DEFAULT_FUNCTIONS.push(window.GitHubFunctions);
        }
        
        // Add Shodan functions if they exist
        if (window.ShodanFunctions) {
            DEFAULT_FUNCTIONS.push(window.ShodanFunctions);
        }
        
        // Additional default function collections can be added here in the future
        
        console.log(`Loaded ${DEFAULT_FUNCTIONS.length} default function collections:`, DEFAULT_FUNCTIONS.map(g => g.name));
    }
    
    // Initialize functions when the service is loaded
    initializeDefaultFunctions();
    
    /**
     * Get all default function collections
     * @returns {Array} Array of default function collection objects
     */
    function getDefaultFunctionCollections() {
        return DEFAULT_FUNCTIONS;
    }
    
    /**
     * Get a default function collection by ID
     * @param {string} id - The default function collection ID
     * @returns {Object|null} The default function collection object or null if not found
     */
    function getDefaultFunctionCollectionById(id) {
        return DEFAULT_FUNCTIONS.find(g => g.id === id) || null;
    }
    
    /**
     * Get the selected default function collection IDs
     * @returns {Array} Array of selected default function collection IDs
     */
    function getSelectedDefaultFunctionIds() {
        const selectedIds = CoreStorageService.getValue(SELECTED_DEFAULT_FUNCTIONS_KEY);
        return selectedIds || [];
    }
    
    /**
     * Get the selected individual function IDs
     * @returns {Array} Array of selected individual function IDs
     */
    function getSelectedIndividualFunctionIds() {
        const selectedIds = CoreStorageService.getValue(SELECTED_INDIVIDUAL_FUNCTIONS_KEY);
        return selectedIds || [];
    }
    
    /**
     * Set the selected default function collection IDs
     * @param {Array} ids - Array of default function collection IDs to set as selected
     */
    function setSelectedDefaultFunctionIds(ids) {
        if (Array.isArray(ids) && ids.length > 0) {
            CoreStorageService.setValue(SELECTED_DEFAULT_FUNCTIONS_KEY, ids);
        } else {
            CoreStorageService.removeValue(SELECTED_DEFAULT_FUNCTIONS_KEY);
        }
    }
    
    /**
     * Set the selected individual function IDs
     * @param {Array} ids - Array of individual function IDs to set as selected
     */
    function setSelectedIndividualFunctionIds(ids) {
        if (Array.isArray(ids) && ids.length > 0) {
            CoreStorageService.setValue(SELECTED_INDIVIDUAL_FUNCTIONS_KEY, ids);
        } else {
            CoreStorageService.removeValue(SELECTED_INDIVIDUAL_FUNCTIONS_KEY);
        }
    }
    
    /**
     * Get the enabled default functions
     * @returns {Object} Object containing enabled default functions
     */
    function getEnabledDefaultFunctions() {
        const enabled = CoreStorageService.getValue(ENABLED_DEFAULT_FUNCTIONS_KEY);
        return enabled || {};
    }
    
    /**
     * Set the enabled default functions
     * @param {Object} functions - Object containing enabled default functions
     */
    function setEnabledDefaultFunctions(functions) {
        if (functions && Object.keys(functions).length > 0) {
            CoreStorageService.setValue(ENABLED_DEFAULT_FUNCTIONS_KEY, functions);
        } else {
            CoreStorageService.removeValue(ENABLED_DEFAULT_FUNCTIONS_KEY);
        }
    }
    
    /**
     * Get tool definitions for enabled default functions
     * @returns {Array} Array of tool definitions for API requests
     */
    function getEnabledDefaultFunctionToolDefinitions() {
        const enabledDefaultFunctions = getEnabledDefaultFunctions();
        const toolDefinitions = [];
        
        for (const [name, func] of Object.entries(enabledDefaultFunctions)) {
            if (func.toolDefinition) {
                toolDefinitions.push(func.toolDefinition);
            }
        }
        
        return toolDefinitions;
    }
    
    /**
     * Check if a default function collection is selected
     * @param {string} id - The default function collection ID to check
     * @returns {boolean} True if the function collection is selected
     */
    function isDefaultFunctionCollectionSelected(id) {
        const selectedIds = getSelectedDefaultFunctionIds();
        return selectedIds.includes(id);
    }
    
    /**
     * Toggle a default function collection's selection status
     * @param {string} id - The default function collection ID to toggle
     * @param {boolean} forceState - Optional: force enable (true) or disable (false)
     * @returns {boolean} True if the function collection is now selected, false if unselected
     */
    function toggleDefaultFunctionCollectionSelection(id, forceState) {
        console.log("DefaultFunctionsService.toggleDefaultFunctionCollectionSelection called for id:", id, "forceState:", forceState);
        const selectedIds = getSelectedDefaultFunctionIds();
        const index = selectedIds.indexOf(id);
        let result;
        
        // Determine the action based on forceState or current state
        const shouldEnable = forceState !== undefined ? forceState : (index < 0);
        
        if (!shouldEnable && index >= 0) {
            // Remove from selected
            selectedIds.splice(index, 1);
            setSelectedDefaultFunctionIds(selectedIds);
            result = false;
            
            // Remove the functions from enabled default functions storage
            const functionCollection = getDefaultFunctionCollectionById(id);
            if (functionCollection && functionCollection.functions) {
                // Get current enabled default functions
                const enabledDefaultFunctions = getEnabledDefaultFunctions();
                
                // Also update individual function IDs
                const selectedIndividualIds = getSelectedIndividualFunctionIds();
                
                functionCollection.functions.forEach(func => {
                    // Remove from enabled default functions
                    delete enabledDefaultFunctions[func.name];
                    
                    // Remove from selected individual IDs
                    const functionId = `${id}:${func.name}`;
                    const idx = selectedIndividualIds.indexOf(functionId);
                    if (idx >= 0) {
                        selectedIndividualIds.splice(idx, 1);
                    }
                });
                
                // Save all changes
                setEnabledDefaultFunctions(enabledDefaultFunctions);
                setSelectedIndividualFunctionIds(selectedIndividualIds);
                
                console.log(`Removed ${functionCollection.functions.length} default functions from collection: ${id}`);
            }
        } else if (shouldEnable && index < 0) {
            // Add to selected
            selectedIds.push(id);
            setSelectedDefaultFunctionIds(selectedIds);
            result = true;
            
            // Add the functions to the enabled default functions storage
            const functionCollection = getDefaultFunctionCollectionById(id);
            if (functionCollection && functionCollection.functions && window.FunctionToolsService) {
                // Get current enabled default functions
                const enabledDefaultFunctions = getEnabledDefaultFunctions();
                
                // Also update individual function IDs
                const selectedIndividualIds = getSelectedIndividualFunctionIds();
                
                functionCollection.functions.forEach(func => {
                    try {
                        // Generate tool definition for the function
                        const toolDefinition = window.FunctionToolsParser.ToolDefinitionGenerator.generate(func.code);
                        
                        if (toolDefinition) {
                            // Store in enabled default functions (same as individual selection)
                            enabledDefaultFunctions[func.name] = {
                                code: func.code,
                                toolDefinition: toolDefinition,
                                groupId: functionCollection.groupId || functionCollection.id
                            };
                            
                            // Add to selected individual IDs
                            const functionId = `${id}:${func.name}`;
                            if (!selectedIndividualIds.includes(functionId)) {
                                selectedIndividualIds.push(functionId);
                            }
                        }
                    } catch (error) {
                        console.error(`Error parsing default function ${func.name}:`, error);
                    }
                });
                
                // Save all changes
                setEnabledDefaultFunctions(enabledDefaultFunctions);
                setSelectedIndividualFunctionIds(selectedIndividualIds);
                
                // Ensure function tools are enabled globally
                if (!window.FunctionToolsService.isFunctionToolsEnabled()) {
                    console.log(`Enabling function tools globally for collection: ${id}`);
                    window.FunctionToolsService.setFunctionToolsEnabled(true);
                }
                
                console.log(`Added ${functionCollection.functions.length} default functions from collection: ${id}`);
            }
        } else if (shouldEnable && index >= 0) {
            // Already selected, just return true
            result = true;
        } else {
            // Already unselected, just return false
            result = false;
        }
        
        return result;
    }
    
    /**
     * Get all selected default function collections
     * @returns {Array} Array of selected default function collection objects
     */
    function getSelectedDefaultFunctionCollections() {
        const selectedIds = getSelectedDefaultFunctionIds();
        return DEFAULT_FUNCTIONS.filter(collection => selectedIds.includes(collection.id));
    }
    
    /**
     * Check if an individual function is selected
     * @param {string} functionId - The function ID to check (format: collectionId:functionName)
     * @returns {boolean} True if the function is selected
     */
    function isIndividualFunctionSelected(functionId) {
        const selectedIds = getSelectedIndividualFunctionIds();
        return selectedIds.includes(functionId);
    }
    
    /**
     * Toggle multiple individual functions efficiently (batch mode)
     * @param {Array} functionIds - Array of function IDs to toggle
     * @param {boolean} targetState - Target state (true for selected, false for unselected)
     * @returns {Array} Array of results for each function
     */
    function batchToggleIndividualFunctions(functionIds, targetState) {
        const results = [];
        let storageNeedsSave = false;
        
        // Get current selections once
        const selectedIds = getSelectedIndividualFunctionIds();
        const enabledDefaultFunctions = getEnabledDefaultFunctions();
        
        functionIds.forEach(functionId => {
            const index = selectedIds.indexOf(functionId);
            const isCurrentlySelected = index >= 0;
            
            // Only process if state needs to change
            if (isCurrentlySelected !== targetState) {
                const [groupId, functionName] = functionId.split(':');
                const group = getDefaultFunctionCollectionById(groupId);
                const func = group?.functions?.find(f => f.name === functionName);
                
                if (targetState) {
                    // Add to selected
                    selectedIds.push(functionId);
                    
                    // Add to enabled functions
                    if (func && window.FunctionToolsService) {
                        try {
                            const toolDefinition = window.FunctionToolsParser.ToolDefinitionGenerator.generate(func.code);
                            if (toolDefinition) {
                                enabledDefaultFunctions[func.name] = {
                                    code: func.code,
                                    toolDefinition: toolDefinition,
                                    groupId: group.groupId || group.id
                                };
                                storageNeedsSave = true;
                            }
                        } catch (error) {
                            console.error(`Error parsing default function ${func.name}:`, error);
                        }
                    }
                } else {
                    // Remove from selected
                    selectedIds.splice(index, 1);
                    
                    // Remove from enabled functions
                    if (func && enabledDefaultFunctions[func.name]) {
                        delete enabledDefaultFunctions[func.name];
                        storageNeedsSave = true;
                    }
                }
                
                results.push({functionId, wasSelected: targetState});
            } else {
                results.push({functionId, wasSelected: isCurrentlySelected});
            }
        });
        
        // Save all changes at once
        if (storageNeedsSave) {
            setSelectedIndividualFunctionIds(selectedIds);
            setEnabledDefaultFunctions(enabledDefaultFunctions);
            
            // Enable function tools globally if any functions were selected
            if (selectedIds.length > 0 && !window.FunctionToolsService.isFunctionToolsEnabled()) {
                window.FunctionToolsService.setFunctionToolsEnabled(true);
            }
        }
        
        // Only log in debug mode to reduce console noise
        if (window.FunctionToolsConfig?.CONFIG?.LOG_LEVEL === 'DEBUG') {
            console.log(`Batch processed ${functionIds.length} functions, ${results.filter(r => r.wasSelected).length} selected`);
        }
        return results;
    }
    
    /**
     * Toggle an individual function's selection status
     * @param {string} functionId - The function ID to toggle (format: collectionId:functionName)
     * @returns {boolean} True if the function is now selected, false if unselected
     */
    function toggleIndividualFunctionSelection(functionId) {
        console.log("DefaultFunctionsService.toggleIndividualFunctionSelection called for id:", functionId);
        
        // Check if function tools are enabled globally
        const globallyEnabled = window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false;
        console.log("Function tools globally enabled:", globallyEnabled);
        
        const selectedIds = getSelectedIndividualFunctionIds();
        const index = selectedIds.indexOf(functionId);
        let result;
        
        const [groupId, functionName] = functionId.split(':');
        const group = getDefaultFunctionCollectionById(groupId);
        const func = group?.functions?.find(f => f.name === functionName);
        
        if (index >= 0) {
            // Remove from selected
            selectedIds.splice(index, 1);
            setSelectedIndividualFunctionIds(selectedIds);
            result = false;
            
            // Remove the function from default functions storage
            if (func) {
                const enabledDefaultFunctions = getEnabledDefaultFunctions();
                delete enabledDefaultFunctions[func.name];
                setEnabledDefaultFunctions(enabledDefaultFunctions);
                console.log(`Removed default function ${func.name} from separate storage`);
            }
        } else {
            // Add to selected
            selectedIds.push(functionId);
            setSelectedIndividualFunctionIds(selectedIds);
            result = true;
            
            // Add the function to the default functions storage (not user functions)
            if (func && window.FunctionToolsService) {
                try {
                    // Generate tool definition for the function
                    const toolDefinition = window.FunctionToolsParser.ToolDefinitionGenerator.generate(func.code);
                    console.log(`Generated tool definition for ${func.name}:`, toolDefinition);
                    
                    if (toolDefinition) {
                        // Store the default function separately - don't add to user functions registry
                        const enabledDefaultFunctions = getEnabledDefaultFunctions();
                        enabledDefaultFunctions[func.name] = {
                            code: func.code,
                            toolDefinition: toolDefinition,
                            groupId: group.groupId || group.id
                        };
                        setEnabledDefaultFunctions(enabledDefaultFunctions);
                        
                        console.log(`Added default function ${func.name} to separate storage`);
                    }
                    
                    // Ensure function tools are enabled globally
                    if (!window.FunctionToolsService.isFunctionToolsEnabled()) {
                        console.log(`Enabling function tools globally because default function ${func.name} was selected`);
                        window.FunctionToolsService.setFunctionToolsEnabled(true);
                    }
                    
                    console.log(`Added and enabled default function: ${func.name}`);
                } catch (error) {
                    console.error(`Error parsing default function ${func.name}:`, error);
                }
            }
        }
        
        return result;
    }
    
    /**
     * Load default functions into the function calling system
     * This should be called after the function calling system is initialized
     */
    function loadSelectedDefaultFunctions() {
        console.log('=== Loading selected default functions ===');
        
        // Load individually selected functions
        const selectedFunctionIds = getSelectedIndividualFunctionIds();
        console.log('Selected function IDs from storage:', selectedFunctionIds);
        
        // Skip if no functions selected
        if (!selectedFunctionIds || selectedFunctionIds.length === 0) {
            console.log('No default functions selected, skipping load');
            return;
        }
        
        // Check if already loaded to prevent redundant processing
        const enabledDefaultFunctions = getEnabledDefaultFunctions();
        const alreadyLoadedCount = Object.keys(enabledDefaultFunctions).length;
        const expectedCount = selectedFunctionIds.length;
        
        // If all selected functions are already loaded, skip re-processing
        if (alreadyLoadedCount === expectedCount) {
            const loadedNames = Object.keys(enabledDefaultFunctions);
            const expectedNames = selectedFunctionIds.map(id => {
                const [groupId, functionName] = id.split(':');
                return functionName;
            });
            
            // Check if the loaded functions match what's expected
            const allMatch = expectedNames.every(name => loadedNames.includes(name));
            if (allMatch) {
                console.log('All selected default functions already loaded, skipping re-processing');
                return;
            }
        }
        
        selectedFunctionIds.forEach(functionId => {
            const [groupId, functionName] = functionId.split(':');
            const group = getDefaultFunctionCollectionById(groupId);
            const func = group?.functions?.find(f => f.name === functionName);
            
            console.log(`Processing function ${functionId}: found=${!!func}`);
            
            if (func && window.FunctionToolsService) {
                try {
                    // Generate tool definition for the function
                    const toolDefinition = window.FunctionToolsParser.ToolDefinitionGenerator.generate(func.code);
                    console.log(`Generated tool definition for ${func.name}:`, toolDefinition);
                    
                    if (toolDefinition) {
                        // Store the default function separately - don't add to user functions registry
                        const enabledDefaultFunctions = getEnabledDefaultFunctions();
                        enabledDefaultFunctions[func.name] = {
                            code: func.code,
                            toolDefinition: toolDefinition,
                            groupId: group.groupId || group.id
                        };
                        setEnabledDefaultFunctions(enabledDefaultFunctions);
                        
                        console.log(`Loaded default function ${func.name} to separate storage`);
                        
                        // Ensure function tools are enabled globally
                        if (!window.FunctionToolsService.isFunctionToolsEnabled()) {
                            console.log(`Enabling function tools globally for loaded default function ${func.name}`);
                            window.FunctionToolsService.setFunctionToolsEnabled(true);
                        }
                    }
                } catch (error) {
                    console.error(`Error parsing default function ${func.name}:`, error);
                }
            }
        });
        
        console.log(`Loaded ${selectedFunctionIds.length} individual default functions`);
        
        // Debug: Check final state
        if (window.FunctionToolsService) {
            const enabledNames = window.FunctionToolsService.getEnabledFunctionNames();
            console.log('All enabled functions after loading default functions:', enabledNames);
        }
    }
    
    /**
     * Debug function to check current state
     */
    function debugCurrentState() {
        console.log('=== DEFAULT FUNCTIONS DEBUG ===');
        const selectedIds = getSelectedIndividualFunctionIds();
        console.log('Selected individual function IDs:', selectedIds);
        
        if (window.FunctionToolsService) {
            // Check global function tools state
            const globallyEnabled = window.FunctionToolsService.isFunctionToolsEnabled();
            console.log('Function tools globally enabled:', globallyEnabled);
            
            const allFunctions = window.FunctionToolsService.getJsFunctions();
            const enabledFunctions = window.FunctionToolsService.getEnabledFunctionNames();
            const toolDefinitions = window.FunctionToolsService.getEnabledToolDefinitions();
            
            console.log('All registered functions:', Object.keys(allFunctions));
            console.log('Enabled function names:', enabledFunctions);
            console.log('Tool definitions for API:', toolDefinitions.map(t => t.function?.name));
            
            // Check specifically for default functions
            selectedIds.forEach(functionId => {
                const [groupId, functionName] = functionId.split(':');
                console.log(`Default function ${functionName}:`);
                console.log('  - Registered:', !!allFunctions[functionName]);
                console.log('  - Enabled:', enabledFunctions.includes(functionName));
                console.log('  - Has tool definition:', !!allFunctions[functionName]?.toolDefinition);
                console.log('  - Tool definition valid:', !!allFunctions[functionName]?.toolDefinition?.function?.name);
            });
            
            // Check what function calling manager returns
            if (window.aiHackare && window.aiHackare.functionCallingManager) {
                const fcmDefinitions = window.aiHackare.functionCallingManager.getFunctionDefinitions();
                console.log('Function calling manager tool definitions:', fcmDefinitions.length, fcmDefinitions.map(t => t.function?.name));
            }
        }
        console.log('=== END DEBUG ===');
    }
    
    // Make debug function available globally for testing
    window.debugDefaultFunctions = debugCurrentState;

    // Public API
    return {
        getDefaultFunctionCollections,
        getDefaultFunctionCollectionById,
        getSelectedDefaultFunctionIds,
        setSelectedDefaultFunctionIds,
        toggleDefaultFunctionCollectionSelection,
        isDefaultFunctionCollectionSelected,
        getSelectedDefaultFunctionCollections,
        getSelectedIndividualFunctionIds,
        setSelectedIndividualFunctionIds,
        isIndividualFunctionSelected,
        toggleIndividualFunctionSelection,
        batchToggleIndividualFunctions,
        loadSelectedDefaultFunctions,
        initializeDefaultFunctions,
        debugCurrentState,
        getEnabledDefaultFunctions,
        getEnabledDefaultFunctionToolDefinitions
    };
})();