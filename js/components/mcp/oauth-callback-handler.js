/**
 * OAuth Callback Handler
 * 
 * Handles OAuth redirect callbacks and URL parameter processing
 */

window.OAuthCallbackHandler = (function() {
    'use strict';

    /**
     * Check if current page is an OAuth callback
     */
    async function checkForOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        if (code && state) {
            console.log('[OAuth Callback] Detected OAuth callback with code and state');
            
            const stateParts = state.split(':');
            const baseState = stateParts[0];
            const namespaceId = stateParts[1];
            const encodedSessionKey = stateParts[2];
            
            if (namespaceId) {
                console.log(`[OAuth Callback] OAuth callback for namespace: ${namespaceId}`);
            }
            
            // Check if this is a device flow provider (GitHub)
            if (await isDeviceFlowProvider(state)) {
                console.log('[OAuth Callback] Detected device flow provider - redirecting');
                window.history.replaceState({}, document.title, window.location.pathname);
                showDeviceFlowMessage();
                return;
            }
            
            // Restore session if needed
            if (encodedSessionKey) {
                console.log('[OAuth Callback] Session key found in state parameter');
                restoreSessionFromState(encodedSessionKey, namespaceId);
            } else if (namespaceId && !getSessionKey()) {
                console.log('[OAuth Callback] No session key in state, prompting user');
                promptForSessionPassword(namespaceId);
            }
            
            // Handle OAuth callback
            return await handleOAuthCallback(code, state, error);
        }
        
        return null;
    }

    /**
     * Check if the OAuth flow is for a device flow provider
     */
    async function isDeviceFlowProvider(state) {
        try {
            const oauthService = window.MCPOAuthService?.OAuthService;
            if (!oauthService) return false;
            
            const service = new oauthService();
            let pendingFlow = service.pendingFlows?.get(state);
            
            if (!pendingFlow) {
                await service.loadPendingFlows?.();
                pendingFlow = service.pendingFlows?.get(state);
            }
            
            return pendingFlow?.config && 
                   (pendingFlow.config.provider === 'github' || pendingFlow.config.useDeviceFlow);
        } catch (error) {
            console.error('[OAuth Callback] Error checking device flow provider:', error);
            return false;
        }
    }

    /**
     * Handle OAuth callback processing
     */
    async function handleOAuthCallback(code, state, error) {
        try {
            if (error) {
                console.error('[OAuth Callback] OAuth error:', error);
                showCallbackError(error);
                return false;
            }
            
            console.log('[OAuth Callback] Processing OAuth callback...');
            
            // Use existing OAuth service to handle the callback
            const oauthService = window.MCPOAuthService?.OAuthService;
            if (!oauthService) {
                throw new Error('OAuth service not available');
            }
            
            const service = new oauthService();
            const result = await service.handleAuthorizationCallback?.(code, state);
            
            if (result) {
                console.log('[OAuth Callback] OAuth callback processed successfully');
                showCallbackSuccess();
                
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[OAuth Callback] Error processing OAuth callback:', error);
            showCallbackError(error.message);
            return false;
        }
    }

    /**
     * Restore session from state parameter
     */
    function restoreSessionFromState(encodedSessionKey, namespaceId) {
        try {
            let paddedEncodedSession = encodedSessionKey;
            while (paddedEncodedSession.length % 4) {
                paddedEncodedSession += '=';
            }
            const sessionKey = atob(paddedEncodedSession);
            
            console.log(`[OAuth Callback] Restoring session for namespace: ${namespaceId}`);
            
            if (setSessionKey(sessionKey)) {
                console.log('[OAuth Callback] Session key restored from state parameter');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[OAuth Callback] Failed to restore session from state parameter:', error);
            return false;
        }
    }

    /**
     * Prompt user for session password
     */
    function promptForSessionPassword(namespaceId) {
        const password = prompt(
            `OAuth callback detected for namespace ${namespaceId}.\n\n` +
            'Please enter your session password to complete the OAuth flow:'
        );
        
        if (password) {
            if (setSessionKey(password)) {
                console.log('[OAuth Callback] Session password set via user prompt');
                
                // Clean up URL parameter
                const url = new URL(window.location);
                url.searchParams.delete('oauth_namespace');
                window.history.replaceState({}, document.title, url.toString());
                
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get current session key
     */
    function getSessionKey() {
        if (window.aiHackare?.shareManager?.getSessionKey) {
            return window.aiHackare.shareManager.getSessionKey();
        } else if (window.ShareManager?.getSessionKey) {
            return window.ShareManager.getSessionKey();
        }
        return null;
    }

    /**
     * Set session key
     */
    function setSessionKey(sessionKey) {
        if (window.aiHackare?.shareManager?.setSessionKey) {
            window.aiHackare.shareManager.setSessionKey(sessionKey);
            return true;
        } else if (window.ShareManager?.setSessionKey) {
            window.ShareManager.setSessionKey(sessionKey);
            return true;
        }
        
        console.error('[OAuth Callback] ShareManager not available for session restoration');
        return false;
    }

    /**
     * Show device flow message
     */
    function showDeviceFlowMessage() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Device Flow Authentication</h3>
                <p>This service uses device flow authentication. Please use the device flow interface instead of browser redirects.</p>
                <div class="form-actions">
                    <button class="btn primary-btn" onclick="this.closest('.modal').remove()">
                        OK
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Show callback success message
     */
    function showCallbackSuccess() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>✅ Authentication Successful</h3>
                <p>OAuth authentication completed successfully. You can now close this window.</p>
                <div class="form-actions">
                    <button class="btn primary-btn" onclick="this.closest('.modal').remove()">
                        Continue
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Show callback error message
     */
    function showCallbackError(error) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>❌ Authentication Failed</h3>
                <p>OAuth authentication failed: ${error}</p>
                <div class="form-actions">
                    <button class="btn primary-btn" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Public API
    return {
        checkForOAuthCallback,
        handleOAuthCallback,
        restoreSessionFromState,
        promptForSessionPassword,
        showCallbackSuccess,
        showCallbackError
    };
})();