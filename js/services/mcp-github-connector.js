/**
 * GitHub Service Connector for MCP
 * Extends BaseServiceConnector with GitHub-specific functionality
 */

(function(global) {
    'use strict';

    class GitHubConnector extends global.BaseServiceConnector {
        constructor() {
            const config = {
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
                tools: {} // Will be loaded from GitHubProvider if available
            };
            
            super('github', config);
        }

        /**
         * Get tools to register - use GitHubProvider if available
         */
        getToolsToRegister() {
            // Try to use GitHubProvider for comprehensive tool set
            if (window.GitHubProvider) {
                try {
                    const githubProvider = new window.GitHubProvider();
                    const providerTools = githubProvider.tools;
                    
                    // Convert provider tools to expected format
                    const tools = {};
                    for (const [toolName, toolConfig] of providerTools) {
                        tools[toolName] = {
                            description: toolConfig.description,
                            parameters: toolConfig.parameters
                        };
                    }
                    
                    console.log(`[GitHubConnector] Using GitHubProvider with ${Object.keys(tools).length} tools`);
                    return tools;
                } catch (error) {
                    console.warn(`[GitHubConnector] Failed to load GitHubProvider tools:`, error);
                }
            }
            
            // Fallback to basic tools if GitHubProvider not available
            return {
                github_list_repos: {
                    description: 'List user repositories',
                    parameters: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['all', 'owner', 'member'], default: 'all' },
                            sort: { type: 'string', enum: ['created', 'updated', 'pushed', 'full_name'], default: 'updated' },
                            per_page: { type: 'number', default: 30, maximum: 100 }
                        }
                    }
                },
                github_get_repo: {
                    description: 'Get repository details',
                    parameters: {
                        type: 'object',
                        properties: {
                            owner: { type: 'string', description: 'Repository owner' },
                            repo: { type: 'string', description: 'Repository name' }
                        },
                        required: ['owner', 'repo']
                    }
                },
                github_list_issues: {
                    description: 'List repository issues',
                    parameters: {
                        type: 'object',
                        properties: {
                            owner: { type: 'string' },
                            repo: { type: 'string' },
                            state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
                            labels: { type: 'string', description: 'Comma-separated label names' }
                        },
                        required: ['owner', 'repo']
                    }
                },
                github_create_issue: {
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
                github_get_file_content: {
                    description: 'Get file content from repository',
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
            };
        }

        /**
         * Connect to GitHub using PAT
         */
        async connect() {
            // First try to load existing connection
            await this.loadConnection();
            if (this.isConnected()) {
                console.log(`[GitHubConnector] Using loaded connection`);
                return true;
            }

            // Check for invalid cached connection (boolean token from testing)
            if (this.connection && typeof this.connection.token === 'boolean') {
                console.log(`[GitHubConnector] Clearing invalid cached connection`);
                await this.clearConnection();
            }

            // Check for existing token
            const storageKey = this.getStorageKey('token');
            const existingToken = await this.storage.getValue(storageKey);

            if (existingToken) {
                const isValid = await this.validateToken(existingToken);
                if (isValid) {
                    console.log(`[GitHubConnector] Using existing token`);
                    await this.createConnection(existingToken);
                    return true;
                }
            }

            // No valid token found - show UI to get one
            if (window.mcpServiceUIHelper) {
                const token = await window.mcpServiceUIHelper.showPATInputDialog('github', this.config);
                if (token) {
                    await this.createConnection(token);
                    return true;
                }
            }

            return false;
        }

        /**
         * Quick connect without UI (for auto-connection)
         */
        async quickConnect() {
            return await this.connect();
        }

        /**
         * Create connection with token
         */
        async createConnection(token) {
            // Check for invalid token (boolean from testing)
            if (this.connection && typeof this.connection.token === 'boolean') {
                console.log(`[GitHubConnector] Clearing invalid cached connection`);
                await this.clearConnection();
            }

            const connectionData = {
                type: 'github',
                token: token,
                connectedAt: Date.now(),
                lastValidated: Date.now()
            };

            await this.storeConnection(connectionData);
            
            // Store token separately for compatibility
            const tokenKey = this.getStorageKey('token');
            await this.storage.setValue(tokenKey, token);
            
            // Register tools
            await this.registerTools(token);
            
            console.log(`[GitHubConnector] Connected successfully`);
            return true;
        }

        /**
         * Validate GitHub token
         */
        async validateToken(token) {
            try {
                // Extract token if it's wrapped in an object
                let actualToken = token;
                if (typeof token === 'object' && token !== null && token.token) {
                    actualToken = token.token;
                } else if (typeof token !== 'string') {
                    console.error(`[GitHubConnector] Invalid token type: ${typeof token}`);
                    return false;
                }

                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `token ${actualToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                return response.ok;
            } catch (error) {
                console.error('[GitHubConnector] Token validation failed:', error);
                return false;
            }
        }

        /**
         * Execute GitHub tool
         */
        async executeTool(toolName, params) {
            if (!this.connection || !this.connection.token) {
                throw new Error('GitHub not connected');
            }

            // Try GitHubProvider first if available
            if (window.GitHubProvider) {
                try {
                    const githubProvider = new window.GitHubProvider();
                    githubProvider.credentials = { token: this.connection.token };
                    
                    const fullToolName = `github_${toolName}`;
                    const toolConfig = githubProvider.tools.get(fullToolName);
                    
                    if (toolConfig && toolConfig.handler) {
                        return await toolConfig.handler(params, githubProvider.credentials);
                    }
                } catch (error) {
                    console.warn(`[GitHubConnector] GitHubProvider failed for ${toolName}:`, error);
                    // Fall through to legacy implementation
                }
            }

            // Legacy implementation
            return await this.executeLegacyTool(toolName, params);
        }

        /**
         * Execute tool using legacy implementation
         */
        async executeLegacyTool(toolName, params) {
            const token = this.connection.token;
            let url, method = 'GET', body = null;

            switch (toolName) {
                case 'list_repos':
                case 'github_list_repos':
                    url = `${this.config.apiBaseUrl}/user/repos?type=${params.type || 'all'}&sort=${params.sort || 'updated'}&per_page=${params.per_page || 30}`;
                    break;

                case 'get_repo':
                case 'github_get_repo':
                    url = `${this.config.apiBaseUrl}/repos/${params.owner}/${params.repo}`;
                    break;

                case 'list_issues':
                case 'github_list_issues':
                    url = `${this.config.apiBaseUrl}/repos/${params.owner}/${params.repo}/issues?state=${params.state || 'open'}`;
                    if (params.labels) url += `&labels=${params.labels}`;
                    break;

                case 'create_issue':
                case 'github_create_issue':
                    url = `${this.config.apiBaseUrl}/repos/${params.owner}/${params.repo}/issues`;
                    method = 'POST';
                    body = JSON.stringify({
                        title: params.title,
                        body: params.body,
                        labels: params.labels
                    });
                    break;

                case 'get_file_content':
                case 'github_get_file_content':
                    url = `${this.config.apiBaseUrl}/repos/${params.owner}/${params.repo}/contents/${params.path}`;
                    break;

                default:
                    throw new Error(`Unknown GitHub tool: ${toolName}`);
            }

            const response = await this.makeApiRequest(url, {
                method,
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body
            });

            // Special handling for file content
            if ((toolName === 'get_file_content' || toolName === 'github_get_file_content') && response.content) {
                response.decodedContent = atob(response.content);
            }

            return response;
        }

        /**
         * Validate connection
         */
        async validate() {
            if (!this.connection || !this.connection.token) {
                return false;
            }

            const isValid = await this.validateToken(this.connection.token);
            
            if (isValid) {
                this.connection.lastValidated = Date.now();
                await this.storeConnection(this.connection);
            }

            return isValid;
        }
    }

    // Export to global scope
    global.GitHubConnector = GitHubConnector;

})(window);