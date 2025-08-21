/**
 * MCP Manager Component
 * 
 * Orchestrates MCP sub-components for managing Model Context Protocol servers
 * This is a lightweight coordinator that delegates to specialized components
 */

window.MCPManager = (function() {
    // Component instances
    let uiManager = null;
    let proxyManager = null;
    let serverManager = null;
    let commandHistory = null;
    let toolsManager = null;
    let utils = null;
    let oauthIntegration = null;
    let quickConnectors = null;
    
    // Initialize state
    let initialized = false;
    
    /**
     * Initialize the MCP manager and all sub-components
     */
    function init() {
        if (initialized) {
            console.log('[MCPManager] Already initialized');
            return;
        }
        
        // Check for required dependencies
        if (!window.MCPClientService) {
            console.error('[MCPManager] MCPClientService not available');
            return;
        }
        
        
        // Get component references
        uiManager = window.MCPUIManager;
        proxyManager = window.MCPProxyManager;
        serverManager = window.MCPServerManager;
        commandHistory = window.MCPCommandHistory;
        toolsManager = window.MCPToolsManager;
        utils = window.MCPUtils || { showNotification: console.log };
        oauthIntegration = window.MCPOAuthIntegration;
        quickConnectors = window.MCPQuickConnectors;
        
        // Check all components are available
        const missingComponents = [];
        if (!uiManager) missingComponents.push('MCPUIManager');
        if (!proxyManager) missingComponents.push('MCPProxyManager');
        if (!serverManager) missingComponents.push('MCPServerManager');
        if (!commandHistory) missingComponents.push('MCPCommandHistory');
        if (!toolsManager) missingComponents.push('MCPToolsManager');
        
        if (missingComponents.length > 0) {
            console.error('[MCPManager] Missing required components:', missingComponents);
            console.log('[MCPManager] Available components:', {
                uiManager: !!uiManager,
                proxyManager: !!proxyManager,
                serverManager: !!serverManager,
                commandHistory: !!commandHistory,
                toolsManager: !!toolsManager,
                quickConnectors: !!quickConnectors
            });
            return;
        }
        
        // Initialize UI first
        if (!uiManager.init()) {
            console.error('[MCPManager] Failed to initialize UI');
            return;
        }
        
        // Initialize other components with dependencies
        serverManager.init({
            MCPClient: window.MCPClientService,
            proxyManager: proxyManager,
            uiManager: uiManager,
            notificationHandler: utils.showNotification,
            commandHistoryManager: commandHistory
        });
        
        proxyManager.init({
            uiManager: uiManager,
            notificationHandler: utils.showNotification,
            serverManager: serverManager
        });
        
        commandHistory.init({
            uiManager: uiManager,
            notificationHandler: utils.showNotification
        });
        
        toolsManager.init({
            MCPClient: window.MCPClientService,
            notificationHandler: utils.showNotification
        });
        
        // Initialize OAuth integration if available
        if (oauthIntegration) {
            if (oauthIntegration.init()) {
                console.log('[MCPManager] OAuth integration initialized');
            } else {
                console.warn('[MCPManager] OAuth integration failed to initialize');
            }
        }
        
        // Initialize quick connectors if available
        if (quickConnectors) {
            console.log('[MCPManager] Attempting to initialize quick connectors');
            if (quickConnectors.init()) {
                console.log('[MCPManager] Quick connectors initialized');
            } else {
                console.warn('[MCPManager] Quick connectors failed to initialize');
            }
        } else {
            console.warn('[MCPManager] Quick connectors component not available');
        }
        
        // Setup initial state
        setupEventHandlers();
        checkInitialState();
        
        initialized = true;
        console.log('[MCPManager] Initialization complete');
    }
    
    /**
     * Setup event handlers and connections between components
     */
    function setupEventHandlers() {
        // When modal is shown, refresh state
        const originalShowModal = uiManager.showModal;
        uiManager.showModal = function() {
            originalShowModal.call(uiManager);
            refreshState();
        };
    }
    
    /**
     * Check initial state on load
     */
    async function checkInitialState() {
        // Check proxy connection
        await proxyManager.checkConnection();
        
        // Load saved connections
        await serverManager.loadSavedConnections();
        
        // Load service manager connections (GitHub, Shodan, etc.)
        if (window.mcpServiceManager) {
            try {
                await window.mcpServiceManager.loadStoredConnections();
                console.log('[MCPManager] Loaded service manager connections');
            } catch (error) {
                console.warn('[MCPManager] Failed to load service manager connections:', error);
            }
        }
        
        // Update displays
        await serverManager.updateServersList();
        commandHistory.updateHistoryDisplay();
        
        // Update quick connectors status after connections are restored
        if (quickConnectors) {
            quickConnectors.updateAllConnectorStatuses();
            console.log('[MCPManager] Updated quick connectors status after restore');
        }
    }
    
    /**
     * Refresh all component states
     */
    async function refreshState() {
        await proxyManager.checkConnection();
        await serverManager.updateServersList();
        commandHistory.updateHistoryDisplay();
        
        // Update quick connectors status to ensure UI is in sync
        if (quickConnectors) {
            quickConnectors.updateAllConnectorStatuses();
        }
        
        // Ensure form visibility is properly set
        if (oauthIntegration) {
            const transportSelect = document.getElementById('mcp-transport-type');
            if (transportSelect) {
                oauthIntegration.updateFormVisibility(transportSelect.value);
            }
        }
        
        // Ensure all form fields are visible and not modified by old systems
        const serverNameField = document.getElementById('mcp-server-name');
        if (serverNameField && serverNameField.parentElement) {
            serverNameField.parentElement.style.display = '';
        }
    }
    
    // Public API - expose key functions from sub-components
    return {
        init,
        
        // Proxy management
        testProxyConnection: () => proxyManager.testConnection(),
        
        // Server management  
        connectToServer: (serverName) => serverManager.connectToServer(serverName),
        stopProxyServer: (serverName) => serverManager.stopServer(serverName),
        refreshServerTools: (serverName) => serverManager.refreshServerTools(serverName),
        
        // Command history
        startFromHistory: (entry) => commandHistory.startFromHistory(entry),
        confirmDeleteHistory: (entryId) => commandHistory.confirmDelete(entryId),
        
        // Utilities
        copyExampleCommand: (command) => utils.copyToClipboard(command, 'Example copied to clipboard'),
        quickConnectCommand: (inputId) => {
            const input = document.getElementById(inputId);
            if (!input) {
                console.error('[MCPManager] Quick connect input not found:', inputId);
                return;
            }
            const command = input.value.trim();
            if (!command) {
                utils.showNotification('Please enter a command first', 'error');
                return;
            }
            
            // Fill the command into the main form and submit
            const commandInput = document.getElementById('mcp-server-command');
            const commandModeRadio = document.querySelector('input[name="input-mode"][value="command"]');
            
            if (commandInput && commandModeRadio) {
                // Switch to command mode
                commandModeRadio.checked = true;
                commandModeRadio.dispatchEvent(new Event('change'));
                
                // Fill the command
                commandInput.value = command;
                
                // Auto-extract server name from command
                const serverNameInput = document.getElementById('mcp-server-name');
                if (serverNameInput) {
                    let serverName = '';
                    if (command.includes('server-filesystem')) {
                        serverName = 'filesystem';
                    } else if (command.includes('server-memory')) {
                        serverName = 'memory';
                    } else if (command.includes('mcp/filesystem')) {
                        serverName = 'filesystem-docker';
                    } else {
                        serverName = 'mcp-server';
                    }
                    serverNameInput.value = serverName;
                }
                
                // Submit the form
                const form = document.getElementById('mcp-server-form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                } else {
                    console.error('[MCPManager] Could not find MCP server form');
                }
            } else {
                console.error('[MCPManager] Could not find command form elements');
            }
        },
        
        // Tool management
        copyToolUsage: (serverName, toolName) => toolsManager.copyToolUsage(serverName, toolName),
        testTool: (serverName, toolName) => toolsManager.testTool(serverName, toolName)
    };
})();