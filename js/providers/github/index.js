/**
 * GitHub Provider Package Entry Point
 * Provides clean exports and registration helpers for the GitHub MCP provider
 */

// Export all modules - these will be loaded when the modules are imported
export { GitHubProvider } from './github-provider.js';
export { GitHubUI } from './github-ui.js';
export { GitHubAuth } from './github-auth.js';
export { GITHUB_TOOLS } from './github-tools.js';

/**
 * Create and configure a new GitHub provider instance
 * @param {Object} config - Provider configuration options
 * @returns {GitHubProvider} Configured provider instance
 */
export const createGitHubProvider = async (config = {}) => {
    const { GitHubProvider } = await import('./github-provider.js');
    return new GitHubProvider(config);
};

/**
 * Register GitHub provider with MCP system
 * @param {Object} mcpSystem - MCP system instance
 * @param {Object} config - Provider configuration
 * @returns {GitHubProvider} Registered provider instance
 */
export const registerGitHubProvider = async (mcpSystem, config = {}) => {
    const provider = await createGitHubProvider(config);
    if (mcpSystem.registerProvider) {
        mcpSystem.registerProvider('github', provider);
    }
    return provider;
};

/**
 * Provider metadata for discovery and registration
 */
export const GITHUB_PROVIDER_METADATA = {
    name: 'github',
    displayName: 'GitHub',
    description: 'Access GitHub repositories, issues, and pull requests',
    icon: 'fab fa-github',
    website: 'https://github.com',
    documentation: 'https://docs.github.com/en/rest',
    version: '1.0.0',
    capabilities: [
        'repository_access',
        'issue_management', 
        'pull_requests',
        'file_content',
        'advanced_search'
    ],
    requiredScopes: ['repo', 'read:user'],
    authType: 'pat'
};