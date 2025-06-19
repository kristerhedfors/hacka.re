/**
 * MCP Quick Connectors Component - Refactored Main Coordinator
 * 
 * Coordinates between UI components, configuration, and connection logic
 * Service-specific logic has been extracted to separate modules
 */

window.MCPQuickConnectors = (function() {
    'use strict';

    let storageService = null;
    let oauthConfig = null;
    let oauthFlow = null;
    let mcpClient = null;
    let connectionStates = new Map();
    
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
            mcpClient: !!mcpClient,
            serviceConnectors: !!window.MCPServiceConnectors,
            quickConnectorsUI: !!window.QuickConnectorsUI,
            quickConnectorsConfig: !!window.QuickConnectorsConfig
        });
        
        if (!storageService) {
            console.warn('[MCPQuickConnectors] Required services not available - storageService:', !!storageService);
            return false;
        }
        
        // Load saved connector states
        loadConnectorStates();
        
        console.log('[MCPQuickConnectors] Initialized successfully');
        return true;
    }
    
    /**
     * Create quick connectors UI section
     */
    function createQuickConnectorsUI(container) {
        console.log('[MCPQuickConnectors] Creating quick connectors UI', container);
        
        if (!window.QuickConnectorsUI) {
            console.error('[MCPQuickConnectors] QuickConnectorsUI not available');
            return null;
        }
        
        return window.QuickConnectorsUI.createQuickConnectorsUI(container);
    }

    /**
     * Connect to a service using service connectors
     */
    async function connectToService(serviceKey) {
        console.log(`[MCPQuickConnectors] Connecting to ${serviceKey} via service connectors...`);
        
        if (!window.MCPServiceConnectors) {
            console.error('[MCPQuickConnectors] MCPServiceConnectors not available');
            throw new Error('Service connectors not available');
        }
        
        try {
            const success = await window.MCPServiceConnectors.connectService(serviceKey);
            
            if (success) {
                // Update connection state
                connectionStates.set(serviceKey, {
                    connected: true,
                    connectedAt: Date.now(),
                    method: 'service-connector'
                });
                
                // Save state
                saveConnectorStates();
                
                // Refresh UI
                if (window.QuickConnectorsUI) {
                    window.QuickConnectorsUI.refreshConnectorStates();
                }
                
                console.log(`[MCPQuickConnectors] Successfully connected to ${serviceKey}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`[MCPQuickConnectors] Error connecting to ${serviceKey}:`, error);
            throw error;
        }
    }

    /**
     * Connect to service using standard OAuth flow (for calendar)
     */
    async function connectToServiceOAuth(serviceKey) {
        console.log(`[MCPQuickConnectors] Connecting to ${serviceKey} via OAuth...`);
        
        const config = window.QuickConnectorsConfig?.getServiceConfig(serviceKey);
        if (!config) {
            throw new Error(`Unknown service: ${serviceKey}`);
        }
        
        if (!config.oauthConfig) {
            throw new Error(`No OAuth configuration for ${serviceKey}`);
        }
        
        try {
            // Show OAuth setup dialog
            const success = await showOAuthSetupDialog(serviceKey, config);
            
            if (success) {
                connectionStates.set(serviceKey, {
                    connected: true,
                    connectedAt: Date.now(),
                    method: 'oauth'
                });
                
                saveConnectorStates();
                
                if (window.QuickConnectorsUI) {
                    window.QuickConnectorsUI.refreshConnectorStates();
                }
                
                console.log(`[MCPQuickConnectors] Successfully connected to ${serviceKey} via OAuth`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`[MCPQuickConnectors] OAuth connection error for ${serviceKey}:`, error);
            throw error;
        }
    }

    /**
     * Show OAuth setup dialog
     */
    async function showOAuthSetupDialog(serviceKey, config) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'oauth-setup-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${config.name} OAuth Setup</h3>
                    
                    <div class="oauth-setup-instructions">
                        <h4>${config.setupInstructions.title}</h4>
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
                            <label for="${serviceKey}-oauth-client-id">OAuth Client ID</label>
                            <input type="text" 
                                   id="${serviceKey}-oauth-client-id" 
                                   placeholder="Your OAuth Client ID" 
                                   class="mcp-input" />
                            <small class="form-help">Your client ID will be used for OAuth authorization</small>
                        </div>
                        
                        <div class="form-actions">
                            <button class="btn primary-btn" id="${serviceKey}-start-oauth-flow">
                                Start OAuth Flow
                            </button>
                            <button class="btn secondary-btn" onclick="document.getElementById('oauth-setup-modal').remove()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            document.getElementById(`${serviceKey}-start-oauth-flow`).onclick = async () => {
                const clientId = document.getElementById(`${serviceKey}-oauth-client-id`).value.trim();
                
                if (!clientId) {
                    alert('Please enter your OAuth Client ID');
                    return;
                }
                
                // Update config with client ID
                config.oauthConfig.clientId = clientId;
                
                modal.remove();
                
                // Start OAuth flow using the existing OAuth flow manager
                try {
                    const success = await startOAuthFlow(serviceKey, config);
                    resolve(success);
                } catch (error) {
                    console.error('[MCPQuickConnectors] OAuth flow error:', error);
                    alert(`OAuth flow failed: ${error.message}`);
                    resolve(false);
                }
            };
        });
    }

    /**
     * Start OAuth authorization flow
     */
    async function startOAuthFlow(serviceKey, config) {
        if (!oauthConfig || !mcpClient) {
            throw new Error('OAuth services not available');
        }
        
        try {
            // Create OAuth connection using existing infrastructure
            const connectionId = `quick_${serviceKey}_${Date.now()}`;
            
            const success = await mcpClient.createOAuthConnection({
                id: connectionId,
                name: config.name,
                serverUrl: config.serverUrl,
                oauthConfig: config.oauthConfig
            });
            
            if (success) {
                // Store connection mapping
                connectionStates.set(serviceKey, {
                    connected: true,
                    connectedAt: Date.now(),
                    method: 'oauth',
                    connectionId: connectionId
                });
                
                console.log(`[MCPQuickConnectors] OAuth flow completed for ${serviceKey}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`[MCPQuickConnectors] OAuth flow error for ${serviceKey}:`, error);
            throw error;
        }
    }

    /**
     * Disconnect from a service
     */
    async function disconnectFromService(serviceKey) {
        console.log(`[MCPQuickConnectors] Disconnecting from ${serviceKey}...`);
        
        const state = connectionStates.get(serviceKey);
        if (!state) {
            console.warn(`[MCPQuickConnectors] No connection state found for ${serviceKey}`);
            return;
        }
        
        try {
            if (state.method === 'service-connector' && window.MCPServiceConnectors) {
                await window.MCPServiceConnectors.disconnectService(serviceKey);
            } else if (state.method === 'oauth' && state.connectionId && mcpClient) {
                await mcpClient.deleteConnection(state.connectionId);
            }
            
            // Remove connection state
            connectionStates.delete(serviceKey);
            saveConnectorStates();
            
            // Refresh UI
            if (window.QuickConnectorsUI) {
                window.QuickConnectorsUI.refreshConnectorStates();
            }
            
            console.log(`[MCPQuickConnectors] Successfully disconnected from ${serviceKey}`);
        } catch (error) {
            console.error(`[MCPQuickConnectors] Error disconnecting from ${serviceKey}:`, error);
            throw error;
        }
    }

    /**
     * Check if a service is connected
     */
    function isConnected(serviceKey) {
        // Check both quick connectors state and service connectors
        const quickState = connectionStates.has(serviceKey);
        const serviceState = window.MCPServiceConnectors?.isConnected(serviceKey) || false;
        
        return quickState || serviceState;
    }

    /**
     * Get connection status for all services
     */
    function getConnectionStatuses() {
        const statuses = {};
        const allConfigs = window.QuickConnectorsConfig?.getAllServiceConfigs() || {};
        
        Object.keys(allConfigs).forEach(serviceKey => {
            statuses[serviceKey] = isConnected(serviceKey);
        });
        
        return statuses;
    }

    /**
     * Load connector states from storage
     */
    async function loadConnectorStates() {
        try {
            if (!storageService) return;
            
            const savedStates = await storageService.getValue('mcp_quick_connector_states');
            if (savedStates) {
                connectionStates = new Map(Object.entries(savedStates));
                console.log('[MCPQuickConnectors] Loaded connector states:', connectionStates);
            }
        } catch (error) {
            console.error('[MCPQuickConnectors] Error loading connector states:', error);
        }
    }

    /**
     * Save connector states to storage
     */
    async function saveConnectorStates() {
        try {
            if (!storageService) return;
            
            const statesToSave = Object.fromEntries(connectionStates);
            await storageService.setValue('mcp_quick_connector_states', statesToSave);
            console.log('[MCPQuickConnectors] Saved connector states');
        } catch (error) {
            console.error('[MCPQuickConnectors] Error saving connector states:', error);
        }
    }

    /**
     * Refresh connection states
     */
    function refreshConnectionStates() {
        if (window.QuickConnectorsUI) {
            window.QuickConnectorsUI.refreshConnectorStates();
        }
    }

    // Public API
    return {
        init,
        createQuickConnectorsUI,
        connectToService,
        connectToServiceOAuth,
        disconnectFromService,
        isConnected,
        getConnectionStatuses,
        refreshConnectionStates,
        loadConnectorStates,
        saveConnectorStates
    };
})();