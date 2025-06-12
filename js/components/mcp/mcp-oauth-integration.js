/**
 * MCP OAuth Integration Module
 * 
 * Integrates OAuth functionality into the MCP UI,
 * handling transport type selection and OAuth configuration
 */

window.MCPOAuthIntegration = (function() {
    let oauthConfig = null;
    let oauthFlow = null;
    let originalConnectToServer = null;
    let originalHandleFormSubmission = null;
    
    /**
     * Initialize OAuth integration
     */
    function init() {
        // Get OAuth components
        oauthConfig = window.mcpOAuthConfig;
        oauthFlow = window.mcpOAuthFlow;
        
        if (!oauthConfig || !oauthFlow) {
            console.warn('[MCPOAuthIntegration] OAuth components not available');
            return false;
        }
        
        // Setup transport type selector
        setupTransportTypeSelector();
        
        // Setup OAuth config button
        setupOAuthConfigButton();
        
        // Extend server connection logic
        extendServerConnection();
        
        console.log('[MCPOAuthIntegration] Initialized');
        return true;
    }
    
    /**
     * Setup transport type selector to show/hide relevant fields
     */
    function setupTransportTypeSelector() {
        const transportSelect = document.getElementById('mcp-transport-type');
        if (!transportSelect) {
            console.warn('[MCPOAuthIntegration] Transport type selector not found');
            return;
        }
        
        transportSelect.addEventListener('change', function(e) {
            updateFormVisibility(e.target.value);
        });
        
        // Set initial visibility
        updateFormVisibility(transportSelect.value);
    }
    
    /**
     * Update form field visibility based on transport type
     * @param {string} transportType - Selected transport type
     */
    function updateFormVisibility(transportType) {
        const form = document.getElementById('mcp-server-form');
        if (!form) return;
        
        // Hide all transport-specific fields
        const allTransportFields = form.querySelectorAll('.transport-stdio, .transport-sse, .transport-oauth');
        allTransportFields.forEach(field => field.style.display = 'none');
        
        // Show relevant fields
        const relevantFields = form.querySelectorAll(`.transport-${transportType}`);
        relevantFields.forEach(field => field.style.display = 'block');
        
        // Update required attributes
        const commandInput = document.getElementById('mcp-server-command');
        const urlInput = document.getElementById('mcp-server-url');
        
        if (transportType === 'stdio') {
            commandInput?.setAttribute('required', 'required');
            urlInput?.removeAttribute('required');
        } else {
            commandInput?.removeAttribute('required');
            urlInput?.setAttribute('required', 'required');
        }
        
        // Show/hide OAuth sections
        const oauthSection = document.getElementById('mcp-oauth-section');
        const oauthStatusSection = document.getElementById('mcp-oauth-status-section');
        
        if (transportType === 'oauth') {
            // Check if we need to show config or status
            const serverName = document.getElementById('mcp-server-name').value;
            if (serverName && oauthConfig.hasConfiguration(serverName)) {
                oauthStatusSection.style.display = 'block';
                oauthFlow.createStatusUI(oauthStatusSection, serverName);
            } else {
                oauthSection.style.display = 'block';
            }
        } else {
            oauthSection.style.display = 'none';
            oauthStatusSection.style.display = 'none';
        }
    }
    
    /**
     * Setup OAuth configuration button
     */
    function setupOAuthConfigButton() {
        const configButton = document.getElementById('mcp-oauth-config-btn');
        if (!configButton) return;
        
        configButton.addEventListener('click', function() {
            const serverName = document.getElementById('mcp-server-name').value;
            if (!serverName) {
                alert('Please enter a server name first');
                return;
            }
            
            const oauthSection = document.getElementById('mcp-oauth-section');
            if (oauthSection) {
                oauthSection.style.display = 'block';
                oauthConfig.createConfigUI(oauthSection, serverName);
                
                // Set callback for successful auth
                oauthConfig.onAuthSuccess = function(authServerName) {
                    if (authServerName === serverName) {
                        // Update to show status instead of config
                        oauthSection.style.display = 'none';
                        const statusSection = document.getElementById('mcp-oauth-status-section');
                        statusSection.style.display = 'block';
                        oauthFlow.createStatusUI(statusSection, serverName);
                    }
                };
            }
        });
    }
    
    /**
     * Extend server connection to support OAuth transport
     */
    function extendServerConnection() {
        // Override MCPServerManager.connectToServer if available
        if (window.MCPServerManager && window.MCPServerManager.connectToServer) {
            originalConnectToServer = window.MCPServerManager.connectToServer;
            window.MCPServerManager.connectToServer = connectToServerWithOAuth;
        }
        
        // Override form submission handling
        const form = document.getElementById('mcp-server-form');
        if (form) {
            // Remove existing listeners and add our own
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            newForm.addEventListener('submit', handleFormSubmissionWithOAuth);
        }
    }
    
    /**
     * Handle form submission with OAuth support
     * @param {Event} e - Form submit event
     */
    async function handleFormSubmissionWithOAuth(e) {
        e.preventDefault();
        
        const serverName = document.getElementById('mcp-server-name').value.trim();
        const transportType = document.getElementById('mcp-transport-type').value;
        const description = document.getElementById('mcp-server-description').value.trim();
        
        if (!serverName) {
            alert('Please enter a server name');
            return;
        }
        
        let config = {
            name: serverName,
            description: description,
            transport: { type: transportType }
        };
        
        // Build transport configuration based on type
        switch (transportType) {
            case 'stdio':
                const command = document.getElementById('mcp-server-command').value.trim();
                if (!command) {
                    alert('Please enter a command for stdio transport');
                    return;
                }
                
                // Parse command into command and args
                const commandParts = command.split(/\s+/).filter(part => part);
                config.transport.command = commandParts[0];
                config.transport.args = commandParts.slice(1);
                config.transport.proxyUrl = window.MCPProxyManager?.getProxyUrl() || 'http://localhost:3001';
                break;
                
            case 'sse':
            case 'oauth':
                const url = document.getElementById('mcp-server-url').value.trim();
                if (!url) {
                    alert('Please enter a server URL');
                    return;
                }
                config.transport.url = url;
                
                if (transportType === 'oauth') {
                    // Check if OAuth is configured
                    if (!oauthConfig.hasConfiguration(serverName)) {
                        alert('Please configure OAuth settings first');
                        const oauthSection = document.getElementById('mcp-oauth-section');
                        oauthSection.style.display = 'block';
                        oauthConfig.createConfigUI(oauthSection, serverName);
                        return;
                    }
                    
                    // Check if we have a valid token
                    const oauthService = new window.MCPOAuthService.OAuthService();
                    try {
                        await oauthService.getAccessToken(serverName, false);
                    } catch (error) {
                        alert('OAuth authentication required. Please authorize first.');
                        oauthFlow.startAuthorization(serverName);
                        return;
                    }
                }
                break;
        }
        
        // Connect to the server
        try {
            const MCPClient = window.MCPClientService;
            if (!MCPClient) {
                throw new Error('MCP Client Service not available');
            }
            
            await MCPClient.connect(serverName, config, {
                onNotification: (notification) => {
                    console.log(`[MCP] Notification from ${serverName}:`, notification);
                }
            });
            
            const connectionInfo = MCPClient.getConnectionInfo(serverName);
            if (connectionInfo && connectionInfo.tools) {
                alert(`✅ Connected to ${serverName} - loaded ${connectionInfo.tools.length} tools`);
            }
            
            // Update UI
            if (window.MCPServerManager) {
                window.MCPServerManager.updateServersList();
            }
            
            // Clear form
            document.getElementById('mcp-server-form').reset();
            document.getElementById('mcp-oauth-section').style.display = 'none';
            document.getElementById('mcp-oauth-status-section').style.display = 'none';
            
        } catch (error) {
            console.error('Failed to connect:', error);
            alert(`Failed to connect to ${serverName}: ${error.message}`);
        }
    }
    
    /**
     * Extended connectToServer function with OAuth support
     * @param {string} serverName - Server name
     */
    async function connectToServerWithOAuth(serverName) {
        // Get server configuration
        const servers = await window.MCPProxyManager?.listServers() || [];
        const server = servers.find(s => s.name === serverName);
        
        if (server && server.transport && server.transport.type === 'oauth') {
            // Check OAuth status
            const oauthService = new window.MCPOAuthService.OAuthService();
            try {
                await oauthService.getAccessToken(serverName, false);
            } catch (error) {
                alert('OAuth authentication required. Please authorize first.');
                oauthFlow.startAuthorization(serverName);
                return;
            }
        }
        
        // Call original function
        if (originalConnectToServer) {
            return originalConnectToServer.call(window.MCPServerManager, serverName);
        }
    }
    
    // Public API
    return {
        init: init,
        updateFormVisibility: updateFormVisibility
    };
})();

// Note: Initialization is handled by MCPManager to ensure proper dependency order