/**
 * Prompts Service
 * Handles storage and management of labeled prompts with encryption
 * Manages the system prompt by combining selected prompts
 */

window.PromptsService = (function() {
    // Storage key for prompts
    const PROMPTS_STORAGE_KEY = 'prompts';
    
    // Storage key for selected prompt IDs (those included in the system prompt)
    const SELECTED_PROMPT_IDS_KEY = 'selected_prompt_ids';
    
    /**
     * Save a prompt to local storage with encryption
     * @param {Object} prompt - The prompt object to save
     * @param {string} prompt.id - Unique ID for the prompt
     * @param {string} prompt.name - Name of the prompt
     * @param {string} prompt.content - Content of the prompt
     * @returns {Object} The saved prompt
     */
    function savePrompt(prompt) {
        // Ensure prompt has an ID
        if (!prompt.id) {
            prompt.id = generateId();
        }
        
        // Get existing prompts
        const prompts = getPrompts();
        
        // Find if prompt already exists
        const existingIndex = prompts.findIndex(p => p.id === prompt.id);
        
        if (existingIndex >= 0) {
            // Update existing prompt
            prompts[existingIndex] = prompt;
        } else {
            // Add new prompt
            prompts.push(prompt);
        }
        
        // Save to storage with encryption
        CoreStorageService.setValue(PROMPTS_STORAGE_KEY, prompts);
        
        return prompt;
    }
    
    /**
     * Get all prompts from local storage with decryption
     * @returns {Array} Array of prompt objects
     */
    function getPrompts() {
        const prompts = CoreStorageService.getValue(PROMPTS_STORAGE_KEY);
        return prompts || [];
    }
    
    /**
     * Get a prompt by ID
     * @param {string} id - The prompt ID
     * @returns {Object|null} The prompt object or null if not found
     */
    function getPromptById(id) {
        const prompts = getPrompts();
        return prompts.find(p => p.id === id) || null;
    }
    
    /**
     * Delete a prompt by ID
     * @param {string} id - The prompt ID to delete
     * @returns {boolean} True if deleted, false if not found
     */
    function deletePrompt(id) {
        const prompts = getPrompts();
        const initialLength = prompts.length;
        
        // Filter out the prompt to delete
        const filteredPrompts = prompts.filter(p => p.id !== id);
        
        // Check if a prompt was removed
        if (filteredPrompts.length < initialLength) {
            // Save filtered prompts with encryption
            CoreStorageService.setValue(PROMPTS_STORAGE_KEY, filteredPrompts);
            
            // Remove from selected prompts if it was selected
            if (isPromptSelected(id)) {
                const selectedIds = getSelectedPromptIds();
                const updatedSelectedIds = selectedIds.filter(selectedId => selectedId !== id);
                setSelectedPromptIds(updatedSelectedIds);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Get the selected prompt IDs with decryption
     * @returns {Array} Array of selected prompt IDs
     */
    function getSelectedPromptIds() {
        const selectedIds = CoreStorageService.getValue(SELECTED_PROMPT_IDS_KEY);
        return selectedIds || [];
    }
    
    /**
     * Set the selected prompt IDs with encryption
     * @param {Array} ids - Array of prompt IDs to set as selected
     */
    function setSelectedPromptIds(ids) {
        if (Array.isArray(ids) && ids.length > 0) {
            CoreStorageService.setValue(SELECTED_PROMPT_IDS_KEY, ids);
        } else {
            CoreStorageService.removeValue(SELECTED_PROMPT_IDS_KEY);
        }
    }
    
/**
 * Toggle a prompt's selection status
 * @param {string} id - The prompt ID to toggle
 * @returns {boolean} True if the prompt is now selected, false if unselected
 */
function togglePromptSelection(id) {
    const selectedIds = getSelectedPromptIds();
    const index = selectedIds.indexOf(id);
    let result;
    
    if (index >= 0) {
        // Remove from selected
        selectedIds.splice(index, 1);
        setSelectedPromptIds(selectedIds);
        result = false;
    } else {
        // Add to selected
        selectedIds.push(id);
        setSelectedPromptIds(selectedIds);
        result = true;
    }
    
    // Update main context usage display if aiHackare is available
    if (window.aiHackare && window.aiHackare.chatManager) {
        window.aiHackare.chatManager.estimateContextUsage(
            window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
            window.aiHackare.settingsManager.getCurrentModel()
        );
    }
    
    return result;
}
    
    /**
     * Check if a prompt is selected
     * @param {string} id - The prompt ID to check
     * @returns {boolean} True if the prompt is selected
     */
    function isPromptSelected(id) {
        const selectedIds = getSelectedPromptIds();
        return selectedIds.includes(id);
    }
    
    /**
     * Get all selected prompts
     * @returns {Array} Array of selected prompt objects
     */
    function getSelectedPrompts() {
        const selectedIds = getSelectedPromptIds();
        const allPrompts = getPrompts();
        
        return allPrompts.filter(prompt => selectedIds.includes(prompt.id));
    }
    
/**
 * Apply selected prompts as the system prompt
 * @returns {boolean} True if prompts were applied, false if no prompts were selected
 */
function applySelectedPromptsAsSystem() {
    console.log("PromptsService.applySelectedPromptsAsSystem called");
    
    // Delegate to SystemPromptCoordinator for centralized management
    if (window.SystemPromptCoordinator) {
        const systemPrompt = window.SystemPromptCoordinator.updateSystemPrompt(true);
        const hasPrompts = systemPrompt.length > 0;
        
        console.log("System prompt applied via coordinator, has content:", hasPrompts);
        return hasPrompts;
    } else {
        // Fallback to old behavior if coordinator not available
        console.warn("SystemPromptCoordinator not available, using fallback");
        const selectedPrompts = getSelectedPrompts();
        const selectedDefaultPrompts = window.DefaultPromptsService ? 
            window.DefaultPromptsService.getSelectedDefaultPrompts() : [];
        
        const allSelectedPrompts = [...selectedDefaultPrompts, ...selectedPrompts];
        
        if (allSelectedPrompts.length > 0) {
            const combinedContent = allSelectedPrompts
                .map(prompt => prompt.content)
                .join('\n\n---\n\n');
            
            StorageService.saveSystemPrompt(combinedContent);
            return true;
        } else {
            StorageService.saveSystemPrompt('');
            return false;
        }
    }
}
    
    /**
     * Generate a unique ID for a prompt
     * @returns {string} A unique ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    // Public API
    return {
        savePrompt,
        getPrompts,
        getPromptById,
        deletePrompt,
        getSelectedPromptIds,
        setSelectedPromptIds,
        togglePromptSelection,
        isPromptSelected,
        getSelectedPrompts,
        applySelectedPromptsAsSystem
    };
})();
