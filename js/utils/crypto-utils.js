/**
 * Crypto Utilities
 * Provides encryption and decryption functionality using TweetNaCl
 * 
 * CRITICAL SECURITY INFORMATION:
 * ================================
 * 
 * Direct Access (hacka.re without shared link):
 * - Uses sessionStorage for data persistence
 * - Master key is stored in PLAIN TEXT in sessionStorage
 * - Data is effectively OBFUSCATED, NOT truly encrypted
 * - All secrets, API keys, and conversations are retrievable from sessionStorage
 * - Data persists only for the browser session
 * 
 * Shared Link Access (hacka.re#gpt=...):
 * - Uses localStorage for data persistence
 * - Master key is derived from 32-byte NaCl key embedded in the link
 * - Master key NEVER touches localStorage or sessionStorage
 * - Master key exists only in memory during runtime
 * - Same link generates same master key (enables multi-tab sharing)
 * - Data is truly encrypted using the link-derived key
 * - Multiple tabs with same link share encrypted localStorage
 * 
 * JavaScript Runtime Security:
 * - In BOTH cases, passwords and master keys exist in JavaScript variables
 * - These variables are isolated to the browser origin (hacka.re)
 * - A rogue script executing in hacka.re context could access ALL keys
 * - JavaScript runtime memory contains decrypted secrets during operation
 * - Browser DevTools can inspect variables containing keys and passwords
 * 
 * Security Implications:
 * - Direct access: Consider all data as plaintext-accessible
 * - Shared links: Cryptographically secure with key in URL fragment
 * - URL fragments (#...) are NOT sent to servers (client-side only)
 * - XSS or malicious scripts in hacka.re context can compromise all secrets
 * - Trust model assumes hacka.re code and dependencies are not compromised
 */

window.CryptoUtils = (function() {
    // Constants
    const SALT_LENGTH = 10; // 10 bytes for salt (80 bits)
    const NONCE_SEED_LENGTH = 10; // 10 bytes for nonce seed (80 bits)
    const NONCE_LENGTH = nacl.box.nonceLength; // 24 bytes - required by NaCl
    const LEGACY_SALT_LENGTH = 16; // Legacy 16 bytes for backward compatibility
    const KEY_LENGTH = 32; // seed and secretKey length
    const KEY_ITERATIONS = 10000; // Number of iterations for key derivation
    const NAMESPACE_PREFIX = 'hackare_namespace_';
    const MASTER_KEY_PREFIX = 'hackare_master_key_';
    
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
     * Generate a hash of a string (alias for sha256)
     * @param {string} input - The string to hash
     * @returns {string} Hex string of the hash
     */
    function hashString(input) {
        return sha256(input);
    }
    
    /**
     * Generate a random alphanumeric string of specified length
     * @param {number} length - The length of the string to generate
     * @returns {string} Random alphanumeric string
     */
    function generateRandomAlphaNum(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomValues = nacl.randomBytes(length);
        
        for (let i = 0; i < length; i++) {
            // Use modulo to ensure we get a valid index for the chars string
            const randomIndex = randomValues[i] % chars.length;
            result += chars.charAt(randomIndex);
        }
        
        return result;
    }
    
    /**
     * Generate a namespace hash from title and subtitle
     * @param {string} title - The title
     * @param {string} subtitle - The subtitle
     * @returns {string} SHA-256 hash of combined title and subtitle
     */
    function generateNamespaceHash(title, subtitle) {
        const combined = `${title}${subtitle}`;
        return sha256(combined);
    }
    
    /**
     * Generate a strong master key
     * @returns {string} A strong random key as hex string
     */
    function generateMasterKey() {
        // Generate a strong random key (32 bytes = 256 bits)
        const keyBytes = nacl.randomBytes(KEY_LENGTH);
        
        // Convert to hex string
        return Array.from(keyBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Generate a secret key (alias for generateMasterKey)
     * @returns {string} A strong random key as hex string
     */
    function generateSecretKey() {
        return generateMasterKey();
    }
    
    /**
     * Create a new namespace entry with encrypted hash
     * @param {string} title - The title
     * @param {string} subtitle - The subtitle
     * @returns {Object} Object containing namespaceId, namespaceHash, and masterKey
     */
    function createNamespaceEntry(title, subtitle) {
        // Generate the hash from title and subtitle
        const namespaceHash = generateNamespaceHash(title, subtitle);
        
        // Generate a random 8-character alphanumeric string for the namespace ID
        const namespaceId = generateRandomAlphaNum(8);
        
        // Generate a strong master key for encryption
        const masterKey = generateMasterKey();
        
        return {
            namespaceId: namespaceId,
            namespaceHash: namespaceHash,
            masterKey: masterKey
        };
    }
    
    /**
     * Get the master key storage key for a namespace ID
     * @param {string} namespaceId - The namespace ID
     * @returns {string} The master key storage key
     */
    function getMasterKeyStorageKey(namespaceId) {
        return `hackare_${namespaceId}_master_key`;
    }
    
    /**
     * Expand a 10-byte nonce seed to a 24-byte nonce
     * @param {Uint8Array} nonceSeed - The 10-byte seed to expand
     * @returns {Uint8Array} 24-byte nonce for NaCl
     */
    function expandNonceSeed(nonceSeed) {
        // Use SHA-512 hash to expand 10 bytes to 64 bytes
        const expanded = nacl.hash(nonceSeed);
        // Take first 24 bytes as nonce
        return expanded.slice(0, NONCE_LENGTH);
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
     * URL-safe base64 encode (directly from Uint8Array)
     * @param {Uint8Array} data - Data to encode
     * @returns {string} URL-safe base64 string
     */
    function encodeBase64UrlSafe(data) {
        const standardBase64 = nacl.util.encodeBase64(data);
        return standardBase64
            .replace(/\+/g, '-')  // Replace + with -
            .replace(/\//g, '_')  // Replace / with _
            .replace(/=/g, '');   // Remove padding =
    }
    
    /**
     * URL-safe base64 decode (directly to Uint8Array)
     * @param {string} urlSafeBase64 - URL-safe base64 string
     * @returns {Uint8Array} Decoded data
     */
    function decodeBase64UrlSafe(urlSafeBase64) {
        // Convert URL-safe base64 to standard base64
        let base64 = urlSafeBase64
            .replace(/-/g, '+')  // Replace - with +
            .replace(/_/g, '/'); // Replace _ with /
        
        // Add padding if needed
        const padding = base64.length % 4;
        if (padding === 2) {
            base64 += '==';
        } else if (padding === 3) {
            base64 += '=';
        }
        
        return nacl.util.decodeBase64(base64);
    }
    
    /**
     * Encrypt data with a password (for storage - NO DEBUG OUTPUT)
     * @param {*} payloadObj - The data to encrypt (can be any JSON-serializable value)
     * @param {string} password - The password to use for encryption
     * @param {boolean} suppressDebug - Ignored (kept for backward compatibility)
     * @returns {string} URL-safe base64-encoded encrypted data
     */
    function encryptData(payloadObj, password, suppressDebug = false) {
        // Convert to JSON string
        const jsonString = JSON.stringify(payloadObj);
        if (!jsonString) {
            throw new Error('Failed to stringify payload object');
        }
        
        const plain = nacl.util.decodeUTF8(jsonString);
        
        // Generate salt and derive key
        const salt = nacl.randomBytes(SALT_LENGTH);
        const key = deriveSeed(password, salt);
        
        // Generate nonce seed and expand to full nonce
        const nonceSeed = nacl.randomBytes(NONCE_SEED_LENGTH);
        const nonce = expandNonceSeed(nonceSeed);
        
        // Encrypt with secretbox (symmetric encryption)
        const cipher = nacl.secretbox(plain, nonce, key);
        
        // Combine salt, nonce seed, and cipher
        const fullMessage = new Uint8Array(
            salt.length + 
            nonceSeed.length + 
            cipher.length
        );
        
        let offset = 0;
        fullMessage.set(salt, offset);
        offset += salt.length;
        
        fullMessage.set(nonceSeed, offset);
        offset += nonceSeed.length;
        
        fullMessage.set(cipher, offset);
        
        // Convert directly to URL-safe base64 - NO DEBUG OUTPUT
        return encodeBase64UrlSafe(fullMessage);
    }
    
    /**
     * Encrypt share link data with a password (WITH DEBUG OUTPUT FOR STEPS 4 & 5)
     * @param {string} compressedData - The compressed data to encrypt (always a string for share links)
     * @param {string} password - The password to use for encryption
     * @param {boolean} suppressDebug - Whether to suppress debug messages (for size calculation)
     * @returns {string} URL-safe base64-encoded encrypted data
     */
    function encryptShareLink(compressedData, password, suppressDebug = false) {
        // Share links always receive compressed strings
        if (typeof compressedData !== 'string') {
            throw new Error('Share link encryption expects compressed string data');
        }
        
        // Convert to JSON string (the compressed data is already a string, so we're just wrapping it)
        const jsonString = JSON.stringify(compressedData);
        const plain = nacl.util.decodeUTF8(jsonString);
        
        // Generate salt and derive key
        const salt = nacl.randomBytes(SALT_LENGTH);
        const key = deriveSeed(password, salt);
        
        // Generate nonce seed and expand to full nonce
        const nonceSeed = nacl.randomBytes(NONCE_SEED_LENGTH);
        const nonce = expandNonceSeed(nonceSeed);
        
        // Encrypt with secretbox (symmetric encryption)
        const cipher = nacl.secretbox(plain, nonce, key);
        
        // STEP 4: Show encryption debug
        if (window.DebugService && window.DebugService.isCategoryEnabled('shared-links') && !suppressDebug) {
            const rawBinarySize = salt.length + nonceSeed.length + cipher.length;
            
            const encryptionDetails = [
                '🔐 ═══════════════════════════════════════════════════════════════',
                '🔐 STEP 4: ENCRYPTION (NaCl secretbox)',
                '🔐 ═══════════════════════════════════════════════════════════════',
                `🔐 Input (compressed): ${jsonString.length} chars`,
                `🔐 Cipher output: ${cipher.length} bytes`,
                `🔐 Auth tag overhead: ${cipher.length - plain.length} bytes`,
                '🔐 ───────────────────────────────────────────────────────────────',
                '🔐 Crypto parameters:',
                `🔐 - Salt: 10 bytes (80 bits)`,
                `🔐 - Nonce seed: 10 bytes (80 bits, expanded to 24)`,
                `🔐 - Algorithm: XSalsa20-Poly1305`,
                `🔐 - Key derivation: PBKDF2, ${KEY_ITERATIONS} iterations`,
                '🔐 ───────────────────────────────────────────────────────────────',
                `🔐 Binary structure: [salt(10)] + [nonce_seed(10)] + [cipher(${cipher.length})]`,
                `🔐 Total binary: ${rawBinarySize} bytes`,
                '🔐 ═══════════════════════════════════════════════════════════════'
            ].join('\n');
            
            console.log('[DEBUG] Encryption Details:', {
                input: jsonString.length,
                utf8: plain.length,
                salt: salt.length,
                nonceSeed: nonceSeed.length,
                expandedNonce: nonce.length,
                cipher: cipher.length,
                authTagOverhead: cipher.length - plain.length,
                totalBinary: rawBinarySize,
                cryptoOverhead: salt.length + nonceSeed.length
            });
            
            // Add to chat as a single system message if chat manager is available
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                window.aiHackare.chatManager.addSystemMessage(encryptionDetails, 'debug-message debug-shared-links');
            }
        }
        
        // Combine salt, nonce seed, and cipher
        const fullMessage = new Uint8Array(
            salt.length + 
            nonceSeed.length + 
            cipher.length
        );
        
        let offset = 0;
        fullMessage.set(salt, offset);
        offset += salt.length;
        
        fullMessage.set(nonceSeed, offset);
        offset += nonceSeed.length;
        
        fullMessage.set(cipher, offset);
        
        // Convert directly to URL-safe base64
        const base64Result = encodeBase64UrlSafe(fullMessage);
        
        // STEP 5: Show base64 encoding debug
        if (window.DebugService && window.DebugService.isCategoryEnabled('shared-links') && !suppressDebug) {
            const base64Message = [
                '📦 ═══════════════════════════════════════════════════════════════',
                '📦 STEP 5: BASE64 ENCODING',
                '📦 ═══════════════════════════════════════════════════════════════',
                `📦 Binary input: ${fullMessage.length} bytes`,
                `📦 Base64 output: ${base64Result.length} chars`,
                `📦 Expansion ratio: ${((base64Result.length / fullMessage.length) * 100).toFixed(1)}%`,
                `📦 Overhead: ${base64Result.length - fullMessage.length} chars`,
                '📦 ───────────────────────────────────────────────────────────────',
                '📦 Encoding: URL-safe (using - and _ instead of + and /)',
                '📦 ═══════════════════════════════════════════════════════════════'
            ].join('\n');
            
            console.log('[DEBUG] Base64 Encoding:', {
                binarySize: fullMessage.length,
                base64Size: base64Result.length,
                expansion: ((base64Result.length / fullMessage.length) * 100).toFixed(1) + '%'
            });
            
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                window.aiHackare.chatManager.addSystemMessage(base64Message, 'debug-message debug-shared-links');
            }
        }
        
        return base64Result;
    }
    
    /**
     * Decrypt encrypted data with a password
     * @param {string} encryptedData - URL-safe base64-encoded encrypted data
     * @param {string} password - The password to use for decryption
     * @returns {*} Decrypted data or null if decryption fails
     */
    function decryptData(encryptedData, password) {
        try {
            // Convert from URL-safe base64 to Uint8Array
            const data = decodeBase64UrlSafe(encryptedData);
            
            // Current format: salt(10) + nonceSeed(10) + cipher
            if (data.length < (SALT_LENGTH + NONCE_SEED_LENGTH + 16)) {
                return null; // Too small to be valid
            }
            
            // Extract components
            let offset = 0;
            const salt = data.slice(offset, offset + SALT_LENGTH);
            offset += SALT_LENGTH;
            
            const nonceSeed = data.slice(offset, offset + NONCE_SEED_LENGTH);
            offset += NONCE_SEED_LENGTH;
            
            const cipher = data.slice(offset);
            
            // Expand nonce seed to full nonce
            const nonce = expandNonceSeed(nonceSeed);
            
            // Derive key and decrypt
            const key = deriveSeed(password, salt);
            const plain = nacl.secretbox.open(cipher, nonce, key);
            
            if (!plain) {
                return null; // Decryption failed
            }
            
            // Convert to string and parse JSON
            const plainText = nacl.util.encodeUTF8(plain);
            try {
                return JSON.parse(plainText);
            } catch (jsonError) {
                return null; // Invalid JSON
            }
            
        } catch (error) {
            return null; // Any error means decryption failed
        }
    }
    
    // Public API
    return {
        deriveSeed: deriveSeed,
        getKeyPair: getKeyPair,
        encryptData: encryptData,
        encryptShareLink: encryptShareLink,  // New dedicated function for share links
        decryptData: decryptData,
        encodeBase64UrlSafe: encodeBase64UrlSafe,
        decodeBase64UrlSafe: decodeBase64UrlSafe,
        sha256: sha256,
        hashString: hashString,
        generateRandomAlphaNum: generateRandomAlphaNum,
        generateNamespaceHash: generateNamespaceHash,
        generateMasterKey: generateMasterKey,
        generateSecretKey: generateSecretKey,
        createNamespaceEntry: createNamespaceEntry,
        getMasterKeyStorageKey: getMasterKeyStorageKey,
        NAMESPACE_PREFIX: NAMESPACE_PREFIX,
        MASTER_KEY_PREFIX: MASTER_KEY_PREFIX
    };
})();
