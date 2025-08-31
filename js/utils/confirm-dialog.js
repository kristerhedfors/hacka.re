/**
 * Custom confirmation dialog that works across all browsers including Firefox Focus
 * Replaces window.confirm() which is blocked by some privacy-focused browsers
 */
(function() {
    'use strict';

    /**
     * Create and show a custom confirmation dialog
     * @param {string} message - The message to display
     * @param {Function} onConfirm - Callback when user confirms
     * @param {Function} onCancel - Optional callback when user cancels
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
     */
    function showConfirmDialog(message, onConfirm, onCancel) {
        return new Promise((resolve) => {
            // Check if we're in Firefox Focus or similar privacy browser
            const isPrivacyBrowser = detectPrivacyBrowser();
            
            // Try native confirm first if not in privacy browser
            if (!isPrivacyBrowser) {
                try {
                    const result = window.confirm(message);
                    if (result) {
                        if (onConfirm) onConfirm();
                    } else {
                        if (onCancel) onCancel();
                    }
                    resolve(result);
                    return;
                } catch (e) {
                    // Fall through to custom dialog
                    console.log('Native confirm blocked, using custom dialog');
                }
            }

            // Create custom modal
            const modal = document.createElement('div');
            modal.className = 'custom-confirm-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s;
            `;

            const dialog = document.createElement('div');
            dialog.className = 'custom-confirm-dialog';
            dialog.style.cssText = `
                background: var(--bg-color, white);
                color: var(--text-color, #333);
                border-radius: 8px;
                padding: 20px;
                max-width: 90%;
                width: 400px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                animation: slideIn 0.2s;
            `;

            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                margin-bottom: 20px;
                font-size: 16px;
                line-height: 1.5;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;
            messageDiv.textContent = message;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                background: var(--secondary-color, #6c757d);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                min-width: 80px;
            `;

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'OK';
            confirmBtn.style.cssText = `
                padding: 8px 16px;
                background: var(--danger-color, #dc3545);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                min-width: 80px;
            `;

            // For delete/clear operations, use danger color
            if (message.toLowerCase().includes('delete') || 
                message.toLowerCase().includes('clear') || 
                message.toLowerCase().includes('remove')) {
                confirmBtn.style.background = 'var(--danger-color, #dc3545)';
            } else {
                confirmBtn.style.background = 'var(--primary-color, #007bff)';
            }

            // Add hover effects
            cancelBtn.onmouseover = () => cancelBtn.style.opacity = '0.8';
            cancelBtn.onmouseout = () => cancelBtn.style.opacity = '1';
            confirmBtn.onmouseover = () => confirmBtn.style.opacity = '0.8';
            confirmBtn.onmouseout = () => confirmBtn.style.opacity = '1';

            // Handle button clicks
            const handleConfirm = () => {
                modal.remove();
                if (onConfirm) onConfirm();
                resolve(true);
            };

            const handleCancel = () => {
                modal.remove();
                if (onCancel) onCancel();
                resolve(false);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);

            // Handle Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);

            // Handle click outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            });

            // Assemble and show modal
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            dialog.appendChild(messageDiv);
            dialog.appendChild(buttonContainer);
            modal.appendChild(dialog);
            document.body.appendChild(modal);

            // Focus confirm button for accessibility
            confirmBtn.focus();

            // Add animations
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            if (!document.querySelector('style[data-confirm-dialog]')) {
                style.setAttribute('data-confirm-dialog', 'true');
                document.head.appendChild(style);
            }
        });
    }

    /**
     * Detect if we're in a privacy-focused browser that blocks dialogs
     * @returns {boolean}
     */
    function detectPrivacyBrowser() {
        const ua = navigator.userAgent.toLowerCase();
        
        // Firefox Focus/Klar detection
        if (ua.includes('focus') || ua.includes('klar')) {
            return true;
        }

        // DuckDuckGo browser
        if (ua.includes('duckduckgo')) {
            return true;
        }

        // Brave browser in strict mode
        if (window.brave && ua.includes('brave')) {
            return true;
        }

        // Test if confirm is actually blocked
        try {
            // Create a test to see if confirm works
            const testConfirm = window.confirm.toString();
            if (testConfirm.includes('[native code]')) {
                return false;
            }
        } catch (e) {
            return true;
        }

        return false;
    }

    /**
     * Override global confirm if needed
     * This provides a fallback for all confirm() calls in the app
     */
    function overrideGlobalConfirm() {
        const originalConfirm = window.confirm;
        
        window.customConfirm = showConfirmDialog;
        
        // Override window.confirm with our custom implementation
        window.confirm = function(message) {
            // Check if we're in a privacy browser or confirm is blocked
            if (detectPrivacyBrowser()) {
                // Use custom dialog synchronously (blocks with a flag)
                let result = false;
                let resolved = false;
                
                showConfirmDialog(message).then(res => {
                    result = res;
                    resolved = true;
                });
                
                // This is not ideal but necessary for backward compatibility
                // Modern code should use customConfirm() directly with promises
                console.warn('Using synchronous fallback for confirm dialog. Consider using customConfirm() with promises.');
                
                // Return false immediately for Firefox Focus
                // The action will need to be retriggered after the custom dialog
                return false;
            }
            
            // Try native confirm
            try {
                return originalConfirm.call(window, message);
            } catch (e) {
                console.error('Confirm dialog blocked:', e);
                return false;
            }
        };
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', overrideGlobalConfirm);
    } else {
        overrideGlobalConfirm();
    }

    // Export for use in modules
    window.customConfirm = showConfirmDialog;
    window.detectPrivacyBrowser = detectPrivacyBrowser;
})();