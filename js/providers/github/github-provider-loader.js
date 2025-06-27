/**
 * GitHub Provider Initialization Script
 * Initializes GitHub provider after all modules are loaded
 * 
 * Note: This script should be loaded AFTER all individual module scripts
 */

(function() {
    'use strict';
    
    console.log('GitHub Provider: Starting initialization...');
    
    // Check if all required dependencies are available
    const requiredClasses = ['GitHubAuth', 'GitHubTools', 'GitHubProvider', 'GitHubUI'];
    const missingClasses = requiredClasses.filter(className => !window[className]);
    
    if (missingClasses.length > 0) {
        console.error('GitHub Provider: Missing required classes:', missingClasses);
        console.error('GitHub Provider: Make sure all module scripts are loaded before this initialization script');
        return;
    }
    
    try {
        console.log('GitHub Provider: All modules loaded successfully');
        
        // Initialize UI for backward compatibility
        if (!window.GitHubTokenManager) {
            window.GitHubTokenManager = new window.GitHubUI();
            
            // Initialize asynchronously
            window.GitHubTokenManager.initialize().then(() => {
                console.log('GitHub Provider: GitHubTokenManager initialized');
            }).catch(error => {
                console.error('GitHub Provider: GitHubTokenManager initialization failed:', error);
            });
        }
        
        console.log('GitHub Provider (modular) loaded and initialized successfully');
        
        // Trigger event for any listeners waiting for provider to be ready
        window.dispatchEvent(new CustomEvent('github-provider-ready'));
        
    } catch (error) {
        console.error('GitHub Provider: Initialization failed:', error);
    }
})();