/**
 * Link Sharing Service
 * Handles creation and extraction of shareable links with encrypted data
 */

window.LinkSharingService = (function() {
    // For testing purposes
    let _location = window.location;
    let _history = window.history;
    
    
    /**
     * Set custom location and history objects for testing
     * @param {Object} locationObj - Custom location object
     * @param {Object} historyObj - Custom history object
     */
    function _setTestingObjects(locationObj, historyObj) {
        if (locationObj) _location = locationObj;
        if (historyObj) _history = historyObj;
    }
    
    /**
     * Reset to using the real window.location and window.history
     */
    function _resetTestingObjects() {
        _location = window.location;
        _history = window.history;
    }
    /**
     * Create a shareable link with encrypted API key
     * @param {string} apiKey - The API key to share
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL
     */
    function createShareableLink(apiKey, password) {
        // Create payload with just the API key
        const payload = { apiKey };
        
        // Debug logging
        if (window.DebugService && window.DebugService.debugLog) {
            window.DebugService.debugLog('crypto', `🔐 Encrypting simple shareable link payload (apiKey) for link creation`);
        }
        
        // Encrypt the payload
        const encryptedData = CryptoUtils.encryptData(payload, password);
        
        // Create URL with hash fragment
        const baseUrl = _location.href.split('#')[0];
        return `${baseUrl}#gpt=${encryptedData}`;
    }
    
    /**
     * Create a custom shareable link with encrypted payload
     * This creates a link that contains any combination of data specified in the payload.
     * 
     * @param {Object} payload - The data to encrypt and share (optional - will collect current state if not provided)
     * @param {string} password - The password to use for encryption
     * @param {Object} options - Additional options for sharing
     * @param {boolean} options.includePromptLibrary - Whether to include the prompt library in the link
     * @param {boolean} options.includeFunctionLibrary - Whether to include the function library in the link
     * @param {boolean} options.includeMcpConnections - Whether to include MCP connections in the link
     * @param {boolean} options.includeLLMConfig - Whether to include LLM configuration in the link
     * @param {boolean} options.includeChatData - Whether to include chat data in the link
     * @returns {string} Shareable URL with #gpt= fragment
     */
    async function createCustomShareableLink(payload, password, options = {}) {
        let finalPayload;
        
        // If no payload provided, collect current configuration
        if (!payload || Object.keys(payload).length === 0) {
            // Use ConfigurationService to collect current state
            const configOptions = {
                includeLLMConfig: options.includeLLMConfig !== false, // Default true
                includePromptLibrary: options.includePromptLibrary === true,
                includeFunctionLibrary: options.includeFunctionLibrary === true,
                includeMcpConnections: options.includeMcpConnections === true,
                includeChatData: options.includeChatData !== false // Default true
            };
            
            const currentConfig = ConfigurationService.collectCurrentConfiguration(configOptions);
            
            // Convert to the flat structure expected by shared links
            finalPayload = convertConfigToShareFormat(currentConfig);
            
            console.log('Collected current configuration for sharing:', {
                hasLLM: !!currentConfig.llm,
                hasPrompts: !!currentConfig.prompts,
                hasFunctions: !!currentConfig.functions,
                hasMCP: !!currentConfig.mcp,
                hasChat: !!currentConfig.chat
            });
            
        } else {
            // Use provided payload and apply legacy options
            finalPayload = { ...payload };
            
            // If the payload contains function configuration with default function selections,
            // ensure they are preserved at the top level
            if (payload.functions) {
                if (payload.functions.selectedDefaultFunctionIds) {
                    finalPayload.selectedDefaultFunctionIds = payload.functions.selectedDefaultFunctionIds;
                }
                if (payload.functions.selectedDefaultFunctionCollectionIds) {
                    finalPayload.selectedDefaultFunctionCollectionIds = payload.functions.selectedDefaultFunctionCollectionIds;
                }
            }
            
            // Add prompt library if requested (legacy support)
            if (options.includePromptLibrary) {
                // Get user prompts (excluding MCP-derived prompts)
                const allPrompts = PromptsService.getPrompts();
                // Filter out MCP prompts - they should not be shared
                const userPrompts = allPrompts.filter(prompt => !prompt.isMcpPrompt);
                finalPayload.prompts = userPrompts;
                
                // No need to include selectedPromptIds - all shared prompts are selected by default
                
                // Get selected default prompts, excluding MCP prompts
                const selectedDefaultPromptIds = window.DefaultPromptsService ? 
                    window.DefaultPromptsService.getSelectedDefaultPromptIds() : [];
                
                // Filter out MCP prompt IDs from selected default prompts
                const mcpPromptIds = ['shodan-integration-guide', 'github-integration-guide', 'gmail-integration-guide'];
                const filteredDefaultPromptIds = selectedDefaultPromptIds.filter(id => !mcpPromptIds.includes(id));
                
                if (filteredDefaultPromptIds.length > 0) {
                    finalPayload.selectedDefaultPromptIds = filteredDefaultPromptIds;
                }
            }
            
            // Add RAG settings if available
            if (window.RAGStorageService) {
                // Include RAG enabled state
                const ragEnabled = window.RAGStorageService.isRAGEnabled();
                finalPayload.ragEnabled = ragEnabled;
                
                // Include enabled EU document IDs
                const enabledEUDocuments = window.RAGStorageService.getEnabledEUDocuments();
                if (enabledEUDocuments && enabledEUDocuments.length > 0) {
                    finalPayload.ragEUDocuments = enabledEUDocuments;
                }
            }
            
            // Add function library if requested (legacy support)
            if (options.includeFunctionLibrary) {
                const allFunctions = FunctionToolsService.getJsFunctions();
                const allCollections = FunctionToolsService.getAllFunctionCollections();
                
                // Filter out MCP-derived functions
                const userFunctions = {};
                const mcpCollectionIds = [];
                
                // First identify MCP collections
                Object.values(allCollections).forEach(collection => {
                    const isMcpCollection = collection.metadata.source === 'mcp' || 
                                          collection.metadata.source === 'mcp-service' ||
                                          collection.id.startsWith('mcp_');
                    if (isMcpCollection) {
                        mcpCollectionIds.push(collection.id);
                    }
                });
                
                // Now filter functions - only include non-MCP functions
                const functionCollections = FunctionToolsService.getFunctionCollections();
                Object.entries(allFunctions).forEach(([funcName, funcSpec]) => {
                    const collectionId = functionCollections[funcName];
                    // Only include if not in an MCP collection
                    if (!collectionId || !mcpCollectionIds.includes(collectionId)) {
                        // Only include the code, not the toolDefinition (it can be rebuilt from code)
                        userFunctions[funcName] = {
                            code: funcSpec.code
                        };
                    }
                });
                
                finalPayload.functions = userFunctions;
                
                // No need to include enabledFunctions - all shared functions are enabled by default
                
                // Add default function selections if available (legacy support)
                if (window.DefaultFunctionsService) {
                    if (typeof window.DefaultFunctionsService.getSelectedDefaultFunctionIds === 'function') {
                        const selectedDefaultCollectionIds = window.DefaultFunctionsService.getSelectedDefaultFunctionIds();
                        if (selectedDefaultCollectionIds.length > 0) {
                            finalPayload.selectedDefaultFunctionCollectionIds = selectedDefaultCollectionIds;
                        }
                    }
                    
                    if (typeof window.DefaultFunctionsService.getSelectedIndividualFunctionIds === 'function') {
                        const selectedDefaultFunctionIds = window.DefaultFunctionsService.getSelectedIndividualFunctionIds();
                        if (selectedDefaultFunctionIds.length > 0) {
                            finalPayload.selectedDefaultFunctionIds = selectedDefaultFunctionIds;
                        }
                    }
                }
            }
            
            // Add MCP connections if requested and available in payload (legacy support)
            if (options.includeMcpConnections && payload.mcpConnections) {
                finalPayload.mcpConnections = payload.mcpConnections;
            }
        }
        
        // Debug logging
        if (window.DebugService && window.DebugService.debugLog) {
            const payloadKeys = Object.keys(finalPayload);
            window.DebugService.debugLog('crypto', `🔐 Compressing and encrypting custom shareable link payload with ${payloadKeys.length} components: ${payloadKeys.join(', ')}`);
        }
        
        // Generate a strong master key for this share link
        // This is the ONLY place where master keys are generated for shared links
        const masterKeyBytes = nacl.randomBytes(32);
        const masterKeyHex = Array.from(masterKeyBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        // Create wrapper with master key and encrypted data
        const sharePayload = {
            masterKey: masterKeyHex,
            data: finalPayload
        };
        
        // Debug logging for shared-links category - show EXACT payload that will be encrypted
        if (window.DebugService && window.DebugService.isCategoryEnabled('shared-links')) {
            // Create a formatted message showing the exact payload
            const debugMessage = [
                '🔗 ═══════════════════════════════════════════════════════════════',
                '🔗 EXACT SHARED LINK PAYLOAD (before compression & encryption)',
                '🔗 ═══════════════════════════════════════════════════════════════',
                JSON.stringify(sharePayload, null, 2),
                '🔗 ═══════════════════════════════════════════════════════════════',
                '🔗 Note: This payload will be compressed, then encrypted with:',
                '🔗 - Salt (random, added during encryption)',
                '🔗 - Nonce (random, added during encryption)',
                '🔗 - Password-derived key',
                '🔗 ═══════════════════════════════════════════════════════════════'
            ].join('\n');
            
            // Log to console
            console.log('[DEBUG] Exact Shared Link Payload:', sharePayload);
            
            // Add to chat as a single system message if chat manager is available
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                // Add the entire debug message as a single system message with debug styling
                window.aiHackare.chatManager.addSystemMessage(debugMessage, 'debug-message debug-shared-links');
            }
        }
        
        // Compress the entire payload including master key
        const compressedPayload = await CompressionUtils.compressPayload(sharePayload);
        
        // Encrypt with password (password only decrypts the link, master key decrypts the data)
        const encryptedData = CryptoUtils.encryptData(compressedPayload, password);
        
        // Create URL with hash fragment
        const baseUrl = _location.href.split('#')[0];
        const finalUrl = `${baseUrl}#gpt=${encryptedData}`;
        
        // Final size summary debug logging for shared-links category
        if (window.DebugService && window.DebugService.isCategoryEnabled('shared-links')) {
            const sizeSummary = {
                'Base URL length': baseUrl.length + ' chars',
                'Encrypted data (base64)': encryptedData.length + ' chars',
                'Hash fragment overhead': 5 + ' chars (#gpt=)',
                'Total URL length': finalUrl.length + ' chars',
                'URL-safe for sharing': finalUrl.length < 2000 ? 'Yes ✓' : 'Warning: May be too long for some platforms'
            };
            
            // Create a formatted message
            const debugMessage = [
                '📏 ═══════════════════════════════════════════════════════════════',
                '📏 FINAL SHARE LINK SIZE',
                '📏 ═══════════════════════════════════════════════════════════════',
                JSON.stringify(sizeSummary, null, 2),
                '📏 ───────────────────────────────────────────────────────────────',
                '📏 Size limits by platform:',
                '📏 - Browser URL bar: ~2,000 chars (varies)',
                '📏 - Twitter/X: 280 chars (need URL shortener)',
                '📏 - Discord: 2,000 chars',
                '📏 - Email: ~2,000 chars (safe)',
                '📏 - SMS: 160 chars (need URL shortener)',
                '📏 ═══════════════════════════════════════════════════════════════'
            ].join('\n');
            
            // Log to console
            console.log('[DEBUG] Final Share Link Size:', sizeSummary);
            
            // Add to chat as a single system message if chat manager is available
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                window.aiHackare.chatManager.addSystemMessage(debugMessage, 'debug-message debug-shared-links');
            }
        }
        
        return finalUrl;
    }
    
    /**
     * Convert unified configuration object to flat share format
     * @private
     * @param {Object} config - Unified configuration object
     * @returns {Object} Flat payload for sharing
     */
    function convertConfigToShareFormat(config) {
        const payload = {};
        
        // LLM configuration
        if (config.llm) {
            if (config.llm.apiKey) payload.apiKey = config.llm.apiKey;
            if (config.llm.model) payload.model = config.llm.model;
            if (config.llm.baseUrl) payload.baseUrl = config.llm.baseUrl;
            if (config.llm.provider) payload.provider = config.llm.provider;
        }
        
        // Prompt configuration
        if (config.prompts) {
            if (config.prompts.library) payload.prompts = config.prompts.library;
            // No need for selectedIds - all shared prompts are selected by default
            if (config.prompts.selectedDefaultIds) payload.selectedDefaultPromptIds = config.prompts.selectedDefaultIds;
        }
        
        // Function configuration
        if (config.functions) {
            if (config.functions.library) payload.functions = config.functions.library;
            // No need for enabled - all shared functions are enabled by default
            
            // Include default function selections (by reference only)
            if (config.functions.selectedDefaultFunctionCollectionIds) payload.selectedDefaultFunctionCollectionIds = config.functions.selectedDefaultFunctionCollectionIds;
            if (config.functions.selectedDefaultFunctionIds) payload.selectedDefaultFunctionIds = config.functions.selectedDefaultFunctionIds;
        }
        
        // MCP configuration  
        if (config.mcp && config.mcp.connections) {
            payload.mcpConnections = config.mcp.connections;
        }
        
        // Chat configuration
        if (config.chat) {
            if (config.chat.systemPrompt) payload.systemPrompt = config.chat.systemPrompt;
            if (config.chat.messages) payload.messages = config.chat.messages;
            if (config.chat.welcomeMessage) payload.welcomeMessage = config.chat.welcomeMessage;
        }
        
        return payload;
    }
    
    /**
     * Check if the current URL contains a shared API key
     * @returns {boolean} True if URL contains a shared API key
     */
    function hasSharedApiKey() {
        const hash = _location.hash;
        return hash.includes('#shared=') || hash.includes('#gpt=');
    }
    
    /**
     * Extract and decrypt shared data from the URL
     * @param {string} password - The password to use for decryption
     * @returns {Object} Object containing the decrypted data (apiKey, systemPrompt, messages, prompts, functions, etc.)
     */
    async function extractSharedApiKey(password) {
        try {
            // Get the hash fragment
            const hash = _location.hash;
            
            // Check if it contains a shared data
            if (hash.includes('#shared=') || hash.includes('#gpt=')) {
                // Extract the encrypted data
                let encryptedData;
                if (hash.includes('#gpt=')) {
                    encryptedData = hash.split('#gpt=')[1];
                } else {
                    encryptedData = hash.split('#shared=')[1];
                }
                
                if (!encryptedData) {
                    console.error('No encrypted data found in URL hash');
                    return null;
                }
                
                // Debug logging
                if (window.DebugService && window.DebugService.debugLog) {
                    window.DebugService.debugLog('crypto', `🔓 Decrypting and decompressing shared link data from URL hash fragment`);
                }
                
                // Decrypt the data
                const decryptedData = CryptoUtils.decryptData(encryptedData, password);
                
                if (!decryptedData) {
                    console.error('Decryption failed or returned null');
                    return null;
                }
                
                // Handle decompression
                let decompressedData;
                if (decryptedData._compressed === true && decryptedData.data) {
                    // Old format with wrapper object - decompress the data
                    try {
                        decompressedData = await CompressionUtils.decompressPayload(decryptedData.data);
                    } catch (decompressError) {
                        console.error('Decompression failed:', decompressError);
                        return null;
                    }
                } else if (typeof decryptedData === 'string') {
                    // New format - compressed data directly (string)
                    try {
                        decompressedData = await CompressionUtils.decompressPayload(decryptedData);
                    } catch (decompressError) {
                        console.error('Decompression failed:', decompressError);
                        return null;
                    }
                } else {
                    // Fallback for very old uncompressed format (shouldn't happen)
                    decompressedData = decryptedData;
                }
                
                // Check if this is the new format with master key
                let data;
                let masterKey = null;
                if (decompressedData && decompressedData.masterKey && decompressedData.data) {
                    // New secure format with master key
                    masterKey = decompressedData.masterKey;
                    data = decompressedData.data;
                    
                    // Store the master key temporarily in memory (NEVER to disk)
                    window._sharedLinkMasterKey = masterKey;
                    console.log('[LinkSharing] Master key extracted from share link (stored in memory only)');
                } else {
                    // Legacy format without master key (for backwards compatibility)
                    data = decompressedData;
                    console.warn('[LinkSharing] Legacy share link format without master key - less secure');
                }
                
                // Check if the decrypted data contains at least one valid field
                // We no longer require apiKey to be present, allowing sharing of just conversation or model
                if (!data.apiKey && !data.messages && !data.model && !data.systemPrompt && !data.prompts && 
                    !data.functions && !data.selectedDefaultFunctionIds && !data.selectedDefaultFunctionCollectionIds && 
                    !data.mcpConnections && !data.welcomeMessage && !data.ragEnabled && !data.ragEUDocuments) {
                    console.error('Decrypted data does not contain any valid fields');
                    return null;
                }
                
                // Create the result object with required fields
                const result = {
                    baseUrl: data.baseUrl || null,
                    provider: data.provider || null,  // Include provider if present
                    apiKey: data.apiKey,
                    systemPrompt: data.systemPrompt || null,
                    model: data.model || null,
                    messages: data.messages || null
                };
                
                // Include prompt library if present
                if (data.prompts) {
                    result.prompts = data.prompts;
                    console.log('Extracted prompts from shared link:', data.prompts);
                } else {
                    console.log('No prompts found in shared link data:', data);
                    console.log('DEBUG: Full decrypted data structure:', JSON.stringify(data, null, 2));
                }
                
                // Include selected default prompt IDs if present
                if (data.selectedDefaultPromptIds) {
                    result.selectedDefaultPromptIds = data.selectedDefaultPromptIds;
                    console.log('Extracted selected default prompt IDs from shared link:', data.selectedDefaultPromptIds);
                }
                
                // Include function library if present
                if (data.functions) {
                    result.functions = data.functions;
                    console.log('Extracted functions from shared link:', Object.keys(data.functions));
                }
                
                // Include function collections if present
                if (data.functionCollections) {
                    result.functionCollections = data.functionCollections;
                    console.log('Extracted function collections from shared link:', Object.keys(data.functionCollections).length, 'mappings');
                }
                
                // Note: functionCollectionMetadata is no longer included in share links
                // We use simplified function-to-collection-name mapping instead
                
                // Include default function selections if present (by reference)
                if (data.selectedDefaultFunctionCollectionIds) {
                    result.selectedDefaultFunctionCollectionIds = data.selectedDefaultFunctionCollectionIds;
                    console.log('Extracted selected default function collection IDs from shared link:', data.selectedDefaultFunctionCollectionIds);
                }
                
                if (data.selectedDefaultFunctionIds) {
                    result.selectedDefaultFunctionIds = data.selectedDefaultFunctionIds;
                    console.log('Extracted selected individual default function IDs from shared link:', data.selectedDefaultFunctionIds);
                }
                
                // Include MCP connections if present
                if (data.mcpConnections) {
                    result.mcpConnections = data.mcpConnections;
                    console.log('Extracted MCP connections from shared link:', Object.keys(data.mcpConnections));
                    // Note: MCP connections will be applied by shared-link-data-processor
                }
                
                // Include welcome message if present
                if (data.welcomeMessage) {
                    result.welcomeMessage = data.welcomeMessage;
                    console.log('Extracted welcome message from shared link:', data.welcomeMessage.substring(0, 50) + '...');
                }
                
                // Include theme if present
                if (data.theme) {
                    result.theme = data.theme;
                    console.log('Extracted theme from shared link:', data.theme);
                }
                
                // Include RAG settings if present
                if (data.ragEnabled !== undefined) {
                    result.ragEnabled = data.ragEnabled;
                    console.log('Extracted RAG enabled state from shared link:', data.ragEnabled);
                }
                
                if (data.ragEUDocuments) {
                    result.ragEUDocuments = data.ragEUDocuments;
                    console.log('Extracted RAG EU documents from shared link:', data.ragEUDocuments);
                }
                
                return result;
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting shared data:', error);
            // No backward compatibility - just fail
            return null;
        }
    }
    
    /**
     * Clear the shared API key from the URL
     */
    function clearSharedApiKeyFromUrl() {
        // Remove the hash fragment
        _history.replaceState(null, null, _location.pathname + _location.search);
    }
    
    // Public API
    return {
        createShareableLink: createShareableLink,
        createCustomShareableLink: createCustomShareableLink,
        hasSharedApiKey: hasSharedApiKey,
        extractSharedApiKey: extractSharedApiKey,
        clearSharedApiKeyFromUrl: clearSharedApiKeyFromUrl,
        // Testing helpers
        _setTestingObjects: _setTestingObjects,
        _resetTestingObjects: _resetTestingObjects
    };
})();
