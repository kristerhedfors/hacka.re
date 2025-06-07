/**
 * Default Prompts Index - OpenAI Proxy Collection
 * 
 * Navigation structure for the hacka.re default prompts library
 * OpenAI Proxy implementations and guides
 */

// Import all prompt modules
const { OPENAI_PROXY_OVERVIEW } = require('./openai_proxy_overview');
const { OPENAI_PROXIES_PROMPT } = require('./openai_proxy/python');

/**
 * Complete navigation tree for OpenAI Proxy prompts
 */
const OPENAI_PROXY_TREE = {
    "OpenAI Proxy": {
        overview: OPENAI_PROXY_OVERVIEW,
        children: {
            "Python": {
                content: OPENAI_PROXIES_PROMPT,
                description: "Complete collection of 5 minimal Python proxy implementations",
                implementations: [
                    "Starlette Streaming Proxy (20-25 lines) - Production recommended",
                    "Flask Ecosystem Proxy (20-25 lines) - Rapid development", 
                    "Pure WSGI Proxy (12-15 lines) - Absolute minimal",
                    "HMAC Authenticated Proxy (35 lines) - Shared secret security",
                    "Ed25519 Digital Signature Proxy (40 lines) - Strongest security"
                ]
            }
            // Future implementations will be added here:
            // "Node.js": { ... },
            // "Go": { ... },
            // "Rust": { ... },
            // "Docker": { ... }
        }
    }
};

/**
 * Get prompt by navigation path
 * @param {string} path - Navigation path (e.g., "OpenAI Proxy" or "OpenAI Proxy > Python")
 * @returns {string|object} The prompt content or navigation object
 */
function getPromptByPath(path) {
    const parts = path.split(' > ').map(p => p.trim());
    
    if (parts.length === 1 && parts[0] === "OpenAI Proxy") {
        return OPENAI_PROXY_OVERVIEW;
    }
    
    if (parts.length === 2 && parts[0] === "OpenAI Proxy" && parts[1] === "Python") {
        return OPENAI_PROXIES_PROMPT;
    }
    
    return null;
}

/**
 * Get all available navigation paths
 * @returns {string[]} Array of available paths
 */
function getAvailablePaths() {
    return [
        "OpenAI Proxy",
        "OpenAI Proxy > Python"
    ];
}

/**
 * Get tree structure for navigation
 * @returns {object} Complete tree structure
 */
function getNavigationTree() {
    return OPENAI_PROXY_TREE;
}

// Export all functions and constants
module.exports = {
    OPENAI_PROXY_TREE,
    OPENAI_PROXY_OVERVIEW,
    OPENAI_PROXIES_PROMPT,
    getPromptByPath,
    getAvailablePaths,
    getNavigationTree
};

// Browser compatibility
if (typeof window !== 'undefined') {
    window.openai_proxy_prompts = {
        OPENAI_PROXY_TREE,
        OPENAI_PROXY_OVERVIEW, 
        OPENAI_PROXIES_PROMPT,
        getPromptByPath,
        getAvailablePaths,
        getNavigationTree
    };
}