/**
 * Share Service
 * Handles encryption, decryption, and sharing of API keys and system prompts
 * 
 * This service provides two types of shareable links:
 * 1. API Key Only: Shares just the API key (createShareableLink)
 * 2. API Key + System Prompt: Shares both API key and system prompt (createInsecureShareableLink)
 * 
 * Both links use NaCl encryption for obfuscation, but are still considered INSECURE
 * because the encryption key is included in the URL.
 */

window.ShareService = (function() {
    // Constants
    const NONCE_LENGTH = nacl.secretbox.nonceLength;
    const KEY_LENGTH = nacl.secretbox.keyLength;
    
    /**
     * Generate a random key for encryption
     * @returns {Uint8Array} Random key
     */
    function generateKey() {
        return nacl.randomBytes(KEY_LENGTH);
    }
    
    /**
     * Encrypt data (string or object)
     * @param {string|Object} data - The data to encrypt
     * @returns {Object} Object containing the encrypted data and the key
     */
    function encryptData(data) {
        // Generate a random key and nonce
        const key = generateKey();
        const nonce = nacl.randomBytes(NONCE_LENGTH);
        
        // Convert data to string if it's an object
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
        
        // Convert data to Uint8Array
        const messageUint8 = nacl.util.decodeUTF8(dataStr);
        
        // Encrypt the data
        const box = nacl.secretbox(messageUint8, nonce, key);
        
        // Combine nonce and box
        const fullMessage = new Uint8Array(nonce.length + box.length);
        fullMessage.set(nonce);
        fullMessage.set(box, nonce.length);
        
        // Convert to base64 for URL-friendly format
        const base64FullMessage = nacl.util.encodeBase64(fullMessage);
        const base64Key = nacl.util.encodeBase64(key);
        
        return {
            encryptedData: base64FullMessage,
            key: base64Key
        };
    }
    
    /**
     * Decrypt encrypted data
     * @param {string} encryptedData - Base64-encoded encrypted data
     * @param {string} keyBase64 - Base64-encoded key
     * @param {boolean} parseJson - Whether to parse the decrypted data as JSON
     * @returns {string|Object|null} Decrypted data or null if decryption fails
     */
    function decryptData(encryptedData, keyBase64, parseJson = false) {
        try {
            // Convert from base64
            const fullMessage = nacl.util.decodeBase64(encryptedData);
            const key = nacl.util.decodeBase64(keyBase64);
            
            // Extract nonce and box
            const nonce = fullMessage.slice(0, NONCE_LENGTH);
            const box = fullMessage.slice(NONCE_LENGTH);
            
            // Decrypt
            const decrypted = nacl.secretbox.open(box, nonce, key);
            
            if (!decrypted) {
                return null; // Decryption failed
            }
            
            // Convert from Uint8Array to string
            const decryptedStr = nacl.util.encodeUTF8(decrypted);
            
            // Parse as JSON if requested
            if (parseJson) {
                try {
                    return JSON.parse(decryptedStr);
                } catch (e) {
                    console.error('Error parsing decrypted JSON:', e);
                    return decryptedStr;
                }
            }
            
            return decryptedStr;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }
    
    /**
     * Create a shareable link with encrypted API key
     * @param {string} apiKey - The API key to share
     * @returns {string} Shareable URL
     */
    function createShareableLink(apiKey) {
        // Encrypt the API key
        const { encryptedData, key } = encryptData(apiKey);
        
        // Create a combined payload with both encrypted data and key
        // Format: {data}:{key}
        const payload = `${encryptedData}:${key}`;
        
        // Create URL with hash fragment
        const baseUrl = window.location.href.split('#')[0];
        return `${baseUrl}#shared=${payload}`;
    }
    
    /**
     * Create a shareable INSECURE link with encrypted API key and system prompt
     * This creates a link that contains both the API key and system prompt,
     * allowing the recipient to use your exact configuration.
     * 
     * @param {string} apiKey - The API key to share
     * @param {string} systemPrompt - The system prompt to share
     * @returns {string} Shareable URL with #insecure= fragment
     */
    function createInsecureShareableLink(apiKey, systemPrompt) {
        // Encrypt the API key and system prompt together
        const data = { apiKey, systemPrompt };
        const { encryptedData, key } = encryptData(data);
        
        // Create a combined payload with both encrypted data and key
        // Format: {data}:{key}
        const payload = `${encryptedData}:${key}`;
        
        // Create URL with hash fragment
        const baseUrl = window.location.href.split('#')[0];
        return `${baseUrl}#insecure=${payload}`;
    }
    
    /**
     * Check if the current URL contains a shared API key
     * @returns {boolean} True if URL contains a shared API key
     */
    function hasSharedApiKey() {
        const hash = window.location.hash;
        return hash.includes('#shared=') || hash.includes('#insecure=');
    }
    
    /**
     * Extract and decrypt a shared API key from the URL
     * @returns {Object} Object containing apiKey and systemPrompt (if available)
     */
    function extractSharedApiKey() {
        try {
            // Get the hash fragment
            const hash = window.location.hash;
            
            // Check if it contains a secure shared API key (API key only)
            if (hash.includes('#shared=')) {
                // Extract the payload
                const payload = hash.split('#shared=')[1];
                
                // Split the payload into encrypted data and key
                const [encryptedData, key] = payload.split(':');
                
                if (!encryptedData || !key) {
                    return null;
                }
                
                // Decrypt the API key
                const apiKey = decryptData(encryptedData, key);
                
                if (!apiKey) {
                    return null;
                }
                
                return { apiKey, systemPrompt: null };
            }
            
            // Check if it contains an insecure shared API key (API key + system prompt)
            if (hash.includes('#insecure=')) {
                // Extract the payload
                const payload = hash.split('#insecure=')[1];
                
                // Split the payload into encrypted data and key
                const [encryptedData, key] = payload.split(':');
                
                if (!encryptedData || !key) {
                    return null;
                }
                
                // Decrypt the data
                const data = decryptData(encryptedData, key, true);
                
                if (!data || !data.apiKey) {
                    return null;
                }
                
                return { apiKey: data.apiKey, systemPrompt: data.systemPrompt || null };
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting shared API key:', error);
            return null;
        }
    }
    
    /**
     * Clear the shared API key from the URL
     */
    function clearSharedApiKeyFromUrl() {
        // Remove the hash fragment
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }
    
    // Public API
    return {
        createShareableLink: createShareableLink,
        createInsecureShareableLink: createInsecureShareableLink,
        hasSharedApiKey: hasSharedApiKey,
        extractSharedApiKey: extractSharedApiKey,
        clearSharedApiKeyFromUrl: clearSharedApiKeyFromUrl
    };
})();
