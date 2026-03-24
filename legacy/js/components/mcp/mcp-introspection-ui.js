/**
 * MCP Introspection UI Handler
 * Manages the UI for the built-in Introspection MCP tool
 */

window.MCPIntrospectionUI = (function() {
    let isEnabled = false;
    let statusElement = null;
    let enableButton = null;
    
    /**
     * Initialize the Introspection MCP UI
     */
    async function init() {
        // Get UI elements
        enableButton = document.getElementById('mcp-introspection-enable');
        statusElement = document.getElementById('mcp-introspection-status');
        
        if (!enableButton) {
            console.warn('[MCPIntrospectionUI] Enable button not found');
            return;
        }
        
        // Setup event listeners
        enableButton.addEventListener('click', handleToggle);
        
        // Initialize the service if not already done
        if (window.MCPIntrospectionService && !window.MCPIntrospectionService.initialized) {
            window.MCPIntrospectionService.init();
        }
        
        // Load saved state - this will re-enable if it was enabled
        await loadState();
        
        console.log('[MCPIntrospectionUI] Initialized');
    }
    
    /**
     * Load saved enabled state from encrypted storage
     */
    async function loadState() {
        try {
            if (window.CoreStorageService) {
                let savedState = await window.CoreStorageService.getValue('mcp_introspection_enabled');
                
                // Migration: check if there's an old localStorage value to migrate
                if (savedState === null) {
                    const oldState = localStorage.getItem('mcp_introspection_enabled');
                    if (oldState !== null) {
                        console.log('[MCPIntrospectionUI] Migrating from localStorage to encrypted storage');
                        savedState = oldState;
                        await window.CoreStorageService.setValue('mcp_introspection_enabled', savedState);
                        // Clean up old localStorage entry
                        localStorage.removeItem('mcp_introspection_enabled');
                    }
                }
                
                isEnabled = savedState === 'true';
                updateUI();
                
                if (isEnabled) {
                    console.log('[MCPIntrospectionUI] Introspection MCP was enabled, re-enabling...');
                    await enableIntrospectionMCP();
                }
            } else {
                console.warn('[MCPIntrospectionUI] CoreStorageService not available, cannot load state');
                // No fallback - encryption is required
                isEnabled = false;
                updateUI();
            }
        } catch (error) {
            console.error('[MCPIntrospectionUI] Error loading state:', error);
        }
    }
    
    /**
     * Save enabled state to encrypted storage
     */
    async function saveState() {
        try {
            if (window.CoreStorageService) {
                await window.CoreStorageService.setValue('mcp_introspection_enabled', isEnabled.toString());
                console.log('[MCPIntrospectionUI] State saved to encrypted storage:', isEnabled);
            } else {
                console.warn('[MCPIntrospectionUI] CoreStorageService not available, cannot save state');
                // No fallback - encryption is required
            }
        } catch (error) {
            console.error('[MCPIntrospectionUI] Error saving state:', error);
        }
    }
    
    /**
     * Handle enable/disable toggle
     */
    async function handleToggle() {
        if (isEnabled) {
            await disableIntrospectionMCP();
        } else {
            await enableIntrospectionMCP();
        }
    }
    
    /**
     * Enable the Introspection MCP
     */
    async function enableIntrospectionMCP() {
        try {
            // Register the tools with MCP system
            if (window.MCPIntrospectionService) {
                window.MCPIntrospectionService.registerTools();
                
                // Register with function tools service for API integration
                if (window.FunctionToolsService) {
                    // Ensure function calling is enabled so the tools can be used
                    if (!window.FunctionToolsService.isFunctionToolsEnabled()) {
                        window.FunctionToolsService.setFunctionToolsEnabled(true);
                        console.log('[MCPIntrospectionUI] Enabled function calling system for Introspection MCP tools');
                    }
                    
                    const tools = window.MCPIntrospectionService.getToolDefinitions();
                    
                    tools.forEach(tool => {
                        // Create a function wrapper for each tool
                        const toolName = tool.function.name;
                        const toolDescription = tool.function.description;
                        // The executor passes 'args' when it can't parse individual parameters
                        const functionCode = `
/**
 * ${toolDescription}
 * @tool
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool result
 */
async function ${toolName}(args) {
    console.log('[MCP Introspection] Function ${toolName} called with args:', args);
    const result = await window.MCPIntrospectionService.handleToolCall("${toolName}", args);
    console.log('[MCP Introspection] Function ${toolName} returning:', result);
    return result;
}`;
                        
                        // Add function with collection metadata
                        const collectionMetadata = {
                            name: 'Introspection MCP',
                            description: 'Built-in MCP tools for exploring hacka.re source code',
                            source: 'mcp-service',
                            provider: 'introspection'
                        };
                        
                        // Use addJsFunction which includes collection support
                        window.FunctionToolsService.addJsFunction(
                            toolName,
                            functionCode,
                            tool,
                            'mcp_introspection',
                            collectionMetadata
                        );
                        
                        // Enable the function
                        window.FunctionToolsService.enableJsFunction(toolName);
                    });
                    
                    console.log('[MCPIntrospectionUI] Registered tools with FunctionToolsService');
                    
                    // Refresh the function list UI to show the new collection (following established pattern)
                    if (window.functionListRenderer && window.functionListRenderer.renderMainFunctionList) {
                        setTimeout(() => {
                            window.functionListRenderer.renderMainFunctionList();
                            console.log('[MCPIntrospectionUI] Refreshed function list UI for Introspection MCP tools');
                        }, 100);
                    }
                }
                
                // Auto-enable the Introspection MCP guide prompt
                if (window.DefaultPromptsService) {
                    try {
                        // First make sure the prompt is registered
                        if (window.IntrospectionMCPGuide) {
                            window.DefaultPromptsService.registerPrompt(window.IntrospectionMCPGuide);
                            console.log('[MCPIntrospectionUI] Registered Introspection MCP guide prompt');
                        } else {
                            console.warn('[MCPIntrospectionUI] IntrospectionMCPGuide not found, will retry');
                            // Try again after a short delay
                            setTimeout(() => {
                                if (window.IntrospectionMCPGuide && window.DefaultPromptsService) {
                                    window.DefaultPromptsService.registerPrompt(window.IntrospectionMCPGuide);
                                    console.log('[MCPIntrospectionUI] Registered Introspection MCP guide prompt (delayed)');
                                    
                                    // Also select it
                                    const promptId = 'introspection-mcp-guide';
                                    const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
                                    if (!selectedIds.includes(promptId)) {
                                        selectedIds.push(promptId);
                                        window.DefaultPromptsService.setSelectedDefaultPromptIds(selectedIds);
                                        
                                        if (window.SystemPromptCoordinator) {
                                            window.SystemPromptCoordinator.updateSystemPrompt(true);
                                        }
                                        console.log('[MCPIntrospectionUI] Auto-enabled Introspection MCP guide prompt (delayed)');
                                    }
                                }
                            }, 1000);
                        }
                        
                        const promptId = 'introspection-mcp-guide';
                        const isSelected = window.DefaultPromptsService.isDefaultPromptSelected(promptId);
                        
                        if (!isSelected) {
                            // Now enable it by ID (not by name)
                            const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
                            if (!selectedIds.includes(promptId)) {
                                selectedIds.push(promptId);
                                window.DefaultPromptsService.setSelectedDefaultPromptIds(selectedIds);
                                
                                // Update system prompt to include the new selection
                                if (window.SystemPromptCoordinator) {
                                    window.SystemPromptCoordinator.updateSystemPrompt(true);
                                }
                                
                                console.log('[MCPIntrospectionUI] Auto-enabled Introspection MCP guide prompt');
                            }
                        } else {
                            console.log('[MCPIntrospectionUI] Introspection MCP guide prompt already selected');
                            // Still update system prompt to ensure it's included
                            if (window.SystemPromptCoordinator) {
                                window.SystemPromptCoordinator.updateSystemPrompt(true);
                            }
                        }
                    } catch (error) {
                        console.warn('[MCPIntrospectionUI] Could not auto-enable guide prompt:', error);
                    }
                }
                
                isEnabled = true;
                await saveState();
                updateUI();
                showStatus('Introspection MCP enabled - Tools and guide prompt are now active', 'success');
            }
        } catch (error) {
            console.error('[MCPIntrospectionUI] Error enabling Introspection MCP:', error);
            showStatus('Failed to enable Introspection MCP: ' + error.message, 'error');
        }
    }
    
    /**
     * Disable the Introspection MCP
     */
    async function disableIntrospectionMCP() {
        try {
            // Remove from function tools service
            if (window.FunctionToolsService && window.MCPIntrospectionService) {
                const tools = window.MCPIntrospectionService.getToolDefinitions();
                
                // Remove each function (this will also remove the collection)
                tools.forEach(tool => {
                    window.FunctionToolsService.removeJsFunction(tool.function.name);
                });
                
                console.log('[MCPIntrospectionUI] Removed tools from FunctionToolsService');
                
                // Refresh the function list UI to reflect removal (following established pattern)
                if (window.functionListRenderer && window.functionListRenderer.renderMainFunctionList) {
                    setTimeout(() => {
                        window.functionListRenderer.renderMainFunctionList();
                        console.log('[MCPIntrospectionUI] Refreshed function list UI after removing Introspection MCP tools');
                    }, 100);
                }
            }
            
            // Auto-disable and unregister the Introspection MCP guide prompt
            if (window.DefaultPromptsService) {
                try {
                    const promptId = 'introspection-mcp-guide';
                    const isSelected = window.DefaultPromptsService.isDefaultPromptSelected(promptId);
                    
                    if (isSelected) {
                        // Remove it from selected IDs
                        const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
                        const index = selectedIds.indexOf(promptId);
                        if (index > -1) {
                            selectedIds.splice(index, 1);
                            window.DefaultPromptsService.setSelectedDefaultPromptIds(selectedIds);
                            
                            // Update system prompt to reflect the change
                            if (window.SystemPromptCoordinator) {
                                window.SystemPromptCoordinator.updateSystemPrompt(true);
                            }
                            
                            console.log('[MCPIntrospectionUI] Auto-disabled Introspection MCP guide prompt');
                        }
                    }
                    
                    // Unregister the prompt entirely so it's not visible
                    window.DefaultPromptsService.unregisterPrompt('🔍 Introspection MCP Guide');
                    console.log('[MCPIntrospectionUI] Unregistered Introspection MCP guide prompt');
                } catch (error) {
                    console.warn('[MCPIntrospectionUI] Could not auto-disable/unregister guide prompt:', error);
                }
            }
            
            isEnabled = false;
            await saveState();
            updateUI();
            showStatus('Introspection MCP disabled - Tools and guide prompt deactivated', 'info');
        } catch (error) {
            console.error('[MCPIntrospectionUI] Error disabling Introspection MCP:', error);
            showStatus('Failed to disable Introspection MCP: ' + error.message, 'error');
        }
    }
    
    /**
     * Update UI based on enabled state
     */
    function updateUI() {
        if (!enableButton) return;
        
        if (isEnabled) {
            enableButton.textContent = 'Disable';
            enableButton.classList.remove('btn-primary');
            enableButton.classList.add('btn-danger');
        } else {
            enableButton.textContent = 'Enable';
            enableButton.classList.remove('btn-danger');
            enableButton.classList.add('btn-primary');
        }
    }
    
    /**
     * Show status message
     * @param {string} message - Status message
     * @param {string} type - Status type ('success', 'error', 'info')
     */
    function showStatus(message, type = 'info') {
        if (!statusElement) return;
        
        statusElement.textContent = message;
        statusElement.className = 'mcp-tool-status';
        
        if (type === 'error') {
            statusElement.classList.add('error');
        }
        
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            if (statusElement) {
                statusElement.style.display = 'none';
            }
        }, 5000);
    }
    
    /**
     * Check if Introspection MCP is enabled
     * @returns {boolean}
     */
    function getEnabled() {
        return isEnabled;
    }
    
    /**
     * Reset the Introspection MCP state (called when namespace/settings are cleared)
     */
    function resetState() {
        console.log('[MCPIntrospectionUI] Resetting state due to namespace clear');
        
        // Disable without calling the storage operations (since storage is already cleared)
        if (isEnabled) {
            // Remove from function tools service if currently enabled
            if (window.FunctionToolsService && window.MCPIntrospectionService) {
                try {
                    const tools = window.MCPIntrospectionService.getToolDefinitions();
                    tools.forEach(tool => {
                        window.FunctionToolsService.removeJsFunction(tool.function.name);
                    });
                    console.log('[MCPIntrospectionUI] Removed tools from FunctionToolsService');
                    
                    // Refresh the function list UI to reflect removal (following established pattern)
                    if (window.functionListRenderer && window.functionListRenderer.renderMainFunctionList) {
                        setTimeout(() => {
                            window.functionListRenderer.renderMainFunctionList();
                            console.log('[MCPIntrospectionUI] Refreshed function list UI after reset');
                        }, 100);
                    }
                } catch (error) {
                    console.error('[MCPIntrospectionUI] Error removing tools during reset:', error);
                }
            }
        }
        
        // Auto-disable and unregister the Introspection MCP guide prompt
        if (window.DefaultPromptsService) {
            try {
                const promptId = 'introspection-mcp-guide';
                const isSelected = window.DefaultPromptsService.isDefaultPromptSelected(promptId);
                
                if (isSelected) {
                    // Remove it from selected IDs
                    const selectedIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
                    const index = selectedIds.indexOf(promptId);
                    if (index > -1) {
                        selectedIds.splice(index, 1);
                        window.DefaultPromptsService.setSelectedDefaultPromptIds(selectedIds);
                        
                        // Update system prompt to reflect the change
                        if (window.SystemPromptCoordinator) {
                            window.SystemPromptCoordinator.updateSystemPrompt(true);
                        }
                        
                        console.log('[MCPIntrospectionUI] Auto-disabled Introspection MCP guide prompt during reset');
                    }
                }
                
                // Unregister the prompt entirely so it's not visible
                window.DefaultPromptsService.unregisterPrompt('🔍 Introspection MCP Guide');
                console.log('[MCPIntrospectionUI] Unregistered Introspection MCP guide prompt during reset');
            } catch (error) {
                console.warn('[MCPIntrospectionUI] Could not auto-disable/unregister guide prompt during reset:', error);
            }
        }
        
        // Reset state variables
        isEnabled = false;
        updateUI();
        
        // Hide status if showing
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }
    
    // Public API
    return {
        init,
        enableIntrospectionMCP,
        disableIntrospectionMCP,
        getEnabled,
        resetState
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MCPIntrospectionUI.init());
} else {
    MCPIntrospectionUI.init();
}