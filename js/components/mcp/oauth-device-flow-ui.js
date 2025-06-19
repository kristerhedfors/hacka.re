/**
 * OAuth Device Flow UI Component
 * 
 * Handles device flow authentication UI for services like GitHub
 */

window.OAuthDeviceFlowUI = (function() {
    'use strict';

    /**
     * Show device flow authentication dialog
     */
    function showDeviceFlowDialog(deviceData, config = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal active device-flow-modal';
        modal.id = 'device-flow-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="device-flow-header">
                    <h3>🔐 Device Authentication</h3>
                    <p class="device-flow-service">${config.serviceName || 'Service'} Authentication</p>
                </div>
                
                <div class="device-flow-instructions">
                    <div class="instruction-step">
                        <span class="step-number">1</span>
                        <div class="step-content">
                            <p>Visit the authentication page:</p>
                            <a href="${deviceData.verification_url || deviceData.verification_uri}" 
                               target="_blank" 
                               class="verification-link">
                                ${deviceData.verification_url || deviceData.verification_uri}
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div class="instruction-step">
                        <span class="step-number">2</span>
                        <div class="step-content">
                            <p>Enter this code when prompted:</p>
                            <div class="device-code-display">
                                <code class="device-code-large">${deviceData.user_code}</code>
                                <button class="btn copy-btn" 
                                        onclick="navigator.clipboard.writeText('${deviceData.user_code}').then(() => {
                                            this.innerHTML = '<i class=\"fas fa-check\"></i> Copied!';
                                            setTimeout(() => this.innerHTML = '<i class=\"fas fa-copy\"></i> Copy', 2000);
                                        })">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="instruction-step">
                        <span class="step-number">3</span>
                        <div class="step-content">
                            <p>Grant permissions when prompted</p>
                        </div>
                    </div>
                </div>
                
                <div class="device-flow-status">
                    <div class="status-indicator">
                        <i class="fas fa-spinner fa-spin status-icon"></i>
                        <span class="status-text">Waiting for authentication...</span>
                    </div>
                    
                    <div class="device-flow-timer">
                        <span id="device-flow-timer-text">
                            Expires in: <span id="timer-countdown">${Math.floor((deviceData.expires_in || 600) / 60)}:${String((deviceData.expires_in || 600) % 60).padStart(2, '0')}</span>
                        </span>
                    </div>
                </div>
                
                <div class="device-flow-actions">
                    <button class="btn secondary-btn" onclick="OAuthDeviceFlowUI.cancelDeviceFlow()">
                        Cancel
                    </button>
                    <button class="btn tertiary-btn" onclick="OAuthDeviceFlowUI.refreshDeviceFlow()">
                        <i class="fas fa-redo"></i> Refresh Status
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Start countdown timer
        startCountdownTimer(deviceData.expires_in || 600);
        
        return modal;
    }

    /**
     * Update device flow status
     */
    function updateDeviceFlowStatus(status, message) {
        const statusIcon = document.querySelector('.device-flow-modal .status-icon');
        const statusText = document.querySelector('.device-flow-modal .status-text');
        
        if (!statusIcon || !statusText) return;
        
        switch (status) {
            case 'waiting':
                statusIcon.className = 'fas fa-spinner fa-spin status-icon';
                statusText.textContent = message || 'Waiting for authentication...';
                break;
            case 'success':
                statusIcon.className = 'fas fa-check-circle status-icon status-success';
                statusText.textContent = message || 'Authentication successful!';
                break;
            case 'error':
                statusIcon.className = 'fas fa-exclamation-circle status-icon status-error';
                statusText.textContent = message || 'Authentication failed';
                break;
            case 'expired':
                statusIcon.className = 'fas fa-clock status-icon status-warning';
                statusText.textContent = message || 'Authentication expired';
                break;
        }
    }

    /**
     * Start countdown timer
     */
    function startCountdownTimer(totalSeconds) {
        const timerElement = document.getElementById('timer-countdown');
        if (!timerElement) return;
        
        let remainingSeconds = totalSeconds;
        
        const timer = setInterval(() => {
            remainingSeconds--;
            
            if (remainingSeconds <= 0) {
                clearInterval(timer);
                updateDeviceFlowStatus('expired', 'Authentication expired');
                timerElement.textContent = '0:00';
                return;
            }
            
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timerElement.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
        
        // Store timer ID for cleanup
        const modal = document.getElementById('device-flow-modal');
        if (modal) {
            modal.dataset.timerId = timer;
        }
    }

    /**
     * Show manual device flow entry (for CORS issues)
     */
    function showManualDeviceFlow(config = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal active manual-device-flow-modal';
        modal.id = 'manual-device-flow-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="manual-flow-header">
                    <h3>🔧 Manual Device Flow</h3>
                    <p>Complete the authentication manually due to browser restrictions</p>
                </div>
                
                <div class="manual-flow-instructions">
                    <div class="instruction-block">
                        <h4>Step 1: Get Device Code</h4>
                        <p>Run this command to get your device code:</p>
                        <div class="code-block">
                            <code id="device-code-curl">
curl -X POST https://github.com/login/device/code \\
  -H "Accept: application/json" \\
  -d "client_id=${config.clientId || 'YOUR_CLIENT_ID'}&scope=repo%20read:user"
                            </code>
                            <button class="btn copy-btn" onclick="copyToClipboard('device-code-curl')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="instruction-block">
                        <h4>Step 2: Enter Device Code Below</h4>
                        <div class="form-group">
                            <label for="manual-device-code">Device Code (from step 1 response)</label>
                            <input type="text" 
                                   id="manual-device-code" 
                                   placeholder="Paste the user_code from the curl response"
                                   class="mcp-input" />
                        </div>
                        
                        <div class="form-group">
                            <label for="manual-verification-url">Verification URL</label>
                            <input type="text" 
                                   id="manual-verification-url" 
                                   placeholder="Paste the verification_uri from the curl response"
                                   class="mcp-input" />
                        </div>
                    </div>
                    
                    <div class="instruction-block">
                        <h4>Step 3: Authenticate</h4>
                        <p>Visit the verification URL and enter your device code, then click "Check Status" below.</p>
                    </div>
                </div>
                
                <div class="manual-flow-actions">
                    <button class="btn primary-btn" onclick="OAuthDeviceFlowUI.checkManualDeviceStatus()">
                        Check Authentication Status
                    </button>
                    <button class="btn secondary-btn" onclick="OAuthDeviceFlowUI.cancelManualDeviceFlow()">
                        Cancel
                    </button>
                </div>
                
                <div class="manual-flow-status" id="manual-flow-status" style="display: none;">
                    <div class="status-indicator">
                        <i class="fas fa-spinner fa-spin status-icon"></i>
                        <span class="status-text">Checking authentication status...</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Close device flow modal
     */
    function closeDeviceFlowModal() {
        const modal = document.getElementById('device-flow-modal');
        if (modal) {
            // Clear timer if exists
            const timerId = modal.dataset.timerId;
            if (timerId) {
                clearInterval(parseInt(timerId));
            }
            modal.remove();
        }
    }

    /**
     * Close manual device flow modal
     */
    function closeManualDeviceFlowModal() {
        const modal = document.getElementById('manual-device-flow-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Cancel device flow
     */
    function cancelDeviceFlow() {
        closeDeviceFlowModal();
        console.log('[Device Flow] User cancelled device flow');
    }

    /**
     * Cancel manual device flow
     */
    function cancelManualDeviceFlow() {
        closeManualDeviceFlowModal();
        console.log('[Device Flow] User cancelled manual device flow');
    }

    /**
     * Refresh device flow status
     */
    function refreshDeviceFlow() {
        updateDeviceFlowStatus('waiting', 'Checking authentication status...');
        console.log('[Device Flow] Refreshing status...');
        
        // Trigger a status check if callback exists
        if (window.deviceFlowStatusCallback) {
            window.deviceFlowStatusCallback();
        }
    }

    /**
     * Check manual device authentication status
     */
    function checkManualDeviceStatus() {
        const deviceCode = document.getElementById('manual-device-code')?.value?.trim();
        const verificationUrl = document.getElementById('manual-verification-url')?.value?.trim();
        
        if (!deviceCode || !verificationUrl) {
            alert('Please enter both the device code and verification URL');
            return;
        }
        
        const statusDiv = document.getElementById('manual-flow-status');
        if (statusDiv) {
            statusDiv.style.display = 'block';
        }
        
        // Trigger manual status check if callback exists
        if (window.manualDeviceFlowCallback) {
            window.manualDeviceFlowCallback(deviceCode, verificationUrl);
        }
        
        console.log('[Device Flow] Checking manual device status...', { deviceCode, verificationUrl });
    }

    /**
     * Copy text to clipboard
     */
    window.copyToClipboard = function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            navigator.clipboard.writeText(element.textContent).then(() => {
                console.log('[Device Flow] Copied to clipboard');
            });
        }
    };

    // Public API
    return {
        showDeviceFlowDialog,
        updateDeviceFlowStatus,
        showManualDeviceFlow,
        closeDeviceFlowModal,
        closeManualDeviceFlowModal,
        cancelDeviceFlow,
        cancelManualDeviceFlow,
        refreshDeviceFlow,
        checkManualDeviceStatus
    };
})();