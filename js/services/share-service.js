/**
 * Share Service
 * Handles encryption, decryption, and sharing of API keys and system prompts
 * 
 * This service provides two types of shareable links:
 * 1. API Key Only: Shares just the API key (createShareableLink)
 * 2. API Key + System Prompt: Shares both API key and system prompt (createInsecureShareableLink)
 * 
 * Both links use NaCl encryption with password-based key derivation for improved security.
 * The encryption key is derived from a user-provided password rather than being included in the URL.
 */

window.ShareService = (function() {
    // Constants
    const NONCE_LENGTH = nacl.secretbox.nonceLength;
    const KEY_LENGTH = nacl.secretbox.keyLength;
    const SALT_LENGTH = 16; // 16 bytes for salt
    const KEY_ITERATIONS = 10000; // Number of iterations for key derivation
    
    /**
     * Generate a random key for encryption
     * @returns {Uint8Array} Random key
     */
    function generateKey() {
        return nacl.randomBytes(KEY_LENGTH);
    }
    
    /**
     * Generate a random salt for key derivation
     * @returns {Uint8Array} Random salt
     */
    function generateSalt() {
        return nacl.randomBytes(SALT_LENGTH);
    }
    
    /**
     * Derive an encryption key from a password and salt
     * This is a simple key derivation function using SHA-256 and multiple iterations
     * @param {string} password - The password to derive the key from
     * @param {Uint8Array} salt - The salt to use for key derivation
     * @returns {Uint8Array} Derived key
     */
    function deriveKey(password, salt) {
        // Convert password to Uint8Array
        const passwordBytes = nacl.util.decodeUTF8(password);
        
        // Combine password and salt
        const combined = new Uint8Array(passwordBytes.length + salt.length);
        combined.set(passwordBytes);
        combined.set(salt, passwordBytes.length);
        
        // Perform multiple iterations of hashing to derive the key
        let key = combined;
        for (let i = 0; i < KEY_ITERATIONS; i++) {
            // Use TweetNaCl's hash function (SHA-512)
            key = nacl.hash(key);
            // We only need the first 32 bytes for secretbox
            key = key.slice(0, KEY_LENGTH);
        }
        
        return key;
    }
    
    /**
     * Encrypt data (string or object) with a password
     * @param {string|Object} data - The data to encrypt
     * @param {string} password - The password to use for encryption
     * @returns {Object} Object containing the encrypted data and salt
     */
    function encryptData(data, password) {
        // Generate a random salt and nonce
        const salt = generateSalt();
        const nonce = nacl.randomBytes(NONCE_LENGTH);
        
        // Derive key from password and salt
        const key = deriveKey(password, salt);
        
        // Convert data to string if it's an object
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
        
        // Convert data to Uint8Array
        const messageUint8 = nacl.util.decodeUTF8(dataStr);
        
        // Encrypt the data
        const box = nacl.secretbox(messageUint8, nonce, key);
        
        // Combine salt, nonce and box
        const fullMessage = new Uint8Array(salt.length + nonce.length + box.length);
        fullMessage.set(salt);
        fullMessage.set(nonce, salt.length);
        fullMessage.set(box, salt.length + nonce.length);
        
        // Convert to base64 for URL-friendly format
        const base64FullMessage = nacl.util.encodeBase64(fullMessage);
        
        return {
            encryptedData: base64FullMessage
        };
    }
    
    /**
     * Decrypt encrypted data with a password
     * @param {string} encryptedData - Base64-encoded encrypted data
     * @param {string} password - The password to use for decryption
     * @param {boolean} parseJson - Whether to parse the decrypted data as JSON
     * @returns {string|Object|null} Decrypted data or null if decryption fails
     */
    function decryptData(encryptedData, password, parseJson = false) {
        try {
            // Convert from base64
            const fullMessage = nacl.util.decodeBase64(encryptedData);
            
            // Extract salt, nonce and box
            const salt = fullMessage.slice(0, SALT_LENGTH);
            const nonce = fullMessage.slice(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
            const box = fullMessage.slice(SALT_LENGTH + NONCE_LENGTH);
            
            // Derive key from password and salt
            const key = deriveKey(password, salt);
            
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
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL
     */
    function createShareableLink(apiKey, password) {
        // Encrypt the API key
        const { encryptedData } = encryptData(apiKey, password);
        
        // Create URL with hash fragment
        const baseUrl = window.location.href.split('#')[0];
        return `${baseUrl}#shared=${encryptedData}`;
    }
    
    /**
     * Create a shareable link with encrypted API key and system prompt
     * This creates a link that contains both the API key and system prompt,
     * allowing the recipient to use your exact configuration.
     * 
     * @param {string} apiKey - The API key to share
     * @param {string} systemPrompt - The system prompt to share
     * @param {string} password - The password to use for encryption
     * @returns {string} Shareable URL with #insecure= fragment
     */
    function createInsecureShareableLink(apiKey, systemPrompt, password) {
        // Encrypt the API key and system prompt together
        const data = { apiKey, systemPrompt };
        const { encryptedData } = encryptData(data, password);
        
        // Create URL with hash fragment
        const baseUrl = window.location.href.split('#')[0];
        return `${baseUrl}#insecure=${encryptedData}`;
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
     * @param {string} password - The password to use for decryption
     * @returns {Object} Object containing apiKey and systemPrompt (if available)
     */
    function extractSharedApiKey(password) {
        try {
            // Get the hash fragment
            const hash = window.location.hash;
            
            // Check if it contains a secure shared API key (API key only)
            if (hash.includes('#shared=')) {
                // Extract the encrypted data
                const encryptedData = hash.split('#shared=')[1];
                
                if (!encryptedData) {
                    return null;
                }
                
                // Decrypt the API key
                const apiKey = decryptData(encryptedData, password);
                
                if (!apiKey) {
                    return null;
                }
                
                return { apiKey, systemPrompt: null };
            }
            
            // Check if it contains an insecure shared API key (API key + system prompt)
            if (hash.includes('#insecure=')) {
                // Extract the encrypted data
                const encryptedData = hash.split('#insecure=')[1];
                
                if (!encryptedData) {
                    return null;
                }
                
                // Decrypt the data
                const data = decryptData(encryptedData, password, true);
                
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
