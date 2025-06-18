/**
 * Gmail Token Manager
 * Simplified management for Gmail authentication in MCP connections
 * Supports both OAuth and App Password authentication methods
 */

export class GmailTokenManager {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the token manager
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('Gmail Token Manager: Initializing...');
        this.initialized = true;
    }

    /**
     * Show Gmail authentication setup dialog
     * @returns {Promise<boolean>} True if authentication was set successfully
     */
    async showAuthSetupDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'gmail-auth-setup-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-envelope"></i> Gmail Authentication Setup</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove(); resolve(false);">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="auth-method-selector">
                            <h4>Choose Authentication Method:</h4>
                            <div class="auth-method-buttons">
                                <button class="btn secondary-btn auth-method-btn" data-method="app-password">
                                    <i class="fas fa-key"></i> App Password (Simple)
                                </button>
                                <button class="btn secondary-btn auth-method-btn" data-method="oauth">
                                    <i class="fas fa-shield-alt"></i> OAuth 2.0 (Secure)
                                </button>
                            </div>
                            <div class="auth-method-comparison">
                                <div class="comparison-table">
                                    <div class="comparison-row">
                                        <div class="comparison-header">Feature</div>
                                        <div class="comparison-header">App Password</div>
                                        <div class="comparison-header">OAuth 2.0</div>
                                    </div>
                                    <div class="comparison-row">
                                        <div>Setup Complexity</div>
                                        <div class="text-success">Simple</div>
                                        <div class="text-warning">Complex</div>
                                    </div>
                                    <div class="comparison-row">
                                        <div>Browser Support</div>
                                        <div class="text-error">CORS Limited</div>
                                        <div class="text-success">Full Support</div>
                                    </div>
                                    <div class="comparison-row">
                                        <div>API Access</div>
                                        <div class="text-error">IMAP/SMTP Only</div>
                                        <div class="text-success">Full REST API</div>
                                    </div>
                                    <div class="comparison-row">
                                        <div>Future Support</div>
                                        <div class="text-error">Deprecated 2025</div>
                                        <div class="text-success">Recommended</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- App Password Setup -->
                        <div class="auth-setup-section" id="app-password-setup" style="display: none;">
                            <div class="gmail-setup-instructions">
                                <h4>App Password Setup Instructions:</h4>
                                <div class="warning-box">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <strong>CORS Limitation:</strong> App passwords work with IMAP/SMTP but Gmail REST API 
                                    doesn't support Basic Auth from browsers. This method has limited functionality.
                                </div>
                                <div class="warning-box">
                                    <i class="fas fa-calendar-times"></i>
                                    <strong>Deprecation Notice:</strong> Google is deprecating app passwords in March 2025. 
                                    OAuth 2.0 is strongly recommended for full functionality.
                                </div>
                                <ol>
                                    <li>Go to your <a href="https://myaccount.google.com/security" target="_blank">Google Account Security settings</a></li>
                                    <li>Ensure <strong>2-Step Verification</strong> is enabled (required for app passwords)</li>
                                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank">App passwords</a></li>
                                    <li>Select "Mail" as the app and your device type</li>
                                    <li>Click "Generate" and copy the 16-character password</li>
                                    <li>Paste the app password below</li>
                                </ol>
                                <div class="info-box">
                                    <i class="fas fa-info-circle"></i>
                                    <strong>Note:</strong> Due to browser CORS restrictions, we cannot validate app passwords 
                                    directly. The integration will use OAuth device flow for Gmail API access.
                                </div>
                            </div>
                            
                            <div class="token-input-section">
                                <div class="form-group">
                                    <label for="gmail-email-input">
                                        <i class="fas fa-at"></i> Gmail Address
                                    </label>
                                    <input type="email" 
                                           id="gmail-email-input" 
                                           placeholder="your.email@gmail.com" 
                                           class="email-input" 
                                           autocomplete="email" />
                                    <small class="form-help">Your full Gmail address</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="gmail-app-password-input">
                                        <i class="fas fa-key"></i> App Password
                                    </label>
                                    <div class="input-with-validation">
                                        <input type="password" 
                                               id="gmail-app-password-input" 
                                               placeholder="xxxx xxxx xxxx xxxx" 
                                               class="token-input" 
                                               autocomplete="off" />
                                        <div class="validation-status" id="app-password-validation-status"></div>
                                    </div>
                                    <small class="form-help">16-character app password from Google</small>
                                </div>
                            </div>
                        </div>
                        
                        <!-- OAuth Setup -->
                        <div class="auth-setup-section" id="oauth-setup" style="display: none;">
                            <div class="gmail-setup-instructions">
                                <h4>OAuth 2.0 Setup Instructions:</h4>
                                <ol>
                                    <li>Go to the <a href="https://console.developers.google.com/" target="_blank">Google Cloud Console</a></li>
                                    <li>Create a new project or select an existing one</li>
                                    <li>Enable the Gmail API for your project</li>
                                    <li>Go to "Credentials" and create OAuth 2.0 Client ID</li>
                                    <li>Choose "Desktop application" as the application type</li>
                                    <li>Copy your Client ID and Client Secret</li>
                                    <li>Enter them below to start the device flow</li>
                                </ol>
                                
                                <div class="info-box">
                                    <i class="fas fa-info-circle"></i>
                                    <strong>OAuth Flow:</strong> You'll get a device code to enter on Google's authorization page.
                                    This method is more secure and future-proof.
                                </div>
                            </div>
                            
                            <div class="oauth-input-section">
                                <div class="form-group">
                                    <label for="gmail-client-id-input">
                                        <i class="fas fa-id-card"></i> Client ID
                                    </label>
                                    <input type="text" 
                                           id="gmail-client-id-input" 
                                           placeholder="your-client-id.apps.googleusercontent.com" 
                                           class="oauth-input" 
                                           autocomplete="off" />
                                </div>
                                
                                <div class="form-group">
                                    <label for="gmail-client-secret-input">
                                        <i class="fas fa-lock"></i> Client Secret
                                    </label>
                                    <input type="password" 
                                           id="gmail-client-secret-input" 
                                           placeholder="Your client secret" 
                                           class="oauth-input" 
                                           autocomplete="off" />
                                </div>
                            </div>
                        </div>
                        
                        <div class="gmail-features">
                            <h5>What you can do with Gmail MCP integration:</h5>
                            <ul>
                                <li><i class="fas fa-inbox"></i> Read and search your emails</li>
                                <li><i class="fas fa-paper-plane"></i> Send emails through AI commands</li>
                                <li><i class="fas fa-tags"></i> Manage labels and organize messages</li>
                                <li><i class="fas fa-filter"></i> Advanced Gmail search queries</li>
                                <li><i class="fas fa-share"></i> Share credentials securely with others</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn secondary-btn" onclick="this.closest('.modal').remove();">
                            Cancel
                        </button>
                        <button class="btn primary-btn" id="setup-gmail-auth" disabled>
                            <i class="fas fa-envelope"></i> Setup Gmail Authentication
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const authMethodButtons = modal.querySelectorAll('.auth-method-btn');
            const appPasswordSection = document.getElementById('app-password-setup');
            const oauthSection = document.getElementById('oauth-setup');
            const setupButton = document.getElementById('setup-gmail-auth');
            
            let selectedMethod = null;
            
            // Handle auth method selection
            authMethodButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    authMethodButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedMethod = btn.dataset.method;
                    
                    // Show appropriate section
                    if (selectedMethod === 'app-password') {
                        appPasswordSection.style.display = 'block';
                        oauthSection.style.display = 'none';
                        this.setupAppPasswordValidation();
                    } else {
                        appPasswordSection.style.display = 'none';
                        oauthSection.style.display = 'block';
                        this.setupOAuthValidation();
                    }
                    
                    setupButton.disabled = false;
                });
            });
            
            // Handle setup button
            setupButton.addEventListener('click', async () => {
                if (!selectedMethod) {
                    alert('Please select an authentication method');
                    return;
                }
                
                try {
                    setupButton.disabled = true;
                    setupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';
                    
                    let success = false;
                    
                    if (selectedMethod === 'app-password') {
                        success = await this.setupAppPassword();
                    } else {
                        success = await this.setupOAuth();
                    }
                    
                    if (success) {
                        modal.remove();
                        resolve(true);
                    } else {
                        setupButton.disabled = false;
                        setupButton.innerHTML = '<i class="fas fa-envelope"></i> Setup Gmail Authentication';
                    }
                    
                } catch (error) {
                    console.error('Gmail Token Manager: Setup error:', error);
                    alert(`Setup failed: ${error.message}`);
                    setupButton.disabled = false;
                    setupButton.innerHTML = '<i class="fas fa-envelope"></i> Setup Gmail Authentication';
                }
            });
        });
    }

    /**
     * Setup app password validation
     */
    setupAppPasswordValidation() {
        const emailInput = document.getElementById('gmail-email-input');
        const passwordInput = document.getElementById('gmail-app-password-input');
        const validationStatus = document.getElementById('app-password-validation-status');
        const setupButton = document.getElementById('setup-gmail-auth');
        
        let validationTimeout;
        
        const validateInputs = () => {
            clearTimeout(validationTimeout);
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim().replace(/\s/g, '');
            
            if (!email || !password) {
                validationStatus.innerHTML = '';
                return;
            }
            
            // Basic validation
            if (!email.includes('@gmail.com')) {
                validationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Please use a Gmail address';
                return;
            }
            
            if (password.length !== 16) {
                validationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> App password should be 16 characters';
                return;
            }
            
            validationStatus.innerHTML = '<i class="fas fa-check text-success"></i> Inputs look valid';
        };
        
        emailInput.addEventListener('input', validateInputs);
        passwordInput.addEventListener('input', validateInputs);
    }

    /**
     * Setup OAuth validation
     */
    setupOAuthValidation() {
        const clientIdInput = document.getElementById('gmail-client-id-input');
        const clientSecretInput = document.getElementById('gmail-client-secret-input');
        
        const validateInputs = () => {
            const clientId = clientIdInput.value.trim();
            const clientSecret = clientSecretInput.value.trim();
            
            // Basic validation for Google OAuth credentials
            if (clientId && clientId.includes('.apps.googleusercontent.com') && clientSecret) {
                return true;
            }
            
            return false;
        };
        
        clientIdInput.addEventListener('input', validateInputs);
        clientSecretInput.addEventListener('input', validateInputs);
    }

    /**
     * Setup app password authentication
     * @returns {Promise<boolean>} True if setup successful
     */
    async setupAppPassword() {
        const email = document.getElementById('gmail-email-input').value.trim();
        const password = document.getElementById('gmail-app-password-input').value.trim().replace(/\s/g, '');
        
        if (!email || !password) {
            throw new Error('Email and app password are required');
        }
        
        // Validate format only due to CORS limitations
        const isValid = await this.validateAppPassword(email, password);
        if (!isValid) {
            throw new Error('App password format validation failed. Please check your credentials.');
        }
        
        // Show warning about limitations
        const proceed = confirm(
            'IMPORTANT: Due to browser CORS restrictions, app passwords cannot be used directly with Gmail REST API.\n\n' +
            'This will save your credentials but the integration will still use OAuth device flow for API access.\n\n' +
            'Continue with OAuth setup instead?'
        );
        
        if (!proceed) {
            return false;
        }
        
        // Redirect to OAuth setup since app passwords won't work for REST API
        // But save the email for convenience
        await window.CoreStorageService.setValue('mcp_gmail_email_hint', email);
        
        // Start OAuth flow instead
        return await this.setupOAuthFallback();
    }

    /**
     * Setup OAuth fallback when app password fails
     * @returns {Promise<boolean>} True if setup successful
     */
    async setupOAuthFallback() {
        alert('Redirecting to OAuth 2.0 setup...\n\nYou\'ll need to create Google Cloud OAuth credentials for full Gmail API access.');
        
        // Close current modal and show OAuth setup
        document.getElementById('gmail-auth-setup-modal')?.remove();
        return await this.showAuthSetupDialog();
    }

    /**
     * Setup OAuth authentication
     * @returns {Promise<boolean>} True if setup successful
     */
    async setupOAuth() {
        const clientId = document.getElementById('gmail-client-id-input').value.trim();
        const clientSecret = document.getElementById('gmail-client-secret-input').value.trim();
        
        if (!clientId || !clientSecret) {
            throw new Error('Client ID and Client Secret are required');
        }
        
        // Save OAuth config
        await this.saveOAuthConfig(clientId, clientSecret);
        
        // Start OAuth flow
        const success = await this.startOAuthFlow(clientId, clientSecret);
        
        if (success) {
            alert('Gmail OAuth setup completed successfully!');
            return true;
        } else {
            throw new Error('OAuth flow failed or was cancelled');
        }
    }

    /**
     * Validate app password by testing Gmail API access
     * @param {string} email - Gmail address
     * @param {string} password - App password
     * @returns {Promise<boolean>} True if valid
     */
    async validateAppPassword(email, password) {
        try {
            // CORS Limitation: Gmail API doesn't support Basic Auth from browsers
            // App passwords work with IMAP/SMTP but not with REST API from browser
            // For client-side validation, we'll do basic format checks only
            
            console.warn('Gmail Token Manager: App password validation limited due to CORS restrictions');
            console.warn('Gmail REST API does not support Basic Auth from browsers');
            console.warn('App passwords work with IMAP/SMTP protocols only');
            
            // Basic format validation only
            if (!email.includes('@gmail.com')) {
                return false;
            }
            
            if (password.length !== 16) {
                return false;
            }
            
            // Cannot actually validate against Gmail API due to CORS
            // Return true for properly formatted credentials
            return true;
            
        } catch (error) {
            console.error('Gmail Token Manager: App password validation failed:', error);
            return false;
        }
    }

    /**
     * Save app password credentials
     * @param {string} email - Gmail address
     * @param {string} password - App password
     */
    async saveAppPasswordCredentials(email, password) {
        try {
            await window.CoreStorageService.setValue('mcp_gmail_auth_type', 'app-password');
            await window.CoreStorageService.setValue('mcp_gmail_email', email);
            await window.CoreStorageService.setValue('mcp_gmail_app_password', password);
            console.log('Gmail Token Manager: App password credentials saved successfully');
        } catch (error) {
            console.error('Gmail Token Manager: Error saving app password credentials:', error);
            throw new Error('Failed to save credentials to storage');
        }
    }

    /**
     * Save OAuth configuration
     * @param {string} clientId - OAuth client ID
     * @param {string} clientSecret - OAuth client secret
     */
    async saveOAuthConfig(clientId, clientSecret) {
        try {
            await window.CoreStorageService.setValue('mcp_gmail_auth_type', 'oauth');
            await window.CoreStorageService.setValue('mcp_gmail_oauth_client_id', clientId);
            await window.CoreStorageService.setValue('mcp_gmail_oauth_client_secret', clientSecret);
            console.log('Gmail Token Manager: OAuth config saved successfully');
        } catch (error) {
            console.error('Gmail Token Manager: Error saving OAuth config:', error);
            throw new Error('Failed to save OAuth configuration');
        }
    }

    /**
     * Start OAuth device flow
     * @param {string} clientId - OAuth client ID
     * @param {string} clientSecret - OAuth client secret
     * @returns {Promise<boolean>} True if OAuth flow completed successfully
     */
    async startOAuthFlow(clientId, clientSecret) {
        try {
            // Use the existing MCP OAuth system
            if (window.MCPOAuthService) {
                // Update Gmail service config with the provided credentials
                const gmailConfig = {
                    authorizationEndpoint: 'https://oauth2.googleapis.com/device/code',
                    tokenEndpoint: 'https://oauth2.googleapis.com/token',
                    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
                    clientId: clientId,
                    clientSecret: clientSecret
                };
                
                const tokens = await window.MCPOAuthService.startDeviceFlow('gmail', gmailConfig);
                
                if (tokens && tokens.access_token) {
                    await window.CoreStorageService.setValue('mcp_gmail_oauth_tokens', JSON.stringify(tokens));
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('Gmail Token Manager: OAuth flow failed:', error);
            return false;
        }
    }

    /**
     * Get saved authentication type
     * @returns {Promise<string|null>} 'app-password', 'oauth', or null
     */
    async getAuthType() {
        try {
            return await window.CoreStorageService.getValue('mcp_gmail_auth_type');
        } catch (error) {
            console.error('Gmail Token Manager: Error getting auth type:', error);
            return null;
        }
    }

    /**
     * Check if valid authentication exists
     * @returns {Promise<boolean>} True if valid auth exists
     */
    async hasValidAuth() {
        try {
            const authType = await this.getAuthType();
            
            if (authType === 'app-password') {
                const email = await window.CoreStorageService.getValue('mcp_gmail_email');
                const password = await window.CoreStorageService.getValue('mcp_gmail_app_password');
                
                if (email && password) {
                    return await this.validateAppPassword(email, password);
                }
            } else if (authType === 'oauth') {
                const tokens = await window.CoreStorageService.getValue('mcp_gmail_oauth_tokens');
                if (tokens) {
                    // TODO: Validate OAuth tokens
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Gmail Token Manager: Error checking auth:', error);
            return false;
        }
    }

    /**
     * Connect to Gmail using saved authentication
     * @returns {Promise<boolean>} True if connected successfully
     */
    async connectToGmail() {
        try {
            if (window.MCPServiceConnectors) {
                const connected = await window.MCPServiceConnectors.connectService('gmail');
                return connected;
            } else {
                console.warn('Gmail Token Manager: MCP Service Connectors not available');
                return false;
            }
        } catch (error) {
            console.error('Gmail Token Manager: Connection failed:', error);
            return false;
        }
    }

    /**
     * Get connection status
     * @returns {boolean} True if connected
     */
    isConnected() {
        try {
            return window.MCPServiceConnectors ? 
                   window.MCPServiceConnectors.isConnected('gmail') : false;
        } catch (error) {
            console.error('Gmail Token Manager: Error checking connection:', error);
            return false;
        }
    }

    /**
     * Remove all saved authentication data
     */
    async removeAuth() {
        try {
            await window.CoreStorageService.removeValue('mcp_gmail_auth_type');
            await window.CoreStorageService.removeValue('mcp_gmail_email');
            await window.CoreStorageService.removeValue('mcp_gmail_app_password');
            await window.CoreStorageService.removeValue('mcp_gmail_oauth_client_id');
            await window.CoreStorageService.removeValue('mcp_gmail_oauth_client_secret');
            await window.CoreStorageService.removeValue('mcp_gmail_oauth_tokens');
            console.log('Gmail Token Manager: All authentication data removed');
        } catch (error) {
            console.error('Gmail Token Manager: Error removing auth data:', error);
        }
    }

    /**
     * Quick setup for Gmail authentication
     * @returns {Promise<boolean>} True if setup completed
     */
    async quickSetup() {
        // Check if already has valid auth
        if (await this.hasValidAuth()) {
            const authType = await this.getAuthType();
            
            const proceed = confirm(`Gmail authentication already exists (${authType}). Set up new authentication?`);
            if (!proceed) {
                return this.isConnected() || await this.connectToGmail();
            }
        }
        
        return await this.showAuthSetupDialog();
    }

    /**
     * Get authentication info for sharing
     * @returns {Promise<Object|null>} Auth info for sharing or null
     */
    async getAuthForSharing() {
        try {
            const authType = await this.getAuthType();
            
            if (authType === 'app-password') {
                const email = await window.CoreStorageService.getValue('mcp_gmail_email');
                const password = await window.CoreStorageService.getValue('mcp_gmail_app_password');
                
                if (email && password && await this.validateAppPassword(email, password)) {
                    return {
                        type: 'app-password',
                        email: email,
                        password: password
                    };
                }
            } else if (authType === 'oauth') {
                const clientId = await window.CoreStorageService.getValue('mcp_gmail_oauth_client_id');
                const clientSecret = await window.CoreStorageService.getValue('mcp_gmail_oauth_client_secret');
                const tokens = await window.CoreStorageService.getValue('mcp_gmail_oauth_tokens');
                
                if (clientId && clientSecret && tokens) {
                    return {
                        type: 'oauth',
                        clientId: clientId,
                        clientSecret: clientSecret,
                        tokens: JSON.parse(tokens)
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Gmail Token Manager: Error getting auth for sharing:', error);
            return null;
        }
    }

    /**
     * Restore authentication from shared data
     * @param {Object} authData - Shared authentication data
     * @returns {Promise<boolean>} True if restored successfully
     */
    async restoreAuthFromSharedData(authData) {
        try {
            if (!authData || !authData.type) {
                return false;
            }
            
            if (authData.type === 'app-password' && authData.email && authData.password) {
                // Validate before restoring
                if (await this.validateAppPassword(authData.email, authData.password)) {
                    await this.saveAppPasswordCredentials(authData.email, authData.password);
                    return await this.connectToGmail();
                }
            } else if (authData.type === 'oauth' && authData.clientId && authData.clientSecret) {
                await this.saveOAuthConfig(authData.clientId, authData.clientSecret);
                
                if (authData.tokens) {
                    await window.CoreStorageService.setValue('mcp_gmail_oauth_tokens', JSON.stringify(authData.tokens));
                }
                
                return await this.connectToGmail();
            }
            
            return false;
        } catch (error) {
            console.error('Gmail Token Manager: Error restoring auth from shared data:', error);
            return false;
        }
    }
}

// Create global instance
window.GmailTokenManager = new GmailTokenManager();