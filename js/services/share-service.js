/**
 * Share Service
 * Handles encryption, decryption, and sharing of API keys, prompts, and conversation data
 * 
 * This service provides shareable links for API keys, prompts, and conversation data.
 * It uses the CryptoUtils for encryption/decryption and LinkSharingService for link handling.
 * 
 * The encryption uses public/private key cryptography with password-based key derivation
 * for improved security. The encryption key is derived from a user-provided password
 * rather than being included in the URL.
 */

window.ShareService = (function() {
    /**
     * Generate a strong random password
     * 12 characters long with alphanumeric characters (uppercase, lowercase, and numbers)
     * @returns {string} Random password
     */
    function generateStrongPassword() {
        const length = 12; // Fixed length of 12 characters
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // 62 characters (26+26+10)
        let password = "";
        
        // Get cryptographically strong random values
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
        
        // Convert to password characters
        for (let i = 0; i < length; i++) {
            password += charset[randomValues[i] % charset.length];
        }
        
        return password;
    }
    
    /**
     * Core shareable link creation function
     * Can create links from minimal (just base URL) to comprehensive (all data)
     * 
     * @param {Object} options - Options for what to include in the share
     * @param {string} [options.password] - Password for encryption. If not provided, returns base URL only
     * @param {string} [options.baseUrl] - The base URL (defaults to window.location)
     * @param {string} [options.apiKey] - The API key to share
     * @param {string} [options.systemPrompt] - The system prompt to share
     * @param {string} [options.model] - The model ID to share
     * @param {Array} [options.messages] - The conversation messages to share
     * @param {number} [options.messageCount] - Number of recent messages to include (default: all)
     * @param {string} [options.welcomeMessage] - Custom welcome message for the share
     * @param {Object} [options.mcpConnections] - MCP connections to share
     * @param {Object} [options.functions] - Functions to share
     * @param {Array} [options.prompts] - Prompts to share
     * @param {boolean} [options.includeBaseUrl] - Whether to include the base URL
     * @param {boolean} [options.includeApiKey] - Whether to include the API key
     * @param {boolean} [options.includeSystemPrompt] - Whether to include the system prompt
     * @param {boolean} [options.includeModel] - Whether to include the model
     * @param {boolean} [options.includeConversation] - Whether to include conversation
     * @param {boolean} [options.includeWelcomeMessage] - Whether to include welcome message
     * @param {boolean} [options.includeMcpConnections] - Whether to include MCP connections
     * @param {boolean} [options.includeFunctionLibrary] - Whether to include function library
     * @param {boolean} [options.includePromptLibrary] - Whether to include prompt library
     * @returns {Promise<string>} Shareable URL
     */
    async function createShareLink(options = {}) {
        console.log('🔗 SHARE LINK CREATION STARTED 🔗');
        console.log('📋 ShareService: Input options:', JSON.stringify(options, null, 2));
        
        // If no password provided, return just the hacka.re app URL
        if (!options.password) {
            // Always return the hacka.re app URL, NOT the API endpoint URL
            const hackareUrl = window.location.href.split('#')[0];
            console.log('🔗 ShareService: No password provided, returning hacka.re app URL:', hackareUrl);
            return hackareUrl;
        }
        
        const payload = {};
        const itemsIncluded = [];
        
        console.log('🧪 ShareService: Building payload from options...');
        
        // Process each potential inclusion
        if (options.includeBaseUrl && options.baseUrl) {
            // Detect if this is a known provider or custom URL
            const knownProviders = {
                'https://api.openai.com/v1': 'openai',
                'https://api.groq.com/openai/v1': 'groq',
                'https://api.anthropic.com/v1': 'anthropic',
                'http://localhost:11434/v1': 'ollama',
                'http://localhost:8080/v1': 'llamafile',
                'http://localhost:4891/v1': 'gpt4all',
                'http://localhost:1234/v1': 'lmstudio',
                'https://api.openrouter.ai/api/v1': 'openrouter',
                'https://api.berget.ai/v1': 'berget',
                'https://openrouter.ai/api/v1': 'openrouter'
            };
            
            const provider = knownProviders[options.baseUrl];
            if (provider) {
                // For known providers, just share the provider name
                payload.provider = provider;
                itemsIncluded.push(`✅ PROVIDER (${provider})`);
            } else {
                // For custom URLs, share the actual URL
                payload.baseUrl = options.baseUrl;
                itemsIncluded.push(`✅ CUSTOM BASE URL (${options.baseUrl.length} chars)`);
            }
        }
        
        if (options.includeApiKey && options.apiKey) {
            payload.apiKey = options.apiKey;
            itemsIncluded.push(`✅ API KEY (${options.apiKey.length} chars)`);
        }
        
        if (options.includeSystemPrompt && options.systemPrompt) {
            payload.systemPrompt = options.systemPrompt;
            itemsIncluded.push(`✅ SYSTEM PROMPT (${options.systemPrompt.length} chars)`);
        }
        
        if (options.includeModel && options.model) {
            payload.model = options.model;
            itemsIncluded.push(`✅ MODEL (${options.model})`);
        }
        
        if (options.includeConversation) {
            // Include conversation even if empty - this ensures we generate a proper share link
            if (options.messages && options.messages.length > 0) {
                const messageCount = options.messageCount || options.messages.length;
                const startIndex = Math.max(0, options.messages.length - messageCount);
                payload.messages = options.messages.slice(startIndex);
                itemsIncluded.push(`✅ CONVERSATION (${payload.messages.length} messages)`);
            } else {
                // Include empty messages array to indicate conversation sharing is enabled
                payload.messages = [];
                itemsIncluded.push(`✅ CONVERSATION (ready to receive messages)`);
            }
        }
        
        if (options.includeWelcomeMessage && options.welcomeMessage && options.welcomeMessage.trim()) {
            payload.welcomeMessage = options.welcomeMessage;
            itemsIncluded.push(`✅ WELCOME MESSAGE (${options.welcomeMessage.length} chars)`);
        }
        
        // Handle theme
        if (options.includeTheme && options.theme) {
            payload.theme = options.theme;
            itemsIncluded.push(`✅ THEME (${options.theme})`);
        }
        
        // Handle MCP connections
        if (options.includeMcpConnections) {
            let mcpConnections = options.mcpConnections;
            
            // If not provided, try to collect them
            if (!mcpConnections) {
                console.log('🔌 ShareService: Collecting MCP connections from storage...');
                mcpConnections = {};
                
                try {
                    const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
                    if (githubToken) {
                        // FIX TOKEN: Ensure we save the token as a string, not an object
                        let tokenToSave = githubToken;
                        if (typeof githubToken === 'object' && githubToken !== null && githubToken.token) {
                            tokenToSave = githubToken.token;
                        }
                        
                        mcpConnections.github = tokenToSave;
                    } else {
                    }
                } catch (error) {
                    console.warn('❌ ShareService: Failed to collect MCP connections from storage:', error);
                }
            } else {
                console.log('🔌 ShareService: Using provided MCP connections:', Object.keys(mcpConnections));
            }
            
            if (Object.keys(mcpConnections).length > 0) {
                payload.mcpConnections = mcpConnections;
                const connectionTypes = Object.keys(mcpConnections);
                itemsIncluded.push(`✅ MCP CONNECTIONS (${connectionTypes.join(', ')})`);
            }
        }
        
        // Handle function library
        if (options.includeFunctionLibrary) {
            let functions = options.functions;
            let mcpCollectionIds = []; // Define at the outer scope
            
            // If not provided, try to collect them (excluding MCP functions)
            if (!functions && window.FunctionToolsService) {
                const allFunctions = window.FunctionToolsService.getJsFunctions();
                const allCollections = window.FunctionToolsService.getAllFunctionCollections();
                const functionCollections = window.FunctionToolsService.getFunctionCollections();
                
                // Identify MCP collections
                Object.values(allCollections).forEach(collection => {
                    const isMcpCollection = collection.metadata.source === 'mcp' || 
                                          collection.metadata.source === 'mcp-service' ||
                                          collection.id.startsWith('mcp_');
                    if (isMcpCollection) {
                        mcpCollectionIds.push(collection.id);
                        console.log('🚫 ShareService: Identified MCP collection:', collection.id, collection.metadata.name);
                    }
                });
                
                console.log('🔍 ShareService: Total functions before filtering:', Object.keys(allFunctions).length);
                console.log('🔍 ShareService: MCP collections to exclude:', mcpCollectionIds);
                
                // Filter out MCP functions
                functions = {};
                const excludedFunctions = [];
                Object.entries(allFunctions).forEach(([funcName, funcSpec]) => {
                    const collectionId = functionCollections[funcName];
                    // Only include if not in an MCP collection
                    if (!collectionId || !mcpCollectionIds.includes(collectionId)) {
                        functions[funcName] = funcSpec;
                    } else {
                        excludedFunctions.push(`${funcName} (collection: ${collectionId})`);
                    }
                });
                
                console.log('🔍 ShareService: Functions after filtering:', Object.keys(functions).length);
                console.log('🚫 ShareService: Excluded MCP functions:', excludedFunctions);
            }
            
            // Include functions if any exist
            if (functions && Object.keys(functions).length > 0) {
                payload.functions = functions;
                // No need for enabledFunctions - all shared functions are enabled by default
                
                // Include collection information to preserve function organization
                if (window.FunctionToolsService) {
                    const functionCollections = window.FunctionToolsService.getFunctionCollections();
                    const allCollections = window.FunctionToolsService.getAllFunctionCollections();
                    
                    // Build collection metadata for non-MCP functions
                    const relevantCollections = {};
                    const relevantMetadata = {};
                    
                    Object.keys(functions).forEach(funcName => {
                        const collectionId = functionCollections[funcName];
                        if (collectionId && !mcpCollectionIds.includes(collectionId)) {
                            relevantCollections[funcName] = collectionId;
                            
                            // Add collection metadata if not already added
                            if (!relevantMetadata[collectionId] && allCollections[collectionId]) {
                                relevantMetadata[collectionId] = allCollections[collectionId].metadata;
                            }
                        }
                    });
                    
                    // Add collection data to payload
                    if (Object.keys(relevantCollections).length > 0) {
                        payload.functionCollections = relevantCollections;
                        payload.functionCollectionMetadata = relevantMetadata;
                        const uniqueCollections = new Set(Object.values(relevantCollections)).size;
                        console.log(`🔍 ShareService: Including collection info for ${uniqueCollections} collections`);
                    }
                }
                
                itemsIncluded.push(`✅ FUNCTION LIBRARY (${Object.keys(functions).length} functions)`);
            }
            
            // Include default function selections even if no user functions exist
            if (window.DefaultFunctionsService) {
                const selectedDefaultFunctionIds = window.DefaultFunctionsService.getSelectedIndividualFunctionIds();
                const selectedDefaultCollectionIds = window.DefaultFunctionsService.getSelectedDefaultFunctionIds();
                
                if (selectedDefaultFunctionIds && selectedDefaultFunctionIds.length > 0) {
                    payload.selectedDefaultFunctionIds = selectedDefaultFunctionIds;
                    itemsIncluded.push(`✅ DEFAULT FUNCTIONS (${selectedDefaultFunctionIds.length} selected)`);
                }
                
                if (selectedDefaultCollectionIds && selectedDefaultCollectionIds.length > 0) {
                    payload.selectedDefaultFunctionCollectionIds = selectedDefaultCollectionIds;
                    itemsIncluded.push(`✅ DEFAULT FUNCTION COLLECTIONS (${selectedDefaultCollectionIds.length} selected)`);
                }
            }
        }
        
        // Handle prompt library
        if (options.includePromptLibrary) {
            let prompts = options.prompts;
            
            // If not provided, try to collect them (excluding MCP prompts)
            if (!prompts && window.PromptsService) {
                const allPrompts = window.PromptsService.getPrompts();
                // Filter out MCP prompts - they should not be shared
                prompts = allPrompts.filter(prompt => !prompt.isMcpPrompt);
            }
            
            // Include prompts if any exist
            if (prompts && prompts.length > 0) {
                payload.prompts = prompts;
                // No need for selectedPromptIds - all shared prompts are selected by default
                itemsIncluded.push(`✅ PROMPT LIBRARY (${prompts.length} prompts)`);
            }
            
            // Include default prompt selections even if no user prompts exist
            if (window.DefaultPromptsService) {
                const selectedDefaultPromptIds = window.DefaultPromptsService.getSelectedDefaultPromptIds();
                // Filter out MCP prompt IDs from selected default prompts
                const mcpPromptIds = ['shodan-integration-guide', 'github-integration-guide', 'gmail-integration-guide'];
                const filteredDefaultPromptIds = selectedDefaultPromptIds.filter(id => !mcpPromptIds.includes(id));
                
                if (filteredDefaultPromptIds && filteredDefaultPromptIds.length > 0) {
                    payload.selectedDefaultPromptIds = filteredDefaultPromptIds;
                    itemsIncluded.push(`✅ DEFAULT PROMPTS (${filteredDefaultPromptIds.length} selected)`);
                }
            }
        }
        
        // Handle RAG settings
        if (options.includeRagSettings) {
            // Include RAG enabled state if defined
            if (options.ragEnabled !== undefined) {
                payload.ragEnabled = options.ragEnabled;
                itemsIncluded.push(`✅ RAG ENABLED: ${options.ragEnabled}`);
            }
            
            // Include enabled EU documents if any
            if (options.ragEUDocuments && options.ragEUDocuments.length > 0) {
                payload.ragEUDocuments = options.ragEUDocuments;
                itemsIncluded.push(`✅ RAG EU DOCUMENTS (${options.ragEUDocuments.length} documents: ${options.ragEUDocuments.join(', ')})`);
            }
        }
        
        // Log summary
        console.log('📊 FINAL SUMMARY - ITEMS INCLUDED IN SHARE LINK:');
        console.log('═══════════════════════════════════════════════════');
        if (itemsIncluded.length > 0) {
            itemsIncluded.forEach((item, index) => {
                console.log(`${index + 1}. ${item}`);
            });
        } else {
            console.log('❌ NO ITEMS INCLUDED - This will be an empty share link!');
        }
        console.log('═══════════════════════════════════════════════════');
        
        // If payload is empty, still generate a proper hacka.re share link
        // This ensures users always get a shareable hacka.re URL, not an API endpoint
        if (Object.keys(payload).length === 0) {
            // CRITICAL: Do NOT return options.baseUrl here as it contains the API endpoint URL
            // Instead, always return the hacka.re app URL
            const hackareUrl = window.location.href.split('#')[0];
            console.log('🔗 ShareService: Empty payload, returning hacka.re app URL:', hackareUrl);
            // Return just the base hacka.re URL - this allows sharing the app itself
            return hackareUrl;
        }
        
        // Create the link using LinkSharingService for backward compatibility
        // This ensures prompts and functions are properly handled
        const shareableLink = await LinkSharingService.createCustomShareableLink(payload, options.password, {
            includePromptLibrary: options.includePromptLibrary,
            includeFunctionLibrary: options.includeFunctionLibrary,
            includeMcpConnections: options.includeMcpConnections
        });
        
        console.log('🔗 ShareService: Generated link length:', shareableLink.length, 'characters');
        console.log('🔗 SHARE LINK CREATION COMPLETED 🔗');
        
        return shareableLink;
    }
    
    /**
     * Legacy wrapper: Create a shareable link with encrypted API key
     * Maintained for backward compatibility
     * @param {string} apiKey - The API key to share
     * @param {string} password - The password to use for encryption
     * @returns {Promise<string>} Shareable URL
     */
    async function createShareableLink(apiKey, password) {
        return createShareLink({
            password: password,
            apiKey: apiKey,
            includeApiKey: true
        });
    }
    
    /**
     * Legacy wrapper: Create a comprehensive shareable link with selected data
     * Maintains backward compatibility with the old API
     */
    async function createComprehensiveShareableLink(options, password) {
        // Map old options format to new format
        return createShareLink({
            password: password,
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            systemPrompt: options.systemPrompt,
            model: options.model,
            messages: options.messages,
            messageCount: options.messageCount,
            welcomeMessage: options.welcomeMessage,
            includeBaseUrl: options.includeBaseUrl,
            includeApiKey: options.includeApiKey,
            includeSystemPrompt: options.includeSystemPrompt,
            includeModel: options.includeModel,
            includeConversation: options.includeConversation,
            includeWelcomeMessage: options.includeWelcomeMessage,
            includeMcpConnections: options.includeMcpConnections,
            includeFunctionLibrary: options.includeFunctionLibrary,
            includePromptLibrary: options.includePromptLibrary
        });
    }
    
    /**
     * Check if the current URL contains a shared API key
     * @returns {boolean} True if URL contains a shared API key
     */
    function hasSharedApiKey() {
        return LinkSharingService.hasSharedApiKey();
    }
    
    /**
     * Extract and decrypt a shared API key from the URL
     * @param {string} password - The password to use for decryption
     * @returns {Object} Object containing apiKey and prompts data (if available)
     */
    function extractSharedApiKey(password) {
        return LinkSharingService.extractSharedApiKey(password);
    }
    
    /**
     * Clear the shared API key from the URL
     */
    function clearSharedApiKeyFromUrl() {
        LinkSharingService.clearSharedApiKeyFromUrl();
    }
    
    // Public API
    return {
        // Core function
        createShareLink: createShareLink,
        
        // Utility functions
        generateStrongPassword: generateStrongPassword,
        hasSharedApiKey: hasSharedApiKey,
        extractSharedApiKey: extractSharedApiKey,
        clearSharedApiKeyFromUrl: clearSharedApiKeyFromUrl,
        
        // Legacy wrappers (for backward compatibility)
        createShareableLink: createShareableLink,
        createComprehensiveShareableLink: createComprehensiveShareableLink
    };
})();