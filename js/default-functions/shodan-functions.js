/**
 * Shodan API Functions
 * Complete set of JavaScript functions for interacting with Shodan API
 * These functions directly make API calls and can be used independently
 */

window.ShodanFunctions = {
    id: 'shodan-functions',
    name: 'Shodan Functions',
    description: 'Complete Shodan API integration - search devices, DNS lookups, scanning, honeypot detection, and more',
    groupId: 'shodan-functions-group',
    functions: [
        // Host Information
        {
            name: 'shodan_host_info',
            code: `/**
 * Get detailed host information
 * @description Get comprehensive information about an IP address including services, vulnerabilities, and location
 * @param {string} ip - IP address to look up
 * @param {boolean} history - Include historical banners (default: false)
 * @param {boolean} minify - Minify banner data (default: true)
 * @returns {Promise<Object>} Detailed host information
 * @callable
 */
async function shodan_host_info(ip, history = false, minify = true) {
    try {
        // Validate IP address format
        const ipRegex = /^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$/;
        if (!ipRegex.test(ip)) {
            return {
                error: "Invalid IP address format",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = new URL(\`https://api.shodan.io/shodan/host/\${ip}\`);
        url.searchParams.append('key', apiKey);
        if (history) {
            url.searchParams.append('history', 'true');
        }
        if (minify) {
            url.searchParams.append('minify', 'true');
        }
        
        // Make API request
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            ip: data.ip_str,
            organization: data.org,
            operating_system: data.os,
            hostnames: data.hostnames,
            domains: data.domains,
            country: data.country_name,
            city: data.city,
            location: {
                latitude: data.latitude,
                longitude: data.longitude,
                area_code: data.area_code,
                dma_code: data.dma_code,
                postal_code: data.postal_code,
                region_code: data.region_code
            },
            ports: data.ports,
            vulnerabilities: data.vulns,
            tags: data.tags,
            services: data.data ? data.data.map(service => ({
                port: service.port,
                transport: service.transport,
                product: service.product,
                version: service.version,
                service: service._shodan?.module,
                timestamp: service.timestamp,
                banner: minify ? null : service.data,
                ssl: service.ssl,
                http: service.http
            })) : [],
            last_update: data.last_update
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
            name: 'shodan_search',
            code: `/**
 * Search Shodan database
 * @description Search for devices using Shodan query syntax
 * @param {string} query - Search query (e.g., "apache", "port:22", "country:US")
 * @param {string} facets - Comma-separated list of facets (e.g., "country,port,org")
 * @param {number} page - Page number for results (default: 1)
 * @param {boolean} minify - Minify results (default: false)
 * @returns {Promise<Object>} Search results with device information
 * @callable
 */
async function shodan_search(query, facets = '', page = 1, minify = false) {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = new URL('https://api.shodan.io/shodan/host/search');
        url.searchParams.append('key', apiKey);
        url.searchParams.append('query', query);
        url.searchParams.append('page', page);
        if (facets) {
            url.searchParams.append('facets', facets);
        }
        if (minify) {
            url.searchParams.append('minify', 'true');
        }
        
        // Make API request
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            total: data.total,
            matches: data.matches ? data.matches.map(match => ({
                ip: match.ip_str,
                port: match.port,
                organization: match.org,
                location: {
                    country: match.location?.country_name,
                    city: match.location?.city,
                    latitude: match.location?.latitude,
                    longitude: match.location?.longitude
                },
                hostnames: match.hostnames,
                domains: match.domains,
                os: match.os,
                timestamp: match.timestamp,
                product: match.product,
                version: match.version,
                data: minify ? null : (match.data ? match.data.substring(0, 500) : null),
                vulnerabilities: match.vulns
            })) : [],
            facets: data.facets
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
            name: 'shodan_search_count',
            code: `/**
 * Get search result count
 * @description Get the number of results for a search query without returning actual results
 * @param {string} query - Search query
 * @param {string} facets - Comma-separated list of facets
 * @returns {Promise<Object>} Result count and facet information
 * @callable
 */
async function shodan_search_count(query, facets = '') {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = new URL('https://api.shodan.io/shodan/host/count');
        url.searchParams.append('key', apiKey);
        url.searchParams.append('query', query);
        if (facets) {
            url.searchParams.append('facets', facets);
        }
        
        // Make API request
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            total: data.total,
            facets: data.facets,
            message: \`Found \${data.total} results for query: "\${query}"\`
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
            name: 'shodan_search_facets',
            code: `/**
 * List available search facets
 * @description Get a list of available search facets that can be used in queries
 * @returns {Promise<Object>} List of available facets
 * @callable
 */
async function shodan_search_facets() {
    try {
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/shodan/host/search/facets?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            facets: data,
            common_facets: [
                'country', 'city', 'org', 'isp', 'port', 'asn',
                'ssl.version', 'product', 'os', 'vuln', 'link',
                'hash', 'transport', 'domain', 'timestamp'
            ],
            message: "Use these facets to get aggregated data in search results"
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
            name: 'shodan_search_filters',
            code: `/**
 * List available search filters
 * @description Get a list of available search filters and their descriptions
 * @returns {Promise<Object>} List of search filters
 * @callable
 */
async function shodan_search_filters() {
    try {
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/shodan/host/search/filters?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            filters: data,
            common_filters: {
                'port': 'Search by port number (e.g., port:80)',
                'country': 'Search by country code (e.g., country:US)',
                'city': 'Search by city name (e.g., city:"San Francisco")',
                'org': 'Search by organization (e.g., org:Microsoft)',
                'hostname': 'Search by hostname (e.g., hostname:google.com)',
                'net': 'Search by network range (e.g., net:8.8.8.0/24)',
                'os': 'Search by operating system (e.g., os:Windows)',
                'product': 'Search by product name (e.g., product:Apache)',
                'version': 'Search by version (e.g., version:2.4.41)',
                'vuln': 'Search for vulnerabilities (e.g., vuln:CVE-2014-0160)',
                'has_ssl': 'Has SSL/TLS (e.g., has_ssl:true)',
                'has_screenshot': 'Has screenshot available',
                'geo': 'Search by coordinates (e.g., geo:37.7749,-122.4194)'
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
            name: 'shodan_search_tokens',
            code: `/**
 * Parse search query tokens
 * @description Break down a search query into tokens and show how Shodan parses it
 * @param {string} query - Search query to tokenize
 * @returns {Promise<Object>} Parsed query tokens
 * @callable
 */
async function shodan_search_tokens(query) {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = new URL('https://api.shodan.io/shodan/host/search/tokens');
        url.searchParams.append('key', apiKey);
        url.searchParams.append('query', query);
        
        // Make API request
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            original_query: query,
            tokens: data.attributes || data,
            filters: data.filters || [],
            message: "This shows how Shodan interprets your search query"
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // DNS Functions
        {
            name: 'shodan_dns_domain',
            code: `/**
 * Get domain information
 * @description Get information about a domain including subdomains and DNS records
 * @param {string} domain - Domain name (e.g., "google.com")
 * @param {boolean} history - Include historical DNS data
 * @param {string} type - DNS record type filter (A, AAAA, CNAME, NS, MX, TXT)
 * @param {number} page - Page number for results
 * @returns {Promise<Object>} Domain information and DNS records
 * @callable
 */
async function shodan_dns_domain(domain, history = false, type = '', page = 1) {
    try {
        if (!domain) {
            return {
                error: "Domain parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = new URL(\`https://api.shodan.io/dns/domain/\${domain}\`);
        url.searchParams.append('key', apiKey);
        if (history) url.searchParams.append('history', 'true');
        if (type) url.searchParams.append('type', type);
        url.searchParams.append('page', page);
        
        // Make API request
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            domain: domain,
            subdomains: data.subdomains || [],
            records: data.data || [],
            tags: data.tags || [],
            total: data.total || 0,
            more: data.more || false
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
            name: 'shodan_dns_resolve',
            code: `/**
 * Resolve hostnames to IPs
 * @description Resolve one or more hostnames to their IP addresses
 * @param {string} hostnames - Comma-separated list of hostnames
 * @returns {Promise<Object>} Mapping of hostnames to IP addresses
 * @callable
 */
async function shodan_dns_resolve(hostnames) {
    try {
        if (!hostnames) {
            return {
                error: "Hostnames parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = \`https://api.shodan.io/dns/resolve?hostnames=\${encodeURIComponent(hostnames)}&key=\${apiKey}\`;
        
        // Make API request
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            resolutions: data,
            count: Object.keys(data).length,
            message: \`Resolved \${Object.keys(data).length} hostname(s)\`
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
            name: 'shodan_dns_reverse',
            code: `/**
 * Reverse DNS lookup
 * @description Resolve IP addresses to their hostnames
 * @param {string} ips - Comma-separated list of IP addresses
 * @returns {Promise<Object>} Mapping of IP addresses to hostnames
 * @callable
 */
async function shodan_dns_reverse(ips) {
    try {
        if (!ips) {
            return {
                error: "IPs parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = \`https://api.shodan.io/dns/reverse?ips=\${encodeURIComponent(ips)}&key=\${apiKey}\`;
        
        // Make API request
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            resolutions: data,
            count: Object.keys(data).length,
            message: \`Found hostnames for \${Object.keys(data).filter(ip => data[ip] && data[ip].length > 0).length} IP(s)\`
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Scanning Functions
        {
            name: 'shodan_scan',
            code: `/**
 * Request network scan
 * @description Request Shodan to crawl network blocks or IP addresses (requires paid plan)
 * @param {string} ips - Comma-separated list of IPs or CIDR blocks to scan
 * @param {boolean} force - Force re-scan of IP addresses
 * @returns {Promise<Object>} Scan request information
 * @callable
 */
async function shodan_scan(ips, force = false) {
    try {
        if (!ips) {
            return {
                error: "IPs parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build request
        const url = 'https://api.shodan.io/shodan/scan';
        const body = new URLSearchParams();
        body.append('ips', ips);
        if (force) body.append('force', 'true');
        
        // Make API request
        const response = await fetch(\`\${url}?key=\${apiKey}\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            id: data.id,
            count: data.count,
            credits_left: data.credits_left,
            message: \`Scan requested for \${data.count} IP(s). Scan ID: \${data.id}\`
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
            name: 'shodan_scan_protocols',
            code: `/**
 * List scan protocols
 * @description Get a list of protocols that Shodan crawls
 * @returns {Promise<Object>} List of protocols and ports
 * @callable
 */
async function shodan_scan_protocols() {
    try {
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/shodan/protocols?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            protocols: data,
            count: Object.keys(data).length,
            message: \`Shodan scans \${Object.keys(data).length} protocols\`
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Account and API Information
        {
            name: 'shodan_account_profile',
            code: `/**
 * Get account profile
 * @description Get account profile information including credits and plan details
 * @returns {Promise<Object>} Account profile information
 * @callable
 */
async function shodan_account_profile() {
    try {
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/account/profile?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            username: data.display_name || data.username,
            email: data.email,
            created: data.created,
            member: data.member,
            credits: data.credits,
            plan: data.plan,
            usage_stats: {
                query_credits: data.usage?.query_credits,
                scan_credits: data.usage?.scan_credits,
                monitored_ips: data.usage?.monitored_ips
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
            name: 'shodan_api_info',
            code: `/**
 * Get API status
 * @description Get API plan information and usage statistics
 * @returns {Promise<Object>} API plan and usage information
 * @callable
 */
async function shodan_api_info() {
    try {
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/api-info?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            plan: data.plan,
            query_credits: data.query_credits,
            scan_credits: data.scan_credits,
            usage_limits: {
                query_credits: data.usage_limits?.query_credits,
                scan_credits: data.usage_limits?.scan_credits,
                monitored_ips: data.usage_limits?.monitored_ips
            },
            unlocked: data.unlocked,
            unlocked_left: data.unlocked_left,
            https: data.https,
            telnet: data.telnet,
            message: \`API Plan: \${data.plan}, Query Credits: \${data.query_credits}, Scan Credits: \${data.scan_credits}\`
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Utility Functions
        {
            name: 'shodan_tools_myip',
            code: `/**
 * Get current IP address
 * @description Get your external IP address as seen by Shodan
 * @returns {Promise<Object>} Current IP address information
 * @callable
 */
async function shodan_tools_myip() {
    try {
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/tools/myip?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const ip = await response.text();
        return {
            success: true,
            ip: ip.trim(),
            message: \`Your current public IP address is: \${ip.trim()}\`
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
            name: 'shodan_labs_honeyscore',
            code: `/**
 * Calculate honeypot probability
 * @description Calculate the probability that an IP address is a honeypot (0.0-1.0)
 * @param {string} ip - IP address to check
 * @returns {Promise<Object>} Honeypot score and analysis
 * @callable
 */
async function shodan_labs_honeyscore(ip) {
    try {
        // Validate IP address format
        const ipRegex = /^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$/;
        if (!ipRegex.test(ip)) {
            return {
                error: "Invalid IP address format",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/labs/honeyscore/\${ip}?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const score = await response.text();
        const scoreFloat = parseFloat(score);
        
        let riskLevel = "Low";
        let recommendation = "Likely a legitimate system";
        
        if (scoreFloat > 0.7) {
            riskLevel = "High";
            recommendation = "High probability of being a honeypot - exercise extreme caution";
        } else if (scoreFloat > 0.4) {
            riskLevel = "Medium";
            recommendation = "Moderate honeypot indicators - proceed with caution";
        } else if (scoreFloat > 0.2) {
            riskLevel = "Low-Medium";
            recommendation = "Some honeypot characteristics detected - verify before interaction";
        }
        
        return {
            success: true,
            ip: ip,
            score: scoreFloat,
            percentage: (scoreFloat * 100).toFixed(1) + '%',
            risk_level: riskLevel,
            recommendation: recommendation,
            message: \`Honeypot score for \${ip}: \${(scoreFloat * 100).toFixed(1)}% (\${riskLevel} risk)\`
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
}`
        },
        // Additional Helper Functions
        {
            name: 'shodan_exploit_search',
            code: `/**
 * Search for exploits
 * @description Search Shodan's exploit database for vulnerabilities
 * @param {string} query - Search query (e.g., "apache", "CVE-2021-44228")
 * @param {string} facets - Comma-separated list of facets
 * @param {number} page - Page number for results
 * @returns {Promise<Object>} Exploit search results
 * @callable
 */
async function shodan_exploit_search(query, facets = '', page = 1) {
    try {
        if (!query) {
            return {
                error: "Query parameter is required",
                success: false
            };
        }
        
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Build API URL
        const url = new URL('https://exploits.shodan.io/api/search');
        url.searchParams.append('key', apiKey);
        url.searchParams.append('query', query);
        url.searchParams.append('page', page);
        if (facets) {
            url.searchParams.append('facets', facets);
        }
        
        // Make API request
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            total: data.total,
            exploits: data.matches ? data.matches.map(exploit => ({
                id: exploit.id || exploit._id,
                cve: exploit.cve || [],
                description: exploit.description,
                source: exploit.source,
                date: exploit.date,
                type: exploit.type,
                platform: exploit.platform,
                port: exploit.port,
                author: exploit.author
            })) : [],
            facets: data.facets
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
            name: 'shodan_ports',
            code: `/**
 * List all ports Shodan monitors
 * @description Get a list of port numbers that Shodan crawls
 * @returns {Promise<Object>} List of monitored ports
 * @callable
 */
async function shodan_ports() {
    try {
        // Get stored Shodan API key
        const encryptedKey = localStorage.getItem('mcp_shodan_apiKey');
        if (!encryptedKey) {
            return {
                error: "Shodan not connected. Please connect Shodan in MCP settings first.",
                success: false
            };
        }
        
        // Decrypt the API key
        const decryptionKey = localStorage.getItem('mcp_shodan_key');
        if (!decryptionKey || !window.EncryptionService) {
            return {
                error: "Unable to access Shodan credentials",
                success: false
            };
        }
        
        const apiKey = await window.EncryptionService.decrypt(encryptedKey, decryptionKey);
        
        // Make API request
        const url = \`https://api.shodan.io/shodan/ports?key=\${apiKey}\`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.text();
            return {
                error: \`Shodan API error: \${response.status} - \${error}\`,
                success: false
            };
        }
        
        const data = await response.json();
        return {
            success: true,
            ports: data,
            count: data.length,
            common_ports: data.slice(0, 20),
            message: \`Shodan monitors \${data.length} ports\`
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