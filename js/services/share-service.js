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
     * Create a shareable link with encrypted API key
     * @param {string} apiKey - The API key to share
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL
     */
    function createShareableLink(apiKey, password) {
        return LinkSharingService.createShareableLink(apiKey, password);
    }
    
    /**
     * Create a shareable link with encrypted API key and prompts
     * This creates a link that contains both the API key and prompts,
     * allowing the recipient to use your exact configuration.
     * 
     * @param {string} apiKey - The API key to share
     * @param {string} systemPrompt - The system prompt generated from selected prompts to share
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL
     */
    function createInsecureShareableLink(apiKey, systemPrompt, password) {
        return LinkSharingService.createInsecureShareableLink(apiKey, systemPrompt, password);
    }
    
    /**
     * Create a comprehensive shareable link with selected data
     * @param {Object} options - Options for what to include in the share
     * @param {string} options.baseUrl - The base URL to share (if includeBaseUrl is true)
     * @param {string} options.apiKey - The API key to share (if includeApiKey is true)
     * @param {string} options.systemPrompt - The system prompt to share (if includeSystemPrompt is true)
     * @param {Array} options.messages - The conversation messages to share (if includeConversation is true)
     * @param {number} options.messageCount - Number of recent messages to include (if includeConversation is true)
     * @param {boolean} options.includeBaseUrl - Whether to include the base URL
     * @param {boolean} options.includeApiKey - Whether to include the API key
     * @param {boolean} options.includeSystemPrompt - Whether to include the prompts
     * @param {boolean} options.includeConversation - Whether to include conversation data
     * @param {boolean} options.includePromptLibrary - Whether to include the prompt library
     * @param {boolean} options.includeMcpConnections - Whether to include MCP connections
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL
     */
    async function createComprehensiveShareableLink(options, password) {
        console.log('🔗 SHARE LINK CREATION STARTED 🔗');
        console.log('📋 ShareService: Input options:', JSON.stringify(options, null, 2));
        
        const payload = {};
        const itemsIncluded = [];
        
        console.log('🧪 ShareService: Checking each item for inclusion...');
        
        if (options.includeBaseUrl && options.baseUrl) {
            payload.baseUrl = options.baseUrl;
            itemsIncluded.push(`✅ BASE URL (${options.baseUrl.length} chars)`);
            console.log('✅ ShareService: Including Base URL:', options.baseUrl);
        } else {
            console.log('❌ ShareService: Base URL NOT included - includeBaseUrl:', options.includeBaseUrl, 'baseUrl exists:', !!options.baseUrl);
        }
        
        if (options.includeApiKey && options.apiKey) {
            payload.apiKey = options.apiKey;
            itemsIncluded.push(`✅ API KEY (${options.apiKey.length} chars)`);
            console.log('✅ ShareService: Including API Key (masked):', options.apiKey.substring(0, 10) + '...');
        } else {
            console.log('❌ ShareService: API Key NOT included - includeApiKey:', options.includeApiKey, 'apiKey exists:', !!options.apiKey);
        }
        
        if (options.includeSystemPrompt && options.systemPrompt) {
            payload.systemPrompt = options.systemPrompt;
            itemsIncluded.push(`✅ SYSTEM PROMPT (${options.systemPrompt.length} chars)`);
            console.log('✅ ShareService: Including System Prompt (first 100 chars):', options.systemPrompt.substring(0, 100) + '...');
        } else {
            console.log('❌ ShareService: System Prompt NOT included - includeSystemPrompt:', options.includeSystemPrompt, 'systemPrompt exists:', !!options.systemPrompt);
        }
        
        if (options.includeModel && options.model) {
            payload.model = options.model;
            itemsIncluded.push(`✅ MODEL (${options.model})`);
            console.log('✅ ShareService: Including Model:', options.model);
        } else {
            console.log('❌ ShareService: Model NOT included - includeModel:', options.includeModel, 'model exists:', !!options.model);
        }
        
        if (options.includeConversation && options.messages && options.messages.length > 0) {
            // Include only the specified number of most recent messages
            const messageCount = options.messageCount || 1;
            const startIndex = Math.max(0, options.messages.length - messageCount);
            payload.messages = options.messages.slice(startIndex);
            itemsIncluded.push(`✅ CONVERSATION (${payload.messages.length} messages)`);
            console.log('✅ ShareService: Including Conversation - messageCount:', messageCount, 'actual messages included:', payload.messages.length);
        } else {
            console.log('❌ ShareService: Conversation NOT included - includeConversation:', options.includeConversation, 'messages exist:', !!(options.messages && options.messages.length > 0));
        }
        
        // Only include title and subtitle if they are explicitly provided
        if (options.title && options.title.trim() !== "") {
            payload.title = options.title;
            itemsIncluded.push(`✅ TITLE (${options.title})`);
            console.log('✅ ShareService: Including Title:', options.title);
        } else {
            console.log('❌ ShareService: Title NOT included - title exists and non-empty:', !!(options.title && options.title.trim() !== ""));
        }
        
        if (options.subtitle && options.subtitle.trim() !== "") {
            payload.subtitle = options.subtitle;
            itemsIncluded.push(`✅ SUBTITLE (${options.subtitle})`);
            console.log('✅ ShareService: Including Subtitle:', options.subtitle);
        } else {
            console.log('❌ ShareService: Subtitle NOT included - subtitle exists and non-empty:', !!(options.subtitle && options.subtitle.trim() !== ""));
        }
        
        // Handle prompt library
        if (options.includePromptLibrary) {
            itemsIncluded.push(`✅ PROMPT LIBRARY`);
            console.log('✅ ShareService: Including Prompt Library');
        } else {
            console.log('❌ ShareService: Prompt Library NOT included - includePromptLibrary:', options.includePromptLibrary);
        }
        
        // Handle function library
        if (options.includeFunctionLibrary) {
            itemsIncluded.push(`✅ FUNCTION LIBRARY`);
            console.log('✅ ShareService: Including Function Library');
        } else {
            console.log('❌ ShareService: Function Library NOT included - includeFunctionLibrary:', options.includeFunctionLibrary);
        }
        
        // Collect MCP connections if requested
        if (options.includeMcpConnections) {
            console.log('🔌 ShareService: MCP Connections requested - collecting...');
            try {
                const mcpConnections = {};
                
                // Check for GitHub PAT token
                const githubToken = await window.CoreStorageService.getValue('mcp_github_token');
                console.log('🔌 ShareService: GitHub token found:', !!githubToken);
                if (githubToken) {
                    mcpConnections.github = githubToken;
                    console.log('🔌 ShareService: Added GitHub token to MCP connections (masked):', githubToken.substring(0, 10) + '...');
                }
                
                // Add support for other PAT-based services here in the future
                // const gitlabToken = await window.CoreStorageService.getValue('mcp_gitlab_token');
                // if (gitlabToken) {
                //     mcpConnections.gitlab = gitlabToken;
                // }
                
                // Only add to payload if we have connections to share
                if (Object.keys(mcpConnections).length > 0) {
                    payload.mcpConnections = mcpConnections;
                    const connectionTypes = Object.keys(mcpConnections);
                    itemsIncluded.push(`✅ MCP CONNECTIONS (${connectionTypes.join(', ')})`);
                    console.log('✅ ShareService: MCP connections added to payload:', connectionTypes);
                } else {
                    console.log('❌ ShareService: No MCP connections found to share (checkbox was checked but no tokens available)');
                }
            } catch (error) {
                console.warn('❌ ShareService: Failed to collect MCP connections for sharing:', error);
            }
        } else {
            console.log('❌ ShareService: MCP connections NOT requested - includeMcpConnections:', options.includeMcpConnections);
        }
        
        // Create summary of what's being included
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
        
        console.log('📦 ShareService: Final payload structure:', JSON.stringify(Object.keys(payload), null, 2));
        console.log('📦 ShareService: Payload size estimate:', JSON.stringify(payload).length, 'bytes');
        
        // Create link with prompt library, function library, and MCP connections options if requested
        const shareableLink = await LinkSharingService.createCustomShareableLink(payload, password, {
            includePromptLibrary: options.includePromptLibrary,
            includeFunctionLibrary: options.includeFunctionLibrary,
            includeMcpConnections: options.includeMcpConnections
        });
        
        console.log('🔗 ShareService: Generated link length:', shareableLink.length, 'characters');
        console.log('🔗 SHARE LINK CREATION COMPLETED 🔗');
        
        return shareableLink;
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
        generateStrongPassword: generateStrongPassword,
        createShareableLink: createShareableLink,
        createInsecureShareableLink: createInsecureShareableLink,
        createComprehensiveShareableLink: createComprehensiveShareableLink,
        hasSharedApiKey: hasSharedApiKey,
        extractSharedApiKey: extractSharedApiKey,
        clearSharedApiKeyFromUrl: clearSharedApiKeyFromUrl
    };
})();
