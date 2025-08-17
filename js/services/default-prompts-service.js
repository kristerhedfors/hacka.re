/**
 * Default Prompts Service
 * Handles storage and management of default system prompts
 */

window.DefaultPromptsService = (function() {
    // Storage key for default prompts selection
    const SELECTED_DEFAULT_PROMPTS_KEY = 'selected_default_prompts';
    
    // Default prompts data - these are loaded from individual files
    let DEFAULT_PROMPTS = [];
    
/**
 * Initialize the default prompts
 * This function loads only the three required default prompts for RAG functionality
 */
function initializeDefaultPrompts() {
    // Clear the array first
    DEFAULT_PROMPTS = [];
    
    // Only load the three specified default prompts at the bottom:
    
    // 1. About hacka.re Project
    if (window.HackaReProjectPrompt) {
        DEFAULT_PROMPTS.push(window.HackaReProjectPrompt);
    }
    
    // 2. The urgency of interpretability
    if (window.InterpretabilityUrgencyPrompt) {
        DEFAULT_PROMPTS.push(window.InterpretabilityUrgencyPrompt);
    }
    
    // 3. OWASP Top 10 for LLM Applications
    if (window.OwaspLlmTop10Prompt) {
        DEFAULT_PROMPTS.push(window.OwaspLlmTop10Prompt);
    }
    
    console.log(`Loaded ${DEFAULT_PROMPTS.length} default prompts for RAG functionality`);
    console.log("Default prompts loaded:", DEFAULT_PROMPTS.map(p => p.name));
}
    
    // Initialize prompts when the service is loaded
    initializeDefaultPrompts();
    
    // Add a global helper for debugging
    window.clearDefaultPrompts = clearSelectedDefaultPrompts;
    
    /**
     * Get all default prompts
     * @returns {Array} Array of default prompt objects
     */
    function getDefaultPrompts() {
        return DEFAULT_PROMPTS;
    }
    
    /**
     * Get a default prompt by ID
     * @param {string} id - The default prompt ID
     * @returns {Object|null} The default prompt object or null if not found
     */
    function getDefaultPromptById(id) {
        return DEFAULT_PROMPTS.find(p => p.id === id) || null;
    }
    
    /**
     * Get the selected default prompt IDs
     * @returns {Array} Array of selected default prompt IDs
     */
    function getSelectedDefaultPromptIds() {
        const selectedIds = CoreStorageService.getValue(SELECTED_DEFAULT_PROMPTS_KEY);
        return selectedIds || [];
    }
    
    /**
     * Set the selected default prompt IDs
     * @param {Array} ids - Array of default prompt IDs to set as selected
     */
    function setSelectedDefaultPromptIds(ids) {
        if (Array.isArray(ids) && ids.length > 0) {
            CoreStorageService.setValue(SELECTED_DEFAULT_PROMPTS_KEY, ids);
        } else {
            CoreStorageService.removeValue(SELECTED_DEFAULT_PROMPTS_KEY);
        }
    }
    
    /**
     * Toggle a default prompt's selection status
     * @param {string} id - The default prompt ID to toggle
     * @returns {boolean} True if the prompt is now selected, false if unselected
     */
    function toggleDefaultPromptSelection(id) {
        console.log("DefaultPromptsService.toggleDefaultPromptSelection called for id:", id);
        const selectedIds = getSelectedDefaultPromptIds();
        const index = selectedIds.indexOf(id);
        let result;
        
        if (index >= 0) {
            // Remove from selected
            selectedIds.splice(index, 1);
            setSelectedDefaultPromptIds(selectedIds);
            result = false;
        } else {
            // Add to selected
            selectedIds.push(id);
            setSelectedDefaultPromptIds(selectedIds);
            result = true;
        }
        
        // Get all selected prompts - getSelectedDefaultPrompts now handles nested prompts
        // and re-evaluates Function Library content automatically
        const selectedDefaultPrompts = getSelectedDefaultPrompts();
        const selectedPrompts = window.PromptsService ? 
            window.PromptsService.getSelectedPrompts() : [];
        
        const allSelectedPrompts = [...selectedDefaultPrompts, ...selectedPrompts];
        console.log("Selected prompts count:", allSelectedPrompts.length);
        
        if (allSelectedPrompts.length > 0) {
            // Combine all selected prompts
            const combinedContent = allSelectedPrompts
                .map(prompt => prompt.content)
                .join('\n\n---\n\n');
            
            console.log("Combined content length:", combinedContent.length);
            
            // Save to system prompt in storage service
            StorageService.saveSystemPrompt(combinedContent);
            
            // Update main context usage display directly
            if (window.ModelInfoService && window.aiHackare && window.aiHackare.chatManager) {
                console.log("Updating main context usage directly from toggleDefaultPromptSelection");
                
                // Get the current messages - make sure we're getting the latest messages
                const messages = window.aiHackare.chatManager.getMessages() || [];
                
                // Get current model
                const currentModel = window.aiHackare.settingsManager ? 
                    window.aiHackare.settingsManager.getCurrentModel() : '';
                
                // Calculate percentage using the utility function directly
                const contextUsageData = UIUtils.estimateContextUsage(
                    messages, 
                    ModelInfoService.modelInfo, 
                    currentModel,
                    combinedContent
                );
                
                console.log("Calculated context usage data:", contextUsageData);
                
                // Update the UI directly
                const usageFill = document.querySelector('.usage-fill');
                const usageText = document.querySelector('.usage-text');
                
                if (usageFill && usageText) {
                    console.log("Directly updating UI elements");
                    UIUtils.updateContextUsage(usageFill, usageText, contextUsageData.percentage);
                } else {
                    console.log("Could not find UI elements");
                }
            }
        } else {
            // No prompts selected, clear the system prompt
            StorageService.saveSystemPrompt('');
            
            // Update context usage to reflect empty system prompt
            if (window.ModelInfoService && window.aiHackare && window.aiHackare.chatManager) {
                const messages = window.aiHackare.chatManager.getMessages() || [];
                const currentModel = window.aiHackare.settingsManager ? 
                    window.aiHackare.settingsManager.getCurrentModel() : '';
                
                const contextUsageData = UIUtils.estimateContextUsage(
                    messages, 
                    ModelInfoService.modelInfo, 
                    currentModel,
                    ''
                );
                
                const usageFill = document.querySelector('.usage-fill');
                const usageText = document.querySelector('.usage-text');
                
                if (usageFill && usageText) {
                    UIUtils.updateContextUsage(usageFill, usageText, contextUsageData.percentage);
                }
            }
        }
        
        return result;
    }
    
    /**
     * Check if a default prompt is selected
     * @param {string} id - The default prompt ID to check
     * @returns {boolean} True if the prompt is selected
     */
    function isDefaultPromptSelected(id) {
        const selectedIds = getSelectedDefaultPromptIds();
        return selectedIds.includes(id);
    }
    
    /**
     * Get all selected default prompts
     * @returns {Array} Array of selected default prompt objects
     */
    function getSelectedDefaultPrompts() {
        const selectedIds = getSelectedDefaultPromptIds();
        const selectedPrompts = [];
        
        // Iterate through all prompts, including nested ones
        DEFAULT_PROMPTS.forEach(prompt => {
            // Check if this prompt is selected
            if (selectedIds.includes(prompt.id)) {
                selectedPrompts.push(prompt);
            }
            
            // Check if this is a section with nested items
            if (prompt.isSection && prompt.items && prompt.items.length > 0) {
                // Check each nested item
                prompt.items.forEach(nestedPrompt => {
                    if (selectedIds.includes(nestedPrompt.id)) {
                        // If the content is a function, we need to evaluate it
                        if (nestedPrompt.id === 'function-library' && 
                            window.FunctionLibraryPrompt && 
                            typeof window.FunctionLibraryPrompt.content === 'function') {
                            // Create a copy with the re-evaluated content
                            selectedPrompts.push({
                                ...nestedPrompt,
                                content: window.FunctionLibraryPrompt.content()
                            });
                        } else {
                            selectedPrompts.push(nestedPrompt);
                        }
                    }
                });
            }
        });
        
        return selectedPrompts;
    }
    
    /**
     * Clear all selected default prompts
     * This is useful for debugging or resetting the state
     */
    function clearSelectedDefaultPrompts() {
        console.log('Clearing all selected default prompts');
        CoreStorageService.removeValue(SELECTED_DEFAULT_PROMPTS_KEY);
        
        // Update system prompt
        if (window.SystemPromptCoordinator) {
            window.SystemPromptCoordinator.updateSystemPrompt(true);
        }
    }

    // Public API
    return {
        getDefaultPrompts,
        getDefaultPromptById,
        getSelectedDefaultPromptIds,
        setSelectedDefaultPromptIds,
        toggleDefaultPromptSelection,
        isDefaultPromptSelected,
        getSelectedDefaultPrompts,
        initializeDefaultPrompts,
        clearSelectedDefaultPrompts
    };
})();
