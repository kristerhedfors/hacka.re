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
        
        // Check all components are available
        if (!uiManager || !proxyManager || !serverManager || !commandHistory || !toolsManager) {
            console.error('[MCPManager] Missing required components');
            return;
        }
        
        // Initialize UI first
        if (!uiManager.init()) {
            console.error('[MCPManager] Failed to initialize UI');
            return;
        }
        
        // Initialize other components with dependencies
        proxyManager.init({
            uiManager: uiManager,
            notificationHandler: utils.showNotification
        });
        
        serverManager.init({
            MCPClient: window.MCPClientService,
            proxyManager: proxyManager,
            uiManager: uiManager,
            notificationHandler: utils.showNotification,
            commandHistoryManager: commandHistory
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
        
        // Update displays
        await serverManager.updateServersList();
        commandHistory.updateHistoryDisplay();
    }
    
    /**
     * Refresh all component states
     */
    async function refreshState() {
        await proxyManager.checkConnection();
        await serverManager.updateServersList();
        commandHistory.updateHistoryDisplay();
        
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
        
        // Tool management
        copyToolUsage: (serverName, toolName) => toolsManager.copyToolUsage(serverName, toolName),
        testTool: (serverName, toolName) => toolsManager.testTool(serverName, toolName)
    };
})();