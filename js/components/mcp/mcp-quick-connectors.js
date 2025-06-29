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
            transport: 'service-connector',
            authType: 'pat',
            setupInstructions: {
                title: 'GitHub Personal Access Token Setup',
                steps: [
                    'Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)',
                    'Click "Generate new token"',
                    'Give your token a descriptive name like "hacka.re MCP Integration"',
                    'Select scopes: "repo" for full repository access, "read:user" for user info',
                    'Click "Generate token" and copy the token immediately',
                    'Paste the token when prompted (it won\'t be shown again on GitHub)',
                    'Note: Your token will be encrypted and stored locally'
                ],
                docUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
            }
        },
        gmail: {
            name: 'Gmail',
            icon: 'fas fa-envelope',
            description: 'Read and send emails through Gmail',
            transport: 'service-connector',
            authType: 'oauth-device',
            setupInstructions: {
                title: 'Gmail OAuth Setup',
                steps: [
                    'Go to Google Cloud Console (console.cloud.google.com)',
                    'Create a new project or select existing one',
                    'Enable Gmail API in "APIs & Services" > "Library"',
                    'Go to "APIs & Services" > "Credentials"',
                    'Create OAuth 2.0 Client ID (Desktop application type)',
                    'Copy the Client ID and Client Secret',
                    'Enter them when prompted to start device flow authentication'
                ],
                docUrl: 'https://developers.google.com/gmail/api/quickstart/js'
            }
        },
        gdocs: {
            name: 'Google Docs',
            icon: 'fas fa-file-alt',
            description: 'Access and edit Google Docs',
            transport: 'service-connector',
            authType: 'oauth-shared',
            setupInstructions: {
                title: 'Google Docs OAuth Setup',
                steps: [
                    'Google Docs uses the same authentication as Gmail',
                    'If you\'ve already connected Gmail, Docs will work automatically',
                    'Otherwise, set up Gmail first to enable Google Docs access',
                    'Additional permissions for Docs will be requested if needed'
                ],
                docUrl: 'https://developers.google.com/docs/api/quickstart/js'
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
                redirectUri: window.location.origin.startsWith('file://') ? 'http://localhost:8000' : window.location.origin,
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
                    'Add authorized redirect URIs: https://hacka.re AND http://localhost:8000',
                    'Copy the Client ID and paste it below'
                ],
                docUrl: 'https://developers.google.com/calendar/api/guides/auth'
            }
        },
        context7: {
            name: 'Context7',
            icon: 'fas fa-book',
            description: 'Search and access up-to-date documentation for any library or framework',
            transport: 'mcp-server',
            authType: 'none',
            setupInstructions: {
                title: 'Context7 Setup',
                steps: [
                    'Context7 provides instant access to current documentation:',
                    '• Search docs for any library (React, FastAPI, pandas, etc.)',
                    '• Get latest code examples and tutorials',
                    '• Access version-specific documentation',
                    'Click Connect to add Context7 tools to your function calling interface',
                    'Use the tools in conversations to get real-time documentation'
                ],
                docUrl: 'https://github.com/upstash/context7-mcp'
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
        
        // Find the form actions (close button) and insert before it
        const formActions = container.querySelector('.form-actions');
        console.log('[MCPQuickConnectors] Form actions found:', !!formActions);
        
        if (formActions) {
            // Insert before the close button
            formActions.parentNode.insertBefore(section, formActions);
            console.log('[MCPQuickConnectors] Quick connectors section inserted before form actions');
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
     * @param {string} serviceKey - Service key (github, gmail, gdocs, calendar)
     */
    async function connectService(serviceKey) {
        const config = QUICK_CONNECTORS[serviceKey];
        if (!config) {
            console.error(`[MCPQuickConnectors] Unknown service: ${serviceKey}`);
            return;
        }

        // Handle Context7 connection by directing user to use MCP Servers modal
        if (serviceKey === 'context7' && config.transport === 'mcp-server') {
            try {
                // Remove any existing placeholder Context7 functions
                if (window.FunctionToolsStorage) {
                    const context7FunctionNames = ['context7_search_docs', 'context7_get_latest_docs', 'context7_get_examples'];
                    context7FunctionNames.forEach(functionName => {
                        if (window.FunctionToolsRegistry && window.FunctionToolsRegistry.removeFunction) {
                            window.FunctionToolsRegistry.removeFunction(functionName);
                        }
                    });
                    
                    // Remove from enabled functions list
                    const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                    const filteredFunctions = enabledFunctions.filter(name => !context7FunctionNames.includes(name));
                    if (filteredFunctions.length !== enabledFunctions.length) {
                        window.FunctionToolsStorage.setEnabledFunctions(filteredFunctions);
                        window.FunctionToolsStorage.save();
                    }
                }
                
                updateConnectorStatus(serviceKey, 'connected');
                saveConnectorState(serviceKey, 'connected');
                showNotification(`✅ Context7 Quick Connect enabled! To use Context7 tools:

1. Start the Context7 proxy: ./start-with-context7.sh
2. Go to Settings → MCP Servers  
3. Set proxy URL to: http://localhost:3001
4. Connect to load the real Context7 tools

The real Context7 MCP server provides live documentation search.`, 'success');
                
            } catch (error) {
                console.error(`[MCPQuickConnectors] Context7 connection error:`, error);
                updateConnectorStatus(serviceKey, 'disconnected');
                showNotification(`❌ Failed to connect to Context7: ${error.message}`, 'error');
            }
            return;
        }
        
        // Check if this is a service connector type
        if (config.transport === 'service-connector') {
            // Use MCPServiceConnectors for all service connections
            if (window.MCPServiceConnectors) {
                try {
                    updateConnectorStatus(serviceKey, 'connecting');
                    const result = await window.MCPServiceConnectors.connectService(serviceKey);
                    if (result) {
                        updateConnectorStatus(serviceKey, 'connected');
                        saveConnectorState(serviceKey, 'connected');
                        showNotification(`✅ Connected to ${config.name}`, 'success');
                    } else {
                        updateConnectorStatus(serviceKey, 'disconnected');
                    }
                } catch (error) {
                    console.error(`[MCPQuickConnectors] Service connector error:`, error);
                    updateConnectorStatus(serviceKey, 'disconnected');
                    showNotification(`❌ Failed to connect to ${config.name}: ${error.message}`, 'error');
                }
            } else {
                console.error('[MCPQuickConnectors] MCPServiceConnectors not available');
                showNotification('Service connectors not loaded. Please refresh the page.', 'error');
            }
            return; // Exit early for all service-connector types
        }
        
        // Original OAuth flow for other services
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
        
        // For GitHub, always check client ID specifically 
        if (serviceKey === 'github') {
            const savedConfig = oauthConfig.hasConfiguration(serverName) ? 
                oauthConfig.getConfiguration(serverName) : null;
            
            if (!savedConfig || !savedConfig.clientId) {
                console.log('[MCPQuickConnectors] GitHub requires Client ID setup');
                showSetupDialog(serviceKey);
                return;
            }
            
            // Check if the saved config has the correct redirect URI
            if (savedConfig.redirectUri && savedConfig.redirectUri.includes('/oauth/callback')) {
                // Clear the old configuration with incorrect redirect URI
                console.log('[MCPQuickConnectors] Clearing old OAuth config with incorrect redirect URI');
                oauthConfig.configs.delete(serverName);
                await oauthConfig.saveConfigs();
                showSetupDialog(serviceKey);
                return;
            }
        } else {
            // For other services, use the original logic
            if (!oauthConfig.hasConfiguration(serverName)) {
                showSetupDialog(serviceKey);
                return;
            }
            
            const savedConfig = oauthConfig.getConfiguration(serverName);
            if (!savedConfig.clientId) {
                showSetupDialog(serviceKey);
                return;
            }
        }
        
        // Get saved config for use in the flow
        const savedConfig = oauthConfig.getConfiguration(serverName);
        
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
            // Use the same OAuth service instance as the OAuth flow
            const oauthService = window.mcpOAuthFlow.oauthService || new window.MCPOAuthService.OAuthService();
            try {
                await oauthService.getAccessToken(serverName, false);
            } catch (error) {
                // Need to authorize
                updateConnectorStatus(serviceKey, 'authorizing');
                console.log('[MCPQuickConnectors] Starting OAuth flow with config:', savedConfig);
                
                // Check if this service uses device flow (GitHub)
                if (savedConfig.useDeviceFlow || savedConfig.provider === 'github' || serviceKey === 'github') {
                    // Use device flow for GitHub
                    const flowResult = await oauthService.startDeviceFlow(serverName, savedConfig);
                    
                    // Show device flow UI instead of opening a window
                    if (window.mcpOAuthFlow) {
                        // Use the global instance
                        window.mcpOAuthFlow.showDeviceFlowInstructions(flowResult);
                        
                        // Start polling for completion
                        // Note: startDeviceFlowPolling doesn't return a promise, it handles completion internally
                        window.mcpOAuthFlow.startDeviceFlowPolling(flowResult.deviceCode);
                        
                        // Wait for the user to complete the flow
                        // The modal will close and update the UI when done
                        updateConnectorStatus(serviceKey, 'disconnected');
                        return; // Exit here as the flow will complete asynchronously
                    } else {
                        throw new Error('Device flow UI not available');
                    }
                } else {
                    // Use standard authorization flow for other providers
                    try {
                        const authResult = await oauthService.startAuthorizationFlow(serverName, savedConfig);
                        
                        console.log('[MCPQuickConnectors] Authorization URL:', authResult.authorizationUrl);
                        // Open authorization window
                        const authWindow = window.open(authResult.authorizationUrl, 'oauth_authorize', 'width=600,height=700');
                        
                        // Wait for authorization
                        await waitForAuthorization(authWindow, serverName, authResult.state);
                    } catch (oauthError) {
                        // If OAuth fails (like redirect_uri_mismatch), show manual flow
                        console.log('[MCPQuickConnectors] OAuth failed, showing manual flow:', oauthError);
                        showManualOAuthFlow(serviceKey, savedConfig, oauthError);
                        return;
                    }
                }
            }
            
            // Connect to MCP server
            await mcpClient.connect(serverName, mcpConfig, {
                onNotification: (notification) => {
                    console.log(`[MCP] Notification from ${serverName}:`, notification);
                }
            });
            
            // Update servers list
            if (window.MCPServerManager) {
                window.MCPServerManager.updateServersList();
            }
            
            // Update status
            updateConnectorStatus(serviceKey, 'connected');
            
            // Save state
            saveConnectorState(serviceKey, 'connected');
            
            // Show success message
            showNotification(`✅ Connected to ${config.name}`, 'success');
            
        } catch (error) {
            console.error(`[MCPQuickConnectors] Failed to connect to ${serviceKey}:`, error);
            
            // Check if this is a manual curl error
            if (error.message && error.message.includes('Try manual connection with curl:')) {
                // Show manual connection testing UI
                showManualConnectionUI(serviceKey, error.message);
            } else if (error.message && (
                error.message.includes('Authorization cancelled') ||
                error.message.includes('redirect_uri_mismatch') ||
                error.message.includes('OAuth') ||
                error.message.includes('timeout')
            )) {
                // OAuth failed - show manual flow
                console.log('[MCPQuickConnectors] OAuth error detected, showing manual flow:', error);
                const savedConfig = oauthConfig.getConfiguration(serverName);
                showManualOAuthFlow(serviceKey, savedConfig, error);
            } else {
                updateConnectorStatus(serviceKey, 'disconnected');
                showNotification(`❌ Failed to connect to ${config.name}: ${error.message}`, 'error');
            }
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
        
        // For GitHub, start device flow instead of direct connection
        if (serviceKey === 'github') {
            await startGitHubDeviceFlow(serviceKey, serverName, oauthConfigData);
        } else {
            // For other services, proceed with normal connection
            await connectService(serviceKey);
        }
    }
    
    /**
     * Start GitHub device flow after Client ID is saved
     * @param {string} serviceKey - Service key (github)
     * @param {string} serverName - Server name (mcp-github)
     * @param {Object} oauthConfigData - OAuth configuration
     */
    async function startGitHubDeviceFlow(serviceKey, serverName, oauthConfigData) {
        try {
            console.log('[MCPQuickConnectors] Starting GitHub device flow for', serviceKey);
            updateConnectorStatus(serviceKey, 'authorizing');
            
            // Use the OAuth service to start device flow
            if (!oauthFlow || !oauthFlow.oauthService) {
                throw new Error('OAuth service not available');
            }
            
            // Start device flow (this will handle CORS fallback to manual flow)
            const flowResult = await oauthFlow.oauthService.startDeviceFlow(serverName, oauthConfigData);
            console.log('[MCPQuickConnectors] Device flow started:', flowResult);
            
            // Show device flow UI (manual or automatic)
            if (window.mcpOAuthFlow) {
                window.mcpOAuthFlow.showDeviceFlowInstructions(flowResult);
                
                if (!flowResult.isManualFlow) {
                    // Automatic flow - start polling
                    window.mcpOAuthFlow.startDeviceFlowPolling(flowResult.deviceCode);
                }
                // For manual flow, the UI will handle the rest
            } else {
                throw new Error('Device flow UI not available');
            }
            
        } catch (error) {
            console.error('[MCPQuickConnectors] Failed to start GitHub device flow:', error);
            updateConnectorStatus(serviceKey, 'disconnected');
            showNotification(`❌ Failed to start GitHub authentication: ${error.message}`, 'error');
        }
    }
    
    /**
     * Show simple GitHub PAT input dialog
     */
    function showGitHubPATDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'github-pat-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <h3><i class="fab fa-github"></i> GitHub Personal Access Token</h3>
                    
                    <div class="pat-instructions">
                        <p><strong>To connect GitHub:</strong></p>
                        <ol>
                            <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank">GitHub → Settings → Developer settings → Personal access tokens</a></li>
                            <li>Click "Generate new token (classic)"</li>
                            <li>Give it a name like "hacka.re MCP Integration"</li>
                            <li>Select scopes: <code>repo</code> and <code>read:user</code></li>
                            <li>Click "Generate token" and copy it</li>
                            <li>Paste it below:</li>
                        </ol>
                    </div>
                    
                    <div class="form-group">
                        <label for="github-pat-input">Personal Access Token:</label>
                        <input type="password" id="github-pat-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                               style="width: 100%; font-family: monospace;">
                        <div class="form-help">Your token will be encrypted and stored locally.</div>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="github-pat-connect" class="btn-primary">
                            <i class="fas fa-link"></i> Connect
                        </button>
                        <button id="github-pat-cancel" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const tokenInput = modal.querySelector('#github-pat-input');
            const connectBtn = modal.querySelector('#github-pat-connect');
            const cancelBtn = modal.querySelector('#github-pat-cancel');
            
            // Focus the input
            tokenInput.focus();
            
            // Handle connect
            const handleConnect = () => {
                const token = tokenInput.value.trim();
                if (token) {
                    modal.remove();
                    resolve(token);
                } else {
                    tokenInput.style.borderColor = '#ff6b6b';
                    tokenInput.focus();
                }
            };
            
            // Handle cancel
            const handleCancel = () => {
                modal.remove();
                resolve(null);
            };
            
            // Event listeners
            connectBtn.addEventListener('click', handleConnect);
            cancelBtn.addEventListener('click', handleCancel);
            tokenInput.addEventListener('keypress', (e) => {
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
            let checkCount = 0;
            const maxChecks = 120; // 60 seconds maximum wait time
            
            const checkInterval = setInterval(() => {
                checkCount++;
                
                try {
                    if (authWindow.closed) {
                        clearInterval(checkInterval);
                        // Check if authorization was successful
                        const oauthService = new window.MCPOAuthService.OAuthService();
                        oauthService.getAccessToken(serverName, false)
                            .then(() => resolve())
                            .catch(() => reject(new Error('Authorization cancelled or failed - window closed without completing OAuth')));
                        return;
                    }
                    
                    // Try to check URL (will fail with cross-origin until redirect)
                    const currentUrl = authWindow.location.href;
                    
                    // Check for Google error page indicators
                    if (currentUrl.includes('error=') || currentUrl.includes('Error%20400') || currentUrl.includes('redirect_uri_mismatch')) {
                        clearInterval(checkInterval);
                        authWindow.close();
                        reject(new Error('OAuth redirect_uri_mismatch error detected - redirect URI not configured in Google Cloud Console'));
                        return;
                    }
                    
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
                    
                    // Timeout check
                    if (checkCount >= maxChecks) {
                        clearInterval(checkInterval);
                        authWindow.close();
                        reject(new Error('OAuth timeout - please try manual flow'));
                    }
                    
                } catch (e) {
                    // Cross-origin error is expected, but let's also check window title/document if possible
                    try {
                        const title = authWindow.document.title;
                        if (title && (title.includes('Error 400') || title.includes('redirect_uri_mismatch'))) {
                            clearInterval(checkInterval);
                            authWindow.close();
                            reject(new Error('OAuth error detected from window title - redirect_uri_mismatch'));
                            return;
                        }
                    } catch (titleError) {
                        // Can't access title due to CORS, continue
                    }
                }
            }, 500);
            
            // Also add a window beforeunload listener to detect early closure
            authWindow.addEventListener('beforeunload', () => {
                // Small delay to let window fully close
                setTimeout(() => {
                    if (authWindow.closed) {
                        clearInterval(checkInterval);
                        reject(new Error('OAuth window closed without completing authorization'));
                    }
                }, 100);
            });
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
                let toolCount = 0;
                
                // Check Context7
                if (serviceKey === 'context7' && config.transport === 'mcp-server') {
                    // Count actual Context7 tools
                    if (window.FunctionToolsStorage) {
                        const jsFunctions = window.FunctionToolsStorage.getJsFunctions() || {};
                        const context7Tools = Object.keys(jsFunctions).filter(name => name.startsWith('context7_'));
                        toolCount = context7Tools.length;
                    }
                } else if (config.transport === 'service-connector') {
                    if (serviceKey === 'github' && window.MCPToolRegistry) {
                        // Use new provider system for GitHub
                        const githubTools = window.MCPToolRegistry.getProviderTools('github');
                        toolCount = githubTools.length;
                    } else if (window.MCPServiceConnectors) {
                        // Use old system for other services
                        toolCount = window.MCPServiceConnectors.getToolCount(serviceKey);
                    }
                } else {
                    // Regular MCP connection
                    const connectionInfo = mcpClient?.getConnectionInfo(serverName);
                    toolCount = connectionInfo?.tools?.length || 0;
                }
                
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
        
        try {
            // Handle Context7 disconnect
            if (serviceKey === 'context7' && config.transport === 'mcp-server') {
                // Remove Context7 tools from function calling system
                let toolsRemoved = 0;
                if (window.FunctionToolsStorage && window.FunctionToolsRegistry) {
                    const context7ToolNames = [
                        'context7_search_docs',
                        'context7_get_latest_docs', 
                        'context7_get_examples'
                    ];
                    
                    context7ToolNames.forEach(toolName => {
                        try {
                            // Remove from enabled functions
                            const enabledFunctions = window.FunctionToolsStorage.getEnabledFunctions() || [];
                            const index = enabledFunctions.indexOf(toolName);
                            if (index > -1) {
                                enabledFunctions.splice(index, 1);
                                window.FunctionToolsStorage.setEnabledFunctions(enabledFunctions);
                            }
                            
                            // Remove from JS functions
                            const jsFunctions = window.FunctionToolsStorage.getJsFunctions() || {};
                            if (jsFunctions[toolName]) {
                                delete jsFunctions[toolName];
                                window.FunctionToolsStorage.setJsFunctions(jsFunctions);
                                toolsRemoved++;
                            }
                            
                            // Remove from function collections
                            const functionCollections = window.FunctionToolsStorage.getFunctionCollections() || {};
                            if (functionCollections[toolName]) {
                                delete functionCollections[toolName];
                                window.FunctionToolsStorage.setFunctionCollections(functionCollections);
                            }
                        } catch (error) {
                            console.error(`[MCPQuickConnectors] Failed to remove Context7 tool ${toolName}:`, error);
                        }
                    });
                    
                    if (toolsRemoved > 0) {
                        window.FunctionToolsStorage.save();
                    }
                }
                
                updateConnectorStatus(serviceKey, 'disconnected');
                saveConnectorState(serviceKey, 'disconnected');
                
                showNotification(`Context7 disconnected. Removed ${toolsRemoved} tools.`, 'info');
                
                return;
            }
            
            if (config.transport === 'service-connector') {
                if (window.MCPServiceConnectors) {
                    // Use MCPServiceConnectors for all service connections
                    await window.MCPServiceConnectors.disconnectService(serviceKey);
                }
            } else if (mcpClient) {
                const serverName = `mcp-${serviceKey}`;
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
            const config = QUICK_CONNECTORS[serviceKey];
            let isConnected = false;
            
            // Check Context7 connection status
            if (serviceKey === 'context7' && config.transport === 'mcp-server') {
                try {
                    // Check if Context7 tools are in the function calling system
                    if (window.FunctionToolsStorage) {
                        const jsFunctions = window.FunctionToolsStorage.getJsFunctions() || {};
                        isConnected = !!(jsFunctions['context7_search_docs'] || 
                                       jsFunctions['context7_get_latest_docs'] || 
                                       jsFunctions['context7_get_examples']);
                    }
                } catch (error) {
                    console.error('[MCPQuickConnectors] Error checking Context7 status:', error);
                }
            } else if (config.transport === 'service-connector') {
                if (serviceKey === 'github' && window.MCPToolRegistry) {
                    // Check if GitHub provider is connected via new system
                    const githubProvider = window.MCPToolRegistry.getProvider('github');
                    isConnected = githubProvider && githubProvider.connected;
                } else if (window.MCPServiceConnectors) {
                    // Use old system for other services
                    isConnected = window.MCPServiceConnectors.isConnected(serviceKey);
                }
            } else if (mcpClient) {
                const serverName = `mcp-${serviceKey}`;
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
    
    /**
     * Complete MCP connection after OAuth authentication
     * This is called when authentication completes outside the normal flow (e.g., manual token entry)
     * @param {string} serviceKey - Service key (github, gmail, drive, calendar)
     */
    async function completeConnectionAfterAuth(serviceKey) {
        console.log(`[MCPQuickConnectors] Completing connection after auth for ${serviceKey}`);
        
        const config = QUICK_CONNECTORS[serviceKey];
        const serverName = `mcp-${serviceKey}`;
        
        if (!config) {
            console.error(`[MCPQuickConnectors] Unknown service: ${serviceKey}`);
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
            
            // Connect to MCP server
            await mcpClient.connect(serverName, mcpConfig, {
                onNotification: (notification) => {
                    console.log(`[MCP] Notification from ${serverName}:`, notification);
                }
            });
            
            // Update servers list
            if (window.MCPServerManager) {
                window.MCPServerManager.updateServersList();
            }
            
            // Update status
            updateConnectorStatus(serviceKey, 'connected');
            
            // Save state
            saveConnectorState(serviceKey, 'connected');
            
            // Show success message
            showNotification(`✅ Connected to ${config.name}`, 'success');
            
            console.log(`[MCPQuickConnectors] Successfully completed connection for ${serviceKey}`);
            
        } catch (error) {
            console.error(`[MCPQuickConnectors] Failed to complete connection for ${serviceKey}:`, error);
            
            // Check if this is a manual curl error
            if (error.message && error.message.includes('Try manual connection with curl:')) {
                // Show manual connection testing UI
                showManualConnectionUI(serviceKey, error.message);
            } else {
                updateConnectorStatus(serviceKey, 'disconnected');
                showNotification(`❌ Failed to connect to ${config.name}: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * Show manual connection UI for CORS/auth issues
     * @param {string} serviceKey - Service key
     * @param {string} errorMessage - Error message containing curl command
     */
    function showManualConnectionUI(serviceKey, errorMessage) {
        const config = QUICK_CONNECTORS[serviceKey];
        
        console.log('[MCPQuickConnectors] Error message for manual UI:', errorMessage);
        
        // Extract curl command from error message (everything after "curl:\n\n")
        const curlCommandMatch = errorMessage.match(/curl:\s*\n\s*\n([\s\S]*)/);
        const curlCommand = curlCommandMatch ? curlCommandMatch[1].trim() : 'Curl command not found in error message';
        
        console.log('[MCPQuickConnectors] Extracted curl command:', curlCommand);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal mcp-manual-connection-modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔧 Manual ${config.name} Connection Test</h3>
                
                <div class="manual-connection-instructions">
                    <div class="cors-notice">
                        <h4>⚠️ Connection Authentication Issue</h4>
                        <p>The automatic connection to ${config.name} MCP server failed due to authentication. 
                           Please test the connection manually using the curl command below:</p>
                    </div>
                    
                    <div class="manual-curl-section">
                        <h4>Step 1: Test Connection</h4>
                        <p>Run this command in your terminal:</p>
                        <div class="code-block">
                            <pre id="mcp-curl-command">${curlCommand}</pre>
                            <button class="copy-button" onclick="MCPQuickConnectors.copyCurlCommand(this)">Copy</button>
                        </div>
                    </div>
                    
                    <div class="manual-response-section">
                        <h4>Step 2: Paste Response</h4>
                        <p>Paste the response from the curl command (JSON or error message):</p>
                        <textarea id="mcp-response-input" placeholder='Paste the response here...
Example JSON: {"jsonrpc": "2.0", "result": {...}, "id": 1}
Or error: bad request: unknown integration' rows="8" class="mcp-response-textarea"></textarea>
                        <button class="primary-button" onclick="MCPQuickConnectors.processManualConnectionResponse('${serviceKey}')">
                            Process Response
                        </button>
                    </div>
                    
                    <div class="connection-actions">
                        <button class="btn secondary-btn" onclick="MCPQuickConnectors.closeManualConnectionUI()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * Close manual connection UI
     */
    function closeManualConnectionUI() {
        const modal = document.querySelector('.mcp-manual-connection-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Copy curl command from manual connection UI
     * @param {HTMLElement} button - Copy button element
     */
    function copyCurlCommand(button) {
        const command = document.getElementById('mcp-curl-command').textContent;
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(command).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                fallbackCopyMcp(command, button);
            });
        } else {
            fallbackCopyMcp(command, button);
        }
    }
    
    /**
     * Fallback copy method for MCP
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element
     */
    function fallbackCopyMcp(text, button) {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            } else {
                button.textContent = 'Failed';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            button.textContent = 'Failed';
            setTimeout(() => button.textContent = 'Copy', 2000);
        } finally {
            document.body.removeChild(tempTextarea);
        }
    }
    
    /**
     * Show manual OAuth flow with curl commands and paste fields
     * @param {string} serviceKey - Service key (github, gmail, gdocs, calendar)
     * @param {Object} savedConfig - OAuth configuration
     * @param {Error} oauthError - Original OAuth error
     */
    function showManualOAuthFlow(serviceKey, savedConfig, oauthError) {
        const config = QUICK_CONNECTORS[serviceKey];
        
        console.log('[MCPQuickConnectors] Showing manual OAuth flow for:', serviceKey, oauthError);
        
        // Generate curl command for device code request
        const deviceCodeCurl = generateDeviceCodeCurl(savedConfig);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal manual-oauth-modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🔧 Manual OAuth Setup for ${config.name}</h3>
                
                <div class="manual-oauth-instructions">
                    <div class="oauth-error-notice">
                        <h4>⚠️ OAuth Authorization Failed</h4>
                        <p>Automatic OAuth failed: <code>${oauthError.message}</code></p>
                        <p>Complete the OAuth process manually using the steps below:</p>
                    </div>
                    
                    <div class="manual-oauth-step" id="step-1">
                        <h4>Step 1: Request Device Code</h4>
                        <p>Run this curl command in your terminal to get a device code:</p>
                        <div class="code-block">
                            <pre id="device-code-curl">${deviceCodeCurl}</pre>
                            <button class="copy-button" onclick="MCPQuickConnectors.copyCommand('device-code-curl', this)">Copy</button>
                        </div>
                        <div class="response-section">
                            <label for="device-code-response">Paste the JSON response here:</label>
                            <textarea id="device-code-response" placeholder='Example: {"device_code": "xyz", "user_code": "ABCD-EFGH", "verification_uri": "https://...", "expires_in": 900}' rows="4"></textarea>
                            <button class="btn primary-btn" onclick="MCPQuickConnectors.processDeviceCodeResponse('${serviceKey}')">
                                Process Device Code
                            </button>
                        </div>
                    </div>
                    
                    <div class="manual-oauth-step" id="step-2" style="display: none;">
                        <h4>Step 2: Complete Authorization</h4>
                        <div id="verification-instructions"></div>
                        <p>After completing authorization, run this command to get your access token:</p>
                        <div class="code-block">
                            <pre id="token-curl"></pre>
                            <button class="copy-button" onclick="MCPQuickConnectors.copyCommand('token-curl', this)">Copy</button>
                        </div>
                        <div class="response-section">
                            <label for="token-response">Paste the token response here:</label>
                            <textarea id="token-response" placeholder='Example: {"access_token": "ghp_xxxx", "token_type": "bearer", "scope": "repo read:user"}' rows="4"></textarea>
                            <button class="btn primary-btn" onclick="MCPQuickConnectors.processTokenResponse('${serviceKey}')">
                                Complete Setup
                            </button>
                        </div>
                    </div>
                    
                    <div class="oauth-actions">
                        <button class="btn secondary-btn" onclick="MCPQuickConnectors.closeManualOAuthFlow()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * Generate curl command for device code request
     * @param {Object} config - OAuth configuration
     * @returns {string} Curl command
     */
    function generateDeviceCodeCurl(config) {
        const deviceUrl = config.provider === 'github' 
            ? 'https://github.com/login/device/code'
            : 'https://oauth2.googleapis.com/device/code';
        
        const scope = Array.isArray(config.scope) ? config.scope.join(' ') : config.scope;
        
        return `curl -X POST "${deviceUrl}" \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=${config.clientId}" \\
  -d "scope=${encodeURIComponent(scope)}"`;
    }
    
    /**
     * Process device code response from manual OAuth
     * @param {string} serviceKey - Service key
     */
    function processDeviceCodeResponse(serviceKey) {
        const responseText = document.getElementById('device-code-response').value.trim();
        
        if (!responseText) {
            alert('Please enter the device code response from curl');
            return;
        }
        
        try {
            const response = JSON.parse(responseText);
            
            if (!response.device_code || !response.user_code || !response.verification_uri) {
                throw new Error('Invalid device code response format');
            }
            
            // Show step 2
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
            
            // Fill in verification instructions
            const instructions = document.getElementById('verification-instructions');
            instructions.innerHTML = `
                <div class="verification-info">
                    <p><strong>1. Visit:</strong> <a href="${response.verification_uri}" target="_blank">${response.verification_uri}</a></p>
                    <p><strong>2. Enter code:</strong> <code>${response.user_code}</code></p>
                    <p><strong>3. Complete authorization in your browser</strong></p>
                    <p class="expires-note">⏰ Code expires in ${Math.floor(response.expires_in / 60)} minutes</p>
                </div>
            `;
            
            // Generate token curl command
            const config = QUICK_CONNECTORS[serviceKey];
            const savedConfig = oauthConfig.getConfiguration(`mcp-${serviceKey}`);
            const tokenCurl = generateTokenCurl(savedConfig, response.device_code);
            document.getElementById('token-curl').textContent = tokenCurl;
            
        } catch (error) {
            alert(`Invalid response format: ${error.message}\n\nExpected JSON with device_code, user_code, and verification_uri.`);
        }
    }
    
    /**
     * Generate curl command for token request
     * @param {Object} config - OAuth configuration
     * @param {string} deviceCode - Device code from previous step
     * @returns {string} Curl command
     */
    function generateTokenCurl(config, deviceCode) {
        const tokenUrl = config.provider === 'github'
            ? 'https://github.com/login/oauth/access_token'
            : 'https://oauth2.googleapis.com/token';
        
        return `curl -X POST "${tokenUrl}" \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=${config.clientId}" \\
  -d "device_code=${deviceCode}" \\
  -d "grant_type=urn:ietf:params:oauth:grant-type:device_code"`;
    }
    
    /**
     * Process token response from manual OAuth
     * @param {string} serviceKey - Service key
     */
    async function processTokenResponse(serviceKey) {
        const responseText = document.getElementById('token-response').value.trim();
        
        if (!responseText) {
            alert('Please enter the token response from curl');
            return;
        }
        
        try {
            const response = JSON.parse(responseText);
            
            if (!response.access_token) {
                throw new Error('No access token in response');
            }
            
            // Store the token
            const serverName = `mcp-${serviceKey}`;
            const storageKey = `${serverName}_token`;
            
            await window.CoreStorageService.setValue(storageKey, response.access_token);
            
            // If refresh token is available, store it too
            if (response.refresh_token) {
                await window.CoreStorageService.setValue(`${serverName}_refresh_token`, response.refresh_token);
            }
            
            // Close modal
            closeManualOAuthFlow();
            
            // Complete the connection
            updateConnectorStatus(serviceKey, 'connecting');
            await completeConnectionAfterAuth(serviceKey);
            
            showNotification(`✅ Manual OAuth completed for ${QUICK_CONNECTORS[serviceKey].name}`, 'success');
            
        } catch (error) {
            alert(`Invalid token response: ${error.message}\n\nExpected JSON with access_token field.`);
        }
    }
    
    /**
     * Copy command from manual OAuth UI
     * @param {string} elementId - ID of element containing command
     * @param {HTMLElement} button - Copy button element
     */
    function copyCommand(elementId, button) {
        const command = document.getElementById(elementId).textContent;
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(command).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                fallbackCopyCommand(command, button);
            });
        } else {
            fallbackCopyCommand(command, button);
        }
    }
    
    /**
     * Fallback copy method for commands
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element
     */
    function fallbackCopyCommand(text, button) {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            } else {
                button.textContent = 'Failed';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            button.textContent = 'Failed';
            setTimeout(() => button.textContent = 'Copy', 2000);
        } finally {
            document.body.removeChild(tempTextarea);
        }
    }
    
    /**
     * Close manual OAuth flow modal
     */
    function closeManualOAuthFlow() {
        const modal = document.querySelector('.manual-oauth-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Process manual connection response
     * @param {string} serviceKey - Service key
     */
    function processManualConnectionResponse(serviceKey) {
        const responseText = document.getElementById('mcp-response-input').value.trim();
        
        if (!responseText) {
            alert('Please enter the response from the curl command');
            return;
        }
        
        const config = QUICK_CONNECTORS[serviceKey];
        
        // Try to parse as JSON first
        try {
            const response = JSON.parse(responseText);
            console.log('[MCPQuickConnectors] Manual connection JSON response:', response);
            
            // Validate response structure
            if (!response.jsonrpc || response.jsonrpc !== '2.0') {
                throw new Error('Invalid JSON-RPC response format');
            }
            
            if (response.error) {
                throw new Error(`MCP server error: ${response.error.message || JSON.stringify(response.error)}`);
            }
            
            if (!response.result) {
                throw new Error('Missing result in response');
            }
            
            // Close manual connection UI
            closeManualConnectionUI();
            
            // Update status to connected
            updateConnectorStatus(serviceKey, 'connected');
            showNotification(`✅ Manual connection to ${config.name} successful!`, 'success');
            
            console.log(`[MCPQuickConnectors] Manual connection successful for ${serviceKey}`);
            
        } catch (jsonError) {
            // If not valid JSON, treat as error message
            console.log('[MCPQuickConnectors] Non-JSON response:', responseText);
            
            // Close manual connection UI
            closeManualConnectionUI();
            
            // Show the error message to user
            const errorMsg = responseText.toLowerCase().includes('unknown integration') 
                ? `GitHub MCP Server Error: "${responseText}"\n\nThe GitHub Copilot MCP server appears to require:\n• GitHub Copilot subscription\n• Copilot-specific authentication (not regular OAuth tokens)\n• Integration registration with GitHub\n\nThis service may be restricted to official GitHub Copilot integrations like VS Code.`
                : `Server responded with error: "${responseText}"`;
                
            alert(errorMsg);
            
            // Update status back to disconnected
            updateConnectorStatus(serviceKey, 'disconnected');
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
        clearOAuthConfig,
        completeConnectionAfterAuth,
        copyCurlCommand,
        closeManualConnectionUI,
        processManualConnectionResponse,
        // Manual OAuth flow functions
        showManualOAuthFlow,
        processDeviceCodeResponse,
        processTokenResponse,
        copyCommand,
        closeManualOAuthFlow
    };
})();