/**
 * MCP Share Link UI Handler
 * Manages the UI for the built-in Share Link MCP tool
 */

window.MCPShareLinkUI = (function() {
    let isEnabled = false;
    let statusElement = null;
    let enableButton = null;
    
    /**
     * Initialize the Share Link MCP UI
     */
    async function init() {
        // Get UI elements
        enableButton = document.getElementById('mcp-share-link-enable');
        statusElement = document.getElementById('mcp-share-link-status');
        
        if (!enableButton) {
            console.warn('[MCPShareLinkUI] Enable button not found');
            return;
        }
        
        // Load saved state
        await loadState();
        
        // Setup event listeners
        enableButton.addEventListener('click', handleToggle);
        
        // Initialize the service if not already done
        if (window.MCPShareLinkService && !window.MCPShareLinkService.initialized) {
            window.MCPShareLinkService.init();
        }
        
        console.log('[MCPShareLinkUI] Initialized');
    }
    
    /**
     * Load saved enabled state from encrypted storage
     */
    async function loadState() {
        try {
            if (window.CoreStorageService) {
                let savedState = await window.CoreStorageService.getValue('mcp_share_link_enabled');
                
                // Migration: check if there's an old localStorage value to migrate
                if (savedState === null) {
                    const oldState = localStorage.getItem('mcp_share_link_enabled');
                    if (oldState !== null) {
                        console.log('[MCPShareLinkUI] Migrating from localStorage to encrypted storage');
                        savedState = oldState;
                        await window.CoreStorageService.setValue('mcp_share_link_enabled', savedState);
                        // Clean up old localStorage entry
                        localStorage.removeItem('mcp_share_link_enabled');
                    }
                }
                
                isEnabled = savedState === 'true';
                updateUI();
                
                if (isEnabled) {
                    enableShareLinkMCP();
                }
            } else {
                console.warn('[MCPShareLinkUI] CoreStorageService not available, using fallback');
                // Fallback to localStorage for backward compatibility
                const savedState = localStorage.getItem('mcp_share_link_enabled');
                isEnabled = savedState === 'true';
                updateUI();
                
                if (isEnabled) {
                    enableShareLinkMCP();
                }
            }
        } catch (error) {
            console.error('[MCPShareLinkUI] Error loading state:', error);
        }
    }
    
    /**
     * Save enabled state to encrypted storage
     */
    async function saveState() {
        try {
            if (window.CoreStorageService) {
                await window.CoreStorageService.setValue('mcp_share_link_enabled', isEnabled.toString());
                console.log('[MCPShareLinkUI] State saved to encrypted storage:', isEnabled);
            } else {
                console.warn('[MCPShareLinkUI] CoreStorageService not available, using fallback');
                // Fallback to localStorage for backward compatibility
                localStorage.setItem('mcp_share_link_enabled', isEnabled.toString());
            }
        } catch (error) {
            console.error('[MCPShareLinkUI] Error saving state:', error);
        }
    }
    
    /**
     * Handle enable/disable toggle
     */
    async function handleToggle() {
        if (isEnabled) {
            await disableShareLinkMCP();
        } else {
            await enableShareLinkMCP();
        }
    }
    
    /**
     * Enable the Share Link MCP
     */
    async function enableShareLinkMCP() {
        try {
            // Register the tools with MCP system
            if (window.MCPShareLinkService) {
                window.MCPShareLinkService.registerTools();
                
                // Register with function tools service for API integration
                if (window.FunctionToolsService) {
                    const tools = window.MCPShareLinkService.getToolDefinitions();
                    
                    tools.forEach(tool => {
                        // Create a function wrapper for each tool
                        const toolName = tool.function.name;
                        const toolDescription = tool.function.description;
                        const functionCode = `
/**
 * ${toolDescription}
 * @tool
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool result
 */
async function ${toolName}(args = {}) {
    return await window.MCPShareLinkService.handleToolCall("${toolName}", args);
}`;
                        
                        // Register as a function in the function tools service
                        const functionSpec = {
                            name: toolName,
                            code: functionCode,
                            enabled: true,
                            metadata: {
                                source: 'mcp-service',
                                provider: 'share-link',
                                description: toolDescription,
                                inputSchema: tool.function.parameters
                            }
                        };
                        
                        // Add function with collection metadata
                        const collectionMetadata = {
                            name: 'Share Link MCP',
                            description: 'Built-in MCP tools for creating secure share links',
                            source: 'mcp-service',
                            provider: 'share-link'
                        };
                        
                        // Use addJsFunction which includes collection support
                        window.FunctionToolsService.addJsFunction(
                            toolName,
                            functionCode,
                            tool,
                            'mcp_share_link',
                            collectionMetadata
                        );
                        
                        // Enable the function
                        window.FunctionToolsService.enableJsFunction(toolName);
                    });
                    
                    console.log('[MCPShareLinkUI] Registered tools with FunctionToolsService');
                }
                
                isEnabled = true;
                await saveState();
                updateUI();
                showStatus('Share Link MCP enabled - Tools are now available', 'success');
            }
        } catch (error) {
            console.error('[MCPShareLinkUI] Error enabling Share Link MCP:', error);
            showStatus('Failed to enable Share Link MCP: ' + error.message, 'error');
        }
    }
    
    /**
     * Disable the Share Link MCP
     */
    async function disableShareLinkMCP() {
        try {
            // Remove from function tools service
            if (window.FunctionToolsService && window.MCPShareLinkService) {
                const tools = window.MCPShareLinkService.getToolDefinitions();
                
                // Remove each function (this will also remove the collection)
                tools.forEach(tool => {
                    window.FunctionToolsService.removeJsFunction(tool.function.name);
                });
                
                console.log('[MCPShareLinkUI] Removed tools from FunctionToolsService');
            }
            
            isEnabled = false;
            await saveState();
            updateUI();
            showStatus('Share Link MCP disabled', 'info');
        } catch (error) {
            console.error('[MCPShareLinkUI] Error disabling Share Link MCP:', error);
            showStatus('Failed to disable Share Link MCP: ' + error.message, 'error');
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
     * Check if Share Link MCP is enabled
     * @returns {boolean}
     */
    function getEnabled() {
        return isEnabled;
    }
    
    /**
     * Reset the Share Link MCP state (called when namespace/settings are cleared)
     */
    function resetState() {
        console.log('[MCPShareLinkUI] Resetting state due to namespace clear');
        
        // Disable without calling the storage operations (since storage is already cleared)
        if (isEnabled) {
            // Remove from function tools service if currently enabled
            if (window.FunctionToolsService && window.MCPShareLinkService) {
                try {
                    const tools = window.MCPShareLinkService.getToolDefinitions();
                    tools.forEach(tool => {
                        window.FunctionToolsService.removeJsFunction(tool.function.name);
                    });
                    console.log('[MCPShareLinkUI] Removed tools from FunctionToolsService');
                } catch (error) {
                    console.error('[MCPShareLinkUI] Error removing tools during reset:', error);
                }
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
        enableShareLinkMCP,
        disableShareLinkMCP,
        getEnabled,
        resetState
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MCPShareLinkUI.init());
} else {
    MCPShareLinkUI.init();
}