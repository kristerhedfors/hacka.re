/**
 * Tests for title and subtitle functionality
 */

(function() {
    // Test suite for title and subtitle functionality
    function runTests() {
        console.log('Running title and subtitle tests...');
        
        // Test storage functions
        testStorageFunctions();
        
        // Test link sharing with title and subtitle
        testLinkSharingWithTitleSubtitle();
        
        console.log('Title and subtitle tests completed.');
    }
    
    // Test storage functions for title and subtitle
    function testStorageFunctions() {
        console.log('Testing storage functions for title and subtitle...');
        
        // Test default values
        const defaultTitle = StorageService.getTitle();
        const defaultSubtitle = StorageService.getSubtitle();
        
        console.assert(defaultTitle === "hacka.re", 
            `Default title should be "hacka.re", got "${defaultTitle}"`);
        console.assert(defaultSubtitle === "För hackare, av hackare", 
            `Default subtitle should be "För hackare, av hackare", got "${defaultSubtitle}"`);
        
        // Test saving and retrieving custom values
        const testTitle = "Test Title";
        const testSubtitle = "Test Subtitle";
        
        StorageService.saveTitle(testTitle);
        StorageService.saveSubtitle(testSubtitle);
        
        const savedTitle = StorageService.getTitle();
        const savedSubtitle = StorageService.getSubtitle();
        
        console.assert(savedTitle === testTitle, 
            `Saved title should be "${testTitle}", got "${savedTitle}"`);
        console.assert(savedSubtitle === testSubtitle, 
            `Saved subtitle should be "${testSubtitle}", got "${savedSubtitle}"`);
        
        // Reset to defaults for other tests
        StorageService.saveTitle("hacka.re");
        StorageService.saveSubtitle("För hackare, av hackare");
        
        console.log('Storage functions test completed.');
    }
    
    // Test link sharing with title and subtitle
    function testLinkSharingWithTitleSubtitle() {
        console.log('Testing link sharing with title and subtitle...');
        
        // Create a test payload with title and subtitle
        const testPayload = {
            apiKey: "test-api-key",
            title: "Custom Title",
            subtitle: "Custom Subtitle"
        };
        
        const testPassword = "test-password";
        
        // Create a shareable link with the test payload
        const shareableLink = LinkSharingService.createCustomShareableLink(testPayload, testPassword);
        
        // Mock location and history for testing
        const mockLocation = {
            hash: shareableLink.split('#')[1],
            href: "https://hacka.re/",
            pathname: "/",
            search: ""
        };
        
        const mockHistory = {
            replaceState: function() {}
        };
        
        // Set testing objects
        LinkSharingService._setTestingObjects(mockLocation, mockHistory);
        
        // Extract the shared data
        const extractedData = LinkSharingService.extractSharedApiKey(testPassword);
        
        // Reset testing objects
        LinkSharingService._resetTestingObjects();
        
        // Verify the extracted data
        console.assert(extractedData !== null, 
            "Extracted data should not be null");
        console.assert(extractedData.apiKey === testPayload.apiKey, 
            `Extracted API key should be "${testPayload.apiKey}", got "${extractedData.apiKey}"`);
        console.assert(extractedData.title === testPayload.title, 
            `Extracted title should be "${testPayload.title}", got "${extractedData.title}"`);
        console.assert(extractedData.subtitle === testPayload.subtitle, 
            `Extracted subtitle should be "${testPayload.subtitle}", got "${extractedData.subtitle}"`);
        
        console.log('Link sharing test completed.');
    }
    
    // Run the tests
    runTests();
})();
