/**
 * System Prompt Coordinator Service
 * Centralizes system prompt assembly and management
 * Coordinates between PromptsService, DefaultPromptsService, and dynamic content sources
 */

window.SystemPromptCoordinator = (function() {
    
    /**
     * Get all selected prompts from all sources
     * @returns {Array} Combined array of all selected prompts
     */
    function getAllSelectedPrompts() {
        const selectedPrompts = window.PromptsService ? 
            window.PromptsService.getSelectedPrompts() : [];
        const selectedDefaultPrompts = window.DefaultPromptsService ? 
            window.DefaultPromptsService.getSelectedDefaultPrompts() : [];
        
        return [...selectedDefaultPrompts, ...selectedPrompts];
    }
    
    /**
     * Get the current content for a prompt, handling dynamic content
     * @param {Object} prompt - Prompt object
     * @returns {string} Current prompt content
     */
    function getPromptContent(prompt) {
        // Handle Function Library prompt with dynamic content
        if (prompt.id === 'function-library' && 
            window.FunctionLibraryPrompt && 
            typeof window.FunctionLibraryPrompt.content === 'function') {
            try {
                return window.FunctionLibraryPrompt.content();
            } catch (error) {
                console.error('Error getting Function Library content:', error);
                return prompt.content || '';
            }
        }
        
        return prompt.content || '';
    }
    
    /**
     * Assemble the complete system prompt from all selected prompts
     * @returns {string} Combined system prompt content
     */
    function assembleSystemPrompt() {
        const allSelectedPrompts = getAllSelectedPrompts();
        
        if (allSelectedPrompts.length === 0) {
            return '';
        }
        
        // Combine all selected prompts content
        const combinedContent = allSelectedPrompts
            .map(prompt => getPromptContent(prompt))
            .filter(content => content.trim() !== '') // Remove empty content
            .join('\n\n---\n\n');
        
        return combinedContent;
    }
    
    /**
     * Update the system prompt in storage and notify components
     * @param {boolean} notifyComponents - Whether to trigger component updates
     * @returns {string} The assembled system prompt
     */
    function updateSystemPrompt(notifyComponents = true) {
        const systemPrompt = assembleSystemPrompt();
        
        // Save to storage
        if (window.StorageService) {
            window.StorageService.saveSystemPrompt(systemPrompt);
        }
        
        // Notify components if requested
        if (notifyComponents) {
            notifySystemPromptUpdate(systemPrompt);
        }
        
        console.log('System prompt updated, length:', systemPrompt.length);
        return systemPrompt;
    }
    
    /**
     * Notify components that the system prompt has been updated
     * @param {string} systemPrompt - The new system prompt
     */
    function notifySystemPromptUpdate(systemPrompt) {
        // Update system prompt input in settings if available
        const systemPromptInput = document.getElementById('system-prompt');
        if (systemPromptInput) {
            systemPromptInput.value = systemPrompt;
        }
        
        // Trigger context usage updates if components are available
        if (window.aiHackare) {
            // Update main context usage if chat manager is available
            if (window.aiHackare.chatManager && 
                typeof window.aiHackare.chatManager.updateContextUsage === 'function') {
                window.aiHackare.chatManager.updateContextUsage();
            }
            
            // Update prompts manager context usage if available
            if (window.aiHackare.promptsManager && 
                typeof window.aiHackare.promptsManager.updatePromptsTokenUsage === 'function') {
                // Note: This would need to be exposed in the public API
                console.log('Prompts manager context usage update needed');
            }
        }
        
        // Emit event via EventBus for decoupled communication
        if (window.UIUtils && window.UIUtils.EventBus) {
            window.UIUtils.EventBus.emit('systemPromptUpdated', {
                systemPrompt: systemPrompt,
                promptCount: getAllSelectedPrompts().length
            });
        }
        
        // Also emit custom DOM event for backward compatibility
        const event = new CustomEvent('systemPromptUpdated', {
            detail: {
                systemPrompt: systemPrompt,
                promptCount: getAllSelectedPrompts().length
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Get information about the current system prompt
     * @returns {Object} System prompt information
     */
    function getSystemPromptInfo() {
        const allSelectedPrompts = getAllSelectedPrompts();
        const systemPrompt = assembleSystemPrompt();
        
        return {
            content: systemPrompt,
            length: systemPrompt.length,
            promptCount: allSelectedPrompts.length,
            prompts: allSelectedPrompts.map(p => ({
                id: p.id,
                name: p.name,
                type: p.isDefault ? 'default' : 'user',
                contentLength: getPromptContent(p).length
            }))
        };
    }
    
    /**
     * Validate that all selected prompts have valid content
     * @returns {Object} Validation result
     */
    function validateSelectedPrompts() {
        const allSelectedPrompts = getAllSelectedPrompts();
        const issues = [];
        
        allSelectedPrompts.forEach(prompt => {
            const content = getPromptContent(prompt);
            
            if (!content || content.trim() === '') {
                issues.push({
                    promptId: prompt.id,
                    promptName: prompt.name,
                    issue: 'Empty content'
                });
            }
            
            if (!prompt.name || prompt.name.trim() === '') {
                issues.push({
                    promptId: prompt.id,
                    promptName: 'Unnamed',
                    issue: 'Missing name'
                });
            }
        });
        
        return {
            isValid: issues.length === 0,
            issues: issues,
            promptCount: allSelectedPrompts.length
        };
    }
    
    /**
     * Initialize the SystemPromptCoordinator
     * Sets up event listeners and initial state
     */
    function init() {
        // Listen for prompt selection changes
        document.addEventListener('promptSelectionChanged', () => {
            updateSystemPrompt(true);
        });
        
        // Listen for prompt content changes
        document.addEventListener('promptContentChanged', () => {
            updateSystemPrompt(true);
        });
        
        // Initial system prompt update
        updateSystemPrompt(false); // Don't notify on init to avoid loops
        
        console.log('SystemPromptCoordinator initialized');
    }
    
    /**
     * Trigger prompt selection change event
     * To be called by prompt services when selections change
     */
    function triggerSelectionChange() {
        const event = new CustomEvent('promptSelectionChanged');
        document.dispatchEvent(event);
    }
    
    /**
     * Trigger prompt content change event
     * To be called when prompt content is modified
     */
    function triggerContentChange() {
        const event = new CustomEvent('promptContentChanged');
        document.dispatchEvent(event);
    }
    
    // Public API
    return {
        getAllSelectedPrompts,
        getPromptContent,
        assembleSystemPrompt,
        updateSystemPrompt,
        getSystemPromptInfo,
        validateSelectedPrompts,
        init,
        triggerSelectionChange,
        triggerContentChange
    };
})();