/**
 * GitHub MCP Provider
 * 
 * Provides GitHub API integration with Personal Access Token authentication
 */

(function(global) {
    'use strict';

    class GitHubProvider {
        constructor() {
            this.serviceKey = 'github';
            this.config = {
                name: 'GitHub',
                icon: 'fab fa-github',
                description: 'Access GitHub repositories, issues, and pull requests',
                authType: 'pat',
                apiBaseUrl: 'https://api.github.com',
                requiredScopes: ['repo', 'read:user'],
                setupInstructions: {
                    title: 'GitHub Personal Access Token Setup',
                    steps: [
                        'Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)',
                        'Click "Generate new token"',
                        'Give your token a descriptive name like "hacka.re MCP Integration"',
                        'Select scopes: "repo" for full repository access, "read:user" for user info',
                        'Click "Generate token" and copy the token immediately',
                        'Paste the token below (it won\'t be shown again on GitHub)',
                        'Note: Your token will be encrypted and stored locally'
                    ],
                    docUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
                },
                tools: {
                    list_repos: {
                        description: 'List repositories for the authenticated user',
                        parameters: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['all', 'owner', 'member'], default: 'all' },
                                sort: { type: 'string', enum: ['created', 'updated', 'pushed', 'full_name'], default: 'updated' },
                                per_page: { type: 'number', default: 30, maximum: 100 }
                            }
                        }
                    },
                    get_repo: {
                        description: 'Get details of a specific repository',
                        parameters: {
                            type: 'object',
                            properties: {
                                owner: { type: 'string', description: 'Repository owner' },
                                repo: { type: 'string', description: 'Repository name' }
                            },
                            required: ['owner', 'repo']
                        }
                    },
                    list_issues: {
                        description: 'List issues in a repository',
                        parameters: {
                            type: 'object',
                            properties: {
                                owner: { type: 'string' },
                                repo: { type: 'string' },
                                state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
                                labels: { type: 'string', description: 'Comma-separated list of labels' }
                            },
                            required: ['owner', 'repo']
                        }
                    },
                    create_issue: {
                        description: 'Create a new issue',
                        parameters: {
                            type: 'object',
                            properties: {
                                owner: { type: 'string' },
                                repo: { type: 'string' },
                                title: { type: 'string' },
                                body: { type: 'string' },
                                labels: { type: 'array', items: { type: 'string' } }
                            },
                            required: ['owner', 'repo', 'title']
                        }
                    },
                    get_file_content: {
                        description: 'Get content of a file from a repository',
                        parameters: {
                            type: 'object',
                            properties: {
                                owner: { type: 'string' },
                                repo: { type: 'string' },
                                path: { type: 'string', description: 'File path in repository' }
                            },
                            required: ['owner', 'repo', 'path']
                        }
                    }
                }
            };
        }

        /**
         * Connect to GitHub using Personal Access Token
         */
        async connect() {
            const storageKey = `mcp_${this.serviceKey}_token`;
            const existingToken = await window.CoreStorageService.getValue(storageKey);

            if (existingToken) {
                const isValid = await this.validateToken(existingToken);
                if (isValid) {
                    console.log(`[GitHub Provider] Using existing token`);
                    return { success: true, token: existingToken };
                }
            }

            return { success: false, requiresAuth: true };
        }

        /**
         * Validate GitHub Personal Access Token
         */
        async validateToken(token) {
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                return response.ok;
            } catch (error) {
                console.error('[GitHub Provider] Token validation failed:', error);
                return false;
            }
        }

        /**
         * Store authentication token
         */
        async storeToken(token) {
            const storageKey = `mcp_${this.serviceKey}_token`;
            await window.CoreStorageService.setValue(storageKey, token);
        }

        /**
         * Execute GitHub API calls
         */
        async executeTool(toolName, params, authToken) {
            let url, method = 'GET', body = null;

            switch (toolName) {
                case 'list_repos':
                    url = `https://api.github.com/user/repos?type=${params.type || 'all'}&sort=${params.sort || 'updated'}&per_page=${params.per_page || 30}`;
                    break;
                case 'get_repo':
                    url = `https://api.github.com/repos/${params.owner}/${params.repo}`;
                    break;
                case 'list_issues':
                    url = `https://api.github.com/repos/${params.owner}/${params.repo}/issues?state=${params.state || 'open'}`;
                    if (params.labels) url += `&labels=${params.labels}`;
                    break;
                case 'create_issue':
                    url = `https://api.github.com/repos/${params.owner}/${params.repo}/issues`;
                    method = 'POST';
                    body = JSON.stringify({
                        title: params.title,
                        body: params.body,
                        labels: params.labels
                    });
                    break;
                case 'get_file_content':
                    url = `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${params.path}`;
                    break;
                default:
                    throw new Error(`Unknown GitHub tool: ${toolName}`);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);
            
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (toolName === 'get_file_content' && data.content) {
                    data.decodedContent = atob(data.content);
                }

                return data;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error(`GitHub API request timed out after 45 seconds`);
                }
                throw error;
            }
        }

        /**
         * Disconnect and cleanup
         */
        async disconnect() {
            const storageKey = `mcp_${this.serviceKey}_token`;
            await window.CoreStorageService.removeValue(storageKey);
        }
    }

    global.GitHubProvider = GitHubProvider;

})(window);