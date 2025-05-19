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
     * This function loads all registered default prompts
     */
    function initializeDefaultPrompts() {
        // Clear the array first
        DEFAULT_PROMPTS = [];
        
        // Add prompts from individual files if they exist in the specified order
        
        // 1. About hacka.re Project
        if (window.HackaReProjectPrompt) {
            DEFAULT_PROMPTS.push(window.HackaReProjectPrompt);
        }
        
        // 2. The urgency of interpretability
        if (window.InterpretabilityUrgencyPrompt) {
            DEFAULT_PROMPTS.push(window.InterpretabilityUrgencyPrompt);
        }
        
        // 3. Function Library
        if (window.FunctionLibraryPrompt) {
            // If the content is a function, we need to evaluate it
            if (typeof window.FunctionLibraryPrompt.content === 'function') {
                // Create a copy of the prompt with the evaluated content
                const evaluatedPrompt = {
                    ...window.FunctionLibraryPrompt,
                    content: window.FunctionLibraryPrompt.content()
                };
                DEFAULT_PROMPTS.push(evaluatedPrompt);
            } else {
                DEFAULT_PROMPTS.push(window.FunctionLibraryPrompt);
            }
        }
        
        // 4. Agent orchestration example
        if (window.AgentOrchestrationPrompt) {
            DEFAULT_PROMPTS.push(window.AgentOrchestrationPrompt);
        }
        
        // 5. OWASP Top 10 for LLM Applications
        if (window.OwaspLlmTop10Prompt) {
            DEFAULT_PROMPTS.push(window.OwaspLlmTop10Prompt);
        }
        
        // Add MCP SDK README prompt if it exists
        if (window.McpSdkReadmePrompt) {
            DEFAULT_PROMPTS.push(window.McpSdkReadmePrompt);
        }
        
        // Additional prompts can be added here in the future
        
        console.log(`Loaded ${DEFAULT_PROMPTS.length} default prompts`);
    }
    
    // Initialize prompts when the service is loaded
    initializeDefaultPrompts();
    
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
        
        // Get all selected prompts
        let selectedDefaultPrompts = getSelectedDefaultPrompts();
        const selectedPrompts = window.PromptsService ? 
            window.PromptsService.getSelectedPrompts() : [];
        
        // Re-evaluate Function Library prompt content if it's selected
        selectedDefaultPrompts = selectedDefaultPrompts.map(prompt => {
            if (prompt.id === 'function-library' && window.FunctionLibraryPrompt && typeof window.FunctionLibraryPrompt.content === 'function') {
                // Create a copy with the re-evaluated content
                return {
                    ...prompt,
                    content: window.FunctionLibraryPrompt.content()
                };
            }
            return prompt;
        });
        
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
                const percentage = UIUtils.estimateContextUsage(
                    messages, 
                    ModelInfoService.modelInfo, 
                    currentModel,
                    combinedContent
                );
                
                console.log("Calculated percentage:", percentage);
                
                // Update the UI directly
                const usageFill = document.querySelector('.usage-fill');
                const usageText = document.querySelector('.usage-text');
                
                if (usageFill && usageText) {
                    console.log("Directly updating UI elements");
                    UIUtils.updateContextUsage(usageFill, usageText, percentage);
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
                
                const percentage = UIUtils.estimateContextUsage(
                    messages, 
                    ModelInfoService.modelInfo, 
                    currentModel,
                    ''
                );
                
                const usageFill = document.querySelector('.usage-fill');
                const usageText = document.querySelector('.usage-text');
                
                if (usageFill && usageText) {
                    UIUtils.updateContextUsage(usageFill, usageText, percentage);
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
        return DEFAULT_PROMPTS.filter(prompt => selectedIds.includes(prompt.id));
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
        initializeDefaultPrompts
    };
})();
