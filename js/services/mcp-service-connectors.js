/**
 * MCP Service Connectors - GitHub, Gmail, and Google Docs Integration
 * 
 * This module provides specialized connectors for popular services that require
 * custom authentication and API handling. It builds on the existing MCP infrastructure
 * to provide seamless integration with external services.
 */

(function(global) {
    'use strict';

    // Service-specific configurations
    const SERVICE_CONFIGS = {
        github: {
            name: 'GitHub',
            icon: 'fab fa-github',
            description: 'Access GitHub repositories, issues, and pull requests',
            authType: 'pat', // Personal Access Token
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
            tools: {} // Tools will be dynamically loaded from GitHubProvider
        },
        gmail: {
            name: 'Gmail',
            icon: 'fas fa-envelope',
            description: 'Access Gmail messages and send emails',
            authType: 'oauth-device',
            apiBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
            oauthConfig: {
                authorizationEndpoint: 'https://oauth2.googleapis.com/device/code',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
                scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
                clientId: '', // To be configured by user
                requiresClientSecret: true
            },
            setupInstructions: {
                title: 'Gmail OAuth Setup',
                steps: [
                    'Create a Google Cloud Project and enable Gmail API',
                    'Create OAuth 2.0 credentials (Desktop application type)',
                    'Copy your Client ID and Client Secret',
                    'Enter them below to start the device flow authentication',
                    'You\'ll be given a code to enter on Google\'s device page',
                    'Grant permissions to access your Gmail'
                ],
                docUrl: 'https://developers.google.com/gmail/api/quickstart/js'
            },
            tools: {
                list_messages: {
                    description: 'List Gmail messages',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Gmail search query (e.g., "is:unread")' },
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            labelIds: { type: 'array', items: { type: 'string' } }
                        }
                    }
                },
                get_message: {
                    description: 'Get a specific email message',
                    parameters: {
                        type: 'object',
                        properties: {
                            messageId: { type: 'string', description: 'Gmail message ID' }
                        },
                        required: ['messageId']
                    }
                },
                send_message: {
                    description: 'Send an email',
                    parameters: {
                        type: 'object',
                        properties: {
                            to: { type: 'string' },
                            subject: { type: 'string' },
                            body: { type: 'string' },
                            cc: { type: 'string' },
                            bcc: { type: 'string' }
                        },
                        required: ['to', 'subject', 'body']
                    }
                },
                search_messages: {
                    description: 'Search Gmail messages with advanced query',
                    parameters: {
                        type: 'object',
                        properties: {
                            from: { type: 'string' },
                            to: { type: 'string' },
                            subject: { type: 'string' },
                            after: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            before: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            hasAttachment: { type: 'boolean' }
                        }
                    }
                }
            }
        },
        gdocs: {
            name: 'Google Docs',
            icon: 'fas fa-file-alt',
            description: 'Access and edit Google Docs',
            authType: 'oauth-shared', // Share OAuth with Gmail
            apiBaseUrl: 'https://docs.googleapis.com/v1',
            driveApiBaseUrl: 'https://www.googleapis.com/drive/v3',
            oauthConfig: {
                // Shares OAuth with Gmail but adds Docs/Drive scopes
                additionalScopes: [
                    'https://www.googleapis.com/auth/documents',
                    'https://www.googleapis.com/auth/drive.readonly'
                ]
            },
            setupInstructions: {
                title: 'Google Docs OAuth Setup',
                steps: [
                    'Google Docs uses the same authentication as Gmail',
                    'If you\'ve already connected Gmail, Docs will work automatically',
                    'Otherwise, set up Gmail first to enable Google Docs access',
                    'Additional permissions for Docs will be requested if needed'
                ],
                docUrl: 'https://developers.google.com/docs/api/quickstart/js'
            },
            tools: {
                list_documents: {
                    description: 'List Google Docs from Drive',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Search query' },
                            maxResults: { type: 'number', default: 20, maximum: 100 },
                            orderBy: { type: 'string', enum: ['modifiedTime', 'name', 'createdTime'] }
                        }
                    }
                },
                read_document: {
                    description: 'Read content of a Google Doc',
                    parameters: {
                        type: 'object',
                        properties: {
                            documentId: { type: 'string', description: 'Google Doc ID' }
                        },
                        required: ['documentId']
                    }
                },
                create_document: {
                    description: 'Create a new Google Doc',
                    parameters: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            content: { type: 'string', description: 'Initial content' }
                        },
                        required: ['title']
                    }
                },
                update_document: {
                    description: 'Update a Google Doc',
                    parameters: {
                        type: 'object',
                        properties: {
                            documentId: { type: 'string' },
                            requests: { type: 'array', description: 'Batch update requests' }
                        },
                        required: ['documentId', 'requests']
                    }
                },
                append_text: {
                    description: 'Append text to a Google Doc',
                    parameters: {
                        type: 'object',
                        properties: {
                            documentId: { type: 'string' },
                            text: { type: 'string' }
                        },
                        required: ['documentId', 'text']
                    }
                }
            }
        }
    };

    class MCPServiceConnectors {
        constructor() {
            this.connectedServices = new Map();
            this.oauthTokens = new Map();
            this.initializeEventListeners();
        }

        initializeEventListeners() {
            // Listen for OAuth callbacks
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'oauth-callback') {
                    this.handleOAuthCallback(event.data);
                }
            });
        }

        /**
         * Connect to a service (GitHub, Gmail, or Google Docs)
         */
        async connectService(serviceKey) {
            const config = SERVICE_CONFIGS[serviceKey];
            if (!config) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            console.log(`[MCP Service Connectors] Connecting to ${config.name}...`);

            switch (config.authType) {
                case 'pat':
                    return await this.connectWithPAT(serviceKey, config);
                case 'oauth-device':
                    return await this.connectWithOAuthDevice(serviceKey, config);
                case 'oauth-shared':
                    return await this.connectWithSharedOAuth(serviceKey, config);
                default:
                    throw new Error(`Unknown auth type: ${config.authType}`);
            }
        }

        /**
         * Connect using Personal Access Token (GitHub)
         */
        async connectWithPAT(serviceKey, config) {
            // Check for existing token
            const storageKey = `mcp_${serviceKey}_token`;
            const existingToken = await window.CoreStorageService.getValue(storageKey);

            if (existingToken) {
                // Validate token by making a test API call
                const isValid = await this.validateGitHubToken(existingToken);
                if (isValid) {
                    console.log(`[MCP Service Connectors] Using existing ${config.name} token`);
                    return await this.createGitHubConnection(serviceKey, config, existingToken);
                }
            }

            // Show token input UI
            return await this.showPATInputDialog(serviceKey, config);
        }

        /**
         * Validate GitHub PAT
         */
        async validateGitHubToken(token) {
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                return response.ok;
            } catch (error) {
                console.error('[MCP Service Connectors] Token validation failed:', error);
                return false;
            }
        }

        /**
         * Create GitHub connection
         */
        async createGitHubConnection(serviceKey, config, token) {
            // Store connection info
            this.connectedServices.set(serviceKey, { 
                config: config, 
                token: token, 
                type: 'github'
            });

            // Register tools with function calling system
            await this.registerServiceTools(serviceKey, config, token);
            
            console.log(`[MCP Service Connectors] ${config.name} connected successfully`);
            return true;
        }

        /**
         * Register service tools with function calling system
         */
        async registerServiceTools(serviceKey, config, authToken) {
            // Continue with registration even if some services aren't available
            // We'll check for each service individually when we need it

            let toolsToRegister = config.tools;
            
            // For GitHub, use the new modular GitHubProvider
            if (serviceKey === 'github') {
                try {
                    // Try to use new modular provider structure first
                    if (window.GitHubProvider) {
                        const githubProvider = new window.GitHubProvider();
                        const providerTools = githubProvider.tools;
                        
                        // Convert provider tools to the format expected by this system
                        toolsToRegister = {};
                        for (const [toolName, toolConfig] of providerTools) {
                            toolsToRegister[toolName] = {
                                description: toolConfig.description,
                                parameters: toolConfig.parameters
                            };
                        }
                        console.log(`[MCP Service Connectors] Using GitHubProvider with ${Object.keys(toolsToRegister).length} tools`);
                    } else {
                        // Fallback: Try to dynamically import the new provider structure
                        try {
                            const { GitHubProvider } = await import('../providers/github/index.js');
                            const githubProvider = new GitHubProvider();
                            const providerTools = await githubProvider.getToolDefinitions();
                            
                            // Convert to expected format
                            toolsToRegister = {};
                            for (const tool of providerTools) {
                                toolsToRegister[tool.name] = {
                                    description: tool.description,
                                    parameters: tool.parameters
                                };
                            }
                            console.log(`[MCP Service Connectors] Using new modular GitHubProvider with ${Object.keys(toolsToRegister).length} tools`);
                        } catch (importError) {
                            console.warn(`[MCP Service Connectors] Failed to import new GitHubProvider:`, importError);
                            toolsToRegister = config.tools;
                        }
                    }
                } catch (error) {
                    console.warn(`[MCP Service Connectors] Failed to load GitHubProvider, falling back to config:`, error);
                    toolsToRegister = config.tools;
                }
            }

            const tools = [];
            for (const [toolName, toolConfig] of Object.entries(toolsToRegister)) {
                // For GitHub, toolName already includes the github_ prefix from GitHubProvider
                const functionName = serviceKey === 'github' ? toolName : `${serviceKey}_${toolName}`;
                const functionCode = this.generateServiceFunction(serviceKey, toolName, toolConfig, authToken);
                tools.push({
                    name: functionName,
                    code: functionCode,
                    description: toolConfig.description
                });
            }

            // Register each tool as a function
            for (const tool of tools) {
                try {
                    // Add the function to the global scope so it can be called
                    console.log(`[MCP Service Connectors] Registering function ${tool.name} globally...`);
                    console.log(`[MCP Service Connectors] Function code preview:`, tool.code.substring(0, 200) + '...');
                    
                    try {
                        // Try eval approach
                        eval(`window.${tool.name} = ${tool.code}`);
                        
                        // Verify immediately
                        if (typeof window[tool.name] === 'function') {
                            console.log(`[MCP Service Connectors] Successfully registered function: ${tool.name}`);
                        } else {
                            console.error(`[MCP Service Connectors] Eval succeeded but function ${tool.name} not found in window`);
                            
                            // Try direct assignment as backup
                            try {
                                const func = new Function('return ' + tool.code)();
                                window[tool.name] = func;
                                console.log(`[MCP Service Connectors] Backup registration successful for: ${tool.name}`);
                            } catch (backupError) {
                                console.error(`[MCP Service Connectors] Backup registration failed for ${tool.name}:`, backupError);
                            }
                        }
                    } catch (evalError) {
                        console.error(`[MCP Service Connectors] Eval failed for ${tool.name}:`, evalError);
                        console.error(`[MCP Service Connectors] Function code that failed:`, tool.code);
                    }
                    
                    // Also register with the Function Calling system
                    try {
                        console.log(`[MCP Service Connectors] Checking Function Calling system availability...`);
                        console.log(`- FunctionToolsRegistry:`, !!window.FunctionToolsRegistry);
                        console.log(`- FunctionToolsStorage:`, !!window.FunctionToolsStorage);
                        
                        if (window.FunctionToolsRegistry && window.FunctionToolsStorage) {
                            // Get the tool config for this specific tool
                            let currentToolConfig;
                            if (serviceKey === 'github') {
                                // For GitHub, use the toolsToRegister that was populated from GitHubProvider
                                currentToolConfig = toolsToRegister[tool.name];
                            } else {
                                // For other services, use config.tools
                                currentToolConfig = config.tools[tool.name.replace(`${serviceKey}_`, '')];
                            }
                            
                            // Generate tool definition for the function
                            const toolDefinition = {
                                type: "function",
                                function: {
                                    name: tool.name,
                                    description: tool.description,
                                    parameters: currentToolConfig?.parameters || {
                                        type: "object",
                                        properties: {},
                                        required: []
                                    }
                                }
                            };
                            
                            // Add the function using the registry
                            const collectionId = `mcp_${serviceKey}_collection`;
                            const collectionMetadata = {
                                name: `${config.name} MCP Functions`,
                                createdAt: Date.now(),
                                source: 'mcp-service'
                            };
                            
                            const added = window.FunctionToolsRegistry.addJsFunction(
                                tool.name,
                                tool.code,
                                toolDefinition,
                                collectionId,
                                collectionMetadata
                            );
                            
                            if (added) {
                                console.log(`[MCP Service Connectors] Added ${tool.name} to Function Registry`);
                                
                                // Enable the function by default
                                const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                                if (!enabledFunctions.includes(tool.name)) {
                                    enabledFunctions.push(tool.name);
                                    window.FunctionToolsStorage.setEnabledFunctions(enabledFunctions);
                                    window.FunctionToolsStorage.save();
                                    console.log(`[MCP Service Connectors] Enabled ${tool.name} in Function Calling`);
                                }
                            }
                        }
                    } catch (fcError) {
                        console.error(`[MCP Service Connectors] Error registering ${tool.name} with Function Calling:`, fcError);
                    }
                } catch (error) {
                    console.error(`[MCP Service Connectors] Failed to register function ${tool.name}:`, error);
                }
            }
        }

        /**
         * Generate JavaScript function code for service tools
         */
        generateServiceFunction(serviceKey, toolName, toolConfig, authToken) {
            const paramNames = [];
            if (toolConfig.parameters && toolConfig.parameters.properties) {
                paramNames.push(...Object.keys(toolConfig.parameters.properties));
            }

            // For GitHub, toolName already includes the github_ prefix
            const functionName = serviceKey === 'github' ? toolName : `${serviceKey}_${toolName}`;
            // For executeServiceTool, we need the base tool name without service prefix
            const baseToolName = serviceKey === 'github' ? toolName.replace('github_', '') : toolName;

            return `async function ${functionName}(${paramNames.join(', ')}) {
                try {
                    const MCPServiceConnectors = window.MCPServiceConnectors;
                    const params = {${paramNames.map(name => `${name}: ${name}`).join(', ')}};
                    const result = await MCPServiceConnectors.executeServiceTool('${serviceKey}', '${baseToolName}', params);
                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }`;
        }

        /**
         * Execute a service-specific tool
         */
        async executeServiceTool(serviceKey, toolName, params) {
            const connection = this.connectedServices.get(serviceKey);
            if (!connection) {
                throw new Error(`Service ${serviceKey} not connected`);
            }

            const config = SERVICE_CONFIGS[serviceKey];
            
            switch (serviceKey) {
                case 'github':
                    return await this.executeGitHubTool(toolName, params, connection);
                case 'gmail':
                    return await this.executeGmailTool(toolName, params, connection);
                case 'gdocs':
                    return await this.executeGDocsTool(toolName, params, connection);
                default:
                    throw new Error(`Unknown service: ${serviceKey}`);
            }
        }

        /**
         * Execute GitHub API calls using GitHubProvider
         */
        async executeGitHubTool(toolName, params, connection) {
            // Use GitHubProvider if available, otherwise fall back to legacy implementation
            if (window.GitHubProvider) {
                try {
                    const githubProvider = new window.GitHubProvider();
                    
                    // Set up authentication
                    githubProvider.credentials = { token: connection.token };
                    
                    // Get the tool handler from the provider (toolName has github_ prefix)
                    const fullToolName = `github_${toolName}`;
                    const toolConfig = githubProvider.tools.get(fullToolName);
                    if (toolConfig && toolConfig.handler) {
                        return await toolConfig.handler(params, githubProvider.credentials);
                    } else {
                        throw new Error(`Tool ${fullToolName} not found in GitHubProvider`);
                    }
                } catch (error) {
                    console.warn(`[MCP Service Connectors] GitHubProvider failed for ${toolName}, falling back to legacy:`, error);
                    // Fall through to legacy implementation
                }
            }

            // Legacy implementation for fallback
            const { token } = connection;
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

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
            
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
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
                
                // Special handling for file content
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
         * Connect using OAuth Device Flow (Gmail)
         */
        async connectWithOAuthDevice(serviceKey, config) {
            // Check for existing OAuth tokens
            const storageKey = `mcp_${serviceKey}_oauth`;
            const existingAuth = await window.CoreStorageService.getValue(storageKey);

            if (existingAuth && existingAuth.refreshToken) {
                // Try to use existing refresh token
                const tokens = await this.refreshOAuthToken(serviceKey, existingAuth);
                if (tokens) {
                    return await this.createGoogleConnection(serviceKey, config, tokens);
                }
            }

            // Need to get OAuth credentials from user
            return await this.showOAuthSetupDialog(serviceKey, config);
        }

        /**
         * Show OAuth setup dialog for Google services
         */
        async showOAuthSetupDialog(serviceKey, config) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-oauth-setup-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} OAuth Setup</h3>
                        
                        <div class="oauth-setup-instructions">
                            <h4>Setup Instructions:</h4>
                            <ol>
                                ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                            
                            <p class="form-help">
                                <a href="${config.setupInstructions.docUrl}" target="_blank">
                                    View official documentation <i class="fas fa-external-link-alt"></i>
                                </a>
                            </p>
                        </div>
                        
                        <div class="oauth-credentials-form">
                            <div class="form-group">
                                <label for="${serviceKey}-client-id">OAuth Client ID</label>
                                <input type="text" 
                                       id="${serviceKey}-client-id" 
                                       placeholder="Your OAuth Client ID" 
                                       class="mcp-input" />
                            </div>
                            
                            <div class="form-group">
                                <label for="${serviceKey}-client-secret">OAuth Client Secret</label>
                                <input type="password" 
                                       id="${serviceKey}-client-secret" 
                                       placeholder="Your OAuth Client Secret" 
                                       class="mcp-input" />
                                <small class="form-help">Your credentials will be encrypted and stored locally</small>
                            </div>
                            
                            <div class="form-actions">
                                <button class="btn primary-btn" id="${serviceKey}-start-oauth">
                                    Start Authentication
                                </button>
                                <button class="btn secondary-btn" onclick="document.getElementById('service-oauth-setup-modal').remove()">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Handle OAuth start
                document.getElementById(`${serviceKey}-start-oauth`).onclick = async () => {
                    const clientId = document.getElementById(`${serviceKey}-client-id`).value.trim();
                    const clientSecret = document.getElementById(`${serviceKey}-client-secret`).value.trim();
                    
                    if (!clientId || !clientSecret) {
                        alert('Please enter both Client ID and Client Secret');
                        return;
                    }
                    
                    // Save credentials
                    const oauthConfig = {
                        clientId,
                        clientSecret,
                        ...config.oauthConfig
                    };
                    
                    modal.remove();
                    
                    // Start device flow
                    const result = await this.startGoogleDeviceFlow(serviceKey, oauthConfig);
                    resolve(result);
                };
            });
        }

        /**
         * Start Google OAuth Device Flow
         */
        async startGoogleDeviceFlow(serviceKey, oauthConfig) {
            try {
                // Request device code
                const deviceResponse = await fetch(oauthConfig.authorizationEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        client_id: oauthConfig.clientId,
                        scope: oauthConfig.scope
                    })
                });

                if (!deviceResponse.ok) {
                    throw new Error('Failed to get device code');
                }

                const deviceData = await deviceResponse.json();
                
                // Show device code to user
                this.showDeviceCodeDialog(serviceKey, deviceData);
                
                // Poll for completion
                const tokens = await this.pollForDeviceAuthorization(serviceKey, oauthConfig, deviceData);
                
                if (tokens) {
                    // Save tokens
                    const storageKey = `mcp_${serviceKey}_oauth`;
                    await window.CoreStorageService.setValue(storageKey, {
                        ...tokens,
                        clientId: oauthConfig.clientId,
                        clientSecret: oauthConfig.clientSecret
                    });
                    
                    // Create connection
                    return await this.createGoogleConnection(serviceKey, SERVICE_CONFIGS[serviceKey], tokens);
                }
                
                return false;
            } catch (error) {
                console.error(`[MCP Service Connectors] OAuth device flow failed:`, error);
                alert(`Failed to authenticate with ${SERVICE_CONFIGS[serviceKey].name}: ${error.message}`);
                return false;
            }
        }

        /**
         * Show device code dialog
         */
        showDeviceCodeDialog(serviceKey, deviceData) {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'device-code-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Complete Authentication</h3>
                    
                    <div class="device-code-instructions">
                        <p>To complete authentication:</p>
                        <ol>
                            <li>Visit: <a href="${deviceData.verification_url}" target="_blank">${deviceData.verification_url}</a></li>
                            <li>Enter this code: <code class="device-code">${deviceData.user_code}</code></li>
                            <li>Grant permissions when prompted</li>
                        </ol>
                        
                        <div class="device-code-display">
                            <span class="device-code-large">${deviceData.user_code}</span>
                            <button class="btn secondary-btn" onclick="navigator.clipboard.writeText('${deviceData.user_code}')">
                                <i class="fas fa-copy"></i> Copy Code
                            </button>
                        </div>
                        
                        <p class="waiting-message">
                            <i class="fas fa-spinner fa-spin"></i> Waiting for authentication...
                        </p>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }

        /**
         * Poll for device authorization completion
         */
        async pollForDeviceAuthorization(serviceKey, oauthConfig, deviceData) {
            const pollInterval = (deviceData.interval || 5) * 1000;
            const expiresAt = Date.now() + (deviceData.expires_in * 1000);
            
            while (Date.now() < expiresAt) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                
                try {
                    const tokenResponse = await fetch(oauthConfig.tokenEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            client_id: oauthConfig.clientId,
                            client_secret: oauthConfig.clientSecret,
                            device_code: deviceData.device_code,
                            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                        })
                    });
                    
                    const tokenData = await tokenResponse.json();
                    
                    if (tokenData.access_token) {
                        // Success!
                        document.getElementById('device-code-modal')?.remove();
                        return {
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token,
                            expiresAt: Date.now() + (tokenData.expires_in * 1000)
                        };
                    }
                    
                    if (tokenData.error === 'authorization_pending') {
                        // Still waiting, continue polling
                        continue;
                    }
                    
                    if (tokenData.error === 'access_denied') {
                        // User denied access
                        document.getElementById('device-code-modal')?.remove();
                        alert('Authentication was denied. Please try again.');
                        return null;
                    }
                } catch (error) {
                    console.error('[MCP Service Connectors] Polling error:', error);
                }
            }
            
            // Timeout
            document.getElementById('device-code-modal')?.remove();
            alert('Authentication timed out. Please try again.');
            return null;
        }

        /**
         * Create Google service connection (Gmail/Docs)
         */
        async createGoogleConnection(serviceKey, config, tokens) {
            // Store connection info
            this.connectedServices.set(serviceKey, { 
                config: config, 
                tokens: tokens, 
                type: 'google'
            });
            this.oauthTokens.set(serviceKey, tokens);

            // Register tools with function calling system
            await this.registerServiceTools(serviceKey, config, tokens.accessToken);
            
            console.log(`[MCP Service Connectors] ${config.name} connected successfully`);
            return true;
        }

        /**
         * Execute Gmail API calls
         */
        async executeGmailTool(toolName, params, connection) {
            const { tokens } = connection;
            let url, method = 'GET', body = null;

            // Check if token needs refresh
            if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60000) {
                const newTokens = await this.refreshOAuthToken('gmail', tokens);
                if (newTokens) {
                    connection.tokens = newTokens;
                    tokens.accessToken = newTokens.accessToken;
                }
            }

            switch (toolName) {
                case 'list_messages':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    url += `maxResults=${params.maxResults || 10}`;
                    break;
                case 'get_message':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.messageId}`;
                    break;
                case 'send_message':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;
                    method = 'POST';
                    // Create email in RFC 2822 format
                    const email = this.createEmailMessage(params);
                    body = JSON.stringify({ raw: btoa(email).replace(/\+/g, '-').replace(/\//g, '_') });
                    break;
                case 'search_messages':
                    const query = this.buildGmailSearchQuery(params);
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;
                    break;
                default:
                    throw new Error(`Unknown Gmail tool: ${toolName}`);
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${tokens.accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body
            });

            if (!response.ok) {
                throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        }

        /**
         * Create email message in RFC 2822 format
         */
        createEmailMessage(params) {
            let email = '';
            email += `To: ${params.to}\r\n`;
            if (params.cc) email += `Cc: ${params.cc}\r\n`;
            if (params.bcc) email += `Bcc: ${params.bcc}\r\n`;
            email += `Subject: ${params.subject}\r\n`;
            email += `Content-Type: text/plain; charset="UTF-8"\r\n`;
            email += `\r\n`;
            email += params.body;
            return email;
        }

        /**
         * Build Gmail search query from parameters
         */
        buildGmailSearchQuery(params) {
            const parts = [];
            if (params.from) parts.push(`from:${params.from}`);
            if (params.to) parts.push(`to:${params.to}`);
            if (params.subject) parts.push(`subject:${params.subject}`);
            if (params.after) parts.push(`after:${params.after}`);
            if (params.before) parts.push(`before:${params.before}`);
            if (params.hasAttachment) parts.push('has:attachment');
            return parts.join(' ');
        }

        /**
         * Connect with shared OAuth (Google Docs)
         */
        async connectWithSharedOAuth(serviceKey, config) {
            // Check if Gmail is already connected
            const gmailAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
            
            if (!gmailAuth || !gmailAuth.refreshToken) {
                // Need to connect Gmail first
                alert('Google Docs requires Gmail authentication. Please connect Gmail first.');
                return false;
            }

            // Use Gmail's OAuth tokens
            const tokens = {
                accessToken: gmailAuth.accessToken,
                refreshToken: gmailAuth.refreshToken,
                expiresAt: gmailAuth.expiresAt
            };

            // Check if we need additional scopes for Docs
            const hasDocsScopes = await this.checkGoogleScopes(tokens, config.oauthConfig.additionalScopes);
            
            if (!hasDocsScopes) {
                // Need to re-authenticate with additional scopes
                alert('Additional permissions needed for Google Docs. Please re-authenticate.');
                // TODO: Implement scope expansion flow
                return false;
            }

            return await this.createGoogleConnection(serviceKey, config, tokens);
        }

        /**
         * Check if token has required Google scopes
         */
        async checkGoogleScopes(tokens, requiredScopes) {
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + tokens.accessToken);
                const info = await response.json();
                
                if (!info.scope) return false;
                
                const grantedScopes = info.scope.split(' ');
                return requiredScopes.every(scope => grantedScopes.includes(scope));
            } catch (error) {
                console.error('[MCP Service Connectors] Scope check failed:', error);
                return false;
            }
        }

        /**
         * Execute Google Docs API calls
         */
        async executeGDocsTool(toolName, params, connection) {
            const { tokens } = connection;
            let url, method = 'GET', body = null;

            // Check if token needs refresh
            if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60000) {
                const newTokens = await this.refreshOAuthToken('gdocs', tokens);
                if (newTokens) {
                    connection.tokens = newTokens;
                    tokens.accessToken = newTokens.accessToken;
                }
            }

            switch (toolName) {
                case 'list_documents':
                    // Use Drive API to list Google Docs
                    url = `https://www.googleapis.com/drive/v3/files?`;
                    url += `mimeType='application/vnd.google-apps.document'&`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    url += `pageSize=${params.maxResults || 20}`;
                    if (params.orderBy) url += `&orderBy=${params.orderBy}`;
                    break;
                case 'read_document':
                    url = `https://docs.googleapis.com/v1/documents/${params.documentId}`;
                    break;
                case 'create_document':
                    url = `https://docs.googleapis.com/v1/documents`;
                    method = 'POST';
                    body = JSON.stringify({ title: params.title });
                    break;
                case 'update_document':
                    url = `https://docs.googleapis.com/v1/documents/${params.documentId}:batchUpdate`;
                    method = 'POST';
                    body = JSON.stringify({ requests: params.requests });
                    break;
                case 'append_text':
                    url = `https://docs.googleapis.com/v1/documents/${params.documentId}:batchUpdate`;
                    method = 'POST';
                    // Get document to find end index
                    const doc = await this.getDocumentStructure(params.documentId, tokens.accessToken);
                    const endIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;
                    body = JSON.stringify({
                        requests: [{
                            insertText: {
                                location: { index: endIndex },
                                text: params.text
                            }
                        }]
                    });
                    break;
                default:
                    throw new Error(`Unknown Google Docs tool: ${toolName}`);
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${tokens.accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body
            });

            if (!response.ok) {
                throw new Error(`Google Docs API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Special handling for create document - need to return the ID
            if (toolName === 'create_document' && params.content) {
                // Append initial content
                await this.executeGDocsTool('append_text', {
                    documentId: data.documentId,
                    text: params.content
                }, connection);
            }

            return data;
        }

        /**
         * Get document structure for appending
         */
        async getDocumentStructure(documentId, accessToken) {
            const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            return await response.json();
        }

        /**
         * Refresh OAuth token
         */
        async refreshOAuthToken(serviceKey, authData) {
            if (!authData.refreshToken) return null;

            try {
                const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        client_id: authData.clientId,
                        client_secret: authData.clientSecret,
                        refresh_token: authData.refreshToken,
                        grant_type: 'refresh_token'
                    })
                });

                const data = await response.json();
                
                if (data.access_token) {
                    const newTokens = {
                        ...authData,
                        accessToken: data.access_token,
                        expiresAt: Date.now() + (data.expires_in * 1000)
                    };
                    
                    // Save updated tokens
                    const storageKey = `mcp_${serviceKey}_oauth`;
                    await window.CoreStorageService.setValue(storageKey, newTokens);
                    
                    return newTokens;
                }
            } catch (error) {
                console.error(`[MCP Service Connectors] Token refresh failed:`, error);
            }
            
            return null;
        }

        /**
         * Show PAT input dialog
         */
        async showPATInputDialog(serviceKey, config) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-pat-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} Personal Access Token</h3>
                        
                        <div class="token-setup-instructions">
                            <h4>${config.setupInstructions.title}</h4>
                            <ol>
                                ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                            
                            <p class="form-help">
                                <a href="${config.setupInstructions.docUrl}" target="_blank">
                                    View GitHub's official documentation <i class="fas fa-external-link-alt"></i>
                                </a>
                            </p>
                        </div>
                        
                        <div class="token-input-form">
                            <div class="form-group">
                                <label for="${serviceKey}-pat-input">Personal Access Token</label>
                                <input type="password" 
                                       id="${serviceKey}-pat-input" 
                                       placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                                       class="mcp-input" />
                                <small class="form-help">Your token will be encrypted and stored locally</small>
                            </div>
                            
                            <div class="form-actions">
                                <button class="btn primary-btn" id="${serviceKey}-save-token">
                                    Save & Connect
                                </button>
                                <button class="btn secondary-btn" onclick="document.getElementById('service-pat-modal').remove()">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                document.getElementById(`${serviceKey}-pat-input`).focus();
                
                // Handle save
                document.getElementById(`${serviceKey}-save-token`).onclick = async () => {
                    const token = document.getElementById(`${serviceKey}-pat-input`).value.trim();
                    
                    if (!token) {
                        alert('Please enter a Personal Access Token');
                        return;
                    }
                    
                    // Validate token format for GitHub
                    if (serviceKey === 'github' && !token.startsWith('ghp_')) {
                        if (!confirm('This doesn\'t look like a GitHub Personal Access Token. Continue anyway?')) {
                            return;
                        }
                    }
                    
                    // Validate token
                    const isValid = await this.validateGitHubToken(token);
                    if (!isValid) {
                        alert('Invalid token. Please check and try again.');
                        return;
                    }
                    
                    // Save token
                    const storageKey = `mcp_${serviceKey}_token`;
                    await window.CoreStorageService.setValue(storageKey, token);
                    
                    // Close dialog and connect
                    modal.remove();
                    const result = await this.createGitHubConnection(serviceKey, config, token);
                    resolve(result);
                };
            });
        }

        /**
         * Disconnect a service
         */
        async disconnectService(serviceKey) {
            const connection = this.connectedServices.get(serviceKey);
            if (!connection) return;

            // Remove registered functions
            const config = SERVICE_CONFIGS[serviceKey];
            if (config && config.tools) {
                for (const toolName of Object.keys(config.tools)) {
                    const functionName = `${serviceKey}_${toolName}`;
                    if (window[functionName]) {
                        delete window[functionName];
                        console.log(`[MCP Service Connectors] Removed function: ${functionName}`);
                    }
                    
                    // Also remove from Function Calling system
                    if (window.FunctionToolsStorage && window.FunctionToolsRegistry) {
                        // Get current functions
                        const jsFunctions = window.FunctionToolsStorage.getJsFunctions() || {};
                        const functionCollections = window.FunctionToolsStorage.getFunctionCollections() || {};
                        
                        // Remove function from registry
                        if (jsFunctions[functionName]) {
                            delete jsFunctions[functionName];
                            delete functionCollections[functionName];
                            window.FunctionToolsStorage.setJsFunctions(jsFunctions);
                            window.FunctionToolsStorage.setFunctionCollections(functionCollections);
                        }
                        
                        // Remove from enabled functions
                        const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                        const index = enabledFunctions.indexOf(functionName);
                        if (index > -1) {
                            enabledFunctions.splice(index, 1);
                            window.FunctionToolsStorage.setEnabledFunctions(enabledFunctions);
                        }
                        
                        // Save changes
                        window.FunctionToolsStorage.save();
                        
                        console.log(`[MCP Service Connectors] Removed ${functionName} from Function Calling system`);
                    }
                }
            }

            // Remove from connected services
            this.connectedServices.delete(serviceKey);
            this.oauthTokens.delete(serviceKey);

            // Clear stored credentials
            await window.CoreStorageService.removeValue(`mcp_${serviceKey}_token`);
            await window.CoreStorageService.removeValue(`mcp_${serviceKey}_oauth`);

            console.log(`[MCP Service Connectors] ${SERVICE_CONFIGS[serviceKey].name} disconnected`);
        }

        /**
         * Get connection status for a service
         */
        isConnected(serviceKey) {
            return this.connectedServices.has(serviceKey);
        }

        /**
         * Get all connected services
         */
        getConnectedServices() {
            return Array.from(this.connectedServices.keys()).map(key => ({
                key,
                ...SERVICE_CONFIGS[key],
                connected: true
            }));
        }

        /**
         * Get available services
         */
        getAvailableServices() {
            return Object.entries(SERVICE_CONFIGS).map(([key, config]) => ({
                key,
                ...config,
                connected: this.isConnected(key)
            }));
        }

        /**
         * Get tool count for a service
         */
        getToolCount(serviceKey) {
            const config = SERVICE_CONFIGS[serviceKey];
            if (!config || !config.tools) return 0;
            return Object.keys(config.tools).length;
        }

        /**
         * Quick connect method for GitHub (used by GitHub Token Manager)
         * @param {string} serviceKey - Service key (usually 'github')
         * @returns {Promise<boolean>} True if connected successfully
         */
        async quickConnect(serviceKey) {
            try {
                const config = SERVICE_CONFIGS[serviceKey];
                if (!config) {
                    throw new Error(`Unknown service: ${serviceKey}`);
                }

                // Try to connect without showing dialog
                const storageKey = `mcp_${serviceKey}_token`;
                const existingToken = await window.CoreStorageService.getValue(storageKey);

                if (existingToken) {
                    if (serviceKey === 'github') {
                        const isValid = await this.validateGitHubToken(existingToken);
                        if (isValid) {
                            return await this.createGitHubConnection(serviceKey, config, existingToken);
                        }
                    }
                }

                console.warn(`[MCP Service Connectors] No valid token found for ${serviceKey}`);
                return false;
            } catch (error) {
                console.error(`[MCP Service Connectors] Quick connect failed for ${serviceKey}:`, error);
                return false;
            }
        }
    }

    // Export to global scope
    global.MCPServiceConnectors = new MCPServiceConnectors();

})(window);