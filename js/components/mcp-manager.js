/**
 * MCP Manager Component
 * 
 * Provides UI for managing MCP (Model Context Protocol) server connections
 * Integrates with hacka.re's existing modal system and function management
 */

window.MCPManager = (function() {
    const MCPClient = window.MCPClientService;
    
    // DOM elements - use existing elements from hacka.re
    let mcpButton = null;
    let mcpModal = null;
    let serversList = null;
    let addServerForm = null;
    let testProxyBtn = null;
    let proxyUrlInput = null;
    let proxyStatus = null;
    
    // State
    let proxyConnected = false;
    let currentProxyUrl = 'http://localhost:3001';
    
    /**
     * Initialize the MCP manager UI - integrate with existing hacka.re MCP system
     */
    function init() {
        if (!MCPClient) {
            console.error('[MCPManager] MCPClientService not available');
            return;
        }
        
        // Use existing MCP elements instead of creating new ones
        setupExistingElements();
        setupProxyConnection();
        loadSavedConnections();
    }
    
    /**
     * Setup existing MCP elements from hacka.re
     */
    function setupExistingElements() {
        // Get existing MCP elements
        mcpButton = document.getElementById('mcp-servers-btn');
        mcpModal = document.getElementById('mcp-servers-modal');
        serversList = document.getElementById('mcp-servers-list');
        addServerForm = document.getElementById('mcp-server-form');
        
        if (!mcpButton || !mcpModal || !serversList || !addServerForm) {
            console.error('[MCPManager] Could not find existing MCP elements');
            return false;
        }
        
        // Add missing MCP button click handler (the existing system is missing this!)
        mcpButton.addEventListener('click', showMCPModal);
        
        // Intercept form submission when connected to proxy - use capture to prevent other handlers
        addServerForm.addEventListener('submit', handleFormSubmission, true);
        
        return true;
    }
    
    /**
     * Setup proxy connection UI in the existing modal
     */
    function setupProxyConnection() {
        // Add proxy connection section to the existing modal
        const modalContent = mcpModal.querySelector('.modal-content');
        if (!modalContent) {
            console.error('[MCPManager] Could not find modal content');
            return;
        }
        
        // Find where to insert the proxy section (before the servers list)
        const serversContainer = modalContent.querySelector('.mcp-servers-container');
        if (!serversContainer) {
            console.error('[MCPManager] Could not find servers container');
            return;
        }
        
        // Create proxy connection section
        const proxySection = document.createElement('div');
        proxySection.className = 'mcp-proxy-section';
        proxySection.innerHTML = `
            <h3>MCP Stdio Proxy Connection</h3>
            <div class="proxy-connection">
                <div class="form-group">
                    <label for="mcp-proxy-url">Proxy URL</label>
                    <div class="proxy-url-container">
                        <input type="url" id="mcp-proxy-url" value="http://localhost:3001" placeholder="http://localhost:3001">
                        <button type="button" id="test-proxy-btn" class="btn secondary-btn">Test Connection</button>
                    </div>
                </div>
                <div id="proxy-status" class="proxy-status disconnected">
                    Not connected to proxy
                </div>
                <div id="server-instructions" class="server-instructions" style="display: none;">
                    <h4>✅ Proxy Connected - Start MCP Servers!</h4>
                    <p>You can now start <strong>stdio-based MCP servers</strong> as processes. Choose between simple command or JSON config format.</p>
                    
                    <div class="input-mode-toggle">
                        <label><input type="radio" name="input-mode" value="command" checked> Simple Command</label>
                        <label><input type="radio" name="input-mode" value="json"> JSON Config</label>
                    </div>
                    
                    <div id="command-examples" class="server-config-examples">
                        <h5>Example commands:</h5>
                        <div class="config-example">
                            <strong>Filesystem (npx):</strong>
                            <div class="config-fields">
                                <span>Command:</span> <code>npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop</code>
                            </div>
                        </div>
                        <div class="config-example">
                            <strong>Filesystem (Docker):</strong>
                            <div class="config-fields">
                                <span>Command:</span> <code>docker run -i --rm --mount type=bind,src=/Users/username/Desktop,dst=/projects/Desktop mcp/filesystem /projects</code>
                            </div>
                        </div>
                    </div>
                    
                    <div id="json-examples" class="server-config-examples" style="display: none;">
                        <h5>Example JSON configs:</h5>
                        <div class="config-example">
                            <strong>Filesystem (Docker):</strong>
                            <pre><code>{
  "name": "filesystem",
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "--mount", "type=bind,src=/Users/username/Desktop,dst=/projects/Desktop",
    "mcp/filesystem", "/projects"
  ]
}</code></pre>
                        </div>
                    </div>
                    
                    <p><strong>💡 Note:</strong> The form below adapts to your chosen input mode. Server name will be auto-detected or extracted from config.</p>
                </div>
                <p class="info-message">
                    First connect to the MCP stdio proxy. Start it with: <code>node mcp-stdio-proxy/server.js --debug</code>
                </p>
            </div>
        `;
        
        // Insert before the servers container
        modalContent.insertBefore(proxySection, serversContainer);
        
        // Get references to new elements
        proxyUrlInput = document.getElementById('mcp-proxy-url');
        proxyStatus = document.getElementById('proxy-status');
        testProxyBtn = document.getElementById('test-proxy-btn');
        
        // Set up event listeners
        testProxyBtn.addEventListener('click', testProxyConnection);
        proxyUrlInput.addEventListener('change', (e) => {
            currentProxyUrl = e.target.value;
        });
        
        // Set up input mode toggle handlers
        setupInputModeToggle();
        
        // Add styles
        addMCPStyles();
    }
    
    /**
     * Setup input mode toggle functionality
     */
    function setupInputModeToggle() {
        // Add event listeners after a short delay to ensure elements exist
        setTimeout(() => {
            const radioButtons = document.querySelectorAll('input[name="input-mode"]');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', handleInputModeChange);
            });
        }, 100);
    }
    
    /**
     * Handle input mode change between command and JSON
     * @param {Event} e - Radio button change event
     */
    function handleInputModeChange(e) {
        const mode = e.target.value;
        const commandExamples = document.getElementById('command-examples');
        const jsonExamples = document.getElementById('json-examples');
        
        if (mode === 'command') {
            if (commandExamples) commandExamples.style.display = 'block';
            if (jsonExamples) jsonExamples.style.display = 'none';
            updateFormForMode('command');
        } else if (mode === 'json') {
            if (commandExamples) commandExamples.style.display = 'none';
            if (jsonExamples) jsonExamples.style.display = 'block';
            updateFormForMode('json');
        }
    }
    
    /**
     * Update form fields based on input mode
     * @param {string} mode - 'command' or 'json'
     */
    function updateFormForMode(mode) {
        const urlLabel = document.querySelector('label[for="mcp-server-url"]');
        const urlInput = document.getElementById('mcp-server-url');
        
        if (mode === 'command') {
            if (urlLabel) urlLabel.textContent = 'Command';
            if (urlInput) {
                urlInput.placeholder = 'e.g., npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop';
                urlInput.style.height = 'auto';
            }
        } else if (mode === 'json') {
            if (urlLabel) urlLabel.textContent = 'JSON Configuration';
            if (urlInput) {
                urlInput.placeholder = '{\n  "name": "filesystem",\n  "command": "docker",\n  "args": ["run", "-i", "--rm", "..."]\n}';
                urlInput.style.height = '120px';
            }
        }
    }
    
    /**
     * Add MCP-specific styles
     */
    function addMCPStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mcp-proxy-section {
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                background-color: var(--input-bg);
            }
            
            .proxy-url-container {
                display: flex;
                gap: 10px;
                align-items: stretch;
            }
            
            .proxy-url-container input {
                flex: 1;
            }
            
            .proxy-status {
                margin: 10px 0;
                padding: 8px 12px;
                border-radius: var(--border-radius);
                font-size: 0.9em;
                font-weight: 500;
            }
            
            .proxy-status.connected {
                background-color: #d1fae5;
                color: #065f46;
                border: 1px solid #a7f3d0;
            }
            
            .proxy-status.disconnected {
                background-color: #fee2e2;
                color: #991b1b;
                border: 1px solid #fca5a5;
            }
            
            .proxy-status.testing {
                background-color: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            
            .info-message {
                background-color: var(--info-bg, #e3f2fd);
                color: var(--info-color, #1976d2);
                padding: 10px;
                border-radius: var(--border-radius);
                margin: 10px 0;
                font-size: 0.9em;
            }
            
            .server-instructions {
                background-color: #d1fae5;
                border: 1px solid #a7f3d0;
                border-radius: var(--border-radius);
                padding: 15px;
                margin: 15px 0;
            }
            
            .server-instructions h4 {
                margin: 0 0 10px 0;
                color: #065f46;
            }
            
            .server-instructions pre {
                background-color: #1f2937;
                color: #f9fafb;
                padding: 12px;
                border-radius: 4px;
                font-size: 0.85em;
                overflow-x: auto;
                margin: 10px 0;
            }
            
            .server-instructions ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            
            .server-instructions li {
                margin-bottom: 5px;
            }
            
            .server-instructions code {
                background-color: #374151;
                color: #f9fafb;
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 0.9em;
            }
            
            .server-config-examples {
                margin: 15px 0;
            }
            
            .server-config-examples h5 {
                margin: 0 0 10px 0;
                color: #065f46;
            }
            
            .config-example {
                background-color: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 10px;
            }
            
            .config-fields {
                font-family: monospace;
                font-size: 0.85em;
                margin-top: 5px;
                line-height: 1.4;
            }
            
            .config-fields span {
                font-weight: bold;
                color: #065f46;
            }
            
            /* Input mode toggle */
            .input-mode-toggle {
                display: flex;
                gap: 20px;
                margin: 15px 0;
                padding: 10px;
                background-color: #f0fdf4;
                border-radius: 4px;
                border: 1px solid #bbf7d0;
            }
            
            .input-mode-toggle label {
                display: flex;
                align-items: center;
                gap: 5px;
                font-weight: 500;
                color: #065f46;
                cursor: pointer;
            }
            
            .input-mode-toggle input[type="radio"] {
                margin: 0;
            }
            
            /* Form field transitions for show/hide */
            .form-group {
                transition: all 0.3s ease;
            }
            
            .form-group[style*="display: none"] {
                height: 0;
                overflow: hidden;
                margin: 0;
                padding: 0;
            }
            
            /* Server list items */
            .mcp-server-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                margin-bottom: 8px;
                background-color: var(--ai-msg-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
            }
            
            .mcp-server-info {
                flex: 1;
            }
            
            .mcp-server-name {
                font-weight: bold;
                font-size: 0.95em;
                margin-bottom: 4px;
            }
            
            .mcp-server-status {
                font-size: 0.85em;
                margin-bottom: 4px;
            }
            
            .mcp-server-status.running {
                color: #059669;
            }
            
            .mcp-server-status.stopped {
                color: #d97706;
            }
            
            .mcp-server-command {
                font-size: 0.8em;
                color: var(--text-secondary);
                font-family: monospace;
            }
            
            .mcp-server-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .mcp-server-actions button {
                padding: 6px 12px;
                font-size: 0.85em;
                border-radius: 4px;
                white-space: nowrap;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Show the MCP modal - integrate with existing modal system
     */
    function showMCPModal() {
        // Just open the existing modal and add our proxy section
        checkProxyConnection();
        if (proxyConnected) {
            updateServersList();
        }
        mcpModal.classList.add('active');
    }
    
    /**
     * Hide the MCP modal
     */
    function hideMCPModal() {
        mcpModal.classList.remove('active');
    }
    
    /**
     * Test server connection using existing form fields
     */
    async function testServerConnection() {
        const nameInput = document.getElementById('mcp-server-name');
        const urlInput = document.getElementById('mcp-server-url');
        
        const name = nameInput?.value.trim() || 'Test Server';
        const url = urlInput?.value.trim();
        
        if (!url) {
            alert('Please enter a server URL to test.');
            return;
        }
        
        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            alert('Please enter a valid URL.');
            return;
        }
        
        await testSpecificMcpServer({ url, name });
    }

    /**
     * Test proxy connection
     */
    async function testProxyConnection() {
        testProxyBtn.disabled = true;
        testProxyBtn.innerHTML = 'Testing...';
        proxyStatus.className = 'proxy-status testing';
        proxyStatus.innerHTML = 'Testing connection...';
        
        try {
            const response = await fetch(`${currentProxyUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                proxyConnected = true;
                proxyStatus.className = 'proxy-status connected';
                proxyStatus.innerHTML = `✅ Connected to MCP stdio proxy (${data.servers || 0} servers running)`;
                showNotification('Connected to MCP proxy - you can now add server configurations', 'success');
                updateServerInstructions();
                // Update the servers list to show any running servers
                updateServersList();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            proxyConnected = false;
            proxyStatus.className = 'proxy-status disconnected';
            proxyStatus.innerHTML = 'Connection failed';
            showNotification(`Proxy connection failed: ${error.message}`, 'error');
        } finally {
            testProxyBtn.disabled = false;
            testProxyBtn.innerHTML = 'Test Connection';
        }
    }
    
    /**
     * Check proxy connection automatically
     */
    async function checkProxyConnection() {
        if (!proxyStatus) {
            // If proxy status element doesn't exist yet, skip the check
            return;
        }
        
        try {
            const response = await fetch(`${currentProxyUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                proxyConnected = true;
                proxyStatus.className = 'proxy-status connected';
                proxyStatus.innerHTML = `✅ Connected to MCP stdio proxy (${data.servers || 0} servers running)`;
                updateServerInstructions();
                // Update the servers list to show any running servers
                updateServersList();
            } else {
                throw new Error('Not responding');
            }
        } catch (error) {
            proxyConnected = false;
            proxyStatus.className = 'proxy-status disconnected';
            proxyStatus.innerHTML = 'Not connected to proxy';
        }
    }
    
    /**
     * Generate server name from command and args
     * @param {string} command - Command to run
     * @param {Array} args - Command arguments
     * @returns {string} Generated server name
     */
    function generateServerName(command, args) {
        // Auto-generate server name from the MCP server package
        let serverName = 'mcp-server';
        
        for (const arg of args) {
            if (arg.includes('@modelcontextprotocol/server-')) {
                // Extract server type from package name
                const match = arg.match(/@modelcontextprotocol\/server-(.+)/);
                if (match) {
                    serverName = match[1];
                    break;
                }
            } else if (arg.includes('server-')) {
                // Extract from any server- pattern
                const match = arg.match(/server-(.+)/);
                if (match) {
                    serverName = match[1];
                    break;
                }
            } else if (arg.includes('mcp/')) {
                // Extract from docker image name like mcp/filesystem
                const match = arg.match(/mcp\/(.+)/);
                if (match) {
                    serverName = match[1];
                    break;
                }
            }
        }
        
        // If server name is still generic, add timestamp
        if (serverName === 'mcp-server') {
            serverName = `mcp-server-${Date.now()}`;
        }
        
        return serverName;
    }
    
    /**
     * Update server configuration instructions based on proxy connection
     */
    function updateServerInstructions() {
        const instructionsElement = document.getElementById('server-instructions');
        if (instructionsElement) {
            if (proxyConnected) {
                instructionsElement.style.display = 'block';
                updateFormLabels(true);
                // Initialize input mode to command mode
                setTimeout(() => {
                    const commandRadio = document.querySelector('input[name="input-mode"][value="command"]');
                    if (commandRadio) {
                        commandRadio.checked = true;
                        updateFormForMode('command');
                    }
                }, 100);
            } else {
                instructionsElement.style.display = 'none';
                updateFormLabels(false);
            }
        }
    }
    
    /**
     * Update form field labels based on proxy connection status
     * @param {boolean} isProxyConnected - Whether proxy is connected
     */
    function updateFormLabels(isProxyConnected) {
        const nameGroup = document.querySelector('label[for="mcp-server-name"]')?.parentElement;
        const nameInput = document.getElementById('mcp-server-name');
        const urlLabel = document.querySelector('label[for="mcp-server-url"]');
        const urlInput = document.getElementById('mcp-server-url');
        const descGroup = document.querySelector('label[for="mcp-server-description"]')?.parentElement;
        const submitBtn = document.querySelector('#mcp-server-form button[type="submit"]');
        
        if (isProxyConnected) {
            // Hide name field group - will be auto-detected
            if (nameGroup) nameGroup.style.display = 'none';
            if (nameInput) nameInput.removeAttribute('required');
            
            // Change URL field to command
            if (urlLabel) urlLabel.textContent = 'Command';
            if (urlInput) {
                urlInput.placeholder = 'e.g., npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop';
                urlInput.type = 'text';
                urlInput.setAttribute('required', 'required');
            }
            
            // Hide description field group - will be auto-detected
            if (descGroup) descGroup.style.display = 'none';
            
            // Update submit button text
            if (submitBtn) submitBtn.textContent = 'Start Server';
            
        } else {
            // Restore original form
            if (nameGroup) nameGroup.style.display = 'block';
            if (nameInput) nameInput.setAttribute('required', 'required');
            
            if (urlLabel) urlLabel.textContent = 'Server URL';
            if (urlInput) {
                urlInput.placeholder = 'Enter MCP server URL';
                urlInput.type = 'url';
                urlInput.setAttribute('required', 'required');
            }
            
            if (descGroup) descGroup.style.display = 'block';
            
            if (submitBtn) submitBtn.textContent = 'Connect Server';
        }
    }
    
    /**
     * Update the servers list to show proxy servers when connected
     */
    function updateServersList() {
        if (!proxyConnected || !serversList) {
            return;
        }
        
        // Fetch servers from proxy
        fetch(`${currentProxyUrl}/mcp/list`)
            .then(response => response.json())
            .then(data => {
                const servers = data.servers || [];
                
                if (servers.length === 0) {
                    serversList.innerHTML = '<div class="empty-mcp-servers-state"><p>No servers running. Add a server above.</p></div>';
                    return;
                }
                
                // Clear existing content
                serversList.innerHTML = '';
                
                // Create servers list
                servers.forEach(server => {
                    const serverItem = createProxyServerItem(server);
                    serversList.appendChild(serverItem);
                });
            })
            .catch(error => {
                console.error('[MCPManager] Failed to fetch proxy servers:', error);
                if (serversList) {
                    serversList.innerHTML = '<div class="empty-mcp-servers-state"><p>Failed to load servers list</p></div>';
                }
            });
    }
    
    /**
     * Create a server item for proxy-managed servers
     * @param {Object} server - Server info from proxy
     * @returns {HTMLElement} Server item element
     */
    function createProxyServerItem(server) {
        const serverItem = document.createElement('div');
        serverItem.className = 'mcp-server-item';
        
        // Check if MCP client has an active connection to this server
        const hasActiveConnection = MCPClient && MCPClient.getConnectionInfo(server.name) !== null;
        
        const statusClass = hasActiveConnection ? 'running' : 'stopped';
        const statusText = hasActiveConnection ? 'Connected & Tools Loaded' : 'Process Running';
        const statusIcon = hasActiveConnection ? '✅' : '🔄';
        
        serverItem.innerHTML = `
            <div class="mcp-server-info">
                <div class="mcp-server-name">${server.name}</div>
                <div class="mcp-server-status ${statusClass}">${statusIcon} ${statusText}</div>
                <div class="mcp-server-command">${server.command} ${server.args.join(' ')}</div>
            </div>
            <div class="mcp-server-actions">
                ${!hasActiveConnection ? `
                    <button class="btn primary-btn load-tools-btn" onclick="MCPManager.connectToServer('${server.name}')">
                        Connect & Load Tools
                    </button>
                ` : `
                    <button class="btn secondary-btn" onclick="MCPManager.refreshServerTools('${server.name}')">
                        Refresh Tools
                    </button>
                `}
                <button class="btn danger-btn" onclick="MCPManager.stopProxyServer('${server.name}')">
                    Stop
                </button>
            </div>
        `;
        
        return serverItem;
    }
    
    /**
     * Connect to a server via the proxy and load its tools
     * @param {string} serverName - Name of the server to connect to
     */
    async function connectToServer(serverName) {
        try {
            showNotification(`Connecting to ${serverName}...`, 'info');
            
            // Use the MCPClientService to properly connect to the server
            const config = {
                transport: {
                    type: 'stdio',
                    proxyUrl: currentProxyUrl,
                    // The server is already running via the proxy, so we don't need to start it
                    command: 'echo',  // Dummy command since server is already running
                    args: []
                }
            };
            
            // Connect using the MCP Client Service
            await MCPClient.connect(serverName, config, {
                onNotification: handleServerNotification
            });
            
            // The MCP Client Service will automatically fetch and register tools
            const connectionInfo = MCPClient.getConnectionInfo(serverName);
            if (connectionInfo && connectionInfo.tools) {
                showNotification(`✅ Connected to ${serverName} - loaded ${connectionInfo.tools.length} tools`, 'success');
            }
            
            // Update the servers list to show connected status
            updateServersList();
            
        } catch (error) {
            console.error(`Failed to connect to ${serverName}:`, error);
            showNotification(`Failed to connect to ${serverName}: ${error.message}`, 'error');
        }
    }
    
    /**
     * Generate JavaScript function code for an MCP tool
     * @param {string} serverName - Name of the MCP server
     * @param {Object} tool - Tool definition
     * @returns {string} JavaScript function code
     */
    function generateMCPFunctionCode(serverName, tool) {
        return `/**
 * ${tool.description || `MCP tool ${tool.name} from ${serverName}`}
 * @description ${tool.description || `Calls ${tool.name} on MCP server ${serverName}`}
 * @tool This function calls an MCP tool via the proxy
 */
async function mcp_${serverName}_${tool.name}(args) {
    try {
        // Call the MCP tool via the proxy
        const toolCallMessage = {
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: {
                name: '${tool.name}',
                arguments: args || {}
            }
        };
        
        const response = await fetch('${currentProxyUrl}/mcp/command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Server-Name': '${serverName}'
            },
            body: JSON.stringify(toolCallMessage)
        });
        
        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        // For now, return success - in a real implementation, we'd parse the SSE response
        return {
            success: true,
            message: 'Tool call sent to ${serverName}',
            server: '${serverName}',
            tool: '${tool.name}',
            arguments: args || {}
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            server: '${serverName}',
            tool: '${tool.name}'
        };
    }
}`;
    }
    
    /**
     * Stop a server via the proxy
     * @param {string} serverName - Name of the server to stop
     */
    async function stopProxyServer(serverName) {
        if (!confirm(`Stop server ${serverName}?`)) {
            return;
        }
        
        try {
            // First disconnect from MCP client if connected
            if (MCPClient.getConnectionInfo(serverName)) {
                await MCPClient.disconnect(serverName);
            }
            
            const response = await fetch(`${currentProxyUrl}/mcp/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: serverName })
            });
            
            if (response.ok) {
                showNotification(`Stopped server ${serverName}`, 'info');
                updateServersList();
                checkProxyConnection();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to stop server');
            }
        } catch (error) {
            console.error(`Failed to stop server ${serverName}:`, error);
            showNotification(`Failed to stop server: ${error.message}`, 'error');
        }
    }
    
    /**
     * Refresh tools from a connected server
     * @param {string} serverName - Name of the server to refresh
     */
    async function refreshServerTools(serverName) {
        try {
            // Check if we have an active connection
            if (!MCPClient.getConnectionInfo(serverName)) {
                showNotification(`Not connected to ${serverName}. Connecting now...`, 'info');
                await connectToServer(serverName);
                return;
            }
            
            await MCPClient.refreshServerCapabilities(serverName);
            showNotification(`Refreshed tools from ${serverName}`, 'success');
            updateServersList();
        } catch (error) {
            console.error(`Failed to refresh server ${serverName}:`, error);
            showNotification(`Failed to refresh server: ${error.message}`, 'error');
        }
    }
    
    /**
     * Update the connections list in the modal
     * @deprecated - replaced by updateServersList
     */
    function updateConnectionsList() {
        const connections = MCPClient.getActiveConnections();
        
        if (connections.length === 0) {
            connectionsList.innerHTML = '<p class="no-connections">No active connections</p>';
            return;
        }
        
        connectionsList.innerHTML = '';
        
        for (const serverName of connections) {
            const info = MCPClient.getConnectionInfo(serverName);
            if (!info) continue;
            
            const connectionEl = document.createElement('div');
            connectionEl.className = 'connection-item';
            
            const toolCount = info.tools.length;
            const resourceCount = info.resources.length;
            const promptCount = info.prompts.length;
            
            connectionEl.innerHTML = `
                <div class="connection-info">
                    <div class="connection-name">${serverName}</div>
                    <div class="connection-details">
                        Transport: ${info.transport}
                    </div>
                    <div class="connection-tools">
                        <i class="fas fa-tools"></i> ${toolCount} tools
                        <i class="fas fa-database"></i> ${resourceCount} resources
                        <i class="fas fa-comment-dots"></i> ${promptCount} prompts
                    </div>
                </div>
                <div class="connection-actions">
                    <button class="secondary-button" onclick="MCPManager.refreshConnection('${serverName}')">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                    <button class="danger-button" onclick="MCPManager.disconnectServer('${serverName}')">
                        <i class="fas fa-times"></i> Disconnect
                    </button>
                </div>
            `;
            
            connectionsList.appendChild(connectionEl);
        }
    }
    
    /**
     * Update the tools list in the modal
     */
    function updateToolsList() {
        const connections = MCPClient.getActiveConnections();
        
        if (connections.length === 0) {
            toolsList.innerHTML = '<p class="no-tools">No tools available</p>';
            return;
        }
        
        toolsList.innerHTML = '';
        
        for (const serverName of connections) {
            const info = MCPClient.getConnectionInfo(serverName);
            if (!info || info.tools.length === 0) continue;
            
            const serverGroup = document.createElement('div');
            serverGroup.className = 'server-tools-group';
            
            // Server header
            const serverHeader = document.createElement('div');
            serverHeader.className = 'server-header';
            serverHeader.innerHTML = `
                <div class="server-name">
                    <i class="fas fa-server"></i>
                    ${serverName}
                </div>
                <div class="server-stats">
                    ${info.tools.length} tool${info.tools.length !== 1 ? 's' : ''}
                </div>
                <div class="expand-icon">
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
            
            // Tools container
            const toolsContainer = document.createElement('div');
            toolsContainer.className = 'tools-container';
            
            // Add tools
            for (const tool of info.tools) {
                const toolItem = document.createElement('div');
                toolItem.className = 'tool-item';
                
                toolItem.innerHTML = `
                    <div class="tool-info">
                        <div class="tool-name">${tool.name}</div>
                        <div class="tool-description">${tool.description || 'No description available'}</div>
                    </div>
                    <div class="tool-actions">
                        <button class="copy-tool-btn" onclick="MCPManager.copyToolUsage('${serverName}', '${tool.name}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="test-tool-btn" onclick="MCPManager.testTool('${serverName}', '${tool.name}')">
                            <i class="fas fa-play"></i> Test
                        </button>
                    </div>
                `;
                
                toolsContainer.appendChild(toolItem);
            }
            
            // Click handler for expand/collapse
            serverHeader.addEventListener('click', () => {
                const isExpanded = serverHeader.classList.contains('expanded');
                
                if (isExpanded) {
                    serverHeader.classList.remove('expanded');
                    toolsContainer.classList.remove('expanded');
                    serverHeader.querySelector('.expand-icon').classList.remove('expanded');
                } else {
                    serverHeader.classList.add('expanded');
                    toolsContainer.classList.add('expanded');
                    serverHeader.querySelector('.expand-icon').classList.add('expanded');
                }
            });
            
            serverGroup.appendChild(serverHeader);
            serverGroup.appendChild(toolsContainer);
            toolsList.appendChild(serverGroup);
        }
    }
    
    /**
     * Copy tool usage example to clipboard
     * @param {string} serverName - Name of the server
     * @param {string} toolName - Name of the tool
     */
    function copyToolUsage(serverName, toolName) {
        const functionName = `mcp_${serverName}_${toolName}`;
        const usage = `${functionName}({ /* parameters */ })`;
        
        navigator.clipboard.writeText(usage).then(() => {
            showNotification(`Copied ${functionName} usage to clipboard`, 'success');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            showNotification('Failed to copy to clipboard', 'error');
        });
    }
    
    /**
     * Test a tool with sample parameters
     * @param {string} serverName - Name of the server
     * @param {string} toolName - Name of the tool
     */
    async function testTool(serverName, toolName) {
        try {
            // Get tool info to show parameters
            const info = MCPClient.getConnectionInfo(serverName);
            const tool = info.tools.find(t => t.name === toolName);
            
            if (!tool) {
                showNotification('Tool not found', 'error');
                return;
            }
            
            // For now, just show info about the tool
            const message = `Tool: ${toolName}\nDescription: ${tool.description || 'No description'}\n\nTo test this tool, use it in chat with the function name: mcp_${serverName}_${toolName}`;
            alert(message);
            
            // In the future, this could open a parameter input dialog
        } catch (error) {
            console.error('Failed to test tool:', error);
            showNotification(`Failed to test tool: ${error.message}`, 'error');
        }
    }
    
    /**
     * Load tools from a server via the MCP client
     * @param {string} serverName - Name of the server
     */
    async function loadServerTools(serverName) {
        try {
            // Use the existing MCP client to connect to this server via the proxy
            const config = {
                transport: {
                    type: 'stdio',
                    proxyUrl: currentProxyUrl,
                    // These aren't used since the server is already running,
                    // but the MCP client expects them
                    command: 'echo',
                    args: []
                }
            };
            
            await MCPClient.connect(serverName, config, {
                onNotification: handleServerNotification
            });
            
            updateToolsList();
            showNotification(`Loaded tools from ${serverName}`, 'success');
        } catch (error) {
            console.error(`Failed to load tools from ${serverName}:`, error);
            showNotification(`Failed to load tools: ${error.message}`, 'error');
        }
    }
    
    /**
     * Stop a server via the proxy
     * @param {string} serverName - Name of the server to stop
     */
    async function stopServer(serverName) {
        if (!confirm(`Stop server ${serverName}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${currentProxyUrl}/mcp/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: serverName })
            });
            
            if (response.ok) {
                updateServersList();
                updateToolsList();
                showNotification(`Stopped server ${serverName}`, 'info');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to stop server');
            }
        } catch (error) {
            console.error(`Failed to stop server ${serverName}:`, error);
            showNotification(`Failed to stop server: ${error.message}`, 'error');
        }
    }
    
    /**
     * Refresh a server (restart it)
     * @param {string} serverName - Name of the server to refresh
     */
    async function refreshServer(serverName) {
        try {
            // For now, just refresh the UI
            updateServersList();
            showNotification(`Refreshed ${serverName}`, 'success');
        } catch (error) {
            console.error(`Failed to refresh server ${serverName}:`, error);
            showNotification(`Failed to refresh server: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle form submission - route to proxy or existing system based on connection
     * @param {Event} e - Form submit event
     */
    async function handleFormSubmission(e) {
        if (proxyConnected) {
            // Use stdio proxy for server management
            e.preventDefault();
            e.stopPropagation(); // Prevent other handlers from running
            await handleStdioServerSubmission(e);
        }
        // If not connected to proxy, let the existing function-calling-manager handle it
        // (don't preventDefault, let it bubble up)
    }
    
    /**
     * Handle stdio server submission via proxy
     * @param {Event} e - Form submit event
     */
    async function handleStdioServerSubmission(e) {
        const input = document.getElementById('mcp-server-url').value.trim();
        const selectedMode = document.querySelector('input[name="input-mode"]:checked')?.value || 'command';
        
        if (!input) {
            alert('Please provide input.\n\nExample command: npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop\n\nExample JSON: {"name": "filesystem", "command": "docker", "args": [...]}');
            return;
        }
        
        let serverName, command, args;
        
        if (selectedMode === 'json') {
            // Parse JSON configuration
            try {
                const config = JSON.parse(input);
                
                if (!config.command) {
                    alert('JSON config must include "command" field.');
                    return;
                }
                
                serverName = config.name || 'mcp-server';
                command = config.command;
                args = config.args || [];
                
                // Auto-generate name if not provided
                if (!config.name) {
                    serverName = generateServerName(command, args);
                }
                
            } catch (error) {
                alert('Invalid JSON format.\n\nExample:\n{\n  "name": "filesystem",\n  "command": "docker",\n  "args": ["run", "-i", "--rm", "..."]\n}');
                return;
            }
        } else {
            // Parse simple command
            const commandParts = input.split(/\s+/).filter(part => part);
            if (commandParts.length === 0) {
                alert('Invalid command format.');
                return;
            }
            
            command = commandParts[0];
            args = commandParts.slice(1);
            serverName = generateServerName(command, args);
        }
        
        try {
            const submitButton = addServerForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = 'Starting...';
            
            const response = await fetch(`${currentProxyUrl}/mcp/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: serverName,
                    command: command,
                    args: args
                })
            });
            
            if (response.ok) {
                // Clear form
                document.getElementById('mcp-server-url').value = '';
                
                showNotification(`🚀 Started MCP server "${serverName}"`, 'success');
                
                // Update connection status and servers list  
                setTimeout(() => {
                    checkProxyConnection();
                    updateServersList();
                }, 1000); // Give server time to start
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start server');
            }
        } catch (error) {
            console.error(`Failed to start stdio server ${serverName}:`, error);
            showNotification(`Failed to start server: ${error.message}`, 'error');
        } finally {
            const submitButton = addServerForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Start Server';
        }
    }
    
    /**
     * Disconnect from a server
     * @param {string} serverName - Name of the server to disconnect
     */
    async function disconnectServer(serverName) {
        if (!confirm(`Disconnect from ${serverName}?`)) {
            return;
        }
        
        try {
            await MCPClient.disconnect(serverName);
            updateConnectionsList();
            updateToolsList();
            showNotification(`Disconnected from ${serverName}`, 'info');
        } catch (error) {
            console.error(`[MCPManager] Failed to disconnect from ${serverName}:`, error);
            showNotification(`Failed to disconnect: ${error.message}`, 'error');
        }
    }
    
    /**
     * Refresh server capabilities
     * @param {string} serverName - Name of the server to refresh
     */
    async function refreshConnection(serverName) {
        try {
            await MCPClient.refreshServerCapabilities(serverName);
            updateConnectionsList();
            updateToolsList();
            showNotification(`Refreshed ${serverName}`, 'success');
        } catch (error) {
            console.error(`[MCPManager] Failed to refresh ${serverName}:`, error);
            showNotification(`Failed to refresh: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle server notifications
     * @param {string} serverName - Name of the server
     * @param {Object} notification - Notification message
     */
    function handleServerNotification(serverName, notification) {
        console.log(`[MCPManager] Notification from ${serverName}:`, notification);
        
        // You could show notifications in the UI here
        if (notification.method === 'notifications/message' && notification.params) {
            const { level, message } = notification.params;
            if (level === 'error') {
                showNotification(`${serverName}: ${message}`, 'error');
            }
        }
    }
    
    /**
     * Save connection configuration to localStorage
     * @param {string} name - Server name
     * @param {Object} config - Server configuration
     */
    function saveConnectionConfig(name, config) {
        const savedConnections = getSavedConnections();
        savedConnections[name] = config;
        localStorage.setItem('mcp-connections', JSON.stringify(savedConnections));
    }
    
    /**
     * Get saved connection configurations
     * @returns {Object} Saved connections object
     */
    function getSavedConnections() {
        try {
            return JSON.parse(localStorage.getItem('mcp-connections') || '{}');
        } catch (error) {
            console.error('[MCPManager] Failed to parse saved connections:', error);
            return {};
        }
    }
    
    /**
     * Load and connect to saved connections
     */
    async function loadSavedConnections() {
        const savedConnections = getSavedConnections();
        
        for (const [name, config] of Object.entries(savedConnections)) {
            try {
                await MCPClient.connect(name, config, {
                    onNotification: handleServerNotification
                });
                console.log(`[MCPManager] Auto-connected to ${name}`);
            } catch (error) {
                console.error(`[MCPManager] Failed to auto-connect to ${name}:`, error);
            }
        }
    }
    
    /**
     * Show a notification to the user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    function showNotification(message, type = 'info') {
        // For now, just log to console
        // In a real implementation, this would show a toast notification
        console.log(`[MCPManager][${type.toUpperCase()}] ${message}`);
        
        // You could integrate with hacka.re's existing notification system here
        if (window.ChatManager && window.ChatManager.addSystemMessage) {
            const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
            window.ChatManager.addSystemMessage(`${icon} MCP: ${message}`);
        }
    }
    
    // Public API - minimal integration with existing MCP system
    return {
        init,
        testProxyConnection,
        connectToServer,
        stopProxyServer,
        refreshServerTools
    };
})();