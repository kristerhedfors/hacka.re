/**
 * MCP Connections UI Component
 * Provides UI for managing MCP connections and their sharing
 */

// GitHub token manager is now available globally as window.GitHubTokenManager
// from the new modular provider structure
import { getMcpConnectionsSummary } from '../share/mcp-connections-share-item.js';

export class MCPConnectionsUI {
    constructor() {
        this.githubManager = null;
        this.initialized = false;
    }

    /**
     * Initialize the UI component
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('MCP Connections UI: Initializing...');
        
        // Initialize GitHub token manager (wait for it to be loaded)
        if (window.GitHubTokenManager) {
            this.githubManager = window.GitHubTokenManager;
            await this.githubManager.initialize();
        } else {
            console.warn('MCP Connections UI: GitHubTokenManager not yet loaded, will retry later');
            // Set up a retry mechanism
            const retryInit = () => {
                if (window.GitHubTokenManager) {
                    this.githubManager = window.GitHubTokenManager;
                    this.githubManager.initialize();
                } else {
                    setTimeout(retryInit, 100);
                }
            };
            setTimeout(retryInit, 100);
        }
        
        this.initialized = true;
        console.log('MCP Connections UI: Initialized');
    }

    /**
     * Show MCP connections management dialog
     */
    async showConnectionsDialog() {
        await this.initialize();
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'mcp-connections-modal';
        
        // Get current connections summary
        const summary = await getMcpConnectionsSummary();
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plug"></i> MCP Connections</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove();">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="connections-summary">
                        <h4>Current Connections</h4>
                        <div class="connections-status" id="connections-status">
                            ${await this.generateConnectionsStatus(summary)}
                        </div>
                    </div>
                    
                    <div class="available-services">
                        <h4>Available Services</h4>
                        <div class="service-cards">
                            ${await this.generateServiceCards()}
                        </div>
                    </div>
                    
                    <div class="sharing-info">
                        <h4>Sharing MCP Connections</h4>
                        <p>You can include your MCP connections when creating share links. This allows others to use the same services with your credentials.</p>
                        <div class="warning-box">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Security Note:</strong> Only share connections with trusted individuals. 
                            Shared tokens will have the same permissions as your original tokens.
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn secondary-btn" onclick="this.closest('.modal').remove();">
                        Close
                    </button>
                    <button class="btn primary-btn" id="refresh-connections">
                        <i class="fas fa-sync"></i> Refresh Status
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup event listeners
        this.setupEventListeners(modal);
    }

    /**
     * Generate connections status HTML
     * @param {Object} summary - Connections summary
     * @returns {Promise<string>} HTML string
     */
    async generateConnectionsStatus(summary) {
        if (summary.total === 0) {
            return `
                <div class="no-connections">
                    <i class="fas fa-info-circle"></i>
                    <p>No MCP connections configured yet.</p>
                </div>
            `;
        }
        
        let html = `<div class="connections-list">`;
        
        for (const service of summary.services) {
            const type = summary.types[service];
            const icon = this.getServiceIcon(service);
            const isConnected = this.isServiceConnected(service);
            
            html += `
                <div class="connection-item ${isConnected ? 'connected' : 'configured'}">
                    <div class="connection-info">
                        <i class="${icon}"></i>
                        <span class="service-name">${this.getServiceDisplayName(service)}</span>
                        <span class="connection-type">${type}</span>
                    </div>
                    <div class="connection-status">
                        <span class="status-indicator ${isConnected ? 'connected' : 'configured'}">
                            ${isConnected ? 'Connected' : 'Configured'}
                        </span>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }

    /**
     * Generate service cards HTML
     * @returns {Promise<string>} HTML string
     */
    async generateServiceCards() {
        const services = [
            {
                key: 'github',
                name: 'GitHub',
                icon: 'fab fa-github',
                description: 'Access repositories, issues, and files',
                authType: 'Personal Access Token',
                supported: true
            },
            {
                key: 'gmail',
                name: 'Gmail',
                icon: 'fas fa-envelope',
                description: 'Send and read emails',
                authType: 'OAuth 2.0',
                supported: false // Not yet implemented in this simplified version
            },
            {
                key: 'gdocs',
                name: 'Google Docs',
                icon: 'fas fa-file-alt',
                description: 'Read and edit documents',
                authType: 'OAuth 2.0',
                supported: false // Not yet implemented in this simplified version
            }
        ];
        
        let html = '';
        
        for (const service of services) {
            const hasToken = await this.hasServiceToken(service.key);
            const isConnected = this.isServiceConnected(service.key);
            
            html += `
                <div class="service-card ${!service.supported ? 'disabled' : ''}">
                    <div class="service-header">
                        <i class="${service.icon}"></i>
                        <h5>${service.name}</h5>
                        ${!service.supported ? '<span class="coming-soon">Coming Soon</span>' : ''}
                    </div>
                    <div class="service-description">
                        <p>${service.description}</p>
                        <small>Auth: ${service.authType}</small>
                    </div>
                    <div class="service-actions">
                        ${service.supported ? this.generateServiceActions(service, hasToken, isConnected) : ''}
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    /**
     * Generate service action buttons
     * @param {Object} service - Service configuration
     * @param {boolean} hasToken - Whether service has token
     * @param {boolean} isConnected - Whether service is connected
     * @returns {string} HTML string
     */
    generateServiceActions(service, hasToken, isConnected) {
        if (service.key === 'github') {
            if (isConnected) {
                return `
                    <button class="btn success-btn btn-sm" disabled>
                        <i class="fas fa-check"></i> Connected
                    </button>
                    <button class="btn secondary-btn btn-sm" onclick="window.mcpConnectionsUI.disconnectGitHub()">
                        Disconnect
                    </button>
                `;
            } else if (hasToken) {
                return `
                    <button class="btn primary-btn btn-sm" onclick="window.mcpConnectionsUI.connectGitHub()">
                        <i class="fas fa-plug"></i> Connect
                    </button>
                    <button class="btn secondary-btn btn-sm" onclick="window.mcpConnectionsUI.setupGitHub()">
                        Reconfigure
                    </button>
                `;
            } else {
                return `
                    <button class="btn primary-btn btn-sm" onclick="window.mcpConnectionsUI.setupGitHub()">
                        <i class="fas fa-cog"></i> Setup
                    </button>
                `;
            }
        }
        
        return `
            <button class="btn secondary-btn btn-sm" disabled>
                Setup
            </button>
        `;
    }

    /**
     * Setup event listeners
     * @param {Element} modal - Modal element
     */
    setupEventListeners(modal) {
        const refreshBtn = modal.querySelector('#refresh-connections');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.refreshConnectionsStatus(modal);
            });
        }
    }

    /**
     * Refresh connections status in modal
     * @param {Element} modal - Modal element
     */
    async refreshConnectionsStatus(modal) {
        const statusContainer = modal.querySelector('#connections-status');
        if (statusContainer) {
            statusContainer.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            
            const summary = await getMcpConnectionsSummary();
            statusContainer.innerHTML = await this.generateConnectionsStatus(summary);
        }
    }

    /**
     * Setup GitHub connection
     */
    async setupGitHub() {
        try {
            const success = await this.githubManager.quickSetup();
            if (success) {
                // Refresh any open modals
                const modal = document.getElementById('mcp-connections-modal');
                if (modal) {
                    await this.refreshConnectionsStatus(modal);
                }
            }
        } catch (error) {
            console.error('MCP Connections UI: GitHub setup failed:', error);
            alert(`GitHub setup failed: ${error.message}`);
        }
    }

    /**
     * Connect to GitHub
     */
    async connectGitHub() {
        try {
            const connected = await this.githubManager.connectToGitHub();
            if (connected) {
                alert('Connected to GitHub successfully!');
                
                // Refresh any open modals
                const modal = document.getElementById('mcp-connections-modal');
                if (modal) {
                    await this.refreshConnectionsStatus(modal);
                }
            } else {
                alert('Failed to connect to GitHub. Please check your token.');
            }
        } catch (error) {
            console.error('MCP Connections UI: GitHub connection failed:', error);
            alert(`GitHub connection failed: ${error.message}`);
        }
    }

    /**
     * Disconnect GitHub
     */
    async disconnectGitHub() {
        if (!confirm('Are you sure you want to disconnect from GitHub? This will remove all GitHub functions.')) {
            return;
        }
        
        try {
            if (window.MCPServiceConnectors) {
                await window.MCPServiceConnectors.disconnectService('github');
                alert('Disconnected from GitHub successfully.');
                
                // Refresh any open modals
                const modal = document.getElementById('mcp-connections-modal');
                if (modal) {
                    await this.refreshConnectionsStatus(modal);
                }
            }
        } catch (error) {
            console.error('MCP Connections UI: GitHub disconnect failed:', error);
            alert(`GitHub disconnect failed: ${error.message}`);
        }
    }

    /**
     * Check if service has token
     * @param {string} serviceKey - Service key
     * @returns {Promise<boolean>} True if has token
     */
    async hasServiceToken(serviceKey) {
        try {
            if (serviceKey === 'github') {
                return await this.githubManager.hasValidToken();
            }
            // Add other services here
            return false;
        } catch (error) {
            console.error(`MCP Connections UI: Error checking ${serviceKey} token:`, error);
            return false;
        }
    }

    /**
     * Check if service is connected
     * @param {string} serviceKey - Service key
     * @returns {boolean} True if connected
     */
    isServiceConnected(serviceKey) {
        try {
            if (window.MCPServiceConnectors) {
                return window.MCPServiceConnectors.isConnected(serviceKey);
            }
            return false;
        } catch (error) {
            console.error(`MCP Connections UI: Error checking ${serviceKey} connection:`, error);
            return false;
        }
    }

    /**
     * Get service icon
     * @param {string} serviceKey - Service key
     * @returns {string} Icon class
     */
    getServiceIcon(serviceKey) {
        const icons = {
            github: 'fab fa-github',
            gmail: 'fas fa-envelope',
            gdocs: 'fas fa-file-alt'
        };
        return icons[serviceKey] || 'fas fa-plug';
    }

    /**
     * Get service display name
     * @param {string} serviceKey - Service key
     * @returns {string} Display name
     */
    getServiceDisplayName(serviceKey) {
        const names = {
            github: 'GitHub',
            gmail: 'Gmail',
            gdocs: 'Google Docs'
        };
        return names[serviceKey] || serviceKey;
    }

    /**
     * Add MCP connections button to share modal
     */
    addToShareModal() {
        const shareModal = document.querySelector('.share-modal, #share-modal');
        if (!shareModal) return;
        
        // Look for existing MCP connections checkbox area
        let mcpSection = shareModal.querySelector('.mcp-connections-section');
        if (mcpSection) return; // Already added
        
        // Find the share items container
        const shareItemsContainer = shareModal.querySelector('.checkbox-container, .share-items');
        if (!shareItemsContainer) return;
        
        // Add MCP connections section
        mcpSection = document.createElement('div');
        mcpSection.className = 'checkbox-group mcp-connections-section';
        mcpSection.innerHTML = `
            <input type="checkbox" id="share-mcp-connections" class="share-checkbox">
            <label for="share-mcp-connections">
                Include MCP Connections
                <span class="sensitive-indicator" title="Contains sensitive data">🔒</span>
            </label>
            <button type="button" class="btn-link" onclick="window.mcpConnectionsUI.showConnectionsDialog()">
                <i class="fas fa-cog"></i> Manage
            </button>
        `;
        
        shareItemsContainer.appendChild(mcpSection);
    }
}

// Create global instance
window.mcpConnectionsUI = new MCPConnectionsUI();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mcpConnectionsUI.initialize();
    });
} else {
    window.mcpConnectionsUI.initialize();
}