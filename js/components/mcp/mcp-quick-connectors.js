/**
 * MCP Quick Connectors Component
 * 
 * Provides one-button connectors for popular services like GitHub, Gmail, 
 * Google Drive, and Google Calendar with pre-configured OAuth settings
 */

window.MCPQuickConnectors = (function() {
    // Service configurations
    console.log('[MCPQuickConnectors] Current window.location.origin:', window.location.origin);
    const QUICK_CONNECTORS = {
        github: {
            name: 'GitHub',
            icon: 'fab fa-github',
            description: 'Access GitHub repositories, issues, and pull requests',
            transport: 'oauth',
            serverUrl: 'https://api.github.com',
            oauthConfig: {
                provider: 'github',
                authorizationUrl: 'https://github.com/login/oauth/authorize',
                tokenUrl: 'https://github.com/login/oauth/access_token',
                scope: 'repo read:user',
                clientId: '', // User needs to provide
                redirectUri: window.location.origin
            },
            setupInstructions: {
                title: 'GitHub OAuth Setup',
                steps: [
                    'Go to GitHub Settings > Developer settings > OAuth Apps',
                    'Click "New OAuth App"',
                    'Set Application name to: "hacka.re MCP Client" (or your preferred name)',
                    'Set Homepage URL to: ' + window.location.origin,
                    'Set Authorization callback URL to: ' + window.location.origin,
                    'Copy the Client ID and paste it below',
                    'Note: The OAuth flow will redirect back to this page with the authorization code'
                ],
                docUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app'
            }
        },
        gmail: {
            name: 'Gmail',
            icon: 'fas fa-envelope',
            description: 'Read and send emails through Gmail',
            transport: 'oauth',
            serverUrl: 'https://gmail.googleapis.com',
            oauthConfig: {
                provider: 'google',
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
                clientId: '', // User needs to provide
                redirectUri: window.location.origin,
                additionalParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            },
            setupInstructions: {
                title: 'Gmail OAuth Setup',
                steps: [
                    'Go to Google Cloud Console (console.cloud.google.com)',
                    'Create a new project or select existing one',
                    'Enable Gmail API in "APIs & Services" > "Library"',
                    'Go to "APIs & Services" > "Credentials"',
                    'Create OAuth 2.0 Client ID (Web application)',
                    'Add authorized redirect URI: ' + window.location.origin,
                    'Copy the Client ID and paste it below'
                ],
                docUrl: 'https://developers.google.com/gmail/api/auth/web-server'
            }
        },
        drive: {
            name: 'Google Drive',
            icon: 'fab fa-google-drive',
            description: 'Access and manage files in Google Drive',
            transport: 'oauth',
            serverUrl: 'https://www.googleapis.com/drive/v3',
            oauthConfig: {
                provider: 'google',
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
                clientId: '', // User needs to provide
                redirectUri: window.location.origin,
                additionalParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            },
            setupInstructions: {
                title: 'Google Drive OAuth Setup',
                steps: [
                    'Go to Google Cloud Console (console.cloud.google.com)',
                    'Create a new project or select existing one',
                    'Enable Google Drive API in "APIs & Services" > "Library"',
                    'Go to "APIs & Services" > "Credentials"',
                    'Create OAuth 2.0 Client ID (Web application)',
                    'Add authorized redirect URI: ' + window.location.origin,
                    'Copy the Client ID and paste it below'
                ],
                docUrl: 'https://developers.google.com/drive/api/guides/about-auth'
            }
        },
        calendar: {
            name: 'Google Calendar',
            icon: 'fas fa-calendar-alt',
            description: 'Access and manage Google Calendar events',
            transport: 'oauth',
            serverUrl: 'https://www.googleapis.com/calendar/v3',
            oauthConfig: {
                provider: 'google',
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
                clientId: '', // User needs to provide
                redirectUri: window.location.origin,
                additionalParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            },
            setupInstructions: {
                title: 'Google Calendar OAuth Setup',
                steps: [
                    'Go to Google Cloud Console (console.cloud.google.com)',
                    'Create a new project or select existing one',
                    'Enable Google Calendar API in "APIs & Services" > "Library"',
                    'Go to "APIs & Services" > "Credentials"',
                    'Create OAuth 2.0 Client ID (Web application)',
                    'Add authorized redirect URI: ' + window.location.origin,
                    'Copy the Client ID and paste it below'
                ],
                docUrl: 'https://developers.google.com/calendar/api/guides/auth'
            }
        }
    };

    let storageService = null;
    let oauthConfig = null;
    let oauthFlow = null;
    let mcpClient = null;
    
    /**
     * Initialize the quick connectors component
     */
    function init() {
        console.log('[MCPQuickConnectors] Initializing...');
        
        // Get service references
        storageService = window.CoreStorageService;
        oauthConfig = window.mcpOAuthConfig;
        oauthFlow = window.mcpOAuthFlow;
        mcpClient = window.MCPClientService;
        
        console.log('[MCPQuickConnectors] Service availability check:', {
            storageService: !!storageService,
            oauthConfig: !!oauthConfig,
            oauthFlow: !!oauthFlow,
            mcpClient: !!mcpClient
        });
        
        if (!storageService || !oauthConfig) {
            console.warn('[MCPQuickConnectors] Required services not available - storageService:', !!storageService, 'oauthConfig:', !!oauthConfig);
            return false;
        }
        
        // Load saved connector states
        loadConnectorStates();
        
        console.log('[MCPQuickConnectors] Initialized successfully');
        return true;
    }
    
    /**
     * Create quick connectors UI section
     * @param {HTMLElement} container - Container to insert UI into
     */
    function createQuickConnectorsUI(container) {
        console.log('[MCPQuickConnectors] Creating quick connectors UI', container);
        
        const section = document.createElement('div');
        section.className = 'mcp-quick-connectors-section';
        section.innerHTML = `
            <h3>🚀 Quick Connect</h3>
            <p class="form-help">Connect to popular services with one click</p>
            <div class="quick-connectors-grid">
                ${Object.entries(QUICK_CONNECTORS).map(([key, config]) => `
                    <div class="quick-connector-card" data-service="${key}">
                        <div class="connector-icon">
                            <i class="${config.icon}"></i>
                        </div>
                        <div class="connector-info">
                            <h4>${config.name}</h4>
                            <p>${config.description}</p>
                        </div>
                        <div class="connector-status" id="connector-status-${key}">
                            <button class="btn primary-btn connect-btn" onclick="MCPQuickConnectors.connectService('${key}')">
                                Connect
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Find the mcp-servers-container and insert as the first child
        const serversContainer = container.querySelector('.mcp-servers-container');
        console.log('[MCPQuickConnectors] Servers container found:', !!serversContainer);
        
        if (serversContainer) {
            serversContainer.insertBefore(section, serversContainer.firstChild);
            console.log('[MCPQuickConnectors] Quick connectors section inserted into servers container');
        } else {
            // Fallback: append to the container
            container.appendChild(section);
            console.log('[MCPQuickConnectors] Quick connectors section appended to main container');
        }
        
        // Update connector statuses
        updateAllConnectorStatuses();
    }
    
    /**
     * Connect to a service
     * @param {string} serviceKey - Service key (github, gmail, drive, calendar)
     */
    async function connectService(serviceKey) {
        const config = QUICK_CONNECTORS[serviceKey];
        if (!config) {
            console.error(`[MCPQuickConnectors] Unknown service: ${serviceKey}`);
            return;
        }
        
        const serverName = `mcp-${serviceKey}`;
        
        // Check if already connected
        if (mcpClient) {
            const connectionInfo = mcpClient.getConnectionInfo(serverName);
            if (connectionInfo && connectionInfo.connected) {
                if (confirm(`${config.name} is already connected. Do you want to reconnect?`)) {
                    await mcpClient.disconnect(serverName);
                } else {
                    return;
                }
            }
        }
        
        // Check if OAuth is configured
        if (!oauthConfig.hasConfiguration(serverName)) {
            // Show setup dialog
            showSetupDialog(serviceKey);
            return;
        }
        
        // Check if the saved config has the correct redirect URI
        const savedConfig = oauthConfig.getConfiguration(serverName);
        if (savedConfig.redirectUri && savedConfig.redirectUri.includes('/oauth/callback')) {
            // Clear the old configuration with incorrect redirect URI
            console.log('[MCPQuickConnectors] Clearing old OAuth config with incorrect redirect URI');
            oauthConfig.configs.delete(serverName);
            await oauthConfig.saveConfigs();
            showSetupDialog(serviceKey);
            return;
        }
        
        // Check if client ID is present
        if (!savedConfig.clientId) {
            showSetupDialog(serviceKey);
            return;
        }
        
        try {
            // Update status to connecting
            updateConnectorStatus(serviceKey, 'connecting');
            
            // Create MCP server configuration
            const mcpConfig = {
                name: serverName,
                description: config.description,
                transport: {
                    type: 'oauth',
                    url: config.serverUrl
                }
            };
            
            // Check if we have a valid token
            const oauthService = new window.MCPOAuthService.OAuthService();
            try {
                await oauthService.getAccessToken(serverName, false);
            } catch (error) {
                // Need to authorize
                updateConnectorStatus(serviceKey, 'authorizing');
                console.log('[MCPQuickConnectors] Starting OAuth flow with config:', savedConfig);
                const authResult = await oauthService.startAuthorizationFlow(serverName, savedConfig);
                
                console.log('[MCPQuickConnectors] Authorization URL:', authResult.authorizationUrl);
                // Open authorization window
                const authWindow = window.open(authResult.authorizationUrl, 'oauth_authorize', 'width=600,height=700');
                
                // Wait for authorization
                await waitForAuthorization(authWindow, serverName, authResult.state);
            }
            
            // Connect to MCP server
            await mcpClient.connect(serverName, mcpConfig, {
                onNotification: (notification) => {
                    console.log(`[MCP] Notification from ${serverName}:`, notification);
                }
            });
            
            // Update status
            updateConnectorStatus(serviceKey, 'connected');
            
            // Save state
            saveConnectorState(serviceKey, 'connected');
            
            // Update servers list
            if (window.MCPServerManager) {
                window.MCPServerManager.updateServersList();
            }
            
            // Show success message
            showNotification(`✅ Connected to ${config.name}`, 'success');
            
        } catch (error) {
            console.error(`[MCPQuickConnectors] Failed to connect to ${serviceKey}:`, error);
            updateConnectorStatus(serviceKey, 'disconnected');
            showNotification(`❌ Failed to connect to ${config.name}: ${error.message}`, 'error');
        }
    }
    
    /**
     * Show setup dialog for a service
     * @param {string} serviceKey - Service key
     */
    function showSetupDialog(serviceKey) {
        const config = QUICK_CONNECTORS[serviceKey];
        const serverName = `mcp-${serviceKey}`;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'quick-connector-setup-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${config.setupInstructions.title}</h3>
                
                <div class="setup-instructions">
                    <p>Follow these steps to set up ${config.name} integration:</p>
                    <ol>
                        ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                    <p class="form-help">
                        <a href="${config.setupInstructions.docUrl}" target="_blank">
                            View detailed documentation <i class="fas fa-external-link-alt"></i>
                        </a>
                    </p>
                </div>
                
                <div class="setup-form">
                    <div class="form-group">
                        <label for="quick-setup-client-id">Client ID</label>
                        <input type="text" id="quick-setup-client-id" placeholder="Enter your OAuth Client ID" />
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn primary-btn" onclick="MCPQuickConnectors.saveSetup('${serviceKey}')">
                            Save & Connect
                        </button>
                        <button class="btn secondary-btn" onclick="MCPQuickConnectors.closeSetupDialog()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus on client ID input
        document.getElementById('quick-setup-client-id').focus();
    }
    
    /**
     * Save setup configuration
     * @param {string} serviceKey - Service key
     */
    async function saveSetup(serviceKey) {
        const clientId = document.getElementById('quick-setup-client-id').value.trim();
        if (!clientId) {
            alert('Please enter a Client ID');
            return;
        }
        
        const config = QUICK_CONNECTORS[serviceKey];
        const serverName = `mcp-${serviceKey}`;
        
        // Save OAuth configuration
        const oauthConfigData = {
            ...config.oauthConfig,
            clientId: clientId
        };
        
        console.log('[MCPQuickConnectors] Saving OAuth config:', oauthConfigData);
        oauthConfig.configs.set(serverName, oauthConfigData);
        await oauthConfig.saveConfigs();
        
        // Close dialog
        closeSetupDialog();
        
        // Connect to service
        await connectService(serviceKey);
    }
    
    /**
     * Close setup dialog
     */
    function closeSetupDialog() {
        const modal = document.getElementById('quick-connector-setup-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Wait for OAuth authorization
     * @param {Window} authWindow - Authorization window
     * @param {string} serverName - Server name
     * @param {string} state - OAuth state
     */
    function waitForAuthorization(authWindow, serverName, state) {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                try {
                    if (authWindow.closed) {
                        clearInterval(checkInterval);
                        // Check if authorization was successful
                        const oauthService = new window.MCPOAuthService.OAuthService();
                        oauthService.getAccessToken(serverName, false)
                            .then(() => resolve())
                            .catch(() => reject(new Error('Authorization cancelled')));
                        return;
                    }
                    
                    // Try to check URL (will fail with cross-origin until redirect)
                    const currentUrl = authWindow.location.href;
                    if (currentUrl.includes('/oauth/callback')) {
                        authWindow.close();
                        clearInterval(checkInterval);
                        
                        // Handle the callback
                        const urlParams = new URLSearchParams(new URL(currentUrl).search);
                        const code = urlParams.get('code');
                        if (code) {
                            resolve();
                        } else {
                            reject(new Error('Authorization failed'));
                        }
                    }
                } catch (e) {
                    // Cross-origin error is expected
                }
            }, 500);
        });
    }
    
    /**
     * Update connector status
     * @param {string} serviceKey - Service key
     * @param {string} status - Status (disconnected, connecting, authorizing, connected)
     */
    function updateConnectorStatus(serviceKey, status) {
        const statusElement = document.getElementById(`connector-status-${serviceKey}`);
        if (!statusElement) return;
        
        const config = QUICK_CONNECTORS[serviceKey];
        const serverName = `mcp-${serviceKey}`;
        
        switch (status) {
            case 'disconnected':
                statusElement.innerHTML = `
                    <button class="btn primary-btn connect-btn" onclick="MCPQuickConnectors.connectService('${serviceKey}')">
                        Connect
                    </button>
                `;
                break;
                
            case 'connecting':
                statusElement.innerHTML = `
                    <div class="status-connecting">
                        <i class="fas fa-spinner fa-spin"></i> Connecting...
                    </div>
                `;
                break;
                
            case 'authorizing':
                statusElement.innerHTML = `
                    <div class="status-authorizing">
                        <i class="fas fa-key"></i> Authorizing...
                    </div>
                `;
                break;
                
            case 'connected':
                const connectionInfo = mcpClient?.getConnectionInfo(serverName);
                const toolCount = connectionInfo?.tools?.length || 0;
                statusElement.innerHTML = `
                    <div class="status-connected">
                        <i class="fas fa-check-circle"></i> Connected
                        <span class="tool-count">${toolCount} tools</span>
                    </div>
                    <button class="btn secondary-btn disconnect-btn" onclick="MCPQuickConnectors.disconnectService('${serviceKey}')">
                        Disconnect
                    </button>
                `;
                break;
        }
    }
    
    /**
     * Disconnect from a service
     * @param {string} serviceKey - Service key
     */
    async function disconnectService(serviceKey) {
        const config = QUICK_CONNECTORS[serviceKey];
        const serverName = `mcp-${serviceKey}`;
        
        try {
            if (mcpClient) {
                const connectionInfo = mcpClient.getConnectionInfo(serverName);
                if (connectionInfo && connectionInfo.connected) {
                    await mcpClient.disconnect(serverName);
                }
            }
            
            updateConnectorStatus(serviceKey, 'disconnected');
            saveConnectorState(serviceKey, 'disconnected');
            
            // Update servers list
            if (window.MCPServerManager) {
                window.MCPServerManager.updateServersList();
            }
            
            showNotification(`Disconnected from ${config.name}`, 'info');
            
        } catch (error) {
            console.error(`[MCPQuickConnectors] Failed to disconnect from ${serviceKey}:`, error);
            showNotification(`Failed to disconnect from ${config.name}`, 'error');
        }
    }
    
    /**
     * Update all connector statuses
     */
    function updateAllConnectorStatuses() {
        Object.keys(QUICK_CONNECTORS).forEach(serviceKey => {
            const serverName = `mcp-${serviceKey}`;
            let isConnected = false;
            
            if (mcpClient) {
                const connectionInfo = mcpClient.getConnectionInfo(serverName);
                isConnected = connectionInfo && connectionInfo.connected;
            }
            
            updateConnectorStatus(serviceKey, isConnected ? 'connected' : 'disconnected');
        });
    }
    
    /**
     * Load connector states from storage
     */
    async function loadConnectorStates() {
        // States are determined by MCP client connections
        updateAllConnectorStatuses();
    }
    
    /**
     * Save connector state
     * @param {string} serviceKey - Service key
     * @param {string} state - State to save
     */
    async function saveConnectorState(serviceKey, state) {
        // State is managed by MCP client, this is for future use
        console.log(`[MCPQuickConnectors] State saved for ${serviceKey}: ${state}`);
    }
    
    /**
     * Show notification
     * @param {string} message - Message to show
     * @param {string} type - Notification type (success, error, info)
     */
    function showNotification(message, type = 'info') {
        if (window.MCPUtils && window.MCPUtils.showNotification) {
            window.MCPUtils.showNotification(message);
        } else {
            console.log(`[MCPQuickConnectors] ${type}: ${message}`);
        }
    }
    
    /**
     * Clear OAuth configuration for a service (for debugging)
     * @param {string} serviceKey - Service key
     */
    function clearOAuthConfig(serviceKey) {
        const serverName = `mcp-${serviceKey}`;
        console.log(`[MCPQuickConnectors] Clearing OAuth config for ${serverName}`);
        if (oauthConfig && oauthConfig.configs) {
            oauthConfig.configs.delete(serverName);
            oauthConfig.saveConfigs();
            console.log(`[MCPQuickConnectors] Cleared OAuth config for ${serverName}`);
        }
    }
    
    // Public API
    return {
        init,
        createQuickConnectorsUI,
        connectService,
        disconnectService,
        saveSetup,
        closeSetupDialog,
        updateAllConnectorStatuses,
        clearOAuthConfig
    };
})();