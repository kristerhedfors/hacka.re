/**
 * MCP Proxy Manager
 * 
 * Handles stdio proxy connections and communication
 */

window.MCPProxyManager = (function() {
    // State
    let proxyConnected = false;
    let currentProxyUrl = 'http://localhost:3001';
    
    // References
    let uiManager = null;
    let notificationHandler = null;
    
    /**
     * Initialize the proxy manager
     * @param {Object} config - Configuration object
     * @param {Object} config.uiManager - UI manager instance
     * @param {Function} config.notificationHandler - Function to show notifications
     */
    function init(config) {
        uiManager = config.uiManager;
        notificationHandler = config.notificationHandler || console.log;
        
        const elements = uiManager.getElements();
        if (elements.testProxyBtn) {
            elements.testProxyBtn.addEventListener('click', testConnection);
        }
        if (elements.proxyUrlInput) {
            elements.proxyUrlInput.addEventListener('change', (e) => {
                currentProxyUrl = e.target.value;
            });
        }
    }
    
    /**
     * Test proxy connection
     */
    async function testConnection() {
        const elements = uiManager.getElements();
        if (!elements.testProxyBtn) return;
        
        elements.testProxyBtn.disabled = true;
        elements.testProxyBtn.innerHTML = 'Testing...';
        uiManager.updateProxyStatus('testing', 'Testing connection...');
        
        try {
            const response = await fetch(`${currentProxyUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('[MCPProxyManager] Test connection response:', data);
                proxyConnected = true;
                
                const serverCount = Array.isArray(data.servers) ? data.servers.length : (data.servers || 0);
                uiManager.updateProxyStatus('connected', `✅ Connected to MCP stdio proxy (${serverCount} servers running)`);
                notificationHandler('Connected to MCP proxy - you can now add server configurations', 'success');
                uiManager.updateServerInstructions(true);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            proxyConnected = false;
            uiManager.updateProxyStatus('disconnected', 'Connection failed');
            notificationHandler(`Proxy connection failed: ${error.message}`, 'error');
        } finally {
            elements.testProxyBtn.disabled = false;
            elements.testProxyBtn.innerHTML = 'Test Connection';
        }
    }
    
    /**
     * Check proxy connection automatically
     * @returns {Promise<boolean>} Connection status
     */
    async function checkConnection() {
        try {
            const response = await fetch(`${currentProxyUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                proxyConnected = true;
                const serverCount = Array.isArray(data.servers) ? data.servers.length : (data.servers || 0);
                uiManager.updateProxyStatus('connected', `✅ Connected to MCP stdio proxy (${serverCount} servers running)`);
                uiManager.updateServerInstructions(true);
                return true;
            } else {
                throw new Error('Not responding');
            }
        } catch (error) {
            proxyConnected = false;
            uiManager.updateProxyStatus('disconnected', 'Not connected to proxy');
            return false;
        }
    }
    
    /**
     * Start a server via the proxy
     * @param {Object} config - Server configuration
     * @param {string} config.name - Server name
     * @param {string} config.command - Command to run
     * @param {Array} config.args - Command arguments
     * @returns {Promise<Object>} Response data
     */
    async function startServer(config) {
        const response = await fetch(`${currentProxyUrl}/mcp/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: config.name,
                command: config.command,
                args: config.args
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start server');
        }
        
        return response.json();
    }
    
    /**
     * Stop a server via the proxy
     * @param {string} serverName - Name of the server to stop
     * @returns {Promise<Object>} Response data
     */
    async function stopServer(serverName) {
        const response = await fetch(`${currentProxyUrl}/mcp/stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: serverName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to stop server');
        }
        
        return response.json();
    }
    
    /**
     * Get list of servers from proxy
     * @returns {Promise<Array>} List of servers
     */
    async function listServers() {
        const response = await fetch(`${currentProxyUrl}/mcp/list`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch server list');
        }
        
        const data = await response.json();
        return data.servers || [];
    }
    
    /**
     * Get proxy connection status
     * @returns {boolean} Connection status
     */
    function isConnected() {
        return proxyConnected;
    }
    
    /**
     * Get current proxy URL
     * @returns {string} Proxy URL
     */
    function getProxyUrl() {
        return currentProxyUrl;
    }
    
    /**
     * Set proxy URL
     * @param {string} url - New proxy URL
     */
    function setProxyUrl(url) {
        currentProxyUrl = url;
        const elements = uiManager.getElements();
        if (elements.proxyUrlInput) {
            elements.proxyUrlInput.value = url;
        }
    }
    
    // Public API
    return {
        init,
        testConnection,
        checkConnection,
        startServer,
        stopServer,
        listServers,
        isConnected,
        getProxyUrl,
        setProxyUrl
    };
})();