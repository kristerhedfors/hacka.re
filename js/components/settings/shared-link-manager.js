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
         * Apply shared data after successful decryption
         * @param {Object} sharedData - Decrypted shared data
         * @param {string} password - The password used for decryption
         * @param {Object} context - Context object with functions and elements
         * @param {Function} resolve - Promise resolve function
         */
        async function handleNamespaceSelection(sharedData, password, context, resolve) {
            try {
                // With simplified namespace system, always apply to current namespace
                await applySharedDataToCurrentNamespace(sharedData, password, context, resolve);
            } catch (error) {
                console.error('Error applying shared data:', error);
                // Fallback to current namespace
                await applySharedDataToCurrentNamespace(sharedData, password, context, resolve);
            }
        }
        
        /**
         * Get available namespaces with metadata
         * @returns {Array} Array of namespace objects
         */
        async function getAvailableNamespaces() {
            if (!window.NamespaceService) {
                return [];
            }
            
            try {
                const namespaceIds = window.NamespaceService.getAllNamespaceIds();
                const namespaces = [];
                
                for (const id of namespaceIds) {
                    const metadata = await getNamespaceMetadata(id);
                    if (metadata) {
                        namespaces.push({
                            id: id,
                            title: metadata.title || 'Untitled',
                            subtitle: metadata.subtitle || '',
                            messageCount: metadata.messageCount || 0,
                            lastUsed: metadata.lastUsed || new Date().toISOString()
                        });
                    }
                }
                
                // Sort by last used (most recent first)
                namespaces.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
                
                return namespaces;
            } catch (error) {
                console.error('Error getting available namespaces:', error);
                return [];
            }
        }
        
        /**
         * Get metadata for a specific namespace using NamespaceService
         * @param {string} namespaceId - The namespace ID
         * @returns {Object|null} Namespace metadata or null
         */
        async function getNamespaceMetadata(namespaceId) {
            if (window.NamespaceService && window.NamespaceService.getNamespaceMetadata) {
                return window.NamespaceService.getNamespaceMetadata(namespaceId);
            }
            
            // Fallback if NamespaceService not available
            return {
                id: namespaceId,
                title: `Namespace ${namespaceId}`,
                subtitle: '',
                messageCount: 0,
                lastUsed: new Date().toISOString()
            };
        }
        
        /**
         * Apply shared data to an existing namespace
         */
        async function applySharedDataToNamespace(namespace, sharedData, password, context, resolve) {
            try {
                // Switch to the selected namespace first
                if (window.NamespaceService) {
                    window.NamespaceService.setCurrentNamespace(namespace.id);
                }
                
                // Apply shared data
                const processedModel = window.SharedLinkDataProcessor ? 
                    window.SharedLinkDataProcessor.processSharedData(
                        sharedData, password, { ...context, displayWelcomeMessage: true }
                    ) : null;
                
                if (processedModel) {
                    pendingSharedModel = processedModel;
                }
                
                finishSharedLinkProcessing(resolve, processedModel);
            } catch (error) {
                console.error('Error applying shared data to namespace:', error);
                resolve({ success: false, pendingSharedModel: null });
            }
        }
        
        /**
         * Apply shared data to a new namespace
         */
        async function applySharedDataToNewNamespace(sharedData, password, context, resolve) {
            try {
                // Create new namespace by generating new title/subtitle
                // The NamespaceService will automatically create a new namespace
                // when title/subtitle combination doesn't exist
                
                const processedModel = window.SharedLinkDataProcessor ? 
                    window.SharedLinkDataProcessor.processSharedData(
                        sharedData, password, { ...context, displayWelcomeMessage: true }
                    ) : null;
                
                if (processedModel) {
                    pendingSharedModel = processedModel;
                }
                
                finishSharedLinkProcessing(resolve, processedModel);
            } catch (error) {
                console.error('Error applying shared data to new namespace:', error);
                resolve({ success: false, pendingSharedModel: null });
            }
        }
        
        /**
         * Apply shared data to current namespace (fallback)
         */
        async function applySharedDataToCurrentNamespace(sharedData, password, context, resolve) {
            try {
                const processedModel = window.SharedLinkDataProcessor ? 
                    window.SharedLinkDataProcessor.processSharedData(
                        sharedData, password, { ...context, displayWelcomeMessage: true }
                    ) : null;
                
                if (processedModel) {
                    pendingSharedModel = processedModel;
                }
                
                finishSharedLinkProcessing(resolve, processedModel);
            } catch (error) {
                console.error('Error applying shared data to current namespace:', error);
                resolve({ success: false, pendingSharedModel: null });
            }
        }
        
        /**
         * Finish shared link processing
         */
        function finishSharedLinkProcessing(resolve, processedModel) {
            // Clear the shared data from the URL
            LinkSharingService.clearSharedApiKeyFromUrl();
            
            // Mark password verification as complete
            window._passwordVerificationComplete = true;
            
            resolve({
                success: true,
                pendingSharedModel: processedModel
            });
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
                
                // Ensure namespace is properly initialized with session key
                if (window.NamespaceService && typeof window.NamespaceService.reinitializeNamespace === 'function') {
                    window.NamespaceService.reinitializeNamespace();
                }
                
                // Store welcome message for share modal pre-population only (don't display)
                if (sharedData.welcomeMessage && window.aiHackare && window.aiHackare.shareManager) {
                    window.aiHackare.shareManager.setSharedWelcomeMessage(sharedData.welcomeMessage);
                }
                
                const processedModel = window.SharedLinkDataProcessor ? 
                    window.SharedLinkDataProcessor.processSharedData(
                        sharedData, sessionKey, { addSystemMessage, setMessages, elements, displayWelcomeMessage: true }
                    ) : null;
                
                if (processedModel) {
                    pendingSharedModel = processedModel;
                }
                
                // Clear the shared data from the URL
                LinkSharingService.clearSharedApiKeyFromUrl();
                
                // Mark password verification as complete (session key worked)
                window._passwordVerificationComplete = true;
                
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
                            // FIRST: Apply session key immediately when password is validated
                            if (window.aiHackare && window.aiHackare.shareManager) {
                                window.aiHackare.shareManager.setSessionKey(password);
                                addSystemMessage(`[CRYPTO] Session key set for deterministic master key derivation`);
                                
                                // Force namespace re-initialization now that session key is available
                                if (window.NamespaceService && typeof window.NamespaceService.reinitializeNamespace === 'function') {
                                    window.NamespaceService.reinitializeNamespace();
                                }
                            }
                            
                            // Store welcome message for share modal pre-population only (don't display)
                            if (sharedData.welcomeMessage && window.aiHackare && window.aiHackare.shareManager) {
                                window.aiHackare.shareManager.setSharedWelcomeMessage(sharedData.welcomeMessage);
                            }
                            
                            // Remove the password modal first
                            modalElements.modal.remove();
                            
                            // Apply shared data to current namespace
                            handleNamespaceSelection(sharedData, password, { addSystemMessage, setMessages, elements }, resolve);
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
            return window.SharedLinkDataProcessor ? 
                window.SharedLinkDataProcessor.maskApiKey(apiKey) : apiKey;
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