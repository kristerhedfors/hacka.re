/**
 * MCP Share Link Service
 * Built-in MCP tools for creating share links with full feature parity to Share Link modal
 */

window.MCPShareLinkService = (function() {
    
    /**
     * Check what content is available for sharing
     * @returns {Object} Available content status for each shareable item
     */
    async function checkAvailableContent() {
        const available = {
            baseUrl: false,
            apiKey: false,
            model: false,
            conversation: false,
            promptLibrary: false,
            functionLibrary: false,
            mcpConnections: false,
            theme: false,
            welcomeMessage: false
        };
        
        // Check base URL
        const baseUrl = window.StorageService?.getBaseUrl();
        available.baseUrl = !!baseUrl;
        
        // Check API key
        const apiKey = window.StorageService?.getApiKey();
        available.apiKey = !!apiKey;
        
        // Check model
        const model = window.StorageService?.getModel();
        available.model = !!model;
        
        // Check conversation (messages)
        const messageCount = document.querySelectorAll('#chat-container .message').length;
        available.conversation = messageCount > 0;
        available.messageCount = messageCount;
        
        // Check prompt library (excluding MCP prompts)
        let enabledUserPrompts = 0;
        let enabledDefaultPrompts = 0;
        
        if (window.PromptsService) {
            const selectedPrompts = window.PromptsService.getSelectedPrompts();
            const userPrompts = selectedPrompts.filter(prompt => !prompt.isMcpPrompt);
            enabledUserPrompts = userPrompts.length;
        }
        
        if (window.DefaultPromptsService) {
            const selectedDefaultPrompts = window.DefaultPromptsService.getSelectedDefaultPrompts();
            const mcpPromptIds = ['shodan-integration-guide', 'github-integration-guide', 'gmail-integration-guide'];
            const nonMcpDefaultPrompts = selectedDefaultPrompts.filter(prompt => !mcpPromptIds.includes(prompt.id));
            enabledDefaultPrompts = nonMcpDefaultPrompts.length;
        }
        
        available.promptLibrary = (enabledUserPrompts + enabledDefaultPrompts) > 0;
        available.promptCount = enabledUserPrompts + enabledDefaultPrompts;
        
        // Check function library (excluding MCP functions)
        let enabledUserFunctions = 0;
        let enabledDefaultFunctions = 0;
        
        if (window.FunctionToolsService) {
            const jsFunctions = window.FunctionToolsService.getJsFunctions();
            const enabledFunctions = window.FunctionToolsService.getEnabledFunctionNames();
            const functionCollections = window.FunctionToolsService.getFunctionCollections();
            const allCollections = window.FunctionToolsService.getAllFunctionCollections();
            
            const mcpCollectionIds = [];
            Object.values(allCollections).forEach(collection => {
                const isMcpCollection = collection.metadata.source === 'mcp' || 
                                      collection.metadata.source === 'mcp-service' ||
                                      collection.id.startsWith('mcp_');
                if (isMcpCollection) {
                    mcpCollectionIds.push(collection.id);
                }
            });
            
            const defaultFunctionNames = [];
            if (window.DefaultFunctionsService) {
                const collections = window.DefaultFunctionsService.getDefaultFunctionCollections();
                collections.forEach(collection => {
                    collection.functions.forEach(func => {
                        defaultFunctionNames.push(func.name);
                    });
                });
            }
            
            for (const funcName in jsFunctions) {
                const collectionId = functionCollections[funcName];
                const isDefault = defaultFunctionNames.includes(funcName);
                const isMcp = collectionId && mcpCollectionIds.includes(collectionId);
                
                if (!isDefault && !isMcp && enabledFunctions.includes(funcName)) {
                    enabledUserFunctions++;
                }
            }
            
            if (window.DefaultFunctionsService) {
                const collections = window.DefaultFunctionsService.getDefaultFunctionCollections();
                collections.forEach(collection => {
                    collection.functions.forEach(func => {
                        const functionId = `${collection.id}:${func.name}`;
                        if (window.DefaultFunctionsService.isIndividualFunctionSelected(functionId)) {
                            enabledDefaultFunctions++;
                        }
                    });
                });
            }
        }
        
        available.functionLibrary = (enabledUserFunctions + enabledDefaultFunctions) > 0;
        available.functionCount = enabledUserFunctions + enabledDefaultFunctions;
        
        // Check MCP connections
        try {
            const connections = [];
            
            if (window.CoreStorageService) {
                const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
                if (githubToken) connections.push('GitHub');
                
                const gmailAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
                if (gmailAuth) connections.push('Gmail');
                
                const shodanApiKey = await window.CoreStorageService.getValue('mcp_shodan_api_key');
                if (shodanApiKey) connections.push('Shodan');
            }
            
            available.mcpConnections = connections.length > 0;
            available.mcpConnectionTypes = connections;
        } catch (error) {
            available.mcpConnections = false;
        }
        
        // Check theme
        let currentTheme = 'light';
        if (window.ThemeService?.getThemeMode) {
            currentTheme = window.ThemeService.getThemeMode();
        }
        available.theme = currentTheme !== 'light';
        available.currentTheme = currentTheme;
        
        // Welcome message is always available (can be custom)
        available.welcomeMessage = true;
        
        return available;
    }
    
    /**
     * Generate a share link with selected content
     * @param {Object} options - What to include in the share link
     * @returns {Object} Result with link and QR code
     */
    async function generateShareLink(options = {}) {
        try {
            // Default to including everything that's available if not specified
            const availableContent = await checkAvailableContent();
            
            // Generate a secure password if not provided
            const password = options.password || window.ShareService.generateStrongPassword();
            
            // Get current data
            const apiKey = window.StorageService?.getApiKey();
            const baseUrl = window.StorageService?.getBaseUrl();
            const model = window.StorageService?.getModel();
            const messages = window.ChatManager?.getMessages ? window.ChatManager.getMessages() : [];
            
            // Build share options
            const shareOptions = {
                password: password,
                baseUrl: baseUrl,
                apiKey: apiKey,
                model: model,
                messages: messages,
                messageCount: options.messageCount || messages.length,
                welcomeMessage: options.welcomeMessage || (options.includeWelcomeMessage ? 'Welcome to hacka.re! Start a conversation with AI models.' : null),
                includeBaseUrl: options.includeBaseUrl !== undefined ? options.includeBaseUrl : availableContent.baseUrl,
                includeApiKey: options.includeApiKey !== undefined ? options.includeApiKey : availableContent.apiKey,
                includeModel: options.includeModel !== undefined ? options.includeModel : availableContent.model,
                includeConversation: options.includeConversation !== undefined ? options.includeConversation : availableContent.conversation,
                includePromptLibrary: options.includePromptLibrary !== undefined ? options.includePromptLibrary : availableContent.promptLibrary,
                includeFunctionLibrary: options.includeFunctionLibrary !== undefined ? options.includeFunctionLibrary : availableContent.functionLibrary,
                includeMcpConnections: options.includeMcpConnections !== undefined ? options.includeMcpConnections : availableContent.mcpConnections,
                includeTheme: options.includeTheme !== undefined ? options.includeTheme : availableContent.theme
            };
            
            // Collect theme if needed
            if (shareOptions.includeTheme) {
                shareOptions.theme = window.ThemeService?.getThemeMode ? window.ThemeService.getThemeMode() : 'light';
            }
            
            // Collect MCP connections if needed
            if (shareOptions.includeMcpConnections) {
                const mcpConnections = {};
                
                try {
                    const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
                    if (githubToken) {
                        mcpConnections.github = typeof githubToken === 'string' ? githubToken : githubToken.token;
                    }
                    
                    const shodanApiKey = await window.CoreStorageService.getValue('mcp_shodan_api_key');
                    if (shodanApiKey) {
                        mcpConnections.shodan = shodanApiKey;
                    }
                    
                    const gmailAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
                    if (gmailAuth) {
                        mcpConnections.gmail = gmailAuth;
                    }
                } catch (error) {
                    console.warn('Error collecting MCP connections:', error);
                }
                
                if (Object.keys(mcpConnections).length > 0) {
                    shareOptions.mcpConnections = mcpConnections;
                }
            }
            
            // Generate the share link
            const shareLink = await window.ShareService.createShareLink(shareOptions);
            
            // Return just the essential information
            return {
                success: true,
                link: shareLink,
                password: password
            };
        } catch (error) {
            console.error('Error generating share link:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate share link'
            };
        }
    }
    
    /**
     * Get MCP tool definitions for Share Link functionality
     */
    function getToolDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'share_link_check_available',
                    description: 'Check what content is available to share (API keys, conversations, settings, etc.)',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            },
            {
                type: 'function', 
                function: {
                    name: 'share_link_generate',
                    description: 'Generate a secure share link with selected content. Returns the encrypted share link and password.',
                    parameters: {
                        type: 'object',
                        properties: {
                            includeBaseUrl: {
                                type: 'boolean',
                                description: 'Include the API base URL'
                            },
                            includeApiKey: {
                                type: 'boolean',
                                description: 'Include the API key (encrypted)'
                            },
                            includeModel: {
                                type: 'boolean',
                                description: 'Include the selected model'
                            },
                            includeConversation: {
                                type: 'boolean',
                                description: 'Include the current conversation'
                            },
                            messageCount: {
                                type: 'number',
                                description: 'Number of recent messages to include (default: all)',
                                minimum: 1
                            },
                            includePromptLibrary: {
                                type: 'boolean',
                                description: 'Include user and default prompts'
                            },
                            includeFunctionLibrary: {
                                type: 'boolean',
                                description: 'Include user and default functions'
                            },
                            includeMcpConnections: {
                                type: 'boolean',
                                description: 'Include MCP connection credentials'
                            },
                            includeTheme: {
                                type: 'boolean',
                                description: 'Include the current theme'
                            },
                            includeWelcomeMessage: {
                                type: 'boolean',
                                description: 'Include a welcome message'
                            },
                            welcomeMessage: {
                                type: 'string',
                                description: 'Custom welcome message (optional)'
                            },
                            password: {
                                type: 'string',
                                description: 'Custom password for encryption (optional, auto-generated if not provided)'
                            }
                        },
                        required: []
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'share_link_generate_all',
                    description: 'Generate a share link with all available content. Returns the encrypted share link and password.',
                    parameters: {
                        type: 'object',
                        properties: {
                            password: {
                                type: 'string',
                                description: 'Custom password for encryption (optional)'
                            },
                            welcomeMessage: {
                                type: 'string',
                                description: 'Custom welcome message (optional)'
                            }
                        },
                        required: []
                    }
                }
            }
        ];
    }
    
    /**
     * Handle tool calls from MCP clients
     */
    async function handleToolCall(toolName, args = {}) {
        switch (toolName) {
            case 'share_link_check_available':
                return await checkAvailableContent();
                
            case 'share_link_generate':
                return await generateShareLink(args);
                
            case 'share_link_generate_all':
                // First check what's available
                const available = await checkAvailableContent();
                
                // Include everything that's available
                return await generateShareLink({
                    includeBaseUrl: available.baseUrl,
                    includeApiKey: available.apiKey,
                    includeModel: available.model,
                    includeConversation: available.conversation,
                    includePromptLibrary: available.promptLibrary,
                    includeFunctionLibrary: available.functionLibrary,
                    includeMcpConnections: available.mcpConnections,
                    includeTheme: available.theme,
                    includeWelcomeMessage: true,
                    password: args.password,
                    welcomeMessage: args.welcomeMessage
                });
                
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    
    /**
     * Register Share Link MCP tools with the MCP system
     */
    function registerTools() {
        // Register with MCP tool registry if available
        if (window.MCPToolRegistry?.registerBuiltInTools) {
            const tools = getToolDefinitions();
            window.MCPToolRegistry.registerBuiltInTools('share-link', tools, handleToolCall);
            console.log('[MCPShareLinkService] Registered Share Link MCP tools');
        }
    }
    
    /**
     * Initialize the service
     */
    function init() {
        // Register tools when MCP system is ready
        if (window.MCPToolRegistry) {
            registerTools();
        } else {
            // Wait for MCP system to be ready
            document.addEventListener('DOMContentLoaded', () => {
                if (window.MCPToolRegistry) {
                    registerTools();
                }
            });
        }
    }
    
    // Public API
    return {
        init,
        checkAvailableContent,
        generateShareLink,
        getToolDefinitions,
        handleToolCall,
        registerTools
    };
})();

// Initialize the service
window.MCPShareLinkService.init();