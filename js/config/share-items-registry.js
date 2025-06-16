import { getShareItemRegistry } from '../services/share-item-registry.js';
import { 
    collectMcpConnectionsData, 
    applyMcpConnectionsData, 
    estimateMcpConnectionsSize 
} from '../components/share/mcp-connections-share-item.js';

/**
 * Register all existing share items with the new registry system
 */
export function registerExistingShareItems() {
    const registry = getShareItemRegistry();
    
    // Register Base URL share item
    registry.register('baseUrl', {
        checkboxId: 'share-base-url',
        label: 'Include Base URL',
        priority: 10,
        isSensitive: false,
        defaultChecked: false,
        collectData: async () => {
            const baseUrlElement = document.getElementById('base-url');
            return baseUrlElement ? baseUrlElement.value : null;
        },
        applyData: async (data) => {
            if (data) {
                const baseUrlElement = document.getElementById('base-url');
                if (baseUrlElement) {
                    baseUrlElement.value = data;
                    // Trigger change event to update UI
                    baseUrlElement.dispatchEvent(new Event('change'));
                }
            }
        },
        estimateSize: async () => {
            const baseUrlElement = document.getElementById('base-url');
            const baseUrl = baseUrlElement ? baseUrlElement.value : '';
            return baseUrl.length + 15; // Add JSON structure overhead
        }
    });

    // Register API Key share item
    registry.register('apiKey', {
        checkboxId: 'share-api-key',
        label: 'Include API Key',
        priority: 20,
        isSensitive: true,
        defaultChecked: true,
        collectData: async () => {
            const apiKeyElement = document.getElementById('api-key');
            return apiKeyElement ? apiKeyElement.value : null;
        },
        applyData: async (data) => {
            if (data) {
                const apiKeyElement = document.getElementById('api-key');
                if (apiKeyElement) {
                    apiKeyElement.value = data;
                    // Trigger change event to update UI
                    apiKeyElement.dispatchEvent(new Event('change'));
                }
            }
        },
        estimateSize: async () => {
            const apiKeyElement = document.getElementById('api-key');
            const apiKey = apiKeyElement ? apiKeyElement.value : '';
            return apiKey.length + 15; // Add JSON structure overhead
        }
    });

    // Register Model share item
    registry.register('model', {
        checkboxId: 'share-model',
        label: 'Include Model',
        priority: 30,
        isSensitive: false,
        defaultChecked: false,
        collectData: async () => {
            const modelElement = document.getElementById('model');
            return modelElement ? modelElement.value : null;
        },
        applyData: async (data) => {
            if (data) {
                const modelElement = document.getElementById('model');
                if (modelElement) {
                    modelElement.value = data;
                    // Trigger change event to update UI
                    modelElement.dispatchEvent(new Event('change'));
                }
            }
        },
        estimateSize: async () => {
            const modelElement = document.getElementById('model');
            const model = modelElement ? modelElement.value : '';
            return model.length + 15; // Add JSON structure overhead
        }
    });

    // Register Prompt Library share item
    registry.register('promptLibrary', {
        checkboxId: 'share-prompt-library',
        label: 'Include Prompt Library',
        priority: 40,
        isSensitive: false,
        defaultChecked: false,
        collectData: async () => {
            try {
                // Get prompt library data from PromptsService
                if (window.PromptsService) {
                    const prompts = await window.PromptsService.getAllPrompts();
                    return prompts.length > 0 ? prompts : null;
                }
                return null;
            } catch (error) {
                console.error('Failed to collect prompt library data:', error);
                return null;
            }
        },
        applyData: async (data) => {
            if (data && Array.isArray(data)) {
                try {
                    // Apply prompts using PromptsService
                    if (window.PromptsService) {
                        await window.PromptsService.importPrompts(data);
                        console.log('Applied shared prompt library');
                    }
                } catch (error) {
                    console.error('Failed to apply prompt library data:', error);
                    throw error;
                }
            }
        },
        estimateSize: async () => {
            try {
                if (window.PromptsService) {
                    const prompts = await window.PromptsService.getAllPrompts();
                    return prompts.length > 0 ? JSON.stringify(prompts).length + 20 : 0;
                }
                return 0;
            } catch (error) {
                console.error('Failed to estimate prompt library size:', error);
                return 0;
            }
        }
    });

    // Register Function Library share item
    registry.register('functionLibrary', {
        checkboxId: 'share-function-library',
        label: 'Include Function Library',
        priority: 50,
        isSensitive: false,
        defaultChecked: false,
        collectData: async () => {
            try {
                // Get function library data from FunctionToolsService
                if (window.FunctionToolsService) {
                    const functions = await window.FunctionToolsService.getAllFunctions();
                    return functions.length > 0 ? functions : null;
                }
                return null;
            } catch (error) {
                console.error('Failed to collect function library data:', error);
                return null;
            }
        },
        applyData: async (data) => {
            if (data && Array.isArray(data)) {
                try {
                    // Apply functions using FunctionToolsService
                    if (window.FunctionToolsService) {
                        await window.FunctionToolsService.importFunctions(data);
                        console.log('Applied shared function library');
                    }
                } catch (error) {
                    console.error('Failed to apply function library data:', error);
                    throw error;
                }
            }
        },
        estimateSize: async () => {
            try {
                if (window.FunctionToolsService) {
                    const functions = await window.FunctionToolsService.getAllFunctions();
                    return functions.length > 0 ? JSON.stringify(functions).length + 20 : 0;
                }
                return 0;
            } catch (error) {
                console.error('Failed to estimate function library size:', error);
                return 0;
            }
        }
    });

    // Register Conversation share item
    registry.register('conversation', {
        checkboxId: 'share-conversation',
        label: 'Include Conversation',
        priority: 70,
        isSensitive: false,
        defaultChecked: false,
        collectData: async () => {
            try {
                // Get conversation data from ChatManager
                if (window.ChatManager) {
                    const messages = window.ChatManager.getMessages();
                    if (messages && messages.length > 0) {
                        // Get message count from UI
                        const messageCountElement = document.getElementById('message-history-count');
                        const messageCount = messageCountElement ? parseInt(messageCountElement.value) || 10 : 10;
                        
                        // Include only the specified number of most recent messages
                        const startIndex = Math.max(0, messages.length - messageCount);
                        return messages.slice(startIndex);
                    }
                }
                return null;
            } catch (error) {
                console.error('Failed to collect conversation data:', error);
                return null;
            }
        },
        applyData: async (data) => {
            if (data && Array.isArray(data)) {
                try {
                    // Apply conversation using ChatManager
                    if (window.ChatManager) {
                        await window.ChatManager.setMessages(data);
                        console.log('Applied shared conversation');
                    }
                } catch (error) {
                    console.error('Failed to apply conversation data:', error);
                    throw error;
                }
            }
        },
        estimateSize: async () => {
            try {
                if (window.ChatManager) {
                    const messages = window.ChatManager.getMessages();
                    if (messages && messages.length > 0) {
                        const messageCountElement = document.getElementById('message-history-count');
                        const messageCount = messageCountElement ? parseInt(messageCountElement.value) || 10 : 10;
                        
                        const startIndex = Math.max(0, messages.length - messageCount);
                        const selectedMessages = messages.slice(startIndex);
                        return JSON.stringify(selectedMessages).length + 20;
                    }
                }
                return 0;
            } catch (error) {
                console.error('Failed to estimate conversation size:', error);
                return 0;
            }
        }
    });

    // Register MCP Connections share item
    registry.register('mcpConnections', {
        checkboxId: 'share-mcp-connections',
        label: 'Include MCP Connections',
        priority: 60,
        isSensitive: true,
        defaultChecked: false,
        collectData: collectMcpConnectionsData,
        applyData: applyMcpConnectionsData,
        estimateSize: estimateMcpConnectionsSize
    });

    console.log('Registered all existing share items including MCP connections');
    return registry;
}

/**
 * Initialize the registry with existing items
 */
export function initializeShareItemsRegistry() {
    // Register items when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerExistingShareItems);
    } else {
        registerExistingShareItems();
    }
}