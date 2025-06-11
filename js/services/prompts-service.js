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
    
    // Cache for selected prompt IDs to reduce decrypt operations
    let selectedPromptIdsCache = null;
    let cacheTimestamp = 0;
    const CACHE_TTL = 5000; // 5 seconds TTL
    
    // Debounce timer for batched updates
    let updateTimer = null;
    
    // Performance monitoring
    const performanceMetrics = {
        cacheHits: 0,
        cacheMisses: 0,
        decryptOperations: 0,
        toggleOperations: 0
    };
    
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
     * Get the selected prompt IDs with caching to reduce decrypt operations
     * @returns {Array} Array of selected prompt IDs
     */
    function getSelectedPromptIds() {
        const now = Date.now();
        
        // Check if cache is valid
        if (selectedPromptIdsCache !== null && (now - cacheTimestamp) < CACHE_TTL) {
            performanceMetrics.cacheHits++;
            return selectedPromptIdsCache;
        }
        
        // Cache miss - decrypt from storage
        performanceMetrics.cacheMisses++;
        performanceMetrics.decryptOperations++;
        const selectedIds = CoreStorageService.getValue(SELECTED_PROMPT_IDS_KEY);
        const result = selectedIds || [];
        
        // Update cache
        selectedPromptIdsCache = result;
        cacheTimestamp = now;
        
        return result;
    }
    
    /**
     * Set the selected prompt IDs with encryption and update cache
     * @param {Array} ids - Array of prompt IDs to set as selected
     */
    function setSelectedPromptIds(ids) {
        if (Array.isArray(ids) && ids.length > 0) {
            CoreStorageService.setValue(SELECTED_PROMPT_IDS_KEY, ids);
            // Update cache immediately
            selectedPromptIdsCache = [...ids];
            cacheTimestamp = Date.now();
        } else {
            CoreStorageService.removeValue(SELECTED_PROMPT_IDS_KEY);
            // Clear cache
            selectedPromptIdsCache = [];
            cacheTimestamp = Date.now();
        }
    }
    
    /**
     * Clear the cache to force reload from storage
     */
    function clearCache() {
        selectedPromptIdsCache = null;
        cacheTimestamp = 0;
    }
    
/**
 * Toggle a prompt's selection status (optimized)
 * @param {string} id - The prompt ID to toggle
 * @returns {boolean} True if the prompt is now selected, false if unselected
 */
function togglePromptSelection(id) {
    performanceMetrics.toggleOperations++;
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
    
    // Don't trigger context updates here - let the PromptsManager coordinate
    // This prevents redundant context calculations on every toggle
    // The PromptsManager's updateAfterSelectionChange will handle the coordination
    
    return result;
}

/**
 * Schedule a debounced context usage update to batch operations
 */
function scheduleContextUpdate() {
    if (updateTimer) {
        clearTimeout(updateTimer);
    }
    
    updateTimer = setTimeout(() => {
        // Update main context usage display if aiHackare is available
        if (window.aiHackare && window.aiHackare.chatManager) {
            window.aiHackare.chatManager.estimateContextUsage(
                window.aiHackare.uiManager.updateContextUsage.bind(window.aiHackare.uiManager),
                window.aiHackare.settingsManager.getCurrentModel()
            );
        }
        updateTimer = null;
    }, 150); // 150ms debounce delay
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
    
    /**
     * Get performance metrics for debugging
     * @returns {Object} Performance metrics
     */
    function getPerformanceMetrics() {
        return {
            ...performanceMetrics,
            cacheHitRate: performanceMetrics.cacheHits + performanceMetrics.cacheMisses > 0 
                ? (performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }
    
    /**
     * Reset performance metrics
     */
    function resetPerformanceMetrics() {
        performanceMetrics.cacheHits = 0;
        performanceMetrics.cacheMisses = 0;
        performanceMetrics.decryptOperations = 0;
        performanceMetrics.toggleOperations = 0;
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
        applySelectedPromptsAsSystem,
        clearCache,
        scheduleContextUpdate,
        getPerformanceMetrics,
        resetPerformanceMetrics
    };
})();
