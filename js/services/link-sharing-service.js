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
        
        // Encrypt the payload
        const encryptedData = CryptoUtils.encryptData(payload, password);
        
        // Create URL with hash fragment
        const baseUrl = _location.href.split('#')[0];
        return `${baseUrl}#gpt=${encryptedData}`;
    }
    
    /**
     * Create a shareable link with encrypted API key and system prompt
     * This creates a link that contains both the API key and system prompt,
     * allowing the recipient to use your exact configuration.
     * 
     * @param {string} apiKey - The API key to share
     * @param {string} systemPrompt - The system prompt to share
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL with #shared= fragment
     */
    function createInsecureShareableLink(apiKey, systemPrompt, password) {
        // Create payload with API key and system prompt
        const payload = { apiKey, systemPrompt };
        
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
     * @param {Object} payload - The data to encrypt and share
     * @param {string} password - The password to use for encryption
     * @param {Object} options - Additional options for sharing
     * @param {boolean} options.includePromptLibrary - Whether to include the prompt library in the link
     * @returns {string} Shareable URL with #gpt= fragment
     */
    function createCustomShareableLink(payload, password, options = {}) {
        // Clone the payload to avoid modifying the original
        const finalPayload = { ...payload };
        
        // Add prompt library if requested
        if (options.includePromptLibrary) {
            // Get prompts and ensure they're included in the payload
            const prompts = PromptsService.getPrompts();
            finalPayload.prompts = prompts;
            
            // Get selected prompt IDs
            const selectedPromptIds = PromptsService.getSelectedPromptIds();
            finalPayload.selectedPromptIds = selectedPromptIds;
        }
        
        // Encrypt the payload
        const encryptedData = CryptoUtils.encryptData(finalPayload, password);
        
        // Create URL with hash fragment
        const baseUrl = _location.href.split('#')[0];
        return `${baseUrl}#gpt=${encryptedData}`;
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
     * @returns {Object} Object containing the decrypted data (apiKey, systemPrompt, messages, prompts, selectedPromptIds, etc.)
     */
    function extractSharedApiKey(password) {
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
                    return null;
                }
                
                // Decrypt the data
                const data = CryptoUtils.decryptData(encryptedData, password);
                
                if (!data) {
                    return null;
                }
                
                // For backward compatibility, require apiKey for now
                // In the future, we might want to allow sharing just conversation data
                if (!data.apiKey) {
                    return null;
                }
                
                // Create the result object with required fields
                const result = {
                    baseUrl: data.baseUrl || null,
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
                }
                
                if (data.selectedPromptIds) {
                    result.selectedPromptIds = data.selectedPromptIds;
                    console.log('Extracted selected prompt IDs from shared link:', data.selectedPromptIds);
                }
                
                // Only include title and subtitle if they are actually present in the data
                if (data.title) {
                    result.title = data.title;
                }
                
                if (data.subtitle) {
                    result.subtitle = data.subtitle;
                }
                
                return result;
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting shared data:', error);
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
        createInsecureShareableLink: createInsecureShareableLink,
        createCustomShareableLink: createCustomShareableLink,
        hasSharedApiKey: hasSharedApiKey,
        extractSharedApiKey: extractSharedApiKey,
        clearSharedApiKeyFromUrl: clearSharedApiKeyFromUrl,
        // Testing helpers
        _setTestingObjects: _setTestingObjects,
        _resetTestingObjects: _resetTestingObjects
    };
})();
