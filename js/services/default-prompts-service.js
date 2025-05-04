/**
 * Default Prompts Service
 * Handles storage and management of default system prompts
 */

window.DefaultPromptsService = (function() {
    // Storage key for default prompts selection
    const SELECTED_DEFAULT_PROMPTS_KEY = 'selected_default_prompts';
    
    // Default prompts data - these are built-in prompts that cannot be modified by users
    const DEFAULT_PROMPTS = [
        {
            id: 'hacka-re-project',
            name: 'About hacka.re Project',
            content: `# About hacka.re Project

hacka.re is a privacy-focused web client for AI models created in early 2025. It provides a streamlined, browser-based interface for interacting with powerful AI models while maintaining a focus on privacy and user control.

## Key Features

- **Privacy-First Design**: All data stays in your browser - your API key and conversations never leave your device except when making direct requests to the AI provider's API.
- **No Server Components**: Pure client-side application using vanilla JavaScript, HTML, and CSS with no backend server.
- **Local Storage**: All settings, conversations, and prompts are stored locally in your browser.
- **Comprehensive Secure Sharing**: Create session key-protected shareable links to securely share configurations.
- **Customizable System Prompts**: Create and manage a library of system prompts to define AI behavior.
- **Context Window Visualization**: Real-time display of token usage within model's context limit.
- **Markdown Support**: Rich formatting for AI responses including code blocks with syntax highlighting.

## Technical Implementation

The application communicates directly with your configured AI provider's API using your personal API key, which is stored securely in your browser's localStorage. All message processing, including markdown rendering and syntax highlighting, happens locally in your browser.

The interface uses server-sent events (SSE) to stream AI responses in real-time, providing a smooth and responsive experience even with longer generations.

## Privacy Considerations

- GitHub Pages hosted site - the application is hosted on GitHub's servers
- Stores your API key only in your browser's localStorage
- Keeps conversation history locally on your device
- All chat content is sent to your configured AI provider's API servers for processing
- Your conversations are subject to your AI provider's privacy policy
- Does not use analytics, tracking, or telemetry
- Has no custom backend server that could potentially log your data
- All external libraries are hosted locally to prevent third-party CDN connections`
        }
    ];
    
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
            if (window.ModelInfoService) {
                console.log("Updating main context usage directly from toggleDefaultPromptSelection");
                
                // Get the current messages
                const messages = window.aiHackare && window.aiHackare.chatManager ? 
                    window.aiHackare.chatManager.getMessages() || [] : [];
                
                // Get current model
                const currentModel = window.aiHackare && window.aiHackare.settingsManager ? 
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
        getSelectedDefaultPrompts
    };
})();
