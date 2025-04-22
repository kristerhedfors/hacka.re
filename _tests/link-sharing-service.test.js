/**
 * Unit Tests for LinkSharingService
 */

describe('LinkSharingService', function(it, beforeEach, afterEach) {
    // Test data
    let testApiKey;
    let testSystemPrompt;
    let testPassword;
    let originalLocation;
    
    beforeEach(function() {
        // Setup test data
        testApiKey = 'test-api-key-12345';
        testSystemPrompt = 'You are a helpful assistant.';
        testPassword = 'test-password';
        
        // Save original location properties
        originalLocation = {
            href: window.location.href,
            hash: window.location.hash
        };
        
        // Create mock location and history objects
        const mockLocation = {
            href: 'https://hacka.re/index.html',
            hash: '',
            pathname: '/index.html',
            search: ''
        };
        
        const mockHistory = {
            replaceState: function(state, title, url) {
                mockLocation.href = url;
                mockLocation.hash = url.includes('#') ? '#' + url.split('#')[1] : '';
            }
        };
        
        // Set the mock objects for testing
        LinkSharingService._setTestingObjects(mockLocation, mockHistory);
    });
    
    afterEach(function() {
        // Reset to original objects
        LinkSharingService._resetTestingObjects();
    });
    
    it('should create a shareable link with API key only', function(assert, assertEqual) {
        const link = LinkSharingService.createShareableLink(testApiKey, testPassword);
        
        // Verify the link is a string
        assert(typeof link === 'string', 'Link should be a string');
        
        // Verify the link starts with the correct base URL
        assert(link.startsWith('https://hacka.re/index.html#shared='), 'Link should have the correct format');
        
        // Extract the encrypted data
        const encryptedData = link.split('#shared=')[1];
        
        // Verify the encrypted data is not empty
        assert(encryptedData && encryptedData.length > 0, 'Encrypted data should not be empty');
        
        // Decrypt the data and verify it contains the API key
        const decryptedData = CryptoUtils.decryptData(encryptedData, testPassword);
        assertEqual(decryptedData.apiKey, testApiKey, 'Decrypted data should contain the API key');
        assertEqual(decryptedData.systemPrompt, undefined, 'Decrypted data should not contain a system prompt');
    });
    
    it('should create a shareable link with API key and system prompt', function(assert, assertEqual) {
        const link = LinkSharingService.createInsecureShareableLink(testApiKey, testSystemPrompt, testPassword);
        
        // Verify the link is a string
        assert(typeof link === 'string', 'Link should be a string');
        
        // Verify the link starts with the correct base URL
        assert(link.startsWith('https://hacka.re/index.html#shared='), 'Link should have the correct format');
        
        // Extract the encrypted data
        const encryptedData = link.split('#shared=')[1];
        
        // Verify the encrypted data is not empty
        assert(encryptedData && encryptedData.length > 0, 'Encrypted data should not be empty');
        
        // Decrypt the data and verify it contains both the API key and system prompt
        const decryptedData = CryptoUtils.decryptData(encryptedData, testPassword);
        assertEqual(decryptedData.apiKey, testApiKey, 'Decrypted data should contain the API key');
        assertEqual(decryptedData.systemPrompt, testSystemPrompt, 'Decrypted data should contain the system prompt');
    });
    
    it('should detect if the URL contains a shared API key', function(assert) {
        // Get access to the mock location object
        const mockLocation = {};
        LinkSharingService._setTestingObjects(mockLocation);
        
        // Test with no shared API key
        mockLocation.hash = '';
        assert(!LinkSharingService.hasSharedApiKey(), 'Should return false when no shared API key is present');
        
        // Test with a shared API key
        mockLocation.hash = '#shared=abc123';
        assert(LinkSharingService.hasSharedApiKey(), 'Should return true when a shared API key is present');
        
        // Test with other hash fragments
        mockLocation.hash = '#other=abc123';
        assert(!LinkSharingService.hasSharedApiKey(), 'Should return false when hash does not contain shared API key');
    });
    
    it('should extract and decrypt a shared API key from the URL', function(assert, assertEqual, assertDeepEqual) {
        // Create mock location with base URL
        const mockLocation = {
            href: 'https://hacka.re/index.html',
            hash: '',
            pathname: '/index.html',
            search: ''
        };
        LinkSharingService._setTestingObjects(mockLocation);
        
        // Create a shareable link
        const link = LinkSharingService.createShareableLink(testApiKey, testPassword);
        
        // Set the hash fragment
        mockLocation.hash = '#shared=' + link.split('#shared=')[1];
        
        // Extract the shared API key
        const extractedData = LinkSharingService.extractSharedApiKey(testPassword);
        
        // Verify the extracted data
        assert(extractedData !== null, 'Extracted data should not be null');
        assertEqual(extractedData.apiKey, testApiKey, 'Extracted API key should match the original');
        assertEqual(extractedData.systemPrompt, null, 'System prompt should be null for API key only links');
        
        // Create a shareable link with API key and system prompt
        const linkWithPrompt = LinkSharingService.createInsecureShareableLink(testApiKey, testSystemPrompt, testPassword);
        
        // Set the hash fragment
        mockLocation.hash = '#shared=' + linkWithPrompt.split('#shared=')[1];
        
        // Extract the shared API key and system prompt
        const extractedDataWithPrompt = LinkSharingService.extractSharedApiKey(testPassword);
        
        // Verify the extracted data
        assert(extractedDataWithPrompt !== null, 'Extracted data should not be null');
        assertEqual(extractedDataWithPrompt.apiKey, testApiKey, 'Extracted API key should match the original');
        assertEqual(extractedDataWithPrompt.systemPrompt, testSystemPrompt, 'Extracted system prompt should match the original');
    });
    
    it('should return null when extracting with wrong password', function(assert) {
        // Create mock location with base URL
        const mockLocation = {
            href: 'https://hacka.re/index.html',
            hash: '',
            pathname: '/index.html',
            search: ''
        };
        LinkSharingService._setTestingObjects(mockLocation);
        
        // Create a shareable link
        const link = LinkSharingService.createShareableLink(testApiKey, testPassword);
        
        // Set the hash fragment
        mockLocation.hash = '#shared=' + link.split('#shared=')[1];
        
        // Try to extract with wrong password
        const extractedData = LinkSharingService.extractSharedApiKey('wrong-password');
        
        // Verify extraction failed
        assert(extractedData === null, 'Extraction with wrong password should fail');
    });
    
    it('should return null when extracting from invalid hash', function(assert) {
        // Create mock location with base URL
        const mockLocation = {
            href: 'https://hacka.re/index.html',
            hash: '',
            pathname: '/index.html',
            search: ''
        };
        LinkSharingService._setTestingObjects(mockLocation);
        
        // Test with empty hash
        mockLocation.hash = '';
        assert(LinkSharingService.extractSharedApiKey(testPassword) === null, 'Should return null for empty hash');
        
        // Test with invalid hash format
        mockLocation.hash = '#shared=';
        assert(LinkSharingService.extractSharedApiKey(testPassword) === null, 'Should return null for invalid hash format');
        
        // Test with non-shared hash
        mockLocation.hash = '#other=abc123';
        assert(LinkSharingService.extractSharedApiKey(testPassword) === null, 'Should return null for non-shared hash');
    });
    
    it('should clear the shared API key from the URL', function(assert) {
        // Create mock location and history objects
        const mockLocation = {
            href: 'https://hacka.re/index.html',
            hash: '',
            pathname: '/index.html',
            search: ''
        };
        const mockHistory = {
            replaceState: function(state, title, url) {
                mockLocation.href = url;
                mockLocation.hash = '';
                mockLocation.pathname = url;
            }
        };
        LinkSharingService._setTestingObjects(mockLocation, mockHistory);
        
        // Set a hash fragment
        mockLocation.hash = '#shared=abc123';
        
        // Clear the shared API key
        LinkSharingService.clearSharedApiKeyFromUrl();
        
        // Verify the hash fragment is cleared
        assert(mockLocation.hash === '', 'Hash fragment should be cleared');
    });
});
