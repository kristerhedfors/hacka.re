/**
 * Shared Link Manager Module
 * Handles decryption and application of shared links for the AIHackare application
 */

window.SharedLinkManager = (function() {
    /**
     * Create a Shared Link Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Shared Link Manager instance
     */
    function createSharedLinkManager(elements) {
        // Pending shared model to be applied after models are fetched
        let pendingSharedModel = null;
        
        /**
         * Check if there's a shared link in the URL
         * @returns {boolean} True if there's a shared link
         */
        function hasSharedLink() {
            return LinkSharingService.hasSharedApiKey();
        }
        
        /**
         * Try decryption with session key
         * @param {Function} addSystemMessage - Function to add system messages
         * @param {Function} setMessages - Function to set chat messages
         * @returns {Promise|null} Promise if successful, null if failed
         */
        function trySessionKeyDecryption(addSystemMessage, setMessages) {
            if (!window.aiHackare || !window.aiHackare.shareManager) {
                return null;
            }
            
            const sessionKey = window.aiHackare.shareManager.getSessionKey();
            if (!sessionKey) {
                return null;
            }
            
            try {
                const sharedData = LinkSharingService.extractSharedApiKey(sessionKey);
                if (!sharedData || !sharedData.apiKey) {
                    return null;
                }
                
                const processedModel = SharedLinkDataProcessor.processSharedData(
                    sharedData, sessionKey, { addSystemMessage, setMessages, elements }
                );
                
                if (processedModel) {
                    pendingSharedModel = processedModel;
                }
                
                // Clear the shared data from the URL
                LinkSharingService.clearSharedApiKeyFromUrl();
                
                return Promise.resolve({
                    success: true,
                    pendingSharedModel: pendingSharedModel
                });
            } catch (error) {
                console.log('Current session key did not work for this shared link, prompting for password');
                return null;
            }
        }
        
        /**
         * Prompt for decryption password and handle shared data
         * @param {Function} addSystemMessage - Function to add system messages
         * @param {Function} setMessages - Function to set chat messages
         * @returns {Promise} Promise that resolves with success status and pending model
         */
        function promptForDecryptionPassword(addSystemMessage, setMessages) {
            // First try to use the current session key if available
            const sessionResult = trySessionKeyDecryption(addSystemMessage, setMessages);
            if (sessionResult) {
                return sessionResult;
            }
            
            // Create password modal
            const modalElements = SharedLinkModalManager.createPasswordModal();
            
            return new Promise((resolve) => {
                const handleSubmit = (password, { input, paragraph }) => {
                    try {
                        const sharedData = LinkSharingService.extractSharedApiKey(password);
                        
                        if (sharedData && sharedData.apiKey) {
                            const processedModel = SharedLinkDataProcessor.processSharedData(
                                sharedData, password, { addSystemMessage, setMessages, elements }
                            );
                            
                            if (processedModel) {
                                pendingSharedModel = processedModel;
                            }
                            
                            // Clear the shared data from the URL
                            LinkSharingService.clearSharedApiKeyFromUrl();
                            
                            // Remove the password modal
                            modalElements.modal.remove();
                            
                            resolve({
                                success: true,
                                pendingSharedModel: pendingSharedModel
                            });
                        } else {
                            SharedLinkModalManager.showModalError(
                                paragraph, input, 'Incorrect password. Please try again.'
                            );
                        }
                    } catch (error) {
                        SharedLinkModalManager.showModalError(
                            paragraph, input, 'Error decrypting data. Please try again.'
                        );
                    }
                };
                
                const handleCancel = () => {
                    resolve({
                        success: false,
                        pendingSharedModel: null
                    });
                };
                
                SharedLinkModalManager.setupModalInteractions(
                    modalElements, handleSubmit, handleCancel
                );
            });
        }
        
        /**
         * Get the pending shared model
         * @returns {string|null} The pending shared model or null if none
         */
        function getPendingSharedModel() {
            return pendingSharedModel;
        }
        
        /**
         * Clear the pending shared model
         */
        function clearPendingSharedModel() {
            pendingSharedModel = null;
        }
        
        /**
         * Mask an API key, showing only first and last 4 bytes
         * @param {string} apiKey - The API key to mask
         * @returns {string} Masked API key
         * @deprecated Use SharedLinkDataProcessor.maskApiKey instead
         */
        function maskApiKey(apiKey) {
            return SharedLinkDataProcessor.maskApiKey(apiKey);
        }
        
        // Public API
        return {
            hasSharedLink,
            promptForDecryptionPassword,
            getPendingSharedModel,
            clearPendingSharedModel,
            maskApiKey
        };
    }

    // Public API
    return {
        createSharedLinkManager
    };
})();