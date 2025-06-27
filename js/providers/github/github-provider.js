/**
 * GitHub Provider Core
 * Main provider class implementing the MCP provider interface
 * 
 * Dependencies: window.MCPProviderInterface, window.GitHubAuth, window.GitHubTools
 */

window.GitHubProvider = class GitHubProvider extends window.MCPProviderInterface {
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
        
        // Initialize auth and tools modules
        this.auth = new window.GitHubAuth({
            endpoints: this.endpoints,
            requiredScopes: this.requiredScopes
        });
        
        this.githubTools = new window.GitHubTools(this.endpoints);
        this.tools = this.githubTools.getToolDefinitions();
        
        // Set up tool handlers to use proper context
        this._bindToolHandlers();
    }

    /**
     * Authenticate with GitHub
     * @param {Object} authConfig - Authentication configuration
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(authConfig = {}) {
        try {
            const result = await this.auth.authenticate({
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

    /**
     * Validate credentials
     * @param {Object} credentials - Credentials to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateCredentials(credentials) {
        return await this.auth.validateCredentials(credentials);
    }

    /**
     * Refresh tokens (not supported for GitHub PAT)
     * @param {string} refreshToken - Refresh token (unused)
     * @returns {Promise<Object>} Error result
     */
    async refreshTokens(refreshToken) {
        return await this.auth.refreshTokens(refreshToken);
    }

    /**
     * Get tool definitions
     * @returns {Promise<Array>} Array of tool definitions
     */
    async getToolDefinitions() {
        return Array.from(this.tools.values());
    }

    /**
     * Execute a tool
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} parameters - Tool parameters
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Tool execution result
     */
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

    /**
     * Get saved credentials
     * @returns {Promise<Object|null>} Saved credentials or null
     */
    async getSavedCredentials() {
        return await this.auth.getCredentials();
    }

    /**
     * Check if valid credentials exist
     * @returns {Promise<boolean>} True if valid credentials exist
     */
    async hasValidCredentials() {
        return await this.auth.hasValidToken();
    }

    /**
     * Get user information
     * @returns {Promise<Object|null>} User info or null
     */
    async getUserInfo() {
        const credentials = await this.getSavedCredentials();
        if (!credentials) return null;
        
        return await this.auth.getUserInfo(credentials.token);
    }

    /**
     * Save authentication token
     * @param {string} token - GitHub PAT token
     * @returns {Promise<void>}
     */
    async saveToken(token) {
        return await this.auth.saveToken(token);
    }

    /**
     * Remove saved token
     * @returns {Promise<void>}
     */
    async removeToken() {
        return await this.auth.removeToken();
    }

    /**
     * Validate a token directly
     * @param {string} token - GitHub PAT token
     * @returns {Promise<boolean>} True if valid
     */
    async validateToken(token) {
        return await this.auth.validateToken(token);
    }

    // Tool implementation methods (delegated to GitHubTools)

    async listRepos(params = {}, credentials) {
        return await this.githubTools.listRepos(params, credentials);
    }

    async getRepo(params, credentials) {
        return await this.githubTools.getRepo(params, credentials);
    }

    async listIssues(params, credentials) {
        return await this.githubTools.listIssues(params, credentials);
    }

    async createIssue(params, credentials) {
        return await this.githubTools.createIssue(params, credentials);
    }

    async getFileContent(params, credentials) {
        return await this.githubTools.getFileContent(params, credentials);
    }

    async listPullRequests(params, credentials) {
        return await this.githubTools.listPullRequests(params, credentials);
    }

    async getPullRequest(params, credentials) {
        return await this.githubTools.getPullRequest(params, credentials);
    }

    async listCommits(params, credentials) {
        return await this.githubTools.listCommits(params, credentials);
    }

    async listBranches(params, credentials) {
        return await this.githubTools.listBranches(params, credentials);
    }

    async searchCode(params, credentials) {
        return await this._searchWithMetadata(params, credentials, 'code');
    }

    async searchCommits(params, credentials) {
        return await this._searchWithMetadata(params, credentials, 'commits');
    }

    async searchRepositories(params, credentials) {
        return await this._searchWithMetadata(params, credentials, 'repositories');
    }

    async searchIssues(params, credentials) {
        return await this._searchWithMetadata(params, credentials, 'issues');
    }

    async searchUsers(params, credentials) {
        return await this._searchWithMetadata(params, credentials, 'users');
    }

    async searchTopics(params, credentials) {
        return await this._searchWithMetadata(params, credentials, 'topics');
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

        // Execute searches in parallel
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

        // Limit unified results
        if (results.unified_results.length > limit * searchTypes.length) {
            results.unified_results = results.unified_results.slice(0, limit * searchTypes.length);
        }

        return results;
    }

    // Private helper methods

    /**
     * Bind tool handlers to proper context
     */
    _bindToolHandlers() {
        for (const [toolName, tool] of this.tools) {
            const originalHandler = tool.handler;
            
            // Special handling for search tools which need provider implementation
            if (toolName.includes('_search')) {
                const methodName = toolName.replace('github_', '');
                const camelCaseMethod = methodName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                
                if (this[camelCaseMethod]) {
                    tool.handler = async (params, credentials) => {
                        return await this[camelCaseMethod](params, credentials);
                    };
                }
            } else if (originalHandler) {
                tool.handler = async (params, credentials) => {
                    return await originalHandler.call(this, params, credentials);
                };
            }
        }
    }

    /**
     * Execute search with enhanced metadata
     * @param {Object} params - Search parameters
     * @param {Object} credentials - API credentials
     * @param {string} searchType - Type of search
     * @returns {Promise<Object>} Search results with metadata
     */
    async _searchWithMetadata(params, credentials, searchType) {
        const searchQuery = this._buildSearchQuery(params, searchType);
        const url = this._buildSearchUrl(searchType, searchQuery, params);
        
        const response = await this._makeApiRequest(url, 'GET', credentials);
        
        // Add enhanced metadata to results
        if (response.items) {
            response.items = response.items.map(item => ({
                ...item,
                search_metadata: this._generateSearchMetadata(item, searchType, searchQuery)
            }));
        }
        
        return response;
    }

    /**
     * Build search query with qualifiers
     * @param {Object} params - Search parameters
     * @param {string} searchType - Type of search
     * @returns {string} Built search query
     */
    _buildSearchQuery(params, searchType) {
        const { q, owner, repo } = params;
        let searchQuery = q;
        
        if (owner && repo) {
            searchQuery += ` repo:${owner}/${repo}`;
        } else if (owner) {
            searchQuery += ` user:${owner}`;
        }
        
        // Add type-specific qualifiers
        switch (searchType) {
            case 'code':
                if (params.language) searchQuery += ` language:${params.language}`;
                if (params.filename) searchQuery += ` filename:${params.filename}`;
                if (params.extension) searchQuery += ` extension:${params.extension}`;
                if (params.path) searchQuery += ` path:${params.path}`;
                if (params.size) searchQuery += ` size:${params.size}`;
                break;
            case 'commits':
                if (params.author) searchQuery += ` author:${params.author}`;
                if (params.committer) searchQuery += ` committer:${params.committer}`;
                if (params.author_date) searchQuery += ` author-date:${params.author_date}`;
                if (params.committer_date) searchQuery += ` committer-date:${params.committer_date}`;
                if (params.merge) searchQuery += ` merge:true`;
                break;
            case 'repositories':
                if (params.language) searchQuery += ` language:${params.language}`;
                if (params.topic) searchQuery += ` topic:${params.topic}`;
                if (params.stars) searchQuery += ` stars:${params.stars}`;
                if (params.forks) searchQuery += ` forks:${params.forks}`;
                if (params.size) searchQuery += ` size:${params.size}`;
                if (params.created) searchQuery += ` created:${params.created}`;
                if (params.pushed) searchQuery += ` pushed:${params.pushed}`;
                if (params.license) searchQuery += ` license:${params.license}`;
                if (typeof params.is_public === 'boolean') searchQuery += ` is:${params.is_public ? 'public' : 'private'}`;
                if (params.archived) searchQuery += ` archived:${params.archived}`;
                break;
            case 'issues':
                if (params.type) searchQuery += ` type:${params.type}`;
                if (params.state) searchQuery += ` state:${params.state}`;
                if (params.labels) searchQuery += ` label:${params.labels}`;
                if (params.assignee) searchQuery += ` assignee:${params.assignee}`;
                if (params.author) searchQuery += ` author:${params.author}`;
                if (params.mentions) searchQuery += ` mentions:${params.mentions}`;
                if (params.created) searchQuery += ` created:${params.created}`;
                if (params.updated) searchQuery += ` updated:${params.updated}`;
                if (params.closed) searchQuery += ` closed:${params.closed}`;
                break;
            case 'users':
                if (params.type) searchQuery += ` type:${params.type}`;
                if (params.location) searchQuery += ` location:${params.location}`;
                if (params.language) searchQuery += ` language:${params.language}`;
                if (params.created) searchQuery += ` created:${params.created}`;
                if (params.followers) searchQuery += ` followers:${params.followers}`;
                if (params.repos) searchQuery += ` repos:${params.repos}`;
                break;
            case 'topics':
                if (params.featured) searchQuery += ` is:featured`;
                if (params.curated) searchQuery += ` is:curated`;
                break;
        }
        
        return searchQuery;
    }

    /**
     * Build search API URL
     * @param {string} searchType - Type of search
     * @param {string} searchQuery - Built search query
     * @param {Object} params - Search parameters
     * @returns {string} API URL
     */
    _buildSearchUrl(searchType, searchQuery, params) {
        const url = new URL(`${this.endpoints.api}/search/${searchType}`);
        url.searchParams.set('q', searchQuery);
        
        if (params.sort) url.searchParams.set('sort', params.sort);
        if (params.order) url.searchParams.set('order', params.order);
        if (params.per_page) url.searchParams.set('per_page', params.per_page.toString());
        if (params.page) url.searchParams.set('page', params.page.toString());
        
        return url.toString();
    }

    /**
     * Generate search metadata for items
     * @param {Object} item - Search result item
     * @param {string} searchType - Type of search
     * @param {string} searchQuery - Search query used
     * @returns {Object} Search metadata
     */
    _generateSearchMetadata(item, searchType, searchQuery) {
        const metadata = {
            query: searchQuery,
            match_type: searchType
        };
        
        switch (searchType) {
            case 'code':
                metadata.file_size = item.size || null;
                metadata.language = item.language || 'unknown';
                break;
            case 'commits':
                metadata.files_changed = item.files ? item.files.length : null;
                metadata.commit_date = item.commit?.author?.date || null;
                break;
            case 'repositories':
                metadata.activity_score = this._calculateActivityScore(item);
                metadata.health_score = this._calculateHealthScore(item);
                break;
            case 'issues':
                metadata.match_type = item.pull_request ? 'pull_request' : 'issue';
                metadata.engagement_score = this._calculateEngagementScore(item);
                metadata.activity_status = this._getActivityStatus(item);
                break;
            case 'users':
                metadata.match_type = item.type === 'Organization' ? 'organization' : 'user';
                metadata.influence_score = this._calculateInfluenceScore(item);
                metadata.activity_level = this._getUserActivityLevel(item);
                break;
            case 'topics':
                metadata.popularity_score = item.score || 0;
                metadata.repository_count = item.repositories || 0;
                break;
        }
        
        return metadata;
    }

    // Metric calculation methods

    _calculateActivityScore(repo) {
        if (!repo) return 0;
        
        const now = new Date();
        const lastPush = new Date(repo.pushed_at || repo.updated_at);
        const daysSinceLastPush = (now - lastPush) / (1000 * 60 * 60 * 24);
        
        const recencyScore = Math.max(0, 100 - daysSinceLastPush / 7);
        const popularityScore = Math.min(100, Math.log10((repo.stargazers_count || 0) + 1) * 20);
        const activityScore = Math.min(100, (repo.open_issues_count || 0) / 10 * 20);
        
        return Math.round((recencyScore + popularityScore + activityScore) / 3);
    }

    _calculateHealthScore(repo) {
        if (!repo) return 0;
        
        let score = 50;
        
        if (repo.description) score += 10;
        if (repo.homepage) score += 5;
        if (repo.license) score += 10;
        if (repo.topics && repo.topics.length > 0) score += 10;
        if (repo.stargazers_count > 10) score += 15;
        
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

    /**
     * Make API request with timeout and error handling
     * @param {string} url - API URL
     * @param {string} method - HTTP method
     * @param {Object} credentials - API credentials
     * @param {Object} body - Request body
     * @returns {Promise<Object>} API response
     */
    async _makeApiRequest(url, method = 'GET', credentials, body = null) {
        return await this.githubTools._makeApiRequest(url, method, credentials, body);
    }

    /**
     * Create error response object
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @returns {Object} Error response
     */
    _createError(message, code) {
        return {
            success: false,
            error: message,
            code: code
        };
    }
}