/**
 * Tests for namespace storage functionality
 */

(function() {
    // Test suite for namespace storage functionality
    function runTests() {
        console.log('Running namespace storage tests...');
        
        // Test namespace generation
        testNamespaceGeneration();
        
        // Test namespaced storage
        testNamespacedStorage();
        
        // Test legacy data migration
        testLegacyDataMigration();
        
        // Test namespace changes with title/subtitle
        testNamespaceChanges();
        
        console.log('Namespace storage tests completed.');
    }
    
    // Test namespace generation
    function testNamespaceGeneration() {
        console.log('Testing namespace generation...');
        
        // Test with default title and subtitle
        const defaultTitle = "hacka.re";
        const defaultSubtitle = "För hackare av hackare";
        const defaultNamespace = CryptoUtils.generateNamespace(defaultTitle, defaultSubtitle);
        
        console.assert(typeof defaultNamespace === 'string', 
            'Namespace should be a string');
        console.assert(defaultNamespace.length === 8, 
            `Namespace should be 8 characters long, got ${defaultNamespace.length}`);
        console.assert(/^[0-9a-f]{8}$/.test(defaultNamespace), 
            'Namespace should be a valid hex string');
        
        // Test with custom title and subtitle
        const customTitle = "Custom Title";
        const customSubtitle = "Custom Subtitle";
        const customNamespace = CryptoUtils.generateNamespace(customTitle, customSubtitle);
        
        console.assert(customNamespace !== defaultNamespace, 
            'Different title/subtitle should produce different namespaces');
        
        // Test deterministic behavior (same input = same output)
        const repeatNamespace = CryptoUtils.generateNamespace(customTitle, customSubtitle);
        console.assert(repeatNamespace === customNamespace, 
            'Namespace generation should be deterministic');
        
        console.log('Namespace generation test completed.');
    }
    
    // Test namespaced storage
    function testNamespacedStorage() {
        console.log('Testing namespaced storage...');
        
        // Save original title and subtitle
        const originalTitle = StorageService.getTitle();
        const originalSubtitle = StorageService.getSubtitle();
        
        try {
            // Set custom title and subtitle to create a unique namespace
            StorageService.saveTitle("Test Title 1");
            StorageService.saveSubtitle("Test Subtitle 1");
            
            // Get the namespace for this title/subtitle
            const namespace1 = StorageService.getNamespace();
            
            // Save some test data
            StorageService.saveApiKey("test-api-key-1");
            StorageService.saveModel("test-model-1");
            
            // Change to a different title/subtitle to create a different namespace
            StorageService.saveTitle("Test Title 2");
            StorageService.saveSubtitle("Test Subtitle 2");
            
            // Get the namespace for this title/subtitle
            const namespace2 = StorageService.getNamespace();
            
            // Verify namespaces are different
            console.assert(namespace1 !== namespace2, 
                'Different title/subtitle should produce different namespaces');
            
            // Save different test data
            StorageService.saveApiKey("test-api-key-2");
            StorageService.saveModel("test-model-2");
            
            // Switch back to first title/subtitle
            StorageService.saveTitle("Test Title 1");
            StorageService.saveSubtitle("Test Subtitle 1");
            
            // Verify we get the original data
            console.assert(StorageService.getApiKey() === "test-api-key-1", 
                `Expected API key "test-api-key-1", got "${StorageService.getApiKey()}"`);
            console.assert(StorageService.getModel() === "test-model-1", 
                `Expected model "test-model-1", got "${StorageService.getModel()}"`);
            
            // Switch to second title/subtitle
            StorageService.saveTitle("Test Title 2");
            StorageService.saveSubtitle("Test Subtitle 2");
            
            // Verify we get the second set of data
            console.assert(StorageService.getApiKey() === "test-api-key-2", 
                `Expected API key "test-api-key-2", got "${StorageService.getApiKey()}"`);
            console.assert(StorageService.getModel() === "test-model-2", 
                `Expected model "test-model-2", got "${StorageService.getModel()}"`);
            
            console.log('Namespaced storage test completed.');
        } finally {
            // Clean up - restore original title and subtitle
            StorageService.saveTitle(originalTitle);
            StorageService.saveSubtitle(originalSubtitle);
            
            // Clean up test data
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.API_KEY));
            localStorage.removeItem(StorageService.getNamespacedKey(StorageService.STORAGE_KEYS.MODEL));
            
            // Also clean up the test namespaces
            const testNamespace1 = CryptoUtils.generateNamespace("Test Title 1", "Test Subtitle 1");
            const testNamespace2 = CryptoUtils.generateNamespace("Test Title 2", "Test Subtitle 2");
            
            localStorage.removeItem(`${testNamespace1}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
            localStorage.removeItem(`${testNamespace1}_${StorageService.BASE_STORAGE_KEYS.MODEL}`);
            localStorage.removeItem(`${testNamespace2}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
            localStorage.removeItem(`${testNamespace2}_${StorageService.BASE_STORAGE_KEYS.MODEL}`);
        }
    }
    
    // Test legacy data migration
    function testLegacyDataMigration() {
        console.log('Testing legacy data migration...');
        
        // Save original title and subtitle
        const originalTitle = StorageService.getTitle();
        const originalSubtitle = StorageService.getSubtitle();
        
        try {
            // Set custom title and subtitle to create a unique namespace
            StorageService.saveTitle("Migration Test Title");
            StorageService.saveSubtitle("Migration Test Subtitle");
            
            // Get the namespace for this title/subtitle
            const namespace = StorageService.getNamespace();
            
            // Set up legacy data (non-namespaced)
            localStorage.setItem(StorageService.BASE_STORAGE_KEYS.API_KEY, "legacy-api-key");
            localStorage.setItem(StorageService.BASE_STORAGE_KEYS.MODEL, "legacy-model");
            
            // Clear any existing namespaced data to ensure migration happens
            localStorage.removeItem(`${namespace}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
            localStorage.removeItem(`${namespace}_${StorageService.BASE_STORAGE_KEYS.MODEL}`);
            
            // Access the data, which should trigger migration
            const migratedApiKey = StorageService.getApiKey();
            const migratedModel = StorageService.getModel();
            
            // Verify migration happened correctly
            console.assert(migratedApiKey === "legacy-api-key", 
                `Expected migrated API key "legacy-api-key", got "${migratedApiKey}"`);
            console.assert(migratedModel === "legacy-model", 
                `Expected migrated model "legacy-model", got "${migratedModel}"`);
            
            // Verify data was saved to namespaced keys
            const namespacedApiKey = localStorage.getItem(`${namespace}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
            const namespacedModel = localStorage.getItem(`${namespace}_${StorageService.BASE_STORAGE_KEYS.MODEL}`);
            
            console.assert(namespacedApiKey === "legacy-api-key", 
                `Expected namespaced API key "legacy-api-key", got "${namespacedApiKey}"`);
            console.assert(namespacedModel === "legacy-model", 
                `Expected namespaced model "legacy-model", got "${namespacedModel}"`);
            
            console.log('Legacy data migration test completed.');
        } finally {
            // Clean up - restore original title and subtitle
            StorageService.saveTitle(originalTitle);
            StorageService.saveSubtitle(originalSubtitle);
            
            // Clean up test data
            localStorage.removeItem(StorageService.BASE_STORAGE_KEYS.API_KEY);
            localStorage.removeItem(StorageService.BASE_STORAGE_KEYS.MODEL);
            
            const testNamespace = CryptoUtils.generateNamespace("Migration Test Title", "Migration Test Subtitle");
            localStorage.removeItem(`${testNamespace}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
            localStorage.removeItem(`${testNamespace}_${StorageService.BASE_STORAGE_KEYS.MODEL}`);
        }
    }
    
    // Test namespace changes with title/subtitle
    function testNamespaceChanges() {
        console.log('Testing namespace changes with title/subtitle...');
        
        // Save original title and subtitle
        const originalTitle = StorageService.getTitle();
        const originalSubtitle = StorageService.getSubtitle();
        
        try {
            // Set initial title and subtitle
            StorageService.saveTitle("Initial Title");
            StorageService.saveSubtitle("Initial Subtitle");
            
            // Get the initial namespace
            const initialNamespace = StorageService.getNamespace();
            
            // Save some data
            StorageService.saveApiKey("initial-api-key");
            
            // Change just the title
            StorageService.saveTitle("Changed Title");
            
            // Get the new namespace
            const titleChangedNamespace = StorageService.getNamespace();
            
            // Verify namespace changed
            console.assert(initialNamespace !== titleChangedNamespace, 
                'Namespace should change when title changes');
            
            // Save different data
            StorageService.saveApiKey("title-changed-api-key");
            
            // Change just the subtitle
            StorageService.saveSubtitle("Changed Subtitle");
            
            // Get the new namespace
            const bothChangedNamespace = StorageService.getNamespace();
            
            // Verify namespace changed again
            console.assert(titleChangedNamespace !== bothChangedNamespace, 
                'Namespace should change when subtitle changes');
            
            // Save different data
            StorageService.saveApiKey("both-changed-api-key");
            
            // Go back to initial title/subtitle
            StorageService.saveTitle("Initial Title");
            StorageService.saveSubtitle("Initial Subtitle");
            
            // Verify we get the initial data
            console.assert(StorageService.getApiKey() === "initial-api-key", 
                `Expected API key "initial-api-key", got "${StorageService.getApiKey()}"`);
            
            // Go to title changed only
            StorageService.saveTitle("Changed Title");
            StorageService.saveSubtitle("Initial Subtitle");
            
            // Verify we get the title changed data
            console.assert(StorageService.getApiKey() === "title-changed-api-key", 
                `Expected API key "title-changed-api-key", got "${StorageService.getApiKey()}"`);
            
            // Go to both changed
            StorageService.saveTitle("Changed Title");
            StorageService.saveSubtitle("Changed Subtitle");
            
            // Verify we get the both changed data
            console.assert(StorageService.getApiKey() === "both-changed-api-key", 
                `Expected API key "both-changed-api-key", got "${StorageService.getApiKey()}"`);
            
            console.log('Namespace changes test completed.');
        } finally {
            // Clean up - restore original title and subtitle
            StorageService.saveTitle(originalTitle);
            StorageService.saveSubtitle(originalSubtitle);
            
            // Clean up test data
            const namespace1 = CryptoUtils.generateNamespace("Initial Title", "Initial Subtitle");
            const namespace2 = CryptoUtils.generateNamespace("Changed Title", "Initial Subtitle");
            const namespace3 = CryptoUtils.generateNamespace("Changed Title", "Changed Subtitle");
            
            localStorage.removeItem(`${namespace1}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
            localStorage.removeItem(`${namespace2}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
            localStorage.removeItem(`${namespace3}_${StorageService.BASE_STORAGE_KEYS.API_KEY}`);
        }
    }
    
    // Run the tests
    runTests();
})();
