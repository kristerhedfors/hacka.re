/**
 * Share Service
 * Handles encryption, decryption, and sharing of API keys
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
     * Encrypt an API key
     * @param {string} apiKey - The API key to encrypt
     * @returns {Object} Object containing the encrypted data and the key
     */
    function encryptApiKey(apiKey) {
        // Generate a random key and nonce
        const key = generateKey();
        const nonce = nacl.randomBytes(NONCE_LENGTH);
        
        // Convert API key to Uint8Array
        const messageUint8 = nacl.util.decodeUTF8(apiKey);
        
        // Encrypt the API key
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
     * Decrypt an encrypted API key
     * @param {string} encryptedData - Base64-encoded encrypted data
     * @param {string} keyBase64 - Base64-encoded key
     * @returns {string|null} Decrypted API key or null if decryption fails
     */
    function decryptApiKey(encryptedData, keyBase64) {
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
            return nacl.util.encodeUTF8(decrypted);
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
        const { encryptedData, key } = encryptApiKey(apiKey);
        
        // Create a combined payload with both encrypted data and key
        // Format: {data}:{key}
        const payload = `${encryptedData}:${key}`;
        
        // Create URL with hash fragment
        const baseUrl = window.location.href.split('#')[0];
        return `${baseUrl}#shared=${payload}`;
    }
    
    /**
     * Check if the current URL contains a shared API key
     * @returns {boolean} True if URL contains a shared API key
     */
    function hasSharedApiKey() {
        const hash = window.location.hash;
        return hash.includes('#shared=');
    }
    
    /**
     * Extract and decrypt a shared API key from the URL
     * @returns {string|null} Decrypted API key or null if extraction/decryption fails
     */
    function extractSharedApiKey() {
        try {
            // Get the hash fragment
            const hash = window.location.hash;
            
            // Check if it contains a shared API key
            if (!hash.includes('#shared=')) {
                return null;
            }
            
            // Extract the payload
            const payload = hash.split('#shared=')[1];
            
            // Split the payload into encrypted data and key
            const [encryptedData, key] = payload.split(':');
            
            if (!encryptedData || !key) {
                return null;
            }
            
            // Decrypt the API key
            return decryptApiKey(encryptedData, key);
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
        hasSharedApiKey: hasSharedApiKey,
        extractSharedApiKey: extractSharedApiKey,
        clearSharedApiKeyFromUrl: clearSharedApiKeyFromUrl
    };
})();
