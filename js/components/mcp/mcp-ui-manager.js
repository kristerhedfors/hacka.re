/**
 * MCP UI Manager
 * 
 * Handles UI setup, modal management, and DOM interactions for MCP
 */

window.MCPUIManager = (function() {
    // DOM element references
    let elements = {
        mcpButton: null,
        mcpModal: null,
        serversList: null,
        addServerForm: null,
        commandHistoryList: null,
        proxyUrlInput: null,
        proxyStatus: null,
        testProxyBtn: null
    };
    
    /**
     * Initialize UI elements and setup
     * @returns {boolean} Success status
     */
    function init() {
        if (!setupExistingElements()) {
            console.error('[MCPUIManager] Failed to setup existing elements');
            return false;
        }
        
        setupProxyConnectionUI();
        addMCPStyles();
        return true;
    }
    
    /**
     * Setup existing MCP elements from hacka.re
     * @returns {boolean} Success status
     */
    function setupExistingElements() {
        elements.mcpButton = document.getElementById('mcp-servers-btn');
        elements.mcpModal = document.getElementById('mcp-servers-modal');
        elements.serversList = document.getElementById('mcp-servers-list');
        elements.addServerForm = document.getElementById('mcp-server-form');
        elements.commandHistoryList = document.getElementById('mcp-command-history');
        
        if (!elements.mcpButton || !elements.mcpModal || !elements.serversList || 
            !elements.addServerForm || !elements.commandHistoryList) {
            console.error('[MCPUIManager] Could not find existing MCP elements');
            return false;
        }
        
        // Add MCP button click handler
        elements.mcpButton.addEventListener('click', showModal);
        
        return true;
    }
    
    /**
     * Setup proxy connection UI in the existing modal
     */
    function setupProxyConnectionUI() {
        const modalContent = elements.mcpModal.querySelector('.modal-content');
        if (!modalContent) {
            console.error('[MCPUIManager] Could not find modal content');
            return;
        }
        
        const serversContainer = modalContent.querySelector('.mcp-servers-container');
        if (!serversContainer) {
            console.error('[MCPUIManager] Could not find servers container');
            return;
        }
        
        // Create proxy connection section
        const proxySection = createProxySection();
        modalContent.insertBefore(proxySection, serversContainer);
        
        // Get references to new elements
        elements.proxyUrlInput = document.getElementById('mcp-proxy-url');
        elements.proxyStatus = document.getElementById('proxy-status');
        elements.testProxyBtn = document.getElementById('test-proxy-btn');
        
        // Setup input mode toggle
        setupInputModeToggle();
        
        // Add quick connectors if available
        if (window.MCPQuickConnectors) {
            console.log('[MCPUIManager] Adding quick connectors to modal');
            window.MCPQuickConnectors.createQuickConnectorsUI(modalContent);
        } else {
            console.warn('[MCPUIManager] MCPQuickConnectors not available');
        }
    }
    
    /**
     * Create proxy connection section HTML
     * @returns {HTMLElement} Proxy section element
     */
    function createProxySection() {
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
                        <strong>Filesystem (npx - specific user):</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('npx -y @modelcontextprotocol/server-filesystem /Users/user')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy command">
                            <i class="fas fa-copy"></i>
                        </button><br>
                        <code style="font-size: 0.85rem;">npx -y @modelcontextprotocol/server-filesystem /Users/user</code>
                    </div>
                    <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); margin-bottom: 0.5rem; position: relative;">
                        <strong>Filesystem (npx - Desktop):</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('npx -y @modelcontextprotocol/server-filesystem /Users/user/Desktop')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy command">
                            <i class="fas fa-copy"></i>
                        </button><br>
                        <code style="font-size: 0.85rem;">npx -y @modelcontextprotocol/server-filesystem /Users/user/Desktop</code>
                    </div>
                    <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); margin-bottom: 0.5rem; position: relative;">
                        <strong>Memory Server:</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('npx -y @modelcontextprotocol/server-memory')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy command">
                            <i class="fas fa-copy"></i>
                        </button><br>
                        <code style="font-size: 0.85rem;">npx -y @modelcontextprotocol/server-memory</code>
                    </div>
                    <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); position: relative;">
                        <strong>Filesystem (Docker):</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('docker run -i --rm --mount type=bind,src=/Users/user/Desktop,dst=/projects/Desktop mcp/filesystem /projects')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy command">
                            <i class="fas fa-copy"></i>
                        </button><br>
                        <code style="font-size: 0.85rem;">docker run -i --rm --mount type=bind,src=/Users/user/Desktop,dst=/projects/Desktop mcp/filesystem /projects</code>
                    </div>
                </div>
                
                <div id="json-examples" style="display: none;">
                    <p class="form-help"><strong>Example JSON config:</strong></p>
                    <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); position: relative;">
                        <strong>Filesystem (Docker):</strong>
                        <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('{\n  \"name\": \"filesystem\",\n  \"command\": \"docker\",\n  \"args\": [\n    \"run\", \"-i\", \"--rm\",\n    \"--mount\", \"type=bind,src=/Users/user/Desktop,dst=/projects/Desktop\",\n    \"mcp/filesystem\", \"/projects\"\n  ]\n}')" 
                                style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                title="Copy JSON config">
                            <i class="fas fa-copy"></i>
                        </button>
                        <pre style="margin: 0.5rem 0 0 0; font-size: 0.8rem; background: var(--dark-color); color: var(--light-text); padding: 0.5rem; border-radius: 4px; overflow-x: auto;"><code>{
  "name": "filesystem",
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "--mount", "type=bind,src=/Users/user/Desktop,dst=/projects/Desktop",
    "mcp/filesystem", "/projects"
  ]
}</code></pre>
                    </div>
                </div>
                
                <p class="form-help"><strong>💡 Note:</strong> The form below adapts to your chosen input mode. Server name will be auto-detected or extracted from config.</p>
            </div>
            <div style="background-color: var(--system-msg-bg); border-left: 4px solid var(--accent-color); padding: 0.75rem; border-radius: var(--border-radius); margin: 1rem 0;">
                <h4 style="margin: 0 0 0.5rem 0;">🚀 One-Liner Commands (Standalone)</h4>
                <p class="form-help" style="margin: 0 0 0.75rem 0;">Copy these standalone commands - no separate proxy needed:</p>
                
                <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); margin-bottom: 0.5rem; position: relative;">
                    <strong>Filesystem Server (User Directory):</strong>
                    <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem /Users/user')" 
                            style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                            title="Copy one-liner command">
                        <i class="fas fa-copy"></i>
                    </button><br>
                    <code style="font-size: 0.85rem;">mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem /Users/user</code>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                        Standalone filesystem server for user directory on port 3001
                    </div>
                </div>
                
                <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); margin-bottom: 0.5rem; position: relative;">
                    <strong>Memory Server:</strong>
                    <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('mcp-http-wrapper.js npx @modelcontextprotocol/server-memory')" 
                            style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                            title="Copy one-liner command">
                        <i class="fas fa-copy"></i>
                    </button><br>
                    <code style="font-size: 0.85rem;">mcp-http-wrapper.js npx @modelcontextprotocol/server-memory</code>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                        Standalone memory server on port 3001
                    </div>
                </div>
                
                <div style="background-color: var(--ai-msg-bg); padding: 0.75rem; border-radius: var(--border-radius); margin-bottom: 0.5rem; position: relative;">
                    <strong>Custom Directory with Debug:</strong>
                    <button class="btn secondary-btn" onclick="MCPManager.copyExampleCommand('mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem /Users/user/Documents --port=8080 --debug')" 
                            style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                            title="Copy one-liner command">
                        <i class="fas fa-copy"></i>
                    </button><br>
                    <code style="font-size: 0.85rem;">mcp-http-wrapper.js npx @modelcontextprotocol/server-filesystem /Users/user/Documents --port=8080 --debug</code>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                        Documents directory on custom port with debug output
                    </div>
                </div>
                
                <div style="font-size: 0.85rem; margin-top: 0.75rem; padding: 0.5rem; background-color: rgba(0,0,0,0.05); border-radius: 4px;">
                    <strong>How it works:</strong> Run these commands from the hacka.re directory. Each command starts an MCP server + HTTP wrapper in one process. 
                    Connect hacka.re directly to the port (default 3001) - no separate proxy needed!
                    <br><strong>Note:</strong> The wrapper script <code>mcp-http-wrapper.js</code> is in the <code>mcp-stdio-proxy/</code> subdirectory.
                </div>
            </div>
        `;
        return proxySection;
    }
    
    /**
     * Setup input mode toggle functionality
     */
    function setupInputModeToggle() {
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
     * Update server instructions visibility
     * @param {boolean} show - Whether to show instructions
     */
    function updateServerInstructions(show) {
        const instructionsElement = document.getElementById('server-instructions');
        if (instructionsElement) {
            instructionsElement.style.display = show ? 'block' : 'none';
            // Disabled old mode system - now using OAuth integration's transport system
            /* if (show) {
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
                updateFormLabels(false);
            } */
        }
    }
    
    /**
     * Show the MCP modal
     */
    function showModal() {
        if (elements.mcpModal) {
            // Close heart tooltip if open
            const heartTooltip = document.querySelector('.heart-logo .tooltip');
            if (heartTooltip && heartTooltip.classList.contains('active')) {
                heartTooltip.classList.remove('active');
                document.body.classList.remove('heart-modal-open');
            }
            
            elements.mcpModal.classList.add('active');
        }
    }
    
    /**
     * Hide the MCP modal
     */
    function hideModal() {
        if (elements.mcpModal) {
            elements.mcpModal.classList.remove('active');
        }
    }
    
    /**
     * Update proxy status display
     * @param {string} status - 'connected', 'disconnected', or 'testing'
     * @param {string} message - Status message
     */
    function updateProxyStatus(status, message) {
        if (elements.proxyStatus) {
            elements.proxyStatus.className = `proxy-status ${status}`;
            elements.proxyStatus.innerHTML = message;
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
            
            /* Quick Connectors Styles */
            .mcp-quick-connectors-section {
                margin-bottom: 2rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            .quick-connectors-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            .quick-connector-card {
                display: flex;
                align-items: center;
                padding: 1rem;
                background-color: var(--ai-msg-bg);
                border-radius: var(--border-radius);
                border: 1px solid rgba(0, 0, 0, 0.1);
                transition: var(--transition);
                gap: 1rem;
            }
            .quick-connector-card:hover {
                background-color: rgba(0, 0, 0, 0.05);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            .connector-icon {
                font-size: 2rem;
                color: var(--accent-color);
                flex-shrink: 0;
                width: 3rem;
                text-align: center;
            }
            .connector-info {
                flex: 1;
                min-width: 0;
            }
            .connector-info h4 {
                margin: 0 0 0.25rem 0;
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-color);
            }
            .connector-info p {
                margin: 0;
                font-size: 0.85rem;
                color: rgba(0, 0, 0, 0.6);
                line-height: 1.3;
            }
            .connector-status {
                flex-shrink: 0;
                text-align: right;
            }
            .connector-status .connect-btn {
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
                min-width: 80px;
            }
            .connector-status .disconnect-btn {
                padding: 0.25rem 0.75rem;
                font-size: 0.8rem;
                margin-top: 0.25rem;
            }
            .status-connected {
                color: var(--secondary-color);
                font-size: 0.85rem;
                font-weight: 500;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 0.25rem;
            }
            .status-connected i {
                margin-right: 0.25rem;
            }
            .tool-count {
                font-size: 0.75rem;
                color: rgba(0, 0, 0, 0.6);
            }
            .status-connecting, .status-authorizing {
                color: var(--accent-color);
                font-size: 0.85rem;
                font-weight: 500;
            }
            .status-connecting i, .status-authorizing i {
                margin-right: 0.25rem;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Get all UI elements
     * @returns {Object} UI elements
     */
    function getElements() {
        return elements;
    }
    
    // Public API
    return {
        init,
        showModal,
        hideModal,
        updateProxyStatus,
        updateServerInstructions,
        updateFormLabels,
        getElements
    };
})();