/**
 * Quick Connectors UI Component
 * 
 * Handles the rendering and management of quick connector cards
 */

window.QuickConnectorsUI = (function() {
    'use strict';

    /**
     * Create quick connectors UI section
     */
    function createQuickConnectorsUI(container) {
        console.log('[QuickConnectorsUI] Creating quick connectors UI', container);
        
        const section = document.createElement('div');
        section.className = 'mcp-quick-connectors-section';
        section.innerHTML = `
            <h3>🚀 Quick Connect</h3>
            <p class="form-help">Connect to popular services with one click</p>
            <div class="quick-connectors-grid" id="quick-connectors-grid">
                <!-- Connector cards will be added here -->
            </div>
        `;
        
        container.appendChild(section);
        
        // Render connector cards
        renderConnectorCards();
        
        return section;
    }

    /**
     * Render connector cards
     */
    function renderConnectorCards() {
        const grid = document.getElementById('quick-connectors-grid');
        if (!grid) return;

        // Get available services from the service connectors
        const availableServices = window.MCPServiceConnectors?.getAvailableServices() || [];
        
        grid.innerHTML = '';
        
        availableServices.forEach(service => {
            const card = createConnectorCard(service);
            grid.appendChild(card);
        });
    }

    /**
     * Create a connector card for a service
     */
    function createConnectorCard(service) {
        const card = document.createElement('div');
        card.className = `quick-connector-card ${service.connected ? 'connected' : ''}`;
        card.dataset.serviceKey = service.key;
        
        const toolCount = window.MCPServiceConnectors?.getToolCount(service.key) || 0;
        
        card.innerHTML = `
            <div class="connector-icon">
                <i class="${service.icon}"></i>
            </div>
            <div class="connector-info">
                <h4>${service.name}</h4>
                <p>${service.description}</p>
                <div class="connector-stats">
                    <span class="tool-count">${toolCount} tools</span>
                    ${service.connected ? '<span class="status-connected">✓ Connected</span>' : '<span class="status-disconnected">○ Not connected</span>'}
                </div>
            </div>
            <div class="connector-actions">
                ${service.connected ? 
                    `<button class="btn secondary-btn disconnect-btn" onclick="QuickConnectorsUI.disconnectService('${service.key}')">
                        Disconnect
                    </button>` :
                    `<button class="btn primary-btn connect-btn" onclick="QuickConnectorsUI.connectService('${service.key}')">
                        Connect
                    </button>`
                }
            </div>
        `;
        
        return card;
    }

    /**
     * Connect to a service
     */
    async function connectService(serviceKey) {
        console.log(`[QuickConnectorsUI] Connecting to ${serviceKey}...`);
        
        try {
            const button = document.querySelector(`[data-service-key="${serviceKey}"] .connect-btn`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            }
            
            const success = await window.MCPServiceConnectors.connectService(serviceKey);
            
            if (success) {
                console.log(`[QuickConnectorsUI] Successfully connected to ${serviceKey}`);
                // Refresh the UI
                renderConnectorCards();
                
                // Show success notification
                showNotification(`Successfully connected to ${serviceKey}!`, 'success');
            } else {
                console.warn(`[QuickConnectorsUI] Failed to connect to ${serviceKey}`);
                showNotification(`Failed to connect to ${serviceKey}`, 'error');
            }
        } catch (error) {
            console.error(`[QuickConnectorsUI] Error connecting to ${serviceKey}:`, error);
            showNotification(`Error connecting to ${serviceKey}: ${error.message}`, 'error');
        } finally {
            // Reset button state
            const button = document.querySelector(`[data-service-key="${serviceKey}"] .connect-btn`);
            if (button) {
                button.disabled = false;
                button.innerHTML = 'Connect';
            }
        }
    }

    /**
     * Disconnect from a service
     */
    async function disconnectService(serviceKey) {
        console.log(`[QuickConnectorsUI] Disconnecting from ${serviceKey}...`);
        
        try {
            await window.MCPServiceConnectors.disconnectService(serviceKey);
            
            // Refresh the UI
            renderConnectorCards();
            
            // Show success notification
            showNotification(`Disconnected from ${serviceKey}`, 'info');
        } catch (error) {
            console.error(`[QuickConnectorsUI] Error disconnecting from ${serviceKey}:`, error);
            showNotification(`Error disconnecting from ${serviceKey}: ${error.message}`, 'error');
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Refresh connector states
     */
    function refreshConnectorStates() {
        renderConnectorCards();
    }

    /**
     * Get connector status for a service
     */
    function getConnectorStatus(serviceKey) {
        return window.MCPServiceConnectors?.isConnected(serviceKey) || false;
    }

    // Public API
    return {
        createQuickConnectorsUI,
        renderConnectorCards,
        connectService,
        disconnectService,
        refreshConnectorStates,
        getConnectorStatus,
        showNotification
    };
})();