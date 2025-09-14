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
 * - Master key is derived from password + salt + nonce (not transmitted)
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
    const NONCE_LENGTH_STORED = 10; // 10 bytes for nonce stored in encrypted blob
    const NONCE_LENGTH_EXPANDED = 24; // 24 bytes required by NaCl after expansion
    const KEY_LENGTH = 32; // Final key length in bytes
    const KEY_ITERATIONS = 8192; // Number of iterations for key derivation (power of 2 for efficiency)
    const NAMESPACE_PREFIX = 'hackare_namespace_';
    const MASTER_KEY_PREFIX = 'hackare_master_key_';
    
    /**
     * Generate SHA-512 hash of input
     * @param {string} input - The string to hash
     * @returns {string} Hex string of the hash
     */
    function sha512(input) {
        // Convert input string to Uint8Array
        const inputBytes = nacl.util.decodeUTF8(input);
        
        // Use TweetNaCl's hash function (SHA-512)
        const hashBytes = nacl.hash(inputBytes);
        
        // Convert to hex string
        return Array.from(hashBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Generate a hash of a string (alias for sha512)
     * @param {string} input - The string to hash
     * @returns {string} Hex string of the hash
     */
    function hashString(input) {
        return sha512(input);
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
     * Generate namespace hash from title and subtitle
     * @param {string} title - The title
     * @param {string} subtitle - The subtitle
     * @returns {string} SHA-512 hash of combined title and subtitle
     */
    function generateNamespaceHash(title, subtitle) {
        const combined = `${title}${subtitle}`;
        return sha512(combined);
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
     * Derive decryption key from password + salt using iterative SHA-512
     * Algorithm: 8192 rounds of SHA512(previous_result + salt)
     * Keeps all 64 bytes on each iteration, only slices at the end
     * @param {string} password - The password to derive the key from
     * @param {Uint8Array} salt - The salt to use for key derivation
     * @returns {Uint8Array} Derived key (32 bytes)
     */
    function deriveDecryptionKey(password, salt) {
        // Convert password to Uint8Array
        const passwordBytes = nacl.util.decodeUTF8(password);
        
        // Start with password
        let result = passwordBytes;
        
        // 8192 iterations of: result = SHA512(result + salt)
        // Keep ALL 64 bytes on each iteration for maximum entropy
        for (let i = 0; i < KEY_ITERATIONS; i++) {
            // Combine current result with salt
            const input = new Uint8Array(result.length + salt.length);
            input.set(result);
            input.set(salt, result.length);
            
            // Hash it - keep ALL 64 bytes for next iteration
            result = nacl.hash(input); // SHA-512 produces 64 bytes
        }
        
        // Only slice to 32 bytes at the very end
        return result.slice(0, KEY_LENGTH);
    }
    
    /**
     * Derive a master key from password + salt + nonce using iterative SHA-512
     * Algorithm: 8192 rounds of SHA512(previous_result + salt + nonce)
     * Keeps all 64 bytes on each iteration, only slices at the end
     * @param {string} password - The password used for the shared link
     * @param {Uint8Array} salt - The salt from the encrypted blob (10 bytes)
     * @param {Uint8Array} nonce - The nonce from the encrypted blob (10 bytes)
     * @returns {string} Hex string of the derived master key
     */
    function deriveMasterKey(password, salt, nonce) {
        // Convert password to Uint8Array
        const passwordBytes = nacl.util.decodeUTF8(password);
        
        // Start with password
        let result = passwordBytes;
        
        // 8192 iterations of: result = SHA512(result + salt + nonce)
        // Keep ALL 64 bytes on each iteration for maximum entropy
        for (let i = 0; i < KEY_ITERATIONS; i++) {
            // Combine current result with salt AND nonce
            const input = new Uint8Array(result.length + salt.length + nonce.length);
            input.set(result);
            input.set(salt, result.length);
            input.set(nonce, result.length + salt.length);
            
            // Hash it - keep ALL 64 bytes for next iteration
            result = nacl.hash(input); // SHA-512 produces 64 bytes
        }
        
        // Only slice to 32 bytes at the very end, then convert to hex
        const finalKey = result.slice(0, KEY_LENGTH);
        return Array.from(finalKey)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    /**
     * Derive namespace hash from decryption key, master key, and nonce
     * Uses SHA-512 hash of concatenated keys and nonce
     * @param {Uint8Array} decryptionKey - The decryption key (32 bytes)
     * @param {string} masterKeyHex - The master key as hex string
     * @param {Uint8Array} nonce - The nonce (10 bytes)
     * @returns {string} Hex string of the namespace hash (full SHA-512)
     */
    function deriveNamespaceHash(decryptionKey, masterKeyHex, nonce) {
        // Convert master key from hex to bytes
        const masterKeyBytes = new Uint8Array(masterKeyHex.length / 2);
        for (let i = 0; i < masterKeyHex.length; i += 2) {
            masterKeyBytes[i / 2] = parseInt(masterKeyHex.substr(i, 2), 16);
        }
        
        // Combine decryptionKey + masterKey + nonce
        const combined = new Uint8Array(
            decryptionKey.length + masterKeyBytes.length + nonce.length
        );
        let offset = 0;
        combined.set(decryptionKey, offset);
        offset += decryptionKey.length;
        combined.set(masterKeyBytes, offset);
        offset += masterKeyBytes.length;
        combined.set(nonce, offset);
        
        // Hash with SHA-512
        const hashBytes = nacl.hash(combined);
        
        // Return as hex string
        return Array.from(hashBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
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
        
        // Generate salt (10 bytes) and nonce (10 bytes)
        const salt = nacl.randomBytes(SALT_LENGTH);
        const nonce = nacl.randomBytes(NONCE_LENGTH_STORED);
        
        // Derive decryption key: 8192 rounds of SHA512(previous + salt)
        const key = deriveDecryptionKey(password, salt);
        
        // Expand nonce to 24 bytes with single SHA-512
        const expandedNonce = nacl.hash(nonce).slice(0, NONCE_LENGTH_EXPANDED);
        
        // Encrypt with secretbox (symmetric encryption)
        const cipher = nacl.secretbox(plain, expandedNonce, key);
        
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
        
        // Generate salt (10 bytes) and nonce (10 bytes)
        const salt = nacl.randomBytes(SALT_LENGTH);
        const nonce = nacl.randomBytes(NONCE_LENGTH_STORED);
        
        // Derive decryption key: 8192 rounds of SHA512(previous + salt)
        const key = deriveDecryptionKey(password, salt);
        
        // Expand nonce to 24 bytes with single SHA-512
        const expandedNonce = nacl.hash(nonce).slice(0, NONCE_LENGTH_EXPANDED);
        
        // Encrypt with secretbox (symmetric encryption)
        const cipher = nacl.secretbox(plain, expandedNonce, key);
        
        // STEP 4: Show encryption debug
        if (window.DebugService && window.DebugService.isCategoryEnabled('shared-links') && !suppressDebug) {
            const rawBinarySize = salt.length + nonce.length + cipher.length;
            
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
                `🔐 - Nonce: 10 bytes (80 bits, expanded to 24)`,
                `🔐 - Algorithm: XSalsa20-Poly1305`,
                `🔐 - Key derivation: SHA-512 iterative, ${KEY_ITERATIONS} rounds`,
                '🔐 ───────────────────────────────────────────────────────────────',
                `🔐 Binary structure: [salt(10)] + [nonce(10)] + [cipher(${cipher.length})]`,
                `🔐 Total binary: ${rawBinarySize} bytes`,
                '🔐 ═══════════════════════════════════════════════════════════════'
            ].join('\n');
            
            console.log('[DEBUG] Encryption Details:', {
                input: jsonString.length,
                utf8: plain.length,
                salt: salt.length,
                nonce: nonce.length,
                expandedNonce: expandedNonce.length,
                cipher: cipher.length,
                authTagOverhead: cipher.length - plain.length,
                totalBinary: rawBinarySize,
                cryptoOverhead: salt.length + nonce.length
            });
            
            // Add to chat as a single system message if chat manager is available
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                window.aiHackare.chatManager.addSystemMessage(encryptionDetails, 'debug-message debug-shared-links');
            }
        }
        
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
            
            // Current format: salt(10) + nonce(10) + cipher
            if (data.length < (SALT_LENGTH + NONCE_LENGTH_STORED + 16)) {
                return null; // Too small to be valid
            }
            
            // Extract components
            let offset = 0;
            const salt = data.slice(offset, offset + SALT_LENGTH);
            offset += SALT_LENGTH;
            
            const nonce = data.slice(offset, offset + NONCE_LENGTH_STORED);
            offset += NONCE_LENGTH_STORED;
            
            const cipher = data.slice(offset);
            
            // Expand nonce to 24 bytes with single SHA-512
            const expandedNonce = nacl.hash(nonce).slice(0, NONCE_LENGTH_EXPANDED);
            
            // Derive decryption key: 8192 rounds of SHA512(previous + salt)
            const key = deriveDecryptionKey(password, salt);
            const plain = nacl.secretbox.open(cipher, expandedNonce, key);
            
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
        deriveDecryptionKey: deriveDecryptionKey,
        deriveMasterKey: deriveMasterKey,
        deriveNamespaceHash: deriveNamespaceHash,
        encryptData: encryptData,
        encryptShareLink: encryptShareLink,  // New dedicated function for share links
        decryptData: decryptData,
        encodeBase64UrlSafe: encodeBase64UrlSafe,
        decodeBase64UrlSafe: decodeBase64UrlSafe,
        sha512: sha512,
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
