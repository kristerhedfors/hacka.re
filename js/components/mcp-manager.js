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
    let commandHistoryList = null;
    
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
        commandHistoryList = document.getElementById('mcp-command-history');
        
        if (!mcpButton || !mcpModal || !serversList || !addServerForm || !commandHistoryList) {
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
        
        // Create proxy connection section - using standard modal patterns
        const proxySection = document.createElement('div');
        proxySection.innerHTML = `
            <h3>MCP Stdio Proxy Connection</h3>
            <div class="form-group">
                <label for="mcp-proxy-url">Proxy URL</label>
                <div style="display: flex; gap: 0.5rem; align-items: stretch;">
                    <input type="url" id="mcp-proxy-url" value="http://localhost:3001" placeholder="http://localhost:3001" style="flex: 1;">
                    <button type="button" id="test-proxy-btn" class="btn secondary-btn">Test Connection</button>
                </div>
            </div>
            <div id="proxy-status" class="proxy-status disconnected">
                Not connected to proxy
            </div>
            <div id="server-instructions" style="display: none;">
                <h4>✅ Proxy Connected - Start MCP Servers!</h4>
                <p class="form-help">You can now start <strong>stdio-based MCP servers</strong> as processes. Choose between simple command or JSON config format.</p>
                
                <div class="form-group">
                    <label>Input Mode</label>
                    <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: normal;">
                            <input type="radio" name="input-mode" value="command" checked> Simple Command
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: normal;">
                            <input type="radio" name="input-mode" value="json"> JSON Config
                        </label>
                    </div>
                </div>
                
                <div id="command-examples">
                    <p class="form-help"><strong>Example commands:</strong></p>
                    <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); margin-bottom: 0.5rem; position: relative;">
                        <strong>Filesystem (npx):</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy command">
                            <i class="fas fa-copy"></i>
                        </button><br>
                        <code style="font-size: 0.85rem;">npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop</code>
                    </div>
                    <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); position: relative;">
                        <strong>Filesystem (Docker):</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('docker run -i --rm --mount type=bind,src=/Users/username/Desktop,dst=/projects/Desktop mcp/filesystem /projects')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy command">
                            <i class="fas fa-copy"></i>
                        </button><br>
                        <code style="font-size: 0.85rem;">docker run -i --rm --mount type=bind,src=/Users/username/Desktop,dst=/projects/Desktop mcp/filesystem /projects</code>
                    </div>
                </div>
                
                <div id="json-examples" style="display: none;">
                    <p class="form-help"><strong>Example JSON config:</strong></p>
                    <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); position: relative;">
                        <strong>Filesystem (Docker):</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('{\n  \"name\": \"filesystem\",\n  \"command\": \"docker\",\n  \"args\": [\n    \"run\", \"-i\", \"--rm\",\n    \"--mount\", \"type=bind,src=/Users/username/Desktop,dst=/projects/Desktop\",\n    \"mcp/filesystem\", \"/projects\"\n  ]\n}')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy JSON config">
                            <i class="fas fa-copy"></i>
                        </button>
                        <pre style="margin: 0.5rem 0 0 0; font-size: 0.8rem; background: var(--dark-color); color: var(--light-text); padding: 0.5rem; border-radius: 4px; overflow-x: auto;"><code>{
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
                
                <p class="form-help"><strong>💡 Note:</strong> The form below adapts to your chosen input mode. Server name will be auto-detected or extracted from config.</p>
            </div>
            <div style="background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 0.75rem; border-radius: var(--border-radius); margin: 1rem 0;">
                <p class="form-help" style="margin: 0;">First connect to the MCP stdio proxy. Start it with: <code>node mcp-stdio-proxy/server.js --debug</code></p>
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
            /* MCP Status indicators using existing color variables */
            .proxy-status {
                margin: 0.75rem 0;
                padding: 0.75rem;
                border-radius: var(--border-radius);
                font-size: 0.9em;
                font-weight: 500;
            }
            
            .proxy-status.connected {
                background-color: var(--secondary-color);
                color: white;
            }
            
            .proxy-status.disconnected {
                background-color: #ef4444;
                color: white;
            }
            
            .proxy-status.testing {
                background-color: var(--accent-color);
                color: white;
            }
            
            /* Override existing MCP server item for proxy servers layout */
            .mcp-server-item.proxy-server {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                flex-direction: row;
            }
            
            .mcp-server-item.proxy-server .mcp-server-info {
                flex: 1;
                margin-right: 1rem;
            }
            
            .mcp-server-item.proxy-server .mcp-server-actions {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                flex-shrink: 0;
                min-width: 120px;
            }
            
            .mcp-server-item.proxy-server .mcp-server-actions .btn {
                white-space: normal;
                text-align: center;
                line-height: 1.2;
            }
            
            /* Command History using existing patterns */
            .mcp-command-history-section {
                margin-bottom: 1.5rem;
            }
            
            .history-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem;
                margin-bottom: 0.5rem;
                background-color: var(--ai-msg-bg);
                border-radius: var(--border-radius);
                border: 1px solid rgba(0, 0, 0, 0.1);
                transition: var(--transition);
            }
            
            .history-item:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            .history-item-info {
                flex: 1;
                cursor: pointer;
            }
            
            .history-item-command {
                font-family: monospace;
                font-size: 0.9em;
                margin-bottom: 0.25rem;
                color: var(--text-color);
                word-break: break-all;
            }
            
            .history-item-meta {
                font-size: 0.85rem;
                color: rgba(0, 0, 0, 0.6);
            }
            
            .history-item-actions {
                display: flex;
                gap: 0.5rem;
                flex-shrink: 0;
            }
            
            .history-item-actions .btn {
                padding: 0.25rem 0.5rem;
                font-size: 0.8rem;
            }
            
            .empty-history-state {
                text-align: center;
                color: rgba(0, 0, 0, 0.6);
                font-style: italic;
                padding: 1.5rem;
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
        updateCommandHistory();
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
        serverItem.className = 'mcp-server-item proxy-server';
        
        // Check if MCP client has an active connection to this server
        const hasActiveConnection = MCPClient && MCPClient.getConnectionInfo(server.name) !== null;
        
        const statusClass = hasActiveConnection ? 'connected' : 'disconnected';
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
                    <button class="btn primary-btn" onclick="MCPManager.connectToServer('${server.name}')">
                        Connect &<br>Load Tools
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
        // Generate parameter documentation - keep using params object style
        let paramDocs = '';
        if (tool.inputSchema && tool.inputSchema.properties) {
            const required = new Set(tool.inputSchema.required || []);
            for (const [name, prop] of Object.entries(tool.inputSchema.properties)) {
                const isRequired = required.has(name);
                const type = prop.type || 'any';
                const description = prop.description || '';
                paramDocs += `\n * @param {${type}} params.${name} ${isRequired ? '(required)' : ''} - ${description}`;
            }
        } else {
            paramDocs = '\n * @param {Object} params - Tool parameters';
        }
        
        return `/**
 * ${tool.description || `MCP tool ${tool.name} from ${serverName}`}
 * @description ${tool.description || `Calls ${tool.name} on MCP server ${serverName}`}${paramDocs}
 * @returns {Promise<Object>} Tool execution result
 * @tool This function calls an MCP tool via the proxy
 */
async function mcp_${serverName}_${tool.name}(params) {
    try {
        // Use the MCP Client Service to call the tool
        const MCPClient = window.MCPClientService;
        if (!MCPClient) {
            return { 
                success: false, 
                error: "MCP Client Service not available" 
            };
        }
        
        // Call the tool through the proper MCP client
        // If params is not an object, treat it as the first parameter
        let args = params;
        if (typeof params !== 'object' || params === null) {
            // If tool expects parameters and a non-object was passed, 
            // assume it's the first parameter
            const firstParam = ${tool.inputSchema?.properties ? `Object.keys(${JSON.stringify(tool.inputSchema.properties)})[0]` : 'null'};
            if (firstParam) {
                args = { [firstParam]: params };
            } else {
                args = {};
            }
        }
        
        const result = await MCPClient.callTool('${serverName}', '${tool.name}', args || {});
        
        return {
            success: true,
            result: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Tool execution failed"
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
                // Save command to history (encrypted storage, excluded from shared links)
                saveCommandToHistory(input, serverName, selectedMode);
                
                // Clear form
                document.getElementById('mcp-server-url').value = '';
                
                showNotification(`🚀 Started MCP server "${serverName}"`, 'success');
                
                // Update connection status and servers list  
                setTimeout(() => {
                    checkProxyConnection();
                    updateServersList();
                    updateCommandHistory();
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
    
    /**
     * Command History Management
     */
    
    /**
     * Get command history from encrypted storage
     * @returns {Array} Array of command history entries
     */
    function getCommandHistory() {
        try {
            // Use CoreStorageService for encrypted storage like other hacka.re data
            const history = window.CoreStorageService?.getValue('mcp-command-history');
            return history || [];
        } catch (error) {
            console.error('[MCPManager] Failed to load command history:', error);
            return [];
        }
    }
    
    /**
     * Save command to history (encrypted storage, excluded from shared links)
     * @param {string} command - The command that was executed
     * @param {string} serverName - The generated server name
     * @param {string} mode - 'command' or 'json'
     */
    function saveCommandToHistory(command, serverName, mode = 'command') {
        try {
            const history = getCommandHistory();
            
            // Create history entry
            const entry = {
                id: Date.now() + Math.random(),
                command: command,
                serverName: serverName,
                mode: mode,
                timestamp: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };
            
            // Check for duplicates and remove if exists
            const existingIndex = history.findIndex(h => h.command === command && h.mode === mode);
            if (existingIndex > -1) {
                // Update existing entry's lastUsed timestamp
                history[existingIndex].lastUsed = entry.lastUsed;
                history[existingIndex].serverName = serverName; // Update server name in case it changed
            } else {
                // Add new entry to beginning
                history.unshift(entry);
            }
            
            // Keep only last 20 entries
            if (history.length > 20) {
                history.splice(20);
            }
            
            // Save back to encrypted storage
            window.CoreStorageService?.setValue('mcp-command-history', history);
            
        } catch (error) {
            console.error('[MCPManager] Failed to save command to history:', error);
        }
    }
    
    /**
     * Delete command from history
     * @param {string} entryId - ID of the history entry to delete
     */
    function deleteFromHistory(entryId) {
        try {
            const history = getCommandHistory();
            const filteredHistory = history.filter(entry => entry.id !== entryId);
            window.CoreStorageService?.setValue('mcp-command-history', filteredHistory);
            updateCommandHistory();
            showNotification('Command removed from history', 'info');
        } catch (error) {
            console.error('[MCPManager] Failed to delete from history:', error);
            showNotification('Failed to delete from history', 'error');
        }
    }
    
    /**
     * Start command from history
     * @param {Object} historyEntry - The history entry to execute
     */
    async function startFromHistory(historyEntry) {
        try {
            // Update the form with the history entry
            const urlInput = document.getElementById('mcp-server-url');
            if (urlInput) {
                urlInput.value = historyEntry.command;
            }
            
            // Set the correct input mode
            const modeRadio = document.querySelector(`input[name="input-mode"][value="${historyEntry.mode}"]`);
            if (modeRadio) {
                modeRadio.checked = true;
                handleInputModeChange({ target: modeRadio });
            }
            
            // Update last used timestamp
            const history = getCommandHistory();
            const entryIndex = history.findIndex(h => h.id === historyEntry.id);
            if (entryIndex > -1) {
                history[entryIndex].lastUsed = new Date().toISOString();
                window.CoreStorageService?.setValue('mcp-command-history', history);
            }
            
            // Trigger form submission
            if (proxyConnected) {
                await handleStdioServerSubmission({ preventDefault: () => {}, stopPropagation: () => {} });
            } else {
                showNotification('Please connect to proxy first', 'error');
            }
            
        } catch (error) {
            console.error('[MCPManager] Failed to start from history:', error);
            showNotification(`Failed to start command: ${error.message}`, 'error');
        }
    }
    
    /**
     * Update the command history display
     */
    function updateCommandHistory() {
        if (!commandHistoryList) {
            return;
        }
        
        const history = getCommandHistory();
        
        if (history.length === 0) {
            commandHistoryList.innerHTML = `
                <div class="empty-history-state">
                    <p>No command history yet. Start a server to build your history.</p>
                </div>
            `;
            return;
        }
        
        // Clear existing content
        commandHistoryList.innerHTML = '';
        
        // Sort by last used (most recent first)
        const sortedHistory = history.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
        
        sortedHistory.forEach(entry => {
            const historyItem = createHistoryItem(entry);
            commandHistoryList.appendChild(historyItem);
        });
    }
    
    /**
     * Create a history item element
     * @param {Object} entry - History entry
     * @returns {HTMLElement} History item element
     */
    function createHistoryItem(entry) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        // Format timestamp
        const lastUsed = new Date(entry.lastUsed);
        const timeAgo = getTimeAgo(lastUsed);
        
        // Truncate long commands
        const displayCommand = entry.command.length > 80 
            ? entry.command.substring(0, 80) + '...' 
            : entry.command;
        
        historyItem.innerHTML = `
            <div class="history-item-info" onclick="MCPManager.startFromHistory(${JSON.stringify(entry).replace(/"/g, '&quot;')})">
                <div class="history-item-command">${displayCommand}</div>
                <div class="history-item-meta">
                    Server: ${entry.serverName} • Mode: ${entry.mode} • ${timeAgo}
                </div>
            </div>
            <div class="history-item-actions">
                <button class="btn danger-btn" onclick="MCPManager.confirmDeleteHistory('${entry.id}')" title="Delete from history">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return historyItem;
    }
    
    /**
     * Show confirmation dialog for deleting history entry
     * @param {string} entryId - ID of the entry to delete
     */
    function confirmDeleteHistory(entryId) {
        const history = getCommandHistory();
        const entry = history.find(h => h.id == entryId);
        
        if (!entry) {
            showNotification('History entry not found', 'error');
            return;
        }
        
        const confirmed = confirm(`Delete this command from history?\n\n${entry.command}\n\nThis action cannot be undone.`);
        if (confirmed) {
            deleteFromHistory(entryId);
        }
    }
    
    /**
     * Copy example command to clipboard
     * @param {string} command - The command or config to copy
     */
    function copyExampleCommand(command) {
        navigator.clipboard.writeText(command).then(() => {
            showNotification('Example copied to clipboard', 'success');
        }).catch(err => {
            console.error('[MCPManager] Failed to copy to clipboard:', err);
            showNotification('Failed to copy to clipboard', 'error');
        });
    }
    
    /**
     * Get human-readable time ago string
     * @param {Date} date - Date to calculate from
     * @returns {string} Time ago string
     */
    function getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
    
    // Public API - minimal integration with existing MCP system
    return {
        init,
        testProxyConnection,
        connectToServer,
        stopProxyServer,
        refreshServerTools,
        startFromHistory,
        confirmDeleteHistory,
        copyExampleCommand
    };
})();