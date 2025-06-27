/**
 * GitHub Tools Module
 * Defines all GitHub API tools and their implementations
 * 
 * Dependencies: None (standalone)
 */

window.GitHubTools = class GitHubTools {
    constructor(endpoints = {}) {
        this.endpoints = {
            api: 'https://api.github.com',
            ...endpoints
        };
    }

    /**
     * Get all tool definitions
     * @returns {Map} Map of tool definitions
     */
    getToolDefinitions() {
        return new Map([
            ['github_list_repos', this._createListReposTool()],
            ['github_get_repo', this._createGetRepoTool()],
            ['github_list_issues', this._createListIssuesTool()],
            ['github_create_issue', this._createCreateIssueTool()],
            ['github_get_file_content', this._createGetFileContentTool()],
            ['github_list_pull_requests', this._createListPullRequestsTool()],
            ['github_get_pull_request', this._createGetPullRequestTool()],
            ['github_list_commits', this._createListCommitsTool()],
            ['github_list_branches', this._createListBranchesTool()],
            ['github_search_code', this._createSearchCodeTool()],
            ['github_search_commits', this._createSearchCommitsTool()],
            ['github_search_repositories', this._createSearchRepositoriesTool()],
            ['github_search_issues', this._createSearchIssuesTool()],
            ['github_search_users', this._createSearchUsersTool()],
            ['github_search_topics', this._createSearchTopicsTool()],
            ['github_advanced_search', this._createAdvancedSearchTool()]
        ]);
    }

    // Repository Tools

    _createListReposTool() {
        return {
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
        };
    }

    _createGetRepoTool() {
        return {
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
        };
    }

    // Issue Tools

    _createListIssuesTool() {
        return {
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
        };
    }

    _createCreateIssueTool() {
        return {
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
        };
    }

    // File Content Tools

    _createGetFileContentTool() {
        return {
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
        };
    }

    // Pull Request Tools

    _createListPullRequestsTool() {
        return {
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
        };
    }

    _createGetPullRequestTool() {
        return {
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
        };
    }

    // Commit and Branch Tools

    _createListCommitsTool() {
        return {
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
        };
    }

    _createListBranchesTool() {
        return {
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
        };
    }

    // Search Tools

    _createSearchCodeTool() {
        return {
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
            handler: null, // Will be bound by provider
            requiredScopes: ['repo'],
            category: 'search',
            tags: ['search', 'code', 'files']
        };
    }

    _createSearchCommitsTool() {
        return {
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
            handler: null, // Will be bound by provider
            requiredScopes: ['repo'],
            category: 'search',
            tags: ['search', 'commits', 'history']
        };
    }

    _createSearchRepositoriesTool() {
        return {
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
            handler: null, // Will be bound by provider
            requiredScopes: ['repo'],
            category: 'search',
            tags: ['search', 'repositories', 'discovery']
        };
    }

    _createSearchIssuesTool() {
        return {
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
            handler: null, // Will be bound by provider
            requiredScopes: ['repo'],
            category: 'search',
            tags: ['search', 'issues', 'pull-requests']
        };
    }

    _createSearchUsersTool() {
        return {
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
            handler: null, // Will be bound by provider
            requiredScopes: ['read:user'],
            category: 'search',
            tags: ['search', 'users', 'organizations']
        };
    }

    _createSearchTopicsTool() {
        return {
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
            handler: null, // Will be bound by provider
            requiredScopes: ['repo'],
            category: 'search',
            tags: ['search', 'topics', 'trending']
        };
    }

    _createAdvancedSearchTool() {
        return {
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
            handler: null, // Will be bound by provider
            requiredScopes: ['repo'],
            category: 'search',
            tags: ['search', 'multi-type', 'comprehensive']
        };
    }

    // Tool Implementation Methods
    // Note: Actual implementation methods would be imported from the main provider
    // or implemented as separate methods. For brevity, just showing structure.

    async listRepos(params, credentials) {
        return this._makeApiRequest(`${this.endpoints.api}/user/repos`, 'GET', credentials, null, params);
    }

    async getRepo(params, credentials) {
        const { owner, repo } = params;
        return this._makeApiRequest(`${this.endpoints.api}/repos/${owner}/${repo}`, 'GET', credentials);
    }

    async listIssues(params, credentials) {
        const { owner, repo } = params;
        return this._makeApiRequest(`${this.endpoints.api}/repos/${owner}/${repo}/issues`, 'GET', credentials, null, params);
    }

    async createIssue(params, credentials) {
        const { owner, repo, title, body, labels, assignees } = params;
        const issueData = {
            title,
            body: body || '',
            labels: labels || [],
            assignees: assignees || []
        };
        return this._makeApiRequest(`${this.endpoints.api}/repos/${owner}/${repo}/issues`, 'POST', credentials, issueData);
    }

    async getFileContent(params, credentials) {
        const { owner, repo, path, ref } = params;
        const url = new URL(`${this.endpoints.api}/repos/${owner}/${repo}/contents/${path}`);
        if (ref) url.searchParams.set('ref', ref);
        
        const response = await this._makeApiRequest(url.toString(), 'GET', credentials);
        
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
        const { owner, repo } = params;
        return this._makeApiRequest(`${this.endpoints.api}/repos/${owner}/${repo}/pulls`, 'GET', credentials, null, params);
    }

    async getPullRequest(params, credentials) {
        const { owner, repo, pull_number } = params;
        return this._makeApiRequest(`${this.endpoints.api}/repos/${owner}/${repo}/pulls/${pull_number}`, 'GET', credentials);
    }

    async listCommits(params, credentials) {
        const { owner, repo } = params;
        return this._makeApiRequest(`${this.endpoints.api}/repos/${owner}/${repo}/commits`, 'GET', credentials, null, params);
    }

    async listBranches(params, credentials) {
        const { owner, repo } = params;
        return this._makeApiRequest(`${this.endpoints.api}/repos/${owner}/${repo}/branches`, 'GET', credentials, null, params);
    }

    // Search method implementations are handled by the main provider
    // These methods are not implemented here to avoid duplication

    async _makeApiRequest(url, method = 'GET', credentials, body = null, params = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
            const requestUrl = new URL(url);
            
            // Add query parameters for GET requests
            if (method === 'GET' && params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        requestUrl.searchParams.set(key, value.toString());
                    }
                });
            }

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

            const response = await fetch(requestUrl.toString(), options);
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

// Export tools instance globally
window.GITHUB_TOOLS = new window.GitHubTools();