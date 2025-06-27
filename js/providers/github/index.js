/**
 * GitHub Provider Package Entry Point
 * Provides clean exports and registration helpers for the GitHub MCP provider
 * 
 * Dependencies: window.GitHubProvider, window.GitHubUI, window.GitHubAuth, window.GITHUB_TOOLS
 */

/**
 * Create and configure a new GitHub provider instance
 * @param {Object} config - Provider configuration options
 * @returns {GitHubProvider} Configured provider instance
 */
window.createGitHubProvider = async (config = {}) => {
    return new window.GitHubProvider(config);
};

/**
 * Register GitHub provider with MCP system
 * @param {Object} mcpSystem - MCP system instance
 * @param {Object} config - Provider configuration
 * @returns {GitHubProvider} Registered provider instance
 */
window.registerGitHubProvider = async (mcpSystem, config = {}) => {
    const provider = await window.createGitHubProvider(config);
    if (mcpSystem.registerProvider) {
        mcpSystem.registerProvider('github', provider);
    }
    return provider;
};

/**
 * Provider metadata for discovery and registration
 */
window.GITHUB_PROVIDER_METADATA = {
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