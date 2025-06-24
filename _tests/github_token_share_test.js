/**
 * GitHub Token Sharing Test
 * Simple test to verify GitHub token sharing functionality works correctly
 */

// Mock dependencies for testing
window.FunctionToolsService = {
    getJsFunctions: () => ({
        testFunction: 'function test() { return "hello"; }'
    }),
    getEnabledFunctionNames: () => ['testFunction']
};

window.CryptoUtils = {
    encryptData: (data, password) => {
        // Simple base64 encoding for testing
        return btoa(JSON.stringify(data) + ':' + password);
    },
    decryptData: (encryptedData, password) => {
        try {
            const decoded = atob(encryptedData);
            const [dataStr, pass] = decoded.split(':');
            if (pass !== password) return null;
            return JSON.parse(dataStr);
        } catch {
            return null;
        }
    }
};

// Test the GitHub token sharing
async function testGithubTokenSharing() {
    console.log('🧪 Testing GitHub Token Sharing...');
    
    // Test data
    const testToken = 'ghp_test1234567890abcdefghijklmnopqrstuvwxyz';
    const testPassword = 'testpass123';
    
    try {
        // Test 1: Create minimal GitHub token share link (token only)
        console.log('📝 Test 1: Creating minimal GitHub token link...');
        const minimalLink = await window.LinkSharingService.createGithubTokenShareableLink(
            testToken, 
            testPassword, 
            { includeFunctionLibrary: false }
        );
        
        console.log('✅ Minimal link created:', minimalLink.length, 'characters');
        console.log('📏 Link: ', minimalLink.substring(0, 100) + '...');
        
        // Test 2: Create GitHub token share link with functions
        console.log('📝 Test 2: Creating GitHub token link with functions...');
        const functionsLink = await window.LinkSharingService.createGithubTokenShareableLink(
            testToken, 
            testPassword, 
            { includeFunctionLibrary: true }
        );
        
        console.log('✅ Functions link created:', functionsLink.length, 'characters');
        console.log('📏 Link: ', functionsLink.substring(0, 100) + '...');
        
        // Test 3: Compare sizes
        console.log('📊 Size comparison:');
        console.log('   Minimal link:', minimalLink.length, 'chars');
        console.log('   With functions:', functionsLink.length, 'chars');
        console.log('   Size difference:', functionsLink.length - minimalLink.length, 'chars');
        
        // Test 4: Extract and verify data
        console.log('📝 Test 3: Extracting shared data...');
        
        // Extract minimal link data
        const extractedMinimal = window.LinkSharingService.extractSharedApiKey(testPassword);
        if (extractedMinimal && extractedMinimal.mcpConnections && extractedMinimal.mcpConnections.github === testToken) {
            console.log('✅ Minimal link extraction successful');
        } else {
            console.error('❌ Minimal link extraction failed');
        }
        
        // Test 5: Test GitHub Token Manager method
        console.log('📝 Test 4: Testing GitHub Token Manager...');
        
        // Mock storage for testing
        window.CoreStorageService = {
            getValue: async (key) => {
                if (key === 'mcp_github_token') return testToken;
                return null;
            }
        };
        
        const managerLink = await window.GitHubTokenManager.createShareableLink(testPassword, {
            includeFunctionLibrary: false
        });
        
        if (managerLink) {
            console.log('✅ GitHub Token Manager link created:', managerLink.length, 'characters');
        } else {
            console.error('❌ GitHub Token Manager link creation failed');
        }
        
        console.log('🎉 All GitHub Token Sharing tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testGithubTokenSharing, 1000);
});