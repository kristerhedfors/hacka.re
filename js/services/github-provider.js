/**
 * GitHub MCP Provider
 * Implements the MCPProvider interface for GitHub API integration
 */

window.GitHubProvider = (function() {
    'use strict';

/**
 * GitHub provider implementing the MCP provider interface
 */
class GitHubProvider extends window.MCPProviderInterface {
    constructor(config = {}) {
        const defaultConfig = {
            name: 'github',
            type: 'pat',
            requiredScopes: ['repo', 'read:user'],
            endpoints: {
                api: 'https://api.github.com',
                userInfo: 'https://api.github.com/user'
            },
            metadata: {
                displayName: 'GitHub',
                description: 'Access GitHub repositories, issues, and pull requests',
                icon: 'fab fa-github',
                website: 'https://github.com',
                documentation: 'https://docs.github.com/en/rest'
            }
        };

        super({ ...defaultConfig, ...config });
        
        // Initialize authentication strategy
        this.authStrategy = new window.MCPAuthStrategies.PersonalTokenStrategy({
            tokenValidationEndpoint: this.endpoints.userInfo,
            requiredScopes: this.requiredScopes
        });

        // Tool definitions
        this.tools = new Map([
            ['list_repos', {
                name: 'list_repos',
                description: 'List repositories for the authenticated user',
                parameters: {
                    type: 'object',
                    properties: {
                        type: { 
                            type: 'string', 
                            enum: ['all', 'owner', 'member'], 
                            default: 'all',
                            description: 'Type of repositories to list'
                        },
                        sort: { 
                            type: 'string', 
                            enum: ['created', 'updated', 'pushed', 'full_name'], 
                            default: 'updated',
                            description: 'Sort order for repositories'
                        },
                        per_page: { 
                            type: 'number', 
                            default: 30, 
                            maximum: 100,
                            description: 'Number of repositories per page'
                        }
                    }
                },
                handler: this.listRepos.bind(this),
                requiredScopes: ['repo']
            }],
            ['get_repo', {
                name: 'get_repo',
                description: 'Get details of a specific repository',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        }
                    },
                    required: ['owner', 'repo']
                },
                handler: this.getRepo.bind(this),
                requiredScopes: ['repo']
            }],
            ['list_issues', {
                name: 'list_issues',
                description: 'List issues in a repository',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        },
                        state: { 
                            type: 'string', 
                            enum: ['open', 'closed', 'all'], 
                            default: 'open',
                            description: 'Issue state filter'
                        },
                        labels: { 
                            type: 'string', 
                            description: 'Comma-separated list of label names' 
                        },
                        per_page: { 
                            type: 'number', 
                            default: 30, 
                            maximum: 100,
                            description: 'Number of issues per page'
                        }
                    },
                    required: ['owner', 'repo']
                },
                handler: this.listIssues.bind(this),
                requiredScopes: ['repo']
            }],
            ['create_issue', {
                name: 'create_issue',
                description: 'Create a new issue in a repository',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        },
                        title: { 
                            type: 'string', 
                            description: 'Issue title' 
                        },
                        body: { 
                            type: 'string', 
                            description: 'Issue body/description' 
                        },
                        labels: { 
                            type: 'array', 
                            items: { type: 'string' },
                            description: 'Array of label names'
                        },
                        assignees: { 
                            type: 'array', 
                            items: { type: 'string' },
                            description: 'Array of assignee usernames'
                        }
                    },
                    required: ['owner', 'repo', 'title']
                },
                handler: this.createIssue.bind(this),
                requiredScopes: ['repo']
            }],
            ['get_file_content', {
                name: 'get_file_content',
                description: 'Get content of a file from a repository',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        },
                        path: { 
                            type: 'string', 
                            description: 'File path in repository' 
                        },
                        ref: { 
                            type: 'string', 
                            description: 'Branch, tag, or commit SHA (defaults to default branch)' 
                        }
                    },
                    required: ['owner', 'repo', 'path']
                },
                handler: this.getFileContent.bind(this),
                requiredScopes: ['repo']
            }],
            ['list_pull_requests', {
                name: 'list_pull_requests',
                description: 'List pull requests in a repository',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        },
                        state: { 
                            type: 'string', 
                            enum: ['open', 'closed', 'all'], 
                            default: 'open',
                            description: 'Pull request state filter'
                        },
                        base: { 
                            type: 'string', 
                            description: 'Base branch to filter by' 
                        },
                        head: { 
                            type: 'string', 
                            description: 'Head branch to filter by' 
                        },
                        per_page: { 
                            type: 'number', 
                            default: 30, 
                            maximum: 100,
                            description: 'Number of pull requests per page'
                        }
                    },
                    required: ['owner', 'repo']
                },
                handler: this.listPullRequests.bind(this),
                requiredScopes: ['repo']
            }],
            ['get_pull_request', {
                name: 'get_pull_request',
                description: 'Get details of a specific pull request',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        },
                        pull_number: { 
                            type: 'number', 
                            description: 'Pull request number' 
                        }
                    },
                    required: ['owner', 'repo', 'pull_number']
                },
                handler: this.getPullRequest.bind(this),
                requiredScopes: ['repo']
            }],
            ['list_commits', {
                name: 'list_commits',
                description: 'List commits in a repository',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        },
                        sha: { 
                            type: 'string', 
                            description: 'Branch, tag, or commit SHA to start from' 
                        },
                        path: { 
                            type: 'string', 
                            description: 'Only commits containing this file path' 
                        },
                        since: { 
                            type: 'string', 
                            description: 'ISO 8601 date - only commits after this date' 
                        },
                        until: { 
                            type: 'string', 
                            description: 'ISO 8601 date - only commits before this date' 
                        },
                        per_page: { 
                            type: 'number', 
                            default: 30, 
                            maximum: 100,
                            description: 'Number of commits per page'
                        }
                    },
                    required: ['owner', 'repo']
                },
                handler: this.listCommits.bind(this),
                requiredScopes: ['repo']
            }],
            ['list_branches', {
                name: 'list_branches',
                description: 'List branches in a repository',
                parameters: {
                    type: 'object',
                    properties: {
                        owner: { 
                            type: 'string', 
                            description: 'Repository owner username or organization' 
                        },
                        repo: { 
                            type: 'string', 
                            description: 'Repository name' 
                        },
                        protected: { 
                            type: 'boolean', 
                            description: 'Filter by protected status' 
                        },
                        per_page: { 
                            type: 'number', 
                            default: 30, 
                            maximum: 100,
                            description: 'Number of branches per page'
                        }
                    },
                    required: ['owner', 'repo']
                },
                handler: this.listBranches.bind(this),
                requiredScopes: ['repo']
            }]
        ]);
    }

    async authenticate(authConfig = {}) {
        try {
            const result = await this.authStrategy.authenticate({
                ...authConfig,
                provider: this.name
            });
            
            if (result.success && result.credentials) {
                this.credentials = result.credentials;
            }
            
            return result;
        } catch (error) {
            return this._createError(`Authentication failed: ${error.message}`, 'AUTH_FAILED');
        }
    }

    async validateCredentials(credentials) {
        try {
            const result = await this.authStrategy.validate(credentials);
            return {
                valid: result.valid,
                userInfo: result.userInfo,
                error: result.error,
                needsRefresh: result.needsRefresh
            };
        } catch (error) {
            return {
                valid: false,
                error: `Validation failed: ${error.message}`
            };
        }
    }

    async refreshTokens(refreshToken) {
        return this._createError('GitHub Personal Access Tokens cannot be refreshed', 'NOT_REFRESHABLE');
    }

    async getToolDefinitions() {
        return Array.from(this.tools.values());
    }

    async executeTool(toolName, parameters, context) {
        if (!this.tools.has(toolName)) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        const tool = this.tools.get(toolName);
        const credentials = context.credentials || this.credentials;
        
        if (!credentials || !credentials.token) {
            throw new Error('No valid credentials available for GitHub API');
        }

        try {
            return await tool.handler(parameters, credentials);
        } catch (error) {
            throw new Error(`Tool execution failed: ${error.message}`);
        }
    }

    // Tool implementations

    async listRepos(params = {}, credentials) {
        const url = new URL(`${this.endpoints.api}/user/repos`);
        
        if (params.type && params.type !== 'all') {
            url.searchParams.set('type', params.type);
        }
        if (params.sort) {
            url.searchParams.set('sort', params.sort);
        }
        if (params.per_page) {
            url.searchParams.set('per_page', params.per_page.toString());
        }

        return await this._makeApiRequest(url.toString(), 'GET', credentials);
    }

    async getRepo(params, credentials) {
        const { owner, repo } = params;
        const url = `${this.endpoints.api}/repos/${owner}/${repo}`;
        return await this._makeApiRequest(url, 'GET', credentials);
    }

    async listIssues(params, credentials) {
        const { owner, repo, state = 'open', labels, per_page } = params;
        const url = new URL(`${this.endpoints.api}/repos/${owner}/${repo}/issues`);
        
        url.searchParams.set('state', state);
        if (labels) {
            url.searchParams.set('labels', labels);
        }
        if (per_page) {
            url.searchParams.set('per_page', per_page.toString());
        }

        return await this._makeApiRequest(url.toString(), 'GET', credentials);
    }

    async createIssue(params, credentials) {
        const { owner, repo, title, body, labels, assignees } = params;
        const url = `${this.endpoints.api}/repos/${owner}/${repo}/issues`;
        
        const issueData = {
            title,
            body: body || '',
            labels: labels || [],
            assignees: assignees || []
        };

        return await this._makeApiRequest(url, 'POST', credentials, issueData);
    }

    async getFileContent(params, credentials) {
        const { owner, repo, path, ref } = params;
        const url = new URL(`${this.endpoints.api}/repos/${owner}/${repo}/contents/${path}`);
        
        if (ref) {
            url.searchParams.set('ref', ref);
        }

        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
        // Decode base64 content if present
        if (response.content && response.encoding === 'base64') {
            try {
                response.decodedContent = atob(response.content.replace(/\n/g, ''));
            } catch (error) {
                console.warn('Failed to decode file content:', error);
            }
        }

        return response;
    }

    async listPullRequests(params, credentials) {
        const { owner, repo, state = 'open', base, head, per_page } = params;
        const url = new URL(`${this.endpoints.api}/repos/${owner}/${repo}/pulls`);
        
        url.searchParams.set('state', state);
        if (base) {
            url.searchParams.set('base', base);
        }
        if (head) {
            url.searchParams.set('head', head);
        }
        if (per_page) {
            url.searchParams.set('per_page', per_page.toString());
        }

        return await this._makeApiRequest(url.toString(), 'GET', credentials);
    }

    async getPullRequest(params, credentials) {
        const { owner, repo, pull_number } = params;
        const url = `${this.endpoints.api}/repos/${owner}/${repo}/pulls/${pull_number}`;
        return await this._makeApiRequest(url, 'GET', credentials);
    }

    async listCommits(params, credentials) {
        const { owner, repo, sha, path, since, until, per_page } = params;
        const url = new URL(`${this.endpoints.api}/repos/${owner}/${repo}/commits`);
        
        if (sha) {
            url.searchParams.set('sha', sha);
        }
        if (path) {
            url.searchParams.set('path', path);
        }
        if (since) {
            url.searchParams.set('since', since);
        }
        if (until) {
            url.searchParams.set('until', until);
        }
        if (per_page) {
            url.searchParams.set('per_page', per_page.toString());
        }

        return await this._makeApiRequest(url.toString(), 'GET', credentials);
    }

    async listBranches(params, credentials) {
        const { owner, repo, protected: isProtected, per_page } = params;
        const url = new URL(`${this.endpoints.api}/repos/${owner}/${repo}/branches`);
        
        if (typeof isProtected === 'boolean') {
            url.searchParams.set('protected', isProtected.toString());
        }
        if (per_page) {
            url.searchParams.set('per_page', per_page.toString());
        }

        return await this._makeApiRequest(url.toString(), 'GET', credentials);
    }

    // Private helper methods

    async _makeApiRequest(url, method = 'GET', credentials, body = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

        try {
            const options = {
                method,
                headers: {
                    'Authorization': `Bearer ${credentials.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'hacka.re/1.0'
                },
                signal: controller.signal
            };

            if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
                
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.message) {
                        errorMessage += ` - ${errorData.message}`;
                    }
                } catch {
                    // Error response is not JSON, use status text
                }
                
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('GitHub API request timed out after 45 seconds');
            }
            
            throw error;
        }
    }
}

    // Return the GitHubProvider class
    return GitHubProvider;
})();