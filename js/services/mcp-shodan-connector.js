/**
 * Shodan Service Connector for MCP
 * Extends BaseServiceConnector with Shodan-specific functionality
 */

(function(global) {
    'use strict';

    class ShodanConnector extends global.BaseServiceConnector {
        constructor() {
            super('shodan', {
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
                tools: ShodanConnector.getShodanTools()
            });
        }

        /**
         * Define Shodan tools
         */
        static getShodanTools() {
            return {
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
            };
        }

        /**
         * Connect to Shodan using API key
         */
        async connect() {
            // First try to load existing connection
            await this.loadConnection();
            
            // Check for invalid cached connection (boolean apiKey from testing)
            if (this.connection && typeof this.connection.apiKey === 'boolean') {
                console.log(`[ShodanConnector] Clearing invalid cached connection`);
                await this.clearConnection();
            }
            
            if (this.isConnected()) {
                console.log(`[ShodanConnector] Using loaded connection with ${Object.keys(this.getToolsToRegister()).length} tools`);
                return true;
            }

            // Check for existing API key
            const storageKey = this.getStorageKey('api_key');
            const existingKey = await this.storage.getValue(storageKey);

            if (existingKey) {
                const isValid = await this.validateApiKey(existingKey);
                if (isValid) {
                    console.log(`[ShodanConnector] Using existing API key`);
                    await this.createConnection(existingKey);
                    return true;
                }
            }

            // No valid API key found - show UI to get one
            if (window.mcpServiceUIHelper) {
                const apiKey = await window.mcpServiceUIHelper.showAPIKeyInputDialog('shodan', this.config);
                if (apiKey) {
                    await this.createConnection(apiKey);
                    return true;
                }
            }

            return false;
        }

        /**
         * Check if credentials are valid
         */
        hasValidCredentials() {
            if (!this.connection) {
                return false;
            }
            
            return !!(this.connection.apiKey && this.connection.apiKey.length > 0);
        }

        /**
         * Create connection with API key
         */
        async createConnection(apiKey) {
            const connectionData = {
                type: 'shodan',
                apiKey: apiKey,
                connectedAt: Date.now(),
                lastValidated: Date.now()
            };

            await this.storeConnection(connectionData);
            
            // Store API key separately for compatibility
            const keyStorage = this.getStorageKey('api_key');
            await this.storage.setValue(keyStorage, apiKey);
            
            // Register tools
            await this.registerTools(apiKey);
            
            console.log(`[ShodanConnector] Connected successfully`);
            return true;
        }

        /**
         * Validate Shodan API key
         */
        async validateApiKey(apiKey) {
            try {
                const url = `${this.config.apiBaseUrl}/api-info?key=${encodeURIComponent(apiKey)}`;
                const response = await fetch(url);
                return response.ok;
            } catch (error) {
                console.error('[ShodanConnector] API key validation failed:', error);
                return false;
            }
        }

        /**
         * Execute Shodan tool
         */
        async executeTool(toolName, params) {
            if (!this.connection || !this.connection.apiKey) {
                throw new Error('Shodan not connected');
            }

            const apiKey = this.connection.apiKey;
            let url, method = 'GET', body = null;

            // Remove shodan_ prefix if present
            const baseTool = toolName.replace('shodan_', '');

            switch (baseTool) {
                case 'host_info':
                    this.validateIP(params.ip);
                    url = `${this.config.apiBaseUrl}/shodan/host/${params.ip}?key=${encodeURIComponent(apiKey)}`;
                    if (params.history) url += '&history=true';
                    if (params.minify) url += '&minify=true';
                    break;

                case 'search':
                    if (!params.query) throw new Error('Search query is required');
                    url = `${this.config.apiBaseUrl}/shodan/host/search?key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(params.query)}`;
                    if (params.facets) url += `&facets=${encodeURIComponent(params.facets)}`;
                    if (params.page) url += `&page=${params.page}`;
                    if (params.minify) url += '&minify=true';
                    break;

                case 'search_count':
                    if (!params.query) throw new Error('Search query is required');
                    url = `${this.config.apiBaseUrl}/shodan/host/count?key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(params.query)}`;
                    if (params.facets) url += `&facets=${encodeURIComponent(params.facets)}`;
                    break;

                case 'search_facets':
                    url = `${this.config.apiBaseUrl}/shodan/host/search/facets?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'search_filters':
                    url = `${this.config.apiBaseUrl}/shodan/host/search/filters?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'search_tokens':
                    if (!params.query) throw new Error('Search query is required');
                    url = `${this.config.apiBaseUrl}/shodan/host/search/tokens?key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(params.query)}`;
                    break;

                case 'dns_domain':
                    if (!params.domain) throw new Error('Domain is required');
                    url = `${this.config.apiBaseUrl}/dns/domain/${encodeURIComponent(params.domain)}?key=${encodeURIComponent(apiKey)}`;
                    if (params.history) url += '&history=true';
                    if (params.type) url += `&type=${params.type}`;
                    if (params.page) url += `&page=${params.page}`;
                    break;

                case 'dns_resolve':
                    if (!params.hostnames) throw new Error('Hostnames are required');
                    url = `${this.config.apiBaseUrl}/dns/resolve?key=${encodeURIComponent(apiKey)}&hostnames=${encodeURIComponent(params.hostnames)}`;
                    break;

                case 'dns_reverse':
                    if (!params.ips) throw new Error('IP addresses are required');
                    url = `${this.config.apiBaseUrl}/dns/reverse?key=${encodeURIComponent(apiKey)}&ips=${encodeURIComponent(params.ips)}`;
                    break;

                case 'scan':
                    if (!params.ips) throw new Error('IP addresses are required for scanning');
                    url = `${this.config.apiBaseUrl}/shodan/scan?key=${encodeURIComponent(apiKey)}`;
                    method = 'POST';
                    body = new URLSearchParams({
                        ips: params.ips,
                        force: params.force || false
                    });
                    break;

                case 'scan_protocols':
                    url = `${this.config.apiBaseUrl}/shodan/protocols?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'account_profile':
                    url = `${this.config.apiBaseUrl}/account/profile?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'api_info':
                    url = `${this.config.apiBaseUrl}/api-info?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'tools_myip':
                    url = `${this.config.apiBaseUrl}/tools/myip?key=${encodeURIComponent(apiKey)}`;
                    break;

                case 'labs_honeyscore':
                    this.validateIP(params.ip);
                    url = `${this.config.apiBaseUrl}/labs/honeyscore/${encodeURIComponent(params.ip)}?key=${encodeURIComponent(apiKey)}`;
                    break;

                default:
                    throw new Error(`Unknown Shodan tool: ${toolName}`);
            }

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

            try {
                const response = await this.makeApiRequest(url, requestOptions);
                return this.formatResponse(baseTool, response, params);
            } catch (error) {
                // Enhanced error handling for Shodan-specific errors
                if (error.message.includes('401')) {
                    throw new Error('Invalid Shodan API key. Please check your API key.');
                } else if (error.message.includes('402')) {
                    throw new Error('Insufficient credits or plan limitations. Some features require a paid Shodan account.');
                } else if (error.message.includes('403')) {
                    throw new Error('Access forbidden. Check your API key permissions.');
                } else if (error.message.includes('429')) {
                    throw new Error('Shodan API rate limit exceeded. Please try again later.');
                }
                throw error;
            }
        }

        /**
         * Validate IP address format
         */
        validateIP(ip) {
            if (!ip) {
                throw new Error('IP address is required');
            }
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(ip)) {
                throw new Error('Invalid IP address format. Please provide a valid IPv4 address.');
            }
        }

        /**
         * Format Shodan response for better readability
         */
        formatResponse(toolName, data, params) {
            switch (toolName) {
                case 'host_info':
                    return this.formatHostInfo(data, params.ip);
                
                case 'search':
                    return this.formatSearchResults(data);
                
                case 'search_count':
                    return {
                        query: params.query,
                        total_results: data.total,
                        credits_consumed: data.credits || 'Unknown',
                        facets: data.facets || {}
                    };
                
                case 'search_facets':
                    return {
                        available_facets: data,
                        description: 'Available facets for Shodan search queries'
                    };
                
                case 'search_filters':
                    return {
                        available_filters: data,
                        description: 'Available filters for Shodan search queries'
                    };
                
                case 'search_tokens':
                    return {
                        query: params.query,
                        tokens: data.attributes || data,
                        description: 'Query breakdown and parsing'
                    };
                
                case 'dns_domain':
                    return this.formatDomainInfo(data, params.domain);
                
                case 'dns_resolve':
                case 'dns_reverse':
                    return {
                        query: params.hostnames || params.ips,
                        results: data,
                        resolved_count: Object.keys(data).length
                    };
                
                case 'scan':
                    return {
                        scan_id: data.id,
                        credits_left: data.credits_left,
                        status: 'Scan submitted successfully',
                        ips_scanned: params.ips
                    };
                
                case 'scan_protocols':
                    return {
                        protocols: data,
                        description: 'List of protocols that Shodan crawls'
                    };
                
                case 'account_profile':
                    return {
                        username: data.username || data.display_name,
                        email: data.email,
                        member_since: data.created,
                        credits: data.credits,
                        upgrade_type: data.upgrade_type || 'Free',
                        total_usage: data.usage || {}
                    };
                
                case 'api_info':
                    return {
                        plan: data.plan,
                        usage: {
                            query_credits: data.query_credits,
                            scan_credits: data.scan_credits,
                            monitored_ips: data.monitored_ips
                        },
                        unlocked_features: data.unlocked || []
                    };
                
                case 'tools_myip':
                    return {
                        external_ip: data.ip || data,
                        source: 'Shodan'
                    };
                
                case 'labs_honeyscore':
                    return {
                        ip: params.ip,
                        honeypot_probability: data,
                        risk_level: data > 0.7 ? 'High' : data > 0.4 ? 'Medium' : 'Low',
                        description: `${Math.round(data * 100)}% chance this IP is a honeypot`
                    };
                
                default:
                    return data;
            }
        }

        /**
         * Format host information
         */
        formatHostInfo(data, ip) {
            const result = {
                ip: ip,
                basic_info: {}
            };

            if (data.org) result.basic_info.organization = data.org;
            if (data.isp) result.basic_info.isp = data.isp;
            if (data.country_name) result.basic_info.country = data.country_name;
            if (data.city) result.basic_info.city = data.city;
            if (data.region_code) result.basic_info.region = data.region_code;
            if (data.os) result.basic_info.operating_system = data.os;

            if (data.data && data.data.length > 0) {
                result.services = data.data.slice(0, 15).map(service => ({
                    port: service.port,
                    transport: service.transport,
                    product: service.product,
                    version: service.version,
                    banner: service.data ? service.data.substring(0, 200) : null,
                    timestamp: service.timestamp
                }));
                result.total_services = data.data.length;
            }

            if (data.vulns && data.vulns.length > 0) {
                result.vulnerabilities = data.vulns.slice(0, 10);
                result.total_vulnerabilities = data.vulns.length;
            }

            if (data.hostnames && data.hostnames.length > 0) {
                result.hostnames = data.hostnames;
            }

            return result;
        }

        /**
         * Format search results
         */
        formatSearchResults(data) {
            const result = {
                total_results: data.total,
                page_size: data.matches ? data.matches.length : 0,
                results: []
            };

            if (data.matches) {
                result.results = data.matches.slice(0, 20).map(match => ({
                    ip: match.ip_str,
                    port: match.port,
                    organization: match.org,
                    location: {
                        country: match.location?.country_name,
                        city: match.location?.city
                    },
                    os: match.os,
                    product: match.product,
                    hostnames: match.hostnames || [],
                    timestamp: match.timestamp
                }));
            }

            if (data.facets) {
                result.facets = data.facets;
            }

            return result;
        }

        /**
         * Format domain information
         */
        formatDomainInfo(data, domain) {
            return {
                domain: domain,
                subdomains: data.subdomains || [],
                subdomain_count: data.subdomains ? data.subdomains.length : 0,
                dns_records: data.data || [],
                record_count: data.data ? data.data.length : 0,
                tags: data.tags || []
            };
        }

        /**
         * Validate connection
         */
        async validate() {
            if (!this.connection || !this.connection.apiKey) {
                return false;
            }

            const isValid = await this.validateApiKey(this.connection.apiKey);
            
            if (isValid) {
                this.connection.lastValidated = Date.now();
                await this.storeConnection(this.connection);
            }

            return isValid;
        }
    }

    // Export to global scope
    global.ShodanConnector = ShodanConnector;

})(window);