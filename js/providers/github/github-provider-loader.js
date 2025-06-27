/**
 * GitHub Provider Loader
 * Loads all GitHub provider modules in the correct order
 */

(async function() {
    'use strict';
    
    try {
        console.log('GitHub Provider: Starting module loading...');
        
        // Load modules in dependency order
        const { GitHubAuth } = await import('./github-auth.js');
        const { GitHubTools } = await import('./github-tools.js');
        const { GitHubProvider } = await import('./github-provider.js');
        const { GitHubUI } = await import('./github-ui.js');
        
        console.log('GitHub Provider: All modules loaded successfully');
        
        // Make available globally for backward compatibility
        window.GitHubProvider = GitHubProvider;
        window.GitHubUI = GitHubUI;
        window.GitHubAuth = GitHubAuth;
        window.GitHubTools = GitHubTools;
        
        // Initialize UI for backward compatibility
        window.GitHubTokenManager = new GitHubUI();
        await window.GitHubTokenManager.initialize();
        
        console.log('GitHub Provider (modular) loaded and initialized successfully');
        
        // Trigger event for any listeners waiting for provider to be ready
        window.dispatchEvent(new CustomEvent('github-provider-ready'));
        
    } catch (error) {
        console.error('GitHub Provider: Failed to load modules:', error);
        
        // Try to fall back to the old provider if it exists
        if (window.location.search.includes('fallback=true')) {
            console.log('GitHub Provider: Attempting fallback to legacy provider');
            try {
                const script = document.createElement('script');
                script.src = '../../services/github-provider.js';
                document.head.appendChild(script);
            } catch (fallbackError) {
                console.error('GitHub Provider: Fallback also failed:', fallbackError);
            }
        }
    }
})();