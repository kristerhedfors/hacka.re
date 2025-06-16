/**
 * GitHub Token Manager
 * Simplified management for GitHub classic tokens in MCP connections
 */

export class GitHubTokenManager {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the token manager
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('GitHub Token Manager: Initializing...');
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
                
                // Clear previous timeout
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
                
                // Show checking status
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
                    console.error('GitHub Token Manager: Error saving token:', error);
                    alert(`Error saving token: ${error.message}`);
                    validateBtn.disabled = false;
                    validateBtn.innerHTML = '<i class="fas fa-key"></i> Validate & Save Token';
                }
            });
        });
    }

    /**
     * Validate GitHub token
     * @param {string} token - GitHub PAT token
     * @returns {Promise<boolean>} True if valid
     */
    async validateToken(token) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch('https://api.github.com/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'hacka.re-mcp-integration'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
            
        } catch (error) {
            console.error('GitHub Token Manager: Validation failed:', error);
            return false;
        }
    }

    /**
     * Save token to storage
     * @param {string} token - GitHub PAT token
     */
    async saveToken(token) {
        try {
            await window.CoreStorageService.setValue('mcp_github_token', token);
            console.log('GitHub Token Manager: Token saved successfully');
        } catch (error) {
            console.error('GitHub Token Manager: Error saving token:', error);
            throw new Error('Failed to save token to storage');
        }
    }

    /**
     * Get saved token
     * @returns {Promise<string|null>} Saved token or null
     */
    async getSavedToken() {
        try {
            return await window.CoreStorageService.getValue('mcp_github_token');
        } catch (error) {
            console.error('GitHub Token Manager: Error getting token:', error);
            return null;
        }
    }

    /**
     * Remove saved token
     */
    async removeToken() {
        try {
            await window.CoreStorageService.removeValue('mcp_github_token');
            console.log('GitHub Token Manager: Token removed');
        } catch (error) {
            console.error('GitHub Token Manager: Error removing token:', error);
        }
    }

    /**
     * Check if token exists and is valid
     * @returns {Promise<boolean>} True if valid token exists
     */
    async hasValidToken() {
        try {
            const token = await this.getSavedToken();
            if (!token) return false;
            
            return await this.validateToken(token);
        } catch (error) {
            console.error('GitHub Token Manager: Error checking token:', error);
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
                console.warn('GitHub Token Manager: MCP Service Connectors not available');
                return false;
            }
        } catch (error) {
            console.error('GitHub Token Manager: Connection failed:', error);
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
            console.error('GitHub Token Manager: Error checking connection:', error);
            return false;
        }
    }

    /**
     * Get user info from GitHub
     * @returns {Promise<Object|null>} User info or null
     */
    async getUserInfo() {
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
            console.error('GitHub Token Manager: Error getting user info:', error);
            return null;
        }
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
}

// Create global instance
window.GitHubTokenManager = new GitHubTokenManager();