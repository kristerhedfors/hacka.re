/**
 * Share Service
 * Handles encryption, decryption, and sharing of API keys, system prompts, and conversation data
 * 
 * This service provides shareable links for API keys, system prompts, and conversation data.
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
     * Create a shareable link with encrypted API key and system prompt
     * This creates a link that contains both the API key and system prompt,
     * allowing the recipient to use your exact configuration.
     * 
     * @param {string} apiKey - The API key to share
     * @param {string} systemPrompt - The system prompt to share
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
     * @param {boolean} options.includeSystemPrompt - Whether to include the system prompt
     * @param {boolean} options.includeConversation - Whether to include conversation data
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL
     */
    function createComprehensiveShareableLink(options, password) {
        const payload = {};
        
        if (options.includeBaseUrl && options.baseUrl) {
            payload.baseUrl = options.baseUrl;
        }
        
        if (options.includeApiKey && options.apiKey) {
            payload.apiKey = options.apiKey;
        }
        
        if (options.includeSystemPrompt && options.systemPrompt) {
            payload.systemPrompt = options.systemPrompt;
        }
        
        if (options.includeModel && options.model) {
            payload.model = options.model;
        }
        
        if (options.includeConversation && options.messages && options.messages.length > 0) {
            // Include only the specified number of most recent messages
            const messageCount = options.messageCount || 1;
            const startIndex = Math.max(0, options.messages.length - messageCount);
            payload.messages = options.messages.slice(startIndex);
        }
        
        return LinkSharingService.createCustomShareableLink(payload, password);
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
     * @returns {Object} Object containing apiKey and systemPrompt (if available)
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
