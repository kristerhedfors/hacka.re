/**
 * Unit Tests for ShareService
 * 
 * These tests verify that ShareService correctly delegates to LinkSharingService
 * and maintains backward compatibility.
 */

describe('ShareService', function(it, beforeEach, afterEach) {
    // Test data
    let testApiKey;
    let testSystemPrompt;
    let testPassword;
    
    // Spy tracking
    let linkSharingServiceSpies = {};
    
    beforeEach(function() {
        // Setup test data
        testApiKey = 'test-api-key-12345';
        testSystemPrompt = 'You are a helpful assistant.';
        testPassword = 'test-password';
        
        // Setup spies on LinkSharingService methods
        linkSharingServiceSpies = {
            createShareableLink: spyOn(LinkSharingService, 'createShareableLink'),
            createInsecureShareableLink: spyOn(LinkSharingService, 'createInsecureShareableLink'),
            hasSharedApiKey: spyOn(LinkSharingService, 'hasSharedApiKey'),
            extractSharedApiKey: spyOn(LinkSharingService, 'extractSharedApiKey'),
            clearSharedApiKeyFromUrl: spyOn(LinkSharingService, 'clearSharedApiKeyFromUrl')
        };
    });
    
    afterEach(function() {
        // Restore original methods
        for (const method in linkSharingServiceSpies) {
            linkSharingServiceSpies[method].restore();
        }
    });
    
    it('should delegate createShareableLink to LinkSharingService', function(assert) {
        // Setup spy to return a test value
        linkSharingServiceSpies.createShareableLink.andReturn('test-link');
        
        // Call the method
        const result = ShareService.createShareableLink(testApiKey, testPassword);
        
        // Verify the spy was called with the correct arguments
        assert(linkSharingServiceSpies.createShareableLink.called, 'LinkSharingService.createShareableLink should be called');
        assert(linkSharingServiceSpies.createShareableLink.calledWith(testApiKey, testPassword), 
               'LinkSharingService.createShareableLink should be called with the correct arguments');
        
        // Verify the result is passed through
        assert(result === 'test-link', 'Result should be passed through from LinkSharingService');
    });
    
    it('should delegate createInsecureShareableLink to LinkSharingService', function(assert) {
        // Setup spy to return a test value
        linkSharingServiceSpies.createInsecureShareableLink.andReturn('test-link-with-prompt');
        
        // Call the method
        const result = ShareService.createInsecureShareableLink(testApiKey, testSystemPrompt, testPassword);
        
        // Verify the spy was called with the correct arguments
        assert(linkSharingServiceSpies.createInsecureShareableLink.called, 'LinkSharingService.createInsecureShareableLink should be called');
        assert(linkSharingServiceSpies.createInsecureShareableLink.calledWith(testApiKey, testSystemPrompt, testPassword), 
               'LinkSharingService.createInsecureShareableLink should be called with the correct arguments');
        
        // Verify the result is passed through
        assert(result === 'test-link-with-prompt', 'Result should be passed through from LinkSharingService');
    });
    
    it('should delegate hasSharedApiKey to LinkSharingService', function(assert) {
        // Setup spy to return a test value
        linkSharingServiceSpies.hasSharedApiKey.andReturn(true);
        
        // Call the method
        const result = ShareService.hasSharedApiKey();
        
        // Verify the spy was called
        assert(linkSharingServiceSpies.hasSharedApiKey.called, 'LinkSharingService.hasSharedApiKey should be called');
        
        // Verify the result is passed through
        assert(result === true, 'Result should be passed through from LinkSharingService');
    });
    
    it('should delegate extractSharedApiKey to LinkSharingService', function(assert) {
        // Setup spy to return a test value
        const testData = { apiKey: testApiKey, systemPrompt: testSystemPrompt };
        linkSharingServiceSpies.extractSharedApiKey.andReturn(testData);
        
        // Call the method
        const result = ShareService.extractSharedApiKey(testPassword);
        
        // Verify the spy was called with the correct arguments
        assert(linkSharingServiceSpies.extractSharedApiKey.called, 'LinkSharingService.extractSharedApiKey should be called');
        assert(linkSharingServiceSpies.extractSharedApiKey.calledWith(testPassword), 
               'LinkSharingService.extractSharedApiKey should be called with the correct arguments');
        
        // Verify the result is passed through
        assert(result === testData, 'Result should be passed through from LinkSharingService');
    });
    
    it('should delegate clearSharedApiKeyFromUrl to LinkSharingService', function(assert) {
        // Call the method
        ShareService.clearSharedApiKeyFromUrl();
        
        // Verify the spy was called
        assert(linkSharingServiceSpies.clearSharedApiKeyFromUrl.called, 'LinkSharingService.clearSharedApiKeyFromUrl should be called');
    });
});

/**
 * Helper function to create a spy on an object's method
 * @param {Object} obj - The object containing the method
 * @param {string} method - The name of the method to spy on
 * @returns {Object} The spy object
 */
function spyOn(obj, method) {
    const original = obj[method];
    const spy = {
        called: false,
        callCount: 0,
        calls: [],
        andReturn: function(value) {
            this.returnValue = value;
            return this;
        },
        calledWith: function(...args) {
            return this.calls.some(call => {
                if (call.length !== args.length) return false;
                for (let i = 0; i < args.length; i++) {
                    if (call[i] !== args[i]) return false;
                }
                return true;
            });
        },
        restore: function() {
            obj[method] = original;
        }
    };
    
    obj[method] = function(...args) {
        spy.called = true;
        spy.callCount++;
        spy.calls.push(args);
        return spy.returnValue;
    };
    
    return spy;
}
