/**
 * Unit Tests for CryptoUtils
 */

describe('CryptoUtils', function(it, beforeEach, afterEach) {
    // Test data
    let testPassword;
    let testSalt;
    let testData;
    
    beforeEach(function() {
        // Setup test data
        testPassword = 'test-password';
        testSalt = new Uint8Array(16).fill(1); // Fixed salt for deterministic tests
        testData = { foo: 'bar', num: 123 };
    });
    
    it('should derive a decryption key from password and salt', function(assert, assertEqual) {
        const key = CryptoUtils.deriveDecryptionKey(testPassword, testSalt);
        
        // Verify the key is a Uint8Array of the correct length
        assert(key instanceof Uint8Array, 'Key should be a Uint8Array');
        assertEqual(key.length, 32, 'Key should be 32 bytes long');
        
        // Verify the key is deterministic (same password + salt = same key)
        const key2 = CryptoUtils.deriveDecryptionKey(testPassword, testSalt);
        assert(key.every((val, i) => val === key2[i]), 'Key should be deterministic');
        
        // Verify different passwords produce different keys
        const differentKey = CryptoUtils.deriveDecryptionKey('different-password', testSalt);
        assert(!key.every((val, i) => val === differentKey[i]), 'Different passwords should produce different keys');
    });
    
    it('should derive a master key from password, salt, and nonce', function(assert, assertEqual) {
        const testNonce = new Uint8Array(10).fill(2); // Fixed nonce for deterministic tests
        const masterKey = CryptoUtils.deriveMasterKey(testPassword, testSalt, testNonce);
        
        // Verify the master key is a hex string of the correct length
        assert(typeof masterKey === 'string', 'Master key should be a string');
        assertEqual(masterKey.length, 64, 'Master key should be 64 hex characters (32 bytes)');
        
        // Verify the master key is deterministic
        const masterKey2 = CryptoUtils.deriveMasterKey(testPassword, testSalt, testNonce);
        assertEqual(masterKey, masterKey2, 'Master key should be deterministic');
        
        // Verify different inputs produce different master keys
        const differentMasterKey = CryptoUtils.deriveMasterKey('different-password', testSalt, testNonce);
        assert(masterKey !== differentMasterKey, 'Different passwords should produce different master keys');
    });
    
    it('should encrypt and decrypt data correctly', function(assert, assertEqual, assertDeepEqual) {
        // Encrypt the test data
        const encryptedData = CryptoUtils.encryptData(testData, testPassword);
        
        // Verify the encrypted data is a string
        assert(typeof encryptedData === 'string', 'Encrypted data should be a string');
        
        // Decrypt the data
        const decryptedData = CryptoUtils.decryptData(encryptedData, testPassword);
        
        // Verify the decrypted data matches the original
        assertDeepEqual(decryptedData, testData, 'Decrypted data should match the original');
    });
    
    it('should fail to decrypt with wrong password', function(assert) {
        // Encrypt the test data
        const encryptedData = CryptoUtils.encryptData(testData, testPassword);
        
        // Try to decrypt with wrong password
        const decryptedData = CryptoUtils.decryptData(encryptedData, 'wrong-password');
        
        // Verify decryption failed
        assert(decryptedData === null, 'Decryption with wrong password should fail');
    });
    
    it('should handle different data types correctly', function(assert, assertDeepEqual) {
        // Test with string
        const stringData = 'test string data';
        const encryptedString = CryptoUtils.encryptData(stringData, testPassword);
        const decryptedString = CryptoUtils.decryptData(encryptedString, testPassword);
        assertDeepEqual(decryptedString, stringData, 'Should handle string data correctly');
        
        // Test with number
        const numberData = 12345;
        const encryptedNumber = CryptoUtils.encryptData(numberData, testPassword);
        const decryptedNumber = CryptoUtils.decryptData(encryptedNumber, testPassword);
        assertDeepEqual(decryptedNumber, numberData, 'Should handle number data correctly');
        
        // Test with array
        const arrayData = [1, 2, 3, 'test', { nested: 'object' }];
        const encryptedArray = CryptoUtils.encryptData(arrayData, testPassword);
        const decryptedArray = CryptoUtils.decryptData(encryptedArray, testPassword);
        assertDeepEqual(decryptedArray, arrayData, 'Should handle array data correctly');
        
        // Test with complex object
        const complexData = {
            string: 'test',
            number: 123,
            boolean: true,
            array: [1, 2, 3],
            nested: {
                foo: 'bar',
                baz: [4, 5, 6]
            }
        };
        const encryptedComplex = CryptoUtils.encryptData(complexData, testPassword);
        const decryptedComplex = CryptoUtils.decryptData(encryptedComplex, testPassword);
        assertDeepEqual(decryptedComplex, complexData, 'Should handle complex object data correctly');
    });
    
    it('should handle empty or null data', function(assert, assertDeepEqual) {
        // Test with empty string
        const emptyString = '';
        const encryptedEmpty = CryptoUtils.encryptData(emptyString, testPassword);
        const decryptedEmpty = CryptoUtils.decryptData(encryptedEmpty, testPassword);
        assertDeepEqual(decryptedEmpty, emptyString, 'Should handle empty string correctly');
        
        // Test with empty object
        const emptyObject = {};
        const encryptedEmptyObj = CryptoUtils.encryptData(emptyObject, testPassword);
        const decryptedEmptyObj = CryptoUtils.decryptData(encryptedEmptyObj, testPassword);
        assertDeepEqual(decryptedEmptyObj, emptyObject, 'Should handle empty object correctly');
        
        // Test with null
        const nullData = null;
        const encryptedNull = CryptoUtils.encryptData(nullData, testPassword);
        const decryptedNull = CryptoUtils.decryptData(encryptedNull, testPassword);
        assertDeepEqual(decryptedNull, nullData, 'Should handle null correctly');
    });
    
    it('should handle long passwords', function(assert, assertDeepEqual) {
        // Test with a very long password
        const longPassword = 'a'.repeat(1000);
        const encryptedWithLongPw = CryptoUtils.encryptData(testData, longPassword);
        const decryptedWithLongPw = CryptoUtils.decryptData(encryptedWithLongPw, longPassword);
        assertDeepEqual(decryptedWithLongPw, testData, 'Should handle long passwords correctly');
    });
});
