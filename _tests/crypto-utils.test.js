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
    
    it('should derive a seed from password and salt', function(assert, assertEqual) {
        const seed = CryptoUtils.deriveSeed(testPassword, testSalt);
        
        // Verify the seed is a Uint8Array of the correct length
        assert(seed instanceof Uint8Array, 'Seed should be a Uint8Array');
        assertEqual(seed.length, 32, 'Seed should be 32 bytes long');
        
        // Verify the seed is deterministic (same password + salt = same seed)
        const seed2 = CryptoUtils.deriveSeed(testPassword, testSalt);
        assert(seed.every((val, i) => val === seed2[i]), 'Seed should be deterministic');
        
        // Verify different passwords produce different seeds
        const differentSeed = CryptoUtils.deriveSeed('different-password', testSalt);
        assert(!seed.every((val, i) => val === differentSeed[i]), 'Different passwords should produce different seeds');
    });
    
    it('should generate a key pair from a seed', function(assert, assertEqual) {
        const keyPair = CryptoUtils.getKeyPair(testPassword, testSalt);
        
        // Verify the key pair has the correct properties
        assert(keyPair.publicKey instanceof Uint8Array, 'Public key should be a Uint8Array');
        assert(keyPair.secretKey instanceof Uint8Array, 'Secret key should be a Uint8Array');
        assertEqual(keyPair.publicKey.length, nacl.box.publicKeyLength, 'Public key should have the correct length');
        assertEqual(keyPair.secretKey.length, nacl.box.secretKeyLength, 'Secret key should have the correct length');
        
        // Verify the key pair is deterministic (same password + salt = same key pair)
        const keyPair2 = CryptoUtils.getKeyPair(testPassword, testSalt);
        assert(keyPair.publicKey.every((val, i) => val === keyPair2.publicKey[i]), 'Public key should be deterministic');
        assert(keyPair.secretKey.every((val, i) => val === keyPair2.secretKey[i]), 'Secret key should be deterministic');
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
