/**
 * MCP Service UI Helper
 * Handles UI dialogs and user interactions for service connections
 */

(function(global) {
    'use strict';

    class MCPServiceUIHelper {
        constructor(serviceManager) {
            this.serviceManager = serviceManager || global.mcpServiceManager;
        }

        /**
         * Show connection dialog for a service
         */
        async showConnectionDialog(serviceKey) {
            const config = this.serviceManager.getServiceConfig(serviceKey);
            if (!config) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            switch (config.authType) {
                case 'pat':
                    return await this.showPATInputDialog(serviceKey, config);
                case 'api-key':
                    return await this.showAPIKeyInputDialog(serviceKey, config);
                case 'oauth-web':
                    return await this.showOAuthWebSetupDialog(serviceKey, config);
                case 'oauth-device':
                    return await this.showOAuthDeviceSetupDialog(serviceKey, config);
                default:
                    throw new Error(`Unknown auth type: ${config.authType}`);
            }
        }

        /**
         * Show Personal Access Token input dialog
         */
        async showPATInputDialog(serviceKey, config) {
            return new Promise((resolve) => {
                const existingModal = document.getElementById('service-pat-input-modal');
                if (existingModal) {
                    existingModal.remove();
                }

                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-pat-input-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} Personal Access Token</h3>
                        
                        <div class="pat-setup-instructions">
                            <h4>Setup Instructions:</h4>
                            <ol>
                                ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                            
                            <p class="form-help">
                                <a href="${config.setupInstructions.docUrl}" target="_blank">
                                    View official documentation <i class="fas fa-external-link-alt"></i>
                                </a>
                            </p>
                        </div>
                        
                        <div class="form-group">
                            <label for="pat-input">Personal Access Token:</label>
                            <input type="password" id="pat-input" class="form-control" 
                                   placeholder="Enter your ${config.name} personal access token">
                            <div class="error-message" id="pat-error" style="display: none; color: red; margin-top: 0.5rem;"></div>
                        </div>
                        
                        <div class="modal-buttons">
                            <button id="pat-connect-btn" class="btn btn-primary">
                                <i class="fas fa-link"></i> Connect
                            </button>
                            <button id="pat-cancel-btn" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                const patInput = document.getElementById('pat-input');
                const errorDiv = document.getElementById('pat-error');
                const connectBtn = document.getElementById('pat-connect-btn');
                const cancelBtn = document.getElementById('pat-cancel-btn');
                
                patInput.focus();
                
                const connect = async () => {
                    const token = patInput.value.trim();
                    if (!token) {
                        errorDiv.textContent = 'Please enter a personal access token';
                        errorDiv.style.display = 'block';
                        return;
                    }
                    
                    connectBtn.disabled = true;
                    connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    errorDiv.style.display = 'none';
                    
                    try {
                        const connector = this.serviceManager.getConnector(serviceKey);
                        
                        // Validate token
                        if (connector.validateToken) {
                            const isValid = await connector.validateToken(token);
                            if (!isValid) {
                                throw new Error('Invalid token. Please check your token and try again.');
                            }
                        }
                        
                        // Create connection
                        await connector.createConnection(token);
                        
                        modal.remove();
                        resolve(true);
                    } catch (error) {
                        errorDiv.textContent = error.message || 'Failed to connect';
                        errorDiv.style.display = 'block';
                        connectBtn.disabled = false;
                        connectBtn.innerHTML = '<i class="fas fa-link"></i> Connect';
                    }
                };
                
                connectBtn.onclick = connect;
                cancelBtn.onclick = () => {
                    modal.remove();
                    resolve(false);
                };
                
                patInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        connect();
                    }
                });
            });
        }

        /**
         * Show API Key input dialog
         */
        async showAPIKeyInputDialog(serviceKey, config) {
            return new Promise((resolve) => {
                const existingModal = document.getElementById('service-apikey-input-modal');
                if (existingModal) {
                    existingModal.remove();
                }

                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-apikey-input-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} API Key Setup</h3>
                        
                        <div class="apikey-setup-instructions">
                            <h4>Setup Instructions:</h4>
                            <ol>
                                ${config.setupInstructions.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                            
                            <p class="form-help">
                                <a href="${config.setupInstructions.docUrl}" target="_blank">
                                    View official documentation <i class="fas fa-external-link-alt"></i>
                                </a>
                            </p>
                        </div>
                        
                        <div class="form-group">
                            <label for="apikey-input">API Key:</label>
                            <input type="password" id="apikey-input" class="form-control" 
                                   placeholder="Enter your ${config.name} API key">
                            <div class="error-message" id="apikey-error" style="display: none; color: red; margin-top: 0.5rem;"></div>
                        </div>
                        
                        <div class="modal-buttons">
                            <button id="apikey-connect-btn" class="btn btn-primary">
                                <i class="fas fa-link"></i> Connect
                            </button>
                            <button id="apikey-cancel-btn" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                const apikeyInput = document.getElementById('apikey-input');
                const errorDiv = document.getElementById('apikey-error');
                const connectBtn = document.getElementById('apikey-connect-btn');
                const cancelBtn = document.getElementById('apikey-cancel-btn');
                
                apikeyInput.focus();
                
                const connect = async () => {
                    const apiKey = apikeyInput.value.trim();
                    if (!apiKey) {
                        errorDiv.textContent = 'Please enter an API key';
                        errorDiv.style.display = 'block';
                        return;
                    }
                    
                    connectBtn.disabled = true;
                    connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    errorDiv.style.display = 'none';
                    
                    try {
                        const connector = this.serviceManager.getConnector(serviceKey);
                        
                        // Validate API key
                        if (connector.validateApiKey) {
                            const isValid = await connector.validateApiKey(apiKey);
                            if (!isValid) {
                                throw new Error('Invalid API key. Please check your key and try again.');
                            }
                        }
                        
                        // Create connection
                        await connector.createConnection(apiKey);
                        
                        modal.remove();
                        resolve(true);
                    } catch (error) {
                        errorDiv.textContent = error.message || 'Failed to connect';
                        errorDiv.style.display = 'block';
                        connectBtn.disabled = false;
                        connectBtn.innerHTML = '<i class="fas fa-link"></i> Connect';
                    }
                };
                
                connectBtn.onclick = connect;
                cancelBtn.onclick = () => {
                    modal.remove();
                    resolve(false);
                };
                
                apikeyInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        connect();
                    }
                });
            });
        }

        /**
         * Show OAuth Web Setup dialog
         */
        async showOAuthWebSetupDialog(serviceKey, config) {
            return new Promise((resolve) => {
                const existingModal = document.getElementById('service-oauth-setup-modal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.id = 'service-oauth-setup-modal';
                
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>${config.name} OAuth Setup</h3>
                        
                        <div class="oauth-setup-instructions">
                            <h4>Setup Instructions:</h4>
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
                            ${serviceKey === 'gmail' ? `
                                <div class="warning-box" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;">
                                    <strong>⚠️ Important:</strong> Gmail requires a "Desktop app" OAuth client type.<br>
                                    Do NOT use "Web application" type or authentication will fail.
                                </div>
                            ` : ''}
                            
                            <div class="form-group">
                                <label for="oauth-client-id">Client ID:</label>
                                <input type="text" id="oauth-client-id" class="form-control" 
                                       placeholder="Enter your OAuth 2.0 Client ID">
                            </div>
                            
                            <div class="form-group">
                                <label for="oauth-client-secret">Client Secret:</label>
                                <input type="password" id="oauth-client-secret" class="form-control" 
                                       placeholder="Enter your OAuth 2.0 Client Secret">
                            </div>
                            
                            <div class="error-message" id="oauth-error" style="display: none; color: red; margin-top: 0.5rem;"></div>
                        </div>
                        
                        <div class="modal-buttons">
                            <button id="oauth-continue-btn" class="btn btn-primary">
                                <i class="fas fa-sign-in-alt"></i> Continue to Authorization
                            </button>
                            <button id="oauth-cancel-btn" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                const clientIdInput = document.getElementById('oauth-client-id');
                const clientSecretInput = document.getElementById('oauth-client-secret');
                const errorDiv = document.getElementById('oauth-error');
                const continueBtn = document.getElementById('oauth-continue-btn');
                const cancelBtn = document.getElementById('oauth-cancel-btn');
                
                clientIdInput.focus();
                
                continueBtn.onclick = async () => {
                    const clientId = clientIdInput.value.trim();
                    const clientSecret = clientSecretInput.value.trim();
                    
                    if (!clientId || !clientSecret) {
                        errorDiv.textContent = 'Please enter both Client ID and Client Secret';
                        errorDiv.style.display = 'block';
                        return;
                    }
                    
                    errorDiv.style.display = 'none';
                    
                    // Build authorization URL
                    const authUrl = this.serviceManager.buildOAuthUrl(serviceKey, clientId);
                    
                    // Open authorization URL in new window
                    const authWindow = window.open(authUrl, '_blank', 'width=600,height=600');
                    
                    // Show code input dialog
                    modal.innerHTML = `
                        <div class="modal-content">
                            <h3>Enter Authorization Code</h3>
                            
                            <div class="oauth-code-instructions">
                                <p>A new window has opened for you to authorize access to ${config.name}.</p>
                                <p>After authorizing, you'll receive an authorization code.</p>
                                <p><strong>Copy the code and paste it below:</strong></p>
                            </div>
                            
                            <div class="form-group">
                                <label for="oauth-code">Authorization Code:</label>
                                <input type="text" id="oauth-code" class="form-control" 
                                       placeholder="Paste the authorization code here">
                                <div class="error-message" id="oauth-code-error" style="display: none; color: red; margin-top: 0.5rem;"></div>
                            </div>
                            
                            <div class="modal-buttons">
                                <button id="oauth-complete-btn" class="btn btn-primary">
                                    <i class="fas fa-check"></i> Complete Authorization
                                </button>
                                <button id="oauth-code-cancel-btn" class="btn btn-secondary">Cancel</button>
                            </div>
                        </div>
                    `;
                    
                    const codeInput = document.getElementById('oauth-code');
                    const codeErrorDiv = document.getElementById('oauth-code-error');
                    const completeBtn = document.getElementById('oauth-complete-btn');
                    const codeCancelBtn = document.getElementById('oauth-code-cancel-btn');
                    
                    codeInput.focus();
                    
                    completeBtn.onclick = async () => {
                        const code = codeInput.value.trim();
                        if (!code) {
                            codeErrorDiv.textContent = 'Please enter the authorization code';
                            codeErrorDiv.style.display = 'block';
                            return;
                        }
                        
                        completeBtn.disabled = true;
                        completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exchanging code...';
                        codeErrorDiv.style.display = 'none';
                        
                        try {
                            const connector = this.serviceManager.getConnector(serviceKey);
                            
                            // Exchange code for tokens
                            const tokens = await connector.exchangeCodeForTokens(code, clientId, clientSecret);
                            
                            // Create connection
                            await connector.createConnection(tokens);
                            
                            modal.remove();
                            resolve(true);
                        } catch (error) {
                            codeErrorDiv.textContent = error.message || 'Failed to exchange authorization code';
                            codeErrorDiv.style.display = 'block';
                            completeBtn.disabled = false;
                            completeBtn.innerHTML = '<i class="fas fa-check"></i> Complete Authorization';
                        }
                    };
                    
                    codeCancelBtn.onclick = () => {
                        if (authWindow && !authWindow.closed) {
                            authWindow.close();
                        }
                        modal.remove();
                        resolve(false);
                    };
                };
                
                cancelBtn.onclick = () => {
                    modal.remove();
                    resolve(false);
                };
            });
        }

        /**
         * Show service disconnection confirmation
         */
        async showDisconnectConfirmation(serviceKey) {
            const config = this.serviceManager.getServiceConfig(serviceKey);
            const serviceName = config ? config.name : serviceKey;
            
            return new Promise((resolve) => {
                if (confirm(`Are you sure you want to disconnect from ${serviceName}?`)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        }
    }

    // Export to global scope
    global.MCPServiceUIHelper = MCPServiceUIHelper;
    global.mcpServiceUIHelper = new MCPServiceUIHelper();

    // Update backward compatibility layer
    if (global.MCPServiceConnectors) {
        const uiHelper = global.mcpServiceUIHelper;
        
        global.MCPServiceConnectors.showPATInputDialog = (serviceKey, config) => {
            return uiHelper.showPATInputDialog(serviceKey, config);
        };
        
        global.MCPServiceConnectors.showOAuthSetupDialog = (serviceKey, config) => {
            return uiHelper.showOAuthWebSetupDialog(serviceKey, config);
        };
        
        global.MCPServiceConnectors.showOAuthWebSetupDialog = (serviceKey, config) => {
            return uiHelper.showOAuthWebSetupDialog(serviceKey, config);
        };
        
        global.MCPServiceConnectors.showAPIKeyInputDialog = (serviceKey, config) => {
            return uiHelper.showAPIKeyInputDialog(serviceKey, config);
        };
    }

})(window);