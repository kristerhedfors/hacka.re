/**
 * MCP Introspection Service
 * Built-in MCP tools for exploring hacka.re source code and architecture
 */

window.MCPIntrospectionService = (function() {
    
    // Complete list of known files in the hacka.re project
    const knownFiles = [
        // Core HTML
        'index.html',
        'about/index.html',
        'about/architecture.html',
        'about/development.html',
        'about/disclaimer.html',
        'about/local-llm-toolbox.html',
        'about/philosophy.html',
        'about/research-report.html',
        'about/serverless.html',
        'about/thumbnail.html',
        
        // Core JavaScript
        'js/app.js',
        'js/script.js',
        
        // JavaScript Services
        'js/services/agent-cache.js',
        'js/services/agent-context-manager.js',
        'js/services/agent-interface.js',
        'js/services/agent-loader.js',
        'js/services/agent-orchestrator.js',
        'js/services/agent-service.js',
        'js/services/api-debugger.js',
        'js/services/api-request-builder.js',
        'js/services/api-response-parser.js',
        'js/services/api-service.js',
        'js/services/api-stream-processor.js',
        'js/services/api-tool-call-handler.js',
        'js/services/api-tools-service.js',
        'js/services/chat-streaming-service.js',
        'js/services/chat-tools-service.js',
        'js/services/chat-ui-service.js',
        'js/services/configuration-service.js',
        'js/services/context-usage-service.js',
        'js/services/core-storage-service.js',
        'js/services/cross-tab-sync-service.js',
        'js/services/data-service.js',
        'js/services/debug-service.js',
        'js/services/default-functions-service.js',
        'js/services/default-prompts-service.js',
        'js/services/encryption-service.js',
        'js/services/function-tools-config.js',
        'js/services/function-tools-executor.js',
        'js/services/function-tools-logger.js',
        'js/services/function-tools-parser.js',
        'js/services/function-tools-processor.js',
        'js/services/function-tools-registry.js',
        'js/services/function-tools-service.js',
        'js/services/function-tools-storage.js',
        'js/services/link-sharing-service.js',
        'js/services/mcp-auth-strategies.js',
        'js/services/mcp-base-service-connector.js',
        'js/services/mcp-client-core.js',
        'js/services/mcp-client-registration.js',
        'js/services/mcp-connection-manager.js',
        'js/services/mcp-github-connector.js',
        'js/services/mcp-gmail-connector.js',
        'js/services/mcp-metadata-discovery.js',
        'js/services/mcp-oauth-connector.js',
        'js/services/mcp-oauth-service.js',
        'js/services/mcp-provider-factory.js',
        'js/services/mcp-provider-interface.js',
        'js/services/mcp-request-manager.js',
        'js/services/mcp-service-manager.js',
        'js/services/mcp-service-ui-helper.js',
        'js/services/mcp-share-link-service.js',
        'js/services/mcp-shodan-connector.js',
        'js/services/mcp-tool-registry.js',
        'js/services/mcp-transport-service.js',
        'js/services/model-cache.js',
        'js/services/model-country-mapping.js',
        'js/services/model-info.js',
        'js/services/models-dev-data.js',
        'js/services/namespace-service.js',
        'js/services/orchestration-agent-service.js',
        'js/services/orchestration-mcp-server.js',
        'js/services/prompts-service.js',
        'js/services/rag-indexing-service.js',
        'js/services/rag-query-expansion-service.js',
        'js/services/rag-regulations-service.js',
        'js/services/rag-storage-service.js',
        'js/services/settings-info-modal-service.js',
        'js/services/share-service.js',
        'js/services/storage-service.js',
        'js/services/storage-type-service.js',
        'js/services/system-prompt-coordinator.js',
        'js/services/vector-rag-service.js',
        
        // JavaScript Components
        'js/components/agent-manager.js',
        'js/components/ai-hackare.js',
        'js/components/api-tools-manager.js',
        'js/components/chat-manager.js',
        'js/components/dom-elements.js',
        'js/components/function-approval-memory-modal.js',
        'js/components/function-calling-manager.js',
        'js/components/function-execution-modal.js',
        'js/components/mcp-manager.js',
        'js/components/prompts-event-handlers.js',
        'js/components/prompts-manager.js',
        'js/components/prompts-modal-renderer.js',
        'js/components/share-manager.js',
        'js/components/ui-manager.js',
        
        // Function Calling Components
        'js/components/function-calling/default-functions-manager.js',
        'js/components/function-calling/function-code-editor.js',
        'js/components/function-calling/function-copy-manager.js',
        'js/components/function-calling/function-details-modal.js',
        'js/components/function-calling/function-details-tabbed-modal.js',
        'js/components/function-calling/function-editor-manager.js',
        'js/components/function-calling/function-execute-modal.js',
        'js/components/function-calling/function-executor.js',
        'js/components/function-calling/function-library-manager.js',
        'js/components/function-calling/function-list-renderer.js',
        'js/components/function-calling/function-modal-manager.js',
        'js/components/function-calling/function-parser.js',
        'js/components/function-calling/function-validator.js',
        'js/components/function-calling/mcp-server-manager.js',
        
        // Settings Components
        'js/components/settings/api-key-input-handler.js',
        'js/components/settings/api-key-manager.js',
        'js/components/settings/base-url-manager.js',
        'js/components/settings/debug-manager.js',
        'js/components/settings/model-manager.js',
        'js/components/settings/settings-coordinator.js',
        'js/components/settings/settings-initialization.js',
        'js/components/settings/settings-manager.js',
        'js/components/settings/settings-state-manager.js',
        'js/components/settings/shared-link-data-processor.js',
        'js/components/settings/shared-link-manager.js',
        'js/components/settings/shared-link-modal-manager.js',
        'js/components/settings/system-prompt-manager.js',
        'js/components/settings/title-subtitle-manager.js',
        'js/components/settings/tool-calling-manager.js',
        'js/components/settings/voice-control-manager.js',
        'js/components/settings/welcome-manager.js',
        'js/components/settings/yolo-mode-manager.js',
        
        // MCP Components
        'js/components/mcp/mcp-command-history.js',
        'js/components/mcp/mcp-connections-ui.js',
        'js/components/mcp/mcp-modal-renderer.js',
        'js/components/mcp/mcp-oauth-config.js',
        'js/components/mcp/mcp-oauth-flow.js',
        'js/components/mcp/mcp-oauth-integration.js',
        'js/components/mcp/mcp-proxy-manager.js',
        'js/components/mcp/mcp-quick-connectors.js',
        'js/components/mcp/mcp-server-manager.js',
        'js/components/mcp/mcp-share-link-ui.js',
        'js/components/mcp/mcp-tools-manager.js',
        'js/components/mcp/mcp-ui-manager.js',
        'js/components/mcp/mcp-utils.js',
        
        // CSS Files
        'css/styles.css',
        'css/themes.css',
        'css/checkbox-fix.css',
        'css/copy-code.css',
        'css/default-functions.css',
        'css/default-prompts.css',
        'css/function-calling.css',
        'css/function-calling-modal.css',
        'css/function-details-modal.css',
        'css/function-execute-modal.css',
        'css/function-indicators.css',
        'css/mobile-unified.css',
        'css/modal-width-fix.css',
        'css/rag-modal.css',
        
        // Default Functions
        'js/default-functions/api-auth-client.js',
        'js/default-functions/math-utilities.js',
        'js/default-functions/mcp-example.js',
        'js/default-functions/rc4-encryption.js',
        
        // Default Prompts
        'js/default-prompts/agent-coding-specialist.js',
        'js/default-prompts/agent-data-analyst.js',
        'js/default-prompts/agent-documentation-specialist.js',
        'js/default-prompts/agent-orchestration.js',
        'js/default-prompts/agent-planning-specialist.js',
        'js/default-prompts/agent-project-manager.js',
        'js/default-prompts/agent-research-specialist.js',
        'js/default-prompts/agent-security-analyst.js',
        'js/default-prompts/agent-testing-specialist.js',
        'js/default-prompts/function-calling.js',
        'js/default-prompts/function-library.js',
        'js/default-prompts/github-integration-guide.js',
        'js/default-prompts/gmail-integration-guide.js',
        'js/default-prompts/hacka-re-project.js',
        'js/default-prompts/owasp-llm-top10.js',
        'js/default-prompts/share-link-mcp-guide.js',
        'js/default-prompts/shodan-integration-guide.js'
    ];
    
    /**
     * Read a file from the web server
     * @param {Object} args - Arguments containing file path
     * @returns {Object} File content and metadata
     */
    async function readFile(args) {
        try {
            console.log('[MCPIntrospectionService] readFile called with args:', args);
            
            // Handle both direct path string and object with path property
            const path = typeof args === 'string' ? args : args?.path;
            
            if (!path) {
                console.error('[MCPIntrospectionService] No path provided, args was:', args);
                return {
                    success: false,
                    error: 'Path is required'
                };
            }
            
            // Ensure the path doesn't start with / for relative fetch
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            
            // Build the full URL using the current origin for reliable fetching
            const baseUrl = window.location.origin;
            const fullUrl = `${baseUrl}/${cleanPath}`;
            console.log('[MCPIntrospectionService] Fetching file from:', fullUrl);
            
            const response = await fetch(fullUrl);
            
            if (!response.ok) {
                return {
                    success: false,
                    error: `File not found: ${cleanPath} (${response.status})`
                };
            }
            
            const content = await response.text();
            const lines = content.split('\n');
            
            return {
                success: true,
                path: cleanPath,
                content: content,
                size: content.length,
                lines: lines.length,
                extension: cleanPath.split('.').pop()
            };
        } catch (error) {
            console.error('[MCPIntrospectionService] Error reading file:', error);
            return {
                success: false,
                error: error.message || 'Failed to read file'
            };
        }
    }
    
    /**
     * Find definitions (classes, functions, components, services) in the codebase
     * @param {Object} args - Arguments with name and optional type
     * @returns {Object} Search results with locations and context
     */
    async function findDefinition(args) {
        try {
            console.log('[MCPIntrospectionService] findDefinition called with args:', args);
            
            // Ensure args is an object
            if (!args || typeof args !== 'object') {
                args = {};
            }
            
            const { name, type = 'any' } = args;
            
            if (!name) {
                return {
                    success: false,
                    error: 'Name is required'
                };
            }
            
            const results = [];
            const jsFiles = knownFiles.filter(f => f.endsWith('.js'));
            
            // Patterns for different definition types
            const patterns = {
                function: [
                    new RegExp(`function\\s+${name}\\s*\\(`, 'g'),
                    new RegExp(`const\\s+${name}\\s*=\\s*(?:async\\s+)?(?:function|\\()`, 'g'),
                    new RegExp(`let\\s+${name}\\s*=\\s*(?:async\\s+)?(?:function|\\()`, 'g')
                ],
                class: [
                    new RegExp(`class\\s+${name}(?:\\s+extends\\s+\\w+)?\\s*\\{`, 'g')
                ],
                component: [
                    new RegExp(`window\\.${name}\\s*=`, 'g')
                ],
                service: [
                    new RegExp(`window\\.${name}(?:Service)?\\s*=`, 'g')
                ]
            };
            
            // Determine which patterns to check
            let patternsToCheck = [];
            if (type === 'any') {
                Object.values(patterns).forEach(patternList => {
                    patternsToCheck = patternsToCheck.concat(patternList);
                });
            } else if (patterns[type]) {
                patternsToCheck = patterns[type];
            }
            
            // Search through JS files
            for (const filePath of jsFiles) {
                try {
                    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
                    const fullUrl = `${window.location.origin}/${cleanPath}`;
                    const response = await fetch(fullUrl);
                    if (!response.ok) continue;
                    
                    const content = await response.text();
                    const lines = content.split('\n');
                    
                    // Check each pattern
                    for (const pattern of patternsToCheck) {
                        const matches = [...content.matchAll(pattern)];
                        
                        for (const match of matches) {
                            // Find line number
                            const beforeMatch = content.substring(0, match.index);
                            const lineNumber = beforeMatch.split('\n').length;
                            
                            // Extract context (5 lines before and after)
                            const startLine = Math.max(0, lineNumber - 5);
                            const endLine = Math.min(lines.length, lineNumber + 5);
                            const context = lines.slice(startLine, endLine).join('\n');
                            
                            results.push({
                                file: filePath,
                                name: name,
                                type: type === 'any' ? 'definition' : type,
                                line: lineNumber,
                                match: match[0],
                                context: context
                            });
                        }
                    }
                } catch (error) {
                    // Skip files that can't be fetched
                    console.warn(`[MCPIntrospectionService] Could not search ${filePath}:`, error.message);
                }
            }
            
            return {
                success: true,
                query: name,
                type: type,
                results: results,
                filesSearched: jsFiles.length,
                totalFound: results.length
            };
        } catch (error) {
            console.error('[MCPIntrospectionService] Error finding definition:', error);
            return {
                success: false,
                error: error.message || 'Failed to find definition'
            };
        }
    }
    
    /**
     * Search for a pattern across the codebase
     * @param {Object} args - Arguments with pattern and optional file filter
     * @returns {Object} Search results with matches
     */
    async function searchPattern(args) {
        try {
            console.log('[MCPIntrospectionService] searchPattern called with args:', args);
            
            // Ensure args is an object
            if (!args || typeof args !== 'object') {
                args = {};
            }
            
            const { pattern, fileFilter = '*.js', caseSensitive = false, maxResults = 50 } = args;
            
            if (!pattern) {
                return {
                    success: false,
                    error: 'Pattern is required'
                };
            }
            
            // Convert file filter to regex
            let filesToSearch = knownFiles;
            if (fileFilter && fileFilter !== '*') {
                const filterRegex = new RegExp(
                    fileFilter.replace('*', '.*').replace('.', '\\.')
                );
                filesToSearch = knownFiles.filter(f => filterRegex.test(f));
            }
            
            const results = [];
            const searchRegex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
            
            // Search through files
            for (const filePath of filesToSearch) {
                if (results.length >= maxResults) break;
                
                try {
                    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
                    const fullUrl = `${window.location.origin}/${cleanPath}`;
                    const response = await fetch(fullUrl);
                    if (!response.ok) continue;
                    
                    const content = await response.text();
                    const lines = content.split('\n');
                    const matches = [...content.matchAll(searchRegex)];
                    
                    for (const match of matches) {
                        if (results.length >= maxResults) break;
                        
                        // Find line number
                        const beforeMatch = content.substring(0, match.index);
                        const lineNumber = beforeMatch.split('\n').length;
                        
                        // Get the line containing the match
                        const line = lines[lineNumber - 1];
                        
                        results.push({
                            file: filePath,
                            line: lineNumber,
                            match: match[0],
                            lineContent: line,
                            column: match.index - beforeMatch.lastIndexOf('\n') - 1
                        });
                    }
                } catch (error) {
                    // Skip files that can't be fetched
                }
            }
            
            return {
                success: true,
                pattern: pattern,
                results: results,
                filesSearched: filesToSearch.length,
                totalFound: results.length,
                truncated: results.length === maxResults
            };
        } catch (error) {
            console.error('[MCPIntrospectionService] Error searching pattern:', error);
            return {
                success: false,
                error: error.message || 'Failed to search pattern'
            };
        }
    }
    
    /**
     * Get information about a specific component or service
     * @param {Object} args - Arguments with component name
     * @returns {Object} Component information
     */
    async function getComponentInfo(args) {
        try {
            console.log('[MCPIntrospectionService] getComponentInfo called with args:', args);
            
            // Ensure args is an object
            if (!args || typeof args !== 'object') {
                args = {};
            }
            
            const { name } = args;
            
            if (!name) {
                return {
                    success: false,
                    error: 'Component name is required'
                };
            }
            
            // Try to find the component file
            const possiblePaths = [
                `js/components/${name}.js`,
                `js/services/${name}.js`,
                `js/components/${name}/${name}.js`,
                `js/services/${name}-service.js`,
                `js/components/${name}-manager.js`
            ];
            
            for (const path of possiblePaths) {
                try {
                    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
                    const fullUrl = `${window.location.origin}/${cleanPath}`;
                    const response = await fetch(fullUrl);
                    if (!response.ok) continue;
                    
                    const content = await response.text();
                    const lines = content.split('\n');
                    
                    // Extract information
                    const info = {
                        name: name,
                        path: path,
                        size: content.length,
                        lines: lines.length
                    };
                    
                    // Extract JSDoc description if present
                    const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
                    if (jsdocMatch) {
                        info.description = jsdocMatch[0];
                    }
                    
                    // Find public methods (looking for return statement with object)
                    const returnMatch = content.match(/return\s*\{[\s\S]*?\}/m);
                    if (returnMatch) {
                        const publicAPI = returnMatch[0];
                        const methods = publicAPI.match(/(\w+)\s*:/g);
                        if (methods) {
                            info.publicMethods = methods.map(m => m.replace(':', '').trim());
                        }
                    }
                    
                    // Find dependencies (window.SomeService references)
                    const depMatches = [...content.matchAll(/window\.(\w+(?:Service|Manager|Coordinator))/g)];
                    if (depMatches.length > 0) {
                        info.dependencies = [...new Set(depMatches.map(m => m[1]))];
                    }
                    
                    // Check if it's a service or component
                    if (path.includes('/services/')) {
                        info.type = 'service';
                    } else if (path.includes('/components/')) {
                        info.type = 'component';
                    }
                    
                    return {
                        success: true,
                        component: info
                    };
                } catch (error) {
                    // Continue to next possible path
                }
            }
            
            return {
                success: false,
                error: `Component '${name}' not found in standard locations`
            };
        } catch (error) {
            console.error('[MCPIntrospectionService] Error getting component info:', error);
            return {
                success: false,
                error: error.message || 'Failed to get component info'
            };
        }
    }
    
    /**
     * Get architecture overview of the hacka.re application
     * @returns {Object} Architecture information
     */
    async function getArchitectureOverview() {
        try {
            const architecture = {
                overview: 'hacka.re is a privacy-first, serverless chat interface for OpenAI-compatible APIs',
                structure: {
                    services: {
                        count: knownFiles.filter(f => f.includes('/services/')).length,
                        description: 'Business logic and data management',
                        categories: [
                            'API Services (api-*.js)',
                            'Storage Services (storage-*, encryption-*)',
                            'Function Tools System (function-tools-*.js)',
                            'MCP Services (mcp-*.js)',
                            'Agent Services (agent-*.js)',
                            'Chat Services (chat-*.js)',
                            'RAG Services (rag-*.js, vector-*.js)'
                        ]
                    },
                    components: {
                        count: knownFiles.filter(f => f.includes('/components/')).length,
                        description: 'UI components and user interaction handlers',
                        categories: [
                            'Function Calling Components',
                            'Settings Components',
                            'MCP Components',
                            'RAG Components',
                            'UI Components',
                            'Prompts Components',
                            'Share Components'
                        ]
                    },
                    utils: {
                        count: knownFiles.filter(f => f.includes('/utils/')).length,
                        description: 'Utility functions and helpers'
                    },
                    defaultContent: {
                        prompts: knownFiles.filter(f => f.includes('/default-prompts/')).length,
                        functions: knownFiles.filter(f => f.includes('/default-functions/')).length,
                        description: 'Pre-built prompts and functions'
                    }
                },
                dataFlow: [
                    'User Input → UI Component → Service Layer → Encryption → Storage',
                    'API Calls: Service → Request Builder → API → Response Parser → UI'
                ],
                keyFeatures: [
                    'Pure client-side application (no backend)',
                    'Modular component-based architecture',
                    'Event-driven UI with vanilla JavaScript',
                    'Encrypted storage using TweetNaCl',
                    'Direct API communication (no proxy)',
                    'Function calling system with sandboxed execution',
                    'MCP (Model Context Protocol) integration',
                    'RAG (Retrieval-Augmented Generation) support'
                ],
                entryPoints: {
                    main: 'index.html',
                    initialization: 'js/app.js',
                    chatManager: 'js/components/chat-manager.js',
                    settingsCoordinator: 'js/components/settings/settings-coordinator.js'
                }
            };
            
            return {
                success: true,
                architecture: architecture
            };
        } catch (error) {
            console.error('[MCPIntrospectionService] Error getting architecture:', error);
            return {
                success: false,
                error: error.message || 'Failed to get architecture overview'
            };
        }
    }
    
    /**
     * Get MCP tool definitions for Introspection functionality
     */
    function getToolDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'introspection_read_file',
                    description: 'Read any source file from the hacka.re project via HTTP request. Use this to examine code, styles, or HTML structure.\n\nExamples:\n- "Show me the chat-manager.js file"\n- "Read the main styles.css"\n- "What\'s in index.html?"',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Relative path to the file (e.g., "js/services/api-service.js", "css/styles.css", "index.html")'
                            }
                        },
                        required: ['path']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'introspection_find_definition',
                    description: 'Find where a function, class, component, or service is defined in the codebase.\n\nExamples:\n- "Find the ChatManager component"\n- "Where is the encrypt function defined?"\n- "Show me the ApiService class"',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Name of the function, class, component, or service to find'
                            },
                            type: {
                                type: 'string',
                                enum: ['function', 'class', 'component', 'service', 'any'],
                                description: 'Type of definition to search for (default: "any")'
                            }
                        },
                        required: ['name']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'introspection_search_pattern',
                    description: 'Search for a pattern or text across the codebase.\n\nExamples:\n- "Search for localStorage usage"\n- "Find all references to encryption"\n- "Where is addEventListener used?"',
                    parameters: {
                        type: 'object',
                        properties: {
                            pattern: {
                                type: 'string',
                                description: 'Pattern or text to search for (supports regex)'
                            },
                            fileFilter: {
                                type: 'string',
                                description: 'File filter pattern (e.g., "*.js", "*.css", default: "*.js")'
                            },
                            caseSensitive: {
                                type: 'boolean',
                                description: 'Whether the search should be case-sensitive (default: false)'
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Maximum number of results to return (default: 50)'
                            }
                        },
                        required: ['pattern']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'introspection_get_component_info',
                    description: 'Get detailed information about a specific component or service, including its methods, dependencies, and purpose.\n\nExamples:\n- "Tell me about the storage-service"\n- "What does chat-manager do?"\n- "Explain the mcp-client-core service"',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Name of the component or service (e.g., "chat-manager", "api-service", "storage-service")'
                            }
                        },
                        required: ['name']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'introspection_get_architecture',
                    description: 'Get a high-level overview of the hacka.re architecture, including component categories, data flow, and key features.\n\nExamples:\n- "Explain the hacka.re architecture"\n- "How is the codebase organized?"\n- "What are the main components?"',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            }
        ];
    }
    
    /**
     * Handle tool calls from MCP clients
     */
    async function handleToolCall(toolName, args = {}) {
        switch (toolName) {
            case 'introspection_read_file':
                return await readFile(args);
                
            case 'introspection_find_definition':
                return await findDefinition(args);
                
            case 'introspection_search_pattern':
                return await searchPattern(args);
                
            case 'introspection_get_component_info':
                return await getComponentInfo(args);
                
            case 'introspection_get_architecture':
                return await getArchitectureOverview();
                
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    
    /**
     * Register Introspection MCP tools with the MCP system
     */
    function registerTools() {
        // Register with MCP tool registry if available
        if (window.MCPToolRegistry?.registerBuiltInTools) {
            const tools = getToolDefinitions();
            window.MCPToolRegistry.registerBuiltInTools('introspection', tools, handleToolCall);
            console.log('[MCPIntrospectionService] Registered Introspection MCP tools');
        }
    }
    
    /**
     * Initialize the service
     */
    function init() {
        // Register tools when MCP system is ready
        if (window.MCPToolRegistry) {
            registerTools();
        } else {
            // Wait for MCP system to be ready
            document.addEventListener('DOMContentLoaded', () => {
                if (window.MCPToolRegistry) {
                    registerTools();
                }
            });
        }
        
        console.log('[MCPIntrospectionService] Initialized with', knownFiles.length, 'known files');
    }
    
    // Public API
    return {
        init,
        readFile,
        findDefinition,
        searchPattern,
        getComponentInfo,
        getArchitectureOverview,
        getToolDefinitions,
        handleToolCall,
        registerTools,
        knownFiles
    };
})();

// Initialize the service
window.MCPIntrospectionService.init();