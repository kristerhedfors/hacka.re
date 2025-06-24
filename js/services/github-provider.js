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
            ['github_list_repos', {
                name: 'github_list_repos',
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
            ['github_get_repo', {
                name: 'github_get_repo',
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
            ['github_list_issues', {
                name: 'github_list_issues',
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
            ['github_create_issue', {
                name: 'github_create_issue',
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
            ['github_get_file_content', {
                name: 'github_get_file_content',
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
            ['github_list_pull_requests', {
                name: 'github_list_pull_requests',
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
            ['github_get_pull_request', {
                name: 'github_get_pull_request',
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
            ['github_list_commits', {
                name: 'github_list_commits',
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
            ['github_list_branches', {
                name: 'github_list_branches',
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
                        is_protected: { 
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
            }],
            
            // Advanced Search Tools
            ['github_search_code', {
                name: 'github_search_code',
                description: 'Search for code across repositories with advanced filtering',
                parameters: {
                    type: 'object',
                    properties: {
                        q: {
                            type: 'string',
                            description: 'Search query with keywords and qualifiers (e.g., "function language:javascript")'
                        },
                        owner: {
                            type: 'string',
                            description: 'Limit search to specific user or organization repositories'
                        },
                        repo: {
                            type: 'string',
                            description: 'Limit search to specific repository (requires owner)'
                        },
                        language: {
                            type: 'string',
                            description: 'Filter by programming language'
                        },
                        filename: {
                            type: 'string',
                            description: 'Search within specific filename'
                        },
                        extension: {
                            type: 'string',
                            description: 'Filter by file extension'
                        },
                        path: {
                            type: 'string',
                            description: 'Search within specific path'
                        },
                        size: {
                            type: 'string',
                            description: 'Filter by file size (e.g., ">1000", "<500")'
                        },
                        per_page: {
                            type: 'number',
                            default: 30,
                            maximum: 100,
                            description: 'Number of results per page'
                        },
                        page: {
                            type: 'number',
                            default: 1,
                            description: 'Page number of results'
                        }
                    },
                    required: ['q']
                },
                handler: this.searchCode.bind(this),
                requiredScopes: ['repo'],
                category: 'search',
                tags: ['search', 'code', 'files']
            }],
            ['github_search_commits', {
                name: 'github_search_commits',
                description: 'Search commits with advanced criteria and filtering',
                parameters: {
                    type: 'object',
                    properties: {
                        q: {
                            type: 'string',
                            description: 'Search query with keywords and qualifiers'
                        },
                        owner: {
                            type: 'string',
                            description: 'Limit search to specific user or organization'
                        },
                        repo: {
                            type: 'string',
                            description: 'Limit search to specific repository (requires owner)'
                        },
                        author: {
                            type: 'string',
                            description: 'Filter by commit author'
                        },
                        committer: {
                            type: 'string',
                            description: 'Filter by committer'
                        },
                        author_date: {
                            type: 'string',
                            description: 'Filter by author date (e.g., "2023-01-01..2023-12-31")'
                        },
                        committer_date: {
                            type: 'string',
                            description: 'Filter by committer date'
                        },
                        merge: {
                            type: 'boolean',
                            description: 'Include only merge commits'
                        },
                        sort: {
                            type: 'string',
                            enum: ['author-date', 'committer-date'],
                            description: 'Sort commits by date'
                        },
                        order: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                            description: 'Sort order'
                        },
                        per_page: {
                            type: 'number',
                            default: 30,
                            maximum: 100,
                            description: 'Number of results per page'
                        }
                    },
                    required: ['q']
                },
                handler: this.searchCommits.bind(this),
                requiredScopes: ['repo'],
                category: 'search',
                tags: ['search', 'commits', 'history']
            }],
            ['github_search_repositories', {
                name: 'github_search_repositories',
                description: 'Search and discover repositories with comprehensive filtering',
                parameters: {
                    type: 'object',
                    properties: {
                        q: {
                            type: 'string',
                            description: 'Search query with keywords and qualifiers'
                        },
                        owner: {
                            type: 'string',
                            description: 'Filter by repository owner'
                        },
                        language: {
                            type: 'string',
                            description: 'Filter by primary programming language'
                        },
                        topic: {
                            type: 'string',
                            description: 'Filter by repository topics'
                        },
                        stars: {
                            type: 'string',
                            description: 'Filter by star count (e.g., ">100", "10..50")'
                        },
                        forks: {
                            type: 'string',
                            description: 'Filter by fork count'
                        },
                        size: {
                            type: 'string',
                            description: 'Filter by repository size in KB'
                        },
                        created: {
                            type: 'string',
                            description: 'Filter by creation date'
                        },
                        pushed: {
                            type: 'string',
                            description: 'Filter by last push date'
                        },
                        license: {
                            type: 'string',
                            description: 'Filter by license type'
                        },
                        is_public: {
                            type: 'boolean',
                            description: 'Filter by public/private status'
                        },
                        archived: {
                            type: 'boolean',
                            description: 'Include archived repositories'
                        },
                        sort: {
                            type: 'string',
                            enum: ['stars', 'forks', 'help-wanted-issues', 'updated'],
                            description: 'Sort repositories by metric'
                        },
                        order: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                            description: 'Sort order'
                        },
                        per_page: {
                            type: 'number',
                            default: 30,
                            maximum: 100,
                            description: 'Number of results per page'
                        }
                    },
                    required: ['q']
                },
                handler: this.searchRepositories.bind(this),
                requiredScopes: ['repo'],
                category: 'search',
                tags: ['search', 'repositories', 'discovery']
            }],
            ['github_search_issues', {
                name: 'github_search_issues',
                description: 'Advanced search for issues and pull requests',
                parameters: {
                    type: 'object',
                    properties: {
                        q: {
                            type: 'string',
                            description: 'Search query with keywords and qualifiers'
                        },
                        owner: {
                            type: 'string',
                            description: 'Limit search to specific user or organization'
                        },
                        repo: {
                            type: 'string',
                            description: 'Limit search to specific repository (requires owner)'
                        },
                        type: {
                            type: 'string',
                            enum: ['issue', 'pr'],
                            description: 'Filter by issue type'
                        },
                        state: {
                            type: 'string',
                            enum: ['open', 'closed'],
                            description: 'Filter by issue state'
                        },
                        labels: {
                            type: 'string',
                            description: 'Filter by labels (comma-separated)'
                        },
                        assignee: {
                            type: 'string',
                            description: 'Filter by assignee'
                        },
                        author: {
                            type: 'string',
                            description: 'Filter by author'
                        },
                        mentions: {
                            type: 'string',
                            description: 'Filter by mentioned users'
                        },
                        created: {
                            type: 'string',
                            description: 'Filter by creation date'
                        },
                        updated: {
                            type: 'string',
                            description: 'Filter by last update date'
                        },
                        closed: {
                            type: 'string',
                            description: 'Filter by closing date'
                        },
                        sort: {
                            type: 'string',
                            enum: ['comments', 'reactions', 'reactions-+1', 'reactions--1', 'reactions-smile', 'reactions-thinking_face', 'reactions-heart', 'reactions-tada', 'interactions', 'created', 'updated'],
                            description: 'Sort issues by metric'
                        },
                        order: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                            description: 'Sort order'
                        },
                        per_page: {
                            type: 'number',
                            default: 30,
                            maximum: 100,
                            description: 'Number of results per page'
                        }
                    },
                    required: ['q']
                },
                handler: this.searchIssues.bind(this),
                requiredScopes: ['repo'],
                category: 'search',
                tags: ['search', 'issues', 'pull-requests']
            }],
            ['github_search_users', {
                name: 'github_search_users',
                description: 'Search for users and organizations on GitHub',
                parameters: {
                    type: 'object',
                    properties: {
                        q: {
                            type: 'string',
                            description: 'Search query with keywords and qualifiers'
                        },
                        type: {
                            type: 'string',
                            enum: ['user', 'org'],
                            description: 'Filter by user type'
                        },
                        location: {
                            type: 'string',
                            description: 'Filter by location'
                        },
                        language: {
                            type: 'string',
                            description: 'Filter by programming language'
                        },
                        created: {
                            type: 'string',
                            description: 'Filter by account creation date'
                        },
                        followers: {
                            type: 'string',
                            description: 'Filter by follower count (e.g., ">100")'
                        },
                        repos: {
                            type: 'string',
                            description: 'Filter by repository count'
                        },
                        sort: {
                            type: 'string',
                            enum: ['followers', 'repositories', 'joined'],
                            description: 'Sort users by metric'
                        },
                        order: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                            description: 'Sort order'
                        },
                        per_page: {
                            type: 'number',
                            default: 30,
                            maximum: 100,
                            description: 'Number of results per page'
                        }
                    },
                    required: ['q']
                },
                handler: this.searchUsers.bind(this),
                requiredScopes: ['read:user'],
                category: 'search',
                tags: ['search', 'users', 'organizations']
            }],
            ['github_search_topics', {
                name: 'github_search_topics',
                description: 'Search for topics and explore trending repository tags',
                parameters: {
                    type: 'object',
                    properties: {
                        q: {
                            type: 'string',
                            description: 'Search query for topics'
                        },
                        featured: {
                            type: 'boolean',
                            description: 'Filter to featured topics only'
                        },
                        curated: {
                            type: 'boolean',
                            description: 'Filter to curated topics only'
                        },
                        per_page: {
                            type: 'number',
                            default: 30,
                            maximum: 100,
                            description: 'Number of results per page'
                        }
                    },
                    required: ['q']
                },
                handler: this.searchTopics.bind(this),
                requiredScopes: ['repo'],
                category: 'search',
                tags: ['search', 'topics', 'trending']
            }],
            ['github_advanced_search', {
                name: 'github_advanced_search',
                description: 'Multi-type GitHub search with unified results',
                parameters: {
                    type: 'object',
                    properties: {
                        q: {
                            type: 'string',
                            description: 'Search query to search across all GitHub entity types'
                        },
                        types: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['repositories', 'code', 'commits', 'issues', 'users', 'topics']
                            },
                            default: ['repositories', 'issues'],
                            description: 'Types of entities to search'
                        },
                        owner: {
                            type: 'string',
                            description: 'Limit search to specific user or organization'
                        },
                        repo: {
                            type: 'string',
                            description: 'Limit search to specific repository (requires owner)'
                        },
                        limit_per_type: {
                            type: 'number',
                            default: 10,
                            maximum: 50,
                            description: 'Maximum results per search type'
                        },
                        include_metadata: {
                            type: 'boolean',
                            default: true,
                            description: 'Include rich metadata for results'
                        }
                    },
                    required: ['q']
                },
                handler: this.advancedSearch.bind(this),
                requiredScopes: ['repo'],
                category: 'search',
                tags: ['search', 'multi-type', 'comprehensive']
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
        const { owner, repo, is_protected: isProtected, per_page } = params;
        const url = new URL(`${this.endpoints.api}/repos/${owner}/${repo}/branches`);
        
        if (typeof isProtected === 'boolean') {
            url.searchParams.set('protected', isProtected.toString());
        }
        if (per_page) {
            url.searchParams.set('per_page', per_page.toString());
        }

        return await this._makeApiRequest(url.toString(), 'GET', credentials);
    }

    // Advanced Search Tool Implementations

    async searchCode(params, credentials) {
        const { q, owner, repo, language, filename, extension, path, size, per_page, page } = params;
        
        // Build search query with qualifiers
        let searchQuery = q;
        if (owner && repo) {
            searchQuery += ` repo:${owner}/${repo}`;
        } else if (owner) {
            searchQuery += ` user:${owner}`;
        }
        if (language) searchQuery += ` language:${language}`;
        if (filename) searchQuery += ` filename:${filename}`;
        if (extension) searchQuery += ` extension:${extension}`;
        if (path) searchQuery += ` path:${path}`;
        if (size) searchQuery += ` size:${size}`;

        const url = new URL(`${this.endpoints.api}/search/code`);
        url.searchParams.set('q', searchQuery);
        if (per_page) url.searchParams.set('per_page', per_page.toString());
        if (page) url.searchParams.set('page', page.toString());

        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
        // Add enhanced metadata to results
        if (response.items) {
            response.items = response.items.map(item => ({
                ...item,
                search_metadata: {
                    query: searchQuery,
                    match_type: 'code',
                    file_size: item.size || null,
                    language: item.language || 'unknown'
                }
            }));
        }
        
        return response;
    }

    async searchCommits(params, credentials) {
        const { q, owner, repo, author, committer, author_date, committer_date, merge, sort, order, per_page } = params;
        
        // Build search query with qualifiers
        let searchQuery = q;
        if (owner && repo) {
            searchQuery += ` repo:${owner}/${repo}`;
        } else if (owner) {
            searchQuery += ` user:${owner}`;
        }
        if (author) searchQuery += ` author:${author}`;
        if (committer) searchQuery += ` committer:${committer}`;
        if (author_date) searchQuery += ` author-date:${author_date}`;
        if (committer_date) searchQuery += ` committer-date:${committer_date}`;
        if (merge) searchQuery += ` merge:true`;

        const url = new URL(`${this.endpoints.api}/search/commits`);
        url.searchParams.set('q', searchQuery);
        if (sort) url.searchParams.set('sort', sort);
        if (order) url.searchParams.set('order', order);
        if (per_page) url.searchParams.set('per_page', per_page.toString());

        // Use preview header for commit search
        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
        // Add enhanced metadata
        if (response.items) {
            response.items = response.items.map(item => ({
                ...item,
                search_metadata: {
                    query: searchQuery,
                    match_type: 'commit',
                    files_changed: item.files ? item.files.length : null,
                    commit_date: item.commit?.author?.date || null
                }
            }));
        }
        
        return response;
    }

    async searchRepositories(params, credentials) {
        const { q, owner, language, topic, stars, forks, size, created, pushed, license, is_public, archived, sort, order, per_page } = params;
        
        // Build search query with qualifiers
        let searchQuery = q;
        if (owner) searchQuery += ` user:${owner}`;
        if (language) searchQuery += ` language:${language}`;
        if (topic) searchQuery += ` topic:${topic}`;
        if (stars) searchQuery += ` stars:${stars}`;
        if (forks) searchQuery += ` forks:${forks}`;
        if (size) searchQuery += ` size:${size}`;
        if (created) searchQuery += ` created:${created}`;
        if (pushed) searchQuery += ` pushed:${pushed}`;
        if (license) searchQuery += ` license:${license}`;
        if (typeof is_public === 'boolean') searchQuery += ` is:${is_public ? 'public' : 'private'}`;
        if (archived) searchQuery += ` archived:${archived}`;

        const url = new URL(`${this.endpoints.api}/search/repositories`);
        url.searchParams.set('q', searchQuery);
        if (sort) url.searchParams.set('sort', sort);
        if (order) url.searchParams.set('order', order);
        if (per_page) url.searchParams.set('per_page', per_page.toString());

        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
        // Add enhanced metadata
        if (response.items) {
            response.items = response.items.map(item => ({
                ...item,
                search_metadata: {
                    query: searchQuery,
                    match_type: 'repository',
                    activity_score: this._calculateActivityScore(item),
                    health_score: this._calculateHealthScore(item)
                }
            }));
        }
        
        return response;
    }

    async searchIssues(params, credentials) {
        const { q, owner, repo, type, state, labels, assignee, author, mentions, created, updated, closed, sort, order, per_page } = params;
        
        // Build search query with qualifiers
        let searchQuery = q;
        if (owner && repo) {
            searchQuery += ` repo:${owner}/${repo}`;
        } else if (owner) {
            searchQuery += ` user:${owner}`;
        }
        if (type) searchQuery += ` type:${type}`;
        if (state) searchQuery += ` state:${state}`;
        if (labels) searchQuery += ` label:${labels}`;
        if (assignee) searchQuery += ` assignee:${assignee}`;
        if (author) searchQuery += ` author:${author}`;
        if (mentions) searchQuery += ` mentions:${mentions}`;
        if (created) searchQuery += ` created:${created}`;
        if (updated) searchQuery += ` updated:${updated}`;
        if (closed) searchQuery += ` closed:${closed}`;

        const url = new URL(`${this.endpoints.api}/search/issues`);
        url.searchParams.set('q', searchQuery);
        if (sort) url.searchParams.set('sort', sort);
        if (order) url.searchParams.set('order', order);
        if (per_page) url.searchParams.set('per_page', per_page.toString());

        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
        // Add enhanced metadata
        if (response.items) {
            response.items = response.items.map(item => ({
                ...item,
                search_metadata: {
                    query: searchQuery,
                    match_type: item.pull_request ? 'pull_request' : 'issue',
                    engagement_score: this._calculateEngagementScore(item),
                    activity_status: this._getActivityStatus(item)
                }
            }));
        }
        
        return response;
    }

    async searchUsers(params, credentials) {
        const { q, type, location, language, created, followers, repos, sort, order, per_page } = params;
        
        // Build search query with qualifiers
        let searchQuery = q;
        if (type) searchQuery += ` type:${type}`;
        if (location) searchQuery += ` location:${location}`;
        if (language) searchQuery += ` language:${language}`;
        if (created) searchQuery += ` created:${created}`;
        if (followers) searchQuery += ` followers:${followers}`;
        if (repos) searchQuery += ` repos:${repos}`;

        const url = new URL(`${this.endpoints.api}/search/users`);
        url.searchParams.set('q', searchQuery);
        if (sort) url.searchParams.set('sort', sort);
        if (order) url.searchParams.set('order', order);
        if (per_page) url.searchParams.set('per_page', per_page.toString());

        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
        // Add enhanced metadata
        if (response.items) {
            response.items = response.items.map(item => ({
                ...item,
                search_metadata: {
                    query: searchQuery,
                    match_type: item.type === 'Organization' ? 'organization' : 'user',
                    influence_score: this._calculateInfluenceScore(item),
                    activity_level: this._getUserActivityLevel(item)
                }
            }));
        }
        
        return response;
    }

    async searchTopics(params, credentials) {
        const { q, featured, curated, per_page } = params;
        
        // Build search query
        let searchQuery = q;
        if (featured) searchQuery += ` is:featured`;
        if (curated) searchQuery += ` is:curated`;

        const url = new URL(`${this.endpoints.api}/search/topics`);
        url.searchParams.set('q', searchQuery);
        if (per_page) url.searchParams.set('per_page', per_page.toString());

        // Use preview header for topics search
        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
        // Add enhanced metadata
        if (response.items) {
            response.items = response.items.map(item => ({
                ...item,
                search_metadata: {
                    query: searchQuery,
                    match_type: 'topic',
                    popularity_score: item.score || 0,
                    repository_count: item.repositories || 0
                }
            }));
        }
        
        return response;
    }

    async advancedSearch(params, credentials) {
        const { q, types, owner, repo, limit_per_type, include_metadata } = params;
        const searchTypes = types || ['repositories', 'issues'];
        const limit = Math.min(limit_per_type || 10, 50);

        const results = {
            query: q,
            search_types: searchTypes,
            total_results: 0,
            results_by_type: {},
            unified_results: [],
            search_metadata: {
                executed_at: new Date().toISOString(),
                search_scope: owner && repo ? `${owner}/${repo}` : owner || 'global',
                include_metadata: include_metadata
            }
        };

        // Execute searches in parallel for better performance
        const searchPromises = searchTypes.map(async (type) => {
            try {
                let searchResult;
                const searchParams = { q, per_page: limit, owner, repo };

                switch (type) {
                    case 'repositories':
                        searchResult = await this.searchRepositories(searchParams, credentials);
                        break;
                    case 'code':
                        searchResult = await this.searchCode(searchParams, credentials);
                        break;
                    case 'commits':
                        searchResult = await this.searchCommits(searchParams, credentials);
                        break;
                    case 'issues':
                        searchResult = await this.searchIssues(searchParams, credentials);
                        break;
                    case 'users':
                        searchResult = await this.searchUsers(searchParams, credentials);
                        break;
                    case 'topics':
                        searchResult = await this.searchTopics(searchParams, credentials);
                        break;
                    default:
                        return null;
                }

                if (searchResult && searchResult.items) {
                    results.results_by_type[type] = {
                        total_count: searchResult.total_count || 0,
                        items: searchResult.items,
                        search_metadata: searchResult.search_metadata || {}
                    };
                    
                    results.total_results += searchResult.items.length;

                    // Add to unified results with type annotation
                    searchResult.items.forEach(item => {
                        results.unified_results.push({
                            ...item,
                            _search_type: type,
                            _relevance_score: item.score || 0
                        });
                    });
                }

                return { type, result: searchResult };
            } catch (error) {
                console.error(`Search failed for type ${type}:`, error);
                results.results_by_type[type] = {
                    error: error.message,
                    total_count: 0,
                    items: []
                };
                return null;
            }
        });

        await Promise.all(searchPromises);

        // Sort unified results by relevance
        results.unified_results.sort((a, b) => (b._relevance_score || 0) - (a._relevance_score || 0));

        // Limit unified results to prevent overwhelming responses
        if (results.unified_results.length > limit * searchTypes.length) {
            results.unified_results = results.unified_results.slice(0, limit * searchTypes.length);
        }

        return results;
    }

    // Helper methods for enhanced metadata

    _calculateActivityScore(repo) {
        if (!repo) return 0;
        
        const now = new Date();
        const lastPush = new Date(repo.pushed_at || repo.updated_at);
        const daysSinceLastPush = (now - lastPush) / (1000 * 60 * 60 * 24);
        
        // Score based on recency, stars, and activity
        const recencyScore = Math.max(0, 100 - daysSinceLastPush / 7); // 100 for recent, decreases weekly
        const popularityScore = Math.min(100, Math.log10((repo.stargazers_count || 0) + 1) * 20);
        const activityScore = Math.min(100, (repo.open_issues_count || 0) / 10 * 20);
        
        return Math.round((recencyScore + popularityScore + activityScore) / 3);
    }

    _calculateHealthScore(repo) {
        if (!repo) return 0;
        
        let score = 50; // Base score
        
        // Positive indicators
        if (repo.description) score += 10;
        if (repo.homepage) score += 5;
        if (repo.license) score += 10;
        if (repo.topics && repo.topics.length > 0) score += 10;
        if (repo.stargazers_count > 10) score += 15;
        
        // Recent activity
        const now = new Date();
        const lastPush = new Date(repo.pushed_at || repo.updated_at);
        const daysSinceLastPush = (now - lastPush) / (1000 * 60 * 60 * 24);
        if (daysSinceLastPush < 30) score += 20;
        else if (daysSinceLastPush < 90) score += 10;
        
        return Math.min(100, Math.max(0, score));
    }

    _calculateEngagementScore(issue) {
        if (!issue) return 0;
        
        const comments = issue.comments || 0;
        const reactions = issue.reactions ? issue.reactions.total_count || 0 : 0;
        
        return Math.min(100, (comments * 5) + (reactions * 10));
    }

    _getActivityStatus(issue) {
        if (!issue.updated_at) return 'unknown';
        
        const now = new Date();
        const lastUpdate = new Date(issue.updated_at);
        const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 1) return 'very_active';
        if (daysSinceUpdate < 7) return 'active';
        if (daysSinceUpdate < 30) return 'moderate';
        if (daysSinceUpdate < 90) return 'low';
        return 'stale';
    }

    _calculateInfluenceScore(user) {
        if (!user) return 0;
        
        const followers = user.followers || 0;
        const publicRepos = user.public_repos || 0;
        
        // Logarithmic scale for followers, linear for repos
        const followerScore = Math.min(70, Math.log10(followers + 1) * 20);
        const repoScore = Math.min(30, publicRepos);
        
        return Math.round(followerScore + repoScore);
    }

    _getUserActivityLevel(user) {
        const followers = user.followers || 0;
        const repos = user.public_repos || 0;
        
        if (followers > 1000 || repos > 50) return 'very_high';
        if (followers > 100 || repos > 20) return 'high';
        if (followers > 10 || repos > 5) return 'moderate';
        if (followers > 0 || repos > 0) return 'low';
        return 'minimal';
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