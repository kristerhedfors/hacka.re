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
            description: 'Comprehensive READ ONLY access to Gmail messages, threads, and labels',
            authType: 'oauth-web',
            apiBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
            oauthConfig: {
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
                scope: 'https://www.googleapis.com/auth/gmail.readonly',
                clientId: '', // To be configured by user
                requiresClientSecret: true,
                redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
                responseType: 'code',
                accessType: 'offline'
            },
            setupInstructions: {
                title: 'Gmail OAuth Setup',
                steps: [
                    'Create a Google Cloud Project and enable Gmail API',
                    'Create OAuth 2.0 credentials - MUST be "Desktop app" type (NOT "Web application")',
                    'Copy your Client ID and Client Secret from the Desktop app credentials',
                    'Enter them below to start authentication',
                    'You\'ll be redirected to Google to authorize access',
                    'Copy the authorization code and paste it back here'
                ],
                docUrl: 'https://developers.google.com/gmail/api/quickstart/js'
            },
            tools: {
                list_messages: {
                    description: 'List Gmail messages with rich metadata (subject, sender, date, snippet)',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Gmail search query (e.g., "is:unread")' },
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            labelIds: { type: 'array', items: { type: 'string' } },
                            format: { type: 'string', enum: ['minimal', 'metadata', 'full'], default: 'metadata', description: 'Response format - metadata includes subject, from, snippet' },
                            pageToken: { type: 'string', description: 'Token for pagination' }
                        }
                    }
                },
                get_message: {
                    description: 'Get complete email message with headers, body, and attachments info',
                    parameters: {
                        type: 'object',
                        properties: {
                            messageId: { type: 'string', description: 'Gmail message ID' },
                            format: { type: 'string', enum: ['minimal', 'metadata', 'full'], default: 'full', description: 'Response format' }
                        },
                        required: ['messageId']
                    }
                },
                search_messages: {
                    description: 'Search Gmail messages with advanced criteria and rich results',
                    parameters: {
                        type: 'object',
                        properties: {
                            from: { type: 'string', description: 'From email address' },
                            to: { type: 'string', description: 'To email address' },
                            subject: { type: 'string', description: 'Subject keywords' },
                            after: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            before: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            hasAttachment: { type: 'boolean', description: 'Has attachments' },
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            format: { type: 'string', enum: ['minimal', 'metadata', 'full'], default: 'metadata', description: 'Response format' }
                        }
                    }
                },
                list_threads: {
                    description: 'List Gmail conversation threads with participants and message counts',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Gmail search query' },
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            labelIds: { type: 'array', items: { type: 'string' } },
                            pageToken: { type: 'string', description: 'Token for pagination' }
                        }
                    }
                },
                get_thread: {
                    description: 'Get complete conversation thread with all messages',
                    parameters: {
                        type: 'object',
                        properties: {
                            threadId: { type: 'string', description: 'Gmail thread ID' },
                            format: { type: 'string', enum: ['minimal', 'metadata', 'full'], default: 'metadata', description: 'Message format in thread' }
                        },
                        required: ['threadId']
                    }
                },
                list_labels: {
                    description: 'List all Gmail labels with message counts',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                get_label: {
                    description: 'Get specific Gmail label details and statistics',
                    parameters: {
                        type: 'object',
                        properties: {
                            labelId: { type: 'string', description: 'Gmail label ID (e.g., "INBOX", "SENT")' }
                        },
                        required: ['labelId']
                    }
                },
                get_profile: {
                    description: 'Get Gmail user profile information',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                get_attachment: {
                    description: 'Download email attachment',
                    parameters: {
                        type: 'object',
                        properties: {
                            messageId: { type: 'string', description: 'Gmail message ID' },
                            attachmentId: { type: 'string', description: 'Attachment ID from message' }
                        },
                        required: ['messageId', 'attachmentId']
                    }
                },
                list_drafts: {
                    description: 'List saved email drafts (READ ONLY)',
                    parameters: {
                        type: 'object',
                        properties: {
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            pageToken: { type: 'string', description: 'Token for pagination' }
                        }
                    }
                },
                get_history: {
                    description: 'Get mailbox change history for synchronization',
                    parameters: {
                        type: 'object',
                        properties: {
                            startHistoryId: { type: 'string', description: 'Start history ID for incremental sync' },
                            maxResults: { type: 'number', default: 100, maximum: 500 },
                            labelId: { type: 'string', description: 'Filter by label ID' }
                        },
                        required: ['startHistoryId']
                    }
                },
                advanced_search: {
                    description: 'Advanced Gmail search with multiple criteria and rich metadata',
                    parameters: {
                        type: 'object',
                        properties: {
                            from: { type: 'string' },
                            to: { type: 'string' },
                            subject: { type: 'string' },
                            keywords: { type: 'string' },
                            after: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            before: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            hasAttachment: { type: 'boolean' },
                            attachmentType: { type: 'string', description: 'File extension (pdf, doc, etc.)' },
                            sizeOperator: { type: 'string', enum: ['larger', 'smaller'], description: 'Size comparison' },
                            sizeBytes: { type: 'number', description: 'Size in bytes' },
                            isUnread: { type: 'boolean' },
                            isImportant: { type: 'boolean' },
                            maxResults: { type: 'number', default: 20, maximum: 100 },
                            format: { type: 'string', enum: ['minimal', 'metadata', 'full'], default: 'metadata' }
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
        },
        shodan: {
            name: 'Shodan',
            icon: 'images/shodan-icon.svg',
            iconType: 'svg',
            description: 'Comprehensive Internet intelligence platform - search, scan, monitor, and analyze Internet-connected devices',
            authType: 'api-key',
            apiBaseUrl: 'https://api.shodan.io',
            setupInstructions: {
                title: 'Shodan API Key Setup',
                steps: [
                    'Go to shodan.io and create an account (or login if you have one)',
                    'Visit your account page to find your API key',
                    'Copy your API key from the "API Key" section',
                    'Enter the API key when prompted',
                    'The API key will be encrypted and stored locally',
                    'Note: Some features require paid plans (scanning, alerts, etc.)'
                ],
                docUrl: 'https://developer.shodan.io/api'
            },
            tools: {
                // Search Methods
                shodan_host_info: {
                    description: 'Get detailed information about an IP address including services, vulnerabilities, and location',
                    parameters: {
                        type: 'object',
                        properties: {
                            ip: { type: 'string', description: 'The IP address to look up' },
                            history: { type: 'boolean', description: 'Show historical banners', default: false },
                            minify: { type: 'boolean', description: 'Minify banner and remove metadata', default: false }
                        },
                        required: ['ip']
                    }
                },
                shodan_search: {
                    description: 'Search Shodan database using filters and search queries',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Search query (e.g., "apache", "port:80", "country:US")' },
                            facets: { type: 'string', description: 'Comma-separated list of facets (e.g., "country,port,org")' },
                            page: { type: 'integer', description: 'Page number (1-indexed)', default: 1 },
                            minify: { type: 'boolean', description: 'Minify results', default: false }
                        },
                        required: ['query']
                    }
                },
                shodan_search_count: {
                    description: 'Get the number of results for a search query without returning actual results',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Search query' },
                            facets: { type: 'string', description: 'Comma-separated list of facets' }
                        },
                        required: ['query']
                    }
                },
                shodan_search_facets: {
                    description: 'List available search facets that can be used in queries',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                shodan_search_filters: {
                    description: 'List available search filters and their descriptions',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                shodan_search_tokens: {
                    description: 'Break down a search query into tokens and show how Shodan parses it',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Search query to tokenize' }
                        },
                        required: ['query']
                    }
                },
                
                // Scanning Methods
                shodan_scan: {
                    description: 'Request Shodan to crawl network blocks or IP addresses',
                    parameters: {
                        type: 'object',
                        properties: {
                            ips: { type: 'string', description: 'Comma-separated list of IPs to scan' },
                            force: { type: 'boolean', description: 'Force re-scan of IP addresses', default: false }
                        },
                        required: ['ips']
                    }
                },
                shodan_scan_protocols: {
                    description: 'List protocols that Shodan crawls',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                
                // DNS Methods
                shodan_dns_domain: {
                    description: 'Get information about a domain including subdomains and DNS records',
                    parameters: {
                        type: 'object',
                        properties: {
                            domain: { type: 'string', description: 'Domain name (e.g., "google.com")' },
                            history: { type: 'boolean', description: 'Include historical DNS data', default: false },
                            type: { type: 'string', description: 'DNS record type filter', enum: ['A', 'AAAA', 'CNAME', 'NS', 'MX', 'TXT'] },
                            page: { type: 'integer', description: 'Page number', default: 1 }
                        },
                        required: ['domain']
                    }
                },
                shodan_dns_resolve: {
                    description: 'Resolve hostnames to IP addresses',
                    parameters: {
                        type: 'object',
                        properties: {
                            hostnames: { type: 'string', description: 'Comma-separated list of hostnames' }
                        },
                        required: ['hostnames']
                    }
                },
                shodan_dns_reverse: {
                    description: 'Resolve IP addresses to hostnames',
                    parameters: {
                        type: 'object',
                        properties: {
                            ips: { type: 'string', description: 'Comma-separated list of IP addresses' }
                        },
                        required: ['ips']
                    }
                },
                
                // Account and Utility Methods
                shodan_account_profile: {
                    description: 'Get account profile information including credits and plan details',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                shodan_api_info: {
                    description: 'Get API plan information and usage statistics',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                shodan_tools_myip: {
                    description: 'Get your external IP address as seen by Shodan',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                
                // Security Analysis
                shodan_labs_honeyscore: {
                    description: 'Calculate the probability that an IP is a honeypot (0.0-1.0)',
                    parameters: {
                        type: 'object',
                        properties: {
                            ip: { type: 'string', description: 'IP address to check' }
                        },
                        required: ['ip']
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
         * Get service configuration by key
         */
        getServiceConfig(serviceKey) {
            return SERVICE_CONFIGS[serviceKey] || null;
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
                case 'api-key':
                    return await this.connectWithAPIKey(serviceKey, config);
                case 'oauth-device':
                    return await this.connectWithOAuthDevice(serviceKey, config);
                case 'oauth-web':
                    return await this.connectWithOAuthWeb(serviceKey, config);
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
                // TRACE TOKEN: Log validation attempt with full details and TYPE
                console.log(`🔍 validateGitHubToken CALLED: Token TYPE=${typeof token}, Value=${token}, Length=${token ? token.length : 0}`);
                console.log(`🔍 validateGitHubToken RAW TOKEN:`, token);
                
                // Fix token if it's not a string - extract from object if needed
                let actualToken = token;
                if (typeof token === 'object' && token !== null && token.token) {
                    actualToken = token.token;
                    console.log(`🔧 validateGitHubToken: Extracted string token from object: ${actualToken.substring(0, 10)}...${actualToken.substring(actualToken.length - 4)}`);
                } else if (typeof token !== 'string') {
                    console.error(`🔍 validateGitHubToken ERROR: Token is not a string! Type: ${typeof token}, Value:`, token);
                    return false;
                }
                
                console.log(`🔍 validateGitHubToken HEADERS: Authorization="token ${actualToken.substring(0, 10)}...${actualToken.substring(actualToken.length - 4)}"`);
                
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `token ${actualToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                console.log(`🔍 validateGitHubToken RESPONSE: Status=${response.status}, OK=${response.ok}`);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`🔍 validateGitHubToken ERROR: ${errorText}`);
                }

                return response.ok;
            } catch (error) {
                console.error('🔍 validateGitHubToken EXCEPTION:', error);
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
                        // Fallback: Try to use the globally available GitHubProvider from the new structure
                        try {
                            if (window.GitHubProvider) {
                                const githubProvider = new window.GitHubProvider();
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
                            } else {
                                console.warn(`[MCP Service Connectors] GitHubProvider not available globally, using fallback tools`);
                                toolsToRegister = config.tools;
                            }
                        } catch (providerError) {
                            console.warn(`[MCP Service Connectors] Failed to use GitHubProvider:`, providerError);
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
                // For Shodan, toolName already includes the shodan_ prefix from SERVICE_CONFIGS
                let functionName;
                if (serviceKey === 'github' || toolName.startsWith(`${serviceKey}_`)) {
                    functionName = toolName;
                } else {
                    functionName = `${serviceKey}_${toolName}`;
                }
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
                    try {
                        // Try eval approach
                        eval(`window.${tool.name} = ${tool.code}`);
                        
                        // Verify immediately
                        if (typeof window[tool.name] !== 'function') {
                            // Try direct assignment as backup
                            const func = new Function('return ' + tool.code)();
                            window[tool.name] = func;
                        }
                    } catch (evalError) {
                        console.error(`[MCP Service Connectors] Failed to register function ${tool.name}:`, evalError);
                    }
                    
                    // Also register with the Function Calling system
                    try {
                        
                        if (window.FunctionToolsRegistry && window.FunctionToolsStorage) {
                            // Get the tool config for this specific tool
                            let currentToolConfig;
                            if (serviceKey === 'github') {
                                // For GitHub, use the toolsToRegister that was populated from GitHubProvider
                                currentToolConfig = toolsToRegister[tool.name];
                            } else {
                                // For other services, first try the full tool name (for services like Shodan where tools are prefixed)
                                currentToolConfig = config.tools[tool.name];
                                if (!currentToolConfig) {
                                    // Fallback: try with prefix removed
                                    currentToolConfig = config.tools[tool.name.replace(`${serviceKey}_`, '')];
                                }
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
                                // Enable the function by default
                                const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                                if (!enabledFunctions.includes(tool.name)) {
                                    enabledFunctions.push(tool.name);
                                    window.FunctionToolsStorage.setEnabledFunctions(enabledFunctions);
                                    window.FunctionToolsStorage.save();
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
        generateServiceFunction(serviceKey, toolName, toolConfig) {
            const paramNames = [];
            if (toolConfig.parameters && toolConfig.parameters.properties) {
                paramNames.push(...Object.keys(toolConfig.parameters.properties));
            }

            // For GitHub and Shodan, toolName already includes the service prefix
            let functionName, baseToolName;
            if (serviceKey === 'github' || toolName.startsWith(`${serviceKey}_`)) {
                functionName = toolName;
                // For executeServiceTool, we need the base tool name without service prefix
                baseToolName = toolName.replace(`${serviceKey}_`, '');
            } else {
                functionName = `${serviceKey}_${toolName}`;
                baseToolName = toolName;
            }

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

            switch (serviceKey) {
                case 'github':
                    return await this.executeGitHubTool(toolName, params, connection);
                case 'gmail':
                    return await this.executeGmailTool(toolName, params, connection);
                case 'gdocs':
                    return await this.executeGDocsTool(toolName, params, connection);
                case 'shodan':
                    return await this.executeShodanTool(toolName, params, connection);
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
                        console.warn(`[MCP Service Connectors] Tool ${fullToolName} not found in GitHubProvider, available tools:`, Array.from(githubProvider.tools.keys()));
                        throw new Error(`Tool ${fullToolName} not found in GitHubProvider`);
                    }
                } catch (error) {
                    console.warn(`[MCP Service Connectors] GitHubProvider failed for ${toolName}, falling back to legacy:`, error);
                    
                    // For advanced tools that only exist in the provider, re-throw the error
                    if (toolName === 'advanced_search' || toolName.includes('search_')) {
                        throw new Error(`GitHub ${toolName} requires GitHubProvider: ${error.message}`);
                    }
                    // Fall through to legacy implementation for basic tools
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
                        'Authorization': `token ${token}`,
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
         * Connect using OAuth Web Flow (Gmail)
         */
        async connectWithOAuthWeb(serviceKey, config) {
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
            return await this.showOAuthWebSetupDialog(serviceKey, config);
        }

        /**
         * Show OAuth setup dialog for Google services
         */
        async showOAuthSetupDialog(serviceKey, config) {
            console.log(`[MCP Service Connectors] Showing OAuth setup dialog for ${serviceKey}`);
            return new Promise((resolve) => {
                // Remove any existing modal first
                const existingModal = document.getElementById('service-oauth-setup-modal');
                if (existingModal) {
                    existingModal.remove();
                }
                
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
                            ${serviceKey === 'gmail' ? `
                                <div class="warning-box" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;">
                                    <strong>⚠️ Important:</strong> Gmail requires a "Desktop app" OAuth client type.<br>
                                    Do NOT use "Web application" type or authentication will fail.
                                </div>
                            ` : ''}
                            
                            <div class="form-group">
                                <label for="${serviceKey}-client-id">OAuth Client ID${serviceKey === 'gmail' ? ' (from Desktop app)' : ''}</label>
                                <input type="text" 
                                       id="${serviceKey}-client-id" 
                                       placeholder="${serviceKey === 'gmail' ? 'Desktop app Client ID' : 'Your OAuth Client ID'}" 
                                       class="mcp-input" />
                            </div>
                            
                            <div class="form-group">
                                <label for="${serviceKey}-client-secret">OAuth Client Secret${serviceKey === 'gmail' ? ' (from Desktop app)' : ''}</label>
                                <input type="password" 
                                       id="${serviceKey}-client-secret" 
                                       placeholder="${serviceKey === 'gmail' ? 'Desktop app Client Secret' : 'Your OAuth Client Secret'}" 
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
                    console.log(`[MCP Service Connectors] OAuth button clicked for ${serviceKey}`);
                    
                    const clientIdInput = document.getElementById(`${serviceKey}-client-id`);
                    const clientSecretInput = document.getElementById(`${serviceKey}-client-secret`);
                    
                    console.log(`[MCP Service Connectors] Input elements found:`, {
                        clientIdInput: !!clientIdInput,
                        clientSecretInput: !!clientSecretInput
                    });
                    
                    const clientId = clientIdInput ? clientIdInput.value.trim() : '';
                    const clientSecret = clientSecretInput ? clientSecretInput.value.trim() : '';
                    
                    console.log(`[MCP Service Connectors] Credentials entered:`, {
                        clientId: clientId ? `${clientId.substring(0, 10)}...` : 'EMPTY',
                        clientSecret: clientSecret ? 'PROVIDED' : 'EMPTY'
                    });
                    
                    if (!clientId || !clientSecret) {
                        alert('Please enter both Client ID and Client Secret');
                        return;
                    }
                    
                    // Validate Google OAuth Client ID format
                    if (serviceKey === 'gmail' && !clientId.endsWith('.apps.googleusercontent.com')) {
                        alert('Invalid Google OAuth Client ID format. It should end with .apps.googleusercontent.com\n\nMake sure you are using a "Desktop app" OAuth client, NOT a "Web application" client.');
                        return;
                    }
                    
                    // Save credentials - spread config first, then override with user values
                    const oauthConfig = {
                        ...config.oauthConfig,
                        clientId,
                        clientSecret
                    };
                    
                    modal.remove();
                    
                    // Start device flow
                    const result = await this.startGoogleDeviceFlow(serviceKey, oauthConfig);
                    resolve(result);
                };
            });
        }

        /**
         * Show OAuth web setup dialog for Google services
         */
        async showOAuthWebSetupDialog(serviceKey, config) {
            console.log(`[MCP Service Connectors] Showing OAuth web setup dialog for ${serviceKey}`);
            return new Promise((resolve) => {
                // Remove any existing modal first
                const existingModal = document.getElementById('service-oauth-setup-modal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-oauth-setup-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} OAuth Setup</h3>
                        
                        <div class="setup-instructions">
                            <p><strong>Follow these steps to set up ${config.name} access:</strong></p>
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
                            ${serviceKey === 'gmail' ? `
                                <div class="warning-box" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;">
                                    <strong>⚠️ Important:</strong> Gmail requires a "Desktop app" OAuth client type.<br>
                                    Do NOT use "Web application" type or authentication will fail.
                                </div>
                            ` : ''}
                            
                            <div class="form-group">
                                <label for="${serviceKey}-client-id">OAuth Client ID${serviceKey === 'gmail' ? ' (from Desktop app)' : ''}</label>
                                <input type="text" 
                                       id="${serviceKey}-client-id" 
                                       placeholder="${serviceKey === 'gmail' ? 'Desktop app Client ID' : 'Your OAuth Client ID'}" 
                                       class="mcp-input" />
                            </div>
                            
                            <div class="form-group">
                                <label for="${serviceKey}-client-secret">OAuth Client Secret${serviceKey === 'gmail' ? ' (from Desktop app)' : ''}</label>
                                <input type="password" 
                                       id="${serviceKey}-client-secret" 
                                       placeholder="${serviceKey === 'gmail' ? 'Desktop app Client Secret' : 'Your OAuth Client Secret'}" 
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
                    console.log(`[MCP Service Connectors] OAuth button clicked for ${serviceKey}`);
                    
                    const clientIdInput = document.getElementById(`${serviceKey}-client-id`);
                    const clientSecretInput = document.getElementById(`${serviceKey}-client-secret`);
                    
                    const clientId = clientIdInput ? clientIdInput.value.trim() : '';
                    const clientSecret = clientSecretInput ? clientSecretInput.value.trim() : '';
                    
                    if (!clientId || !clientSecret) {
                        alert('Please enter both Client ID and Client Secret');
                        return;
                    }
                    
                    // Validate Google OAuth Client ID format
                    if (!clientId.endsWith('.apps.googleusercontent.com')) {
                        alert('Invalid Google OAuth Client ID format. It should end with .apps.googleusercontent.com\n\nMake sure you are using a "Desktop app" OAuth client, NOT a "Web application" client.');
                        return;
                    }
                    
                    // For Gmail, check if we need to clear old tokens with outdated scope
                    if (serviceKey === 'gmail') {
                        const storedAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
                        if (storedAuth && storedAuth.scope && storedAuth.scope.includes('gmail.send')) {
                            console.log('[MCP Service Connectors] Clearing old Gmail OAuth tokens with send permissions');
                            await window.CoreStorageService.removeValue('mcp_gmail_oauth');
                            await window.CoreStorageService.removeValue('gmail_mcp_connection');
                        }
                    }
                    
                    // Save credentials - spread config first, then override with user values
                    const oauthConfig = {
                        ...config.oauthConfig,
                        clientId,
                        clientSecret
                    };
                    
                    modal.remove();
                    
                    // Start web OAuth flow
                    const result = await this.startGoogleWebFlow(serviceKey, oauthConfig);
                    resolve(result);
                };
            });
        }

        /**
         * Start Google OAuth Web Flow
         */
        async startGoogleWebFlow(serviceKey, oauthConfig) {
            try {
                console.log(`[MCP Service Connectors] Starting OAuth web flow for ${serviceKey}`);
                
                // Build authorization URL
                const authParams = new URLSearchParams({
                    client_id: oauthConfig.clientId,
                    redirect_uri: oauthConfig.redirectUri,
                    response_type: oauthConfig.responseType,
                    scope: oauthConfig.scope,
                    access_type: oauthConfig.accessType,
                    prompt: 'consent'
                });
                
                const authUrl = `${oauthConfig.authorizationEndpoint}?${authParams.toString()}`;
                
                console.log(`[MCP Service Connectors] Opening authorization URL: ${authUrl}`);
                
                // Open authorization URL in new window
                window.open(authUrl, '_blank', 'width=600,height=700');
                
                // Show code input dialog
                const code = await this.showCodeInputDialog(serviceKey);
                
                if (code) {
                    // Exchange code for tokens
                    const tokens = await this.exchangeCodeForTokens(oauthConfig, code);
                    
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
                }
                
                return false;
            } catch (error) {
                console.error(`[MCP Service Connectors] OAuth web flow failed:`, error);
                alert(`Failed to authenticate with ${SERVICE_CONFIGS[serviceKey].name}: ${error.message}`);
                return false;
            }
        }

        /**
         * Show dialog to input authorization code
         */
        async showCodeInputDialog(serviceKey) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'auth-code-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>Enter Authorization Code</h3>
                        
                        <div class="auth-code-instructions">
                            <p>After authorizing access in the Google window:</p>
                            <ol>
                                <li>You'll see an authorization code</li>
                                <li>Copy the entire code</li>
                                <li>Paste it below</li>
                            </ol>
                        </div>
                        
                        <div class="form-group">
                            <label for="auth-code">Authorization Code</label>
                            <input type="text" 
                                   id="auth-code" 
                                   placeholder="Paste your authorization code here" 
                                   class="mcp-input" />
                        </div>
                        
                        <div class="form-actions">
                            <button class="btn primary-btn" id="submit-code">
                                Submit Code
                            </button>
                            <button class="btn secondary-btn" onclick="document.getElementById('auth-code-modal').remove()">
                                Cancel
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                document.getElementById('submit-code').onclick = () => {
                    const code = document.getElementById('auth-code').value.trim();
                    modal.remove();
                    resolve(code || null);
                };
            });
        }

        /**
         * Exchange authorization code for tokens
         */
        async exchangeCodeForTokens(oauthConfig, code) {
            try {
                const response = await fetch(oauthConfig.tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        code,
                        client_id: oauthConfig.clientId,
                        client_secret: oauthConfig.clientSecret,
                        redirect_uri: oauthConfig.redirectUri,
                        grant_type: 'authorization_code'
                    })
                });
                
                if (!response.ok) {
                    const error = await response.text();
                    console.error('[MCP Service Connectors] Token exchange error:', error);
                    throw new Error(`Token exchange failed: ${error}`);
                }
                
                const tokens = await response.json();
                return {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: Date.now() + (tokens.expires_in * 1000)
                };
            } catch (error) {
                console.error('[MCP Service Connectors] Token exchange failed:', error);
                throw error;
            }
        }

        /**
         * Start Google OAuth Device Flow
         */
        async startGoogleDeviceFlow(serviceKey, oauthConfig) {
            try {
                console.log(`[MCP Service Connectors] Starting OAuth device flow for ${serviceKey}`);
                console.log(`[MCP Service Connectors] OAuth config:`, {
                    endpoint: oauthConfig.authorizationEndpoint,
                    clientId: oauthConfig.clientId ? `${oauthConfig.clientId.substring(0, 10)}...` : 'MISSING',
                    scope: oauthConfig.scope
                });

                // Request device code
                const requestBody = new URLSearchParams({
                    client_id: oauthConfig.clientId,
                    scope: oauthConfig.scope
                });

                console.log(`[MCP Service Connectors] Request body:`, requestBody.toString());

                const deviceResponse = await fetch(oauthConfig.authorizationEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: requestBody
                });

                if (!deviceResponse.ok) {
                    const errorText = await deviceResponse.text();
                    console.error(`[MCP Service Connectors] OAuth device flow error:`, {
                        status: deviceResponse.status,
                        statusText: deviceResponse.statusText,
                        body: errorText
                    });
                    
                    let errorMessage = `Failed to get device code (${deviceResponse.status})`;
                    try {
                        const errorJson = JSON.parse(errorText);
                        if (errorJson.error_description) {
                            errorMessage += `: ${errorJson.error_description}`;
                        }
                    } catch (e) {
                        errorMessage += `: ${errorText}`;
                    }
                    
                    throw new Error(errorMessage);
                }

                const deviceData = await deviceResponse.json();
                
                // Show device code to user
                this.showDeviceCodeDialog(deviceData);
                
                // Poll for completion
                const tokens = await this.pollForDeviceAuthorization(oauthConfig, deviceData);
                
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
        showDeviceCodeDialog(deviceData) {
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
        async pollForDeviceAuthorization(oauthConfig, deviceData) {
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
         * Execute Gmail API calls with comprehensive READ ONLY functionality
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
                    if (params.labelIds && params.labelIds.length > 0) {
                        url += `&labelIds=${params.labelIds.map(id => encodeURIComponent(id)).join('&labelIds=')}`;
                    }
                    if (params.pageToken) url += `&pageToken=${encodeURIComponent(params.pageToken)}`;
                    url += `&maxResults=${params.maxResults || 10}`;
                    
                    // Enhanced: If format is metadata or full, fetch rich message data
                    const listFormat = params.format || 'metadata'; // Default to metadata for rich results
                    if (listFormat === 'metadata' || listFormat === 'full') {
                        const response = await this.fetchGmailData(url, tokens.accessToken);
                        if (response.messages) {
                            // Fetch detailed info for each message
                            const enrichedMessages = await Promise.all(
                                response.messages.slice(0, Math.min(response.messages.length, 50)).map(async (msg) => {
                                    try {
                                        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`;
                                        const detail = await this.fetchGmailData(detailUrl, tokens.accessToken);
                                        return this.formatMessageMetadata(detail);
                                    } catch (error) {
                                        console.warn(`Failed to fetch details for message ${msg.id}:`, error);
                                        return { id: msg.id, error: 'Failed to fetch details' };
                                    }
                                })
                            );
                            response.messages = enrichedMessages;
                        }
                        return response;
                    }
                    break;

                case 'get_message':
                    const format = params.format || 'full';
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.messageId}?format=${format}`;
                    const response = await this.fetchGmailData(url, tokens.accessToken);
                    return this.formatMessageResponse(response, format);

                case 'search_messages':
                    const searchQuery = this.buildGmailSearchQuery(params);
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}`;
                    url += `&maxResults=${params.maxResults || 10}`;
                    
                    // Enhanced: Return rich metadata for search results
                    const searchFormat = params.format || 'metadata'; // Default to metadata for rich results
                    if (searchFormat === 'metadata' || searchFormat === 'full') {
                        const searchResponse = await this.fetchGmailData(url, tokens.accessToken);
                        if (searchResponse.messages) {
                            const enrichedResults = await Promise.all(
                                searchResponse.messages.slice(0, Math.min(searchResponse.messages.length, 20)).map(async (msg) => {
                                    try {
                                        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`;
                                        const detail = await this.fetchGmailData(detailUrl, tokens.accessToken);
                                        return this.formatMessageMetadata(detail);
                                    } catch (error) {
                                        return { id: msg.id, error: 'Failed to fetch details' };
                                    }
                                })
                            );
                            searchResponse.messages = enrichedResults;
                        }
                        return searchResponse;
                    }
                    break;

                case 'list_threads':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/threads?`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    if (params.labelIds && params.labelIds.length > 0) {
                        url += `&labelIds=${params.labelIds.map(id => encodeURIComponent(id)).join('&labelIds=')}`;
                    }
                    if (params.pageToken) url += `&pageToken=${encodeURIComponent(params.pageToken)}`;
                    url += `&maxResults=${params.maxResults || 10}`;
                    break;

                case 'get_thread':
                    const threadFormat = params.format || 'metadata';
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${params.threadId}?format=${threadFormat}`;
                    const threadResponse = await this.fetchGmailData(url, tokens.accessToken);
                    return this.formatThreadResponse(threadResponse);

                case 'list_labels':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/labels`;
                    break;

                case 'get_label':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/labels/${params.labelId}`;
                    break;

                case 'get_profile':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/profile`;
                    break;

                case 'get_attachment':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.messageId}/attachments/${params.attachmentId}`;
                    const attachmentResponse = await this.fetchGmailData(url, tokens.accessToken);
                    return this.formatAttachmentResponse(attachmentResponse);

                case 'list_drafts':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts?`;
                    if (params.pageToken) url += `pageToken=${encodeURIComponent(params.pageToken)}&`;
                    url += `maxResults=${params.maxResults || 10}`;
                    break;

                case 'get_history':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/history?`;
                    url += `startHistoryId=${encodeURIComponent(params.startHistoryId)}`;
                    if (params.labelId) url += `&labelId=${encodeURIComponent(params.labelId)}`;
                    url += `&maxResults=${params.maxResults || 100}`;
                    break;

                case 'advanced_search':
                    const advancedQuery = this.buildAdvancedGmailQuery(params);
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(advancedQuery)}`;
                    url += `&maxResults=${params.maxResults || 20}`;
                    
                    // Return rich results for advanced search
                    const advancedResponse = await this.fetchGmailData(url, tokens.accessToken);
                    const advancedFormat = params.format || 'metadata'; // Default to metadata for rich results
                    if (advancedResponse.messages && (advancedFormat === 'metadata' || advancedFormat === 'full')) {
                        const enrichedAdvanced = await Promise.all(
                            advancedResponse.messages.slice(0, Math.min(advancedResponse.messages.length, 30)).map(async (msg) => {
                                try {
                                    const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`;
                                    const detail = await this.fetchGmailData(detailUrl, tokens.accessToken);
                                    return this.formatMessageMetadata(detail);
                                } catch (error) {
                                    return { id: msg.id, error: 'Failed to fetch details' };
                                }
                            })
                        );
                        advancedResponse.messages = enrichedAdvanced;
                        advancedResponse.searchQuery = advancedQuery;
                        advancedResponse.searchCriteria = params;
                    }
                    return advancedResponse;

                default:
                    throw new Error(`Unknown Gmail tool: ${toolName}`);
            }

            // For simple cases without special processing
            if (url) {
                return await this.fetchGmailData(url, tokens.accessToken);
            }
        }

        /**
         * Fetch Gmail data with proper error handling
         */
        async fetchGmailData(url, accessToken) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = `Gmail API error: ${response.status} ${response.statusText}`;
                    
                    try {
                        const errorJson = JSON.parse(errorText);
                        if (errorJson.error && errorJson.error.message) {
                            errorMessage += ` - ${errorJson.error.message}`;
                        }
                    } catch (e) {
                        errorMessage += ` - ${errorText}`;
                    }
                    
                    throw new Error(errorMessage);
                }

                return await response.json();
            } catch (error) {
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    throw new Error('Network error while connecting to Gmail API');
                }
                throw error;
            }
        }

        /**
         * Format message metadata for rich display
         */
        formatMessageMetadata(message) {
            const formatted = {
                id: message.id,
                threadId: message.threadId,
                labelIds: message.labelIds || [],
                snippet: message.snippet || '',
                sizeEstimate: message.sizeEstimate || 0,
                internalDate: message.internalDate ? new Date(parseInt(message.internalDate)).toISOString() : null
            };

            // Extract headers for better display
            if (message.payload && message.payload.headers) {
                const headers = {};
                for (const header of message.payload.headers) {
                    headers[header.name.toLowerCase()] = header.value;
                }
                
                formatted.subject = headers.subject || '(No Subject)';
                formatted.from = headers.from || 'Unknown Sender';
                formatted.to = headers.to || '';
                formatted.date = headers.date || '';
                formatted.cc = headers.cc || '';
                formatted.bcc = headers.bcc || '';
                
                // Parse date for better formatting
                if (headers.date) {
                    try {
                        formatted.parsedDate = new Date(headers.date).toISOString();
                    } catch (e) {
                        formatted.parsedDate = null;
                    }
                }
            }

            // Check for attachments
            if (message.payload) {
                formatted.hasAttachments = this.messageHasAttachments(message.payload);
                if (formatted.hasAttachments) {
                    formatted.attachments = this.extractAttachmentInfo(message.payload);
                }
            }

            // Determine read status
            formatted.isUnread = message.labelIds ? message.labelIds.includes('UNREAD') : false;
            formatted.isImportant = message.labelIds ? message.labelIds.includes('IMPORTANT') : false;

            return formatted;
        }

        /**
         * Format full message response
         */
        formatMessageResponse(message, format) {
            if (format === 'minimal') {
                return { id: message.id, threadId: message.threadId };
            }

            const formatted = this.formatMessageMetadata(message);

            if (format === 'full' && message.payload) {
                // Extract body content
                formatted.body = this.extractMessageBody(message.payload);
                formatted.textContent = this.extractTextContent(message.payload);
                formatted.htmlContent = this.extractHtmlContent(message.payload);
            }

            return formatted;
        }

        /**
         * Format thread response with summary
         */
        formatThreadResponse(thread) {
            const formatted = {
                id: thread.id,
                historyId: thread.historyId,
                messageCount: thread.messages ? thread.messages.length : 0,
                messages: []
            };

            if (thread.messages) {
                // Get participants and subject from first message
                const firstMessage = thread.messages[0];
                if (firstMessage && firstMessage.payload && firstMessage.payload.headers) {
                    const headers = {};
                    for (const header of firstMessage.payload.headers) {
                        headers[header.name.toLowerCase()] = header.value;
                    }
                    formatted.subject = headers.subject || '(No Subject)';
                    formatted.participants = this.extractParticipants(thread.messages);
                }

                // Format each message in thread
                formatted.messages = thread.messages.map(msg => this.formatMessageMetadata(msg));
            }

            return formatted;
        }

        /**
         * Format attachment response
         */
        formatAttachmentResponse(attachment) {
            return {
                attachmentId: attachment.attachmentId,
                size: attachment.size,
                data: attachment.data, // Base64 encoded
                filename: attachment.filename || 'attachment'
            };
        }

        /**
         * Check if message has attachments
         */
        messageHasAttachments(payload) {
            if (payload.parts) {
                return payload.parts.some(part => 
                    part.filename && part.filename.length > 0 ||
                    (part.body && part.body.attachmentId)
                );
            }
            return payload.body && payload.body.attachmentId;
        }

        /**
         * Extract attachment information
         */
        extractAttachmentInfo(payload) {
            const attachments = [];
            
            const extractFromPart = (part) => {
                if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
                    attachments.push({
                        filename: part.filename,
                        mimeType: part.mimeType,
                        size: part.body.size || 0,
                        attachmentId: part.body.attachmentId
                    });
                }
                
                if (part.parts) {
                    part.parts.forEach(extractFromPart);
                }
            };

            if (payload.parts) {
                payload.parts.forEach(extractFromPart);
            } else if (payload.filename && payload.body && payload.body.attachmentId) {
                attachments.push({
                    filename: payload.filename,
                    mimeType: payload.mimeType,
                    size: payload.body.size || 0,
                    attachmentId: payload.body.attachmentId
                });
            }

            return attachments;
        }

        /**
         * Extract participants from thread messages
         */
        extractParticipants(messages) {
            const participants = new Set();
            
            for (const message of messages) {
                if (message.payload && message.payload.headers) {
                    for (const header of message.payload.headers) {
                        if (['from', 'to', 'cc', 'bcc'].includes(header.name.toLowerCase())) {
                            // Parse email addresses
                            const emails = this.parseEmailAddresses(header.value);
                            emails.forEach(email => participants.add(email));
                        }
                    }
                }
            }
            
            return Array.from(participants);
        }

        /**
         * Parse email addresses from header value
         */
        parseEmailAddresses(headerValue) {
            if (!headerValue) return [];
            
            // Simple email extraction - could be enhanced with proper RFC parsing
            const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
            return (headerValue.match(emailRegex) || []).map(email => email.toLowerCase());
        }

        /**
         * Extract text content from message payload
         */
        extractTextContent(payload) {
            if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
                return this.decodeBase64Url(payload.body.data);
            }
            
            if (payload.parts) {
                for (const part of payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                        return this.decodeBase64Url(part.body.data);
                    }
                    
                    if (part.parts) {
                        const textContent = this.extractTextContent(part);
                        if (textContent) return textContent;
                    }
                }
            }
            
            return null;
        }

        /**
         * Extract HTML content from message payload
         */
        extractHtmlContent(payload) {
            if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
                return this.decodeBase64Url(payload.body.data);
            }
            
            if (payload.parts) {
                for (const part of payload.parts) {
                    if (part.mimeType === 'text/html' && part.body && part.body.data) {
                        return this.decodeBase64Url(part.body.data);
                    }
                    
                    if (part.parts) {
                        const htmlContent = this.extractHtmlContent(part);
                        if (htmlContent) return htmlContent;
                    }
                }
            }
            
            return null;
        }

        /**
         * Extract message body (prefers text, falls back to HTML)
         */
        extractMessageBody(payload) {
            const textContent = this.extractTextContent(payload);
            if (textContent) return textContent;
            
            const htmlContent = this.extractHtmlContent(payload);
            if (htmlContent) {
                // Basic HTML to text conversion
                return htmlContent
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .trim();
            }
            
            return '';
        }

        /**
         * Decode base64url encoded data
         */
        decodeBase64Url(data) {
            if (!data) return '';
            
            try {
                // Convert base64url to base64
                let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
                
                // Add padding if needed
                while (base64.length % 4) {
                    base64 += '=';
                }
                
                return atob(base64);
            } catch (error) {
                console.warn('Failed to decode base64url data:', error);
                return '';
            }
        }

        /**
         * Build advanced Gmail search query
         */
        buildAdvancedGmailQuery(params) {
            const parts = [];
            
            if (params.from) parts.push(`from:${params.from}`);
            if (params.to) parts.push(`to:${params.to}`);
            if (params.subject) parts.push(`subject:"${params.subject}"`);
            if (params.keywords) parts.push(params.keywords);
            if (params.after) parts.push(`after:${params.after}`);
            if (params.before) parts.push(`before:${params.before}`);
            if (params.hasAttachment) parts.push('has:attachment');
            if (params.attachmentType) parts.push(`filename:${params.attachmentType}`);
            if (params.sizeOperator && params.sizeBytes) {
                parts.push(`size:${params.sizeOperator}:${params.sizeBytes}`);
            }
            if (params.isUnread) parts.push('is:unread');
            if (params.isImportant) parts.push('is:important');
            
            return parts.join(' ');
        }

        /**
         * Build Gmail search query from parameters (enhanced version)
         */
        buildGmailSearchQuery(params) {
            const parts = [];
            if (params.from) parts.push(`from:${params.from}`);
            if (params.to) parts.push(`to:${params.to}`);
            if (params.subject) parts.push(`subject:"${params.subject}"`);
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
         * Execute Shodan API calls
         */
        async executeShodanTool(toolName, params, connection) {
            const { apiKey } = connection;
            let url, method = 'GET', body = null;

            // Build API request based on tool
            switch (toolName) {
                // Search Methods
                case 'shodan_host_info':
                    if (!params.ip) {
                        throw new Error('IP address is required for host lookup');
                    }
                    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    if (!ipRegex.test(params.ip)) {
                        throw new Error('Invalid IP address format. Please provide a valid IPv4 address.');
                    }
                    url = `https://api.shodan.io/shodan/host/${params.ip}?key=${encodeURIComponent(apiKey)}`;
                    if (params.history) url += '&history=true';
                    if (params.minify) url += '&minify=true';
                    break;

                case 'shodan_search':
                    if (!params.query) {
                        throw new Error('Search query is required');
                    }
                    url = `https://api.shodan.io/shodan/host/search?key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(params.query)}`;
                    if (params.facets) url += `&facets=${encodeURIComponent(params.facets)}`;
                    if (params.page) url += `&page=${params.page}`;
                    if (params.minify) url += '&minify=true';
                    break;

                case 'shodan_search_count':
                    if (!params.query) {
                        throw new Error('Search query is required');
                    }
                    url = `https://api.shodan.io/shodan/host/count?key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(params.query)}`;
                    if (params.facets) url += `&facets=${encodeURIComponent(params.facets)}`;
                    break;

                case 'shodan_search_facets':
                    url = `https://api.shodan.io/shodan/host/search/facets?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'shodan_search_filters':
                    url = `https://api.shodan.io/shodan/host/search/filters?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'shodan_search_tokens':
                    if (!params.query) {
                        throw new Error('Search query is required');
                    }
                    url = `https://api.shodan.io/shodan/host/search/tokens?key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(params.query)}`;
                    break;

                // Scanning Methods
                case 'shodan_scan':
                    if (!params.ips) {
                        throw new Error('IP addresses are required for scanning');
                    }
                    url = `https://api.shodan.io/shodan/scan?key=${encodeURIComponent(apiKey)}`;
                    method = 'POST';
                    body = new URLSearchParams({
                        ips: params.ips,
                        force: params.force || false
                    });
                    break;

                case 'shodan_scan_protocols':
                    url = `https://api.shodan.io/shodan/protocols?key=${encodeURIComponent(apiKey)}`;
                    break;

                // DNS Methods
                case 'shodan_dns_domain':
                    if (!params.domain) {
                        throw new Error('Domain is required');
                    }
                    url = `https://api.shodan.io/dns/domain/${encodeURIComponent(params.domain)}?key=${encodeURIComponent(apiKey)}`;
                    if (params.history) url += '&history=true';
                    if (params.type) url += `&type=${params.type}`;
                    if (params.page) url += `&page=${params.page}`;
                    break;

                case 'shodan_dns_resolve':
                    if (!params.hostnames) {
                        throw new Error('Hostnames are required');
                    }
                    url = `https://api.shodan.io/dns/resolve?key=${encodeURIComponent(apiKey)}&hostnames=${encodeURIComponent(params.hostnames)}`;
                    break;

                case 'shodan_dns_reverse':
                    if (!params.ips) {
                        throw new Error('IP addresses are required');
                    }
                    url = `https://api.shodan.io/dns/reverse?key=${encodeURIComponent(apiKey)}&ips=${encodeURIComponent(params.ips)}`;
                    break;

                // Account Methods
                case 'shodan_account_profile':
                    url = `https://api.shodan.io/account/profile?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'shodan_api_info':
                    url = `https://api.shodan.io/api-info?key=${encodeURIComponent(apiKey)}`;
                    break;

                // Tools Methods
                case 'shodan_tools_myip':
                    url = `https://api.shodan.io/tools/myip?key=${encodeURIComponent(apiKey)}`;
                    break;

                // Labs Methods
                case 'shodan_labs_honeyscore':
                    if (!params.ip) {
                        throw new Error('IP address is required');
                    }
                    const honeyIpRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    if (!honeyIpRegex.test(params.ip)) {
                        throw new Error('Invalid IP address format. Please provide a valid IPv4 address.');
                    }
                    url = `https://api.shodan.io/labs/honeyscore/${encodeURIComponent(params.ip)}?key=${encodeURIComponent(apiKey)}`;
                    break;

                default:
                    throw new Error(`Unknown Shodan tool: ${toolName}`);
            }

            try {
                console.log(`[MCP Service Connectors] Calling Shodan API: ${url.replace(apiKey, 'REDACTED')}`);
                
                const requestOptions = {
                    method: method,
                    headers: {
                        'Accept': 'application/json'
                    }
                };

                if (body) {
                    requestOptions.body = body;
                    requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }

                const response = await fetch(url, requestOptions);

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Invalid Shodan API key. Please check your API key.');
                    } else if (response.status === 402) {
                        throw new Error('Insufficient credits or plan limitations. Some features require a paid Shodan account.');
                    } else if (response.status === 403) {
                        throw new Error('Access forbidden. Check your API key permissions.');
                    } else if (response.status === 404) {
                        throw new Error(`Resource not found. ${params.ip ? `No information found for IP ${params.ip}` : 'The requested resource does not exist'}.`);
                    } else if (response.status === 429) {
                        throw new Error('Shodan API rate limit exceeded. Please try again later.');
                    } else {
                        const errorText = await response.text();
                        throw new Error(`Shodan API error (${response.status}): ${errorText}`);
                    }
                }

                const data = await response.json();
                
                // Format the response for better readability
                return this.formatShodanResponse(toolName, data, params);
                
            } catch (error) {
                console.error(`[MCP Service Connectors] Shodan API error:`, error);
                throw error;
            }
        }

        /**
         * Format Shodan API responses for better readability
         */
        formatShodanResponse(toolName, data, params) {
            switch (toolName) {
                case 'shodan_host_info':
                    return this.formatHostInfoResponse(data, params.ip);
                
                case 'shodan_search':
                    return this.formatSearchResponse(data);
                
                case 'shodan_search_count':
                    return {
                        query: params.query,
                        total_results: data.total,
                        credits_consumed: data.credits || 'Unknown',
                        facets: data.facets || {}
                    };
                
                case 'shodan_search_facets':
                case 'shodan_search_filters':
                    return {
                        available_items: data,
                        count: Array.isArray(data) ? data.length : Object.keys(data).length
                    };
                
                case 'shodan_search_tokens':
                    return {
                        query: params.query,
                        parsed_tokens: data.tokens || data,
                        filters: data.filters || {},
                        errors: data.errors || []
                    };
                
                case 'shodan_scan':
                    return {
                        scan_id: data.id,
                        credits_left: data.credits_left,
                        status: 'Scan submitted successfully',
                        ips_scanned: params.ips
                    };
                
                case 'shodan_scan_protocols':
                    return {
                        supported_protocols: data,
                        count: Object.keys(data).length
                    };
                
                case 'shodan_dns_domain':
                    return this.formatDomainResponse(data, params.domain);
                
                case 'shodan_dns_resolve':
                case 'shodan_dns_reverse':
                    return {
                        query: params.hostnames || params.ips,
                        results: data,
                        resolved_count: Object.keys(data).length
                    };
                
                case 'shodan_account_profile':
                    return {
                        username: data.username || data.display_name,
                        email: data.email,
                        member_since: data.created,
                        credits: data.credits,
                        upgrade_type: data.upgrade_type || 'Free',
                        total_usage: data.usage || {}
                    };
                
                case 'shodan_api_info':
                    return {
                        plan: data.plan,
                        usage: {
                            query_credits: data.query_credits,
                            scan_credits: data.scan_credits,
                            monitored_ips: data.monitored_ips
                        },
                        unlocked_features: data.unlocked || []
                    };
                
                case 'shodan_tools_myip':
                    return {
                        external_ip: data.ip || data,
                        source: 'Shodan'
                    };
                
                case 'shodan_labs_honeyscore':
                    return {
                        ip: params.ip,
                        honeypot_probability: data,
                        risk_level: data > 0.7 ? 'High' : data > 0.4 ? 'Medium' : 'Low',
                        description: `${Math.round(data * 100)}% chance this IP is a honeypot`
                    };
                
                default:
                    return {
                        tool: toolName,
                        raw_response: data
                    };
            }
        }

        /**
         * Format host information response
         */
        formatHostInfoResponse(data, ip) {
            const result = {
                ip: ip,
                basic_info: {}
            };

            // Basic information
            if (data.org) result.basic_info.organization = data.org;
            if (data.isp) result.basic_info.isp = data.isp;
            if (data.country_name) result.basic_info.country = data.country_name;
            if (data.city) result.basic_info.city = data.city;
            if (data.region_code) result.basic_info.region = data.region_code;
            if (data.os) result.basic_info.operating_system = data.os;

            // Open ports and services
            if (data.data && data.data.length > 0) {
                result.services = [];
                for (const service of data.data.slice(0, 15)) {
                    const serviceInfo = {
                        port: service.port,
                        protocol: service.transport || 'tcp',
                        service: service.product || 'Unknown service'
                    };
                    
                    if (service.version) serviceInfo.version = service.version;
                    if (service.cpe && service.cpe.length > 0) serviceInfo.cpe = service.cpe;
                    if (service.data && service.data.length < 300) {
                        serviceInfo.banner = service.data.trim();
                    }
                    
                    result.services.push(serviceInfo);
                }
            }

            // Vulnerabilities
            if (data.vulns && Object.keys(data.vulns).length > 0) {
                result.vulnerabilities = Object.keys(data.vulns).slice(0, 10);
                result.vulnerability_count = Object.keys(data.vulns).length;
            }

            // Additional metadata
            if (data.last_update) result.last_updated = data.last_update;
            if (data.hostnames && data.hostnames.length > 0) result.hostnames = data.hostnames;
            if (data.tags && data.tags.length > 0) result.tags = data.tags;

            return {
                summary: result,
                raw_data: data // Include raw data for advanced analysis
            };
        }

        /**
         * Format search response
         */
        formatSearchResponse(data) {
            const result = {
                total_results: data.total,
                results_shown: data.matches ? data.matches.length : 0,
                matches: []
            };

            if (data.matches) {
                for (const match of data.matches.slice(0, 10)) {
                    const matchInfo = {
                        ip: match.ip_str,
                        port: match.port,
                        protocol: match.transport || 'tcp',
                        service: match.product || 'Unknown',
                        location: {
                            country: match.location?.country_name,
                            city: match.location?.city,
                            region: match.location?.region_code
                        },
                        organization: match.org,
                        timestamp: match.timestamp
                    };
                    
                    if (match.vulns && Object.keys(match.vulns).length > 0) {
                        matchInfo.vulnerabilities = Object.keys(match.vulns).slice(0, 3);
                    }
                    
                    result.matches.push(matchInfo);
                }
            }

            if (data.facets) {
                result.facets = data.facets;
            }

            return result;
        }

        /**
         * Format domain response
         */
        formatDomainResponse(data, domain) {
            const result = {
                domain: domain,
                subdomains: data.subdomains || [],
                subdomain_count: data.subdomains ? data.subdomains.length : 0,
                dns_records: []
            };

            if (data.data) {
                for (const record of data.data.slice(0, 20)) {
                    result.dns_records.push({
                        subdomain: record.subdomain,
                        type: record.type,
                        value: record.value,
                        last_seen: record.last_seen
                    });
                }
            }

            return {
                summary: result,
                raw_data: data
            };
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
         * Connect using API Key (Shodan)
         */
        async connectWithAPIKey(serviceKey, config) {
            // Check for existing API key
            const storageKey = `mcp_${serviceKey}_apikey`;
            const existingApiKey = await window.CoreStorageService.getValue(storageKey);

            if (existingApiKey) {
                // Validate API key by making a test API call
                const isValid = await this.validateShodanAPIKey(existingApiKey);
                if (isValid) {
                    console.log(`[MCP Service Connectors] Using existing ${config.name} API key`);
                    return await this.createShodanConnection(serviceKey, config, existingApiKey);
                }
            }

            // Show API key input UI
            return await this.showAPIKeyInputDialog(serviceKey, config);
        }

        /**
         * Validate Shodan API Key
         */
        async validateShodanAPIKey(apiKey) {
            try {
                console.log(`[MCP Service Connectors] Validating Shodan API key: ${apiKey.substring(0, 8)}...`);
                
                // Make a simple API call to validate the key
                const response = await fetch(`https://api.shodan.io/api-info?key=${apiKey}`);
                
                console.log(`[MCP Service Connectors] Shodan API validation response: Status=${response.status}, OK=${response.ok}`);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`[MCP Service Connectors] Shodan API error: ${errorText}`);
                }

                return response.ok;
            } catch (error) {
                console.error('[MCP Service Connectors] Shodan API validation exception:', error);
                return false;
            }
        }

        /**
         * Create Shodan connection
         */
        async createShodanConnection(serviceKey, config, apiKey) {
            // Store connection info
            this.connectedServices.set(serviceKey, { 
                config: config, 
                apiKey: apiKey, 
                type: 'shodan'
            });

            // Store API key in CoreStorageService for sharing functionality
            if (window.CoreStorageService) {
                await window.CoreStorageService.setValue('shodan_api_key', apiKey);
            }

            // Register tools with function calling system
            try {
                await this.registerServiceTools(serviceKey, config, { apiKey: apiKey });
            } catch (error) {
                console.error(`[MCP Service Connectors] Failed to register tools for ${serviceKey}:`, error);
                throw error; // Re-throw to maintain error handling
            }

            // Auto-activate Shodan integration prompt when Shodan is connected
            if (window.DefaultPromptsService && window.ShodanIntegrationGuide) {
                try {
                    window.DefaultPromptsService.registerPrompt(window.ShodanIntegrationGuide);
                    window.DefaultPromptsService.enablePrompt('Shodan Integration Guide');
                    console.log('[MCP Service Connectors] Shodan integration prompt auto-enabled');
                } catch (error) {
                    console.warn('[MCP Service Connectors] Failed to auto-enable Shodan prompt:', error);
                }
            }

            return true;
        }

        /**
         * Show API key input dialog
         */
        async showAPIKeyInputDialog(serviceKey, config) {
            return new Promise((resolve) => {
                // Remove any existing modal first
                const existingModal = document.getElementById('api-key-modal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'api-key-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} API Key Setup</h3>
                        
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
                                <label for="api-key-input">API Key</label>
                                <input type="password" 
                                       id="api-key-input" 
                                       placeholder="Enter your ${config.name} API key" 
                                       class="mcp-input" />
                                <small class="form-help">Your API key will be encrypted and stored locally</small>
                            </div>
                            
                            <div class="form-actions">
                                <button class="btn primary-btn" id="api-key-connect">
                                    Save & Connect
                                </button>
                                <button class="btn secondary-btn" id="api-key-cancel">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                const apiKeyInput = modal.querySelector('#api-key-input');
                const connectBtn = modal.querySelector('#api-key-connect');
                const cancelBtn = modal.querySelector('#api-key-cancel');
                
                // Focus the input
                apiKeyInput.focus();
                
                // Handle cancel
                const handleCancel = () => {
                    modal.remove();
                    resolve(false);
                };
                
                // Handle connect
                const handleConnect = async () => {
                    const apiKey = apiKeyInput.value.trim();
                    if (!apiKey) {
                        apiKeyInput.style.borderColor = '#ff6b6b';
                        apiKeyInput.focus();
                        return;
                    }
                    
                    // Store API key
                    const storageKey = `mcp_${serviceKey}_apikey`;
                    await window.CoreStorageService.setValue(storageKey, apiKey);
                    
                    // Close dialog and connect
                    modal.remove();
                    const result = await this.createShodanConnection(serviceKey, config, apiKey);
                    resolve(result);
                };
                
                // Event listeners
                connectBtn.addEventListener('click', handleConnect);
                cancelBtn.addEventListener('click', handleCancel);
                apiKeyInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleConnect();
                    }
                });
                
                // Close on background click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        handleCancel();
                    }
                });
            });
        }

        /**
         * Disconnect a service with comprehensive cleanup
         * @param {string} serviceKey - The service key to disconnect
         * @returns {Promise<boolean>} Whether the disconnection was successful
         */
        async disconnectService(serviceKey) {
            console.log(`[MCP Service Connectors] Starting disconnection of service: ${serviceKey}`);
            
            const connection = this.connectedServices.get(serviceKey);
            if (!connection) {
                console.log(`[MCP Service Connectors] Service ${serviceKey} not connected, skipping disconnection`);
                return true;
            }

            let disconnectionSuccessful = true;
            
            try {
                // Remove registered functions
                const config = SERVICE_CONFIGS[serviceKey];
                if (config && config.tools) {
                    const toolNames = Object.keys(config.tools);
                    console.log(`[MCP Service Connectors] Removing ${toolNames.length} tools for ${serviceKey}`);
                    
                    for (const toolName of toolNames) {
                        const functionName = serviceKey === 'github' ? toolName : `${serviceKey}_${toolName}`;
                        
                        // Remove from global scope
                        if (window[functionName]) {
                            delete window[functionName];
                            console.log(`[MCP Service Connectors] Removed global function: ${functionName}`);
                        }
                        
                        // Remove from Function Calling system
                        if (window.FunctionToolsService && typeof window.FunctionToolsService.removeJsFunction === 'function') {
                            try {
                                const removed = window.FunctionToolsService.removeJsFunction(functionName);
                                if (removed) {
                                    console.log(`[MCP Service Connectors] Removed ${functionName} from Function Calling system`);
                                } else {
                                    console.log(`[MCP Service Connectors] Function ${functionName} not found in Function Calling system`);
                                }
                            } catch (removalError) {
                                console.warn(`[MCP Service Connectors] Failed to remove ${functionName} from Function Calling system:`, removalError);
                                disconnectionSuccessful = false;
                            }
                        }
                    }
                }

                // Remove from connected services
                this.connectedServices.delete(serviceKey);
                this.oauthTokens.delete(serviceKey);

                // Clear stored credentials (don't fail if this fails)
                try {
                    await window.CoreStorageService.removeValue(`mcp_${serviceKey}_token`);
                    await window.CoreStorageService.removeValue(`mcp_${serviceKey}_oauth`);
                    console.log(`[MCP Service Connectors] Cleared stored credentials for ${serviceKey}`);
                } catch (storageError) {
                    console.warn(`[MCP Service Connectors] Failed to clear credentials for ${serviceKey}:`, storageError);
                    // Don't mark as failed since the service is still disconnected
                }

                console.log(`[MCP Service Connectors] ${config?.name || serviceKey} disconnected successfully`);
                return disconnectionSuccessful;
                
            } catch (error) {
                console.error(`[MCP Service Connectors] Error during disconnection of ${serviceKey}:`, error);
                return false;
            }
        }

        /**
         * Get connection status for a service
         */
        isConnected(serviceKey) {
            return this.connectedServices.has(serviceKey);
        }

        /**
         * Get all connected services with comprehensive information
         * @returns {Array} Array of connected service objects with full details
         */
        getConnectedServices() {
            const connectedServices = Array.from(this.connectedServices.keys()).map(key => {
                const connection = this.connectedServices.get(key);
                const config = SERVICE_CONFIGS[key];
                
                return {
                    key,
                    name: config?.name || key,
                    type: connection?.type || 'unknown',
                    connected: true,
                    toolCount: this.getToolCount(key),
                    hasValidToken: this.hasValidConnection(key),
                    connectionInfo: {
                        authType: config?.authType,
                        connectedAt: connection?.connectedAt || Date.now(),
                        lastValidated: connection?.lastValidated
                    }
                };
            });
            
            console.log(`[MCP Service Connectors] getConnectedServices returning ${connectedServices.length} services:`, connectedServices.map(s => s.key));
            return connectedServices;
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
         * @param {string} serviceKey - The service key
         * @returns {number} Number of tools available for the service
         */
        getToolCount(serviceKey) {
            const config = SERVICE_CONFIGS[serviceKey];
            if (!config || !config.tools) return 0;
            return Object.keys(config.tools).length;
        }
        
        /**
         * Check if a service has a valid connection
         * @param {string} serviceKey - The service key to check
         * @returns {boolean} Whether the service has a valid connection
         */
        hasValidConnection(serviceKey) {
            const connection = this.connectedServices.get(serviceKey);
            if (!connection) return false;
            
            // For token-based services, check if token exists
            if (connection.token) {
                return typeof connection.token === 'string' && connection.token.length > 0;
            }
            
            // For OAuth services, check if we have valid tokens
            if (connection.tokens) {
                return !!(connection.tokens.accessToken && connection.tokens.accessToken.length > 0);
            }
            
            return false;
        }
        
        /**
         * Bulk disconnect multiple services efficiently
         * @param {Array<string>} serviceKeys - Array of service keys to disconnect
         * @returns {Promise<Object>} Object with success/failure counts and details
         */
        async bulkDisconnectServices(serviceKeys = []) {
            console.log(`[MCP Service Connectors] Starting bulk disconnection of ${serviceKeys.length} services:`, serviceKeys);
            
            const results = {
                successful: [],
                failed: [],
                totalRequested: serviceKeys.length,
                totalDisconnected: 0
            };
            
            for (const serviceKey of serviceKeys) {
                try {
                    const success = await this.disconnectService(serviceKey);
                    if (success) {
                        results.successful.push(serviceKey);
                        results.totalDisconnected++;
                    } else {
                        results.failed.push({ serviceKey, error: 'Disconnection returned false' });
                    }
                } catch (error) {
                    console.error(`[MCP Service Connectors] Bulk disconnect failed for ${serviceKey}:`, error);
                    results.failed.push({ serviceKey, error: error.message });
                }
            }
            
            console.log(`[MCP Service Connectors] Bulk disconnect completed:`, results);
            return results;
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

        /**
         * Register Gmail functions with the function calling system
         * Used when Gmail OAuth is restored from shared links
         * @param {Object} oauthTokens - Gmail OAuth tokens
         * @returns {Promise<boolean>} True if functions were registered successfully
         */
        async registerGmailFunctions(oauthTokens) {
            try {
                console.log('[MCP Service Connectors] Registering Gmail functions after OAuth restore');
                
                const serviceKey = 'gmail';
                const config = SERVICE_CONFIGS[serviceKey];
                
                if (!config || !config.tools) {
                    console.warn('[MCP Service Connectors] Gmail service config not found');
                    return false;
                }

                // Create a temporary connection object for function registration
                const tempConnection = {
                    type: 'oauth',
                    tokens: oauthTokens,
                    connectedAt: Date.now()
                };

                // Register the service functions using the existing registerServiceTools method
                await this.registerServiceTools(serviceKey, config, tempConnection.tokens);
                
                // CRITICAL: Create the actual service connection so Gmail appears as "connected"
                await this.createGoogleConnection(serviceKey, config, oauthTokens);
                
                console.log('[MCP Service Connectors] Gmail functions registered and service connected successfully');
                
                // Auto-activate Gmail integration prompt when Gmail is connected
                if (window.DefaultPromptsService && window.GmailIntegrationGuide) {
                    try {
                        window.DefaultPromptsService.enablePrompt('Gmail Integration Guide');
                        console.log('[MCP Service Connectors] Gmail integration prompt auto-enabled');
                    } catch (error) {
                        console.warn('[MCP Service Connectors] Failed to auto-enable Gmail prompt:', error);
                    }
                }
                
                return true;
                
            } catch (error) {
                console.error('[MCP Service Connectors] Failed to register Gmail functions:', error);
                return false;
            }
        }
    }

    // Export to global scope
    global.MCPServiceConnectors = new MCPServiceConnectors();

})(window);