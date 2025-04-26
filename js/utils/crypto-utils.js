/**
 * Crypto Utilities
 * Provides encryption and decryption functionality using TweetNaCl
 */

window.CryptoUtils = (function() {
    // Constants
    const SALT_LENGTH = 16; // 16 bytes for salt
    const NONCE_LENGTH = nacl.box.nonceLength;
    const KEY_LENGTH = 32; // seed and secretKey length
    const KEY_ITERATIONS = 10000; // Number of iterations for key derivation
    
    /**
     * Generate a SHA-256 hash of a string
     * @param {string} input - The string to hash
     * @returns {string} Hex string of the hash
     */
    function sha256(input) {
        // Convert input string to Uint8Array
        const inputBytes = nacl.util.decodeUTF8(input);
        
        // Use TweetNaCl's hash function (SHA-512) and take first 32 bytes (256 bits)
        const hashBytes = nacl.hash(inputBytes).slice(0, 32);
        
        // Convert to hex string
        return Array.from(hashBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Generate a namespace prefix from title and subtitle
     * @param {string} title - The title
     * @param {string} subtitle - The subtitle
     * @returns {string} First 8 characters of SHA-256 hash
     */
    function generateNamespace(title, subtitle) {
        const combined = `${title}${subtitle}`;
        const hash = sha256(combined);
        return hash.substring(0, 8);
    }
    
    /**
     * Derive a 32-byte seed from password + salt
     * @param {string} password - The password to derive the key from
     * @param {Uint8Array} salt - The salt to use for key derivation
     * @returns {Uint8Array} Derived key
     */
    function deriveSeed(password, salt) {
        // Convert password to Uint8Array
        const passwordBytes = nacl.util.decodeUTF8(password);
        
        // For long passwords, hash them down if they're longer than 32 bytes
        let processedPasswordBytes = passwordBytes;
        if (passwordBytes.length > 32) {
            processedPasswordBytes = nacl.hash(passwordBytes).slice(0, KEY_LENGTH);
        }
        
        // Combine password and salt
        const combined = new Uint8Array(processedPasswordBytes.length + salt.length);
        combined.set(processedPasswordBytes);
        combined.set(salt, processedPasswordBytes.length);
        
        // Perform multiple iterations of hashing to derive the key
        let key = combined;
        for (let i = 0; i < KEY_ITERATIONS; i++) {
            // Use TweetNaCl's hash function (SHA-512)
            key = nacl.hash(key).slice(0, KEY_LENGTH);
        }
        
        return key;
    }
    
    /**
     * Generate a key pair from a seed
     * @param {string} password - The password to derive the seed from
     * @param {Uint8Array} salt - The salt to use for seed derivation
     * @returns {Object} Object containing publicKey and secretKey
     */
    function getKeyPair(password, salt) {
        const seed = deriveSeed(password, salt);
        return nacl.box.keyPair.fromSecretKey(seed);
    }
    
    /**
     * Encrypt data with a password
     * @param {*} payloadObj - The data to encrypt (can be any JSON-serializable value)
     * @param {string} password - The password to use for encryption
     * @returns {string} Base64-encoded encrypted data
     */
    function encryptData(payloadObj, password) {
        // Convert to JSON string
        const jsonString = JSON.stringify(payloadObj);
        const plain = nacl.util.decodeUTF8(jsonString);
        
        // Generate salt and derive key
        const salt = nacl.randomBytes(SALT_LENGTH);
        const key = deriveSeed(password, salt);
        
        // Generate nonce for secretbox
        const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
        
        // Encrypt with secretbox (symmetric encryption)
        const cipher = nacl.secretbox(plain, nonce, key);
        
        // Combine salt, nonce, and cipher
        const fullMessage = new Uint8Array(
            salt.length + 
            nonce.length + 
            cipher.length
        );
        
        let offset = 0;
        fullMessage.set(salt, offset);
        offset += salt.length;
        
        fullMessage.set(nonce, offset);
        offset += nonce.length;
        
        fullMessage.set(cipher, offset);
        
        // Convert to base64 for URL-friendly format
        return nacl.util.encodeBase64(fullMessage);
    }
    
    /**
     * Decrypt encrypted data with a password
     * @param {string} encryptedData - Base64-encoded encrypted data
     * @param {string} password - The password to use for decryption
     * @returns {*} Decrypted data or null if decryption fails
     */
    function decryptData(encryptedData, password) {
        try {
            // Convert from base64
            const data = nacl.util.decodeBase64(encryptedData);
            
            // Extract components
            let offset = 0;
            const salt = data.slice(offset, offset + SALT_LENGTH);
            offset += SALT_LENGTH;
            
            const nonce = data.slice(offset, offset + nacl.secretbox.nonceLength);
            offset += nacl.secretbox.nonceLength;
            
            const cipher = data.slice(offset);
            
            // Derive key from password and salt
            const key = deriveSeed(password, salt);
            
            // Decrypt with secretbox
            const plain = nacl.secretbox.open(
                cipher,
                nonce,
                key
            );
            
            if (!plain) {
                return null; // Decryption failed
            }
            
            // Convert from Uint8Array to string, then parse JSON
            const plainText = nacl.util.encodeUTF8(plain);
            return JSON.parse(plainText);
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }
    
    // Public API
    return {
        deriveSeed: deriveSeed,
        getKeyPair: getKeyPair,
        encryptData: encryptData,
        decryptData: decryptData,
        sha256: sha256,
        generateNamespace: generateNamespace
    };
})();
