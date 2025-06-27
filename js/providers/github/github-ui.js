/**
 * GitHub UI Components
 * Handles GitHub token setup, management, and sharing interfaces
 */

export class GitHubUI {
    constructor() {
        this.initialized = false;
        this.auth = null;
    }

    /**
     * Initialize the UI manager
     * @param {GitHubAuth} auth - GitHub auth instance
     */
    async initialize(auth = null) {
        if (this.initialized) return;
        
        this.auth = auth;
        console.log('GitHub UI: Initializing...');
        this.initialized = true;
    }

    /**
     * Show GitHub token setup dialog
     * @returns {Promise<boolean>} True if token was set successfully
     */
    async showTokenSetupDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'github-token-setup-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fab fa-github"></i> GitHub Personal Access Token Setup</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove(); resolve(false);">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="github-setup-instructions">
                            <h4>Setup Instructions:</h4>
                            <ol>
                                <li>Go to <a href="https://github.com/settings/personal-access-tokens/tokens" target="_blank">GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)</a></li>
                                <li>Click "Generate new token (classic)"</li>
                                <li>Give your token a descriptive name like "hacka.re MCP Integration"</li>
                                <li>Select these scopes:
                                    <ul>
                                        <li><strong>repo</strong> - Full control of private repositories</li>
                                        <li><strong>read:user</strong> - Read user profile data</li>
                                        <li><strong>read:org</strong> - Read organization data (optional)</li>
                                    </ul>
                                </li>
                                <li>Click "Generate token" and copy it immediately</li>
                                <li>Paste the token below (it won't be shown again on GitHub)</li>
                            </ol>
                            
                            <div class="warning-box">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Important:</strong> Your token will be encrypted and stored locally in your browser. 
                                Never share your token with others.
                            </div>
                        </div>
                        
                        <div class="token-input-section">
                            <div class="form-group">
                                <label for="github-token-input">
                                    <i class="fab fa-github"></i> GitHub Personal Access Token
                                </label>
                                <div class="input-with-validation">
                                    <input type="password" 
                                           id="github-token-input" 
                                           placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                                           class="token-input" 
                                           autocomplete="off" />
                                    <div class="validation-status" id="token-validation-status"></div>
                                </div>
                                <small class="form-help">Classic tokens start with "ghp_" and are 40+ characters long</small>
                            </div>
                            
                            <div class="token-features">
                                <h5>What you can do with GitHub MCP integration:</h5>
                                <ul>
                                    <li><i class="fas fa-list"></i> List your repositories</li>
                                    <li><i class="fas fa-file-code"></i> Read file contents from repositories</li>
                                    <li><i class="fas fa-bug"></i> View and create issues</li>
                                    <li><i class="fas fa-code-branch"></i> Get repository information</li>
                                    <li><i class="fas fa-share"></i> Share connections securely with others</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn secondary-btn" onclick="this.closest('.modal').remove();">
                            Cancel
                        </button>
                        <button class="btn primary-btn" id="validate-and-save-token" disabled>
                            <i class="fas fa-key"></i> Validate & Save Token
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const tokenInput = document.getElementById('github-token-input');
            const validateBtn = document.getElementById('validate-and-save-token');
            const validationStatus = document.getElementById('token-validation-status');
            let validationTimeout;
            
            // Real-time validation as user types
            tokenInput.addEventListener('input', () => {
                const token = tokenInput.value.trim();
                
                clearTimeout(validationTimeout);
                
                if (token.length === 0) {
                    validationStatus.innerHTML = '';
                    validateBtn.disabled = true;
                    return;
                }
                
                // Basic format validation
                if (!token.startsWith('ghp_')) {
                    validationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Token should start with "ghp_"';
                    validateBtn.disabled = true;
                    return;
                }
                
                if (token.length < 40) {
                    validationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Token seems too short';
                    validateBtn.disabled = true;
                    return;
                }
                
                validationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking format...';
                
                // Debounce validation
                validationTimeout = setTimeout(async () => {
                    validationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating with GitHub...';
                    
                    const isValid = await this.validateToken(token);
                    if (isValid) {
                        validationStatus.innerHTML = '<i class="fas fa-check text-success"></i> Token is valid!';
                        validateBtn.disabled = false;
                    } else {
                        validationStatus.innerHTML = '<i class="fas fa-times text-error"></i> Token is invalid or expired';
                        validateBtn.disabled = true;
                    }
                }, 1000);
            });
            
            // Focus on input
            setTimeout(() => tokenInput.focus(), 100);
            
            // Handle save
            validateBtn.addEventListener('click', async () => {
                const token = tokenInput.value.trim();
                
                if (!token) {
                    alert('Please enter a token');
                    return;
                }
                
                try {
                    validateBtn.disabled = true;
                    validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                    
                    // Double-check validation
                    const isValid = await this.validateToken(token);
                    if (!isValid) {
                        alert('Token validation failed. Please check your token and try again.');
                        validateBtn.disabled = false;
                        validateBtn.innerHTML = '<i class="fas fa-key"></i> Validate & Save Token';
                        return;
                    }
                    
                    // Save token
                    await this.saveToken(token);
                    
                    // Try to connect
                    const connected = await this.connectToGitHub();
                    
                    modal.remove();
                    
                    if (connected) {
                        alert('GitHub token saved and connected successfully!');
                        resolve(true);
                    } else {
                        alert('Token saved, but auto-connect failed. You can manually connect in the MCP panel.');
                        resolve(true);
                    }
                    
                } catch (error) {
                    console.error('GitHub UI: Error saving token:', error);
                    alert(`Error saving token: ${error.message}`);
                    validateBtn.disabled = false;
                    validateBtn.innerHTML = '<i class="fas fa-key"></i> Validate & Save Token';
                }
            });
        });
    }

    /**
     * Show connection status display
     * @returns {HTMLElement} Status display element
     */
    createStatusDisplay() {
        const statusContainer = document.createElement('div');
        statusContainer.className = 'github-status-display';
        
        this.updateStatusDisplay(statusContainer);
        
        return statusContainer;
    }

    /**
     * Update connection status display
     * @param {HTMLElement} container - Status container element
     */
    async updateStatusDisplay(container) {
        const isConnected = this.isConnected();
        const hasToken = await this.hasValidToken();
        
        let statusHtml = '';
        
        if (isConnected) {
            const userInfo = await this.getUserInfo();
            const username = userInfo ? userInfo.login : 'Unknown';
            
            statusHtml = `
                <div class="connection-status connected">
                    <i class="fab fa-github text-success"></i>
                    <span>Connected as <strong>${username}</strong></span>
                    <button class="btn small-btn secondary-btn" onclick="this.disconnectGitHub()">
                        <i class="fas fa-unlink"></i> Disconnect
                    </button>
                </div>
            `;
        } else if (hasToken) {
            statusHtml = `
                <div class="connection-status disconnected">
                    <i class="fab fa-github text-warning"></i>
                    <span>Token saved but not connected</span>
                    <button class="btn small-btn primary-btn" onclick="this.connectToGitHub()">
                        <i class="fas fa-link"></i> Connect
                    </button>
                </div>
            `;
        } else {
            statusHtml = `
                <div class="connection-status not-configured">
                    <i class="fab fa-github text-muted"></i>
                    <span>Not configured</span>
                    <button class="btn small-btn primary-btn" onclick="this.showTokenSetupDialog()">
                        <i class="fas fa-plus"></i> Setup GitHub
                    </button>
                </div>
            `;
        }
        
        container.innerHTML = statusHtml;
    }

    /**
     * Show sharing dialog for GitHub connection
     * @returns {Promise<string|null>} Shareable link or null
     */
    async showSharingDialog() {
        const hasToken = await this.hasValidToken();
        if (!hasToken) {
            alert('No GitHub token configured. Please set up GitHub integration first.');
            return null;
        }
        
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'github-sharing-modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fab fa-github"></i> Share GitHub Connection</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove(); resolve(null);">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="sharing-options">
                            <p>Create a secure, encrypted link to share your GitHub connection with others.</p>
                            
                            <div class="form-group">
                                <label for="share-password">
                                    <i class="fas fa-lock"></i> Encryption Password
                                </label>
                                <input type="password" 
                                       id="share-password" 
                                       placeholder="Enter a secure password for encryption" 
                                       class="password-input" />
                                <small class="form-help">Recipients will need this password to decrypt the connection</small>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="include-function-library" checked>
                                    Include function library in share
                                </label>
                                <small class="form-help">Include your custom functions along with the GitHub connection</small>
                            </div>
                            
                            <div class="sharing-result" id="sharing-result" style="display: none;">
                                <label for="shareable-link">Shareable Link:</label>
                                <div class="input-with-copy">
                                    <input type="text" id="shareable-link" readonly />
                                    <button class="btn small-btn" onclick="this.copyToClipboard()">
                                        <i class="fas fa-copy"></i> Copy
                                    </button>
                                </div>
                                <small class="form-help text-warning">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    This link contains encrypted credentials. Share it securely.
                                </small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn secondary-btn" onclick="this.closest('.modal').remove(); resolve(null);">
                            Cancel
                        </button>
                        <button class="btn primary-btn" id="create-share-link">
                            <i class="fas fa-share"></i> Create Share Link
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const passwordInput = document.getElementById('share-password');
            const createBtn = document.getElementById('create-share-link');
            const includeFunctionLibrary = document.getElementById('include-function-library');
            const sharingResult = document.getElementById('sharing-result');
            const shareableLink = document.getElementById('shareable-link');
            
            createBtn.addEventListener('click', async () => {
                const password = passwordInput.value.trim();
                
                if (!password) {
                    alert('Please enter an encryption password');
                    return;
                }
                
                if (password.length < 8) {
                    alert('Password must be at least 8 characters long');
                    return;
                }
                
                try {
                    createBtn.disabled = true;
                    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
                    
                    const shareLink = await this.createShareableLink(password, {
                        includeFunctionLibrary: includeFunctionLibrary.checked
                    });
                    
                    if (shareLink) {
                        shareableLink.value = shareLink;
                        sharingResult.style.display = 'block';
                        createBtn.style.display = 'none';
                    } else {
                        alert('Failed to create shareable link');
                    }
                    
                } catch (error) {
                    console.error('GitHub UI: Error creating share link:', error);
                    alert(`Error creating share link: ${error.message}`);
                } finally {
                    createBtn.disabled = false;
                    createBtn.innerHTML = '<i class="fas fa-share"></i> Create Share Link';
                }
            });
            
            // Add copy to clipboard functionality
            window.copyToClipboard = () => {
                shareableLink.select();
                document.execCommand('copy');
                alert('Link copied to clipboard!');
            };
        });
    }

    /**
     * Quick setup for GitHub token
     * @returns {Promise<boolean>} True if setup completed
     */
    async quickSetup() {
        // Check if already has valid token
        if (await this.hasValidToken()) {
            const userInfo = await this.getUserInfo();
            const username = userInfo ? userInfo.login : 'Unknown';
            
            const proceed = confirm(`GitHub token already exists for user "${username}". Set up a new token?`);
            if (!proceed) {
                return this.isConnected() || await this.connectToGitHub();
            }
        }
        
        return await this.showTokenSetupDialog();
    }

    // Auth delegation methods

    /**
     * Validate GitHub token
     * @param {string} token - GitHub PAT token
     * @returns {Promise<boolean>} True if valid
     */
    async validateToken(token) {
        if (this.auth) {
            return await this.auth.validateToken(token);
        }
        
        // Fallback direct validation if no auth instance
        try {
            const response = await fetch('https://api.github.com/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'hacka.re-mcp-integration'
                }
            });
            return response.ok;
        } catch (error) {
            console.error('GitHub UI: Token validation failed:', error);
            return false;
        }
    }

    /**
     * Save token to storage
     * @param {string} token - GitHub PAT token
     */
    async saveToken(token) {
        if (this.auth) {
            return await this.auth.saveToken(token);
        }
        
        // Fallback storage if no auth instance
        try {
            await window.CoreStorageService.setValue('mcp_github_token', token);
        } catch (error) {
            throw new Error('Failed to save token to storage');
        }
    }

    /**
     * Get saved token
     * @returns {Promise<string|null>} Saved token or null
     */
    async getSavedToken() {
        if (this.auth) {
            return await this.auth.getSavedToken();
        }
        
        // Fallback storage if no auth instance
        try {
            return await window.CoreStorageService.getValue('mcp_github_token');
        } catch (error) {
            return null;
        }
    }

    /**
     * Remove saved token
     */
    async removeToken() {
        if (this.auth) {
            return await this.auth.removeToken();
        }
        
        // Fallback storage if no auth instance
        try {
            await window.CoreStorageService.removeValue('mcp_github_token');
        } catch (error) {
            console.error('GitHub UI: Error removing token:', error);
        }
    }

    /**
     * Check if token exists and is valid
     * @returns {Promise<boolean>} True if valid token exists
     */
    async hasValidToken() {
        if (this.auth) {
            return await this.auth.hasValidToken();
        }
        
        // Fallback validation if no auth instance
        try {
            const token = await this.getSavedToken();
            if (!token) return false;
            return await this.validateToken(token);
        } catch (error) {
            return false;
        }
    }

    /**
     * Connect to GitHub using saved token
     * @returns {Promise<boolean>} True if connected successfully
     */
    async connectToGitHub() {
        try {
            if (window.MCPServiceConnectors) {
                const connected = await window.MCPServiceConnectors.connectService('github');
                return connected;
            } else {
                console.warn('GitHub UI: MCP Service Connectors not available');
                return false;
            }
        } catch (error) {
            console.error('GitHub UI: Connection failed:', error);
            return false;
        }
    }

    /**
     * Disconnect from GitHub
     * @returns {Promise<boolean>} True if disconnected successfully
     */
    async disconnectGitHub() {
        try {
            if (window.MCPServiceConnectors) {
                await window.MCPServiceConnectors.disconnectService('github');
                return true;
            } else {
                console.warn('GitHub UI: MCP Service Connectors not available');
                return false;
            }
        } catch (error) {
            console.error('GitHub UI: Disconnection failed:', error);
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
                   window.MCPServiceConnectors.isConnected('github') : false;
        } catch (error) {
            console.error('GitHub UI: Error checking connection:', error);
            return false;
        }
    }

    /**
     * Get user info from GitHub
     * @returns {Promise<Object|null>} User info or null
     */
    async getUserInfo() {
        if (this.auth) {
            const credentials = await this.auth.getCredentials();
            if (credentials) {
                return await this.auth.getUserInfo(credentials.token);
            }
        }
        
        // Fallback direct API call if no auth instance
        try {
            const token = await this.getSavedToken();
            if (!token) return null;
            
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'hacka.re-mcp-integration'
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
            
            return null;
            
        } catch (error) {
            console.error('GitHub UI: Error getting user info:', error);
            return null;
        }
    }

    /**
     * Create a shareable link for the GitHub token
     * @param {string} password - Password for encryption
     * @param {Object} options - Sharing options
     * @param {boolean} options.includeFunctionLibrary - Include function library
     * @returns {Promise<string|null>} Shareable link or null if no token
     */
    async createShareableLink(password, options = {}) {
        try {
            const token = await this.getSavedToken();
            if (!token) {
                console.warn('GitHub UI: No token available for sharing');
                return null;
            }
            
            // Use the unified sharing API
            const shareableLink = await window.ShareService.createShareLink({
                password: password,
                mcpConnections: { github: token },
                includeMcpConnections: true,
                includeFunctionLibrary: options.includeFunctionLibrary || false
            });
            
            console.log('GitHub UI: Created shareable link with length:', shareableLink.length);
            return shareableLink;
            
        } catch (error) {
            console.error('GitHub UI: Error creating shareable link:', error);
            return null;
        }
    }
}

// Create and export global instance (for backwards compatibility)
export const gitHubUI = new GitHubUI();

// Also make it available globally
window.GitHubTokenManager = gitHubUI;