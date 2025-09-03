/**
 * GitHub API Functions
 * Complete set of JavaScript functions for interacting with GitHub API
 * These functions directly make API calls and can be used independently
 */

window.GitHubFunctions = {
    id: 'github-functions',
    name: 'GitHub Functions',
    description: 'Complete GitHub API integration - repositories, issues, PRs, commits, search, and more',
    groupId: 'github-functions-group',
    functions: [
        // Repository Management
        {
            name: 'github_list_repos',
            code: `/**
 * List repositories for the authenticated user
 * @description List all repositories accessible to the authenticated user with filtering options
 * @param {string} type - Type of repositories (all, owner, member)
 * @param {string} sort - Sort field (created, updated, pushed, full_name)
 * @param {number} per_page - Results per page (max 100)
 * @returns {Promise<Object>} List of repositories
 * @callable
 */
async function github_list_repos(type = 'all', sort = 'updated', per_page = 30) {
    try {
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL with parameters
        const url = new URL('https://api.github.com/user/repos');
        url.searchParams.append('type', type);
        url.searchParams.append('sort', sort);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            count: data.length,
            repositories: data.map(repo => ({
                name: repo.full_name,
                description: repo.description,
                private: repo.private,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                issues: repo.open_issues_count,
                url: repo.html_url,
                clone_url: repo.clone_url,
                updated: repo.updated_at
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_get_repo',
            code: `/**
 * Get detailed repository information
 * @description Get comprehensive details about a specific repository
 * @param {string} owner - Repository owner (username or organization)
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository details
 * @callable
 */
async function github_get_repo(owner, repo) {
    try {
        if (!owner || !repo) {
            return {
                error: "Both owner and repo parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Make API request
        const response = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}\`, {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            repository: {
                name: data.full_name,
                description: data.description,
                private: data.private,
                language: data.language,
                stars: data.stargazers_count,
                forks: data.forks_count,
                watchers: data.watchers_count,
                issues: data.open_issues_count,
                default_branch: data.default_branch,
                topics: data.topics,
                homepage: data.homepage,
                created: data.created_at,
                updated: data.updated_at,
                pushed: data.pushed_at,
                size: data.size,
                url: data.html_url,
                clone_url: data.clone_url,
                ssh_url: data.ssh_url
            }
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Issue Management
        {
            name: 'github_list_issues',
            code: `/**
 * List repository issues
 * @description List issues in a repository with filtering options
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} state - Issue state (open, closed, all)
 * @param {string} labels - Comma-separated label names
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} List of issues
 * @callable
 */
async function github_list_issues(owner, repo, state = 'open', labels = '', per_page = 30) {
    try {
        if (!owner || !repo) {
            return {
                error: "Both owner and repo parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        const url = new URL(\`https://api.github.com/repos/\${owner}/\${repo}/issues\`);
        url.searchParams.append('state', state);
        if (labels) url.searchParams.append('labels', labels);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            count: data.length,
            issues: data.map(issue => ({
                number: issue.number,
                title: issue.title,
                state: issue.state,
                body: issue.body,
                user: issue.user.login,
                labels: issue.labels.map(l => l.name),
                assignees: issue.assignees.map(a => a.login),
                comments: issue.comments,
                created: issue.created_at,
                updated: issue.updated_at,
                url: issue.html_url
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_create_issue',
            code: `/**
 * Create a new issue
 * @description Create a new issue in a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} title - Issue title
 * @param {string} body - Issue description
 * @param {string} labels - Comma-separated label names
 * @param {string} assignees - Comma-separated assignee usernames
 * @returns {Promise<Object>} Created issue details
 * @callable
 */
async function github_create_issue(owner, repo, title, body = '', labels = '', assignees = '') {
    try {
        if (!owner || !repo || !title) {
            return {
                error: "Owner, repo, and title parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build request body
        const requestBody = {
            title: title,
            body: body || ''
        };
        
        if (labels) {
            requestBody.labels = labels.split(',').map(l => l.trim());
        }
        
        if (assignees) {
            requestBody.assignees = assignees.split(',').map(a => a.trim());
        }
        
        // Make API request
        const response = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}/issues\`, {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            issue: {
                number: data.number,
                title: data.title,
                state: data.state,
                body: data.body,
                user: data.user.login,
                labels: data.labels.map(l => l.name),
                assignees: data.assignees.map(a => a.login),
                created: data.created_at,
                url: data.html_url
            }
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // File Operations
        {
            name: 'github_get_file_content',
            code: `/**
 * Get file content from repository
 * @description Retrieve the content of a file from a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path in repository
 * @param {string} ref - Branch, tag, or commit SHA (optional)
 * @returns {Promise<Object>} File content and metadata
 * @callable
 */
async function github_get_file_content(owner, repo, path, ref = '') {
    try {
        if (!owner || !repo || !path) {
            return {
                error: "Owner, repo, and path parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        let url = \`https://api.github.com/repos/\${owner}/\${repo}/contents/\${path}\`;
        if (ref) {
            url += \`?ref=\${ref}\`;
        }
        
        // Make API request
        const response = await fetch(url, {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        
        // Decode base64 content if it's a file
        let content = data.content;
        if (data.type === 'file' && data.encoding === 'base64') {
            try {
                content = atob(data.content.replace(/\\n/g, ''));
            } catch (e) {
                console.warn('Could not decode base64 content');
            }
        }
        
        return {
            success: true,
            file: {
                name: data.name,
                path: data.path,
                type: data.type,
                size: data.size,
                content: content,
                encoding: data.encoding,
                sha: data.sha,
                url: data.html_url,
                download_url: data.download_url
            }
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Pull Requests
        {
            name: 'github_list_pull_requests',
            code: `/**
 * List pull requests
 * @description List pull requests in a repository with filtering
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} state - PR state (open, closed, all)
 * @param {string} base - Base branch to filter by
 * @param {string} head - Head branch to filter by
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} List of pull requests
 * @callable
 */
async function github_list_pull_requests(owner, repo, state = 'open', base = '', head = '', per_page = 30) {
    try {
        if (!owner || !repo) {
            return {
                error: "Both owner and repo parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        const url = new URL(\`https://api.github.com/repos/\${owner}/\${repo}/pulls\`);
        url.searchParams.append('state', state);
        if (base) url.searchParams.append('base', base);
        if (head) url.searchParams.append('head', head);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            count: data.length,
            pull_requests: data.map(pr => ({
                number: pr.number,
                title: pr.title,
                state: pr.state,
                body: pr.body,
                user: pr.user.login,
                head: pr.head.ref,
                base: pr.base.ref,
                draft: pr.draft,
                merged: pr.merged,
                mergeable: pr.mergeable,
                created: pr.created_at,
                updated: pr.updated_at,
                url: pr.html_url
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_get_pull_request',
            code: `/**
 * Get pull request details
 * @description Get detailed information about a specific pull request
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pull_number - Pull request number
 * @returns {Promise<Object>} Pull request details
 * @callable
 */
async function github_get_pull_request(owner, repo, pull_number) {
    try {
        if (!owner || !repo || !pull_number) {
            return {
                error: "Owner, repo, and pull_number parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Make API request
        const response = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}/pulls/\${pull_number}\`, {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            pull_request: {
                number: data.number,
                title: data.title,
                state: data.state,
                body: data.body,
                user: data.user.login,
                head: {
                    ref: data.head.ref,
                    sha: data.head.sha,
                    repo: data.head.repo?.full_name
                },
                base: {
                    ref: data.base.ref,
                    sha: data.base.sha,
                    repo: data.base.repo?.full_name
                },
                draft: data.draft,
                merged: data.merged,
                mergeable: data.mergeable,
                mergeable_state: data.mergeable_state,
                comments: data.comments,
                commits: data.commits,
                additions: data.additions,
                deletions: data.deletions,
                changed_files: data.changed_files,
                created: data.created_at,
                updated: data.updated_at,
                merged_at: data.merged_at,
                url: data.html_url
            }
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Commits and Branches
        {
            name: 'github_list_commits',
            code: `/**
 * List repository commits
 * @description List commits in a repository with filtering options
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Branch, tag, or commit SHA to start from
 * @param {string} path - Only commits containing this file path
 * @param {string} since - ISO 8601 date - only commits after this date
 * @param {string} until - ISO 8601 date - only commits before this date
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} List of commits
 * @callable
 */
async function github_list_commits(owner, repo, sha = '', path = '', since = '', until = '', per_page = 30) {
    try {
        if (!owner || !repo) {
            return {
                error: "Both owner and repo parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        const url = new URL(\`https://api.github.com/repos/\${owner}/\${repo}/commits\`);
        if (sha) url.searchParams.append('sha', sha);
        if (path) url.searchParams.append('path', path);
        if (since) url.searchParams.append('since', since);
        if (until) url.searchParams.append('until', until);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            count: data.length,
            commits: data.map(commit => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: {
                    name: commit.commit.author.name,
                    email: commit.commit.author.email,
                    date: commit.commit.author.date,
                    username: commit.author?.login
                },
                committer: {
                    name: commit.commit.committer.name,
                    email: commit.commit.committer.email,
                    date: commit.commit.committer.date,
                    username: commit.committer?.login
                },
                url: commit.html_url
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_list_branches',
            code: `/**
 * List repository branches
 * @description List all branches in a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {boolean} protected_only - Only show protected branches
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} List of branches
 * @callable
 */
async function github_list_branches(owner, repo, protected_only = false, per_page = 30) {
    try {
        if (!owner || !repo) {
            return {
                error: "Both owner and repo parameters are required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        const url = new URL(\`https://api.github.com/repos/\${owner}/\${repo}/branches\`);
        if (protected_only) url.searchParams.append('protected', 'true');
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            count: data.length,
            branches: data.map(branch => ({
                name: branch.name,
                commit: {
                    sha: branch.commit.sha,
                    url: branch.commit.url
                },
                protected: branch.protected
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Search Functions
        {
            name: 'github_search_code',
            code: `/**
 * Search for code across GitHub
 * @description Search for code snippets across GitHub repositories
 * @param {string} query - Search query (e.g., "addClass language:js")
 * @param {string} language - Programming language filter
 * @param {string} filename - Search within specific filename
 * @param {string} extension - Filter by file extension
 * @param {string} owner - Limit to specific user/org
 * @param {string} repo - Limit to specific repository
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} Search results
 * @callable
 */
async function github_search_code(query, language = '', filename = '', extension = '', owner = '', repo = '', per_page = 30) {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build search query
        let searchQuery = query;
        if (language) searchQuery += \` language:\${language}\`;
        if (filename) searchQuery += \` filename:\${filename}\`;
        if (extension) searchQuery += \` extension:\${extension}\`;
        if (owner && repo) searchQuery += \` repo:\${owner}/\${repo}\`;
        else if (owner) searchQuery += \` user:\${owner}\`;
        
        // Build API URL
        const url = new URL('https://api.github.com/search/code');
        url.searchParams.append('q', searchQuery);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            total_count: data.total_count,
            items: data.items.map(item => ({
                name: item.name,
                path: item.path,
                repository: item.repository.full_name,
                score: item.score,
                url: item.html_url,
                sha: item.sha
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_search_repositories',
            code: `/**
 * Search for repositories
 * @description Search for repositories on GitHub with advanced filtering
 * @param {string} query - Search query (e.g., "javascript stars:>1000")
 * @param {string} sort - Sort field (stars, forks, help-wanted-issues, updated)
 * @param {string} order - Sort order (asc, desc)
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} Search results
 * @callable
 */
async function github_search_repositories(query, sort = 'stars', order = 'desc', per_page = 30) {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        const url = new URL('https://api.github.com/search/repositories');
        url.searchParams.append('q', query);
        url.searchParams.append('sort', sort);
        url.searchParams.append('order', order);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            total_count: data.total_count,
            repositories: data.items.map(repo => ({
                name: repo.full_name,
                description: repo.description,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language,
                topics: repo.topics,
                created: repo.created_at,
                updated: repo.updated_at,
                url: repo.html_url,
                score: repo.score
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_search_issues',
            code: `/**
 * Search for issues and pull requests
 * @description Search for issues and pull requests across GitHub
 * @param {string} query - Search query
 * @param {string} sort - Sort field (comments, reactions, reactions-+1, created, updated)
 * @param {string} order - Sort order (asc, desc)
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} Search results
 * @callable
 */
async function github_search_issues(query, sort = 'created', order = 'desc', per_page = 30) {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        const url = new URL('https://api.github.com/search/issues');
        url.searchParams.append('q', query);
        url.searchParams.append('sort', sort);
        url.searchParams.append('order', order);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            total_count: data.total_count,
            items: data.items.map(item => ({
                number: item.number,
                title: item.title,
                state: item.state,
                user: item.user.login,
                repository: item.repository_url.split('/').slice(-2).join('/'),
                labels: item.labels.map(l => l.name),
                comments: item.comments,
                created: item.created_at,
                updated: item.updated_at,
                url: item.html_url,
                type: item.pull_request ? 'pull_request' : 'issue',
                score: item.score
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_search_users',
            code: `/**
 * Search for GitHub users
 * @description Search for users and organizations on GitHub
 * @param {string} query - Search query (e.g., "location:san-francisco followers:>100")
 * @param {string} sort - Sort field (followers, repositories, joined)
 * @param {string} order - Sort order (asc, desc)
 * @param {number} per_page - Results per page
 * @returns {Promise<Object>} Search results
 * @callable
 */
async function github_search_users(query, sort = 'followers', order = 'desc', per_page = 30) {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Build API URL
        const url = new URL('https://api.github.com/search/users');
        url.searchParams.append('q', query);
        url.searchParams.append('sort', sort);
        url.searchParams.append('order', order);
        url.searchParams.append('per_page', per_page);
        
        // Make API request
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            total_count: data.total_count,
            users: data.items.map(user => ({
                login: user.login,
                type: user.type,
                avatar_url: user.avatar_url,
                url: user.html_url,
                score: user.score
            }))
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Additional utility functions
        {
            name: 'github_get_user_info',
            code: `/**
 * Get authenticated user information
 * @description Get detailed information about the authenticated GitHub user
 * @returns {Promise<Object>} User information
 * @callable
 */
async function github_get_user_info() {
    try {
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Make API request
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            user: {
                login: data.login,
                name: data.name,
                email: data.email,
                bio: data.bio,
                company: data.company,
                location: data.location,
                blog: data.blog,
                public_repos: data.public_repos,
                public_gists: data.public_gists,
                followers: data.followers,
                following: data.following,
                created_at: data.created_at,
                updated_at: data.updated_at,
                profile_url: data.html_url,
                avatar_url: data.avatar_url
            }
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        {
            name: 'github_create_gist',
            code: `/**
 * Create a GitHub gist
 * @description Create a new gist on GitHub for sharing code snippets
 * @param {string} description - Gist description
 * @param {string} filename - Name of the file in the gist
 * @param {string} content - Content of the file
 * @param {boolean} isPublic - Whether the gist should be public
 * @returns {Promise<Object>} Created gist information
 * @callable
 */
async function github_create_gist(description, filename, content, isPublic = false) {
    try {
        // Get stored GitHub token
        const encryptedToken = localStorage.getItem('mcp_github_token');
        if (!encryptedToken) {
            return {
                error: "GitHub not connected. Please connect GitHub in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the token
        const decryptionKey = localStorage.getItem('mcp_github_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access GitHub credentials",
                success: false
            };
        }
        
        const token = await window.EncryptionService.decrypt(encryptedToken, decryptionKey);
        
        // Create gist payload
        const payload = {
            description: description || 'Created via hacka.re',
            public: isPublic,
            files: {
                [filename || 'file.txt']: {
                    content: content || ''
                }
            }
        };
        
        // Make API request
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`GitHub API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            gist: {
                id: data.id,
                description: data.description,
                public: data.public,
                url: data.html_url,
                raw_url: Object.values(data.files)[0].raw_url,
                files: Object.keys(data.files).map(name => ({
                    filename: name,
                    language: data.files[name].language,
                    size: data.files[name].size,
                    raw_url: data.files[name].raw_url
                })),
                created_at: data.created_at,
                updated_at: data.updated_at
            }
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        }
    ]
};